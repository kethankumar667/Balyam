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
import { PlayingCard } from "./Card";
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
import { suggestArrangement } from "./autoArrange";
import { isRummySoundEnabled, rummySfx, setRummySoundEnabled } from "./sound";
import Chat from "../../components/Chat";
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
  const myTurn = state.turnPlayerId === selfId;
  const canDraw = myTurn && state.turnAction === "draw" && state.phase === "playing";
  const canDiscardOrDeclare =
    myTurn && state.turnAction === "discardOrDeclare" && state.phase === "playing";

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
    const wasPlaying = prevPhaseForBurst.current === "playing";
    const justFinished = state.phase === "finished";
    prevPhaseForBurst.current = state.phase;
    if (!wasPlaying || !justFinished) return;
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
  function autoArrange() {
    const preserved: Group[] = [];
    const pool: CardType[] = [];
    for (const g of layout.groups) {
      const cls = meldByGroupId[g.id];
      if (cls?.valid) preserved.push(g);
      else for (const cid of g.cardIds) {
        const c = byId.get(cid);
        if (c) pool.push(c);
      }
    }
    for (const cid of layout.ungrouped) {
      const c = byId.get(cid);
      if (c) pool.push(c);
    }
    if (pool.length === 0) return;
    const arr = suggestArrangement(pool, wildRank as Rank);
    const fresh: Group[] = arr.groups.map((cards) => ({
      id: newGroupId(),
      cardIds: cards.map((c) => c.id),
    }));
    setLayout({
      groups: [...preserved, ...fresh].slice(0, MAX_GROUPS),
      ungrouped: arr.ungrouped.map((c) => c.id),
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
        case "d":
          if (canDraw) { e.preventDefault(); drawFromClosed(); }
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

  /* ─── Seat assignment — generalizes the reference mock's top/left/right
     3-seat composition to any opponent count (rummy seats up to 6 total,
     i.e. 5 opponents). The first two opponents flank the page as side
     notepads; everyone else stacks along the top edge. A single
     opponent sits top-center (head-to-head) rather than alone on a
     side. ─── */
  const sideSeatCount = opponentIds.length <= 1 ? 0 : 2;
  const leftOpponentId = sideSeatCount > 0 ? opponentIds[0] : undefined;
  const rightOpponentId = sideSeatCount > 1 ? opponentIds[1] : undefined;
  const topOpponentIds = opponentIds.slice(sideSeatCount);

  /* ─────────────────────────── Render ─────────────────────────── */
  const selfName = players.find((p) => p.id === selfId)?.name ?? "You";
  const selfCumulative = selfId ? state.cumulativeScores?.[selfId] : undefined;
  const handHint = canDraw
    ? "☆ Your turn — pick a card from the deck or the discard pile."
    : canDiscardOrDeclare
    ? "☆ Discard a card, or drop one into the Finish Slot to declare."
    : null;

  function renderSeat(id: string | undefined, orientation: "vertical" | "horizontal") {
    if (!id) return null;
    return (
      <Notepad
        key={id}
        orientation={orientation}
        name={nameOf(id)}
        isTurn={state.turnPlayerId === id}
        handSize={state.handSizes[id] ?? 0}
        dropped={state.droppedPlayers.includes(id)}
        eliminated={state.eliminatedInMatch.includes(id)}
        cumulativeScore={state.cumulativeScores?.[id]}
        poolTarget={state.poolTarget}
      />
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #6D4323 0%, #4A2C16 55%, #3a2010 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Desk clutter — purely decorative, never intercepts clicks. */}
      <div className="absolute top-14 left-3 w-12 h-16 text-nostalgia-paper/70 pointer-events-none z-10">
        <PaperclipIcon />
      </div>
      <div className="absolute bottom-2 left-2 w-24 h-24 pointer-events-none opacity-90">
        <CornerNotebook />
      </div>
      <div className="absolute bottom-2 right-2 w-28 h-24 pointer-events-none opacity-90">
        <CornerCricketCoffee />
      </div>

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
            style={{
              background: "linear-gradient(160deg, #6D4323 0%, #4A2C16 55%, #3a2010 100%)",
            }}
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
          bg="linear-gradient(160deg, #6D4323 0%, #4A2C16 55%, #3a2010 100%)"
        />
      )}

      {/* ───── Top bar — torn-paper "Bhalyam" tag + turn note ───── */}
      <div
        className="relative flex items-center justify-between px-5 py-2 border-b"
        style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(0,0,0,0.35)" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onLeave}
            className="rounded-md bg-black/25 hover:bg-black/35 px-3 py-1.5 text-sm font-semibold text-nostalgia-paper"
          >
            ← Leave
          </button>
          <div className="bg-nostalgia-paper text-nostalgia-pen px-3 py-1 rounded-sm shadow-lift-2 -rotate-1 flex items-baseline gap-2">
            <span className="font-script text-lg leading-none">Bhalyam</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Rummy</span>
            <span className="font-mono text-xs opacity-60">· {roomCode ?? "ROOM"}</span>
          </div>
          <TurnIndicator
            myTurn={myTurn}
            turnPlayerName={nameOf(state.turnPlayerId)}
            action={state.turnAction}
            remainingSec={remainingSec}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTutorialOpen(true)}
            className="rounded-md bg-black/25 hover:bg-black/35 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-nostalgia-paper"
            title="How to play"
          >
            📖 Rules
          </button>
          <button
            onClick={toggleSound}
            className="rounded-md bg-black/25 hover:bg-black/35 px-3 py-1.5 text-sm"
            title="Sound"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-md bg-black/25 hover:bg-black/35 px-3 py-1.5 text-sm"
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* ───── Main row: table area (wood) + chat/voice/players sidebar ───── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 340px",
          minHeight: "calc(100vh - 50px)",
        }}
      >
        {/* ── Table area — wood desk surface. Side seats flank the page;
            overflow seats (4th/5th opponent) stack along the top edge so
            a 6-player table never has nowhere to put a seat. ── */}
        <div
          className="flex flex-col items-center gap-3 px-4 py-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 50px)" }}
        >
          {topOpponentIds.length > 0 && (
            <div className="flex gap-3 justify-center flex-wrap">
              {topOpponentIds.map((id) => renderSeat(id, "horizontal"))}
            </div>
          )}

          <div className="flex items-start gap-3 justify-center w-full flex-1">
            {renderSeat(leftOpponentId, "vertical")}

            {/* ── The page — the felt ── */}
            <main className="nostalgia-paper relative flex flex-col px-6 py-5 gap-3 rounded-2xl shadow-lift-3 flex-1 max-w-[920px] overflow-hidden">
              <BackgroundDoodle />
              {/* Corner suit watermarks — poker-table authenticity without
                  cluttering the play area. pointer-events: none. */}
              <span aria-hidden className="absolute top-3 left-3 text-2xl font-black pointer-events-none select-none" style={{ color: "#2E2419", opacity: 0.07 }}>♠</span>
              <span aria-hidden className="absolute top-3 right-3 text-2xl font-black pointer-events-none select-none" style={{ color: "#A8332B", opacity: 0.07 }}>♥</span>
              <span aria-hidden className="absolute bottom-3 left-3 text-2xl font-black pointer-events-none select-none" style={{ color: "#A8332B", opacity: 0.07 }}>♦</span>
              <span aria-hidden className="absolute bottom-3 right-3 text-2xl font-black pointer-events-none select-none" style={{ color: "#2E2419", opacity: 0.07 }}>♣</span>

              {/* Decks + wild joker + finish slot — framed like a page clipping */}
              <div
                className="relative flex items-start justify-center gap-8 mt-2 mx-auto px-8 py-4 rounded-2xl"
                style={{ border: "2px dashed rgba(46,36,25,0.28)" }}
              >
                <ClosedDeck
                  count={state.closedDeckCount}
                  canDraw={canDraw}
                  onDraw={drawFromClosed}
                />
                <WildJokerDisplay card={state.wildJoker} />
                <OpenPile
                  top={state.topOfOpenPile}
                  canDraw={canDraw}
                  onDraw={drawFromOpen}
                  dragOver={dragOverTarget === "openpile"}
                  wildRank={wildRank}
                />
                <FinishSlot dragOver={dragOverTarget === "finishslot"} />
              </div>

              {handHint && (
                <div className="relative text-center font-script text-base text-nostalgia-pen/70">
                  {handHint}
                </div>
              )}

              {/* Group lanes */}
              <div
                className="relative flex-1 mt-1 rounded-xl px-4 py-4 overflow-x-auto"
                style={{
                  background: "rgba(255,255,255,0.32)",
                  border: "1px solid rgba(46,36,25,0.18)",
                }}
              >
                <div className="flex items-stretch gap-3 flex-wrap min-h-[120px]">
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
                  {draggingIds.length > 0 && (
                    <NewMeldZone
                      active={dragOverTarget === "new"}
                      atCap={layout.groups.length >= MAX_GROUPS}
                    />
                  )}
                </div>
              </div>

              {/* Ribbon — warm tagline above the hand (nostalgia-brief.md
                  "Storytelling" pillar). Static; no fabricated dynamic copy. */}
              <div className="relative mx-auto -rotate-1 bg-nostalgia-pen text-nostalgia-paper text-xs font-script px-4 py-1 rounded-sm shadow-lift-1">
                Good cards. Good friends. Great memories! :)
              </div>

              {/* Hand row: self pad + ungrouped lane.
                  Fix 5: A vivid glow border wraps the whole self-hand area
                  whenever it is the local player's turn, making it instantly
                  obvious whose action is expected. */}
              <div
                className="relative flex items-stretch gap-3 rounded-xl transition-all duration-300"
                style={myTurn ? {
                  boxShadow: "0 0 0 3px #C9A227, 0 0 24px rgba(201,162,39,0.50)",
                  border: "2px solid #C9A227",
                  padding: "6px",
                  background: "rgba(201,162,39,0.06)",
                  animation: "rummy-glow 1.4s ease-in-out infinite",
                } : { border: "2px solid transparent", padding: "6px" }}
              >
                {myTurn && (
                  <div
                    className="absolute -top-5 left-0 right-0 text-center pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    <span
                      className="inline-block text-[10px] font-black uppercase tracking-[0.2em] px-3 py-0.5 rounded-full"
                      style={{
                        background: "linear-gradient(135deg, #C9A227, #8A6220)",
                        color: "#1f1300",
                        boxShadow: "0 2px 8px rgba(201,162,39,0.55)",
                      }}
                    >
                      ✦ Your Hand
                    </span>
                  </div>
                )}
                <SelfPad name={selfName} cumulativeScore={selfCumulative} poolTarget={state.poolTarget} isTurn={myTurn} />
                <div className="flex-1">
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
                </div>
              </div>

              {/* Fix 3 & 6: Collapsible action rail.
                  Critical actions (DISCARD / DECLARE) are always visible.
                  Secondary tools (DROP / SORT / AUTO / GROUP) live behind a
                  toggle so the board doesn't feel cluttered by default. */}
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #6D4323 0%, #4A2C16 100%)",
                  border: "1px solid rgba(0,0,0,0.35)",
                }}
              >
                {/* Always-visible primary row */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  {/* Fix 6: Redesigned score chip — clear hierarchy, two values easy to read */}
                  <div
                    className="flex items-center gap-0 rounded-lg overflow-hidden mr-1 flex-shrink-0"
                    style={{ border: "1px solid rgba(201,162,39,0.40)", background: "rgba(0,0,0,0.30)" }}
                  >
                    <div className="flex flex-col items-center px-3 py-1.5" style={{ borderRight: "1px solid rgba(201,162,39,0.25)" }}>
                      <span className="text-[9px] uppercase tracking-widest text-nostalgia-paper/50 font-bold leading-none">Hand pts</span>
                      <span className="text-nostalgia-paper font-black text-xl leading-tight tabular-nums">{livePoints.handTotal}</span>
                    </div>
                    <div className="flex flex-col items-center px-3 py-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-nostalgia-paper/50 font-bold leading-none">If caught</span>
                      <span className="font-black text-lg leading-tight tabular-nums" style={{ color: livePoints.caughtNow >= 80 ? "#ef4444" : livePoints.caughtNow >= 50 ? "#f97316" : "#86efac" }}>
                        {livePoints.caughtNow}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1" />
                  {/* Expand/collapse toggle (Fix 3) */}
                  <button
                    onClick={() => setControlsOpen((o) => !o)}
                    className="rounded-full bg-black/25 hover:bg-black/40 px-3 py-1.5 text-nostalgia-paper/70 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                    title="Toggle tools"
                  >
                    <span>{controlsOpen ? "▾" : "▸"}</span>
                    <span>Tools</span>
                  </button>
                  <ActionButton
                    onClick={discardSelected}
                    disabled={!canDiscardOrDeclare || selected.size !== 1}
                    kbd="Space"
                    variant="warn"
                  >
                    DISCARD
                  </ActionButton>
                  <ActionButton
                    onClick={declareViaButton}
                    disabled={!canDiscardOrDeclare || !finishReadiness.ready}
                    kbd="Enter"
                    variant="primary"
                  >
                    DECLARE ▸
                  </ActionButton>
                </div>
                {/* Collapsible secondary tools row */}
                {controlsOpen && (
                  <div
                    className="flex flex-wrap items-center gap-2 px-4 pb-2.5 pt-1"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <ActionButton onClick={() => setConfirmDrop(true)} disabled={!canDraw} kbd="—">
                      DROP
                    </ActionButton>
                    <ActionButton onClick={sortUngrouped} kbd="S">
                      SORT
                    </ActionButton>
                    <ActionButton onClick={autoArrange} kbd="A">
                      AUTO
                    </ActionButton>
                    <ActionButton onClick={groupSelected} kbd="G">
                      GROUP
                    </ActionButton>
                    <div className="ml-2 text-nostalgia-paper/40 text-[10px] font-mono italic">
                      Keyboard: D draw · O open · G group · S sort · A auto · Space discard · Enter declare
                    </div>
                  </div>
                )}
              </div>

              {/* Fix 4: Turn-time warning — pulsing border + countdown chip */}
              <TurnTimeWarning deadline={state.turnDeadline} active={myTurn} />

              {error && (
                <div className="relative mx-auto rounded-md bg-nostalgia-pen-red/90 border border-nostalgia-pen-red text-nostalgia-paper text-sm px-4 py-2 mt-1">
                  {error}
                </div>
              )}
            </main>

            {renderSeat(rightOpponentId, "vertical")}
          </div>
        </div>

        {/* ── Right tab panel — same cream tone as Chat/PlayerList/VoicePanel
            so their existing styling (already cream-first) stops clashing
            with a dark backdrop. ── */}
        <aside
          className="border-l flex flex-col"
          style={{ background: "#F7EEDC", borderColor: "rgba(0,0,0,0.18)" }}
        >
          <div className="flex border-b" style={{ borderColor: "#E6D4B7" }}>
            {(["chat", "voice", "players", "points", ...(history.length > 0 || champion ? (["history"] as const) : [])] as RightTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-[12px] uppercase tracking-widest py-2.5 font-bold transition ${
                  activeTab === tab
                    ? "text-nostalgia-pen border-b-2 border-nostalgia-brass bg-nostalgia-paper-edge/40"
                    : "text-[#9C8568] hover:text-[#6E5E4D]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === "chat" && <Chat messages={messages} selfId={selfId} />}
            {activeTab === "voice" && (
              <VoicePanel players={players} selfId={selfId} restoreOrientation="any" />
            )}
            {activeTab === "players" && <PlayerList players={players} selfId={selfId} />}
            {activeTab === "points" && (
              <PointsPanel
                livePoints={livePoints}
                finishReadiness={finishReadiness}
                state={state}
              />
            )}
            {activeTab === "history" && (
              <RummyRoomHistory variant="panel" density="desktop" history={history} champion={champion} players={players} showTitle={false} />
            )}
          </div>
        </aside>
      </div>

      {/* Drop confirm */}
      {confirmDrop && (
        <ConfirmOverlay
          title="Drop this round?"
          body="You forfeit 20 points and skip the rest of this round."
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

function TurnIndicator({
  myTurn,
  turnPlayerName,
  action,
  remainingSec,
}: {
  myTurn: boolean;
  turnPlayerName: string;
  action: string;
  remainingSec: number | null;
}) {
  const tone = myTurn
    ? "bg-nostalgia-brass/30 border-nostalgia-brass text-nostalgia-paper"
    : "bg-black/20 border-black/30 text-nostalgia-paper/70";
  const label = myTurn ? `YOUR TURN · ${action === "draw" ? "DRAW" : "DISCARD"}` : `${turnPlayerName.toUpperCase()} · ${action.toUpperCase()}`;
  return (
    <div className={`flex items-center gap-2 border rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-widest ${tone}`}>
      <span>{label}</span>
      {remainingSec != null && (
        <span className="font-mono text-nostalgia-paper">
          {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function Notepad({
  orientation,
  name,
  isTurn,
  handSize,
  dropped,
  eliminated,
  cumulativeScore,
  poolTarget,
}: {
  orientation: "vertical" | "horizontal";
  name: string;
  isTurn: boolean;
  handSize: number;
  dropped: boolean;
  eliminated: boolean;
  cumulativeScore?: number;
  poolTarget: number | null;
}) {
  const opacity = eliminated || dropped ? "opacity-50" : "opacity-100";
  const showsPool = poolTarget != null && cumulativeScore != null;
  const isVertical = orientation === "vertical";
  const fanCount = Math.min(handSize, isVertical ? 13 : 6);
  return (
    <div
      className={`relative flex-shrink-0 bg-nostalgia-paper rounded-md shadow-lift-2 ${opacity} ${isVertical ? "px-3 py-3 w-[120px]" : "px-3 py-2 w-[150px]"} transition-all duration-300`}
      style={{
        border: isTurn ? "2px solid #C9A227" : "1px solid rgba(46,36,25,0.18)",
        boxShadow: isTurn
          ? "0 0 0 4px rgba(201,162,39,0.30), 0 0 20px rgba(201,162,39,0.25)"
          : undefined,
        animation: isTurn ? "rummy-glow 1.4s ease-in-out infinite" : undefined,
        backgroundImage:
          "radial-gradient(circle at 4px center, rgba(46,36,25,0.25) 1.6px, transparent 1.6px)",
        backgroundSize: "100% 14px",
        backgroundPosition: "0 6px",
        backgroundRepeat: "repeat-y",
      }}
    >
      {/* Turn badge pinned above the notepad */}
      {isTurn && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 2 }}>
          <span
            className="text-[8px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
            style={{ background: "linear-gradient(135deg, #C9A227, #8A6220)", color: "#1f1300", boxShadow: "0 2px 6px rgba(201,162,39,0.5)" }}
          >
            ▸ Playing
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5 pl-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 transition-all duration-300"
          style={{
            background: isTurn ? "linear-gradient(135deg, #C9A227, #8A6220)" : "rgba(156,122,60,0.30)",
            color: isTurn ? "#1f1300" : "#2E2419",
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-script text-sm text-nostalgia-pen truncate leading-tight">{name}</div>
          <div className="text-[9px] text-nostalgia-pen/55 font-semibold uppercase tracking-wide">
            {dropped ? "Dropped" : eliminated ? "Eliminated" : `${handSize} card${handSize === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>
      {!dropped && !eliminated && fanCount > 0 && (
        <div
          className={`pl-2 mt-1.5 ${isVertical ? "flex flex-col items-start" : "flex items-center"}`}
          aria-hidden
        >
          {Array.from({ length: fanCount }).map((_, i) => (
            <div
              key={i}
              style={isVertical ? { marginTop: i === 0 ? 0 : -36 } : { marginLeft: i === 0 ? 0 : -24 }}
            >
              <CardBackDesktop small />
            </div>
          ))}
        </div>
      )}
      {showsPool && (
        <div className="pl-2 mt-1.5">
          <div className="h-1.5 rounded-full bg-nostalgia-paper-edge overflow-hidden">
            <div
              className="h-full bg-nostalgia-pen-red"
              style={{ width: `${Math.min(100, (cumulativeScore / poolTarget) * 100)}%` }}
            />
          </div>
          <div className="text-[9px] text-nostalgia-pen/50 mt-0.5 text-right font-semibold">
            {cumulativeScore} / {poolTarget}
          </div>
        </div>
      )}
    </div>
  );
}

function SelfPad({
  name,
  cumulativeScore,
  poolTarget,
  isTurn,
}: {
  name: string;
  cumulativeScore?: number;
  poolTarget: number | null;
  isTurn?: boolean;
}) {
  const showsPool = poolTarget != null && cumulativeScore != null;
  return (
    <div
      className="flex-shrink-0 bg-nostalgia-paper rounded-md shadow-lift-2 px-3 py-2.5 w-[110px] flex flex-col items-center justify-center text-center transition-all duration-300"
      style={isTurn ? {
        border: "2px solid #C9A227",
        boxShadow: "0 0 0 3px rgba(201,162,39,0.30)",
      } : { border: "2px solid transparent" }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 transition-all duration-300"
        style={{
          background: isTurn ? "linear-gradient(135deg, #C9A227, #8A6220)" : "rgba(156,122,60,0.40)",
          color: isTurn ? "#1f1300" : "#2E2419",
          boxShadow: isTurn ? "0 0 12px rgba(201,162,39,0.60)" : undefined,
          animation: isTurn ? "rummy-glow 1.4s ease-in-out infinite" : undefined,
        }}
        title={name}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="font-script text-sm text-nostalgia-pen mt-1 truncate w-full">
        {isTurn ? "▸ Your turn" : "You"}
      </div>
      {showsPool && (
        <div className="text-[10px] text-nostalgia-pen/55 font-semibold mt-0.5">
          {cumulativeScore} / {poolTarget}
        </div>
      )}
    </div>
  );
}

/** Ornate SVG card back (desktop only — mobile keeps the shared red
 * FaceDownCard from ./Card untouched). Pure vector, no raster asset. */
function CardBackDesktop({ small = false }: { small?: boolean }) {
  const w = small ? 36 : 48;
  const h = small ? 50 : 66;
  return (
    <svg width={w} height={h} viewBox="0 0 48 66" className="flex-shrink-0 drop-shadow" aria-hidden>
      <defs>
        <linearGradient id="cbd-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e2a5c" />
          <stop offset="100%" stopColor="#0d1530" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="64" rx="5" fill="url(#cbd-bg)" stroke="#C9A227" strokeWidth="1.5" />
      <rect x="5" y="5" width="38" height="56" rx="3" fill="none" stroke="#C9A227" strokeWidth="0.75" opacity="0.6" />
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 3 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={12 + col * 12}
            cy={14 + row * 13}
            r="2.6"
            fill="none"
            stroke="#C9A227"
            strokeWidth="0.9"
            opacity="0.65"
          />
        )),
      )}
      <circle cx="24" cy="33" r="8" fill="#C9A227" opacity="0.9" />
      <text x="24" y="36.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e2a5c" fontFamily="Georgia, serif">B</text>
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 32" fill="none" className="w-full h-full drop-shadow" aria-hidden>
      <path
        d="M7 12V7a5 5 0 0 1 10 0v14a3 3 0 0 1-6 0V10"
        stroke="#9C7A3C"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Paper watermark: doodle scene + scattered card-suit symbols for richer
 *  table feel. Kept faint (opacity 0.08) so it never competes with cards.
 *  Pure SVG — no raster or external asset. */
function BackgroundDoodle() {
  return (
    <svg
      viewBox="0 0 860 290"
      className="absolute w-[95%] max-w-[700px] h-auto pointer-events-none"
      style={{ opacity: 0.08, top: "3%", left: "50%", transform: "translateX(-50%)" }}
      fill="none"
      stroke="#2E2419"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* House */}
      <path d="M80 190 L80 140 L120 108 L160 140 L160 190 Z" />
      <rect x="108" y="162" width="20" height="28" />
      {/* Tree */}
      <circle cx="220" cy="128" r="28" />
      <line x1="220" y1="156" x2="220" y2="192" />
      {/* Two children holding hands */}
      <circle cx="310" cy="145" r="10" />
      <line x1="310" y1="155" x2="310" y2="182" />
      <line x1="310" y1="163" x2="295" y2="175" />
      <line x1="310" y1="163" x2="327" y2="172" />
      <line x1="310" y1="182" x2="298" y2="200" />
      <line x1="310" y1="182" x2="322" y2="200" />
      <circle cx="344" cy="152" r="9" />
      <line x1="344" y1="161" x2="344" y2="186" />
      <line x1="344" y1="168" x2="327" y2="172" />
      <line x1="344" y1="168" x2="360" y2="175" />
      <line x1="344" y1="186" x2="332" y2="203" />
      <line x1="344" y1="186" x2="356" y2="203" />
      {/* Bird in flight */}
      <path d="M440 92 Q452 82 464 92 Q476 82 488 92" />
      {/* Kite */}
      <path d="M580 70 L600 95 L580 140 L560 95 Z" />
      <line x1="580" y1="140" x2="580" y2="182" />
      <path d="M580 148 q6 4 0 8 q-6 4 0 8" />
      {/* Sun */}
      <circle cx="730" cy="70" r="22" strokeWidth="1.8" />
      {[0,45,90,135,180,225,270,315].map((a, i) => (
        <line
          key={i}
          x1={730 + Math.cos((a * Math.PI) / 180) * 26}
          y1={70 + Math.sin((a * Math.PI) / 180) * 26}
          x2={730 + Math.cos((a * Math.PI) / 180) * 34}
          y2={70 + Math.sin((a * Math.PI) / 180) * 34}
          strokeWidth="1.5"
        />
      ))}
      {/* Ground line */}
      <path d="M50 210 Q200 205 350 212 Q500 218 700 210 Q780 207 820 212" strokeWidth="1.2" opacity="0.5" />

      {/* Scattered card suit symbols — larger, purely decorative */}
      {/* Spade ♠ */}
      <path d="M42 55 Q42 40 55 40 Q68 40 68 55 Q68 66 55 73 Q42 66 42 55 Z M49 73 L49 82 L61 82 L61 73" strokeWidth="1.5" />
      {/* Heart ♥ */}
      <path d="M780 155 Q780 143 791 143 Q802 143 802 155 Q802 166 791 175 Q780 166 780 155 Z M769 143 Q769 131 780 131 Q791 131 791 143" strokeWidth="1.5" />
      {/* Diamond ♦ */}
      <path d="M790 235 L808 252 L790 269 L772 252 Z" strokeWidth="1.5" />
      {/* Club ♣ */}
      <circle cx="56" cy="242" r="8" strokeWidth="1.5" />
      <circle cx="70" cy="249" r="8" strokeWidth="1.5" />
      <circle cx="42" cy="249" r="8" strokeWidth="1.5" />
      <line x1="56" y1="257" x2="56" y2="270" strokeWidth="1.5" />
      <line x1="48" y1="270" x2="64" y2="270" strokeWidth="1.5" />
    </svg>
  );
}

/** Bottom-left desk clutter: open notebook + two color pencils. */
function CornerNotebook() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
      <g transform="rotate(-8 50 60)">
        <rect x="15" y="40" width="70" height="50" rx="4" fill="#F5E9C9" stroke="#9C7A3C" strokeWidth="1.5" />
        <line x1="50" y1="40" x2="50" y2="90" stroke="#C9A876" strokeWidth="1" />
        {Array.from({ length: 6 }).map((_, i) => (
          <circle key={i} cx="15" cy={48 + i * 8} r="2" fill="#FFF" stroke="#9C7A3C" strokeWidth="1" />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={i} x1="55" y1={52 + i * 8} x2="80" y2={52 + i * 8} stroke="#C9A876" strokeWidth="1" opacity="0.6" />
        ))}
      </g>
      <g transform="rotate(18 60 35)">
        <rect x="55" y="15" width="6" height="48" rx="2" fill="#C0392B" />
        <polygon points="55,15 61,15 58,7" fill="#FBCDB0" />
      </g>
      <g transform="rotate(-4 70 35)">
        <rect x="66" y="18" width="6" height="46" rx="2" fill="#1F5FA8" />
        <polygon points="66,18 72,18 69,10" fill="#FBCDB0" />
      </g>
    </svg>
  );
}

/** Bottom-right desk clutter: cricket bat + ball + coffee cup. */
function CornerCricketCoffee() {
  return (
    <svg viewBox="0 0 110 100" className="w-full h-full" aria-hidden>
      <g transform="rotate(18 30 50)">
        <rect x="24" y="10" width="10" height="55" rx="4" fill="#D9A463" stroke="#8A5A33" strokeWidth="1.5" />
        <rect x="20" y="58" width="18" height="14" rx="3" fill="#C68642" stroke="#8A5A33" strokeWidth="1.5" />
      </g>
      <circle cx="50" cy="78" r="9" fill="#B5291F" stroke="#7a1414" strokeWidth="1.5" />
      <path d="M44 78 Q50 73 56 78" stroke="#7a1414" strokeWidth="1" fill="none" />
      <g transform="translate(70 50)">
        <path d="M0 10 q0 18 16 18 q16 0 16 -18 Z" fill="#F7E8C4" stroke="#6D4323" strokeWidth="1.5" />
        <path d="M32 14 q8 0 8 8 q0 8 -8 6" fill="none" stroke="#6D4323" strokeWidth="1.5" />
        <ellipse cx="16" cy="29" rx="20" ry="3" fill="none" stroke="#6D4323" strokeWidth="1.2" />
        <path d="M8 4 q2 -6 -2 -10" stroke="#9C7A3C" strokeWidth="1.2" fill="none" opacity="0.7" />
        <path d="M16 2 q2 -6 -2 -10" stroke="#9C7A3C" strokeWidth="1.2" fill="none" opacity="0.7" />
      </g>
    </svg>
  );
}

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
    <button
      onClick={onDraw}
      disabled={!canDraw}
      className={`relative w-[80px] h-[110px] flex items-center justify-center transition ${canDraw ? "cursor-pointer hover:-translate-y-1" : "cursor-not-allowed opacity-80"}`}
      title="Draw from closed deck (D)"
    >
      {canDraw && (
        <div
          className="absolute inset-[18px] rounded-lg pointer-events-none"
          style={{ boxShadow: "0 0 0 2px #9C7A3C, 0 0 16px rgba(156,122,60,0.55)", animation: "rummy-glow 1.4s ease-in-out infinite" }}
        />
      )}
      <CardBackDesktop />
      <div className="absolute -bottom-5 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-nostalgia-pen/60 font-bold">
        Closed · {count}
      </div>
    </button>
  );
}

function WildJokerDisplay({ card }: { card: CardType }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-md p-1"
        style={{ background: "rgba(156,122,60,0.18)", border: "1px solid #9C7A3C" }}
      >
        <PlayingCard card={card} small />
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-nostalgia-pen/60 font-bold">
        Wild Joker
      </div>
    </div>
  );
}

function OpenPile({
  top,
  canDraw,
  onDraw,
  dragOver,
  wildRank,
}: {
  top: CardType | null;
  canDraw: boolean;
  onDraw: () => void;
  dragOver: boolean;
  wildRank: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        data-rummy-drop="openpile"
        className={`relative w-[80px] h-[110px] rounded-lg flex items-center justify-center transition ${dragOver ? "ring-4 ring-nostalgia-pen-red" : ""}`}
        style={{
          background: top ? "transparent" : "rgba(46,36,25,0.05)",
          border: dragOver ? "2px solid #A8332B" : "2px dashed rgba(46,36,25,0.35)",
        }}
      >
        {top ? (
          <button
            onClick={onDraw}
            disabled={!canDraw}
            className={`${canDraw ? "cursor-pointer hover:-translate-y-1" : "cursor-not-allowed"} transition`}
            title="Draw from open pile (O)"
          >
            <PlayingCard card={top} isWildJoker={top.rank === wildRank} />
          </button>
        ) : (
          <div className="text-nostalgia-pen/40 text-xs">empty</div>
        )}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-nostalgia-pen/60 font-bold">
        Discard · O
      </div>
    </div>
  );
}

function FinishSlot({ dragOver }: { dragOver: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        data-rummy-drop="finishslot"
        className={`w-[80px] h-[110px] rounded-lg flex flex-col items-center justify-center transition ${dragOver ? "ring-4 ring-nostalgia-brass" : ""}`}
        style={{
          background: "rgba(156,122,60,0.10)",
          border: dragOver ? "2px solid #9C7A3C" : "2px dashed rgba(156,122,60,0.5)",
        }}
      >
        <div className="text-[20px]">🏁</div>
        <div className="text-[9px] uppercase tracking-widest text-nostalgia-pen/55 mt-1 text-center px-1 font-bold">
          Finish<br />Slot
        </div>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-nostalgia-pen/60 font-bold">
        Drop to declare
      </div>
    </div>
  );
}

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
  const labelColor = cls?.color ?? "#7A6652";
  return (
    <div
      data-rummy-drop={`group:${groupId}`}
      className={`rounded-lg px-2 py-2 transition ${dragOver ? "ring-2 ring-nostalgia-brass" : ""}`}
      style={{
        background: dragOver ? "rgba(156,122,60,0.18)" : "rgba(255,255,255,0.5)",
        border: `1px solid ${labelColor}66`,
        minWidth: 130,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[10px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded"
          style={{ background: `${labelColor}22`, color: labelColor }}
        >
          {label}
        </span>
        <button
          onClick={onUngroup}
          className="text-nostalgia-pen/45 hover:text-nostalgia-pen-red text-[11px]"
          title="Break group"
        >
          ✕
        </button>
      </div>
      <div className="flex">
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
              offset={idx === 0 ? 0 : -18}
            />
          );
        })}
      </div>
    </div>
  );
}

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
    <div
      data-rummy-drop="ungrouped"
      className={`rounded-lg px-2 py-2 min-h-[90px] transition ${dragOver ? "ring-2 ring-nostalgia-brass" : ""}`}
      style={{
        background: dragOver ? "rgba(156,122,60,0.14)" : "rgba(255,255,255,0.35)",
        border: "1.5px dashed rgba(46,36,25,0.25)",
      }}
    >
      <div className="flex flex-wrap gap-y-2">
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
              offset={idx === 0 ? 0 : -16}
            />
          );
        })}
        {cardIds.length === 0 && (
          <div className="text-nostalgia-pen/45 italic text-sm px-2 py-4">
            Drop cards here · all 13 must be grouped to declare
          </div>
        )}
      </div>
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

function NewMeldZone({ active, atCap }: { active: boolean; atCap: boolean }) {
  return (
    <div
      data-rummy-drop={atCap ? undefined : "new"}
      className="rounded-lg flex flex-col items-center justify-center font-black px-3 py-2 self-stretch min-w-[80px] transition"
      style={{
        background: atCap
          ? "rgba(46,36,25,0.08)"
          : active ? "rgba(16,185,129,0.35)" : "rgba(16,185,129,0.12)",
        border: atCap
          ? "2px dashed rgba(46,36,25,0.3)"
          : active ? "2px dashed #34d399" : "2px dashed rgba(16,185,129,0.45)",
        color: atCap ? "rgba(46,36,25,0.4)" : "#065f46",
      }}
    >
      <span className="text-2xl mb-1">＋</span>
      <span className="text-[10px] uppercase tracking-widest">
        {atCap ? "MAX 7" : "New Meld"}
      </span>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  kbd,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  kbd?: string;
  variant?: "default" | "primary" | "warn";
}) {
  const palette =
    variant === "primary"
      ? "bg-nostalgia-brass hover:brightness-110 text-[#1f1300] border-nostalgia-brass"
      : variant === "warn"
      ? "bg-[#7B1E2B] hover:bg-[#931f2e] text-nostalgia-paper border-[#A8332B]"
      : "bg-black/25 hover:bg-black/35 text-nostalgia-paper border-black/30";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-full border font-black text-[12px] tracking-wider uppercase transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${palette}`}
    >
      <span>{children}</span>
      {kbd && (
        <span className="font-mono text-[10px] opacity-70 border border-current rounded px-1 py-0.5">
          {kbd}
        </span>
      )}
    </button>
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
