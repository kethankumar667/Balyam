import type { UnoCard } from "@shared/types";

/**
 * Pure client-side mirror of UnoEngine's private cardPoints/awardRoundPoints
 * (server/src/games/uno/UnoEngine.ts) — the server remains the sole source
 * of truth for `state.scores` on the wire. This exists for display-only
 * uses (e.g. "your hand is worth N points" previews in a future results
 * screen, UNO_GAME_PLAN.md §7.9) where recomputing from the visible hand is
 * more convenient than round-tripping to the server.
 */

/** Point value of a single card per the official table (Volume 4 §20). */
export function cardPoints(card: UnoCard): number {
  if (card.rank === "Wild" || card.rank === "Wild+4") return 50;
  if (card.rank === "Skip" || card.rank === "Reverse" || card.rank === "+2") return 20;
  return Number(card.rank);
}

/** Total point value of a hand — what its owner would hand the winner if the round ended now. */
export function handPoints(hand: UnoCard[]): number {
  return hand.reduce((sum, card) => sum + cardPoints(card), 0);
}
