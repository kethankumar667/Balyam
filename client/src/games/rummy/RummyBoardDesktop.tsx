import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import type {
  Card as CardType,
  ChatMessage,
  Player,
  Rank,
  RummyChampion,
  RummyPlayerState,
  RummyRoundRecap,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { PlayingCard, FaceDownCard } from "./Card";
import CardTracker from "./CardTracker";
import "./rummy-table.css";
import TutorialModal from "./TutorialModal";
import {
  classifyMeld,
  handMeldContext,
  withHandContext,
  computeLivePoints,
  evaluateFinishReadiness,
  sortMeldCards,
  sumCardPoints,
  type MeldClassification,
} from "./meldCheck";
import { splitBySuit } from "./autoArrange";
import { isRummySoundEnabled, rummySfx, setRummySoundEnabled } from "./sound";
import VoicePanel from "../../components/VoicePanel";
import PlayerList from "../../components/PlayerList";
import { enterFullscreen, exitFullscreen, isFullscreenActive } from "../../lib/fullscreen";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import RummyRoomHistory from "../../components/nostalgia/RummyRoomHistory";
import RummyResultModal from "./RummyResultModal";
import {
  useOrientationReport,
  useRummyRotationGate,
  WaitingForPlayersBanner,
} from "./rotation-sync";
import { RummyDealOverlay } from "./RummyBoardMobile";

/* ─────────────────────────── Types ─────────────────────────── */

type Group = { id: string; cardIds: string[] };
type Layout = { groups: Group[]; ungrouped: string[] };

type DropTarget =
  | "openpile"
  | "finishslot"
  | "ungrouped"
  | "new"
  | `group:${string}`;

const MAX_GROUPS = 7;

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
const RANK_ORDER: Record<string, number> = {
  A: 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6, "8": 7, "9": 8,
  T: 9, J: 10, Q: 11, K: 12,
};

function newGroupId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function cardSortKey(c: CardType, wildJokerRank: string): number[] {
  const isWild = c.rank === wildJokerRank ? 0 : 1;
  return [isWild, SUIT_ORDER[c.suit] ?? 9, RANK_ORDER[c.rank] ?? 99];
}

function sortIds(ids: string[], byId: Map<string, CardType>, wildJokerRank: string): string[] {
  return ids.slice().sort((a, b) => {
    const ca = byId.get(a);
    const cb = byId.get(b);
    if (!ca || !cb) return 0;
    const ka = cardSortKey(ca, wildJokerRank);
    const kb = cardSortKey(cb, wildJokerRank);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });
}

/* ─────────────────────────── Pointer drag ─────────────────────────── */

function resolveDropTarget(x: number, y: number): DropTarget | null {
  let el = document.elementFromPoint(x, y) as Element | null;
  while (el) {
    const dt = el.getAttribute("data-rummy-drop");
    if (dt) return dt as DropTarget;
    el = el.parentElement;
  }
  return null;
}

function useCardPointerDrag(opts: {
  cardId: string;
  selected: Set<string>;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
  onTap: (cardId: string) => void;
}) {
  const stRef = useRef<{ pointerId: number; x0: number; y0: number; dragging: boolean } | null>(null);
  return {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stRef.current = { pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, dragging: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      const dist = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
      if (!st.dragging) {
        if (dist < 5) return;
        st.dragging = true;
        const ids =
          opts.selected.has(opts.cardId) && opts.selected.size > 1
            ? Array.from(opts.selected)
            : [opts.cardId];
        opts.onDragBegin(ids);
      }
      opts.onDragHover(resolveDropTarget(e.clientX, e.clientY));
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      const wasDragging = st.dragging;
      stRef.current = null;
      if (!wasDragging) {
        opts.onTap(opts.cardId);
        return;
      }
      opts.onDragRelease(resolveDropTarget(e.clientX, e.clientY));
    },
    onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      const wasDragging = st.dragging;
      stRef.current = null;
      if (wasDragging) opts.onDragRelease(null);
    },
    style: { cursor: "grab", touchAction: "none" } as CSSProperties,
  };
}

/* ─────────────────────────── Main component ─────────────────────────── */

interface BoardProps {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  onLeave?: () => void;
  history: RummyRoundRecap[];
  champion: RummyChampion | null;
  /** Called when the final scorecard is dismissed — see RummyBoard.tsx for contract. */
  onScorecardClose?: () => void;
}

type RightTab = "chat" | "voice" | "players" | "points" | "history";

