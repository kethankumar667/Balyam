import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, ChatMessage, Player, Rank, ReactionRecvPayload, RummyPlayerState } from "@shared/types";
import { PlayingCard, FaceDownCard, FinishSlot } from "./Card";
import { getSocket } from "../../lib/socket";
import {
  classifyMeld,
  computeLivePoints,
  evaluateFinishReadiness,
  sortMeldCards,
  sumCardPoints,
  type LivePoints,
  type MeldClassification,
} from "./meldCheck";
import EmojiRain from "../ludo/EmojiRain";
import CardTracker from "./CardTracker";
import { suggestArrangement } from "./autoArrange";
import { rummySfx, setRummySoundEnabled, isRummySoundEnabled } from "./sound";
import TutorialModal, { hasSeenTutorial } from "./TutorialModal";
import PlayerList from "../../components/PlayerList";
import VoicePanel from "../../components/VoicePanel";
import Chat from "../../components/Chat";
import RematchPanel from "../../components/RematchPanel";
import Avatar from "./Avatar";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  onFullscreenChange,
} from "../../lib/fullscreen";

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
  | "new"
  | `group:${string}`;

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
}: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  onLeave?: () => void;
}) {
  const myTurn = state.turnPlayerId === selfId;
  const canDraw = myTurn && state.turnAction === "draw" && state.phase === "playing";
  const canDiscardOrDeclare = myTurn && state.turnAction === "discardOrDeclare" && state.phase === "playing";
  const iDropped = !!selfId && state.droppedPlayers.includes(selfId);

  const hand = state.myHand ?? [];
  const byId = useMemo(() => new Map(hand.map((c) => [c.id, c])), [hand]);
  const wildRank = state.wildJoker.rank;

  // Layout — persistent client-side grouping. Reconciles on every server hand update.
  const [layout, setLayout] = useState<Layout>({ groups: [], ungrouped: [] });
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
  // Hamburger menu (consolidates every secondary action behind a single ☰ icon
  // so the top strip can stay 20px tall).
  const [menuOpen, setMenuOpen] = useState(false);
  // Tiny "Copied!" toast on the room-code copy button.
  const [copiedFlash, setCopiedFlash] = useState(false);
  // True once the user has dismissed the round-over / match-over overlay so we
  // don't keep re-popping it. Resets when a new round starts (phase flips back
  // to "playing") so the NEXT round's result will still appear.
  const [resultDismissed, setResultDismissed] = useState(false);
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
      await enterFullscreen();
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

  // Mobile portrait detection — Rummy is designed for landscape; on portrait phones,
  // we show a rotate-device prompt instead of cramming the felt into a narrow column.
  const needsLandscape = useNeedsLandscape();
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
      } else if (target === "ungrouped") {
        moveCardsTo("ungrouped", null, null, ids);
      } else if (target === "new") {
        moveCardsTo("new", null, null, ids);
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

  function autoArrange() {
    // Preserve every group that is already a valid meld — the user spent effort
    // assembling them and the engine has nothing better to offer. Throw only
    // invalid-group cards plus ungrouped cards into the rearrangement pool.
    const preservedGroups: typeof layout.groups = [];
    const pool: Card[] = [];
    for (const g of layout.groups) {
      const cls = meldByGroupId[g.id];
      if (cls?.valid) {
        preservedGroups.push(g);
      } else {
        for (const cid of g.cardIds) {
          const c = byId.get(cid);
          if (c) pool.push(c);
        }
      }
    }
    for (const cid of layout.ungrouped) {
      const c = byId.get(cid);
      if (c) pool.push(c);
    }

    // If the pool is empty, every meld is already valid — nothing to do.
    if (pool.length === 0) {
      setError(null);
      return;
    }

    const arr = suggestArrangement(pool, wildRank as Rank);
    const newGroupsFromSuggestion = arr.groups.map((cards) => ({
      id: newGroupId(),
      cardIds: cards.map((c) => c.id),
    }));
    setLayout({
      groups: [...preservedGroups, ...newGroupsFromSuggestion],
      ungrouped: arr.ungrouped.map((c) => c.id),
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
    const map: Record<string, MeldClassification> = {};
    for (const g of layout.groups) {
      const cards = g.cardIds.map((id) => byId.get(id)).filter(Boolean) as Card[];
      map[g.id] = classifyMeld(cards, wildRank as Rank);
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
  const canGroup = selected.size >= 1 && state.phase === "playing";
  const canDiscardBtn = canDiscardOrDeclare && selected.size === 1;
  const canDropBtn = canDraw && !iDropped;
  const canFinish = canDiscardOrDeclare && hand.length === 14 &&
    layout.ungrouped.length === 1 &&
    layout.groups.reduce((s, g) => s + g.cardIds.length, 0) === 13;

  // === Render ===

  return (
    <div
      className="rounded-none sm:rounded-[28px] px-3 sm:px-5 pt-3 sm:pt-4 relative shadow-2xl flex flex-col gap-1 sm:gap-1.5 h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 38%, #1a8c4a 0%, #0d5e2e 55%, #052e16 95%)",
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

      {/* My hand: groups + ungrouped */}
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

      {/* Action bar — normal flex child at the bottom of the felt. Since the
          felt itself is viewport-locked with overflow-hidden, the bar is always
          visible without any fixed-positioning gymnastics. The horizontal
          padding keeps the buttons off the gold rim. */}
      <div className="flex-shrink-0 max-w-2xl w-full mx-auto px-2 sm:px-6">
        <ActionBar
          canGroup={canGroup}
          canDiscard={canDiscardBtn}
          canDrop={canDropBtn}
          canFinish={canFinish}
          canAutoArrange={hand.length > 0 && state.phase === "playing"}
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
        <DropConfirm onCancel={() => setConfirmDrop(false)} onConfirm={drop} />
      )}

      {/* End-of-round / end-of-match cards render as dismissable modal overlays
          so they sit ON TOP of the table. Closing them lets the player inspect
          the board behind; the modal returns automatically on the next round
          (resultDismissed resets when phase flips back to "playing"). */}
      {!resultDismissed && state.phase === "finished" && state.matchMode === "single" && (
        <ResultOverlay onClose={() => setResultDismissed(true)}>
          <RummyScoreCard
            state={state}
            players={players}
            selfId={selfId}
            roomCode={roomCode}
            onLeave={onLeave}
          />
        </ResultOverlay>
      )}

      {!resultDismissed && state.phase === "finished" && state.matchMode !== "single" && !state.matchOver && (
        <ResultOverlay onClose={() => setResultDismissed(true)}>
          <PoolBetweenRounds state={state} nameOf={nameOf} selfId={selfId} />
        </ResultOverlay>
      )}

      {!resultDismissed && state.matchOver && (
        <ResultOverlay onClose={() => setResultDismissed(true)}>
          <div className="space-y-3">
            <MatchOverCard state={state} nameOf={nameOf} />
            <div className="bg-amber-950/60 border border-amber-700/40 rounded-xl p-3">
              <RematchPanel players={players} selfId={selfId} />
            </div>
          </div>
        </ResultOverlay>
      )}

      {/* Victory celebration — appears 30s after the game truly ends and
          covers everything until the player chooses to leave. */}
      {showCelebration && (
        <RummyCelebrationOverlay onLeave={onLeave ?? (() => {})} />
      )}

      {/* Persistent pool standings — always visible in pool mode */}
      {state.matchMode !== "single" && state.phase === "playing" && (
        <PoolStandings state={state} nameOf={nameOf} selfId={selfId} />
      )}

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
          <VoicePanel players={players} selfId={selfId} />
        </RummyModal>
      )}

      {/* Chat overlay */}
      {chatOpen && (
        <RummyModal title="Chat" onClose={() => setChatOpen(false)}>
          <Chat messages={messages} selfId={selfId} />
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

      {/* Mobile portrait rotate prompt — covers the felt with a "rotate device" message */}
      {needsLandscape && <RotateDevicePrompt />}

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
          background: "linear-gradient(180deg, #0f3a26, #052e16)",
          border: "2px solid #422006",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold uppercase tracking-wider text-emerald-100">
            {title}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold"
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
          aria-label="Close"
          title="Close"
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-100 font-extrabold z-10"
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

function RotateDevicePrompt() {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-center"
      style={{
        background: "linear-gradient(180deg, #0f3a26 0%, #052e16 100%)",
      }}
    >
      <div className="space-y-4 max-w-xs">
        <div className="text-6xl animate-pulse">📱↻</div>
        <div className="text-lg font-extrabold uppercase tracking-wider text-emerald-100">
          Rotate your device
        </div>
        <div className="text-sm text-emerald-200/80">
          Rummy is best played in landscape mode on mobile. Turn your phone
          sideways to see the full table.
        </div>
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
      className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-left text-emerald-100"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <span className="text-xl" aria-hidden>{emoji}</span>
      <span className="text-sm font-bold flex-1">{label}</span>
      {badge && (
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "#ef4444", boxShadow: "0 0 0 1.5px #052e16" }}
        />
      )}
      <span className="text-emerald-300/50">›</span>
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
          background: "linear-gradient(180deg, #1f2937 0%, #0f172a 100%)",
          border: "1px solid rgba(251, 191, 36, 0.45)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          color: "#fde68a",
          height: 22,
        }}
      >
        <span className="text-emerald-400 text-[9px]">📶</span>
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
            className="w-7 h-7 mt-1 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-sm flex-shrink-0 text-amber-200 cursor-pointer transition-colors duration-200"
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
          className="relative w-7 h-7 mt-1 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-sm flex-shrink-0"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }}
        >
          ☰
          {hasUnreadChat && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{ background: "#ef4444", boxShadow: "0 0 0 1.5px #052e16" }}
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

