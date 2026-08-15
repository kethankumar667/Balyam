import type { BoardMatrix, CellValue } from "../types";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";

/**
 * Finds all row indices that are fully populated (all 1s).
 */
export function getCompletedLines(board: BoardMatrix): number[] {
  const completed: number[] = [];

  for (let r = 0; r < BOARD_HEIGHT; r++) {
    if (board[r].every((cell) => cell === 1)) {
      completed.push(r);
    }
  }

  return completed;
}

/**
 * Creates a new board with the specified lines removed and new empty rows added at the top.
 */
export function clearLinesFromBoard(board: BoardMatrix, linesToClear: number[]): BoardMatrix {
  if (linesToClear.length === 0) return board;

  const linesSet = new Set(linesToClear);
  const remainingRows = board.filter((_, idx) => !linesSet.has(idx));
  const newEmptyRowsCount = linesToClear.length;

  const newEmptyRows: BoardMatrix = Array.from({ length: newEmptyRowsCount }, () =>
    Array<CellValue>(BOARD_WIDTH).fill(0),
  );

  return [...newEmptyRows, ...remainingRows];
}
