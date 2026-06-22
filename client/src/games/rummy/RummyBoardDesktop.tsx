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
  RummyPlayerState,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { PlayingCard } from "./Card";
import {
  classifyMeld,
  computeLivePoints,
  evaluateFinishReadiness,
  sortMeldCards,
  type MeldClassification,
} from "./meldCheck";
import { suggestArrangement } from "./autoArrange";
import { isRummySoundEnabled, rummySfx, setRummySoundEnabled } from "./sound";
import Chat from "../../components/Chat";
import VoicePanel from "../../components/VoicePanel";
import PlayerList from "../../components/PlayerList";
import { enterFullscreen, exitFullscreen, isFullscreenActive } from "../../lib/fullscreen";

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
}

type RightTab = "chat" | "voice" | "players" | "points";

export default function RummyBoardDesktop({
  state,
  players,
  selfId,
  messages = [],
  roomCode,
  onLeave,
}: BoardProps) {
  const hand = state.myHand ?? [];
  const byId = useMemo(() => new Map(hand.map((c) => [c.id, c])), [hand]);
  const wildRank = state.wildJoker.rank;

  const [layout, setLayout] = useState<Layout>({ groups: [], ungrouped: [] });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<DropTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const [activeTab, setActiveTab] = useState<RightTab>("chat");
  const [soundOn, setSoundOn] = useState<boolean>(() => isRummySoundEnabled());
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
    const m: Record<string, MeldClassification> = {};
    for (const g of layout.groups) {
      const cards = g.cardIds.map((id) => byId.get(id)!).filter(Boolean);
      m[g.id] = classifyMeld(cards, wildRank as Rank);
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
    if (state.topOfOpenPile.isPrintedJoker) {
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

  /* ─────────────────────────── Render ─────────────────────────── */
  return (
    <div
      className="w-full text-[#F3EADB]"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 50% 0%, #0d3324 0%, #082016 55%, #04110b 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ───── Top bar ───── */}
      <div
        className="flex items-center justify-between px-5 py-2 border-b border-emerald-900/60"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onLeave}
            className="rounded-md bg-zinc-800/80 hover:bg-zinc-700 px-3 py-1.5 text-sm font-semibold"
          >
            ← Leave
          </button>
          <div className="font-black tracking-wider text-amber-200 text-lg">
            BHALYAM <span className="text-zinc-400 font-medium">·</span>{" "}
            <span className="text-zinc-200 font-mono">{roomCode ?? "ROOM"}</span>
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
            onClick={toggleSound}
            className="rounded-md bg-zinc-800/80 hover:bg-zinc-700 px-3 py-1.5 text-sm"
            title="Sound"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-md bg-zinc-800/80 hover:bg-zinc-700 px-3 py-1.5 text-sm"
            title="Fullscreen"
          >
            {isFs ? "⛶" : "⛶"}
          </button>
        </div>
      </div>

      {/* ───── Main 3-column row ───── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "240px 1fr 340px",
          minHeight: "calc(100vh - 50px)",
        }}
      >
        {/* ── Left rail: opponents ── */}
        <aside
          className="border-r border-emerald-900/40 px-3 py-4 flex flex-col gap-3"
          style={{ background: "rgba(0,0,0,0.22)" }}
        >
          <div className="text-[11px] uppercase tracking-widest text-amber-200/70 px-1">
            Opponents
          </div>
          {opponentIds.map((id) => (
            <OpponentCard
              key={id}
              name={nameOf(id)}
              isTurn={state.turnPlayerId === id}
              handSize={state.handSizes[id] ?? 0}
              dropped={state.droppedPlayers.includes(id)}
              eliminated={state.eliminatedInMatch.includes(id)}
              cumulativeScore={state.cumulativeScores?.[id]}
              poolTarget={state.poolTarget}
            />
          ))}
        </aside>

        {/* ── Center felt ── */}
        <main className="flex flex-col px-6 py-5 gap-4 overflow-hidden">
          {/* Decks + finish slot */}
          <div className="flex items-start justify-center gap-8 mt-2">
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

          {/* Group lanes */}
          <div
            className="flex-1 mt-4 rounded-xl px-4 py-4 overflow-x-auto"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,52,36,0.7) 0%, rgba(8,32,22,0.7) 100%)",
              border: "1px solid rgba(245,200,80,0.18)",
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.45)",
            }}
          >
            <div className="flex items-stretch gap-3 flex-wrap min-h-[140px]">
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

            {/* Ungrouped */}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-widest text-amber-200/60 mb-1">
                Ungrouped
              </div>
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

          {/* Action rail */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(245,200,80,0.18)" }}
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
            <div className="flex-1" />
            <div className="text-amber-200/80 text-sm">
              <span className="uppercase tracking-widest text-[11px]">Total · </span>
              <span className="text-amber-100 font-black text-base">{livePoints.handTotal}</span>
              <span className="text-zinc-400 text-xs ml-1">caught {livePoints.caughtNow}</span>
            </div>
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

          {error && (
            <div className="mx-auto rounded-md bg-rose-900/80 border border-rose-600 text-rose-100 text-sm px-4 py-2 mt-1">
              {error}
            </div>
          )}
        </main>

        {/* ── Right tab panel ── */}
        <aside
          className="border-l border-emerald-900/40 flex flex-col"
          style={{ background: "rgba(0,0,0,0.30)" }}
        >
          <div className="flex border-b border-emerald-900/50">
            {(["chat", "voice", "players", "points"] as RightTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-[12px] uppercase tracking-widest py-2.5 font-bold transition ${
                  activeTab === tab
                    ? "text-amber-200 border-b-2 border-amber-400 bg-emerald-900/30"
                    : "text-zinc-400 hover:text-zinc-200"
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

      {/* 5-second winner burst — pointer-events: none so the scorecard
          modal underneath stays interactive. */}
      {winnerBurstKey != null && <WinnerCelebrationBurst key={winnerBurstKey} />}
    </div>
  );
}

function WinnerCelebrationBurst() {
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1400,
    duration: 2200 + Math.random() * 1800,
    color: ["#fbbf24", "#f97316", "#ef4444", "#10b981", "#3b82f6", "#a855f7"][i % 6],
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
  const tone = myTurn ? "bg-amber-500/20 border-amber-400 text-amber-100" : "bg-zinc-800/40 border-zinc-600 text-zinc-300";
  const label = myTurn ? `YOUR TURN · ${action === "draw" ? "DRAW" : "DISCARD"}` : `${turnPlayerName.toUpperCase()} · ${action.toUpperCase()}`;
  return (
    <div className={`flex items-center gap-2 border rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-widest ${tone}`}>
      <span>{label}</span>
      {remainingSec != null && (
        <span className="font-mono text-amber-200">
          {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function OpponentCard({
  name,
  isTurn,
  handSize,
  dropped,
  eliminated,
  cumulativeScore,
  poolTarget,
}: {
  name: string;
  isTurn: boolean;
  handSize: number;
  dropped: boolean;
  eliminated: boolean;
  cumulativeScore?: number;
  poolTarget: number | null;
}) {
  const border = isTurn ? "border-amber-400" : "border-emerald-900/60";
  const opacity = eliminated || dropped ? "opacity-50" : "opacity-100";
  return (
    <div
      className={`rounded-xl px-3 py-3 border-2 ${border} ${opacity}`}
      style={{ background: "linear-gradient(180deg, rgba(8,32,22,0.85) 0%, rgba(4,17,11,0.85) 100%)" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-amber-700/40 flex items-center justify-center font-black text-amber-100">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-zinc-100 text-sm truncate">{name}</div>
          <div className="text-[11px] text-zinc-400">
            {dropped ? "dropped" : eliminated ? "eliminated" : `${handSize} cards`}
          </div>
        </div>
      </div>
      {poolTarget != null && cumulativeScore != null && (
        <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-rose-500"
            style={{ width: `${Math.min(100, (cumulativeScore / poolTarget) * 100)}%` }}
          />
        </div>
      )}
      {poolTarget != null && cumulativeScore != null && (
        <div className="text-[10px] text-zinc-500 mt-1 text-right">
          {cumulativeScore} / {poolTarget}
        </div>
      )}
    </div>
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
      className={`relative w-[80px] h-[110px] rounded-lg transition ${canDraw ? "cursor-pointer hover:-translate-y-1" : "cursor-not-allowed opacity-70"}`}
      style={{
        background:
          "repeating-linear-gradient(45deg, #9b1c1c 0 6px, #7a1414 6px 12px)",
        border: "2px solid #fbbf24",
        boxShadow: canDraw ? "0 0 24px rgba(251,191,36,0.45)" : "0 4px 10px rgba(0,0,0,0.5)",
      }}
      title="Draw from closed deck (D)"
    >
      <div className="absolute inset-0 flex items-center justify-center text-amber-200 font-black text-lg">
        {count}
      </div>
      <div className="absolute -bottom-5 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-zinc-400">
        Closed · D
      </div>
    </button>
  );
}

function WildJokerDisplay({ card }: { card: CardType }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-md p-1"
        style={{
          background: "linear-gradient(180deg, #a16207 0%, #78350f 100%)",
          border: "1px solid #fbbf24",
        }}
      >
        <PlayingCard card={card} small />
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-amber-200/80">
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
        className={`relative w-[80px] h-[110px] rounded-lg flex items-center justify-center transition ${dragOver ? "ring-4 ring-rose-400" : ""}`}
        style={{
          background: top ? "transparent" : "rgba(255,255,255,0.05)",
          border: dragOver ? "2px solid #fb7185" : "2px dashed rgba(245,200,80,0.4)",
          boxShadow: dragOver ? "0 0 24px rgba(244,114,182,0.55)" : undefined,
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
          <div className="text-zinc-500 text-xs">empty</div>
        )}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-amber-200/80">
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
        className={`w-[80px] h-[110px] rounded-lg flex flex-col items-center justify-center transition ${dragOver ? "ring-4 ring-amber-400" : ""}`}
        style={{
          background: "rgba(245,200,80,0.08)",
          border: dragOver ? "2px solid #fbbf24" : "2px dashed rgba(245,200,80,0.45)",
          boxShadow: dragOver ? "0 0 24px rgba(251,191,36,0.55)" : undefined,
        }}
      >
        <div className="text-[20px]">🏁</div>
        <div className="text-[9px] uppercase tracking-widest text-amber-200/80 mt-1 text-center px-1">
          Finish<br />Slot
        </div>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-amber-200/80">
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
  const labelColor = cls?.color ?? "#a3a3a3";
  return (
    <div
      data-rummy-drop={`group:${groupId}`}
      className={`rounded-lg px-2 py-2 transition ${dragOver ? "ring-2 ring-amber-300" : ""}`}
      style={{
        background: dragOver ? "rgba(251,191,36,0.15)" : "rgba(0,0,0,0.25)",
        border: `1px solid ${labelColor}55`,
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
          className="text-zinc-400 hover:text-rose-400 text-[11px]"
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
      className={`rounded-lg px-2 py-2 min-h-[90px] transition ${dragOver ? "ring-2 ring-amber-300" : ""}`}
      style={{
        background: dragOver ? "rgba(251,191,36,0.12)" : "rgba(0,0,0,0.30)",
        border: "1.5px dashed rgba(245,200,80,0.30)",
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
          <div className="text-zinc-500 italic text-sm px-2 py-4">
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
          ? "rgba(120,120,120,0.18)"
          : active ? "rgba(16,185,129,0.45)" : "rgba(16,185,129,0.15)",
        border: atCap
          ? "2px dashed rgba(180,180,180,0.55)"
          : active ? "2px dashed #34d399" : "2px dashed rgba(16,185,129,0.5)",
        color: atCap ? "rgba(220,220,220,0.6)" : "#d1fae5",
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
      ? "bg-amber-500 hover:bg-amber-400 text-zinc-900 border-amber-300"
      : variant === "warn"
      ? "bg-rose-700 hover:bg-rose-600 text-rose-50 border-rose-400"
      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-600";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md border font-black text-[12px] tracking-wider uppercase transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${palette}`}
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
      <div className="rounded-lg bg-emerald-950/60 p-3 border border-emerald-900/60">
        <div className="text-[11px] uppercase tracking-widest text-amber-200/70">Live Points</div>
        <div className="flex justify-between mt-1">
          <span>Hand total</span><span className="font-mono">{livePoints.handTotal}</span>
        </div>
        <div className="flex justify-between">
          <span>If caught now</span><span className="font-mono">{livePoints.caughtNow}</span>
        </div>
        <div className="flex justify-between">
          <span>If you drop</span><span className="font-mono">{livePoints.dropNow}</span>
        </div>
        <div className="flex justify-between">
          <span>Pure protected</span>
          <span className={livePoints.protectedByPure ? "text-emerald-400" : "text-rose-300"}>
            {livePoints.protectedByPure ? "yes" : "no"}
          </span>
        </div>
      </div>
      <div className="rounded-lg bg-emerald-950/60 p-3 border border-emerald-900/60">
        <div className="text-[11px] uppercase tracking-widest text-amber-200/70">Declare Check</div>
        <div className="mt-1">
          {finishReadiness.ready ? (
            <span className="text-emerald-300 font-bold">Ready to declare</span>
          ) : (
            <ul className="list-disc list-inside text-rose-200 text-xs space-y-0.5">
              {finishReadiness.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      </div>
      {state.matchMode !== "single" && (
        <div className="rounded-lg bg-emerald-950/60 p-3 border border-emerald-900/60">
          <div className="text-[11px] uppercase tracking-widest text-amber-200/70 mb-1">
            Pool Standings
          </div>
          {state.playerOrder.map((id) => (
            <div key={id} className="flex justify-between text-xs">
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
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-6 max-w-md mx-4">
        <div className="text-lg font-black text-amber-200 mb-2">{title}</div>
        <div className="text-zinc-300 text-sm mb-5">{body}</div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-rose-700 hover:bg-rose-600 px-4 py-2 text-sm font-bold text-rose-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
