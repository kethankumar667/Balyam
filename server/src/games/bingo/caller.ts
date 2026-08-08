import { shuffleArray } from "./board.js";

/** Shuffled 1-25 pool */
export function createCallPool(rng: () => number = Math.random): number[] {
  const pool: number[] = Array.from({ length: 25 }, (_, i) => i + 1);
  return shuffleArray(pool, rng);
}
