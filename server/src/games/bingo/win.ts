import type { BingoBoard, BingoLetter } from "@shared/types.js";

const ALL_LINES: readonly (readonly number[])[] = [
  // 5 Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // 5 Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // 2 Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

const BINGO_LETTERS: BingoLetter[] = ["B", "I", "N", "G", "O"];

export interface LineCheckResult {
  completedLinesCount: number;
  completedLetters: BingoLetter[];
  canClaimBingo: boolean;
}

export function evaluateBoardLines(board: BingoBoard, calledNumbers: ReadonlySet<number>): LineCheckResult {
  const markedIndices = new Set<number>();
  for (const cell of board) {
    if (calledNumbers.has(cell.value)) {
      markedIndices.add(cell.index);
    }
  }

  let count = 0;
  for (const line of ALL_LINES) {
    if (line.every((idx) => markedIndices.has(idx))) {
      count++;
    }
  }

  const lettersCount = Math.min(count, 5);
  const completedLetters = BINGO_LETTERS.slice(0, lettersCount);
  const canClaimBingo = count >= 5;

  return {
    completedLinesCount: count,
    completedLetters,
    canClaimBingo,
  };
}
