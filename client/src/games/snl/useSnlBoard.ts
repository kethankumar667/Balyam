import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, CoinColor, Player, SnlState } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { resolveCoinColors, toastForEvent } from "./snl-board-shared";

/**
 * Shared props for every Snakes & Ladders shell (picker, mobile, desktop).
 * Identical to what Room.tsx hands the picker — forwarded verbatim.
 */
export interface SnlBoardProps {
  state: SnlState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
}

interface SnlToast {
  text: string;
  emoji: string;
  color: string;
}

export interface SnlBoardModel {
  myTurn: boolean;
  canRoll: boolean;
  rolling: boolean;
  toast: SnlToast | null;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  squareGroups: Map<number, string[]>;
  startCount: number;
  turnPlayer: Player | undefined;
  turnColor: CoinColor | undefined;
  doRoll: () => void;
}

/**
 * useSnlBoard — the board's entire logic, layout-free.
 *
 * Mounted exactly once (in whichever shell the picker selects) so the roll
 * socket emit, the turn-haptic cue, the dice-roll animation timer and the
 * event-toast timer never double-fire.
 */
export function useSnlBoard({ state, players, selfId }: SnlBoardProps): SnlBoardModel {
  const myTurn = state.turnPlayerId === selfId;

  // 1-second "settle" gap between consecutive rolls. The previous turn's
  // outcome (snake/ladder, dice animation, toast) needs a beat to land
  // before the next player can spam the roll button. Triggered on every
  // turnPlayerId change.
  const [rollCooldown, setRollCooldown] = useState(false);
  const prevTurnIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevTurnIdRef.current;
    prevTurnIdRef.current = state.turnPlayerId;
    if (prev !== null && prev !== state.turnPlayerId) {
      setRollCooldown(true);
      const t = window.setTimeout(() => setRollCooldown(false), 1000);
      return () => window.clearTimeout(t);
    }
  }, [state.turnPlayerId]);

  const canRoll =
    myTurn &&
    state.turnPhase === "rolling" &&
    state.phase === "playing" &&
    !rollCooldown;
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  const coinColorOf = useMemo(
    () => resolveCoinColors(state.playerOrder, players),
    [state.playerOrder, players]
  );

  const initialOf = useMemo(() => {
    const map: Record<string, string> = {};
    for (const id of state.playerOrder) {
      const p = players.find((pp) => pp.id === id);
      map[id] = (p?.name.trim().charAt(0) ?? "?").toUpperCase();
    }
    return map;
  }, [state.playerOrder, players]);

  // Group tokens by square for fanning.
  const squareGroups = useMemo(() => {
    const groups: Map<number, string[]> = new Map();
    for (const id of state.playerOrder) {
      const sq = state.positions[id] ?? 0;
      if (!groups.has(sq)) groups.set(sq, []);
      groups.get(sq)!.push(id);
    }
    return groups;
  }, [state.positions, state.playerOrder]);

  const startCount = squareGroups.get(0)?.length ?? 0;

  const [rolling, setRolling] = useState(false);
  const prevDice = useRef<number | null>(state.diceValue);
  useEffect(() => {
    // Trigger the rolling animation on ANY change to diceValue — not just
    // the first transition from null. The server now keeps the last rolled
    // value alive between turns (so the player can actually see what they
    // rolled), which means subsequent rolls go number → number rather than
    // null → number. The old condition skipped them silently.
    if (state.diceValue != null && state.diceValue !== prevDice.current) {
      setRolling(true);
      const t = setTimeout(() => setRolling(false), 700);
      prevDice.current = state.diceValue;
      return () => clearTimeout(t);
    }
    prevDice.current = state.diceValue;
  }, [state.diceValue]);

  const [toast, setToast] = useState<SnlToast | null>(null);
  const lastEventTs = useRef<number>(0);
  useEffect(() => {
    const latest = state.recentEvents[state.recentEvents.length - 1];
    if (!latest || latest.ts === lastEventTs.current) return;
    lastEventTs.current = latest.ts;
    const t = toastForEvent(latest, players);
    if (t) {
      setToast(t);
      const tid = setTimeout(() => setToast(null), 2400);
      return () => clearTimeout(tid);
    }
  }, [state.recentEvents, players]);

  function doRoll() {
    if (!canRoll) return;
    // Include playerId so the server can proxy moves when Room.tsx has
    // overridden `selfId` to a local pass-and-play seat. For normal play
    // selfId === the caller's own id and the proxy is a no-op.
    getSocket().emit("game:move", { type: "roll", playerId: selfId ?? undefined });
  }

  const turnPlayer = players.find((p) => p.id === state.turnPlayerId);
  const turnColor = coinColorOf[state.turnPlayerId];

  return {
    myTurn,
    canRoll,
    rolling,
    toast,
    coinColorOf,
    initialOf,
    squareGroups,
    startCount,
    turnPlayer,
    turnColor,
    doRoll,
  };
}
