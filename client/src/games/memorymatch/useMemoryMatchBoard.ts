import { useEffect, useMemo, useState } from "react";
import type {
  MemoryMatchPublicState,
  Player,
  ChatMessage,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useTurnHaptics } from "../../hooks/useHaptics";

/**
 * Shared props for every Memory Match shell (picker, mobile, desktop).
 * Identical to what Room.tsx hands the picker — the picker forwards them
 * verbatim, so all three components consume the same shape.
 */
export interface MemoryMatchBoardProps {
  state: MemoryMatchPublicState;
  players: Player[];
  selfId: string | null;
  roomCode: string;
  messages: ChatMessage[];
  roomPhase: string;
}

/**
 * useMemoryMatchBoard — the entire board's logic, layout-free.
 *
 * Holds every piece of state, the socket emit, the turn haptic cue and all
 * derived lookups the mobile and desktop shells need. Mounted exactly once
 * (in whichever shell the picker selects) so the flip socket and the haptic
 * subscription never double-fire.
 */
export function useMemoryMatchBoard({
  state,
  players,
  selfId,
}: MemoryMatchBoardProps) {
  const myTurn = state.turnPlayerId === selfId;
  const canPlay = myTurn && state.phase === "playing";

  // Turn-in haptic cue (fires once when it becomes the local player's turn).
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  // Dismiss end-of-game panel on phase reset (rematch).
  const [panelDismissed, setPanelDismissed] = useState(false);
  useEffect(() => {
    if (state.phase === "playing") setPanelDismissed(false);
  }, [state.phase]);

  // Player name lookup.
  const nameOf = (id: string): string =>
    players.find((p) => p.id === id)?.name ?? "?";

  // Pre-compute flipped set for fast O(1) lookup.
  const flippedSet = useMemo(() => new Set(state.flipped), [state.flipped]);

  // Index the board once per update so per-card lookups are O(1) instead of
  // re-scanning the whole array for every cell on every render.
  const cardById = useMemo(() => {
    const map = new Map<number, MemoryMatchPublicState["board"][number]>();
    for (const card of state.board) map.set(card.id, card);
    return map;
  }, [state.board]);

  // Card display state: each card is face-up when matched (owned) or flipped.
  const cardFaceUp = (cardId: number): boolean => {
    const card = cardById.get(cardId);
    if (!card) return false;
    return card.ownerId !== null || flippedSet.has(cardId);
  };

  // Card is flippable: it's our turn, fewer than 2 are up, and it's down.
  const canFlipCard = (cardId: number): boolean =>
    canPlay && state.flipped.length < 2 && !cardFaceUp(cardId);

  // Card is mid-reveal: revealing both cards before the flip-back.
  const isCardFlipping = (cardId: number): boolean =>
    state.phase === "reveal" && flippedSet.has(cardId);

  // Move dispatch: emit a flip move. Only during the playing phase and only
  // when it is the current player's turn.
  function flipCard(cardId: number) {
    if (!canPlay) return;
    const card = cardById.get(cardId);
    if (!card) return;
    // Reject if already owned, already flipped, or we already have 2 flipped.
    if (card.ownerId !== null || flippedSet.has(cardId) || state.flipped.length >= 2)
      return;

    getSocket().emit("game:move", {
      type: "flip",
      data: { cardId },
      playerId: selfId ?? undefined,
    });
  }

  const boardSize = state.options.boardSize;

  const isWinner = state.winnerId === selfId;
  const isOver = state.phase === "finished";

  return {
    myTurn,
    canPlay,
    nameOf,
    cardFaceUp,
    canFlipCard,
    isCardFlipping,
    flipCard,
    boardSize,
    isWinner,
    isOver,
    panelDismissed,
    setPanelDismissed,
  };
}
