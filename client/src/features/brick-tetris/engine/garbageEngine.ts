import type { BoardMatrix, CellValue } from "../types";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";

/**
 * Adds garbage rows from the bottom with 1 guaranteed open hole.
 */
export function addGarbageRows(
  board: BoardMatrix,
  count: number,
  rng: () => number,
): BoardMatrix {
  if (count <= 0) return board;

  const result: BoardMatrix = [];
  const rowsToKeep = Math.max(0, BOARD_HEIGHT - count);

  // Shift existing rows up
  for (let r = count; r < BOARD_HEIGHT; r++) {
    result.push([...board[r]]);
  }

  // Generate garbage rows at the bottom
  for (let i = 0; i < count; i++) {
    const holeCol = Math.floor(rng() * BOARD_WIDTH);
    const garbageRow: CellValue[] = Array.from({ length: BOARD_WIDTH }, (_, col) =>
      col === holeCol ? 0 : 1,
    );
    result.push(garbageRow);
  }

  return result;
}
