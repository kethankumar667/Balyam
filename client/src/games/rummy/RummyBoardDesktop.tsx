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
  RummyTurnAction,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { findAvatar } from "../../lib/avatars";
import { PlayingCard, FaceDownCard } from "./Card";
import CardTracker from "./CardTracker";
import QrCodeModal from "../../components/QrCodeModal";
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
  cardPoints,
  type MeldClassification,
} from "./meldCheck";
import { suggestArrangement, suggestDiscard } from "./autoArrange";
import { freshMeldLayout, appendIncomingCards, applyHintSuggestion, redistributeCards } from "./reconcileLayout";
import { useRummyFeed, type RummyFeedItem } from "./useRummyFeed";
import { isRummySoundEnabled, rummySfx, setRummySoundEnabled } from "./sound";
import VoicePanel from "../../components/VoicePanel";
import { RummyDeclareFlourish, RummyWinnerCelebration, RummyPureSequenceBurst, RummyInvalidDeclareOverlay } from "./RummyAnimations";
import CoachHintButton, { CoachHighlightProvider, useCoach } from "../../components/CoachHintButton";
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
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";

/* ─────────────────────────── Types ─────────────────────────── */

type Group = { id: string; cardIds: string[] };
type Layout = { groups: Group[]; ungrouped: string[] };

