import type { Connect4Cell, Connect4Disc } from "@shared/types.js";
import { CONNECT4_COLUMNS, CONNECT4_ROWS, CONNECT4_WIN_LENGTH } from "@shared/types.js";

/** grid[row][col]; row 0 is the TOP row, so a dropped disc settles at the highest free row index. */
export type Grid = (Connect4Disc | null)[][];

export function createGrid(): Grid {
  return Array.from({ length: CONNECT4_ROWS }, () => Array<Connect4Disc | null>(CONNECT4_COLUMNS).fill(null));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

/** True only for a whole number in 0..6: rejects NaN, Infinity, fractions, strings, null and everything else. */
export function isValidColumn(column: unknown): column is number {
  return typeof column === "number" && Number.isInteger(column) && column >= 0 && column < CONNECT4_COLUMNS;
}

/** The row a disc dropped into `column` settles in, or null for an invalid or full column. */
export function landingRow(grid: Grid, column: number): number | null {
  if (!isValidColumn(column)) return null;
  for (let row = CONNECT4_ROWS - 1; row >= 0; row--) {
    if (grid[row][column] === null) return row;
  }
  return null;
}

export function legalColumns(grid: Grid): number[] {
  const columns: number[] = [];
  for (let column = 0; column < CONNECT4_COLUMNS; column++) {
    if (landingRow(grid, column) !== null) columns.push(column);
  }
  return columns;
}

/** Places a disc without touching `grid`. Null when the column is invalid or full. */
export function withDisc(grid: Grid, column: number, disc: Connect4Disc): { grid: Grid; row: number } | null {
  const row = landingRow(grid, column);
  if (row === null) return null;
  const next = cloneGrid(grid);
  next[row][column] = disc;
  return { grid: next, row };
}

export function isFull(grid: Grid): boolean {
  return grid.every((row) => row.every((cell) => cell !== null));
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // descending diagonal
  [1, -1], // ascending diagonal
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < CONNECT4_ROWS && col >= 0 && col < CONNECT4_COLUMNS;
}

/**
 * Every disc of every line of `CONNECT4_WIN_LENGTH` or more that runs through (row, col), or null
 * when the disc there completes none. A run longer than four is returned whole (five in a row
 * counts), and two lines crossing at the disc are both returned, without duplicates.
 *
 * Only lines through the given cell are examined: that is the only place a NEW four can appear
 * after a drop, and it keeps the check to a handful of comparisons per move.
 */
export function findWinningCells(grid: Grid, row: number, col: number): Connect4Cell[] | null {
  const disc = inBounds(row, col) ? grid[row][col] : null;
  if (disc === null) return null;

  const winning = new Map<string, Connect4Cell>();
  for (const [dRow, dCol] of DIRECTIONS) {
    const run: Connect4Cell[] = [{ row, col }];
    for (const sign of [1, -1]) {
      let r = row + dRow * sign;
      let c = col + dCol * sign;
      while (inBounds(r, c) && grid[r][c] === disc) {
        run.push({ row: r, col: c });
        r += dRow * sign;
        c += dCol * sign;
      }
    }
    if (run.length >= CONNECT4_WIN_LENGTH) {
      for (const cell of run) winning.set(`${cell.row},${cell.col}`, cell);
    }
  }
  return winning.size > 0 ? [...winning.values()] : null;
}
