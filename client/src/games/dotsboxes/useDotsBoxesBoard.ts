import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  DotsBoxesPublicState,
  Player,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { penFor, type Pen } from "./dotsboxes-shared";

/**
 * Shared prop contract for the Dots & Boxes board picker and both layout
 * shells. The shells now render an InlineRoomRail (chat/players/voice/
 * reactions) straight off `messages`/`roomCode`/`roomPhase`; the hook itself
 * doesn't consume them, but they ride the same bag so the picker can splat the
 * full prop set through unchanged.
 */
export interface DotsBoxesBoardProps {
  state: DotsBoxesPublicState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
}

/** Everything both shells need to render. Pure data + handlers, no JSX. */
export interface DotsBoxesBoardModel {
  state: DotsBoxesPublicState;
  size: number;
  boxesPerSide: number;
  myTurn: boolean;
  canPlay: boolean;
  /** Cell pitch in px — scaled per tier via the hook's `cellScale` arg. */
  cellPx: number;
  penOf: Record<string, Pen>;
  nameOf: (id: string) => string;
  initialOf: (id: string) => string;
  /** Local player's stroke color, for the hover preview. */
  selfPenColor?: string;
  drawnH: Set<string>;
  drawnV: Set<string>;
  /** Edge → owner lookups. Currently unreferenced by the render (see note
   *  in the hook) but kept on the model for parity with the original. */
  hOwner: Map<string, string>;
  vOwner: Map<string, string>;
  boxOwner: Map<string, string>;
  bonusBanner: { id: number; pid: string } | null;
  error: string | null;
  reportDismissed: boolean;
  setReportDismissed: (v: boolean) => void;
  drawLine: (kind: "h" | "v", r: number, c: number) => void;
}

/**
 * All Dots & Boxes board logic — state, effects, socket emits, derived
 * memos — lifted out of the single legacy component so the mobile and
 * desktop shells can share it. Call this EXACTLY ONCE, from whichever shell
 * the picker mounts (never both, or the haptics subscription doubles up).
 *
 * @param cellScale Multiplier on the base cell pitch. Mobile passes the
 *   default (1) for the compact 64/48/38 sizing; desktop passes ~1.4 to
 *   genuinely enlarge the board instead of just stretching the mobile one.
 */
export function useDotsBoxesBoard(
  props: DotsBoxesBoardProps,
  cellScale = 1,
): DotsBoxesBoardModel {
  const { state, players, selfId } = props;
  const size = state.options.boardSize;
  const boxesPerSide = size - 1;
  const myTurn = state.turnPlayerId === selfId;
  const canPlay = myTurn && state.phase === "playing";

  // Same turn cue as every other BHALYAM board — fires once per
  // transition into the local player's turn.
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  // End-of-round scorecard dismissed flag. Re-opens automatically when
  // the phase flips back to "playing" (rematch).
  const [reportDismissed, setReportDismissed] = useState(false);
  useEffect(() => {
    if (state.phase === "playing") setReportDismissed(false);
  }, [state.phase]);

  // Player → pen and initial.
  const penOf = useMemo(() => {
    const map: Record<string, Pen> = {};
    state.playerOrder.forEach((pid, idx) => {
      map[pid] = penFor(idx);
    });
    return map;
  }, [state.playerOrder]);
  const nameOf = (id: string): string =>
    players.find((p) => p.id === id)?.name ?? "?";
  const initialOf = (id: string): string =>
    (nameOf(id).trim().charAt(0) || "?").toUpperCase();

  // Lookup sets — used to check whether each candidate line is already drawn.
  const drawnH = useMemo(() => {
    const s = new Set<string>();
    for (const l of state.hLines) s.add(`${l.r},${l.c}`);
    return s;
  }, [state.hLines]);
  const drawnV = useMemo(() => {
    const s = new Set<string>();
    for (const l of state.vLines) s.add(`${l.r},${l.c}`);
    return s;
  }, [state.vLines]);
  const hOwner = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of state.hLines) m.set(`${l.r},${l.c}`, l.playerId);
    return m;
  }, [state.hLines]);
  const vOwner = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of state.vLines) m.set(`${l.r},${l.c}`, l.playerId);
    return m;
  }, [state.vLines]);
  const boxOwner = useMemo(() => {
    const m = new Map<string, string>();
    for (const cl of state.claims) m.set(`${cl.r},${cl.c}`, cl.ownerId);
    return m;
  }, [state.claims]);

  /* ─── "Bonus move!" hint when the last move closed a box ─── */
  const [bonusBanner, setBonusBanner] = useState<{ id: number; pid: string } | null>(null);
  const prevMoveCount = useRef(0);
  useEffect(() => {
    if (state.moveCount === prevMoveCount.current) return;
    prevMoveCount.current = state.moveCount;
    if (state.lastMoveScored) {
      setBonusBanner({ id: Date.now(), pid: state.turnPlayerId });
      const t = window.setTimeout(() => setBonusBanner(null), 1500);
      return () => window.clearTimeout(t);
    }
  }, [state.moveCount, state.lastMoveScored, state.turnPlayerId]);

  /* ─── Move dispatch ─── */
  const [error, setError] = useState<string | null>(null);
  function drawLine(kind: "h" | "v", r: number, c: number) {
    if (!canPlay) return;
    const key = `${r},${c}`;
    if ((kind === "h" ? drawnH : drawnV).has(key)) return;
    // playerId is passed for pass-and-play proxying.
    getSocket().emit("game:move", {
      type: "draw",
      data: { kind, r, c },
      playerId: selfId ?? undefined,
    });
    setError(null);
  }

  /* ─── Board geometry ─── */
  // Base cell size fits mobile portrait (9x9 dots = 8 cells); `cellScale`
  // lets the desktop shell genuinely enlarge it rather than stretch.
  const cellPx = useMemo(() => {
    const base = size === 5 ? 64 : size === 7 ? 48 : 38; // 9
    return Math.round(base * cellScale);
  }, [size, cellScale]);

  const selfPenColor = selfId ? penOf[selfId]?.color : undefined;

  return {
    state,
    size,
    boxesPerSide,
    myTurn,
    canPlay,
    cellPx,
    penOf,
    nameOf,
    initialOf,
    selfPenColor,
    drawnH,
    drawnV,
    hOwner,
    vOwner,
    boxOwner,
    bonusBanner,
    error,
    reportDismissed,
    setReportDismissed,
    drawLine,
  };
}
