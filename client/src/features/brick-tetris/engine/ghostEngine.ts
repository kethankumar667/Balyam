import type { ActivePiece, BoardMatrix, Position } from "../types";
import { checkCollision } from "./collisionEngine";

/**
 * Calculates the lowest valid landing position for the active piece (Ghost position).
 */
export function getGhostPosition(board: BoardMatrix, piece: ActivePiece): Position {
  let ghostY = piece.position.y;

  while (!checkCollision(board, piece.matrix, { x: piece.position.x, y: ghostY + 1 })) {
    ghostY++;
  }

  return {
    x: piece.position.x,
    y: ghostY,
  };
}
