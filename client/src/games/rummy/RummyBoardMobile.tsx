import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Card, ChatMessage, Player, Rank, ReactionRecvPayload, RummyChampion, RummyPlayerState, RummyRoundRecap } from "@shared/types";
import { PlayingCard, FaceDownCard, FinishSlot } from "./Card";
import { getSocket } from "../../lib/socket";
import {
  classifyMeld,
  handMeldContext,
  withHandContext,
  computeLivePoints,
  evaluateFinishReadiness,
  sortMeldCards,
  sumCardPoints,
  type LivePoints,
  type MeldClassification,
} from "./meldCheck";
import EmojiRain from "../ludo/EmojiRain";
import CardTracker from "./CardTracker";
import { splitBySuit } from "./autoArrange";
import { rummySfx, setRummySoundEnabled, isRummySoundEnabled } from "./sound";
import { useTurnHaptics, useHaptics } from "../../hooks/useHaptics";
import TutorialModal, { hasSeenTutorial } from "./TutorialModal";
import PlayerList from "../../components/PlayerList";
import VoicePanel from "../../components/VoicePanel";
import Chat from "../../components/Chat";
import RematchPanel from "../../components/RematchPanel";
import Avatar from "./Avatar";
import RummyResultModal from "./RummyResultModal";
import RummyRoomHistory from "../../components/nostalgia/RummyRoomHistory";
import { RUMMY_COPY } from "./copy";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  onFullscreenChange,
} from "../../lib/fullscreen";
import {
  useOrientationReport,
  useRummyRotationGate,
  RotateDevicePrompt,
  WaitingForPlayersBanner,
} from "./rotation-sync";

type Layout = {
  groups: Array<{ id: string; cardIds: string[] }>;
  ungrouped: string[];
};

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
const RANK_ORDER: Record<string, number> = {
  A: 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6, "8": 7, "9": 8,
  T: 9, J: 10, Q: 11, K: 12,
};

function cardSortKey(c: Card, wildJokerRank: string): number[] {
  const isWild = c.rank === wildJokerRank ? 0 : 1;
  return [isWild, SUIT_ORDER[c.suit] ?? 9, RANK_ORDER[c.rank] ?? 99];
}

function sortIds(ids: string[], byId: Map<string, Card>, wildJokerRank: string): string[] {
  return ids.slice().sort((a, b) => {
    const ca = byId.get(a);
    const cb = byId.get(b);
    if (!ca || !cb) return 0;
    const ka = cardSortKey(ca, wildJokerRank);
    const kb = cardSortKey(cb, wildJokerRank);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });
}

function newGroupId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Player can hold at most this many groups at once. 14 cards / 7 groups
 * averages 2 per group, which is below any valid meld size (3) — so this
 * is intentionally generous and only blocks runaway fragmentation. The
 * GROUP button, the "+ NEW MELD" drop zone, and cross-group drags all
 * respect it.
 */
const MAX_GROUPS = 7;

const NOOP: () => void = () => {};

/* ──────────────────────────────────────────────────────────────────────────
 * Pointer Events-based drag and drop.
 *
 * Replaces the old HTML5 drag + drag-drop-touch polyfill stack. Both had
 * mobile-Safari quirks (button.draggable ignored, polyfill race against
 * React state updates). Pointer Events fire identically across mouse and
 * touch and let us own the gesture grammar end-to-end.
 *
 *   - Drop zones are tagged with [data-rummy-drop="<id>"].
 *   - Each hand card uses useCardPointerDrag, which captures the pointer on
 *     down, watches for 6px of movement before declaring a drag (so quick
 *     taps still select the card), and on release resolves the element
 *     under the finger via document.elementFromPoint.
 *   - Within-lane reordering is not supported here (drops append to the
 *     end of the destination lane); use the SORT action afterward.
 * ───────────────────────────────────────────────────────────────────────── */

type DropTarget =
  | "openpile"
  | "finishslot"
  | "ungrouped"
  | "ungroupedEnd"
  | "new"
  | `group:${string}`
  | `before:${string}`;

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
  // Per-pointer state lives in a ref so it survives re-renders without
  // re-binding listeners. Only one pointer per card at a time — a second
  // finger on the same card is ignored.
  const stRef = useRef<{
    pointerId: number;
    x0: number;
    y0: number;
    dragging: boolean;
  } | null>(null);

  return {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      // Ignore right/middle mouse buttons. Pointer events report button=0 for
      // left mouse and for touch — both should initiate.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stRef.current = {
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        dragging: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      const dist = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
      if (!st.dragging) {
        if (dist < 6) return;
        st.dragging = true;
        const ids =
          opts.selected.has(opts.cardId) && opts.selected.size > 1
            ? [...opts.selected]
            : [opts.cardId];
        opts.onDragBegin(ids);
      }
      const target = resolveDropTarget(e.clientX, e.clientY);
      opts.onDragHover(target);
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      stRef.current = null;
      if (!st || st.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { /* element may already have lost capture */ }
      if (st.dragging) {
        const target = resolveDropTarget(e.clientX, e.clientY);
        opts.onDragRelease(target);
      } else {
        // Tap with no movement → treat as a select toggle.
        opts.onTap(opts.cardId);
      }
    },
    onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      stRef.current = null;
      if (!st || st.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { /* ignore */ }
      if (st.dragging) opts.onDragRelease(null);
    },
  };
}

function DraggableHandCard({
  cardId,
  card,
  wildRank,
  isSelected,
  isDragged,
  isFresh,
  marginLeft,
  zIndex,
  selected,
  onTap,
  onDragBegin,
  onDragHover,
  onDragRelease,
}: {
  cardId: string;
  card: Card;
  wildRank: string;
  isSelected: boolean;
  isDragged: boolean;
  isFresh: boolean;
  marginLeft: number;
  zIndex: number;
  selected: Set<string>;
  onTap: (id: string) => void;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
}) {
  const handlers = useCardPointerDrag({
    cardId,
    selected,
    onDragBegin,
    onDragHover,
    onDragRelease,
    onTap,
  });
  return (
    <div
      {...handlers}
      className={isFresh ? "rummy-card-arrive" : ""}
      style={{
        position: "relative",
        marginLeft,
        zIndex: isSelected ? 50 : zIndex,
        opacity: isDragged ? 0.35 : 1,
        cursor: "grab",
        touchAction: "none",
        transition: "opacity 150ms",
      }}
    >
      {/* Inner card receives a NOOP onClick so it renders as a <button> with
          cursor-pointer + hover-lift visuals, but the real tap handling is
          the wrapper's onPointerUp → onTap above. If we passed the real
          onTap here, every tap would fire twice (wrapper's onPointerUp AND
          the browser's synthesised click on the inner button) and the
          select toggle would cancel itself. We also intentionally omit
          `draggable` here: HTML5 drag on the inner would race the wrapper's
          pointer capture and produce a broken ghost drag image on desktop. */}
      <PlayingCard
        card={card}
        isWildJoker={card.rank === wildRank}
        selected={isSelected}
        onClick={NOOP}
      />
    </div>
  );
}

