import type { ActivePiece, BoardMatrix } from "../types";
import { cloneBoard } from "../utils/matrixMath";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";

/**
 * Immutably locks the active piece into the board matrix.
 */
export function lockPieceIntoBoard(board: BoardMatrix, piece: ActivePiece): BoardMatrix {
  const newBoard = cloneBoard(board);
  const size = piece.matrix.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (piece.matrix[r][c] === 1) {
        const boardX = piece.position.x + c;
        const boardY = piece.position.y + r;

        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newBoard[boardY][boardX] = 1;
        }
      }
    }
  }

  return newBoard;
}