export default function RummyBoardDesktop({
  state,
  players,
  selfId,
  messages = [],
  roomCode,
  onLeave,
  history,
  champion,
  onScorecardClose,
}: BoardProps) {
  const hand = state.myHand ?? [];
  const byId = useMemo(() => new Map(hand.map((c) => [c.id, c])), [hand]);
  const wildRank = state.wildJoker.rank;

  // Desktop never needs to rotate itself in practice (the picker only
  // mounts this shell on real desktop — large hover/fine-pointer
  // viewports), but it still calls the SAME report hook mobile does so
  // the server hears an explicit "false" from this client. Without an
  // explicit report, this player's `needsRotation` field would sit at
  // `undefined` forever, which the gate on every OTHER client would
  // have to guess the meaning of (never-reported vs. confirmed ready) —
  // reporting for real removes that ambiguity. It also tracks the same
  // start-of-game gate so a non-blocking toast can tell a desktop player
  // why mobile friends haven't appeared yet, and let them nudge whoever's
  // still rotating. See `./rotation-sync` for the full synchronized-deal
  // contract (mobile shells block on this; desktop stays fully
  // interactive throughout).
  const selfNeedsRotation = useOrientationReport();
  const gate = useRummyRotationGate({
    roomCode,
    phase: state.phase,
    players,
    selfId,
    selfNeedsRotation,
  });

  const [layout, setLayout] = useState<Layout>({ groups: [], ungrouped: [] });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<DropTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const [activeTab, setActiveTab] = useState<RightTab>("chat");
  const [soundOn, setSoundOn] = useState<boolean>(() => isRummySoundEnabled());
  const [tutorialOpen, setTutorialOpen] = useState(false);
  /* controlsOpen drives the collapsible action rail (Fix 3) */
  const [controlsOpen, setControlsOpen] = useState(false);
  /* The right rail collapses to a hairline strip so the table can own the
     full width when a player wants to concentrate on their hand. */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const initialized = useRef(false);

  /* ─── Reconcile hand → layout on every server update ─── */
  useEffect(() => {
    setLayout((prev) => {
      const known = new Set<string>([
        ...prev.groups.flatMap((g) => g.cardIds),
        ...prev.ungrouped,
      ]);
      const handIds = new Set(hand.map((c) => c.id));
      // Drop cards no longer in hand
      const filteredGroups = prev.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => handIds.has(id)) }))
        .filter((g) => g.cardIds.length > 0);
      const filteredUngrouped = prev.ungrouped.filter((id) => handIds.has(id));
      // Append new ones (suit-sorted) to ungrouped
      const incoming = hand.map((c) => c.id).filter((id) => !known.has(id));
      if (incoming.length === 0 && initialized.current) {
        return { groups: filteredGroups, ungrouped: filteredUngrouped };
      }
      initialized.current = true;
      const fresh = sortIds(incoming, byId, wildRank);
      return {
        groups: filteredGroups,
        ungrouped: [...filteredUngrouped, ...fresh],
      };
    });
  }, [hand, byId, wildRank]);

  /* ─── Stream arrangement to server (debounced) ─── */
  useEffect(() => {
    if (state.phase === "finished") return;
    const t = window.setTimeout(() => {
      try {
        getSocket().emit("rummy:arrangement", {
          groups: layout.groups.map((g) => g.cardIds.slice()),
        });
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [layout.groups, state.phase]);

  /* ─── Derived: meld classifications + live point bookkeeping ─── */
  const meldByGroupId = useMemo(() => {
    const base: Record<string, MeldClassification> = {};
    for (const g of layout.groups) {
      const cards = g.cardIds.map((id) => byId.get(id)!).filter(Boolean);
      base[g.id] = classifyMeld(cards, wildRank as Rank);
    }
    // Life-aware re-stamp: a set / impure run only counts once the two-life
    // rule is met, so lanes read amber (not green) until they're credited.
    const ctx = handMeldContext(Object.values(base).map((c) => c.kind));
    const m: Record<string, MeldClassification> = {};
    for (const g of layout.groups) {
      m[g.id] = withHandContext(base[g.id], ctx);
    }
    return m;
  }, [layout.groups, byId, wildRank]);

  const livePoints = useMemo(() => {
    const groups = layout.groups.map((g) => ({
      cards: g.cardIds.map((id) => byId.get(id)!).filter(Boolean),
      classification: meldByGroupId[g.id],
    }));
    const ungroupedCards = layout.ungrouped.map((id) => byId.get(id)!).filter(Boolean);
    return computeLivePoints(groups, ungroupedCards, wildRank as Rank);
  }, [layout, byId, meldByGroupId, wildRank]);

  const finishReadiness = useMemo(() => {
    const groups = layout.groups.map((g) => ({
      cards: g.cardIds.map((id) => byId.get(id)!).filter(Boolean),
    }));
    return evaluateFinishReadiness(
      groups,
      wildRank as Rank,
      layout.groups.reduce((s, g) => s + g.cardIds.length, 0),
      layout.ungrouped.length,
    );
  }, [layout, wildRank]);

  /* ─── Turn / phase helpers ─── */
  const isArranging = state.phase === "arranging";
  const myTurn = state.turnPlayerId === selfId && state.phase === "playing";
  const canDraw = myTurn && state.turnAction === "draw" && state.phase === "playing";
  const canDiscardOrDeclare =
    myTurn && state.turnAction === "discardOrDeclare" && state.phase === "playing";
  // During the post-show window the declarer is a pure spectator; everyone
  // else may still rearrange (drag/drop, group, sort, auto) to cut points.
  const iAmDeclarer = isArranging && state.winnerId === selfId;
  /** True once selfId has dropped out of this round. */
  const iDropped = !!selfId && state.droppedPlayers.includes(selfId);

  /* ─── End-of-round scorecard dismissed flag ─── */
  const [scorecardDismissed, setScorecardDismissed] = useState(false);
  useEffect(() => {
    // Re-arm the scorecard the next time the room flips back to playing
    // (e.g. on a rematch). Otherwise it stays dismissed for the session.
    if (state.phase === "playing") setScorecardDismissed(false);
  }, [state.phase]);

  /* ─── 5-second winner burst ─── */
  const [winnerBurstKey, setWinnerBurstKey] = useState<number | null>(null);
  const prevPhaseForBurst = useRef(state.phase);
  useEffect(() => {
    // The round now goes playing → arranging → finished, so "just finished"
    // means the previous phase was arranging (or playing, for instant wins
    // like a drop-out). Fire whenever we land on finished from either.
    const wasInRound = prevPhaseForBurst.current !== "finished";
    const justFinished = state.phase === "finished";
    prevPhaseForBurst.current = state.phase;
    if (!wasInRound || !justFinished) return;
    if (state.invalidDeclareBy) return;
    if (state.endedByDisconnect) return;
    if (state.winnerId !== selfId) return;
    setWinnerBurstKey(Date.now());
    const t = window.setTimeout(() => setWinnerBurstKey(null), 5000);
    return () => window.clearTimeout(t);
  }, [state.phase, state.winnerId, state.invalidDeclareBy, state.endedByDisconnect, selfId]);

  /* ─── Turn timer countdown ─── */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const remainingMs = state.turnDeadline ? Math.max(0, state.turnDeadline - now) : null;
  const remainingSec = remainingMs == null ? null : Math.ceil(remainingMs / 1000);
  const arrangeRemainingSec = state.arrangeDeadline
    ? Math.max(0, Math.ceil((state.arrangeDeadline - now) / 1000))
    : null;

  /* ─── Game actions ─── */
  function drawFromClosed() {
    if (!canDraw) return;
    getSocket().emit("game:move", { type: "draw", data: { from: "closed" } });
    rummySfx.draw();
  }
  function drawFromOpen() {
    if (!canDraw || !state.topOfOpenPile) return;
    if (state.topOfOpenPile.isPrintedJoker && !state.openJokerDrawable) {
      setError("Printed jokers can't be drawn from the discard pile");
      return;
    }
    getSocket().emit("game:move", { type: "draw", data: { from: "open" } });
    rummySfx.draw();
  }
  function discardSelected() {
    if (!canDiscardOrDeclare) return;
    if (selected.size !== 1) {
      setError("Pick exactly one card to discard");
      return;
    }
    const id = Array.from(selected)[0];
    getSocket().emit("game:move", { type: "discard", data: { cardId: id } });
    rummySfx.discard();
    setSelected(new Set());
    setError(null);
  }
  function dropOnOpenPile(cardId: string) {
    if (!canDiscardOrDeclare) {
      setError("Draw a card first before discarding");
      return;
    }
    getSocket().emit("game:move", { type: "discard", data: { cardId } });
    rummySfx.discard();
    setLayout((l) => ({
      groups: l.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => id !== cardId) }))
        .filter((g) => g.cardIds.length > 0),
      ungrouped: l.ungrouped.filter((id) => id !== cardId),
    }));
    setSelected(new Set());
    setError(null);
  }
  function dropOnFinishSlot(cardId: string) {
    if (!canDiscardOrDeclare) {
      setError("Draw a card first before declaring");
      return;
    }
    // Move cardId to a temporary "ungrouped" slot, then declare.
    setLayout((l) => {
      const groupsCleaned = l.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => id !== cardId) }))
        .filter((g) => g.cardIds.length > 0);
      const ungrouped = [...l.ungrouped.filter((id) => id !== cardId), cardId];
      return { groups: groupsCleaned, ungrouped };
    });
    // Defer the declare so the layout state is fresh.
    setTimeout(() => declareWith(cardId), 0);
  }
  function declareWith(discardCardId: string) {
    const totalGrouped = layout.groups.reduce((s, g) => s + g.cardIds.length, 0);
    if (totalGrouped < 13) {
      setError("Move all 13 hand cards into groups before declaring");
      return;
    }
    const melds = layout.groups.map((g) => g.cardIds);
    getSocket().emit("game:move", {
      type: "declare",
      data: { discardCardId, melds },
    });
    rummySfx.declare();
    setError(null);
  }
  function declareViaButton() {
    if (!canDiscardOrDeclare) return;
    if (layout.ungrouped.length !== 1) {
      setError(
        `Move exactly 1 card to ungrouped as your final discard (have ${layout.ungrouped.length}).`,
      );
      return;
    }
    declareWith(layout.ungrouped[0]);
  }
  function dropFromHand() {
    setConfirmDrop(false);
    rummySfx.drop();
    getSocket().emit("game:move", { type: "drop" });
  }

  /* ─── Layout edits ─── */
  function moveCardsTo(
    targetKind: "group" | "ungrouped" | "new",
    targetLaneId: string | null,
    ids: string[],
  ) {
    setLayout((l) => {
      const idSet = new Set(ids);
      const groupsFiltered = l.groups.map((g) => ({
        ...g,
        cardIds: g.cardIds.filter((id) => !idSet.has(id)),
      }));
      const ungroupedFiltered = l.ungrouped.filter((id) => !idSet.has(id));

      if (targetKind === "new") {
        const cleaned = groupsFiltered.filter((g) => g.cardIds.length > 0);
        return {
          groups: [...cleaned, { id: newGroupId(), cardIds: ids.slice() }],
          ungrouped: ungroupedFiltered,
        };
      }
      if (targetKind === "ungrouped") {
        const cleaned = groupsFiltered.filter((g) => g.cardIds.length > 0);
        return { groups: cleaned, ungrouped: [...ungroupedFiltered, ...ids] };
      }
      // group
      const newGroups = groupsFiltered.map((g) =>
        g.id === targetLaneId ? { ...g, cardIds: [...g.cardIds, ...ids] } : g,
      );
      const cleaned = newGroups.filter((g) => g.cardIds.length > 0);
      return { groups: cleaned, ungrouped: ungroupedFiltered };
    });
  }
  function groupSelected() {
    if (selected.size < 1) {
      setError("Select at least one card to group");
      return;
    }
    const remaining = layout.groups.filter(
      (g) => g.cardIds.some((cid) => !selected.has(cid)),
    ).length;
    if (remaining >= MAX_GROUPS) {
      setError(`Max ${MAX_GROUPS} groups — merge into an existing meld first`);
      return;
    }
    setLayout((l) => {
      const selIds = Array.from(selected);
      const cards = selIds.map((id) => byId.get(id)!).filter(Boolean);
      const ordered = sortMeldCards(cards, wildRank as Rank).map((c) => c.id);
      const groups = l.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => !selected.has(id)) }))
        .filter((g) => g.cardIds.length > 0);
      const ungrouped = l.ungrouped.filter((id) => !selected.has(id));
      return {
        groups: [...groups, { id: newGroupId(), cardIds: ordered }],
        ungrouped,
      };
    });
    setSelected(new Set());
    setError(null);
    rummySfx.meldFormed();
  }
  function ungroupGroup(groupId: string) {
    setLayout((l) => {
      const g = l.groups.find((gg) => gg.id === groupId);
      if (!g) return l;
      return {
        groups: l.groups.filter((gg) => gg.id !== groupId),
        ungrouped: [...l.ungrouped, ...g.cardIds],
      };
    });
    setError(null);
  }
  function sortUngrouped() {
    setLayout((l) => ({ ...l, ungrouped: sortIds(l.ungrouped, byId, wildRank) }));
  }
  // AUTO only tidies the hand into suit lanes (♠♥♦♣ + jokers) — it never forms
  // melds for the player. They must build their own sequences/sets, which is
  // what makes the post-show rearrange window meaningful.
  function autoArrange() {
    const all: CardType[] = [
      ...layout.groups.flatMap((g) => g.cardIds.map((id) => byId.get(id)).filter((c): c is CardType => !!c)),
      ...layout.ungrouped.map((id) => byId.get(id)).filter((c): c is CardType => !!c),
    ];
    if (all.length === 0) return;
    const lanes = splitBySuit(all);
    setLayout({
      groups: lanes.slice(0, MAX_GROUPS).map((cards) => ({
        id: newGroupId(),
        cardIds: cards.map((c) => c.id),
      })),
      ungrouped: lanes.slice(MAX_GROUPS).flat().map((c) => c.id),
    });
    setSelected(new Set());
    rummySfx.meldFormed();
  }

  /* ─── Drag wiring ─── */
  function onDragBegin(ids: string[]) {
    setDraggingIds(ids);
    setError(null);
  }
  function onDragHover(target: DropTarget | null) {
    setDragOverTarget(target);
  }
  function onDragEnd() {
    setDraggingIds([]);
    setDragOverTarget(null);
  }
  const draggingIdsRef = useRef<string[]>([]);
  useEffect(() => {
    draggingIdsRef.current = draggingIds;
  }, [draggingIds]);
  function onDragRelease(target: DropTarget | null) {
    const ids = draggingIdsRef.current;
    if (target && ids.length > 0) {
      if (target === "openpile") {
        const id = ids[0];
        if (id) dropOnOpenPile(id);
      } else if (target === "finishslot") {
        const id = ids[0];
        if (id) dropOnFinishSlot(id);
      } else if (target === "ungrouped") {
        moveCardsTo("ungrouped", null, ids);
      } else if (target === "new") {
        const idSet = new Set(ids);
        const remaining = layout.groups.filter(
          (g) => g.cardIds.some((cid) => !idSet.has(cid)),
        ).length;
        if (remaining >= MAX_GROUPS) {
          setError(`Max ${MAX_GROUPS} groups — drop into an existing meld instead`);
        } else {
          moveCardsTo("new", null, ids);
        }
      } else if (target.startsWith("group:")) {
        const gid = target.slice("group:".length);
        moveCardsTo("group", gid, ids);
      }
    }
    onDragEnd();
  }

  /* ─── Card tap / selection ─── */
  function onCardTap(cardId: string) {
    setSelected((sel) => {
      const next = new Set(sel);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when an input/textarea is focused (chat etc.)
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        /**
         * D is DRAW or DISCARD depending on where the turn is.
         *
         * The two never overlap — `turnAction` is either "draw" or
         * "discardOrDeclare" and never both — so one key can carry the whole
         * turn: press D to take a card, press D to put one down. That is also
         * what lets the Discard button honestly print "D" on its face; the
         * discard action previously answered to Space alone, which no label
         * on screen mentioned.
         */
        case "d":
          if (canDraw) {
            e.preventDefault();
            drawFromClosed();
          } else if (canDiscardOrDeclare && selected.size === 1) {
            e.preventDefault();
            discardSelected();
          }
          break;
        case "o":
          if (canDraw) { e.preventDefault(); drawFromOpen(); }
          break;
        case "g":
          e.preventDefault(); groupSelected();
          break;
        case "s":
          e.preventDefault(); sortUngrouped();
          break;
        case "a":
          e.preventDefault(); autoArrange();
          break;
        case " ":
          if (canDiscardOrDeclare && selected.size === 1) {
            e.preventDefault(); discardSelected();
          }
          break;
        case "enter":
          if (canDiscardOrDeclare) { e.preventDefault(); declareViaButton(); }
          break;
        case "escape":
          setSelected(new Set());
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw, canDiscardOrDeclare, selected, layout]);

  /* ─── Fullscreen toggle ─── */
  const [isFs, setIsFs] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => {
    function onChange() { setIsFs(isFullscreenActive()); }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);
  function toggleFullscreen() {
    if (isFs) void exitFullscreen();
    else void enterFullscreen("any");
  }

  /* ─── Sound toggle ─── */
  function toggleSound() {
    const next = !soundOn;
    setRummySoundEnabled(next);
    setSoundOn(next);
  }

  /* ─── Names / opponents ─── */
  const opponentIds = state.playerOrder.filter((id) => id !== selfId);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const totalUngroupedPlusGrouped =
    layout.ungrouped.length + layout.groups.reduce((s, g) => s + g.cardIds.length, 0);

  /* ─── Drop announcement — a card slams down when anyone drops the round ─── */
  const [dropAnnounce, setDropAnnounce] = useState<{ name: string; mine: boolean } | null>(null);
  const prevDroppedRef = useRef<string[]>(state.droppedPlayers);
  useEffect(() => {
    const prev = new Set(prevDroppedRef.current);
    const added = state.droppedPlayers.filter((id) => !prev.has(id));
    prevDroppedRef.current = state.droppedPlayers;
    if (added.length === 0) return;
    const id = added[added.length - 1];
    setDropAnnounce({ name: id === selfId ? "You" : nameOf(id), mine: id === selfId });
    const t = window.setTimeout(() => setDropAnnounce(null), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.droppedPlayers.join(",")]);

  /* ─────────────────────────── Render ─────────────────────────── */
  const handHint = canDraw
    ? "Pick a card from the deck or discard pile"
    : canDiscardOrDeclare
    ? "Discard a card, or drop one into the Finish Slot to declare"
    : isArranging
    ? "A show has been made — rearrange to cut your points"
    : `Waiting for ${nameOf(state.turnPlayerId)}…`;

  /* Seats are dealt in table order with the local player LAST, so "you" is
     always the rightmost card — nearest the hand it owns. The seat letter is
     positional (A, B, C…) and is reused by the roster in the right rail, so
     the two lists can be matched to each other without reading names. */
  const seatOrder = [...opponentIds, ...(selfId && state.playerOrder.includes(selfId) ? [selfId] : [])];
  const seatLetterOf = (id: string) =>
    String.fromCharCode(65 + Math.max(0, state.playerOrder.indexOf(id)));

  const variantLabel =
    state.matchMode === "pool101"
      ? "Pool 101"
      : state.matchMode === "pool201"
      ? "Pool 201"
      : "Points Rummy";

  return (
    <div className="rm-room">
      {/* The desk clutter (paperclip, notebook, coffee cup), the corner suit
          watermarks and the background doodle are deliberately NOT rendered
          any more. They were pure decoration competing for attention on a
          screen whose core problem was that NOTHING was dominant — the hand,
          both piles, the opponent seats, chat and the scoreboard all carried
          equal visual weight. Their components are left defined further down
          this file so any of them can be restored in a single line. */}

      {/* Gate overlays — block the board during every non-idle stage so no
          game content flashes before the deal animation. During "gating" we
          show a simple wood-toned holding screen while waiting for mobile
          players to rotate. During "shuffle"/"deal" the full animated
          RummyDealOverlay takes over (desktop-wood variant via the wrapper). */}
      {gate.stage === "gating" && (
        <>
          {/* Full-viewport blocking overlay so the board is never visible during gating */}
          <div
            className="absolute inset-0 z-[55] flex flex-col items-center justify-center"
            style={{ background: "var(--rm-felt-deep)" }}
          >
            <DeskGatingScreen
              blockers={gate.blockers}
              showNames={gate.showBlockerNames}
              readyCount={gate.readyCount}
              totalCount={gate.totalCount}
            />
          </div>
        </>
      )}
      {(gate.stage === "shuffle" || gate.stage === "deal") && (
        <RummyDealOverlay
          stage={gate.stage}
          playerCount={state.playerOrder.length}
          bg="var(--rm-felt-deep)"
        />
      )}

      {/* ───── Chrome ─────
          Three grid tracks rather than a flex row: the turn pill has to hold
          the centre of the viewport however long the room metadata runs. */}
      <div className="rm-topbar">
        <div className="rm-topbar__left">
          <button onClick={onLeave} className="rm-chip" title="Leave the table">
            ← Leave
          </button>
          <div className="rm-wordmark">
            Bhalyam
            <span className="rm-wordmark__sub">Rummy</span>
          </div>
          <div className="rm-meta">
            <span>Table:</span>
            <span className="rm-meta__code">{roomCode ?? "—"}</span>
            <span className="rm-meta__dot">•</span>
            <span>{variantLabel}</span>
            <span className="rm-meta__dot">•</span>
            <span>{state.playerOrder.length} Players</span>
          </div>
        </div>

        <TurnPill
          myTurn={myTurn}
          turnPlayerName={nameOf(state.turnPlayerId)}
          phase={state.phase}
          remainingSec={remainingSec}
        />

        <div className="rm-topbar__right">
          <button onClick={() => setTutorialOpen(true)} className="rm-chip" title="How to play">
            Rules
          </button>
          <button
            onClick={toggleSound}
            className="rm-chip rm-chip--icon"
            title={soundOn ? "Mute sound" : "Unmute sound"}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          >
            <SoundIcon on={soundOn} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="rm-chip rm-chip--icon"
            title={isFs ? "Exit fullscreen" : "Fullscreen"}
            aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* ───── The table — five stacked panels + the right rail ─────
          seats · piles · melds · hand · actions. Each is a framed object with
          ONE edge weight, read top to bottom in the order it is actually
          used. The previous pass made these three BORDERLESS zones bleeding
          into one continuous felt; that removed the clutter and the structure
          together, and the four things a player tracks ran into each other. */}
      <div className="rm-main">
        <div className="rm-board">
          {/* ── 1 · who is at the table ──
              One row, every seat the same object, the local player last so
              "you" sits nearest the hand you own. */}
          <div className="rm-seats">
            {seatOrder.map((id) => (
              <SeatCard
                key={id}
                letter={seatLetterOf(id)}
                name={id === selfId ? `${nameOf(id)} (You)` : nameOf(id)}
                isSelf={id === selfId}
                isTurn={state.turnPlayerId === id && state.phase === "playing"}
                handSize={state.handSizes[id] ?? 0}
                dropped={state.droppedPlayers.includes(id)}
                eliminated={state.eliminatedInMatch.includes(id)}
                connected={players.find((p) => p.id === id)?.isConnected ?? true}
                autoPlaying={players.find((p) => p.id === id)?.isAutoPlaying === true}
                cumulativeScore={state.cumulativeScores?.[id]}
              />
            ))}
          </div>

          {/* ── 2 · the lit centre ──
              The pool of light IS the container: no dashed frame around the
              piles, no inner panel. Each pile carries its own name chip, so
              nothing has to be learned by position. */}
          <div className={`rm-felt${isArranging ? " rm-felt--locked" : ""}`}>
            <div className="rm-felt__slots">
              <ClosedDeck count={state.closedDeckCount} canDraw={canDraw} onDraw={drawFromClosed} />
              <WildJokerSlot card={state.wildJoker} />
              <DiscardSlot
                top={state.topOfOpenPile}
                pile={state.openPile}
                canDraw={canDraw}
                onDraw={drawFromOpen}
                dragOver={dragOverTarget === "openpile"}
                wildRank={wildRank}
              />
              <FinishSlot dragOver={dragOverTarget === "finishslot"} />
            </div>

            <div className="rm-felt__hint">
              <BulbIcon />
              <span>{handHint}</span>
            </div>

            {isArranging && (
              <ArrangeCenterTimer
                remainingSec={arrangeRemainingSec}
                spectator={iAmDeclarer}
                declarerName={nameOf(state.winnerId ?? "")}
              />
            )}
          </div>

          {/* ── 3 · the melds ──
              Locked for the declarer (they are spectating); losers keep them
              live so they can rearrange and cut their points. */}
          <div className={`rm-melds${iAmDeclarer ? " rm-melds--locked" : ""}`}>
            {layout.groups.length === 0 && (
              <span className="rm-melds__empty">
                No melds yet — select cards and press G, or drag them here.
              </span>
            )}
            {layout.groups.map((g) => (
              <GroupLane
                key={g.id}
                groupId={g.id}
                cardIds={g.cardIds}
                byId={byId}
                wildRank={wildRank}
                selected={selected}
                draggingIds={draggingIds}
                classification={meldByGroupId[g.id]}
                dragOver={dragOverTarget === `group:${g.id}`}
                onTap={onCardTap}
                onDragBegin={onDragBegin}
                onDragHover={onDragHover}
                onDragRelease={onDragRelease}
                onUngroup={() => ungroupGroup(g.id)}
              />
            ))}
            {/* Always mounted, not drag-only: a target that appears only once
                you are already dragging cannot teach you that dragging is
                possible. */}
            <AddMeldZone
              active={dragOverTarget === "new"}
              atCap={layout.groups.length >= MAX_GROUPS}
            />
          </div>

          {/* ── 4 · the hand — the subject of the screen ── */}
          <div
            className={
              "rm-hand" + (iDropped || iAmDeclarer ? " is-idle" : myTurn ? " is-turn" : "")
            }
          >
            <div className="rm-hand__head">
              <span className="rm-hand__title">
                Your hand{" "}
                <span className="rm-hand__count">
                  ({layout.ungrouped.length}{" "}
                  {layout.ungrouped.length === 1 ? "card" : "cards"})
                </span>
              </span>
              <span className="rm-hand__tip">
                {selected.size > 0
                  ? `${selected.size} selected · G to group`
                  : "Tap a card to select"}
              </span>
              <span />
            </div>

            {iDropped ? (
              <div className="rm-hint" style={{ padding: "var(--rm-space-lg) 0" }}>
                You dropped — spectating
              </div>
            ) : (
              <UngroupedLane
                cardIds={layout.ungrouped}
                byId={byId}
                wildRank={wildRank}
                selected={selected}
                draggingIds={draggingIds}
                dragOver={dragOverTarget === "ungrouped"}
                onTap={onCardTap}
                onDragBegin={onDragBegin}
                onDragHover={onDragHover}
                onDragRelease={onDragRelease}
              />
            )}
          </div>

          {/* ── 5 · the action bar ──
              Two tidy-up tools, the two numbers that decide the turn, then the
              two committed actions. Everything rarer lives behind the tools
              button at the end, so the bar itself never grows. */}
          <div
            className="rm-bar"
            style={iAmDeclarer ? { opacity: 0.4, pointerEvents: "none" } : undefined}
          >
            <ToolButton
              icon={<SortIcon />}
              label="Sort"
              note="Group (Suit)"
              onClick={sortUngrouped}
              title="Sort your ungrouped cards by suit and rank (S)"
            />
            <ToolButton
              icon={<AutoGroupIcon />}
              label="Auto Group"
              note="Group Cards"
              onClick={autoArrange}
              title="Tidy the whole hand into suit lanes (A)"
            />

            <PointsReadout hand={livePoints.handTotal} ground={livePoints.caughtNow} />

            <button
              type="button"
              className="rm-cta rm-cta--discard"
              onClick={discardSelected}
              disabled={!canDiscardOrDeclare || selected.size !== 1}
              title={
                selected.size === 1
                  ? "Discard the selected card"
                  : "Select exactly one card to discard"
              }
            >
              <DiscardIcon />
              Discard
              <span className="rm-kbd">D</span>
            </button>
            <button
              type="button"
              className="rm-cta rm-cta--declare"
              onClick={declareViaButton}
              disabled={!canDiscardOrDeclare || !finishReadiness.ready}
              title={
                finishReadiness.ready
                  ? "Declare your hand"
                  : finishReadiness.reasons.join(" · ") || "Not ready to declare"
              }
            >
              Declare
              <span className="rm-kbd">Enter</span>
            </button>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="rm-chip rm-chip--icon"
                onClick={() => setControlsOpen((o) => !o)}
                aria-expanded={controlsOpen}
                title="More tools — group, drop, shortcuts"
                aria-label="More tools"
              >
                <PencilIcon />
              </button>
              {controlsOpen && (
                <ToolsPopover
                  onGroup={() => {
                    groupSelected();
                    setControlsOpen(false);
                  }}
                  onDrop={() => {
                    setConfirmDrop(true);
                    setControlsOpen(false);
                  }}
                  canDrop={myTurn && !iDropped && state.phase === "playing"}
                  onClose={() => setControlsOpen(false)}
                />
              )}
            </div>
          </div>

          {error && <div className="rm-error">{error}</div>}

          {/* Turn-time warning */}
          <TurnTimeWarning deadline={state.turnDeadline} active={myTurn} />
        </div>

        {/* ── The right rail — the talk panel ABOVE the roster ──
            The roster used to be one of the tabs, which meant checking whose
            turn it was cost you the chat you were reading. It is its own
            always-on panel now. */}
        <aside className={`rm-side${sidebarOpen ? "" : " rm-side--collapsed"}`}>
          {!sidebarOpen ? (
            <button
              className="rm-side__toggle"
              onClick={() => setSidebarOpen(true)}
              title="Expand panel"
              aria-expanded={false}
            >
              ◂
            </button>
          ) : (
            <>
              <div className="rm-side__panel">
                <div className="rm-side__tabs" role="tablist">
                  {(
                    [
                      "chat",
                      "voice",
                      "players",
                      "points",
                      ...(history.length > 0 || champion ? (["history"] as const) : []),
                    ] as RightTab[]
                  ).map((tab) => (
                    <button
                      key={tab}
                      role="tab"
                      aria-selected={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                      className="rm-tab"
                    >
                      {tab}
                    </button>
                  ))}
                  <button
                    className="rm-tab"
                    onClick={() => setSidebarOpen(false)}
                    title="Collapse panel"
                    aria-label="Collapse panel"
                    style={{ flex: "0 0 28px" }}
                  >
                    ▸
                  </button>
                </div>

                {/* Chat owns its own scroll region, quick phrases and composer,
                    so it is rendered whole rather than poured into the generic
                    body slot the other tabs share. */}
                {activeTab === "chat" ? (
                  <TableChat messages={messages} selfId={selfId} />
                ) : (
                  <>
                    <div className="rm-side__body">
                      {activeTab === "voice" && (
                        <VoicePanel players={players} selfId={selfId} restoreOrientation="any" />
                      )}
                      {activeTab === "players" && <PlayerList players={players} selfId={selfId} />}
                      {activeTab === "points" && (
                        <div className="flex flex-col gap-3">
                          <PointsPanel
                            livePoints={livePoints}
                            finishReadiness={finishReadiness}
                            state={state}
                          />
                          {/**
                            * The card tracker shipped on MOBILE only, so the
                            * big screen — the one with a rail sitting half
                            * empty — was the one withholding the count of
                            * what is still live. That is backwards. It lives
                            * under Points because "what is left" and "what am
                            * I holding" are the same decision.
                            */}
                          <CardTracker
                            myHand={hand}
                            openPile={state.openPile}
                            wildJokerRank={wildRank as Rank}
                            columns={7}
                          />
                        </div>
                      )}
                      {activeTab === "history" && (
                        <RummyRoomHistory
                          variant="panel"
                          density="desktop"
                          history={history}
                          champion={champion}
                          players={players}
                          showTitle={false}
                        />
                      )}
                    </div>
                    <span />
                  </>
                )}
              </div>

              <SidePlayersRail
                state={state}
                players={players}
                selfId={selfId}
                nameOf={nameOf}
                letterOf={seatLetterOf}
              />
            </>
          )}
        </aside>
      </div>

      {/* Drop announcement — a card slams down when a player drops. */}
      {dropAnnounce && <DropAnnounce name={dropAnnounce.name} mine={dropAnnounce.mine} />}

      {/* Drop confirm */}
      {confirmDrop && (
        <ConfirmOverlay
          title="Drop this round?"
          body={
            state.turnAction === "draw"
              ? "You forfeit 20 points (first-drop penalty) and skip the rest of this round."
              : `You forfeit your current card points (~${livePoints.handTotal} pts) and skip the rest of this round.`
          }
          confirmLabel="Drop"
          onConfirm={dropFromHand}
          onCancel={() => setConfirmDrop(false)}
        />
      )}

      {tutorialOpen && <TutorialModal onClose={() => setTutorialOpen(false)} />}

      {/* End-of-round scorecard — desktop version. Mobile uses a full
          RummyScoreCard inside ResultOverlay; on desktop we keep it tight:
          winner / wrong-show / disconnect message, per-player points and
          chips, close + leave actions. Reuses scoring math from state. */}
      {state.phase === "finished" && !scorecardDismissed && (
        <RummyResultModal
          state={state}
          players={players}
          selfId={selfId}
          roomCode={roomCode}
          onClose={() => {
            setScorecardDismissed(true);
            // Always fire — Room.tsx resets showGameOver when phase flips
            // back to "playing" (rematch), so pool between-round dismissals
            // briefly show GameOverScreen then auto-clear. Simpler and more
            // reliable than guarding on matchMode/matchOver.
            onScorecardClose?.();
          }}
          onLeave={onLeave}
        />
      )}

      {/* 5-second winner burst — pointer-events: none so the scorecard
          modal underneath stays interactive. */}
      {winnerBurstKey != null && <WinnerCelebrationBurst key={winnerBurstKey} />}
    </div>
  );
}


function WinnerCelebrationBurst() {
  // Confetti palette aligned with the desktop wood+gold theme. We use
  // warm golds, ambers, deep reds, and cream — no cool blues/greens that
  // would clash with the nostalgia aesthetic.
  const pieces = Array.from({ length: 48 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1600,
    duration: 2000 + Math.random() * 2000,
    color: [
      "#E4B128", "#F4C430", "#C9A227", // golds
      "#F7E8C4", "#F5E9C9", "#E0CC9C", // creams
      "#A8332B", "#7B1E2B",             // reds
      "#9C7A3C", "#6D4323",             // wood/brass
      "#fde68a", "#fbbf24",             // bright amber
    ][i % 12],
    rotate: Math.random() * 360,
    width: 6 + Math.floor(Math.random() * 8),
    height: 10 + Math.floor(Math.random() * 10),
    shape: i % 3 === 0 ? "circle" : "rect",
  }));
  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="You won this round"
    >
      <style>{`
        @keyframes rummy-winner-fall {
          0%   { transform: translate3d(0,-12vh,0) rotate(var(--r)); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translate3d(0,112vh,0) rotate(calc(var(--r) + 540deg)); opacity: 0; }
        }
        @keyframes rummy-winner-banner {
          0%   { transform: scale(0.6) translateY(-20px); opacity: 0; }
          12%  { transform: scale(1.08) translateY(0); opacity: 1; }
          22%  { transform: scale(1.0)  translateY(0); opacity: 1; }
          80%  { transform: scale(1.0)  translateY(0); opacity: 1; }
          100% { transform: scale(0.95) translateY(-10px); opacity: 0; }
        }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.width,
            height: p.shape === "circle" ? p.width : p.height,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            boxShadow: `0 0 8px ${p.color}66`,
            ["--r" as string]: `${p.rotate}deg`,
            animation: `rummy-winner-fall ${p.duration}ms cubic-bezier(.25,.46,.45,.94) ${p.delay}ms forwards`,
            transform: `translate3d(0,-12vh,0) rotate(${p.rotate}deg)`,
          } as CSSProperties}
        />
      ))}
      <div
        className="absolute left-1/2 top-[18%] -translate-x-1/2 text-center"
        style={{
          animation: "rummy-winner-banner 5000ms ease-in-out forwards",
          filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.55))",
        }}
      >
        <div
          className="font-black tracking-[0.15em] uppercase"
          style={{
            fontSize: "clamp(36px, 5vw, 84px)",
            background: "linear-gradient(180deg,#FEF3C7 0%,#F59E0B 55%,#B45309 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            textShadow: "0 2px 14px rgba(245,158,11,0.6)",
          }}
        >
          ★ Winner ★
        </div>
        <div
          className="mt-1 font-bold uppercase tracking-[0.4em]"
          style={{ color: "#FEF3C7", fontSize: "clamp(11px,0.9vw,16px)" }}
        >
          Valid Declaration
        </div>
      </div>
    </div>
  );
}
/** Full-viewport holding screen shown during the "gating" stage on desktop.
 *  Desktop never needs to rotate (the isDesktopRummy gate rules that out),
 *  so gating resolves fast — this just prevents any board content flashing
 *  while the settle window ticks. Shows a simple amber "Setting up…" pill
 *  plus optional "waiting for X to rotate" copy when mobile players are
 *  still on the same table. */
function DeskGatingScreen({
  blockers,
  showNames,
  readyCount,
  totalCount,
}: {
  blockers: import("@shared/types").Player[];
  showNames: boolean;
  readyCount: number;
  totalCount: number;
}) {
  const waiting = blockers.length > 0;
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 text-center">
      {/* Animated deck icon */}
      <div className="relative w-20 h-28 flex items-center justify-center">
        {[2, 1, 0].map((z) => (
          <div
            key={z}
            className="absolute rounded-lg"
            style={{
              width: 60 - z * 4,
              height: 84 - z * 4,
              background: "linear-gradient(140deg, #7f1d1d 0%, #991b1b 60%, #4c0519 100%)",
              border: "1px solid rgba(201,162,39,0.6)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(251,191,36,0.35)",
              transform: `rotate(${(z - 1) * 5}deg)`,
              zIndex: z,
            }}
          />
        ))}
        <div
          className="absolute w-10 h-10 rounded-full flex items-center justify-center z-10"
          style={{
            background: "linear-gradient(135deg, #C9A227, #8A6220)",
            boxShadow: "0 2px 12px rgba(201,162,39,0.60)",
            animation: "rummy-glow 1.4s ease-in-out infinite",
          }}
        >
          <span className="text-xl font-black" style={{ color: "#1f1300" }}>B</span>
        </div>
      </div>

      <div
        className="px-6 py-2.5 rounded-full font-black uppercase tracking-[0.22em] text-sm"
        style={{
          background: "linear-gradient(135deg, #fde68a, #f59e0b)",
          color: "#1f1300",
          border: "2px solid #b45309",
          boxShadow: "0 8px 24px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(255,255,255,0.4)",
          animation: "rummy-glow 1.4s ease-in-out infinite",
        }}
      >
        {waiting ? "Waiting for players…" : "Setting up the table…"}
      </div>

      {totalCount > 0 && (
        <div className="text-nostalgia-paper/50 text-sm font-semibold">
          {readyCount} / {totalCount} ready
          {waiting && showNames && (
            <span className="block mt-1 text-[12px] text-nostalgia-paper/40">
              Waiting for {blockers.map((b) => b.name).join(", ")} to rotate their device
            </span>
          )}
        </div>
      )}

      {/* Decorative card suits strip */}
      <div className="flex gap-6 text-3xl" style={{ opacity: 0.25, color: "#F5E9C9" }}>
        <span>♠</span><span>♥</span><span>♦</span><span>♣</span>
      </div>
    </div>
  );
}


/* ─────────────────────────── Sub-components ─────────────────────────── */

/**
 * Centre-screen "dropped" flourish — a face-down card slams onto the table with
 * the player's name. Pointer-events-none, self-dismissing; purely cosmetic.
 */
function DropAnnounce({ name, mine }: { name: string; mine: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[59] flex items-center justify-center pointer-events-none"
      style={{ animation: "rummy-drop-fade 2600ms ease-out forwards" }}
      role="status"
      aria-live="polite"
    >
      <div className="rummy-drop-slam flex flex-col items-center gap-3">
        <div
          className="w-20 h-28 rounded-xl flex items-center justify-center text-4xl"
          style={{
            background: "linear-gradient(140deg, #7f1d1d 0%, #991b1b 60%, #4c0519 100%)",
            border: "2px solid rgba(201,162,39,0.7)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(251,191,36,0.35)",
          }}
        >
          🃏
        </div>
        <div
          className="px-5 py-2 rounded-full font-black uppercase tracking-[0.15em] text-sm"
          style={{
            background: "linear-gradient(135deg,#b45309,#7c2d12)",
            color: "#fef3c7",
            border: "2px solid #fbbf24",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }}
        >
          {mine ? "You dropped" : `${name} dropped`}
        </div>
      </div>
    </div>
  );
}

/**
 * Centre-of-table countdown for the post-show rearrange window. Sits over the
 * (now locked) deck/pile zone — the middle of the table — as a big ring with a
 * role-aware caption. For the declarer it's a calm "you made the show / waiting"
 * note; for a loser it's an urgent "arrange to cut your points" prompt that
 * pulses red in the final 5 seconds. pointer-events-none so a loser can still
 * drag cards in the lanes below.
 */
function ArrangeCenterTimer({
  remainingSec,
  spectator,
  declarerName,
}: {
  remainingSec: number | null;
  spectator: boolean;
  declarerName: string;
}) {
  const urgent = remainingSec != null && remainingSec <= 5 && !spectator;
  const accent = spectator ? "#22c55e" : urgent ? "#ef4444" : "#fbbf24";
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none rummy-result-pop">
      <div
        className="flex items-center justify-center rounded-full font-black tabular-nums"
        style={{
          width: 88,
          height: 88,
          fontSize: 40,
          color: "#fff",
          background: "radial-gradient(circle at 50% 35%, rgba(0,0,0,0.55), rgba(0,0,0,0.78))",
          border: `4px solid ${accent}`,
          boxShadow: `0 0 26px ${accent}88, inset 0 0 14px rgba(0,0,0,0.6)`,
          animation: urgent ? "rummy-glow 0.7s ease-in-out infinite" : undefined,
        }}
      >
        {remainingSec ?? "—"}
      </div>
      <div
        className="mt-2 px-4 py-1 rounded-full text-[12px] font-black uppercase tracking-[0.12em] text-center"
        style={{
          background: spectator ? "linear-gradient(135deg,#166534,#15803d)" : "linear-gradient(135deg,#7c2d12,#b45309)",
          color: "#fff",
          border: `1.5px solid ${accent}`,
          boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
        }}
      >
        {spectator ? "🏆 You made the show" : `⏱️ ${declarerName || "Someone"} declared`}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/80 text-center px-2">
        {spectator ? "Board locked — waiting for others to arrange…" : "Arrange to cut your points"}
      </div>
    </div>
  );
}

/**
 * "At the table" — pinned below the talk panel in the right rail.
 *
 * Used to be one of the tabs, which meant that checking whose turn it was and
 * what everyone is carrying cost you the chat you were reading. The seat
 * letters match the badges on the board above, so the two lists can be
 * reconciled without reading a single name.
 */
function SidePlayersRail({
  state,
  players,
  selfId,
  nameOf,
  letterOf,
}: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  nameOf: (id: string) => string;
  letterOf: (id: string) => string;
}) {
  const order = state.playerOrder;
  return (
    <div className="rm-roster">
      <div className="rm-roster__head">
        <span>At the table</span>
        <span>{order.length} players</span>
      </div>
      <ul className="rm-roster__list">
        {order.map((id) => {
          const isSelf = id === selfId;
          const isTurn = state.turnPlayerId === id && state.phase === "playing";
          const dropped = state.droppedPlayers.includes(id);
          const out = state.eliminatedInMatch.includes(id);
          const conn = players.find((p) => p.id === id)?.isConnected ?? true;
          const autoPlaying = players.find((p) => p.id === id)?.isAutoPlaying === true;
          const score = state.cumulativeScores?.[id];
          return (
            <li
              key={id}
              className={
                "rm-roster__row" + (isTurn ? " is-turn" : "") + (out || dropped ? " is-out" : "")
              }
            >
              <span className="rm-roster__badge" aria-hidden>
                {letterOf(id)}
              </span>
              <span className="rm-roster__name">
                {isSelf ? `${nameOf(id)} (You)` : nameOf(id)}
                {dropped && <span className="rm-roster__tag">dropped</span>}
                {out && !dropped && <span className="rm-roster__tag">out</span>}
                {autoPlaying && !dropped && !out && (
                  <span className="rm-roster__tag rm-roster__tag--auto">auto</span>
                )}
              </span>
              {score != null && (
                <span className="rm-roster__score" title="Running score">
                  {score} pts
                </span>
              )}
              <span
                className={`rm-dot${conn ? "" : " rm-dot--away"}`}
                title={conn ? "Online" : "Reconnecting…"}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The turn pill — whose turn it is and how long they have, in one object.
 *
 * These were two separate chips at opposite ends of the top bar, which is a
 * strange split: the countdown is meaningless until you know whose it is, and
 * the name is not urgent until you can see the clock running out.
 */
function TurnPill({
  myTurn,
  turnPlayerName,
  phase,
  remainingSec,
}: {
  myTurn: boolean;
  turnPlayerName: string;
  phase: RummyPlayerState["phase"];
  remainingSec: number | null;
}) {
  const label =
    phase === "finished"
      ? "Round over"
      : phase === "arranging"
      ? "Show made — arrange"
      : myTurn
      ? "Your turn"
      : `${turnPlayerName}’s turn`;
  const urgent = remainingSec != null && remainingSec <= 10;
  return (
    <div className={`rm-turnpill${myTurn && phase === "playing" ? " is-mine" : ""}`} aria-live="polite">
      <span className="rm-turnpill__label">{label}</span>
      {remainingSec != null && phase === "playing" && (
        <span className={`rm-turnpill__timer${urgent ? " is-urgent" : ""}`}>
          <ClockIcon />
          {String(Math.floor(remainingSec / 60)).padStart(2, "0")}:
          {String(remainingSec % 60).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

/**
 * One seat.
 *
 * Every player gets the same card, including you — the old board gave
 * opponents a "notepad" with a fan of face-down cards and gave the local
 * player a completely different pad, so the one row that should have been
 * scannable as a set had two different vocabularies in it. The fanned card
 * backs are gone too: they encoded a number that is now simply printed.
 *
 * The two stats are hand size and running score. Opponents' POINTS are not
 * shown, because they are not knowable — that is the game.
 */
function SeatCard({
  letter,
  name,
  isSelf,
  isTurn,
  handSize,
  dropped,
  eliminated,
  connected,
  autoPlaying,
  cumulativeScore,
}: {
  letter: string;
  name: string;
  isSelf: boolean;
  isTurn: boolean;
  handSize: number;
  dropped: boolean;
  eliminated: boolean;
  connected: boolean;
  autoPlaying: boolean;
  cumulativeScore?: number;
}) {
  const out = dropped || eliminated;
  /**
   * STATUS only — never a number.
   *
   * This used to fall back to the hand size, which the stat row below already
   * prints, so every idle seat stated "13 cards" twice about forty pixels
   * apart. Two lines saying the same thing is worse than one, because the
   * reader has to check whether they actually differ.
   */
  const sub = dropped
    ? "Dropped"
    : eliminated
    ? "Eliminated"
    // Outranks the turn state: whose turn it is matters less than the fact
    // that nobody is behind the seat taking it.
    : autoPlaying
    ? "Reconnecting · auto"
    : isTurn
    // "Your turn" on somebody else's seat is a lie the second person at the
    // table would read as their own cue.
    ? (isSelf ? "Your turn" : "Playing…")
    : "Waiting";
  return (
    <div className={`rm-seat${isTurn ? " is-turn" : ""}${out ? " is-out" : ""}`}>
      <div className="rm-seat__top">
        <span className="rm-seat__avatar" aria-hidden>
          {letter}
        </span>
        <span className="rm-seat__id">
          <span className="rm-seat__name" title={name}>
            {name}
          </span>
          <span
            className={
              "rm-seat__sub" +
              (out ? " rm-seat__sub--out" : "") +
              (autoPlaying ? " rm-seat__sub--auto" : "")
            }
          >
            {sub}
          </span>
        </span>
        <span
          className={`rm-dot${connected ? "" : " rm-dot--away"}`}
          title={connected ? "Online" : "Reconnecting…"}
        />
      </div>

      <div className="rm-seat__stats">
        <span className="rm-stat" title="Cards in hand">
          <CardsIcon />
          <span className="rm-stat__value">{handSize}</span>{" "}
          {handSize === 1 ? "card" : "cards"}
        </span>
        <span className="rm-stat" title="Running score across the match">
          <LaurelIcon side="left" />
          <span className="rm-stat__value">{cumulativeScore ?? 0}</span> pts
        </span>
      </div>

      {isTurn && (
        <span className="rm-seat__badge" aria-hidden>
          {letter}
        </span>
      )}
    </div>
  );
}

/**
 * Chat, felt-native.
 *
 * The shared <Chat> component is a cream card with its own border and its own
 * fixed height — dropped onto this table it read as a piece of a different
 * application. This is the same socket contract (`chat:send`) and the same
 * quick phrases, wearing the table's tokens and filling the panel it lives in.
 */
const QUICK_PHRASES = [
  "Nice move! 👏",
  "Well played! 🔥",
  "So close! 😅",
  "Good luck! 🍀",
  "Haar gaya! 😭",
  "Mast! ✨",
];

function TableChat({ messages, selfId }: { messages: ChatMessage[]; selfId: string | null }) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function sendText(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    try {
      getSocket().emit("chat:send", { text: trimmed });
    } catch {
      /* socket down — the room banner already says so */
    }
  }

  return (
    <>
      <div className="rm-side__body">
        <div className="rm-chat">
          {messages.length === 0 && (
            <span className="rm-chat__empty">No messages yet. Say hi 👋</span>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`rm-chat__msg${m.playerId === selfId ? " is-self" : ""}`}>
              <div className="rm-chat__head">
                <span className="rm-chat__who">
                  {m.playerId === selfId ? `${m.playerName} (You)` : m.playerName}
                </span>
                <span className="rm-chat__time">
                  {new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <span className="rm-chat__text">{m.text}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div>
        <div className="rm-quick">
          {QUICK_PHRASES.map((p) => (
            <button key={p} type="button" className="rm-quick__btn" onClick={() => sendText(p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="rm-composer">
          <input
            type="text"
            className="rm-composer__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              sendText(text);
              setText("");
            }}
            placeholder="Type a message…"
            maxLength={500}
            aria-label="Chat message"
          />
          <button
            type="button"
            className="rm-composer__send"
            onClick={() => {
              sendText(text);
              setText("");
            }}
            disabled={text.trim().length === 0}
            aria-label="Send message"
            title="Send"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────
   Stroke glyphs at a single 1.6 weight, sized in em so they scale with the
   text they sit beside. Emoji were the previous answer here and they are not
   controllable: they render as someone else's colour at someone else's
   weight, and on a table this dark half of them glowed. */

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" strokeLinejoin="round" />
      {on ? (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
          <path d="M19 6a9 9 0 0 1 0 12" strokeLinecap="round" />
        </>
      ) : (
        <path d="M17 9.5l4 5m0-5l-4 5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" strokeLinecap="round" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 18h6M10 21h4" strokeLinecap="round" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.1 1 1.8l.1.3h4.8l.1-.3c.1-.7.4-1.3 1-1.8A6 6 0 0 0 12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 21V4" strokeLinecap="round" />
      <path d="M6 4h10l-1.6 3.2L16 10.5H6" strokeLinejoin="round" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="8" y="4" width="11" height="15" rx="2" />
      <path d="M5.5 7v11a2 2 0 0 0 2 2h7" strokeLinecap="round" />
    </svg>
  );
}

/** The one nostalgic flourish the table earns — and it sits on the numbers
 *  you check every turn, which is the only place ornament pays rent. */
function LaurelIcon({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className="rm-points__laurel"
      width="12"
      height="16"
      viewBox="0 0 14 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
      style={side === "right" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M10 2C5 5 3 10 4.5 18" strokeLinecap="round" />
      <path d="M8.6 5.2c-1.8-.5-3 .2-3.4 1.6M7.4 9c-1.9-.4-3 .4-3.3 1.9M6.6 13c-1.9-.3-2.9.6-3.1 2" strokeLinecap="round" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h13M4 12h9M4 17h5" strokeLinecap="round" />
      <path d="M19 9V19m0 0 2.2-2.4M19 19l-2.2-2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AutoGroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="7" height="7" rx="1.6" />
      <rect x="14" y="4" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <path d="M17.5 14v7M14 17.5h7" strokeLinecap="round" />
    </svg>
  );
}

function DiscardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 11a8 8 0 1 0-1.6 5.6" strokeLinecap="round" />
      <path d="M20 5.5V11h-5.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" strokeLinejoin="round" />
      <path d="M14.5 6.5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 12 20 4l-4.5 16-3.5-6.5L4 12Z" strokeLinejoin="round" />
    </svg>
  );
}

function MeldStatusIcon({ ok }: { ok: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
      {ok ? (
        <path d="m8 12.4 2.6 2.6L16 9.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m9 9 6 6m0-6-6 6" strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * The closed deck. The pile you may draw from wears a brass ring — the ring
 * is the affordance, so the deck does not also need a permanent border.
 */
function ClosedDeck({
  count,
  canDraw,
  onDraw,
}: {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  return (
    <div className="rm-slot">
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        className={`rm-slot__card${canDraw ? " is-live" : ""}`}
        title="Draw from the closed deck (D)"
      >
        <FaceDownCard />
      </button>
      <span className="rm-slot__label">Closed Deck</span>
      <span className="rm-slot__meta">{count} Cards</span>
    </div>
  );
}

/**
 * The wild joker — a rule of the round on display, not a pile you can act on.
 * The brass mount is what says "reference, not target"; every other slot here
 * is something you either draw from or drop onto.
 */
function WildJokerSlot({ card }: { card: CardType }) {
  return (
    <div className="rm-slot">
      <div className="rm-slot__card">
        <span className="rm-slot__mount">
          <PlayingCard card={card} />
        </span>
      </div>
      <span className="rm-slot__label">Wild Joker</span>
      <span className="rm-slot__meta">Any {rankWord(card.rank)} is wild</span>
    </div>
  );
}

/** Spoken form of a rank, for the wild-joker caption. */
function rankWord(rank: string): string {
  const named: Record<string, string> = {
    A: "Ace",
    J: "Jack",
    Q: "Queen",
    K: "King",
    T: "10",
  };
  return named[rank] ?? rank;
}

/**
 * The discard pile — both a draw source and a drop target, which is why it is
 * the one slot that shows two different rings (brass when you may take from
 * it, red when a dragged card is over it).
 */
function DiscardSlot({
  top,
  pile,
  canDraw,
  onDraw,
  dragOver,
  wildRank,
}: {
  top: CardType | null;
  pile: CardType[];
  canDraw: boolean;
  onDraw: () => void;
  dragOver: boolean;
  wildRank: string;
}) {
  const [logOpen, setLogOpen] = useState(false);
  return (
    /**
     * The drop target is this WRAPPER, not the button inside it.
     *
     * The button is disabled for the whole discard phase (you may only DRAW
     * from the pile on the draw half of a turn) — and the discard phase is
     * precisely when you want to drag a card onto it. Hanging
     * `data-rummy-drop` on the disabled control would have made the pile
     * undroppable exactly when it matters, and `resolveDropTarget` walks up
     * from the hit element, so the wrapper catches it either way.
     */
    <div className="rm-slot" data-rummy-drop="openpile">
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw || !top}
        className={
          "rm-slot__card" +
          (dragOver ? " is-over" : canDraw && top ? " is-live" : "")
        }
        title={top ? "Draw the top discard (O), or drop a card here to discard" : "Discard pile is empty"}
      >
        {top ? (
          <PlayingCard card={top} isWildJoker={top.rank === wildRank} />
        ) : (
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: "var(--rm-card-w)",
              height: "calc(var(--rm-card-w) * var(--rm-card-ratio))",
              borderRadius: "var(--rm-radius-card)",
              border: "1px dashed var(--rm-edge-strong)",
              color: "var(--rm-ink-low)",
              fontSize: "var(--rm-text-xs)",
            }}
          >
            Empty
          </span>
        )}
      </button>
      <span className="rm-slot__label">Discard Pile</span>

      {/**
        * This was a bare `▾` glyph — decoration that looked exactly like a
        * disclosure control and did nothing, under the one pile where a caret
        * has an obvious meaning. Players click it.
        *
        * It does the obvious thing now, because the data was already here:
        * `openPile` is the whole discard history and the wire type documents
        * it as public information. Knowing what has been thrown is a real part
        * of playing rummy well, and it was being withheld for no reason.
        */}
      <button
        type="button"
        className="rm-slot__more"
        onClick={() => setLogOpen((o) => !o)}
        aria-expanded={logOpen}
        disabled={pile.length === 0}
        title={
          pile.length === 0
            ? "Nothing discarded yet"
            : `Show all ${pile.length} discarded cards`
        }
      >
        <span className="rm-stat__value">{pile.length}</span> thrown
        <span className={`rm-slot__caret${logOpen ? " is-open" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {logOpen && <DiscardLog pile={pile} wildRank={wildRank} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

/**
 * The discard history, newest first — the order you actually think in
 * ("what went down last turn?"), not the chronological order the server
 * stores it in.
 *
 * Anchored ABOVE the pile so opening it never covers the card you are
 * deciding whether to draw.
 */
function DiscardLog({
  pile,
  wildRank,
  onClose,
}: {
  pile: CardType[];
  wildRank: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const t = window.setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const newestFirst = pile.slice().reverse();
  return (
    <div ref={ref} className="rm-pilelog" role="dialog" aria-label="Discard pile history">
      <div className="rm-pilelog__head">
        <span>Discarded · newest first</span>
        <button type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="rm-pilelog__cards">
        {newestFirst.map((c, i) => (
          <PlayingCard
            key={`${c.id}-${i}`}
            card={c}
            small
            isWildJoker={c.rank === wildRank}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The declare target. Dashed, because on this table a dashed edge means
 * exactly one thing: a place to put something.
 */
function FinishSlot({ dragOver }: { dragOver: boolean }) {
  return (
    <div className="rm-slot">
      <div
        data-rummy-drop="finishslot"
        className={`rm-finish${dragOver ? " is-over" : ""}`}
        title="Drop your last card here to declare"
      >
        <FlagIcon />
        <span className="rm-finish__title">Finish Slot</span>
        <span className="rm-finish__note">First to declare wins the round</span>
      </div>
    </div>
  );
}

/**
 * One meld lane. Divided from its neighbours by a hairline rather than boxed:
 * a box per meld put five nested frames inside a panel that is itself a frame,
 * and the status line already tells you where one lane ends and the next
 * begins.
 */
function GroupLane({
  groupId,
  cardIds,
  byId,
  wildRank,
  selected,
  draggingIds,
  classification,
  dragOver,
  onTap,
  onDragBegin,
  onDragHover,
  onDragRelease,
  onUngroup,
}: {
  groupId: string;
  cardIds: string[];
  byId: Map<string, CardType>;
  wildRank: string;
  selected: Set<string>;
  draggingIds: string[];
  classification?: MeldClassification;
  dragOver: boolean;
  onTap: (id: string) => void;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
  onUngroup: () => void;
}) {
  const cls = classification;
  const label = cls?.label ?? "—";
  const ok = cls?.kind !== "invalid" && cls?.kind !== "incomplete";
  return (
    <div
      data-rummy-drop={`group:${groupId}`}
      className={`rm-meld${dragOver ? " is-over" : ""}`}
    >
      <button className="rm-meld__ungroup" onClick={onUngroup} title="Break this meld">
        ✕
      </button>
      <div className="rm-meld__cards">
        {cardIds.map((id, idx) => {
          const card = byId.get(id);
          if (!card) return null;
          return (
            <DraggableCard
              key={id}
              cardId={id}
              card={card}
              wildRank={wildRank}
              selected={selected}
              draggingIds={draggingIds}
              onTap={onTap}
              onDragBegin={onDragBegin}
              onDragHover={onDragHover}
              onDragRelease={onDragRelease}
              // Melds overlap: a lane is read as ONE thing, and the left edge
              // of each card carries the rank and suit you need to verify it.
              offset={idx === 0 ? 0 : -22}
            />
          );
        })}
      </div>
      <span
        className="rm-meld__status"
        style={{ color: ok ? "var(--rm-valid)" : "var(--rm-danger)" }}
      >
        <MeldStatusIcon ok={ok} />
        {label}
      </span>
    </div>
  );
}

/**
 * The hand.
 *
 * Cards are SPREAD, not fanned. Thirteen cards fit at full width here, and a
 * fan would hide the very corners you are reading to decide what to keep —
 * the overlap belongs in the melds, where a lane is one object.
 */
function UngroupedLane({
  cardIds,
  byId,
  wildRank,
  selected,
  draggingIds,
  dragOver,
  onTap,
  onDragBegin,
  onDragHover,
  onDragRelease,
}: {
  cardIds: string[];
  byId: Map<string, CardType>;
  wildRank: string;
  selected: Set<string>;
  draggingIds: string[];
  dragOver: boolean;
  onTap: (id: string) => void;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
}) {
  return (
    <div data-rummy-drop="ungrouped" className={`rm-lane${dragOver ? " is-over" : ""}`}>
      {cardIds.map((id) => {
        const card = byId.get(id);
        if (!card) return null;
        return (
          <DraggableCard
            key={id}
            cardId={id}
            card={card}
            wildRank={wildRank}
            selected={selected}
            draggingIds={draggingIds}
            onTap={onTap}
            onDragBegin={onDragBegin}
            onDragHover={onDragHover}
            onDragRelease={onDragRelease}
            offset={0}
          />
        );
      })}
      {cardIds.length === 0 && (
        <span className="rm-lane__empty">
          Drop cards here · all 13 must be grouped to declare
        </span>
      )}
    </div>
  );
}

function DraggableCard({
  cardId,
  card,
  wildRank,
  selected,
  draggingIds,
  onTap,
  onDragBegin,
  onDragHover,
  onDragRelease,
  offset,
}: {
  cardId: string;
  card: CardType;
  wildRank: string;
  selected: Set<string>;
  draggingIds: string[];
  onTap: (id: string) => void;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
  offset: number;
}) {
  const isDragging = draggingIds.includes(cardId);
  const drag = useCardPointerDrag({
    cardId,
    selected,
    onDragBegin,
    onDragHover,
    onDragRelease,
    onTap,
  });
  return (
    <div
      {...drag}
      style={{
        ...drag.style,
        marginLeft: offset,
        opacity: isDragging ? 0.35 : 1,
        zIndex: selected.has(cardId) ? 10 : 1,
        transform: selected.has(cardId) ? "translateY(-6px)" : "translateY(0)",
        transition: "transform 0.12s ease",
      }}
    >
      <PlayingCard
        card={card}
        isWildJoker={card.rank === wildRank}
        selected={selected.has(cardId)}
      />
    </div>
  );
}

/**
 * The "start a new meld here" target.
 *
 * Mounted at all times, not only while a drag is in flight. The drag-only
 * version could not teach the interaction it was the target of: you had to
 * already know cards were draggable in order to make it appear.
 */
function AddMeldZone({ active, atCap }: { active: boolean; atCap: boolean }) {
  return (
    <div
      data-rummy-drop={atCap ? undefined : "new"}
      className={`rm-addmeld${active ? " is-over" : ""}${atCap ? " is-full" : ""}`}
      title={atCap ? `Maximum ${MAX_GROUPS} melds` : "Drag cards here to start a new meld"}
    >
      <span className="rm-addmeld__plus" aria-hidden>
        ＋
      </span>
      <span>{atCap ? `Max ${MAX_GROUPS}` : "Add Meld"}</span>
    </div>
  );
}

/**
 * A tidy-up tool: what it does on the first line, how it will do it on the
 * second. Both of these rearrange thirteen cards at once, which is worth
 * spelling out — a lone "Sort" gives no clue whether it sorts by suit or by
 * rank, and undoing it by hand is a minute of dragging.
 */
function ToolButton({
  icon,
  label,
  note,
  onClick,
  title,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  note: string;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="rm-tool" onClick={onClick} title={title} disabled={disabled}>
      {icon}
      <span>
        <span className="rm-tool__label">{label}</span>
        <br />
        <span className="rm-tool__note">{note}</span>
      </span>
    </button>
  );
}

/**
 * The two numbers that decide whether to declare.
 *
 *   HAND   — what the cards in your hand are worth as they stand.
 *   GROUND — what you actually lose if someone shows right now, which is the
 *            same number minus anything already sitting in a valid meld.
 *
 * They are separate because they diverge exactly when it matters: the moment
 * your first life lands, GROUND drops and HAND does not. Only GROUND is
 * colour-coded, since it is the one you are steering.
 */
function PointsReadout({ hand, ground }: { hand: number; ground: number }) {
  const tone =
    ground >= 80 ? "rm-points__value--warn" : ground >= 50 ? "rm-points__value--mid" : "rm-points__value--ok";
  return (
    <div className="rm-points" title="Hand points as dealt · what you lose if caught now">
      <LaurelIcon side="left" />
      <div className="rm-points__cell">
        <span className="rm-points__label">Hand points</span>
        <span className="rm-points__value">{hand}</span>
      </div>
      <div className="rm-points__cell">
        <span className="rm-points__label">Ground points</span>
        <span className={`rm-points__value ${tone}`}>{ground}</span>
      </div>
      <LaurelIcon side="right" />
    </div>
  );
}

/**
 * Overflow for the two actions that are real but rare — forming a meld from a
 * selection, and dropping the round. Keeping them off the bar means the bar
 * never has more than two things you could mistake for each other.
 */
function ToolsPopover({
  onGroup,
  onDrop,
  canDrop,
  onClose,
}: {
  onGroup: () => void;
  onDrop: () => void;
  canDrop: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Deferred: the click that OPENED the popover is still propagating, and
    // binding synchronously would close it on the same gesture.
    const t = window.setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        right: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: "var(--rm-space-2xs)",
        minWidth: 176,
        padding: "var(--rm-space-xs)",
        borderRadius: "var(--rm-radius-zone)",
        border: "var(--rm-rule) solid var(--rm-edge)",
        background: "var(--rm-panel)",
        boxShadow: "var(--rm-lift-drag)",
      }}
    >
      <button type="button" role="menuitem" className="rm-chip" onClick={onGroup}>
        Group selected <span className="rm-kbd">G</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="rm-chip"
        onClick={onDrop}
        disabled={!canDrop}
        title="Forfeit this round and stop taking turns"
      >
        Drop round
      </button>
      <span
        style={{
          padding: "var(--rm-space-2xs)",
          fontSize: "var(--rm-text-xs)",
          color: "var(--rm-ink-low)",
          lineHeight: 1.5,
        }}
      >
        D draw · O open pile · S sort · A auto · G group · D discard · Enter declare · Esc clear
      </span>
    </div>
  );
}

function PointsPanel({
  livePoints,
  finishReadiness,
  state,
}: {
  livePoints: ReturnType<typeof computeLivePoints>;
  finishReadiness: ReturnType<typeof evaluateFinishReadiness>;
  state: RummyPlayerState;
}) {
  return (
    <div className="text-sm space-y-3">
      <div className="rounded-lg bg-white/60 p-3 border" style={{ borderColor: "#E6D4B7" }}>
        <div className="text-[11px] uppercase tracking-widest text-nostalgia-brass font-bold">Live Points</div>
        <div className="flex justify-between mt-1 text-nostalgia-pen">
          <span>Hand total</span><span className="font-mono">{livePoints.handTotal}</span>
        </div>
        <div className="flex justify-between text-nostalgia-pen">
          <span>If caught now</span><span className="font-mono">{livePoints.caughtNow}</span>
        </div>
        <div className="flex justify-between text-nostalgia-pen">
          <span>If you drop</span><span className="font-mono">{livePoints.dropNow}</span>
        </div>
        <div className="flex justify-between text-nostalgia-pen">
          <span>Pure protected</span>
          <span className={livePoints.protectedByPure ? "text-emerald-700 font-semibold" : "text-nostalgia-pen-red font-semibold"}>
            {livePoints.protectedByPure ? "yes" : "no"}
          </span>
        </div>
      </div>
      <div className="rounded-lg bg-white/60 p-3 border" style={{ borderColor: "#E6D4B7" }}>
        <div className="text-[11px] uppercase tracking-widest text-nostalgia-brass font-bold">Declare Check</div>
        <div className="mt-1">
          {finishReadiness.ready ? (
            <span className="text-emerald-700 font-bold">Ready to declare</span>
          ) : (
            <ul className="list-disc list-inside text-nostalgia-pen-red text-xs space-y-0.5">
              {finishReadiness.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      </div>
      {state.matchMode !== "single" && (
        <div className="rounded-lg bg-white/60 p-3 border" style={{ borderColor: "#E6D4B7" }}>
          <div className="text-[11px] uppercase tracking-widest text-nostalgia-brass font-bold mb-1">
            Pool Standings
          </div>
          {state.playerOrder.map((id) => (
            <div key={id} className="flex justify-between text-xs text-nostalgia-pen">
              <span className="truncate">{id.slice(-4)}</span>
              <span className="font-mono">
                {(state.cumulativeScores?.[id] ?? 0)} / {state.poolTarget ?? "∞"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmOverlay({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center">
      <div className="bg-nostalgia-paper border border-nostalgia-paper-edge rounded-xl p-6 max-w-md mx-4 shadow-lift-3">
        <div className="text-lg font-black text-nostalgia-pen mb-2">{title}</div>
        <div className="text-nostalgia-pen/70 text-sm mb-5">{body}</div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md bg-black/10 hover:bg-black/15 text-nostalgia-pen px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-[#7B1E2B] hover:bg-[#931f2e] px-4 py-2 text-sm font-bold text-nostalgia-paper"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