export default function RummyBoardMobile({
  state,
  players,
  selfId,
  messages = [],
  roomCode,
  onLeave,
  history,
  champion,
  onScorecardClose,
}: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  onLeave?: () => void;
  history: RummyRoundRecap[];
  champion: RummyChampion | null;
  /** Called when the final scorecard/result is dismissed — see RummyBoard.tsx for contract. */
  onScorecardClose?: () => void;
}) {
  const isArranging = state.phase === "arranging";
  const myTurn = state.turnPlayerId === selfId && state.phase === "playing";
  const canDraw = myTurn && state.turnAction === "draw" && state.phase === "playing";
  const canDiscardOrDeclare = myTurn && state.turnAction === "discardOrDeclare" && state.phase === "playing";
  // During the post-show window the declarer just spectates; everyone else
  // rearranges to cut points.
  const iAmDeclarer = isArranging && state.winnerId === selfId;
  // Buzz the device on each transition into your turn.
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);
  const iDropped = !!selfId && state.droppedPlayers.includes(selfId);

  const hand = state.myHand ?? [];
  const byId = useMemo(() => new Map(hand.map((c) => [c.id, c])), [hand]);
  const wildRank = state.wildJoker.rank;

  // Layout — persistent client-side grouping. Reconciles on every server hand update.
  const [layout, setLayout] = useState<Layout>({ groups: [], ungrouped: [] });

  // Stream the player's drag-and-drop arrangement to the server (debounced)
  // so round-end scoring can credit THESE groups — keeping the in-game live
  // points and the scorecard's points + decks in lockstep. Without this, the
  // server re-grouped each loser's raw hand and the scorecard often showed
  // different cards + different points than what the player was looking at.
  useEffect(() => {
    if (state.phase === "finished") return;
    const t = window.setTimeout(() => {
      try {
        getSocket().emit("rummy:arrangement", {
          groups: layout.groups.map((g) => g.cardIds.slice()),
        });
      } catch {
        /* ignore — best-effort */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [layout.groups, state.phase]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const initialized = useRef(false);

  // Drag state — for HTML5 drag-and-drop card reordering.
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Reactions + emoji rain
  const [reactions, setReactions] = useState<ReactionRecvPayload[]>([]);
  const [rains, setRains] = useState<{ id: string; emoji: string }[]>([]);

  // Sound on/off — persists between renders via the module's internal state.
  const [soundOn, setSoundOn] = useState(isRummySoundEnabled());

  // Animation state — fresh card just drawn, and discard pile pulse trigger.
  const [freshCardId, setFreshCardId] = useState<string | null>(null);
  const [discardPulseKey, setDiscardPulseKey] = useState(0);

  // Tutorial — auto-opens on first ever Rummy game (per browser).
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasSeenTutorial());

  // Modal overlays — secondary info kept off the felt to maximize hand visibility.
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Hamburger menu (consolidates every secondary action behind a single ☰ icon
  // so the top strip can stay 20px tall).
  const [menuOpen, setMenuOpen] = useState(false);
  // Tiny "Copied!" toast on the room-code copy button.
  const [copiedFlash, setCopiedFlash] = useState(false);
  // True once the user has dismissed the round-over / match-over overlay so we
  // don't keep re-popping it. Resets when a new round starts (phase flips back
  // to "playing") so the NEXT round's result will still appear.
  const [resultDismissed, setResultDismissed] = useState(false);

  // Mobile portrait detection — Rummy is designed for landscape; on portrait
  // phones, we show a rotate-device prompt instead of cramming the felt
  // into a narrow column. Declared before the gate below because the gate
  // needs this value (not the server-echoed one) for the LOCAL player.
  const needsLandscape = useOrientationReport();

  // Two-phase opening animation — STRICTLY shown only when the player is
  // actually starting the game. NOT on rejoin, refresh, mid-game arrival,
  // or pool-mode round 2+. Synchronized across every player's device — see
  // `useRummyRotationGate` in `./rotation-sync` for the full gating
  // contract (holds for everyone to rotate to landscape before the
  // shuffle/deal opener plays for anyone).
  const gate = useRummyRotationGate({
    roomCode,
    phase: state.phase,
    players,
    selfId,
    selfNeedsRotation: needsLandscape,
  });
  useEffect(() => {
    if (state.phase === "playing") setResultDismissed(false);
  }, [state.phase]);

  // Fullscreen state — Rummy can be played in browser fullscreen so the
  // URL bar / gesture bar don't eat the bottom action buttons. The lobby's
  // Start Game / Ready buttons already attempt entry (those clicks satisfy
  // the user-gesture requirement); this hook keeps the menu toggle in
  // sync if the user exits via ESC / system swipe.
  const fullscreenSupported = isFullscreenSupported();
  const [fullscreenOn, setFullscreenOn] = useState<boolean>(() => isFullscreenActive());
  useEffect(() => {
    const off = onFullscreenChange(() => setFullscreenOn(isFullscreenActive()));
    return off;
  }, []);
  async function toggleFullscreen() {
    if (isFullscreenActive()) {
      await exitFullscreen();
    } else {
      await enterFullscreen("landscape");
    }
  }

  // Game-over celebration — 30 seconds after the game truly ends, swap the
  // whole screen for a full-bleed victory artwork with a "Go to Lobby"
  // button. "Game over" here means the WHOLE game has concluded:
  //   - Single mode → first finished round
  //   - Pool modes  → matchOver flag (last player standing)
  // Between-rounds in pool mode is NOT game over and must not trigger this.
  const isGameOver =
    (state.phase === "finished" && state.matchMode === "single") ||
    state.matchOver;
  const [showCelebration, setShowCelebration] = useState(false);
  useEffect(() => {
    if (!isGameOver) {
      setShowCelebration(false);
      return;
    }
    const timer = window.setTimeout(() => setShowCelebration(true), 30_000);
    return () => window.clearTimeout(timer);
  }, [isGameOver]);

  // 5-second winner-only celebration burst — fires the moment the round
  // ends from a VALID declare with the local player as winner. Renders as
  // a pointer-events-none overlay so the scorecard modal underneath stays
  // interactive (the user can still tap "Leave Game" etc.). Filtered out
  // for wrong shows and disconnect-driven endings — those have their own
  // headers and shouldn't read as a victory.
  const [winnerBurstKey, setWinnerBurstKey] = useState<number | null>(null);
  const prevPhaseForBurst = useRef(state.phase);
  useEffect(() => {
    // playing → arranging → finished: fire on landing at finished from either
    // (arranging for a normal show, playing for an instant drop-out win).
    const wasInRound = prevPhaseForBurst.current !== "finished";
    const justFinished = state.phase === "finished";
    prevPhaseForBurst.current = state.phase;
    if (!wasInRound || !justFinished) return;
    if (state.invalidDeclareBy) return;
    if (state.endedByDisconnect) return;
    if (state.winnerId !== selfId) return;
    setWinnerBurstKey(Date.now());
    const t = window.setTimeout(() => setWinnerBurstKey(null), 5_000);
    return () => window.clearTimeout(t);
  }, [state.phase, state.winnerId, state.invalidDeclareBy, state.endedByDisconnect, selfId]);

  // New unread-chat indicator on the icon
  const lastSeenChatRef = useRef(messages.length);
  const hasUnreadChat = !chatOpen && messages.length > lastSeenChatRef.current;
  useEffect(() => {
    if (chatOpen) lastSeenChatRef.current = messages.length;
  }, [chatOpen, messages.length]);

  useEffect(() => {
    const handIds = hand.map((c) => c.id);
    const handSet = new Set(handIds);
    let freshlyAdded: string | null = null;
    setLayout((prev) => {
      // First time: auto-sort hand into ungrouped.
      if (!initialized.current && handIds.length >= 13) {
        initialized.current = true;
        return { groups: [], ungrouped: sortIds(handIds, byId, wildRank) };
      }
      const groups = prev.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => handSet.has(id)) }))
        .filter((g) => g.cardIds.length > 0);
      const ungrouped = prev.ungrouped.filter((id) => handSet.has(id));
      const knownIds = new Set([...groups.flatMap((g) => g.cardIds), ...ungrouped]);
      const fresh = handIds.filter((id) => !knownIds.has(id));
      if (fresh.length > 0) freshlyAdded = fresh[fresh.length - 1];
      return { groups, ungrouped: [...ungrouped, ...fresh] };
    });
    if (freshlyAdded) {
      setFreshCardId(freshlyAdded);
      const id = freshlyAdded;
      setTimeout(() => {
        setFreshCardId((cur) => (cur === id ? null : cur));
      }, 800);
    }
    // Drop selection for cards no longer in hand
    setSelected((prev) => new Set([...prev].filter((id) => handSet.has(id))));
  }, [hand, byId, wildRank]);

  // Pulse the discard pile when a new card lands on top.
  const lastDiscardIdRef = useRef<string | null>(null);
  useEffect(() => {
    const newTopId = state.topOfOpenPile?.id ?? null;
    if (newTopId && newTopId !== lastDiscardIdRef.current) {
      setDiscardPulseKey((k) => k + 1);
    }
    lastDiscardIdRef.current = newTopId;
  }, [state.topOfOpenPile]);

  // Subscribe to reaction broadcasts → animate floating reactions + emoji rain.
  useEffect(() => {
    const socket = getSocket();
    function onReaction(payload: ReactionRecvPayload) {
      setReactions((prev) => [...prev, payload].slice(-20));
      // Trigger a brief emoji rain for big celebratory emojis.
      if (["🔥", "🎉", "💯", "🏆", "🙌", "👏"].includes(payload.emoji)) {
        const id = `rain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        setRains((prev) => [...prev, { id, emoji: payload.emoji }]);
        setTimeout(() => setRains((prev) => prev.filter((r) => r.id !== id)), 2800);
      }
      // Auto-remove floating reactions after 2s.
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== payload.id));
      }, 2000);
    }
    socket.on("room:reaction", onReaction);
    return () => {
      socket.off("room:reaction", onReaction);
    };
  }, []);

  // Sound triggers — fire SFX when key game-state transitions happen.
  const prevHandSize = useRef(hand.length);
  const prevTurnAction = useRef(state.turnAction);
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    const wasHand = prevHandSize.current;
    const isHand = hand.length;
    // I drew a card: hand size grew by 1 and turn action moved to discard.
    if (isHand === wasHand + 1 && state.turnAction === "discardOrDeclare" && prevTurnAction.current === "draw") {
      rummySfx.draw();
    }
    // I discarded: hand size shrunk by 1 (and turn passed away).
    if (isHand === wasHand - 1 && state.turnAction === "draw" && prevTurnAction.current === "discardOrDeclare") {
      rummySfx.discard();
    }
    // Game just finished.
    if (state.phase === "finished" && prevPhase.current !== "finished") {
      if (state.winnerId === selfId) rummySfx.win();
      else if (state.invalidDeclareBy) rummySfx.invalidDeclare();
      else rummySfx.declare();
    }
    prevHandSize.current = isHand;
    prevTurnAction.current = state.turnAction;
    prevPhase.current = state.phase;
  }, [hand.length, state.turnAction, state.phase, state.winnerId, state.invalidDeclareBy, selfId]);

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }

  /* ─── Drop announcement — flourish when anyone drops the round ─── */
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  // === Drag & drop reorder ===

  function moveCardsTo(
    targetKind: "group" | "ungrouped" | "new",
    targetLaneId: string | null,
    beforeCardId: string | null,
    ids: string[],
  ) {
    setLayout((l) => {
      // Stable order: sort dragged ids by their current display order.
      const order = new Map<string, number>();
      let i = 0;
      for (const g of l.groups) for (const id of g.cardIds) order.set(id, i++);
      for (const id of l.ungrouped) order.set(id, i++);
      const sortedIds = [...ids].sort(
        (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
      );
      const idSet = new Set(sortedIds);

      // Remove from current locations.
      const groupsFiltered = l.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => !idSet.has(id)) }));
      const ungroupedFiltered = l.ungrouped.filter((id) => !idSet.has(id));

      if (targetKind === "new") {
        const cleaned = groupsFiltered.filter((g) => g.cardIds.length > 0);
        return {
          groups: [...cleaned, { id: newGroupId(), cardIds: sortedIds }],
          ungrouped: ungroupedFiltered,
        };
      }

      if (targetKind === "ungrouped") {
        let insertAt = beforeCardId != null
          ? ungroupedFiltered.indexOf(beforeCardId)
          : -1;
        if (insertAt < 0) insertAt = ungroupedFiltered.length;
        const newUngrouped = [
          ...ungroupedFiltered.slice(0, insertAt),
          ...sortedIds,
          ...ungroupedFiltered.slice(insertAt),
        ];
        const cleaned = groupsFiltered.filter((g) => g.cardIds.length > 0);
        return { groups: cleaned, ungrouped: newUngrouped };
      }

      // targetKind === "group"
      const newGroups = groupsFiltered.map((g) => {
        if (g.id !== targetLaneId) return g;
        let insertAt = beforeCardId != null
          ? g.cardIds.indexOf(beforeCardId)
          : -1;
        if (insertAt < 0) insertAt = g.cardIds.length;
        return {
          ...g,
          cardIds: [
            ...g.cardIds.slice(0, insertAt),
            ...sortedIds,
            ...g.cardIds.slice(insertAt),
          ],
        };
      });
      const cleaned = newGroups.filter((g) => g.cardIds.length > 0);
      return { groups: cleaned, ungrouped: ungroupedFiltered };
    });
  }

  function onDragBegin(ids: string[]) {
    setDraggingIds(ids);
    setError(null);
  }

  function onDragEnd() {
    setDraggingIds([]);
    setDragOverTarget(null);
  }

  function onDragHover(target: DropTarget | null) {
    setDragOverTarget(target);
  }

  // Read-latest helpers: a release fires once at the end of a drag, but the
  // outer closures see whatever draggingIds was at the start of the gesture.
  // Stash the active drag in a ref so the release callback can dispatch
  // against the freshest state.
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
      } else if (target === "ungrouped" || target === "ungroupedEnd") {
        moveCardsTo("ungrouped", null, null, ids);
      } else if (target === "new") {
        // Count how many groups would remain after the dragged cards
        // are pulled out of their source. If the source group empties
        // it'll be cleaned up, freeing a slot — so don't count it.
        const idSet = new Set(ids);
        const remaining = layout.groups.filter(
          (g) => g.cardIds.some((cid) => !idSet.has(cid)),
        ).length;
        if (remaining >= MAX_GROUPS) {
          setError(`Max ${MAX_GROUPS} groups — drop into an existing meld instead`);
        } else {
          moveCardsTo("new", null, null, ids);
        }
      } else if (target.startsWith("before:")) {
        // Within-lane reorder — insert before the specified card.
        // moveCardsTo handles this whether the source was in ungrouped or a
        // group, so the same handler covers cross-lane drops too.
        const beforeCardId = target.slice("before:".length);
        moveCardsTo("ungrouped", null, beforeCardId, ids);
      } else if (target.startsWith("group:")) {
        const groupId = target.slice("group:".length);
        moveCardsTo("group", groupId, null, ids);
      }
    }
    onDragEnd();
  }

  // === Actions ===

  function drawFromClosed() {
    if (!canDraw) return;
    getSocket().emit("game:move", { type: "draw", data: { from: "closed" } });
  }
  function drawFromOpen() {
    if (!canDraw || !state.topOfOpenPile) return;
    // House rule: printed jokers can't be lifted from the discard pile,
    // EXCEPT on the round's first draw (server flags this via
    // openJokerDrawable). Block the click client-side otherwise so the
    // user gets a clear toast instead of a silent server rejection.
    if (state.topOfOpenPile.isPrintedJoker && !state.openJokerDrawable) {
      setError("Printed jokers can't be drawn from the discard pile");
      return;
    }
    getSocket().emit("game:move", { type: "draw", data: { from: "open" } });
  }

  function copyRoomCode() {
    if (!roomCode) return;
    try {
      navigator.clipboard.writeText(roomCode);
      setCopiedFlash(true);
      setTimeout(() => setCopiedFlash(false), 1200);
    } catch {
      // Older browsers / insecure origins — silently ignore; the code is still
      // visible on the pill so the user can copy manually.
    }
  }

  function sortUngrouped() {
    setLayout((l) => ({
      ...l,
      ungrouped: sortIds(l.ungrouped, byId, wildRank),
    }));
  }

  function groupSelected() {
    if (selected.size < 1) {
      setError("Select at least one card to group");
      return;
    }
    // Pre-check the post-cleanup group count so we can bail with a clear
    // toast before mutating state. Mirrors the "+ NEW MELD" drag guard.
    const remainingGroups = layout.groups.filter(
      (g) => g.cardIds.some((cid) => !selected.has(cid)),
    ).length;
    if (remainingGroups >= MAX_GROUPS) {
      setError(`Max ${MAX_GROUPS} groups — merge into an existing meld first`);
      return;
    }
    setLayout((l) => {
      const selIds = [...selected];
      // Auto-sort selected cards into a sensible meld order (suit-grouped runs, rank-grouped sets).
      const cards = selIds.map((id) => byId.get(id)!).filter(Boolean);
      const sortedCards = sortMeldCards(cards, wildRank as Rank);
      const orderedIds = sortedCards.map((c) => c.id);
      const groups = l.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => !selected.has(id)) }))
        .filter((g) => g.cardIds.length > 0);
      const ungrouped = l.ungrouped.filter((id) => !selected.has(id));
      return {
        groups: [...groups, { id: newGroupId(), cardIds: orderedIds }],
        ungrouped,
      };
    });
    setSelected(new Set());
    setError(null);
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

  function discardSelected() {
    if (!canDiscardOrDeclare) return;
    if (selected.size !== 1) {
      setError("Pick exactly one card to discard");
      return;
    }
    const id = [...selected][0];
    getSocket().emit("game:move", { type: "discard", data: { cardId: id } });
    setSelected(new Set());
    setError(null);
  }

  // Drop the currently-dragged card onto the Open Pile: same as tapping the
  // DISCARD button with that card selected. Validates phase + payment.
  function dropOnOpenPile(cardId: string) {
    if (!canDiscardOrDeclare) {
      setError("Draw a card first before discarding");
      return;
    }
    getSocket().emit("game:move", { type: "discard", data: { cardId } });
    setSelected(new Set());
    setLayout((l) => ({
      groups: l.groups
        .map((g) => ({ ...g, cardIds: g.cardIds.filter((id) => id !== cardId) }))
        .filter((g) => g.cardIds.length > 0),
      ungrouped: l.ungrouped.filter((id) => id !== cardId),
    }));
    setError(null);
  }

  // Drop the currently-dragged card onto the Finish Slot: declare with that
  // card as the final discard. The other 13 cards must already be in valid
  // melds — if they're not, surface the same error the FINISH button shows.
  function dropOnFinishSlot(cardId: string) {
    if (!canDiscardOrDeclare) {
      setError("Draw a card first before finishing");
      return;
    }
    if (hand.length !== 14) {
      setError(`Need 14 cards to finish (have ${hand.length})`);
      return;
    }
    // Validate: every other card must sit in a valid-meld group.
    const otherCardsInGroups = layout.groups.reduce(
      (sum, g) => sum + g.cardIds.filter((id) => id !== cardId).length,
      0,
    );
    if (otherCardsInGroups !== 13) {
      setError("All 13 non-discard cards must be in groups before finishing");
      return;
    }
    const allMeldsValid = layout.groups
      .map((g) => g.cardIds.filter((id) => id !== cardId))
      .filter((ids) => ids.length > 0)
      .every((ids) => {
        const cards = ids.map((id) => byId.get(id)).filter(Boolean) as Card[];
        return classifyMeld(cards, wildRank as Rank).valid;
      });
    if (!allMeldsValid) {
      setError("All melds must be valid before finishing");
      return;
    }
    // Build the declare payload from the current layout, excluding the discard.
    const meldGroupsForDeclare = layout.groups
      .map((g) => g.cardIds.filter((id) => id !== cardId))
      .filter((ids) => ids.length > 0);
    getSocket().emit("game:move", {
      type: "declare",
      data: {
        discardCardId: cardId,
        melds: meldGroupsForDeclare,
      },
    });
    setError(null);
  }

  function drop() {
    setConfirmDrop(false);
    rummySfx.drop();
    getSocket().emit("game:move", { type: "drop" });
  }

  // AUTO only tidies the hand into suit lanes (♠♥♦♣ + jokers) — it never builds
  // melds. The player must form their own sequences/sets, which is what makes
  // the post-show 15-second rearrange window matter.
  function autoArrange() {
    const all: Card[] = [
      ...layout.groups.flatMap((g) => g.cardIds.map((id) => byId.get(id)).filter((c): c is Card => !!c)),
      ...layout.ungrouped.map((id) => byId.get(id)).filter((c): c is Card => !!c),
    ];
    if (all.length === 0) {
      setError(null);
      return;
    }
    const lanes = splitBySuit(all);
    setLayout({
      groups: lanes.slice(0, MAX_GROUPS).map((cards) => ({
        id: newGroupId(),
        cardIds: cards.map((c) => c.id),
      })),
      ungrouped: lanes.slice(MAX_GROUPS).flat().map((c) => c.id),
    });
    setSelected(new Set());
    setError(null);
    rummySfx.meldFormed();
  }


  function toggleSound() {
    const next = !soundOn;
    setRummySoundEnabled(next);
    setSoundOn(next);
  }

  function finishRound() {
    if (!canDiscardOrDeclare) {
      setError("You can only finish after drawing");
      return;
    }
    if (hand.length !== 14) {
      setError(`Need 14 cards to finish, have ${hand.length}`);
      return;
    }
    if (layout.ungrouped.length !== 1) {
      setError(
        `Move exactly 1 card to ungrouped (your discard). Currently ${layout.ungrouped.length} ungrouped.`,
      );
      return;
    }
    const totalGrouped = layout.groups.reduce((s, g) => s + g.cardIds.length, 0);
    if (totalGrouped !== 13) {
      setError(`All 13 non-discard cards must be in groups (currently ${totalGrouped})`);
      return;
    }
    const discardCardId = layout.ungrouped[0];
    const melds = layout.groups.map((g) => g.cardIds);
    getSocket().emit("game:move", {
      type: "declare",
      data: { discardCardId, melds },
    });
    setError(null);
  }

  // === Live meld classification + finish readiness ===

  const meldByGroupId = useMemo(() => {
    const base: Record<string, MeldClassification> = {};
    for (const g of layout.groups) {
      const cards = g.cardIds.map((id) => byId.get(id)).filter(Boolean) as Card[];
      base[g.id] = classifyMeld(cards, wildRank as Rank);
    }
    // Re-stamp each lane with its life-aware `counts` (a set / impure run
    // only counts once the two-life rule is met) so badges + valid count
    // match the score the server would actually credit.
    const ctx = handMeldContext(Object.values(base).map((c) => c.kind));
    const map: Record<string, MeldClassification> = {};
    for (const g of layout.groups) {
      map[g.id] = withHandContext(base[g.id], ctx);
    }
    return map;
  }, [layout.groups, byId, wildRank]);

  const readiness = useMemo(() => {
    const groups = layout.groups.map((g) => ({
      cards: g.cardIds.map((id) => byId.get(id)).filter(Boolean) as Card[],
    }));
    const totalGrouped = groups.reduce((s, g) => s + g.cards.length, 0);
    return evaluateFinishReadiness(groups, wildRank as Rank, totalGrouped, layout.ungrouped.length);
  }, [layout, byId, wildRank]);

  const livePoints = useMemo(() => {
    const groups = layout.groups.map((g) => {
      const cards = g.cardIds.map((id) => byId.get(id)).filter(Boolean) as Card[];
      return { cards, classification: meldByGroupId[g.id] };
    });
    const ungroupedCards = layout.ungrouped.map((id) => byId.get(id)).filter(Boolean) as Card[];
    return computeLivePoints(groups, ungroupedCards, wildRank as Rank);
  }, [layout, byId, wildRank, meldByGroupId]);

  // === Derived flags for button states ===

  const canSort = layout.ungrouped.length > 1;
  // Rearranging (group/sort/auto/drag) is allowed both during normal play AND
  // the post-show window — only blocked once the round is fully scored.
  const canGroup = selected.size >= 1 && state.phase !== "finished";
  const canDiscardBtn = canDiscardOrDeclare && selected.size === 1;
  // Allow drop both before drawing (first-drop, 20 pts) and after drawing
  // (middle-drop, card points). Not dropped, playing phase, and my turn.
  const canDropBtn = myTurn && !iDropped && state.phase === "playing";
  const canFinish = canDiscardOrDeclare && hand.length === 14 &&
    layout.ungrouped.length === 1 &&
    layout.groups.reduce((s, g) => s + g.cardIds.length, 0) === 13;

  // === Render ===

  return (
    <div
      className="rounded-none sm:rounded-[28px] px-3 sm:px-5 pt-3 sm:pt-4 relative shadow-2xl flex flex-col gap-1 sm:gap-1.5 h-full overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #6D4323 0%, #4A2C16 55%, #3a2010 100%)",
        // Bottom padding has to clear the OS gesture bar / nav buttons on
        // real phones — without this, the ACTION row (DROP/SORT/…/FINISH)
        // sits flush with the bottom edge and the lower half of each button
        // gets clipped by the device chrome (visible especially when the
        // browser URL bar is showing). `env(safe-area-inset-bottom)` is
        // iOS/modern-Android-aware; the `max(...)` floor keeps a sensible
        // gap on devices that report 0 inset (older Chrome/Firefox).
        paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 6px, 18px)",
        boxShadow: [
          "0 0 0 1px #1a0f00 inset",
          "0 0 0 7px #d4a85a inset",
          "0 0 0 9px #8b6914 inset",
          "0 0 0 11px #d4a85a inset",
          "0 0 0 13px #5a4a14 inset",
          "0 0 40px rgba(0,0,0,0.55) inset",
          "0 12px 48px rgba(0,0,0,0.6)",
        ].join(", "),
      }}
    >
      {(gate.stage === "shuffle" || gate.stage === "deal") && (
        <RummyDealOverlay stage={gate.stage} playerCount={state.playerOrder.length} />
      )}

      {/* Low-time warning — pulsing red screen border + countdown chip when
          it's your turn and the timer has dropped to 10 s or less. The
          chip stays in the viewport corner so the player notices even
          when their attention is on the open pile or finish slot. */}
      <RummyTimeWarning
        deadline={state.turnDeadline}
        active={state.phase === "playing" && state.turnPlayerId === selfId}
      />

      {/* 20px top strip — Leave · RoomPill · Hamburger.
          Everything else is the felt. */}
      <TopStrip
        gameLabel={
          state.matchMode === "pool101"
            ? "101 Pool Rummy"
            : state.matchMode === "pool201"
            ? "201 Pool Rummy"
            : "Points Rummy"
        }
        roomCode={roomCode}
        copiedFlash={copiedFlash}
        onCopy={copyRoomCode}
        onLeave={onLeave}
        onOpenMenu={() => setMenuOpen(true)}
        hasUnreadChat={hasUnreadChat}
        fullscreenSupported={fullscreenSupported}
        fullscreenOn={fullscreenOn}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Opponents + Center deck on a single row. 3-column grid where the
          deck sits in the center column and an empty spacer mirrors the
          opponent column on the right, so the deck stays optically centered
          regardless of how many opponents are at the table. */}
      <div
        className="grid items-center gap-2 sm:gap-3 flex-shrink-0 pl-4 sm:pl-10"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        <div className="flex justify-start min-w-0">
          <OpponentRow state={state} players={players} selfId={selfId} />
        </div>
        <CenterDeckArea
          state={state}
          canDraw={canDraw}
          canDiscard={canDiscardOrDeclare}
          drawFromClosed={drawFromClosed}
          drawFromOpen={drawFromOpen}
          draggingIds={draggingIds}
          discardPulseKey={discardPulseKey}
        />
        <div aria-hidden />
      </div>

      {/* My hand: hidden/replaced when dropped — dropped player spectates */}
      {iDropped ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
          <div className="text-5xl opacity-30 tracking-widest">🂠🂠🂠</div>
          <div
            className="px-5 py-2.5 rounded-full text-sm font-extrabold uppercase tracking-[0.15em]"
            style={{
              background: "rgba(0,0,0,0.40)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Spectating this round
          </div>
        </div>
      ) : (
        <HandArea
          layout={layout}
          byId={byId}
          wildRank={wildRank}
          selected={selected}
          draggingIds={draggingIds}
          dragOverTarget={dragOverTarget}
          meldByGroupId={meldByGroupId}
          freshCardId={freshCardId}
          onCardClick={toggleSelect}
          onUngroup={ungroupGroup}
          onDragBegin={onDragBegin}
          onDragHover={onDragHover}
          onDragRelease={onDragRelease}
        />
      )}

      {/* Self player strip + finish-readiness chips on a single row to save
          vertical space. The PlayerStrip floats left, checklist chips float
          right; they wrap on truly narrow viewports but stay on one line for
          mobile landscape and up. */}
      {!iDropped && state.phase === "playing" && (
        <div className="flex items-center justify-between gap-2 flex-shrink-0 px-1 flex-wrap">
          <PlayerStrip
            state={state}
            selfId={selfId}
            nameOf={nameOf}
            livePoints={livePoints}
          />
          {hand.length > 0 && (
            <FinishReadinessBanner readiness={readiness} canFinish={canFinish} />
          )}
        </div>
      )}

      {/* Action bar — normal flex child at the bottom of the felt. The
          felt has a ~13 px gold-rim inset boxShadow, so we need ≥16 px of
          horizontal padding to keep the buttons clear of the rim on every
          viewport. Phones get more relative padding because the felt is
          full-width edge-to-edge there. */}
      <div className="flex-shrink-0 max-w-2xl w-full mx-auto px-4 sm:px-8">
        <ActionBar
          canGroup={canGroup}
          canDiscard={canDiscardBtn}
          canDrop={canDropBtn}
          canFinish={canFinish}
          canAutoArrange={hand.length > 0 && state.phase !== "finished"}
          canSort={canSort}
          iDropped={iDropped}
          onGroup={groupSelected}
          onDiscard={discardSelected}
          onDropClick={() => setConfirmDrop(true)}
          onFinish={finishRound}
          onAutoArrange={autoArrange}
          onSort={sortUngrouped}
        />
      </div>

      {/* In-board errors (e.g. "Select a card first") render as a floating toast
          so they never reshape the felt's flex layout. */}
      {error && <BoardToast message={error} onClose={() => setError(null)} />}

      {confirmDrop && (
        <DropConfirm
          onCancel={() => setConfirmDrop(false)}
          onConfirm={drop}
          isFirstDrop={state.turnAction === "draw"}
          handPts={livePoints.handTotal}
        />
      )}

      {/* End-of-round / end-of-match cards render as dismissable modal overlays
          so they sit ON TOP of the table. Closing them lets the player inspect
          the board behind; the modal returns automatically on the next round
          (resultDismissed resets when phase flips back to "playing"). */}
      {/* Single-mode end-of-round scorecard — game over, fire callback. */}
      {!resultDismissed && state.phase === "finished" && state.matchMode === "single" && (
        <RummyResultModal
          state={state}
          players={players}
          selfId={selfId}
          roomCode={roomCode}
          onClose={() => {
            setResultDismissed(true);
            onScorecardClose?.();
          }}
          onLeave={onLeave}
        />
      )}

      {/* Pool mode — between rounds (game continues). Do NOT fire the
          GameOverScreen callback here; the room stays alive for the rematch. */}
      {!resultDismissed && state.phase === "finished" && state.matchMode !== "single" && !state.matchOver && (
        <ResultOverlay onClose={() => setResultDismissed(true)}>
          <PoolBetweenRounds state={state} nameOf={nameOf} selfId={selfId} />
        </ResultOverlay>
      )}

      {/* Pool match truly over — fire callback so GameOverScreen replaces board. */}
      {!resultDismissed && state.matchOver && (
        <ResultOverlay
          onClose={() => {
            setResultDismissed(true);
            onScorecardClose?.();
          }}
        >
          <div className="space-y-3">
            <MatchOverCard state={state} nameOf={nameOf} />
            <div className="bg-amber-950/60 border border-amber-700/40 rounded-xl p-3">
              <RematchPanel players={players} selfId={selfId} />
            </div>
          </div>
        </ResultOverlay>
      )}

      {/* 5-second winner burst — sits above the scorecard with
          pointer-events: none so the modal beneath stays clickable. */}
      {winnerBurstKey != null && <WinnerCelebrationBurst key={winnerBurstKey} />}

      {/* Victory celebration — appears 30s after the game truly ends and
          covers everything until the player chooses to leave. */}
      {showCelebration && (
        <RummyCelebrationOverlay onLeave={onLeave ?? (() => {})} />
      )}

      {/* Persistent pool standings — always visible in pool mode */}
      {state.matchMode !== "single" && state.phase === "playing" && (
        <PoolStandings state={state} nameOf={nameOf} selfId={selfId} />
      )}

      {/* Post-show 15s rearrange window — countdown banner. */}
      {isArranging && (
        <ArrangingBannerMobile
          deadline={state.arrangeDeadline ?? null}
          iAmDeclarer={iAmDeclarer}
          declarerName={nameOf(state.winnerId ?? "")}
        />
      )}

      {/* Drop flourish — a card slams down when a player drops. */}
      {dropAnnounce && <DropAnnounceMobile name={dropAnnounce.name} mine={dropAnnounce.mine} />}

      {/* Floating reactions — small bubbles bouncing up from below the player names */}
      <FloatingRummyReactions reactions={reactions} players={players} selfId={selfId} />

      {/* Emoji rain layer — global overlay */}
      {rains.map((r: any) => (
        <EmojiRain key={r.id} emoji={r.emoji} />
      ))}

      {/* Tutorial overlay */}
      {tutorialOpen && <TutorialModal onClose={() => setTutorialOpen(false)} />}

      {/* Hamburger menu — single entry point for every secondary action.
          Each row closes the menu and opens the relevant detail modal. */}
      {menuOpen && (
        <RummyModal title="Menu" onClose={() => setMenuOpen(false)}>
          <div className="grid grid-cols-1 gap-1.5">
            <MenuRow emoji="👥" label="Players" onClick={() => { setMenuOpen(false); setPlayersOpen(true); }} />
            <MenuRow emoji="🎤" label="Voice chat" onClick={() => { setMenuOpen(false); setVoiceOpen(true); }} />
            <MenuRow
              emoji="💬"
              label="Chat"
              badge={hasUnreadChat}
              onClick={() => { setMenuOpen(false); setChatOpen(true); }}
            />
            <MenuRow emoji="🔍" label="Card tracker" onClick={() => { setMenuOpen(false); setTrackerOpen(true); }} />
            <MenuRow emoji="📊" label="Live points" onClick={() => { setMenuOpen(false); setPointsOpen(true); }} />
            <MenuRow emoji="📘" label="Tutorial" onClick={() => { setMenuOpen(false); setTutorialOpen(true); }} />
            {(history.length > 0 || champion) && (
              <MenuRow emoji="📖" label="Room history" onClick={() => { setMenuOpen(false); setHistoryOpen(true); }} />
            )}
            <MenuRow
              emoji={soundOn ? "🔊" : "🔇"}
              label={soundOn ? "Sound: On" : "Sound: Off"}
              onClick={toggleSound}
            />
            {fullscreenSupported && (
              <MenuRow
                emoji={fullscreenOn ? "🗗" : "⛶"}
                label={fullscreenOn ? "Exit fullscreen" : "Enter fullscreen"}
                onClick={() => {
                  setMenuOpen(false);
                  void toggleFullscreen();
                }}
              />
            )}
          </div>
        </RummyModal>
      )}

      {/* Players overlay */}
      {playersOpen && (
        <RummyModal title="Players" onClose={() => setPlayersOpen(false)}>
          <PlayerList players={players} selfId={selfId} />
        </RummyModal>
      )}

      {/* Voice overlay */}
      {voiceOpen && (
        <RummyModal title="Voice" onClose={() => setVoiceOpen(false)}>
          <VoicePanel players={players} selfId={selfId} restoreOrientation="landscape" />
        </RummyModal>
      )}

      {/* Chat overlay */}
      {chatOpen && (
        <RummyModal title="Chat" onClose={() => setChatOpen(false)}>
          <Chat messages={messages} selfId={selfId} />
        </RummyModal>
      )}

      {/* Room history overlay (docs/rummy/roadmap.md B.2) */}
      {historyOpen && (
        <RummyModal title="Room History" onClose={() => setHistoryOpen(false)}>
          <RummyRoomHistory variant="panel" density="mobile" history={history} champion={champion} players={players} showTitle={false} />
        </RummyModal>
      )}

      {/* Card Tracker overlay */}
      {trackerOpen && (
        <RummyModal title="Card Tracker" onClose={() => setTrackerOpen(false)}>
          <CardTracker
            myHand={hand}
            openPile={state.openPile}
            wildJokerRank={state.wildJoker.rank}
          />
        </RummyModal>
      )}

      {/* ─── Gating stage overlays ───────────────────────────────────────
          The lazy initializer in useRummyRotationGate starts at "gating"
          (not "idle") if the sessionStorage flag is set, so the first
          render is already in gating. BUT we still need a blocking overlay
          here so the game board is never visible before the deal animation.

          Three cases:
           1. needsLandscape  → RotateDevicePrompt blocks the board.
           2. !needsLandscape + blockers > 0 → wood blocking overlay with
              "waiting for players to rotate" banner.
           3. !needsLandscape + no blockers → wood "Setting up…" overlay
              for the settle window (ROTATION_SETTLE_MS ≈ 600 ms).
          All three cases prevent the board flashing before the shuffle. */}
      {needsLandscape && (
        <RotateDevicePrompt
          readiness={
            gate.stage === "gating"
              ? { readyCount: gate.readyCount, totalCount: gate.totalCount }
              : undefined
          }
        />
      )}
      {gate.stage === "gating" && !needsLandscape && (
        /* Full-screen blocking overlay — same dark-wood background as the
           felt so there is zero flash of green behind it. z-[55] sits above
           all in-game panels (z ≤ 50) but under the deal overlay (z-[55]
           fires next, replacing this one cleanly). */
        <div
          className="absolute inset-0 z-[55] flex flex-col items-center justify-center gap-4"
          style={{ background: "linear-gradient(160deg, #6D4323 0%, #4A2C16 55%, #3a2010 100%)" }}
        >
          {gate.blockers.length > 0 ? (
            <WaitingForPlayersBanner
              blockers={gate.blockers}
              showNames={gate.showBlockerNames}
              variant="overlay"
            />
          ) : (
            <>
              {/* Animated deck stack while settle-window ticks */}
              <div className="relative w-16 h-20 flex items-center justify-center">
                {[2, 1, 0].map((z) => (
                  <div
                    key={z}
                    className="absolute rounded-lg"
                    style={{
                      width: 52 - z * 4, height: 72 - z * 4,
                      background: "linear-gradient(140deg, #7f1d1d 0%, #991b1b 60%, #4c0519 100%)",
                      border: "1px solid rgba(201,162,39,0.6)",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(251,191,36,0.35)",
                      transform: `rotate(${(z - 1) * 5}deg)`,
                      zIndex: z,
                    }}
                  />
                ))}
                <div
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center z-10 font-black text-sm"
                  style={{
                    background: "linear-gradient(135deg, #C9A227, #8A6220)",
                    color: "#1f1300",
                    boxShadow: "0 2px 12px rgba(201,162,39,0.60)",
                    animation: "rummy-glow 1.4s ease-in-out infinite",
                  }}
                >
                  B
                </div>
              </div>
              <div
                className="px-5 py-2 rounded-full font-black uppercase tracking-[0.18em] text-xs"
                style={{
                  background: "linear-gradient(135deg, #fde68a, #f59e0b)",
                  color: "#1f1300",
                  border: "2px solid #b45309",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
                }}
              >
                Setting up the table…
              </div>
              <div className="flex gap-4 text-xl" style={{ opacity: 0.22, color: "#F5E9C9" }} aria-hidden>
                <span>♠</span><span>♥</span><span>♦</span><span>♣</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Live points overlay */}
      {pointsOpen && (
        <RummyModal title="Live Points" onClose={() => setPointsOpen(false)}>
          <PointsPanel points={livePoints} />
        </RummyModal>
      )}

    </div>
  );
}

function RummyModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-auto p-3 sm:p-4 space-y-3"
        style={{
          background: "linear-gradient(180deg, #6D4323 0%, #4A2C16 100%)",
          border: "2px solid #9C7A3C",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold uppercase tracking-wider text-nostalgia-paper">
            {title}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/45 text-nostalgia-paper font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Wraps end-of-round / end-of-match result cards so they appear as a centered
 * overlay above the table instead of in document flow below the action bar.
 * Sits above the action bar (z-40) but below modal panels (z-50) so opening
 * Chat/Players still works while a result is displayed.
 */
/**
 * Floating warning toast for board-level actions ("Select a card first",
 * "Need 14 cards to finish", etc). Rendered with fixed positioning so it never
 * reshapes the felt — the layout stays locked under it.
 */
function BoardToast({ message, onClose }: { message: string; onClose: () => void }) {
  // Auto-dismiss after 4s so the player doesn't have to keep tapping ✕.
  useEffect(() => {
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-1.5rem)]">
      <div
        className="rounded-lg px-3 py-2 flex items-center gap-3 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)",
          border: "1px solid #b91c1c",
          color: "#fee2e2",
        }}
      >
        <span className="text-amber-300 text-base flex-shrink-0">⚠</span>
        <span className="text-xs sm:text-sm font-semibold flex-1 break-words">
          {message}
        </span>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="w-6 h-6 rounded-full flex items-center justify-center bg-rose-950 hover:bg-rose-900 text-rose-200 font-extrabold flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ResultOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      <div
        className="relative w-[95vw] max-w-[1100px] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center bg-[#2E2419] hover:bg-[#4A2C16] text-nostalgia-paper font-extrabold z-10"
          style={{
            border: "2px solid #fcd34d",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

function MenuRow({
  emoji,
  label,
  onClick,
  badge,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-nostalgia-paper"
      style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(201,162,39,0.20)" }}
    >
      <span className="text-xl" aria-hidden>{emoji}</span>
      <span className="text-sm font-bold flex-1">{label}</span>
      {badge && (
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "#ef4444", boxShadow: "0 0 0 1.5px #3a2010" }}
        />
      )}
      <span style={{ color: "rgba(201,162,39,0.55)" }}>›</span>
    </button>
  );
}

function ModalActionButton({
  label,
  emoji,
  color,
  enabled,
  onClick,
}: {
  label: string;
  emoji: string;
  color: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className="px-4 py-3 rounded-lg font-extrabold uppercase tracking-wider text-sm transition flex items-center gap-3 select-none w-full"
      style={{
        background: enabled
          ? `linear-gradient(180deg, ${color} 0%, ${shade(color, -0.25)} 100%)`
          : "linear-gradient(180deg, #475569 0%, #334155 100%)",
        color: enabled ? "#fff" : "#94a3b8",
        opacity: enabled ? 1 : 0.6,
        cursor: enabled ? "pointer" : "not-allowed",
      }}
    >
      <span className="text-lg" aria-hidden>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function FloatingRummyReactions({
  reactions,
  players,
  selfId,
}: {
  reactions: ReactionRecvPayload[];
  players: Player[];
  selfId: string | null;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {reactions.map((r, i) => {
        const isSelf = r.fromPlayerId === selfId;
        const name = players.find((p) => p.id === r.fromPlayerId)?.name ?? "";
        const baseTop = isSelf ? 75 : 18;
        const drift = ((i % 3) - 1) * 10;
        return (
          <div
            key={r.id}
            className="absolute reaction-float"
            style={{
              left: `calc(50% + ${drift}vw)`,
              top: `${baseTop}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-5xl select-none drop-shadow-lg">{r.emoji}</div>
              <div
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "rgba(15,23,42,0.85)", color: "#fde68a" }}
              >
                {name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopStrip({
  gameLabel,
  roomCode,
  copiedFlash,
  onCopy,
  onLeave,
  onOpenMenu,
  hasUnreadChat,
  fullscreenSupported,
  fullscreenOn,
  onToggleFullscreen,
}: {
  gameLabel: string;
  roomCode?: string;
  copiedFlash: boolean;
  onCopy: () => void;
  onLeave?: () => void;
  onOpenMenu: () => void;
  fullscreenSupported: boolean;
  fullscreenOn: boolean;
  onToggleFullscreen: () => void;
  hasUnreadChat: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 flex-shrink-0">
      {/* Left — Leave (icon + text) */}
      {onLeave ? (
        <button
          onClick={onLeave}
          aria-label="Leave room"
          title="Leave room"
          className="flex items-center gap-1 mt-1 px-2 py-1 rounded-full bg-rose-700/90 hover:bg-rose-600 text-white text-[11px] sm:text-xs font-bold flex-shrink-0"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }}
        >
          {/* Inline SVG "log out" arrow — door icon was rendering as plain emoji */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 12l4-4-4-4" />
            <path d="M14 8H6" />
            <path d="M9 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h6" />
          </svg>
          Leave
        </button>
      ) : (
        <div className="w-7" />
      )}

      {/* Center — game type + room code + copy */}
      <button
        onClick={onCopy}
        disabled={!roomCode}
        aria-label={roomCode ? `Copy room code ${roomCode}` : "Room code"}
        title={roomCode ? "Tap to copy room code" : ""}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold tracking-wide truncate max-w-[70%] disabled:cursor-default"
        style={{
          background: "linear-gradient(180deg, #4A2C16 0%, #3a2010 100%)",
          border: "1px solid rgba(201,162,39,0.50)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          color: "#fde68a",
          height: 22,
        }}
      >
        <span className="text-[#C9A227] text-[9px]">🃏</span>
        <span className="truncate">{gameLabel}</span>
        {roomCode && (
          <>
            <span className="opacity-50">·</span>
            <span className="tabular-nums text-amber-200">#{roomCode}</span>
            <span className="opacity-80">{copiedFlash ? "✓" : "📋"}</span>
          </>
        )}
      </button>

      {/* Right — Fullscreen toggle + Hamburger. The fullscreen toggle is
          always visible (not buried in the menu) because players reach for
          it frequently — to swap orientation, to recover from an accidental
          ESC, or because their device decided to show the URL bar mid-game.
          Hidden on devices where the API isn't available (iPhone Safari). */}
      <div className="flex items-center gap-1.5">
        {fullscreenSupported && (
          <button
            onClick={onToggleFullscreen}
            aria-label={fullscreenOn ? "Exit fullscreen" : "Enter fullscreen"}
            aria-pressed={fullscreenOn}
            title={fullscreenOn ? "Exit fullscreen" : "Enter fullscreen"}
            className="w-7 h-7 mt-1 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/45 text-sm flex-shrink-0 text-[#fde68a] cursor-pointer transition-colors duration-200"
            style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }}
          >
            {fullscreenOn ? (
              <FsExitIcon className="w-3.5 h-3.5" />
            ) : (
              <FsEnterIcon className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          title="Menu"
          className="relative w-7 h-7 mt-1 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/45 text-sm flex-shrink-0 text-nostalgia-paper"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }}
        >
          ☰
          {hasUnreadChat && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{ background: "#ef4444", boxShadow: "0 0 0 1.5px #3a2010" }}
            />
          )}
        </button>
      </div>
    </div>
  );
}

function FsEnterIcon({ className }: { className?: string }) {
  // Four diagonal arrows pointing outward — the universal "go fullscreen" glyph.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </svg>
  );
}

