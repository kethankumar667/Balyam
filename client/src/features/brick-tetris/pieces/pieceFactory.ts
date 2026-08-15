import type { ActivePiece, PieceType, PieceMatrix, Position } from "../types";
import { CLASSIC_PIECE_MATRICES } from "./classicPieces";
import { PENTIX_PIECE_MATRICES } from "./pentixPieces";
import { BOARD_WIDTH } from "../constants/gameConstants";

export function getPieceMatrix(type: PieceType): PieceMatrix {
  if (type in CLASSIC_PIECE_MATRICES) {
    return CLASSIC_PIECE_MATRICES[type as keyof typeof CLASSIC_PIECE_MATRICES];
  }
  return PENTIX_PIECE_MATRICES[type as keyof typeof PENTIX_PIECE_MATRICES];
}

export function createActivePiece(type: PieceType): ActivePiece {
  const matrix = getPieceMatrix(type);
  const size = matrix.length;
  const initialX = Math.floor((BOARD_WIDTH - size) / 2);
  const initialY = 0;

  return {
    type,
    rotation: 0,
    position: { x: initialX, y: initialY },
    matrix,
  };
}
