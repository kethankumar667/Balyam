import { VAMANA_PIT_COUNT, VAMANA_PITS_PER_SIDE } from "@shared/types.js";

/**
 * Pure board geometry: where each of the 14 pits is drawn.
 *
 * Seeds travel counter-clockwise. Drawn from the viewer's seat, their own row runs along the bottom
 * left to right, then the opponent's row runs along the top right to left. In the vertical layout
 * (a phone held upright) the board is turned a quarter: the viewer's row becomes the right column,
 * running upward, and the opponent's the left column, running downward.
 *
 * Nothing here decides anything about the game — it only places what the server already said.
 */

export type VamanaOrientation = "horizontal" | "vertical";
export type VamanaSeat = 0 | 1;

export interface PitCell {
  pit: number;
  /** 0-based row and column in the grid for the chosen orientation. */
  row: number;
  col: number;
  /** True for the viewer's own row. */
  isOwn: boolean;
  /** 0..6 along the pit's own row, in the direction seeds travel. */
  indexInRow: number;
}

/** The seat a viewer draws the board from. Spectators, and anyone not seated, watch from the first seat. */
export const viewerSeatOf = (playerOrder: readonly string[], selfId: string): VamanaSeat =>
  playerOrder[1] === selfId ? 1 : 0;

export const seatOfPit = (pit: number): VamanaSeat => (pit < VAMANA_PITS_PER_SIDE ? 0 : 1);

export function gridSize(orientation: VamanaOrientation): { rows: number; cols: number } {
  return orientation === "horizontal"
    ? { rows: 2, cols: VAMANA_PITS_PER_SIDE }
    : { rows: VAMANA_PITS_PER_SIDE, cols: 2 };
}

export function pitCells(seat: VamanaSeat, orientation: VamanaOrientation): PitCell[] {
  const last = VAMANA_PITS_PER_SIDE - 1;
  return Array.from({ length: VAMANA_PIT_COUNT }, (_, pit) => {
    const isOwn = seatOfPit(pit) === seat;
    const indexInRow = pit % VAMANA_PITS_PER_SIDE;
    // Horizontal slot: own row at the bottom reading left to right, the other row above it reading right to left.
    const horizontalRow = isOwn ? 1 : 0;
    const horizontalCol = isOwn ? indexInRow : last - indexInRow;
    return orientation === "horizontal"
      ? { pit, row: horizontalRow, col: horizontalCol, isOwn, indexInRow }
      : { pit, row: last - horizontalCol, col: horizontalRow, isOwn, indexInRow };
  });
}