function FsExitIcon({ className }: { className?: string }) {
  // Four diagonal arrows pointing inward — the universal "exit fullscreen" glyph.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 4v5H4" />
      <path d="M15 4v5h5" />
      <path d="M9 20v-5H4" />
      <path d="M15 20v-5h5" />
    </svg>
  );
}

function TurnTimer({ deadline, myTurn }: { deadline: number; myTurn: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, deadline - now);
  const seconds = Math.ceil(remaining / 1000);
  const isUrgent = remaining < 5000;
  const color = isUrgent ? "#ef4444" : myTurn ? "#fbbf24" : "#a7f3d0";
  return (
    <div className="flex items-center justify-center">
      <div
        className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold tracking-wider"
        style={{
          background: "rgba(0,0,0,0.45)",
          color,
          border: `1px solid ${color}`,
          boxShadow: isUrgent ? `0 0 12px ${color}` : undefined,
        }}
      >
        <span>⏱</span>
        <span className="tabular-nums">{seconds}s</span>
        {myTurn && <span>·  your turn</span>}
      </div>
    </div>
  );
}

function OpponentRow({
  state,
  players,
  selfId,
}: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
}) {
  const opponents = state.playerOrder.filter((id) => id !== selfId);
  // Recompute seconds-remaining at 250ms so the countdown ring updates smoothly.
  // The exact starting duration isn't on the public state (it lives on engine options),
  // so we use 30s as a visual approximation for the ring fill — the number shown is
  // exact regardless. Close enough for visual feedback; not used for any game logic.
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const turnTotalSec = 30;
  return (
    <div className="flex flex-nowrap justify-center items-end gap-2 sm:gap-3 flex-shrink-0 pt-1">
      {opponents.map((id) => {
        const isTurn = state.turnPlayerId === id;
        const isDropped = state.droppedPlayers.includes(id);
        const player = players.find((p) => p.id === id);
        const cumulative = state.cumulativeScores?.[id];
        const handSize = state.handSizes[id] ?? 0;
        return (
          // Wrapper has the tooltip so hovering still reveals the full player
          // name and hand size even though only the avatar is rendered.
          <div
            key={id}
            className="flex flex-col items-center flex-shrink-0"
            title={`${player?.name ?? "?"} · ${handSize} cards${isDropped ? " (out)" : ""}`}
          >
            <Avatar
              name={player?.name ?? "?"}
              size={36}
              countdown={isTurn && state.phase === "playing" ? { secondsLeft, totalSeconds: turnTotalSec } : undefined}
              scoreBadge={cumulative !== undefined ? cumulative : undefined}
              dimmed={isDropped}
            />
          </div>
        );
      })}
    </div>
  );
}

