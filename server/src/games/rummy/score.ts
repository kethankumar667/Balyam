import type { Card, Rank } from "@shared/types.js";
import { isWildJoker } from "./melds.js";

const POINTS: Record<Rank, number> = {
  A: 10, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 10, Q: 10, K: 10,
};

const HAND_CAP = 80;
const INVALID_DECLARE_PENALTY = 80;

export function pointsOfHand(cards: Card[], wildJokerRank: Rank): number {
  let total = 0;
  for (const c of cards) {
    if (isWildJoker(c, wildJokerRank)) continue;
    total += POINTS[c.rank];
  }
  return Math.min(total, HAND_CAP);
}

export { HAND_CAP, INVALID_DECLARE_PENALTY };
