/**
 * Snakes & Ladders — board geometry.
 *
 * Pure functions only: the 10×10 boustrophedon grid (square 1 bottom-left,
 * rows alternate direction), where a token sits, and how a crowded square fans
 * its tokens out. Everything is in the SVG's 100-wide user space; the START tray
 * sits below the grid.
 */

export const BOARD_SIZE = 100;
export const CELL = BOARD_SIZE / 10;
/** Vertical centre of the START tray, in the same user space. */
export const START_ZONE_Y = 107.7;
/** Full viewBox height: the grid plus the START tray. */
export const VIEWBOX_HEIGHT = 112;

export interface CellInfo {
  x: number;
  y: number;
  row: number;
  col: number;
  /** Chequer tone, 0 or 1, so alternating tiles can take two tints. */
  tone: 0 | 1;
}

export function cellInfo(n: number): CellInfo {
  const idx = n - 1;
  const row = Math.floor(idx / 10);
  let col = idx % 10;
  if (row % 2 === 1) col = 9 - col;
  return {
    x: col * CELL + CELL / 2,
    y: (9 - row) * CELL + CELL / 2,
    row,
    col,
    tone: ((row + col) % 2) as 0 | 1,
  };
}

/** Centre of a token's resting spot; `n <= 0` is the START tray. */
export function squareCenter(n: number, slot: number, totalAtStart: number): { x: number; y: number } {
  if (n <= 0) {
    // Spread up to 10 spots evenly across the START tray (x in [8, 92]).
    const span = totalAtStart > 1 ? 84 / (totalAtStart - 1) : 0;
    const startX = totalAtStart > 1 ? 8 : 50;
    return { x: startX + slot * span, y: START_ZONE_Y };
  }
  const info = cellInfo(n);
  return { x: info.x, y: info.y };
}

/** Offset and radius for one token among `total` sharing a square. */
export function tokenFanOffset(slot: number, total: number): { dx: number; dy: number; r: number } {
  if (total <= 1) return { dx: 0, dy: 0, r: 2.6 };
  const angle = (slot / total) * Math.PI * 2 - Math.PI / 2;
  const ringR = total <= 4 ? 1.9 : total <= 6 ? 2.1 : 2.4;
  const tokenR = total <= 4 ? 2.1 : total <= 7 ? 1.6 : 1.35;
  return { dx: Math.cos(angle) * ringR, dy: Math.sin(angle) * ringR, r: tokenR };
}