function PlayerStrip({
  state,
  selfId,
  nameOf,
  livePoints,
}: {
  state: RummyPlayerState;
  selfId: string | null;
  nameOf: (id: string) => string;
  livePoints: LivePoints;
}) {
  const myTurn = state.turnPlayerId === selfId;
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const turnTotalSec = 30;
  const myName = selfId ? nameOf(selfId) : "You";
  const cumulative = selfId ? state.cumulativeScores?.[selfId] : undefined;
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <Avatar
        name={myName}
        size={36}
        countdown={myTurn ? { secondsLeft, totalSeconds: turnTotalSec } : undefined}
        scoreBadge={cumulative !== undefined ? cumulative : undefined}
      />
      <span
        className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
          myTurn ? "bg-amber-500 text-slate-900" : "bg-black/60 text-nostalgia-paper"
        }`}
        style={{
          border: myTurn ? "1px solid #fcd34d" : "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {myName} (you)
        {myTurn && (
          <span className="ml-1 opacity-90">
            · {state.turnAction === "draw" ? "draw" : "discard"}
          </span>
        )}
      </span>
      <span
        className="px-1.5 py-0.5 rounded-full font-bold tabular-nums text-[11px]"
        style={{
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(251,191,36,0.4)",
          color: "#fcd34d",
        }}
        title="What you'd lose if caught right now"
      >
        ⚠ {livePoints.caughtNow}
      </span>
      {livePoints.protectedByPure && (
        <span className="text-emerald-300 text-[10px] uppercase tracking-wider">
          ✓ pure
        </span>
      )}
    </div>
  );
}

/**
 * Pulsing red screen-edge warning + corner countdown chip for the last
 * 10 s of the player's turn. Fires a haptic nudge at the moment the
 * warning appears so the player feels the urgency even if their eye
 * is elsewhere on the board.
 *
 * Renders nothing when:
 *   • It isn't the player's turn.
 *   • The deadline isn't set (between rounds, lobby, etc.).
 *   • More than 10 s remain.
 */
function RummyTimeWarning({
  deadline,
  active,
}: {
  deadline: number | null | undefined;
  active: boolean;
}) {
  const secondsLeft = useTurnSecondsLeft(deadline);
  const haptics = useHaptics();
  const warned = useRef(false);

  const showWarning = active && deadline != null && secondsLeft <= 10 && secondsLeft > 0;
  const critical = active && deadline != null && secondsLeft <= 5 && secondsLeft > 0;

  useEffect(() => {
    if (!active || deadline == null) {
      warned.current = false;
      return;
    }
    // One-shot nudge the moment we cross into the warning window.
    if (showWarning && !warned.current) {
      warned.current = true;
      haptics.subtle();
    }
    if (!showWarning) warned.current = false;
  }, [active, deadline, showWarning, haptics]);

  if (!showWarning) return null;

  const color = critical ? "#ef4444" : "#f59e0b";
  return (
    <>
      {/* Pulsing edge border — fixed so it stays on screen regardless of
          inner scroll, doesn't intercept taps, and stays above the felt
          but below modals (z-40). */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          boxShadow: `inset 0 0 0 4px ${color}, inset 0 0 32px ${color}88`,
          animation: "rummy-time-pulse 900ms ease-in-out infinite",
        }}
      />
      {/* Corner countdown chip — high contrast so it reads at a glance. */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top, 0))",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <div
          className="px-3 py-1.5 rounded-full text-sm font-extrabold tabular-nums shadow-2xl flex items-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${color}, #7f1d1d)`,
            color: "#fff7ed",
            border: "2px solid rgba(255,255,255,0.6)",
            boxShadow: `0 6px 20px ${color}aa, 0 0 0 1px rgba(0,0,0,0.4)`,
            animation: "rummy-time-pulse 900ms ease-in-out infinite",
          }}
        >
          <span>⏱</span>
          <span>{RUMMY_COPY.idleWarning(secondsLeft)}</span>
        </div>
      </div>
    </>
  );
}

