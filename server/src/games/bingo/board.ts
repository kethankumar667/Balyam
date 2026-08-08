import type { BingoBoard, BingoCell } from "@shared/types.js";

/** Fisher-Yates shuffle helper */
export function shuffleArray<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a 5x5 Bingo board containing numbers 1 to 25 shuffled randomly.
 */
export function generateBoard(rng: () => number = Math.random): BingoBoard {
  const pool: number[] = Array.from({ length: 25 }, (_, i) => i + 1);
  const shuffled = shuffleArray(pool, rng);
  return shuffled.map((val, idx) => ({
    index: idx,
    value: val,
    marked: false,
  }));
}

export function boardFingerprint(board: BingoBoard): string {
  return board.map((c) => c.value).join(",");
}

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