type DropTarget =
  | "openpile"
  | "finishslot"
  | "new"
  | "ungrouped"
  | `group:${string}`
  | `card:${string}:${string}`;

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
  const coach = useCoach();
  const wildRank = state.wildJoker.rank;

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
  const [showQrModal, setShowQrModal] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const initialized = useRef(false);

  /* ─── Reconcile hand → layout: ALL cards sit inside meld groups ───
   * The open-deck pickup, if any, always gets its own dedicated meld —
   * driven by `state.lastDrawnCardId`/`lastDrawSource` (server-authoritative,
   * per-viewer) rather than a client-side ref. A ref survives only as long
   * as this component instance does; a page refresh, a reconnect, or the
   * board swapping between RummyBoardDesktop/RummyBoardMobile at a viewport
   * breakpoint are all full remounts that would silently reset it and let a
   * just-drawn open card fall into the generic suit-matching path below. The
   * server field survives every one of those because it's just part of the
   * next state snapshot, not local memory. */
  useEffect(() => {
    setLayout((prev) => {
      const known = new Set<string>(prev.groups.flatMap((g) => g.cardIds));
      const handIds = new Set(hand.map((c) => c.id));
      const filteredGroups = prev.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => handIds.has(id)) }))
        .filter((g) => g.cardIds.length > 0);

      const incoming = hand.map((c) => c.id).filter((id) => !known.has(id));
      if (incoming.length === 0 && initialized.current) {
        return { groups: filteredGroups, ungrouped: [] };
      }
      initialized.current = true;

      const openPickupId =
        state.lastDrawSource === "open" && state.lastDrawnCardId && handIds.has(state.lastDrawnCardId)
          ? state.lastDrawnCardId
          : null;

      // If no groups exist yet (initial deal, OR the first reconciliation
      // pass after a remount mid-turn), split the hand by suit — except the
      // open-deck pickup, carved out first so it never lands in a suit lane
      // alongside an existing card.
      if (filteredGroups.length === 0) {
        return freshMeldLayout(hand, openPickupId, newGroupId, MAX_GROUPS);
      }

      // Add incoming cards: if a card was taken from the open deck, ALWAYS place it into a new meld
      const newGroups = appendIncomingCards(filteredGroups, incoming, byId, openPickupId, newGroupId, MAX_GROUPS);
      return { groups: newGroups, ungrouped: [] };
    });
  }, [hand, byId, wildRank, state.lastDrawnCardId, state.lastDrawSource]);

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
    return computeLivePoints(groups, [], wildRank as Rank);
  }, [layout.groups, byId, meldByGroupId, wildRank]);

  const finishReadiness = useMemo(() => {
    const selCardId = selected.size === 1 ? Array.from(selected)[0] : null;
    const groups = layout.groups
      .map((g) => ({
        cards: g.cardIds
          .filter((id) => id !== selCardId)
          .map((id) => byId.get(id)!)
          .filter(Boolean),
      }))
      .filter((g) => g.cards.length > 0);

    const totalGrouped = groups.reduce((s, g) => s + g.cards.length, 0);
    return evaluateFinishReadiness(
      groups,
      wildRank as Rank,
      totalGrouped,
      selCardId ? 1 : 0,
    );
  }, [layout.groups, byId, selected, wildRank]);

  const reactions = useSeatReactions(selfId);

  /* ─── Turn / phase helpers ─── */
  const isArranging = state.phase === "arranging";
  const myTurn = state.turnPlayerId === selfId && state.phase === "playing";
  const canDraw = myTurn && state.turnAction === "draw" && state.phase === "playing";
  const canDiscardOrDeclare =
    myTurn && state.turnAction === "discardOrDeclare" && state.phase === "playing";
  const iAmDeclarer = isArranging && state.winnerId === selfId;
  const iDropped = !!selfId && state.droppedPlayers.includes(selfId);

  /* ─── End-of-round scorecard dismissed flag ─── */
  const [scorecardDismissed, setScorecardDismissed] = useState(false);
  useEffect(() => {
    if (state.phase === "playing") setScorecardDismissed(false);
  }, [state.phase]);

  /* ─── 5-second winner burst ─── */
  const [winnerBurstKey, setWinnerBurstKey] = useState<number | null>(null);
  const prevPhaseForBurst = useRef(state.phase);
  useEffect(() => {
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
      setError("Pick exactly one card in a meld group to discard");
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
      ungrouped: [],
    }));
    setSelected(new Set());
    setError(null);
  }
  function dropOnFinishSlot(cardId: string) {
    if (!canDiscardOrDeclare) {
      setError("Draw a card first before declaring");
      return;
    }
    declareWith(cardId);
  }
  function declareWith(discardCardId: string) {
    const declareGroups = layout.groups
      .map((g) => g.cardIds.filter((id) => id !== discardCardId))
      .filter((g) => g.length > 0);

    const totalGrouped = declareGroups.reduce((s, g) => s + g.length, 0);
    if (totalGrouped !== 13) {
      setError(`Need exactly 13 cards in melds to declare (have ${totalGrouped})`);
      return;
    }
    getSocket().emit("game:move", {
      type: "declare",
      data: { discardCardId, melds: declareGroups },
    });
    rummySfx.declare();
    setError(null);
  }
  function declareViaButton() {
    if (!canDiscardOrDeclare) return;
    let finishCardId: string | null = null;
    if (selected.size === 1) {
      finishCardId = Array.from(selected)[0];
    } else {
      for (const g of layout.groups) {
        const cls = meldByGroupId[g.id];
        if (!cls?.valid && g.cardIds.length > 0) {
          finishCardId = g.cardIds[g.cardIds.length - 1];
          break;
        }
      }
      if (!finishCardId && layout.groups.length > 0) {
        const lastGroup = layout.groups[layout.groups.length - 1];
        finishCardId = lastGroup.cardIds[lastGroup.cardIds.length - 1];
      }
    }

    if (!finishCardId) {
      setError("Select 1 card in a meld group to finish and declare.");
      return;
    }
    declareWith(finishCardId);
  }
  function dropFromHand() {
    setConfirmDrop(false);
    rummySfx.drop();
    getSocket().emit("game:move", { type: "drop" });
  }

  /* ─── Layout edits ─── */
  function moveCardsTo(
    targetKind: "group" | "new",
    targetLaneId: string | null,
    ids: string[],
  ) {
    setLayout((l) => {
      const idSet = new Set(ids);
      const groupsFiltered = l.groups.map((g) => ({
        ...g,
        cardIds: g.cardIds.filter((id) => !idSet.has(id)),
      }));

      if (targetKind === "new") {
        const cleaned = groupsFiltered.filter((g) => g.cardIds.length > 0);
        return {
          groups: [...cleaned, { id: newGroupId(), cardIds: ids.slice() }],
          ungrouped: [],
        };
      }
      // group
      const newGroups = groupsFiltered.map((g) =>
        g.id === targetLaneId ? { ...g, cardIds: [...g.cardIds, ...ids] } : g,
      );
      const cleaned = newGroups.filter((g) => g.cardIds.length > 0);
      return { groups: cleaned, ungrouped: [] };
    });
  }

  function moveCardsToCardPosition(
    targetGroupId: string,
    targetCardId: string,
    ids: string[],
  ) {
    setLayout((l) => {
      const idSet = new Set(ids);
      const targetGroup = l.groups.find((g) => g.id === targetGroupId);
      if (!targetGroup) return l;

      // Check if this is an intra-group swap/reorder
      const isSameGroup = targetGroup.cardIds.some((cid) => idSet.has(cid));

      if (isSameGroup && ids.length === 1) {
        const draggedCardId = ids[0];
        if (draggedCardId === targetCardId) return l;

        const newCardIds = [...targetGroup.cardIds];
        const fromIdx = newCardIds.indexOf(draggedCardId);
        const toIdx = newCardIds.indexOf(targetCardId);

        if (fromIdx !== -1 && toIdx !== -1) {
          newCardIds.splice(fromIdx, 1);
          newCardIds.splice(toIdx, 0, draggedCardId);

          const newGroups = l.groups.map((g) =>
            g.id === targetGroupId ? { ...g, cardIds: newCardIds } : g,
          );
          rummySfx.cardSlide();
          return { groups: newGroups, ungrouped: [] };
        }
      }

      // Moving from another group into targetGroup at targetCardId's exact spot
      const groupsFiltered = l.groups.map((g) => ({
        ...g,
        cardIds: g.cardIds.filter((id) => !idSet.has(id)),
      }));

      const newGroups = groupsFiltered.map((g) => {
        if (g.id !== targetGroupId) return g;
        const targetIdx = g.cardIds.indexOf(targetCardId);
        const nextIds = [...g.cardIds];
        if (targetIdx !== -1) {
          nextIds.splice(targetIdx, 0, ...ids);
        } else {
          nextIds.push(...ids);
        }
        return { ...g, cardIds: nextIds };
      });

      const cleaned = newGroups.filter((g) => g.cardIds.length > 0);
      rummySfx.cardSlide();
      return { groups: cleaned, ungrouped: [] };
    });
  }

  function swapCardsInGroup(groupId: string, cardIdA: string, cardIdB: string) {
    setLayout((l) => {
      const newGroups = l.groups.map((g) => {
        if (g.id !== groupId) return g;
        const idxA = g.cardIds.indexOf(cardIdA);
        const idxB = g.cardIds.indexOf(cardIdB);
        if (idxA === -1 || idxB === -1) return g;
        const nextIds = [...g.cardIds];
        nextIds[idxA] = cardIdB;
        nextIds[idxB] = cardIdA;
        return { ...g, cardIds: nextIds };
      });
      rummySfx.cardSlide();
      return { groups: newGroups, ungrouped: [] };
    });
  }

  function moveCardInGroup(groupId: string, cardId: string, direction: -1 | 1) {
    setLayout((l) => {
      const newGroups = l.groups.map((g) => {
        if (g.id !== groupId) return g;
        const idx = g.cardIds.indexOf(cardId);
        if (idx === -1) return g;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= g.cardIds.length) return g;
        const nextIds = [...g.cardIds];
        const [removed] = nextIds.splice(idx, 1);
        if (removed) {
          nextIds.splice(targetIdx, 0, removed);
        }
        return { ...g, cardIds: nextIds };
      });
      rummySfx.cardSlide();
      return { groups: newGroups, ungrouped: [] };
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
      return {
        groups: [...groups, { id: newGroupId(), cardIds: ordered }],
        ungrouped: [],
      };
    });
    setSelected(new Set());
    setError(null);
    rummySfx.meldFormed();
  }
  function ungroupGroup(groupId: string) {
    // Same open-deck isolation invariant enforced elsewhere (see
    // reconcileLayout.ts) — dismissing a meld (most often the pickup's own
    // lone-card group, which looks like a mistake and invites a "clean up"
    // tap) must never fold the just-drawn card into another meld via
    // suit-matching.
    const openPickupId =
      state.lastDrawSource === "open" && state.lastDrawnCardId && byId.has(state.lastDrawnCardId)
        ? state.lastDrawnCardId
        : null;
    setLayout((l) => {
      const g = l.groups.find((gg) => gg.id === groupId);
      if (!g || l.groups.length <= 1) return l;
      const remainingGroups = l.groups.filter((gg) => gg.id !== groupId);
      return {
        groups: redistributeCards(remainingGroups, g.cardIds, byId, openPickupId, newGroupId),
        ungrouped: [],
      };
    });
    setError(null);
  }
  function sortMeldGroups() {
    setLayout((l) => ({
      groups: l.groups.map((g) => ({
        ...g,
        cardIds: sortIds(g.cardIds, byId, wildRank),
      })),
      ungrouped: [],
    }));
  }
  const [pendingHint, setPendingHint] = useState<{
    groups: CardType[][];
    ungrouped: CardType[];
    bestDiscardCard: CardType | null;
    openPickupCard: CardType | null;
  } | null>(null);

  function requestSmartHint() {
    // The open-deck pickup must never be offered as a merge candidate here —
    // `suggestArrangement` has no concept of it and will happily fold it
    // into whatever pure sequence/set it best fits, which is exactly the
    // "is this card new or was it already there?" confusion players hit.
    // Carve it out before optimizing, then keep it eligible as a discard
    // candidate (a useless just-drawn card is still worth flagging).
    const openPickupId =
      state.lastDrawSource === "open" && state.lastDrawnCardId && byId.has(state.lastDrawnCardId)
        ? state.lastDrawnCardId
        : null;
    const openPickupCard = openPickupId ? byId.get(openPickupId) ?? null : null;

    const allCards: CardType[] = [
      ...layout.groups.flatMap((g) => g.cardIds.map((id) => byId.get(id)).filter((c): c is CardType => !!c)),
    ].filter((c) => c.id !== openPickupId);
    if (allCards.length === 0) return;

    const suggestion = suggestArrangement(allCards, wildRank as Rank);
    const discardCandidates = openPickupCard ? [...suggestion.ungrouped, openPickupCard] : suggestion.ungrouped;
    const discardHand = openPickupCard ? [...allCards, openPickupCard] : allCards;
    const bestDiscard = suggestDiscard(discardCandidates, discardHand, wildRank as Rank);

    setPendingHint({
      groups: suggestion.groups,
      ungrouped: suggestion.ungrouped,
      bestDiscardCard: bestDiscard,
      openPickupCard,
    });
  }

  function approveSmartHint() {
    if (!pendingHint) return;

    // The hand can change out from under an open hint banner — most often
    // the AFK auto-play safety net taking one or more turns on the player's
    // behalf while they haven't dismissed it. Applying a stale suggestion in
    // that case would inject melds referencing cards no longer in the hand,
    // rendering as an orphaned empty meld box. Bail out instead.
    const referencedIds = [
      ...pendingHint.groups.flat().map((c) => c.id),
      ...pendingHint.ungrouped.map((c) => c.id),
      ...(pendingHint.openPickupCard ? [pendingHint.openPickupCard.id] : []),
    ];
    if (referencedIds.some((id) => !byId.has(id))) {
      setPendingHint(null);
      setError("Your hand changed — hint expired, tap HINT again");
      return;
    }

    const newGroups = applyHintSuggestion(
      pendingHint.groups,
      pendingHint.ungrouped,
      pendingHint.openPickupCard,
      newGroupId,
    );

    setLayout({
      groups: newGroups,
      ungrouped: [],
    });

    if (pendingHint.bestDiscardCard) {
      setSelected(new Set([pendingHint.bestDiscardCard.id]));
    } else {
      setSelected(new Set());
    }

    setPendingHint(null);
    setError(null);
    rummySfx.meldFormed();
  }

  function dismissSmartHint() {
    setPendingHint(null);
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
      } else if (target.startsWith("card:")) {
        const parts = target.slice("card:".length).split(":");
        const targetGroupId = parts[0];
        const targetCardId = parts[1];
        if (targetGroupId && targetCardId) {
          moveCardsToCardPosition(targetGroupId, targetCardId, ids);
        }
      } else if (target.startsWith("group:")) {
        const gid = target.slice("group:".length);
        moveCardsTo("group", gid, ids);
      }
    }
    onDragEnd();
  }


  /* ─── Card tap / multi-card selection ─── */
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
         * Keyboard controls:
         *   D -> Draw from closed deck
         *   O -> Draw from open discard pile
         *   Space -> Discard the selected card
         *   G -> Group selected cards
         *   S -> Sort meld groups
         *   H -> Smart Hint (preview only — never plays automatically)
         *   Enter -> Declare hand
         *   Escape -> Clear card selection
         */
        case "d":
          if (canDraw) {
            e.preventDefault();
            drawFromClosed();
          }
          break;
        case "o":
          if (canDraw) { e.preventDefault(); drawFromOpen(); }
          break;
        case "g":
          e.preventDefault(); groupSelected();
          break;
        case "s":
          e.preventDefault(); sortMeldGroups();
          break;
        case "h":
          e.preventDefault(); requestSmartHint();
          break;
        case " ":
          if (canDiscardOrDeclare && selected.size === 1) {
            e.preventDefault();
            discardSelected();
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
  const feed = useRummyFeed(state, selfId, nameOf);
  const totalUngroupedPlusGrouped =
    layout.ungrouped.length + layout.groups.reduce((s, g) => s + g.cardIds.length, 0);

  /* ─── Drop announcement — a card slams down when anyone drops the round ─── */
  const [dropAnnounce, setDropAnnounce] = useState<{ name: string; mine: boolean; quit: boolean } | null>(null);
  const prevDroppedRef = useRef<string[]>(state.droppedPlayers);
  useEffect(() => {
    const prev = new Set(prevDroppedRef.current);
    const added = state.droppedPlayers.filter((id) => !prev.has(id));
    prevDroppedRef.current = state.droppedPlayers;
    if (added.length === 0) return;
    const id = added[added.length - 1];
    setDropAnnounce({
      name: id === selfId ? "You" : nameOf(id),
      mine: id === selfId,
      quit: state.quitPlayers.includes(id),
    });
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
    <CoachHighlightProvider ids={coach.highlight}>
    <div id="rummy-table-container" className="rm-room">
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
            {roomCode && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                title="Show QR Code to join room"
                className="ml-1 px-1 py-0.5 rounded text-amber-300 hover:text-amber-200 bg-white/10 text-xs transition cursor-pointer"
              >
                📱 QR
              </button>
            )}
            <span className="rm-meta__dot">•</span>
            <span>{variantLabel}</span>
            <span className="rm-meta__dot">•</span>
            <span>{state.playerOrder.length} Players</span>
          </div>
          {showQrModal && roomCode && (
            <QrCodeModal open={true} code={roomCode} onClose={() => setShowQrModal(false)} />
          )}
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
                playerId={id}
                letter={seatLetterOf(id)}
                name={id === selfId ? `${nameOf(id)} (You)` : nameOf(id)}
                avatar={players.find((p) => p.id === id)?.avatar}
                isSelf={id === selfId}
                isTurn={state.turnPlayerId === id && state.phase === "playing"}
                handSize={state.handSizes[id] ?? 0}
                dropped={state.droppedPlayers.includes(id)}
                quit={state.quitPlayers.includes(id)}
                eliminated={state.eliminatedInMatch.includes(id)}
                connected={players.find((p) => p.id === id)?.isConnected ?? true}
                autoPlaying={players.find((p) => p.id === id)?.isAutoPlaying === true}
                autoReason={players.find((p) => p.id === id)?.autoPlayReason}
                cumulativeScore={state.cumulativeScores?.[id]}
                turnAction={state.turnAction}
                cardRef={reactions.registerCardRef(id)}
                onTarget={() => reactions.openTarget(id)}
                isTargetActive={reactions.activeTargetId === id}
                onCloseTarget={reactions.closeTarget}
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
              {/* Fills the bare felt beside the slots. Opponents' hands are
                  hidden and their turns pass silently, so without this the
                  widest part of the table carried no information at all. */}
              <TableFeed items={feed} />
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

          {/* ── 3 · the melded hand board ──
              All cards in Rummy are organized in meld groups. Players can drag and move
              cards between melds, create new meld groups, or declare directly from any meld. */}
          <div
            className={
              `rm-melds${iAmDeclarer ? " rm-melds--locked" : ""}` +
              (iDropped || iAmDeclarer ? " is-idle" : myTurn ? " is-turn" : "")
            }
            style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--rm-space-xs)" }}
          >
            <div className="rm-hand__head">
              <span className="rm-hand__title">
                Your Melded Hand{" "}
                <span className="rm-hand__count">
                  ({layout.groups.reduce((s, g) => s + g.cardIds.length, 0)} cards in {layout.groups.length} groups)
                </span>
              </span>
              <span className="rm-hand__tip">
                {selected.size > 0
                  ? `${selected.size} selected · G to group into new meld`
                  : "Tap cards to select, or drag to move cards between melds"}
              </span>
              <span />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full py-1">
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
                  onMoveCard={(cardId, dir) => moveCardInGroup(g.id, cardId, dir)}
                />
              ))}
              <AddMeldZone
                active={dragOverTarget === "new"}
                atCap={layout.groups.length >= MAX_GROUPS}
              />
            </div>
          </div>

          {/* ── 4 · the action bar ── */}
          <div
            className="rm-bar"
            style={iAmDeclarer ? { opacity: 0.4, pointerEvents: "none" } : undefined}
          >
            <ToolButton
              icon={<SortIcon />}
              label="Sort"
              note="Group (Suit)"
              onClick={sortMeldGroups}
              title="Sort cards within all meld groups by suit and rank (S)"
            />
            <ToolButton
              icon={<HintIcon />}
              label="Hint"
              note="Suggest Move"
              onClick={requestSmartHint}
              title="Smart Hint: previews the best melds & discard for your approval — never plays automatically (H)"
            />
            <PointsReadout hand={livePoints.handTotal} ground={livePoints.caughtNow} />

            <button
              type="button"
              className="rm-cta rm-cta--discard"
              onClick={discardSelected}
              disabled={!canDiscardOrDeclare || selected.size !== 1}
              title={
                selected.size === 1
                  ? "Discard the selected card (Space)"
                  : "Select exactly one card to discard (Space)"
              }
            >
              <DiscardIcon />
              Discard
              <span className="rm-kbd">Space</span>
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
                      {activeTab === "players" && (
                        <PlayerList
                          players={players}
                          selfId={selfId}
                          onTapPlayer={(id) =>
                            window.dispatchEvent(
                              new CustomEvent("bhalyam:react-at-player", { detail: { playerId: id } }),
                            )
                          }
                        />
                      )}
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
      {dropAnnounce && (
        <DropAnnounce name={dropAnnounce.name} mine={dropAnnounce.mine} quit={dropAnnounce.quit} />
      )}

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

      {state.phase === "finished" && state.invalidDeclareBy && (
        <RummyInvalidDeclareOverlay />
      )}
      {state.phase === "finished" && state.winnerId && !scorecardDismissed && (
        <RummyWinnerCelebration winnerName={players.find((p) => p.id === state.winnerId)?.name ?? "Winner"} />
      )}

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
            // Always fire — Room.tsx handles scorecard close cleanly
            // and returns player to the table/lobby.
            onScorecardClose?.();
          }}
          onLeave={onLeave}
        />
      )}

      {/* 5-second winner burst — pointer-events: none so the scorecard
          modal underneath stays interactive. */}
      {winnerBurstKey != null && <WinnerCelebrationBurst key={winnerBurstKey} />}

      {/* Smart Hint Approval Banner — requires player click on APPROVE before touching the hand */}
      {pendingHint && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[50] w-[90%] max-w-md p-4 rounded-2xl flex flex-col gap-3 shadow-2xl"
          style={{
            background: "linear-gradient(145deg, #1e1b18 0%, #2d261e 100%)",
            border: "2px solid #f59e0b",
            boxShadow: "0 10px 30px rgba(0,0,0,0.85), 0 0 20px rgba(245,158,11,0.35)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-amber-400 text-xs uppercase tracking-wider">
              <span>💡</span>
              <span>Suggested Hand Rearrangement</span>
            </div>
            <button
              onClick={dismissSmartHint}
              className="text-white/60 hover:text-white text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>

          {/* Melds summary chips showing exact cards */}
          <div className="flex items-center gap-1.5 flex-wrap max-h-48 overflow-y-auto pr-1">
            {pendingHint.groups.map((g, idx) => {
              const classification = classifyMeld(g, wildRank as Rank);
              const name = classification.valid
                ? classification.label.replace(/\s*✓\s*$/, "")
                : `${g.length} Cards`;
              const cardsStr = g
                .map((c) => {
                  if (c.isPrintedJoker) return "🃏";
                  const suit = c.suit === "S" ? "♠" : c.suit === "H" ? "♥" : c.suit === "D" ? "♦" : "♣";
                  const rank = c.rank === "T" ? "10" : c.rank;
                  return `${rank}${suit}`;
                })
                .join(" ");
              return (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-2 flex-wrap"
                  style={{
                    background: classification.counts ? "rgba(16,185,129,0.22)" : "rgba(245,158,11,0.22)",
                    border: `1px solid ${classification.counts ? "#10b981" : "#f59e0b"}`,
                    color: classification.counts ? "#a7f3d0" : "#fef08a",
                  }}
                >
                  <span className="font-extrabold uppercase text-xs tracking-wide" style={{ color: classification.counts ? "#34d399" : "#fcd34d" }}>
                    {classification.counts ? "✓ " : "• "}{name}:
                  </span>
                  <span className="font-mono tracking-wider text-white font-black text-xs">
                    {cardsStr}
                  </span>
                </div>
              );
            })}
            {pendingHint.openPickupCard && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-2 flex-wrap"
                style={{
                  background: "rgba(56,189,248,0.18)",
                  border: "1px solid #38bdf8",
                  color: "#bae6fd",
                }}
              >
                <span className="font-extrabold uppercase text-xs tracking-wide" style={{ color: "#7dd3fc" }}>
                  🆕 Just Drawn (kept separate):
                </span>
                <span className="font-mono tracking-wider text-white font-black text-xs">
                  {(() => {
                    const c = pendingHint.openPickupCard;
                    if (c.isPrintedJoker) return "🃏";
                    const suit = c.suit === "S" ? "♠" : c.suit === "H" ? "♥" : c.suit === "D" ? "♦" : "♣";
                    const rank = c.rank === "T" ? "10" : c.rank;
                    return `${rank}${suit}`;
                  })()}
                </span>
              </div>
            )}
            {pendingHint.bestDiscardCard && (
              <div className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-2 bg-rose-950/90 border border-rose-500 text-rose-200">
                <span className="font-extrabold uppercase text-xs tracking-wide text-rose-400">
                  🗑 Suggested Discard:
                </span>
                <span className="font-mono tracking-wider text-rose-300 font-black text-xs">
                  {(() => {
                    const c = pendingHint.bestDiscardCard;
                    if (c.isPrintedJoker) return "🃏";
                    const suit = c.suit === "S" ? "♠" : c.suit === "H" ? "♥" : c.suit === "D" ? "♦" : "♣";
                    const rank = c.rank === "T" ? "10" : c.rank;
                    return `${rank}${suit}`;
                  })()}
                </span>
              </div>
            )}
          </div>

          {/* Approve / Cancel actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={approveSmartHint}
              className="flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                border: "1px solid #34d399",
                boxShadow: "0 4px 14px rgba(16,185,129,0.45)",
              }}
            >
              ✓ Approve & Rearrange
            </button>
            <button
              onClick={dismissSmartHint}
              className="px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white/70 hover:text-white cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Strip-less room rail: Rummy renders its own chat/voice/players tabs
          in the side panel above, so only the `bhalyam:react-at-player` /
          `bhalyam:open-room-panel` bridge and the emoji tray are needed here. */}
      {roomCode && (
        <InlineRoomRail
          code={roomCode}
          game="rummy"
          phase={state.phase}
          players={players}
          selfId={selfId}
          messages={messages}
          hideStrip
        />
      )}

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
    </CoachHighlightProvider>
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
function DropAnnounce({ name, mine, quit }: { name: string; mine: boolean; quit: boolean }) {
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
          {quit
            ? (mine ? "You quit" : `${name} quit`)
            : (mine ? "You dropped" : `${name} dropped`)}
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
          const quit = state.quitPlayers.includes(id);
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
                {/* quit outranks dropped — same round-exit mechanics, but a
                    forced removal, never a choice the player made. */}
                {quit && <span className="rm-roster__tag">quit</span>}
                {dropped && !quit && <span className="rm-roster__tag">dropped</span>}
                {out && !dropped && !quit && <span className="rm-roster__tag">out</span>}
                {autoPlaying && !dropped && !out && !quit && (
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
  avatar,
  isSelf,
  isTurn,
  handSize,
  dropped,
  quit,
  eliminated,
  connected,
  autoPlaying,
  autoReason,
  cumulativeScore,
  turnAction,
  cardRef,
  playerId,
  onTarget,
  isTargetActive,
  onCloseTarget,
}: {
  letter: string;
  name: string;
  avatar?: string;
  isSelf: boolean;
  isTurn: boolean;
  /** Which half of the active turn — the only publicly observable sub-state. */
  turnAction?: RummyTurnAction;
  handSize: number;
  dropped: boolean;
  /** Force-removed by the server's auto-play turn cap — distinct from a
   *  voluntary `dropped`: this player never chose to fold. */
  quit: boolean;
  eliminated: boolean;
  connected: boolean;
  autoPlaying: boolean;
  autoReason?: "disconnected" | "idle";
  cumulativeScore?: number;
  /** From useSeatReactions() — anchors a targeted reaction's arc/flinch to this seat. */
  cardRef?: (el: HTMLElement | null) => void;
  playerId?: string;
  onTarget?: () => void;
  isTargetActive?: boolean;
  onCloseTarget?: () => void;
}) {
  const out = dropped || quit || eliminated;
  const avatarOption = findAvatar(avatar);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [avatarOption?.src]);
  const showAvatarImg = !!avatarOption && !imgFailed;
  /**
   * STATUS only — never a number.
   *
   * This used to fall back to the hand size, which the stat row below already
   * prints, so every idle seat stated "13 cards" twice about forty pixels
   * apart. Two lines saying the same thing is worse than one, because the
   * reader has to check whether they actually differ.
   */
  const sub = quit
    // Outranks `dropped` — a quit seat IS also recorded in droppedPlayers
    // (same round-exit mechanics), but this is a forced removal, not a
    // choice, and must read as such.
    ? "Quit"
    : dropped
    ? "Dropped"
    : eliminated
    ? "Eliminated"
    // Outranks the turn state: whose turn it is matters less than the fact
    // that nobody is behind the seat taking it.
    : autoPlaying
    ? (autoReason === "idle" ? "Away · auto" : "Reconnecting · auto")
    : isTurn
    // "Your turn" on somebody else's seat is a lie the second person at the
    // table would read as their own cue.
    //
    // The active seat now names WHICH half of the turn it is in — drawing vs
    // discarding is publicly known from `turnAction`, and it is the only extra
    // state that is genuinely observable. The review also asked for
    // "Thinking / Grouping / Declaring" on the waiting seats; those are not
    // knowable from a hidden hand, so inventing them would be fiction.
    ? (turnAction === "draw"
        ? (isSelf ? "Your turn · draw" : "Drawing…")
        : (isSelf ? "Your turn · discard" : "Discarding…"))
    : "Waiting";
  return (
    <div
      ref={cardRef}
      className={`rm-seat relative${isTurn ? " is-turn" : ""}${out ? " is-out" : ""}${!isSelf ? " cursor-pointer hover:brightness-110 active:scale-[0.98] transition-transform" : ""}`}
      onClick={!isSelf ? onTarget : undefined}
      title={!isSelf ? `Tap to react at ${name}` : undefined}
    >
      {isTargetActive && playerId && onCloseTarget && (
        <SeatTargetReactionWheel
          game="rummy"
          targetPlayerId={playerId}
          targetPlayerName={name}
          onClose={onCloseTarget}
          position="bottom"
        />
      )}
      <div className="rm-seat__top">
        <span className="rm-seat__avatar" aria-hidden>
          {showAvatarImg ? (
            <img
              src={avatarOption!.src}
              alt=""
              onError={() => setImgFailed(true)}
              draggable={false}
            />
          ) : (
            letter
          )}
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

function HintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 18h6M10 21h4" strokeLinecap="round" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.45 1.1 1.35 1.1 2.2h5c0-.85.5-1.75 1.1-2.2A6 6 0 0 0 12 3Z" strokeLinecap="round" strokeLinejoin="round" />
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
/**
 * Live table log, sat in the felt's dead space beside the piles.
 *
 * Reserves its own width whether or not it has anything to say — a panel that
 * appears once the first card is drawn would shove the four slots sideways
 * mid-turn, which is worse than a quiet empty state.
 */
function TableFeed({ items }: { items: RummyFeedItem[] }) {
  return (
    <div className="rm-slot rm-tablefeed" aria-live="polite">
      <span className="rm-tablefeed__title">At the table</span>
      {items.length === 0 ? (
        <span className="rm-tablefeed__empty">Moves will show up here</span>
      ) : (
        <ul className="rm-tablefeed__list">
          {items.map((f, i) => (
            <li
              key={f.id}
              className={`rm-tablefeed__item rm-tablefeed__item--${f.tone}`}
              // Older lines recede rather than vanish, so the newest is
              // obvious without needing a badge to say so.
              style={{ opacity: 1 - i * 0.14 }}
            >
              {f.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  onMoveCard,
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
  onMoveCard?: (cardId: string, dir: -1 | 1) => void;
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
              groupId={groupId}
              index={idx}
              totalCards={cardIds.length}
              onMoveCard={onMoveCard ? (dir) => onMoveCard(id, dir) : undefined}
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
  groupId,
  index,
  totalCards,
  onMoveCard,
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
  groupId?: string;
  index?: number;
  totalCards?: number;
  onMoveCard?: (dir: -1 | 1) => void;
}) {
  const isDragging = draggingIds.includes(cardId);
  const isSelected = selected.has(cardId);
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
      data-rummy-drop={groupId ? `card:${groupId}:${cardId}` : undefined}
      className="relative group/card"
      style={{
        ...drag.style,
        marginLeft: offset,
        opacity: isDragging ? 0.35 : 1,
        pointerEvents: isDragging ? "none" : "auto",
        zIndex: isSelected ? 20 : (index ?? 1),
        transform: isSelected ? "translateY(-8px)" : "translateY(0)",
        transition: "transform 0.12s ease",
      }}
    >
      {/* Quick Shift buttons when card is selected in a meld with >= 2 cards */}
      {isSelected && onMoveCard && (totalCards ?? 0) > 1 && (
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-30 bg-black/85 rounded-full px-1 py-0.5 border border-amber-400/80 shadow-md backdrop-blur-xs"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMoveCard(-1);
            }}
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-amber-300 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Move left in meld"
          >
            ◀
          </button>
          <button
            type="button"
            disabled={index === (totalCards ?? 1) - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMoveCard(1);
            }}
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-amber-300 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Move right in meld"
          >
            ▶
          </button>
        </div>
      )}
      <PlayingCard
        card={card}
        isWildJoker={card.rank === wildRank}
        selected={isSelected}
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
        D draw · O open pile · S sort · A auto · G group · Space discard · Enter declare · Esc clear
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
