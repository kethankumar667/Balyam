import type { BoardMatrix, PieceMatrix, Position } from "../types";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";

/**
 * Checks if a piece matrix at a given coordinate collides with the board edges or locked blocks.
 */
export function checkCollision(
  board: BoardMatrix,
  matrix: PieceMatrix,
  position: Position,
): boolean {
  const size = matrix.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        const boardX = position.x + c;
        const boardY = position.y + r;

        // Left / Right boundary check
        if (boardX < 0 || boardX >= BOARD_WIDTH) {
          return true;
        }

        // Bottom floor boundary check
        if (boardY >= BOARD_HEIGHT) {
          return true;
        }

        // Check locked cell on board (ignore cells above ceiling)
        if (boardY >= 0 && board[boardY][boardX] === 1) {
          return true;
        }
      }
    }
  }

  return false;
}
