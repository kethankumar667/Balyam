import type { CellValue, PieceMatrix, BoardMatrix } from "../types";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";

export function createEmptyBoard(): BoardMatrix {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array<CellValue>(BOARD_WIDTH).fill(0),
  );
}

export function cloneBoard(board: BoardMatrix): BoardMatrix {
  return board.map((row) => [...row]);
}

/**
 * Rotate a square matrix 90 degrees clockwise
 */
export function rotateMatrixCW(matrix: PieceMatrix): PieceMatrix {
  const n = matrix.length;
  const result: CellValue[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

/**
 * Rotate a square matrix 90 degrees counter-clockwise
 */
export function rotateMatrixCCW(matrix: PieceMatrix): PieceMatrix {
  const n = matrix.length;
  const result: CellValue[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[n - 1 - c][r] = matrix[r][c];
    }
  }
  return result;
}
