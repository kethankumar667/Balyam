import type { BingoBoard, BingoPattern } from "@shared/types.js";

const LINES: Record<
  Exclude<BingoPattern, "fourCorners" | "fullHouse">,
  readonly number[]
> = {
  row0: [0, 1, 2, 3, 4],
  row1: [5, 6, 7, 8, 9],
  row2: [10, 11, 12, 13, 14],
  row3: [15, 16, 17, 18, 19],
  row4: [20, 21, 22, 23, 24],
  col0: [0, 5, 10, 15, 20],
  col1: [1, 6, 11, 16, 21],
  col2: [2, 7, 12, 17, 22],
  col3: [3, 8, 13, 18, 23],
  col4: [4, 9, 14, 19, 24],
  diagTL: [0, 6, 12, 18, 24],
  diagTR: [4, 8, 12, 16, 20],
};
const CORNERS: readonly number[] = [0, 4, 20, 24];

export interface WinCheck {
  valid: boolean;
  pattern?: BingoPattern;
}

/**
 * Pure, deterministic, server-only re-derivation of "which cells are
 * marked" from the board + the set of called numbers - never trusts a
 * client-reported mark. Reports the most impressive pattern when several
 * qualify at once: full house > four corners > any single line.
 */
export function validateWin(board: BingoBoard, calledNumbers: ReadonlySet<number>): WinCheck {
  const marked = new Set<number>();
  for (const cell of board) {
    if (cell.free || (cell.value !== null && calledNumbers.has(cell.value))) {
      marked.add(cell.index);
    }
  }
  if (marked.size === 25) return { valid: true, pattern: "fullHouse" };
  if (CORNERS.every((i) => marked.has(i))) return { valid: true, pattern: "fourCorners" };
  for (const [pattern, idxs] of Object.entries(LINES) as [BingoPattern, readonly number[]][]) {
    if (idxs.every((i) => marked.has(i))) return { valid: true, pattern };
  }
  return { valid: false };
}