/**
 * Returns whole seconds remaining on the current turn. Recomputes 4x per second
 * so the countdown ring + number stay live without re-rendering the whole board.
 */
function useTurnSecondsLeft(deadline: number | null | undefined): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (deadline == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (deadline == null) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function CenterDeckArea({
  state,
  canDraw,
  canDiscard,
  drawFromClosed,
  drawFromOpen,
  draggingIds,
  discardPulseKey,
}: {
  state: RummyPlayerState;
  canDraw: boolean;
  canDiscard: boolean;
  drawFromClosed: () => void;
  drawFromOpen: () => void;
  draggingIds: string[];
  discardPulseKey: number;
}) {
  const isDragging = draggingIds.length > 0;
  // Drop targets are resolved by the pointer-drag hook via elementFromPoint;
  // these flags are now purely visual (highlight while a drag is in flight).
  const allowOpenDrop = isDragging && canDiscard;
  const allowFinishDrop = isDragging && canDiscard;
  // A printed ("special") joker on the open pile is only liftable on the
  // round's first draw (server-authoritative via openJokerDrawable); after
  // that it's locked there per the house rule.
  const openJokerLocked =
    state.topOfOpenPile?.isPrintedJoker === true && !state.openJokerDrawable;
  return (
    <div
      className="rounded-lg p-1 sm:p-1.5 flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap flex-shrink-0"
      style={{
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Wild joker */}
      <div className="flex flex-col items-center gap-1">
        <PlayingCard card={state.wildJoker} isWildJoker />
        <div className="text-[9px] uppercase tracking-wider text-amber-300 font-bold leading-tight">
          Wild
        </div>
      </div>

      {/* Closed deck */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={drawFromClosed}
          disabled={!canDraw}
          className={`relative transition ${
            canDraw ? "hover:-translate-y-2 hover:scale-105 cursor-pointer" : "opacity-80 cursor-not-allowed"
          }`}
          aria-label="Draw from closed deck"
        >
          <FaceDownCard />
          {canDraw && (
            <div
              className="absolute -inset-1 rounded-md pointer-events-none"
              style={{
                background: "transparent",
                boxShadow: "0 0 0 2px #fbbf24, 0 0 16px rgba(251,191,36,0.6)",
                animation: "rummy-glow 1.4s ease-in-out infinite",
              }}
            />
          )}
        </button>
        <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold leading-tight">
          Closed · {state.closedDeckCount}
        </div>
      </div>

      {/* Open pile — clickable to draw, droppable to discard */}
      <div
        data-rummy-drop={allowOpenDrop ? "openpile" : undefined}
        className="flex flex-col items-center gap-1"
      >
        {state.topOfOpenPile ? (
          <button
            onClick={drawFromOpen}
            disabled={!canDraw || openJokerLocked}
            className={`relative transition ${
              canDraw && !openJokerLocked
                ? "hover:-translate-y-2 hover:scale-105 cursor-pointer"
                : "cursor-default"
            } ${allowOpenDrop ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-emerald-950 rounded-md" : ""}`}
            aria-label={
              openJokerLocked
                ? "Printed joker — not drawable from open pile"
                : "Draw from open pile"
            }
            title={
              openJokerLocked
                ? "Printed jokers can't be drawn from the discard pile"
                : undefined
            }
          >
            <div key={discardPulseKey} className="rummy-discard-pulse rounded-md">
              <PlayingCard
                card={state.topOfOpenPile}
                isWildJoker={state.topOfOpenPile.rank === state.wildJoker.rank}
              />
            </div>
            {openJokerLocked && (
              <span
                className="absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider z-10"
                style={{
                  background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                  color: "#fff",
                  border: "1px solid #fee2e2",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                }}
                aria-hidden
              >
                Locked
              </span>
            )}
          </button>
        ) : (
          <div
            className={`w-10 h-14 sm:w-12 sm:h-16 rounded-md flex items-center justify-center text-[10px] uppercase text-emerald-300/70 font-bold ${
              allowOpenDrop ? "ring-2 ring-amber-400" : ""
            }`}
            style={{ background: "rgba(0,0,0,0.25)", border: "2px dashed rgba(16,185,129,0.4)" }}
          >
            Open
          </div>
        )}
        <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold leading-tight">
          {allowOpenDrop ? "Drop to discard" : "Open"}
        </div>
      </div>

      {/* Finish slot — droppable to declare with that card as the discard */}
      <div
        data-rummy-drop={allowFinishDrop ? "finishslot" : undefined}
        className="flex flex-col items-center gap-1"
      >
        <div className={allowFinishDrop ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-emerald-950 rounded-md" : ""}>
          <FinishSlot />
        </div>
        <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold leading-tight">
          {allowFinishDrop ? "Drop to finish" : "Final"}
        </div>
      </div>
    </div>
  );
}

function HandArea({
  layout,
  byId,
  wildRank,
  selected,
  draggingIds,
  dragOverTarget,
  meldByGroupId,
  freshCardId,
  onCardClick,
  onUngroup,
  onDragBegin,
  onDragHover,
  onDragRelease,
}: {
  layout: Layout;
  byId: Map<string, Card>;
  wildRank: string;
  selected: Set<string>;
  draggingIds: string[];
  dragOverTarget: string | null;
  meldByGroupId: Record<string, MeldClassification>;
  freshCardId: string | null;
  onCardClick: (id: string) => void;
  onUngroup: (groupId: string) => void;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
}) {
  const dragging = draggingIds.length > 0;
  return (
    <div
      className="rounded-xl px-1.5 sm:px-2 py-1.5 flex flex-col flex-1 min-h-[96px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.12))",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div className="flex flex-nowrap gap-1 sm:gap-1.5 items-start flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        {layout.groups.map((g, idx) => (
          <GroupLane
            key={g.id}
            laneId={g.id}
            label={`Meld ${idx + 1}`}
            cardIds={g.cardIds}
            classification={meldByGroupId[g.id]}
            byId={byId}
            wildRank={wildRank}
            selected={selected}
            draggingIds={draggingIds}
            dragOverTarget={dragOverTarget}
            freshCardId={freshCardId}
            onCardClick={onCardClick}
            onUngroup={() => onUngroup(g.id)}
            onDragBegin={onDragBegin}
            onDragHover={onDragHover}
            onDragRelease={onDragRelease}
          />
        ))}
        <UngroupedLane
          cardIds={layout.ungrouped}
          byId={byId}
          wildRank={wildRank}
          selected={selected}
          draggingIds={draggingIds}
          dragOverTarget={dragOverTarget}
          freshCardId={freshCardId}
          onCardClick={onCardClick}
          onDragBegin={onDragBegin}
          onDragHover={onDragHover}
          onDragRelease={onDragRelease}
        />
        {dragging && (
          <NewMeldZone
            active={dragOverTarget === "new"}
            atCap={layout.groups.length >= MAX_GROUPS}
          />
        )}
      </div>
    </div>
  );
}

function NewMeldZone({ active, atCap }: { active: boolean; atCap: boolean }) {
  // At the 7-group cap the zone stays visible but greys out and stops
  // signalling drop affordance, so the player sees the limit instead of
  // bouncing off a missing target.
  return (
    <div
      data-rummy-drop={atCap ? undefined : "new"}
      className="rounded-lg flex flex-col items-center justify-center font-extrabold text-[10px] px-2 py-2 self-stretch min-w-[60px] flex-shrink-0 transition"
      style={{
        background: atCap
          ? "rgba(120,120,120,0.18)"
          : active ? "rgba(16,185,129,0.45)" : "rgba(16,185,129,0.15)",
        border: atCap
          ? "2px dashed rgba(180,180,180,0.55)"
          : active ? "2px dashed #34d399" : "2px dashed rgba(16,185,129,0.5)",
        boxShadow: !atCap && active ? "0 0 18px rgba(52,211,153,0.6)" : undefined,
        color: atCap ? "rgba(220,220,220,0.6)" : "#d1fae5",
      }}
    >
      <span className="text-2xl mb-1">＋</span>
      {atCap ? "MAX 7" : "NEW MELD"}
    </div>
  );
}

function GroupLane({
  laneId,
  cardIds,
  classification,
  byId,
  wildRank,
  selected,
  draggingIds,
  dragOverTarget,
  freshCardId,
  onCardClick,
  onUngroup,
  onDragBegin,
  onDragHover,
  onDragRelease,
}: {
  laneId: string;
  label: string;
  cardIds: string[];
  classification?: MeldClassification;
  byId: Map<string, Card>;
  wildRank: string;
  selected: Set<string>;
  draggingIds: string[];
  dragOverTarget: string | null;
  freshCardId: string | null;
  onCardClick: (id: string) => void;
  onUngroup: () => void;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
}) {
  const target: DropTarget = `group:${laneId}`;
  const isOver = dragOverTarget === target;
  const classColor = classification?.color ?? "#f97316";
  const structurallyValid = !!classification?.valid;
  const counts = !!classification?.counts;
  // Per-lane card-point total (jokers count 0) so we can show "X Points".
  const laneCards = cardIds.map((cid) => byId.get(cid)).filter(Boolean) as Card[];
  const laneTotal = sumCardPoints(laneCards, wildRank as Rank);
  // Three badge states:
  //   counts        → ✓ green  "Label (0)"  credited toward the show
  //   valid !counts → ⚠ amber  "Label"      a real meld, no life yet
  //   neither       → ✕ red    "N Points"   not a meld
  const badgeIcon = counts ? "✓" : structurallyValid ? "⚠" : "✕";
  const badgeText = counts
    ? `${classification?.label.replace(/\s*✓\s*$/, "")} (0)`
    : structurallyValid
    ? `${classification?.label}`
    : `${laneTotal} Points`;
  const badgeFg = counts ? "#34d399" : structurallyValid ? "#fcd34d" : "#fca5a5";
  const badgeBorder = counts ? "#10b981" : structurallyValid ? "#f59e0b" : "#dc2626";
  return (
    <div
      data-rummy-drop={target}
      className={`flex flex-col items-center gap-0.5 transition flex-shrink-0 ${counts ? "rummy-zone-valid" : "rummy-zone-invalid"}`}
      style={{
        background: isOver ? "rgba(252,211,77,0.10)" : "transparent",
        borderRadius: 10,
        padding: 3,
        boxShadow: isOver ? "0 0 14px rgba(252,211,77,0.55)" : undefined,
      }}
    >
      <div className="flex items-center gap-0.5">
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 whitespace-nowrap"
          style={{
            background: "rgba(0,0,0,0.55)",
            color: badgeFg,
            border: `1px solid ${badgeBorder}`,
            boxShadow: counts ? `0 0 6px ${classColor}66` : undefined,
          }}
        >
          <span>{badgeIcon}</span>
          {badgeText}
        </span>
        <button
          onClick={onUngroup}
          className="text-[10px] text-rose-300 hover:text-rose-200 font-bold leading-none px-0.5"
          title="Break this group"
        >
          ✕
        </button>
      </div>
      <div className="flex">
        {cardIds.map((cid, idx) => {
          const card = byId.get(cid);
          if (!card) return null;
          return (
            <DraggableHandCard
              key={cid}
              cardId={cid}
              card={card}
              wildRank={wildRank}
              isSelected={selected.has(cid)}
              isDragged={draggingIds.includes(cid)}
              isFresh={cid === freshCardId}
              marginLeft={idx === 0 ? 0 : -18}
              zIndex={idx}
              selected={selected}
              onTap={onCardClick}
              onDragBegin={onDragBegin}
              onDragHover={onDragHover}
              onDragRelease={onDragRelease}
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
  dragOverTarget,
  freshCardId,
  onCardClick,
  onDragBegin,
  onDragHover,
  onDragRelease,
}: {
  cardIds: string[];
  byId: Map<string, Card>;
  wildRank: string;
  selected: Set<string>;
  draggingIds: string[];
  dragOverTarget: string | null;
  freshCardId: string | null;
  onCardClick: (id: string) => void;
  onDragBegin: (ids: string[]) => void;
  onDragHover: (target: DropTarget | null) => void;
  onDragRelease: (target: DropTarget | null) => void;
}) {
  const isOver = dragOverTarget === "ungrouped";
  return (
    <div
      data-rummy-drop="ungrouped"
      className="rounded-xl p-1.5 pb-1 flex flex-col gap-0.5 flex-shrink-0 transition"
      style={{
        background: isOver ? "rgba(252,211,77,0.12)" : "rgba(0,0,0,0.12)",
        border: isOver ? "1.5px dashed #fcd34d" : "1.5px dashed rgba(255,255,255,0.18)",
        boxShadow: isOver ? "0 0 14px rgba(252,211,77,0.4)" : undefined,
        minWidth: 0,
      }}
    >
      <div className="px-0.5 text-[9px] uppercase tracking-wider font-extrabold text-amber-200">
        Ungrouped ({cardIds.length})
      </div>
      <div className="flex relative">
        {cardIds.map((cid, idx) => {
          const card = byId.get(cid);
          if (!card) return null;
          const draggingThis = draggingIds.includes(cid);
          // Only show the "before:<cid>" slot when an actual drag is in
          // progress — otherwise the indicator clutters the table at rest.
          // The slot itself is a thin (~16px) absolute strip on the card's
          // left edge so it doesn't disrupt the existing -18px overlap.
          const showSlot = draggingIds.length > 0 && !draggingThis;
          const isSlotHover = dragOverTarget === `before:${cid}`;
          return (
            <div key={cid} className="relative flex-shrink-0">
              {showSlot && (
                <div
                  data-rummy-drop={`before:${cid}`}
                  aria-hidden
                  className="absolute -top-1 bottom-0 z-40 transition-all duration-100"
                  style={{
                    left: idx === 0 ? -2 : -20,
                    width: 22,
                    background: isSlotHover
                      ? "linear-gradient(180deg, rgba(252,211,77,0.85), rgba(245,158,11,0.5))"
                      : "transparent",
                    borderLeft: isSlotHover
                      ? "3px solid #fcd34d"
                      : "3px solid transparent",
                    borderRadius: 3,
                    boxShadow: isSlotHover
                      ? "0 0 14px rgba(252,211,77,0.7)"
                      : undefined,
                  }}
                />
              )}
              <DraggableHandCard
                cardId={cid}
                card={card}
                wildRank={wildRank}
                isSelected={selected.has(cid)}
                isDragged={draggingThis}
                isFresh={cid === freshCardId}
                marginLeft={idx === 0 ? 0 : -18}
                zIndex={idx}
                selected={selected}
                onTap={onCardClick}
                onDragBegin={onDragBegin}
                onDragHover={onDragHover}
                onDragRelease={onDragRelease}
              />
            </div>
          );
        })}
        {/* Drop-at-end strip — appears after the last card so a user can drop
            a dragged card at the far right of ungrouped without aiming at
            the lane background (which would still work, but the dedicated
            strip gives them clear visual feedback). */}
        {cardIds.length > 0 && draggingIds.length > 0 && (
          <div
            data-rummy-drop="ungroupedEnd"
            aria-hidden
            className="ml-1 self-stretch transition-all duration-100"
            style={{
              width: 22,
              borderLeft:
                dragOverTarget === "ungroupedEnd"
                  ? "3px solid #fcd34d"
                  : "3px dashed rgba(255,255,255,0.18)",
              borderRadius: 3,
              background:
                dragOverTarget === "ungroupedEnd"
                  ? "linear-gradient(180deg, rgba(252,211,77,0.85), rgba(245,158,11,0.5))"
                  : "transparent",
              boxShadow:
                dragOverTarget === "ungroupedEnd"
                  ? "0 0 14px rgba(252,211,77,0.7)"
                  : undefined,
            }}
          />
        )}
        {cardIds.length === 0 && (
          <div className="text-[11px] italic text-emerald-300/60 px-1 py-2">
            All cards grouped.
          </div>
        )}
      </div>
    </div>
  );
}

function PointsPanel({ points }: { points: LivePoints }) {
  // Risk tier coloring for the headline number
  const risk = points.caughtNow;
  const riskColor =
    risk === 0 ? "#10b981"
    : risk <= points.dropNow ? "#22c55e"
    : risk <= 40 ? "#f59e0b"
    : risk < 70 ? "#f97316"
    : "#ef4444";
  const dropAdvantage = risk - points.dropNow;
  // Negative dropAdvantage → dropping costs MORE than getting caught (don't drop).
  // Positive dropAdvantage → dropping is cheaper than getting caught.
  const shouldConsiderDrop = dropAdvantage > 0;

  return (
    <div
      className="rounded-lg p-3 flex flex-wrap items-center gap-4 transition"
      style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.55) 0%, rgba(2,44,34,0.55) 100%)",
        border: `1px solid ${riskColor}55`,
        boxShadow: `inset 0 0 0 1px ${riskColor}22, 0 0 14px ${riskColor}22`,
      }}
    >
      {/* Headline number */}
      <div className="flex items-baseline gap-2">
        <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-300">
          Risk if caught
        </div>
        <div
          className="text-3xl font-extrabold tabular-nums leading-none transition-colors"
          style={{ color: riskColor, textShadow: `0 0 14px ${riskColor}88` }}
        >
          {risk}
        </div>
        <div className="text-xs text-slate-400 tabular-nums">/ {HAND_CAP_DISPLAY}</div>
      </div>

      <div className="flex-1 min-w-[6rem]" />

      {/* Comparison chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <CostChip label="Drop now" value={`−${points.dropNow}`} fg="#fcd34d" bg="rgba(146,64,14,0.45)" border="#f59e0b" />
        <CostChip label="Finish" value="0" fg="#a7f3d0" bg="rgba(6,95,70,0.5)" border="#10b981" highlight />
      </div>

      {/* Subtext: protection status / hint */}
      <div className="w-full flex items-center justify-between flex-wrap gap-2 text-[11px]">
        {points.protectedByPure ? (
          <span className="text-[#C9A227]">
            ✓ Pure sequence protects {points.unmeldedCount > 0
              ? `${points.unmeldedCount} card${points.unmeldedCount === 1 ? "" : "s"} unmelded`
              : "your full hand"}
          </span>
        ) : (
          <span className="text-amber-300">
            ⚠ No pure sequence yet — all {points.handTotal} points are exposed if caught
          </span>
        )}
        {shouldConsiderDrop && (
          <span className="text-rose-300 font-bold">
            🚨 Dropping saves {dropAdvantage} pts
          </span>
        )}
        {!shouldConsiderDrop && risk > 0 && risk < points.dropNow && (
          <span className="text-[#C9A227]">
            👍 Stay in — dropping would cost {points.dropNow - risk} more
          </span>
        )}
      </div>
    </div>
  );
}

function CostChip({
  label,
  value,
  fg,
  bg,
  border,
  highlight = false,
}: {
  label: string;
  value: string;
  fg: string;
  bg: string;
  border: string;
  highlight?: boolean;
}) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider font-extrabold"
      style={{
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        boxShadow: highlight ? `0 0 10px ${border}66` : undefined,
      }}
    >
      <span>{label}</span>
      <span className="text-sm tabular-nums leading-none">{value}</span>
    </span>
  );
}

