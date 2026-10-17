import { useCallback, useEffect, useState } from "react";
import { getSocket } from "../../lib/socket";
import type { VamanaPublicState } from "@shared/types.js";
import { VAMANA_PIT_COUNT } from "@shared/types.js";
import { seatOfPit } from "./vamanaLayout";

/**
 * How long a sent move keeps the board locked while waiting for the server. A safety net only — the
 * normal unlock is the next authoritative state, and a rejection unlocks immediately.
 */
export const MOVE_LOCK_TIMEOUT_MS = 4_000;

interface UseVamanaMoveArgs {
  state: VamanaPublicState;
  /** The seat this device is acting as. On Pass & Play that is the local seat on turn. */
  selfId: string;
}

/**
 * Sends a sow and guards against double-taps while it is in flight. It does NOT decide whether a move
 * is good or even fully legal — the server does — it only refuses what is plainly impossible from
 * this seat (not its turn, not its row, an empty pit) so a stray tap never costs a round trip.
 */
export function useVamanaMove({ state, selfId }: UseVamanaMoveArgs) {
  const [isPending, setIsPending] = useState(false);
  const isMyTurn = selfId !== "" && state.phase === "playing" && state.turnPlayerId === selfId;

  // The authoritative state moved on: whatever we sent has been dealt with.
  useEffect(() => {
    setIsPending(false);
  }, [state.turnPlayerId, state.moveCount]);

  // The server refused something: give the turn back.
  useEffect(() => {
    const socket = getSocket();
    const unlock = () => setIsPending(false);
    socket.on("game:error", unlock);
    return () => {
      socket.off("game:error", unlock);
    };
  }, []);

  // Silence: give the turn back rather than freeze the board.
  useEffect(() => {
    if (!isPending) return;
    const timer = window.setTimeout(() => setIsPending(false), MOVE_LOCK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isPending]);

  /** True when a pit could be sown from this seat right now (before any server round trip). */
  const canSow = useCallback(
    (pit: number): boolean => {
      if (!isMyTurn || isPending) return false;
      if (!Number.isInteger(pit) || pit < 0 || pit >= VAMANA_PIT_COUNT) return false;
      if (seatOfPit(pit) !== (state.playerOrder[1] === selfId ? 1 : 0)) return false;
      return (state.pits[pit] ?? 0) > 0;
    },
    [isMyTurn, isPending, selfId, state.pits, state.playerOrder],
  );

  /** Returns whether a move was actually sent, so callers can gate sounds and haptics on it. */
  const sowPit = useCallback(
    (pit: number): boolean => {
      if (!canSow(pit)) return false;
      setIsPending(true);
      getSocket().emit("game:move", { type: "sow", data: { pit }, playerId: selfId });
      return true;
    },
    [canSow, selfId],
  );

  return { isPending, isMyTurn, canSow, sowPit };
}
