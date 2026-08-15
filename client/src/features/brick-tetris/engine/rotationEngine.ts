import type { ActivePiece, BoardMatrix, Position } from "../types";
import { rotateMatrixCCW, rotateMatrixCW } from "../utils/matrixMath";
import { checkCollision } from "./collisionEngine";
import {
  I_WALL_KICKS,
  JLSTZ_WALL_KICKS,
  PENTIX_WALL_KICKS,
  type RotationTransition,
} from "../constants/wallKickData";

export function tryRotatePiece(
  board: BoardMatrix,
  piece: ActivePiece,
  direction: "CW" | "CCW",
): ActivePiece | null {
  const currentRotation = piece.rotation;
  const targetRotation =
    direction === "CW" ? (currentRotation + 1) % 4 : (currentRotation + 3) % 4;

  const rotatedMatrix =
    direction === "CW" ? rotateMatrixCW(piece.matrix) : rotateMatrixCCW(piece.matrix);

  const transitionKey: RotationTransition = `${currentRotation}->${targetRotation}`;

  let kickOffsets: readonly Position[] = [{ x: 0, y: 0 }];

  if (piece.type === "O") {
    // O piece never kicks or changes visually
    kickOffsets = [{ x: 0, y: 0 }];
  } else if (piece.type === "I") {
    kickOffsets = I_WALL_KICKS[transitionKey] || [{ x: 0, y: 0 }];
  } else if (piece.matrix.length === 5) {
    kickOffsets = PENTIX_WALL_KICKS[transitionKey] || [{ x: 0, y: 0 }];
  } else {
    kickOffsets = JLSTZ_WALL_KICKS[transitionKey] || [{ x: 0, y: 0 }];
  }

  for (const offset of kickOffsets) {
    const testPos: Position = {
      x: piece.position.x + offset.x,
      y: piece.position.y - offset.y, // Inverting SRS Y coordinates for standard screen layout
    };

    if (!checkCollision(board, rotatedMatrix, testPos)) {
      return {
        ...piece,
        rotation: targetRotation,
        matrix: rotatedMatrix,
        position: testPos,
      };
    }
  }

  // All wall-kick attempts failed
  return null;
}