const HAND_CAP_DISPLAY = 80;

function FinishReadinessBanner({
  readiness,
  canFinish,
}: {
  readiness: ReturnType<typeof evaluateFinishReadiness>;
  canFinish: boolean;
}) {
  if (readiness.ready && canFinish) {
    return (
      <div
        className="rounded-full px-2.5 py-1 text-center text-[11px] font-extrabold tracking-wider flex-shrink-0 whitespace-nowrap"
        style={{
          background: "linear-gradient(180deg, #059669 0%, #064e3b 100%)",
          color: "#ecfdf5",
          border: "1px solid #34d399",
          boxShadow: "0 0 10px rgba(52,211,153,0.5)",
        }}
      >
        ✓ READY — TAP FINISH
      </div>
    );
  }
  // Inline chip row — no "FINISH CHECKLIST" label since context is clear.
  const chips: { label: string; ok: boolean }[] = [
    { label: `Pure ×${readiness.pureCount}`, ok: readiness.pureCount >= 1 },
    { label: `Seq ×${readiness.sequenceCount}/2`, ok: readiness.sequenceCount >= 2 },
    { label: `Valid ×${readiness.validGroups}`, ok: readiness.invalidGroups === 0 && readiness.validGroups > 0 },
  ];
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="px-1.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider whitespace-nowrap"
          style={{
            background: chip.ok ? "#065f46" : "rgba(120,53,15,0.45)",
            color: chip.ok ? "#a7f3d0" : "#fcd34d",
            border: `1px solid ${chip.ok ? "#10b981" : "#f59e0b"}`,
          }}
        >
          {chip.ok ? "✓" : "·"} {chip.label}
        </span>
      ))}
    </div>
  );
}

