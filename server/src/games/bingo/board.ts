import type { BingoBoard, BingoCell, BingoLetter } from "@shared/types.js";

/** Inclusive 1-75 range owned by each column letter (75-ball American Bingo). */
const COLUMN_RANGES: Record<BingoLetter, [number, number]> = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};
const LETTERS: BingoLetter[] = ["B", "I", "N", "G", "O"];

/** Fisher-Yates. Shared by board generation and the call-pool shuffle in
 * caller.ts - both need "shuffle these numbers", nothing else. */
export function shuffleArray<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deterministic-shape, randomized-content 5x5 board. Column c holds 5
 * unique numbers drawn from that column's 15-number range, sampled without
 * replacement (Volume 4-equivalent: docs/bingo/roadmap.md §Board Generation
 * Logic). Center cell (index 12) is always FREE and pre-marked.
 */
export function generateBoard(rng: () => number = Math.random): BingoBoard {
  const cells: BingoCell[] = new Array(25);
  for (let col = 0; col < 5; col++) {
    const letter = LETTERS[col];
    const [lo, hi] = COLUMN_RANGES[letter];
    const pool: number[] = [];
    for (let v = lo; v <= hi; v++) pool.push(v);
    const picked = shuffleArray(pool, rng).slice(0, 5);
    for (let row = 0; row < 5; row++) {
      const index = row * 5 + col;
      cells[index] =
        index === 12
          ? { index, letter, value: null, free: true, marked: true }
          : { index, letter, value: picked[row], free: false, marked: false };
    }
  }
  return cells;
}

/** Every non-free value in index order - two boards with the same
 * fingerprint are the same board. Used to keep every board in a room
 * unique (see generateUniqueBoard). */
export function boardFingerprint(board: BingoBoard): string {
  return board.map((c) => c.value ?? "F").join(",");
}

/**
 * Generate a board guaranteed distinct (by fingerprint) from every
 * fingerprint already in `existingFingerprints`. Falls back to the last
 * attempt after 20 tries - collision probability is astronomically low
 * with 75 numbers split 5 ways into pools of 15, so this is
 * belt-and-suspenders, not a real backoff loop.
 */
export function generateUniqueBoard(
  existingFingerprints: ReadonlySet<string>,
  rng: () => number = Math.random,
): BingoBoard {
  let board = generateBoard(rng);
  for (let attempt = 0; attempt < 20 && existingFingerprints.has(boardFingerprint(board)); attempt++) {
    board = generateBoard(rng);
  }
  return board;
}