// Tracks viewport orientation/size to detect "mobile portrait" — Rummy works best
// in landscape, so we prompt the user to rotate before showing the felt.
function useNeedsLandscape(): boolean {
  const [needs, setNeeds] = useState(() => evalNeedsLandscape());
  useEffect(() => {
    function onResize() {
      setNeeds(evalNeedsLandscape());
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return needs;
}

function evalNeedsLandscape(): boolean {
  if (typeof window === "undefined") return false;
  // Only nag on small viewports — desktop is fine in any aspect ratio.
  const isMobile = window.innerWidth < 768;
  const isPortrait = window.innerHeight > window.innerWidth;
  return isMobile && isPortrait;
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
          myTurn ? "bg-amber-500 text-slate-900" : "bg-black/60 text-emerald-100"
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
            disabled={!canDraw}
            className={`transition ${
              canDraw ? "hover:-translate-y-2 hover:scale-105 cursor-pointer" : "cursor-default"
            } ${allowOpenDrop ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-emerald-950 rounded-md" : ""}`}
            aria-label="Draw from open pile"
          >
            <div key={discardPulseKey} className="rummy-discard-pulse rounded-md">
              <PlayingCard
                card={state.topOfOpenPile}
                isWildJoker={state.topOfOpenPile.rank === state.wildJoker.rank}
              />
            </div>
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
        {dragging && <NewMeldZone active={dragOverTarget === "new"} />}
      </div>
    </div>
  );
}

function NewMeldZone({ active }: { active: boolean }) {
  return (
    <div
      data-rummy-drop="new"
      className="rounded-lg flex flex-col items-center justify-center text-emerald-100 font-extrabold text-[10px] px-2 py-2 self-stretch min-w-[60px] flex-shrink-0 transition"
      style={{
        background: active ? "rgba(16,185,129,0.45)" : "rgba(16,185,129,0.15)",
        border: active ? "2px dashed #34d399" : "2px dashed rgba(16,185,129,0.5)",
        boxShadow: active ? "0 0 18px rgba(52,211,153,0.6)" : undefined,
      }}
    >
      <span className="text-2xl mb-1">＋</span>
      NEW MELD
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
  const isValid = !!classification?.valid;
  // Per-lane card-point total (jokers count 0) so we can show "X Points" for invalid lanes.
  const laneCards = cardIds.map((cid) => byId.get(cid)).filter(Boolean) as Card[];
  const laneTotal = sumCardPoints(laneCards, wildRank as Rank);
  // Junglee-style top badge: ❌ "X Points" for invalid lanes, ✓ "Label (0)" for valid
  const badgeText = isValid
    ? `${classification?.label.replace(/\s*✓\s*$/, "")} (0)`
    : `${laneTotal} Points`;
  return (
    <div
      data-rummy-drop={target}
      className={`flex flex-col items-center gap-0.5 transition flex-shrink-0 ${isValid ? "rummy-zone-valid" : "rummy-zone-invalid"}`}
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
            color: isValid ? "#34d399" : "#fca5a5",
            border: `1px solid ${isValid ? "#10b981" : "#dc2626"}`,
            boxShadow: isValid ? `0 0 6px ${classColor}66` : undefined,
          }}
        >
          <span>{isValid ? "✓" : "✕"}</span>
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
          <span className="text-emerald-300">
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
          <span className="text-emerald-300">
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
    <div className="flex justify-center items-stretch flex-wrap gap-1.5 sm:gap-2 pt-1">
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
      className={`px-2 sm:px-3 ${big ? "py-1.5 sm:py-2 text-xs sm:text-sm" : "py-1 sm:py-1.5 text-[11px] sm:text-xs"} rounded-md font-extrabold uppercase tracking-wider transition flex items-center gap-1 select-none`}
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
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="text-lg font-bold">Drop out of this round?</div>
        <div className="text-sm text-slate-300">
          You'll take a <span className="font-bold text-rose-300">20-point penalty</span> and stop
          playing this round. Game continues for everyone else.
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="bg-slate-700 hover:bg-slate-600 rounded px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-rose-600 hover:bg-rose-500 rounded px-4 py-2 text-sm font-extrabold"
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
        <div className="text-[10px] text-emerald-200/70">
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
                background: isOut ? "rgba(127,29,29,0.45)" : "rgba(15,23,42,0.65)",
                border: `1px solid ${isOut ? "#7f1d1d" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-100 truncate">
                  {nameOf(id)}{id === selfId && " (you)"}
                </span>
                <span className="tabular-nums font-extrabold text-amber-200">
                  {score}
                </span>
              </div>
              <div className="h-1 rounded mt-1 overflow-hidden bg-slate-700/40">
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
  function nextRound() {
    getSocket().emit("game:move", { type: "newRound" });
  }
  return (
    <div className="bg-slate-900/80 rounded-xl p-4 space-y-3 border border-amber-700">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-lg font-extrabold text-amber-200">
          🎴 Round {state.roundNumber} complete
        </div>
        <div className="text-xs text-slate-400">
          Next: Round {state.roundNumber + 1} · target {state.poolTarget}
        </div>
      </div>

      <table className="text-sm w-full">
        <thead>
          <tr className="text-slate-400">
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
                    ? "text-slate-500 line-through"
                    : "text-slate-200"
                }
              >
                <td className="py-0.5">
                  {nameOf(id)}
                  {state.droppedPlayers.includes(id) && (
                    <span className="text-rose-400 text-[10px] ml-1">dropped</span>
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
          className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 font-extrabold tracking-wider uppercase"
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

/**
 * Final-round scorecard for single-mode Rummy.
 *
 * Replaces the old slate "Round ended" panel with the wine-red ranked
 * scorecard from the design reference. Embeds the generic RematchPanel so
 * the host can request another round + non-hosts can accept/decline + a
 * countdown ticks when everyone's in.
 *
 * Layout: full-width red felt with a trophy/medal header, a ranked
 * table (Rank · Player · Cards · Points · Chips), and a joker chip + game
 * ID footer.
 *
 * We intentionally render players' final hands as a flat card row —
 * non-winners' melds aren't carried over the wire (only the winner's
 * declared groups are), so a per-meld classification badge would be
 * dishonest for losers. The total points already convey "how bad was the
 * hand at the end."
 */
function RummyScoreCard({
  state,
  players,
  selfId,
  roomCode,
  onLeave,
}: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  roomCode?: string;
  onLeave?: () => void;
}) {
  const winnerId = state.winnerId ?? null;
  const wrongShowerId = state.invalidDeclareBy ?? null;
  const isWrongShow = wrongShowerId !== null;

  const lossOf = (id: string) => Math.max(0, state.scores?.[id] ?? 0);

  // Chips accounting:
  //   • Normal round → winner takes sum(losers' hand values); each loser
  //     pays their own hand value.
  //   • Wrong show / invalid declare → the wrong-shower eats the full
  //     80-point penalty; each opponent splits that penalty as chips won.
  //     There is NO single round winner in this branch.
  const chipsOf = (id: string): number => {
    if (isWrongShow) {
      if (id === wrongShowerId) return -80;
      const opponents = state.playerOrder.filter((pid) => pid !== wrongShowerId);
      return opponents.length > 0 ? Math.round(80 / opponents.length) : 0;
    }
    if (id === winnerId) {
      return state.playerOrder.reduce(
        (sum, pid) => (pid === winnerId ? sum : sum + lossOf(pid)),
        0,
      );
    }
    return -lossOf(id);
  };

  // Rank order:
  //   • Wrong show → opponents share rank 1 (winners), wrong-shower last.
  //     Tied opponents keep `playerOrder` order for stability.
  //   • Normal     → declared winner first, then losers by ascending hand value.
  const ranked = [...state.playerOrder].sort((a, b) => {
    if (isWrongShow) {
      if (a === wrongShowerId) return 1;
      if (b === wrongShowerId) return -1;
      return 0; // opponents tied — keep declared order
    }
    if (a === winnerId) return -1;
    if (b === winnerId) return 1;
    return lossOf(a) - lossOf(b);
  });
  const selfRank = selfId ? ranked.indexOf(selfId) + 1 : null;

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const isMyId = (id: string) => id === selfId;
  const wrongShowerName = wrongShowerId ? nameOf(wrongShowerId) : null;
  const headerText =
    isWrongShow
      ? wrongShowerId === selfId
        ? "Wrong show — −80!"
        : `${wrongShowerName} mis-declared`
      : selfRank
      ? `You finished ${ordinal(selfRank)}!`
      : "Round complete";

  const matchLabel =
    state.matchMode === "pool101" ? "101 Pool"
    : state.matchMode === "pool201" ? "201 Pool"
    : "Points";

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden text-white shadow-2xl"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #9b2a2a 0%, #6f1f1f 55%, #4a1212 100%)",
        border: "2px solid rgba(0,0,0,0.45)",
        boxShadow:
          "0 24px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.35) inset",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4">
        <div className="flex items-center gap-3 min-w-0">
          <MedalIcon className="w-9 h-9 sm:w-10 sm:h-10 text-amber-300 flex-shrink-0 drop-shadow" />
          <div className="min-w-0">
            <div className="text-amber-200 italic font-black text-[19px] sm:text-[22px] leading-tight">
              {headerText}
            </div>
            {isWrongShow && wrongShowerId !== selfId && (
              <div className="text-rose-200 text-[12px] font-semibold">
                Penalty 80 split across {state.playerOrder.length - 1} opponent
                {state.playerOrder.length - 1 === 1 ? "" : "s"}.
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/95 hover:bg-zinc-700 active:translate-y-px
                         text-zinc-100 text-[12px] sm:text-[13px] font-bold px-3 py-1.5 cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-zinc-400/60 transition-colors duration-200"
              aria-label="Leave game"
            >
              <LeaveIcon className="w-3.5 h-3.5" />
              Leave Game
            </button>
          )}
        </div>
      </div>

      {/* Ranked table */}
      <div className="px-2 sm:px-3 pt-3 pb-2">
        <div
          className="grid items-center gap-2 px-3 py-1.5 text-amber-100/80 uppercase tracking-widest font-bold text-[10px] sm:text-[11px]"
          style={{ gridTemplateColumns: "44px 1.2fr 2.6fr 0.7fr 0.9fr" }}
        >
          <div>Rank</div>
          <div>Username</div>
          <div>Cards</div>
          <div className="text-right">Points</div>
          <div className="text-right">Chips Won</div>
        </div>
        <div className="space-y-1.5">
          {ranked.map((id, idx) => {
            const rank = idx + 1;
            const isWin = id === winnerId;
            const isWrongShower = id === wrongShowerId;
            const isMe = isMyId(id);
            // Points column reflects what the engine booked: opponents
            // in a wrong-show round get 0; everyone else shows their hand
            // value. Chips column uses the helper for both branches.
            const points = lossOf(id);
            const chips = chipsOf(id);
            const hand = state.finalHands?.[id] ?? [];
            return (
              <div
                key={id}
                className={`grid items-center gap-2 px-3 py-2 rounded-xl text-[12px] sm:text-[13px]
                            ${isWrongShower
                              ? "bg-zinc-900/70 ring-1 ring-rose-400/40"
                              : isMe
                              ? "bg-gradient-to-r from-rose-600 to-rose-500 ring-1 ring-amber-300/50"
                              : isWin
                              ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 ring-1 ring-amber-300/40"
                              : "bg-rose-900/35"}`}
                style={{ gridTemplateColumns: "44px 1.2fr 2.6fr 0.7fr 0.9fr" }}
              >
                <div className="font-black tabular-nums text-amber-200 text-base sm:text-lg">
                  {isWrongShow ? (isWrongShower ? "—" : rank) : rank}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black italic truncate">
                    {isMe ? "You" : nameOf(id)}
                  </span>
                  {isWin && (
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider"
                      style={{
                        background: "linear-gradient(135deg, #fbbf24, #d97706)",
                        color: "#3a2400",
                      }}
                    >
                      <CrownIcon className="w-3 h-3" />
                      Winner
                    </span>
                  )}
                  {isWrongShower && (
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-rose-700 text-rose-100"
                    >
                      Wrong Show
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
                  {hand.length === 0 ? (
                    <span className="text-amber-100/60 text-[11px] italic">
                      —
                    </span>
                  ) : (
                    hand.map((c) => (
                      <span key={c.id} className="flex-shrink-0 -mr-1.5 last:mr-0">
                        <PlayingCard
                          card={c}
                          isWildJoker={c.rank === state.wildJoker.rank}
                          small
                        />
                      </span>
                    ))
                  )}
                </div>
                <div className="text-right font-black tabular-nums">
                  {points}
                </div>
                <div
                  className={`text-right font-black tabular-nums ${
                    chips >= 0 ? "text-emerald-300" : "text-rose-200"
                  }`}
                >
                  {chips >= 0 ? `+${chips}` : chips}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: joker + game ID + match mode */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-amber-300/20 bg-black/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            <PlayingCard card={state.wildJoker} isWildJoker small />
          </div>
          <div className="text-amber-100/90 text-[11px] sm:text-[12px] font-semibold">
            Joker
          </div>
          {roomCode && (
            <div className="text-amber-100/60 text-[11px] sm:text-[12px] font-mono">
              #{roomCode}
            </div>
          )}
          <div className="text-amber-100/60 text-[11px] sm:text-[12px] font-semibold">
            · {matchLabel}
          </div>
        </div>
      </div>

      {/* Rematch — host requests, others accept/decline, everyone sees the
          countdown. Lives inside the scorecard so the player doesn't have to
          dismiss anything to invite another round. */}
      <div className="px-4 pb-4">
        <RematchPanel players={players} selfId={selfId} />
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"] as const;
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function MedalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-2.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
      <path d="m8 3 1.5 3.5L7 4 5 5l2.5 2.5L4 9l3.5 1.5L5 13l3-.5L7 16l3-2.5L11 17l1-3 1 3 1-3.5 3 2.5-1-3.5 3 .5-3.5-2.5L20 9l-3-1L19.5 5.5 17 7 19 4l-3 1L14.5 1.5 13 5l-1-3-1 3-.5-2L8 3Z" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 18h18l-1.5-9-3.5 4-3-5-3 5-3.5-4L3 18ZM3 20h18v2H3z" />
    </svg>
  );
}

function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
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
    <div className="bg-slate-900/90 rounded-xl p-4 space-y-3 border border-emerald-700 shadow-2xl">
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
            <tr className="text-slate-400 border-b border-slate-700">
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
                  className={`${isWinner ? "text-amber-300 font-bold" : "text-emerald-100"} border-b border-slate-800/60 last:border-0`}
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
                      <span className="text-slate-500 text-[10px] ml-1">(dropped)</span>
                    )}
                  </td>
                  <td className="text-right py-1.5 tabular-nums">
                    <span
                      className={isWinner ? "text-emerald-300" : "text-rose-300"}
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