function ActionBar({
  canGroup,
  canDiscard,
  canDrop,
  canFinish,
  canAutoArrange,
  canSort,
  iDropped,
  onGroup,
  onDiscard,
  onDropClick,
  onFinish,
  onAutoArrange,
  onSort,
}: {
  canGroup: boolean;
  canDiscard: boolean;
  canDrop: boolean;
  canFinish: boolean;
  canAutoArrange: boolean;
  canSort: boolean;
  iDropped: boolean;
  onGroup: () => void;
  onDiscard: () => void;
  onDropClick: () => void;
  onFinish: () => void;
  onAutoArrange: () => void;
  onSort: () => void;
}) {
  if (iDropped) return null;
  return (
    <div className="flex justify-center items-stretch flex-wrap gap-1 sm:gap-2 pt-1 w-full">
      <ActionButton
        label="DROP"
        emoji="⏏"
        color="#dc2626"
        enabled={canDrop}
        onClick={onDropClick}
      />
      <ActionButton
        label="SORT"
        emoji="↕"
        color="#0ea5e9"
        enabled={canSort}
        onClick={onSort}
      />
      <ActionButton
        label="AUTO"
        emoji="✨"
        color="#0891b2"
        enabled={canAutoArrange}
        onClick={onAutoArrange}
      />
      <ActionButton
        label="GROUP"
        emoji="🃏"
        color="#16a34a"
        enabled={canGroup}
        onClick={onGroup}
      />
      <ActionButton
        label="DISCARD"
        emoji="🗑"
        color="#f59e0b"
        enabled={canDiscard}
        onClick={onDiscard}
      />
      {/* FINISH stays in the row whether or not it's actionable — the disabled
          state telegraphs "this is the path to winning" without making the bar
          width jump every time the readiness flag flips. */}
      <ActionButton
        label="FINISH"
        emoji="🏆"
        color="#8b5cf6"
        enabled={canFinish}
        onClick={onFinish}
      />
    </div>
  );
}

