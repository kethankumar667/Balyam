import type { BingoLetter } from "@shared/types.js";
import { shuffleArray } from "./board.js";

const COLUMN_BOUNDARIES: ReadonlyArray<[number, number, BingoLetter]> = [
  [1, 15, "B"],
  [16, 30, "I"],
  [31, 45, "N"],
  [46, 60, "G"],
  [61, 75, "O"],
];

export function letterFor(value: number): BingoLetter {
  for (const [lo, hi, letter] of COLUMN_BOUNDARIES) {
    if (value >= lo && value <= hi) return letter;
  }
  throw new Error(`Bingo value out of the 1-75 call range: ${value}`);
}

/** A shuffled 1-75 pool with no repeats - the engine pops from the tail
 * (cheapest mutation) on every call-interval tick. */
export function createCallPool(rng: () => number = Math.random): number[] {
  const pool: number[] = [];
  for (let v = 1; v <= 75; v++) pool.push(v);
  return shuffleArray(pool, rng);
}
