import { useCallback, useEffect, useState } from "react";
import { getSocket } from "../../lib/socket";
import type { Connect4PublicState } from "@shared/types.js";

export const MOVE_LOCK_TIMEOUT_MS = 4_000;

interface UseConnect4MoveArgs {
  state: Connect4PublicState;
  selfId: string;
}

/**
 * Sends a disc drop and guards against double-taps while it is in flight.
 */
export function useConnect4Move({ state, selfId }: UseConnect4MoveArgs) {
  const [isPending, setIsPending] = useState(false);
  const isMyTurn = selfId !== "" && state.phase === "playing" && state.turnPlayerId === selfId;

  // Authoritative state moved on: whatever we sent has been processed.
  useEffect(() => {
    setIsPending(false);
  }, [state.turnPlayerId, state.moveCount]);

  // Server rejected the move: give the turn back.
  useEffect(() => {
    const socket = getSocket();
    const unlock = () => setIsPending(false);
    socket.on("game:error", unlock);
    return () => {
      socket.off("game:error", unlock);
    };
  }, []);

  // Safety net: unlock if no response arrives within timeout.
  useEffect(() => {
    if (!isPending) return;
    const t = window.setTimeout(() => setIsPending(false), MOVE_LOCK_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [isPending]);

  /** Returns true if the move was emitted. */
  const dropDisc = useCallback(
    (column: number): boolean => {
      if (!isMyTurn || isPending) return false;
      if (!Number.isInteger(column) || column < 0 || column > 6) return false;
      // Check column is not full (row 0 is top row)
      if (state.grid[0]?.[column] !== null) return false;

      setIsPending(true);
      getSocket().emit("game:move", { type: "drop", data: { column }, playerId: selfId });
      return true;
    },
    [isMyTurn, isPending, selfId, state.grid]
  );

  return { isPending, isMyTurn, dropDisc };
}