function ActionButton({
  label,
  emoji,
  color,
  enabled,
  onClick,
  big = false,
}: {
  label: string;
  emoji: string;
  color: string;
  enabled: boolean;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`px-1.5 sm:px-3 ${big ? "py-1.5 sm:py-2 text-xs sm:text-sm" : "py-1 sm:py-1.5 text-[10px] sm:text-xs"} rounded-md font-extrabold uppercase tracking-wider transition flex items-center gap-1 select-none whitespace-nowrap flex-shrink-0`}
      style={{
        background: enabled
          ? `linear-gradient(180deg, ${color} 0%, ${shade(color, -0.25)} 100%)`
          : "linear-gradient(180deg, #475569 0%, #334155 100%)",
        color: enabled ? "#fff" : "#94a3b8",
        boxShadow: enabled
          ? `0 2px 0 ${shade(color, -0.45)}, 0 3px 8px rgba(0,0,0,0.35)`
          : "0 1px 0 #1e293b",
        opacity: enabled ? 1 : 0.65,
        cursor: enabled ? "pointer" : "not-allowed",
      }}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

function shade(hex: string, amt: number): string {
  // amt in [-1..1]. Negative darkens.
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  const adj = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `#${[adj(r), adj(g), adj(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function DropConfirm({
  onCancel,
  onConfirm,
  isFirstDrop,
  handPts,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  isFirstDrop: boolean;
  handPts: number;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        className="rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
        style={{ background: "linear-gradient(180deg, #6D4323 0%, #4A2C16 100%)", border: "2px solid #9C7A3C" }}
      >
        <div className="text-lg font-bold text-nostalgia-paper">Drop out of this round?</div>
        <div className="text-sm text-nostalgia-paper/75">
          {isFirstDrop ? (
            <>You'll take a <span className="font-bold text-rose-300">20-point first-drop penalty</span> and stop playing this round.</>
          ) : (
            <>You'll be scored on your current hand (~<span className="font-bold text-rose-300">{handPts} pts</span>) and stop playing this round.</>
          )}
          {" "}Game continues for everyone else.
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="bg-black/30 hover:bg-black/45 text-nostalgia-paper rounded px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-rose-700 hover:bg-rose-600 text-white rounded px-4 py-2 text-sm font-extrabold"
          >
            DROP
          </button>
        </div>
      </div>
    </div>
  );
}

function PoolStandings({
  state,
  nameOf,
  selfId,
}: {
  state: RummyPlayerState;
  nameOf: (id: string) => string;
  selfId: string | null;
}) {
  const target = state.poolTarget ?? 0;
  return (
    <div
      className="rounded-lg p-2 space-y-1"
      style={{
        background: "rgba(0,0,0,0.32)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between px-1">
        <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-amber-200">
          🏆 Pool Standings · Round {state.roundNumber}
        </div>
        <div className="text-[10px] text-[#E0CC9C]/70">
          Eliminate at {target}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
        {state.playerOrder.map((id) => {
          const score = state.cumulativeScores[id] ?? 0;
          const isOut = state.eliminatedInMatch.includes(id);
          const pct = Math.min(100, (score / target) * 100);
          return (
            <div
              key={id}
              className={`rounded p-1.5 text-xs ${isOut ? "opacity-50" : ""}`}
              style={{
                background: isOut ? "rgba(127,29,29,0.45)" : "rgba(46,36,25,0.65)",
                border: `1px solid ${isOut ? "#7f1d1d" : "rgba(201,162,39,0.20)"}`,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-nostalgia-paper truncate">
                  {nameOf(id)}{id === selfId && " (you)"}
                </span>
                <span className="tabular-nums font-extrabold text-amber-200">
                  {score}
                </span>
              </div>
              <div className="h-1 rounded mt-1 overflow-hidden bg-[#2E2419]/60">
                <div
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    background: isOut ? "#dc2626" : pct > 75 ? "#f59e0b" : "#10b981",
                  }}
                />
              </div>
              {isOut && (
                <div className="text-[9px] text-rose-200 mt-0.5 font-bold">ELIMINATED</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PoolBetweenRounds({
  state,
  nameOf,
  selfId,
}: {
  state: RummyPlayerState;
  nameOf: (id: string) => string;
  selfId: string | null;
}) {
  const iEliminated = !!selfId && state.eliminatedInMatch.includes(selfId);
  // Distant kettle between rounds — fires once per round-complete screen,
  // not on every re-render (nostalgia-brief.md "Ritual": the quiet moment
  // between hands, not another fanfare on top of the round's win sound).
  useEffect(() => {
    rummySfx.kettle();
  }, []);
  function nextRound() {
    getSocket().emit("game:move", { type: "newRound" });
  }
  return (
    <div className="rounded-xl p-4 space-y-3 border border-[#9C7A3C]" style={{ background: "linear-gradient(160deg, #6D4323 0%, #4A2C16 100%)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-lg font-extrabold text-amber-200">
          🎴 {RUMMY_COPY.roundComplete(state.roundNumber)}
        </div>
        <div className="text-xs text-nostalgia-paper/60">
          Next: Round {state.roundNumber + 1} · target {state.poolTarget}
        </div>
      </div>

      <table className="text-sm w-full">
        <thead>
          <tr className="text-nostalgia-paper/55">
            <th className="text-left py-1">Player</th>
            <th className="text-right">This round</th>
            <th className="text-right">Total</th>
            <th className="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {state.playerOrder.map((id) => {
            const roundPts = state.scores?.[id] ?? 0;
            const cum = state.cumulativeScores[id] ?? 0;
            const isOut = state.eliminatedInMatch.includes(id);
            const isRoundWinner = id === state.winnerId;
            return (
              <tr
                key={id}
                className={
                  isRoundWinner
                    ? "text-amber-300 font-bold"
                    : isOut
                    ? "text-nostalgia-paper/40 line-through"
                    : "text-nostalgia-paper"
                }
              >
                <td className="py-0.5">
                  {nameOf(id)}
                  {state.droppedPlayers.includes(id) && (
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase"
                      style={{
                        background: "rgba(239,68,68,0.18)",
                        border: "1px solid rgba(239,68,68,0.45)",
                        color: "#f87171",
                      }}
                    >
                      ⏏ Dropped
                    </span>
                  )}
                </td>
                <td className="text-right tabular-nums">{roundPts}</td>
                <td className="text-right tabular-nums">{cum}</td>
                <td className="text-center text-[10px]">
                  {isRoundWinner ? "🏆 won" : isOut ? "OUT" : "alive"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!iEliminated && (
        <button
          onClick={nextRound}
          className="w-full bg-nostalgia-brass hover:brightness-110 text-[#2E2419] font-extrabold rounded-lg py-2 tracking-wider uppercase"
        >
          Deal Round {state.roundNumber + 1}
        </button>
      )}
      {iEliminated && (
        <div className="text-center text-rose-300 text-sm font-bold">
          You're eliminated from the pool. Waiting for the others to finish…
        </div>
      )}
    </div>
  );
}

function MatchOverCard({
  state,
  nameOf,
}: {
  state: RummyPlayerState;
  nameOf: (id: string) => string;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center space-y-2"
      style={{
        background: "linear-gradient(135deg, #b45309 0%, #422006 100%)",
        border: "2px solid #fbbf24",
        boxShadow: "0 0 40px rgba(251,191,36,0.5)",
      }}
    >
      <div className="text-4xl">🏆</div>
      <div className="text-xl font-extrabold text-amber-100">
        {state.matchWinnerId ? `${nameOf(state.matchWinnerId)} wins the pool!` : "Match over"}
      </div>
      <table className="text-sm w-full mt-2">
        <thead>
          <tr className="text-amber-200/70">
            <th className="text-left py-1">Final Standings</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {[...state.playerOrder]
            .sort((a, b) => (state.cumulativeScores[a] ?? 0) - (state.cumulativeScores[b] ?? 0))
            .map((id) => {
              const cum = state.cumulativeScores[id] ?? 0;
              const isWinner = id === state.matchWinnerId;
              return (
                <tr
                  key={id}
                  className={isWinner ? "text-amber-200 font-extrabold" : "text-amber-100/80"}
                >
                  <td className="py-0.5">
                    {isWinner && "🏆 "}{nameOf(id)}
                  </td>
                  <td className="text-right tabular-nums">{cum}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}


function EndGameCard({
  state,
  nameOf,
}: {
  state: RummyPlayerState;
  nameOf: (id: string) => string;
}) {
  // Chips-style display: winner gets +sum(others' points), losers show -theirOwnPoints.
  // This converts the engine's raw "hand value" scores into a head-to-head pot
  // transfer, which is how players intuit winning a points-rummy round.
  const winnerId = state.winnerId ?? null;
  const lossPerPlayer = (id: string) =>
    Math.max(0, state.scores?.[id] ?? 0); // never negative; defensive against engine quirks
  const winnerPot = winnerId
    ? state.playerOrder.reduce(
        (sum, id) => (id === winnerId ? sum : sum + lossPerPlayer(id)),
        0,
      )
    : 0;
  return (
    <div className="rounded-xl p-4 space-y-3 border border-nostalgia-brass shadow-2xl" style={{ background: "linear-gradient(160deg, #6D4323 0%, #4A2C16 100%)" }}>
      <div className="text-lg font-bold">
        {state.invalidDeclareBy ? (
          <>❌ <span className="text-rose-300">{nameOf(state.invalidDeclareBy)}</span> made an invalid declaration</>
        ) : winnerId ? (
          <>🏆 <span className="text-amber-300">{nameOf(winnerId)}</span> wins this round!</>
        ) : (
          <>Round ended.</>
        )}
      </div>
      {state.scores && (
        <table className="text-sm w-full">
          <thead>
            <tr className="text-nostalgia-paper/55 border-b border-nostalgia-paper-edge/40">
              <th className="text-left py-1">Player</th>
              <th className="text-right py-1">Points</th>
            </tr>
          </thead>
          <tbody>
            {state.playerOrder.map((id) => {
              const isWinner = id === winnerId;
              const points = isWinner ? winnerPot : -lossPerPlayer(id);
              return (
                <tr
                  key={id}
                  className={`${isWinner ? "text-amber-300 font-bold" : "text-nostalgia-paper"} border-b border-nostalgia-paper-edge/30 last:border-0`}
                >
                  <td className="py-1.5">
                    {nameOf(id)}
                    {isWinner && (
                      <span
                        className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider align-middle"
                        style={{
                          background: "linear-gradient(135deg, #fbbf24, #d97706)",
                          color: "#1f2937",
                          boxShadow: "0 0 8px rgba(251,191,36,0.4)",
                        }}
                        title="Round winner"
                      >
                        🏆 Winner
                      </span>
                    )}
                    {state.droppedPlayers.includes(id) && !isWinner && (
                      <span
                        className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider align-middle"
                        style={{
                          background: "rgba(239,68,68,0.18)",
                          border: "1px solid rgba(239,68,68,0.45)",
                          color: "#f87171",
                        }}
                      >
                        ⏏ Dropped
                      </span>
                    )}
                  </td>
                  <td className="text-right py-1.5 tabular-nums">
                    <span
                      className={isWinner ? "text-[#C9A227]" : "text-rose-300"}
                    >
                      {isWinner ? `+${points}` : points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Full-screen victory celebration shown 30s after the game ends.
 *
 * Drop the artwork at `client/public/rummy-victory.png` and it picks it up
 * automatically. If the file is missing, the overlay falls back to a clean
 * gradient panel + title so the screen never looks broken — only the
 * artwork is replaced.
 *
 * Sits at z-[120] (above the existing result modals at ~z-50) so once it
 * appears, it owns the screen until the player taps "Go to Lobby".
 */
function RummyCelebrationOverlay({ onLeave }: { onLeave: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
      className="fixed inset-0 z-[120] flex items-center justify-center
                 bg-black/90 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-[1100px] aspect-[3/2] max-h-[88vh]
                      rounded-2xl overflow-hidden shadow-2xl">
        {!imageFailed ? (
          <img
            src="/rummy-victory.png"
            alt="Rummy Bhalyam victory celebration"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageFailed(true)}
            decoding="async"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, #7b1f1f 0%, #3a0a0a 70%, #1c0303 100%)",
            }}
          >
            <div className="font-display font-black text-[64px] sm:text-[96px] leading-none text-amber-300 drop-shadow-lg">
              RUMMY
            </div>
            <div className="font-display italic text-[28px] sm:text-[40px] text-amber-200 mt-2">
              Bhalyam!
            </div>
            <p className="text-amber-100/80 text-sm mt-4 max-w-md">
              Add <span className="font-mono">/rummy-victory.png</span> to
              your <span className="font-mono">public/</span> folder to
              replace this placeholder with the celebration artwork.
            </p>
          </div>
        )}

        {/* Bottom-center CTA — sits on a darkened gradient strip so it
            stays legible regardless of the artwork behind it. */}
        <div
          className="absolute inset-x-0 bottom-0 pt-16 pb-6 flex items-end justify-center"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)",
          }}
        >
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-2.5 rounded-pill
                       bg-amber-400 hover:bg-amber-300 active:translate-y-px
                       text-zinc-900 font-display font-black text-[16px] sm:text-[18px]
                       px-7 sm:px-8 py-3 sm:py-3.5
                       shadow-[0_6px_18px_-4px_rgba(0,0,0,0.55)]
                       ring-2 ring-amber-200/60 ring-offset-2 ring-offset-black/40
                       transition-all duration-150"
          >
            <span aria-hidden>🏠</span>
            Go to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Two-phase Rummy opening sequence.
 *
 * Stage "shuffle" (5 s):
 *   The table is visible underneath, dimmed. Two stacked face-down packs
 *   riffle across each other in the centre with an exaggerated motion so
 *   the player can see "the dealer is shuffling". A gold pill labels the
 *   phase as "Shuffling deck…".
 *
 * Stage "deal" (3 s):
 *   The riffle stops, the centre deck stays in place, and 13 face-down
 *   cards fly outward from the centre toward player seats with a staggered
 *   220 ms cadence so the deal reads as "to each player". Banner switches
 *   to "Dealing 13 cards…". The whole overlay quietly fades in the last
 *   600 ms so the game board takes over without a jolt.
 *
 * Driven by the parent's synchronized `gate.stage` so the timings stay
 * deterministic (not coupled to CSS animation-delay).
 */
export function RummyDealOverlay({
  stage,
  playerCount,
  bg,
}: {
  stage: "shuffle" | "deal";
  playerCount: number;
  /** Optional background override. Mobile passes nothing (green felt default);
   *  Desktop passes its wood gradient so the overlay matches the table. */
  bg?: string;
}) {
  // Number of seats — clamp 2..6 so single-player practice doesn't break
  // and pool-mode 6-player tables still get a clean visual.
  const N = Math.max(2, Math.min(6, playerCount));

  // Seat positions in CSS pixels relative to the centre deck. Self at the
  // bottom; other players spread evenly clockwise. Standard math angles —
  // we offset by 90° so seat 0 lands at +y (bottom of the felt).
  const RADIUS = 280;
  const seats = Array.from({ length: N }, (_, i) => {
    const angle = Math.PI / 2 + (i * 2 * Math.PI) / N;
    return {
      dx: Math.cos(angle) * RADIUS,
      // sin is + for bottom in CSS coords. Slight vertical squash so
      // top/bottom seats don't sit too far off the felt (most felts are
      // wider than tall).
      dy: Math.sin(angle) * RADIUS * 0.78,
    };
  });

  // Real Indian Rummy deals 13 cards to each player in a single rotation,
  // one card per player per pass. Visually we want every seat to receive
  // its share so the player can "count" the deal — 13 cards × N seats =
  // up to 78 cards total, which we cap at 52 for tabling visibility on
  // the 6-player case. The cap only kicks in for N > 4.
  const CARDS_PER_SEAT = N <= 4 ? 13 : Math.floor(52 / N); // 13/13/13/13/10/8
  const TOTAL_CARDS = CARDS_PER_SEAT * N;

  // Total deal window is 2.4 s (we keep 600 ms at the end for the
  // overlay fade). Cards are dealt in round-robin order so each seat
  // gets its first card, then second, etc., mirroring how a real dealer
  // distributes.
  const DEAL_WINDOW_MS = 2400;
  const fanCards = Array.from({ length: TOTAL_CARDS }, (_, i) => {
    const seatIdx = i % N;
    const round = Math.floor(i / N);
    const seat = seats[seatIdx];
    // Stack the cards at each seat with tiny jitter so it reads as a
    // pile rather than perfectly overlapping rectangles.
    const jitterX = ((round * 17 + seatIdx * 11) % 18) - 9;
    const jitterY = ((round * 13 + seatIdx * 7) % 14) - 7;
    const rot = ((round * 23 + seatIdx * 19) % 70) - 35;
    return {
      dx: `${(seat.dx + jitterX).toFixed(0)}px`,
      dy: `${(seat.dy + jitterY).toFixed(0)}px`,
      rot: `${rot}deg`,
      delay: `${Math.round((i / TOTAL_CARDS) * DEAL_WINDOW_MS)}ms`,
    };
  });

  const banner = stage === "shuffle" ? RUMMY_COPY.shuffling : RUMMY_COPY.dealing(N);

  return (
    <div
      // `pointer-events: auto` (default for div) blocks ALL clicks on the
      // felt and hand beneath while the overlay is up — no taps can sneak
      // through to draw/discard until the deal sequence finishes.
      className={`absolute inset-0 z-[55] ${
        stage === "deal" ? "rummy-deal-fade-late" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-label="Shuffling and dealing — please wait"
      onClick={(e) => e.preventDefault()}
      style={{
        // Fully opaque felt gradient. Mobile: green casino felt (default).
        // Desktop: passes bg prop with wood gradient to match its table.
        background: bg ?? "linear-gradient(160deg, #6D4323 0%, #4A2C16 55%, #3a2010 100%)",
      }}
    >
      <div
        className="rummy-deal-banner absolute top-1/2 left-1/2 px-5 py-2 rounded-full font-black uppercase tracking-[0.22em] text-[11px] sm:text-[13px]"
        style={{
          color: "#1f1300",
          background: "linear-gradient(135deg, #fde68a, #f59e0b)",
          border: "2px solid #b45309",
          boxShadow: "0 8px 20px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.4)",
          marginTop: -110,
          animationDelay: "0ms",
        }}
      >
        {banner}
      </div>

      {/* Centre deck — visible during both stages. During "shuffle" the two
          stacked packs riffle opposite directions; during "deal" they sit
          still as the source of the flying cards. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-[64px] h-[88px] sm:w-[72px] sm:h-[100px]">
          <div className={`absolute inset-0 ${stage === "shuffle" ? "rummy-deck-shuffle" : ""}`}>
            <FaceDownDealCard />
          </div>
          <div className={`absolute inset-0 ${stage === "shuffle" ? "rummy-deck-shuffle-alt" : ""}`}>
            <FaceDownDealCard />
          </div>
        </div>
      </div>

      {/* Deal flight — only renders during the deal stage so the cards
          start animating exactly when the riffle finishes. */}
      {stage === "deal" && (
        <div className="absolute top-1/2 left-1/2">
          {fanCards.map((c, i) => (
            <div
              key={i}
              className="rummy-deal-fly absolute -translate-x-1/2 -translate-y-1/2"
              style={
                {
                  "--dx": c.dx,
                  "--dy": c.dy,
                  "--rot": c.rot,
                  animationDelay: c.delay,
                  animationFillMode: "forwards",
                } as React.CSSProperties
              }
            >
              <FaceDownDealCard />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FaceDownDealCard() {
  return (
    <div
      className="relative w-[52px] h-[72px] sm:w-[58px] sm:h-[80px] rounded-[6px] overflow-hidden"
      style={{
        background:
          "linear-gradient(140deg, #7f1d1d 0%, #991b1b 60%, #4c0519 100%)",
        border: "1px solid #2c0507",
        boxShadow:
          "0 4px 9px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(251,191,36,0.55)",
      }}
    >
      <div
        className="absolute inset-1 rounded-[4px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(251,191,36,0.18) 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, rgba(251,191,36,0.18) 0 1.5px, transparent 1.5px 9px)",
          border: "1px solid rgba(251,191,36,0.4)",
        }}
      />
    </div>
  );
}

/**
 * Centre-screen "dropped" flourish (mobile) — a face-down card slams down with
 * the player's name. Pointer-events-none, self-dismissing; purely cosmetic.
 */
function DropAnnounceMobile({ name, mine }: { name: string; mine: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[59] flex items-center justify-center pointer-events-none px-4"
      style={{ animation: "rummy-drop-fade 2600ms ease-out forwards" }}
      role="status"
      aria-live="polite"
    >
      <div className="rummy-drop-slam flex flex-col items-center gap-2.5">
        <div
          className="w-16 h-24 rounded-xl flex items-center justify-center text-3xl"
          style={{
            background: "linear-gradient(140deg, #7f1d1d 0%, #991b1b 60%, #4c0519 100%)",
            border: "2px solid rgba(201,162,39,0.7)",
            boxShadow: "0 10px 26px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(251,191,36,0.35)",
          }}
        >
          🃏
        </div>
        <div
          className="px-4 py-1.5 rounded-full font-black uppercase tracking-[0.14em] text-xs"
          style={{
            background: "linear-gradient(135deg,#b45309,#7c2d12)",
            color: "#fef3c7",
            border: "2px solid #fbbf24",
            boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
          }}
        >
          {mine ? "You dropped" : `${name} dropped`}
        </div>
      </div>
    </div>
  );
}

/**
 * Post-show rearrange window (mobile) — a countdown ring in the MIDDLE of the
 * table. For the declarer it also locks the whole board with a blocking dim
 * layer (they're spectating). For a loser it's pointer-events-none so they keep
 * rearranging the cards underneath; the pile/actions are already disabled.
 */
function ArrangingBannerMobile({
  deadline,
  iAmDeclarer,
  declarerName,
}: {
  deadline: number | null;
  iAmDeclarer: boolean;
  declarerName: string;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const remainingSec = deadline != null ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  const urgent = remainingSec != null && remainingSec <= 5 && !iAmDeclarer;
  const accent = iAmDeclarer ? "#22c55e" : urgent ? "#ef4444" : "#fbbf24";
  return (
    <div
      className="fixed inset-0 z-[59] flex flex-col items-center justify-center px-6 text-center"
      style={{
        // Declarer: block the whole board (spectating). Loser: let taps through
        // to the cards below so they can still rearrange.
        pointerEvents: iAmDeclarer ? "auto" : "none",
        background: iAmDeclarer ? "rgba(20,14,8,0.55)" : "transparent",
      }}
    >
      <div
        className="flex items-center justify-center rounded-full font-black tabular-nums rummy-result-pop"
        style={{
          width: 84,
          height: 84,
          fontSize: 38,
          color: "#fff",
          background: "radial-gradient(circle at 50% 35%, rgba(0,0,0,0.55), rgba(0,0,0,0.8))",
          border: `4px solid ${accent}`,
          boxShadow: `0 0 24px ${accent}88, inset 0 0 14px rgba(0,0,0,0.6)`,
          animation: urgent ? "rummy-glow 0.7s ease-in-out infinite" : undefined,
        }}
      >
        {remainingSec ?? "—"}
      </div>
      <div
        className="mt-2 px-4 py-1 rounded-full text-[12px] font-black uppercase tracking-[0.1em]"
        style={{
          background: iAmDeclarer ? "linear-gradient(135deg,#166534,#15803d)" : "linear-gradient(135deg,#7c2d12,#b45309)",
          color: "#fff",
          border: `1.5px solid ${accent}`,
          boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
        }}
      >
        {iAmDeclarer ? "🏆 You made the show" : `⏱️ ${declarerName || "Someone"} declared`}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/85">
        {iAmDeclarer ? "Board locked — waiting for others…" : "Arrange to cut your points"}
      </div>
    </div>
  );
}

/**
 * 5-second winner burst — confetti rain + "WINNER!" banner — fires on a
 * valid declare for the local player. Pointer-events: none so the
 * scorecard modal underneath stays interactive; the burst is purely
 * cosmetic. Self-dismisses on its own without ever blocking input or
 * pausing other overlays.
 *
 * Renders at z-index 60, just above the scorecard modal (z-50) and the
 * joker draw celebration (z-58). The banner pulses in, holds, then fades
 * out across the 5 s window; confetti pieces drift down with slightly
 * randomised timings so the burst doesn't read as a stiff loop.
 */
function WinnerCelebrationBurst() {
  // Pre-compute 36 confetti pieces with varied colors, x-offsets, delays.
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1400,
    duration: 2200 + Math.random() * 1800,
    color: ["#fbbf24", "#f97316", "#ef4444", "#10b981", "#3b82f6", "#a855f7"][
      i % 6
    ],
    rotate: Math.random() * 360,
    width: 6 + Math.floor(Math.random() * 6),
    height: 10 + Math.floor(Math.random() * 8),
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
      {/* Confetti pieces */}
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.width,
            height: p.height,
            background: p.color,
            borderRadius: 2,
            boxShadow: `0 0 6px ${p.color}55`,
            ["--r" as string]: `${p.rotate}deg`,
            animation: `rummy-winner-fall ${p.duration}ms cubic-bezier(.25,.46,.45,.94) ${p.delay}ms forwards`,
            transform: `translate3d(0,-12vh,0) rotate(${p.rotate}deg)`,
          } as CSSProperties}
        />
      ))}
      {/* Winner banner — fades in, holds, fades out across 5 s */}
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
            fontSize: "clamp(36px, 8vw, 84px)",
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
          style={{ color: "#FEF3C7", fontSize: "clamp(11px,1.4vw,16px)" }}
        >
          Valid Declaration
        </div>
      </div>
    </div>
  );
}
