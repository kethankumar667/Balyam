import { useCallback, useEffect, useState } from "react";
import { getSocket } from "../../lib/socket";
import type { TicTacToePublicState } from "@shared/types.js";

/**
 * How long a sent move keeps the board locked while waiting for the server.
 * A safety net only — the normal unlock is the next authoritative state, and a
 * rejection unlocks immediately.
 */
export const MOVE_LOCK_TIMEOUT_MS = 4_000;

interface UseTicTacToeMoveArgs {
  state: TicTacToePublicState;
  /** The seat this device is acting as. On Pass & Play that is the local seat on turn. */
  selfId: string;
}

/**
 * Sends a placement and guards against double-taps while it is in flight.
 *
 * The lock used to reset only when the game state changed. A move the server
 * rejected (or one lost to a dropped connection) changes nothing, so in an
 * untimed game the player stayed locked out for good. Now the lock also clears
 * when the server answers with an error, and after a timeout.
 */
export function useTicTacToeMove({ state, selfId }: UseTicTacToeMoveArgs) {
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
    const t = window.setTimeout(() => setIsPending(false), MOVE_LOCK_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [isPending]);

  /** Returns whether a move was actually sent, so callers can gate sounds and haptics on it. */
  const placeMark = useCallback(
    (cellIndex: number): boolean => {
      if (!isMyTurn || isPending) return false;
      if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) return false;
      if (state.grid[cellIndex] !== null) return false;
      setIsPending(true);
      getSocket().emit("game:move", { type: "place", data: { cellIndex }, playerId: selfId });
      return true;
    },
    [isMyTurn, isPending, selfId, state.grid]
  );

  return { isPending, isMyTurn, placeMark };
}
