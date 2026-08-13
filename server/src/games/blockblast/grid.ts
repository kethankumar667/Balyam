import { BLOCK_CELLS, BLOCK_GRID, blockStreakMultiplier } from "@shared/types.js";
import type { BlockPiece } from "./pieces.js";

/**
 * Board arithmetic, kept out of the engine so the rules can be tested without
 * standing up a room, and so the bot and the validator provably agree on what
 * "fits" means — they call the same function.
 *
 * A grid is 64 palette indices, row-major. 0 is empty.
 */
export type Grid = number[];

export function emptyGrid(): Grid {
  return new Array<number>(BLOCK_CELLS).fill(0);
}

export function idx(r: number, c: number): number {
  return r * BLOCK_GRID + c;
}

/** Can this piece sit with its top-left at (r, c)? Bounds and overlap. */
export function fits(grid: Grid, piece: BlockPiece, r: number, c: number): boolean {
  if (r < 0 || c < 0) return false;
  if (r + piece.h > BLOCK_GRID || c + piece.w > BLOCK_GRID) return false;
  for (const cell of piece.cells) {
    if (grid[idx(r + cell.r, c + cell.c)] !== 0) return false;
  }
  return true;
}

/** Writes the piece in. Callers must have checked `fits` first. */
export function placeInto(grid: Grid, piece: BlockPiece, r: number, c: number): void {
  for (const cell of piece.cells) {
    grid[idx(r + cell.r, c + cell.c)] = piece.color;
  }
}

export interface ClearResult {
  rows: number[];
  cols: number[];
  /** Total lines taken down — a row and a column that cross count as two. */
  lines: number;
  /** The board is completely empty afterwards. Rare, and worth a lot. */
  perfect: boolean;
}

/**
 * Clears every full row and column.
 *
 * Full lines are collected BEFORE anything is emptied. Clearing a row first
 * and then looking at columns would find those columns no longer full, and a
 * cross-shaped clear would silently score half of what the player saw.
 */
export function clearLines(grid: Grid): ClearResult {
  const rows: number[] = [];
  const cols: number[] = [];

  for (let r = 0; r < BLOCK_GRID; r++) {
    let full = true;
    for (let c = 0; c < BLOCK_GRID; c++) {
      if (grid[idx(r, c)] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(r);
  }

  for (let c = 0; c < BLOCK_GRID; c++) {
    let full = true;
    for (let r = 0; r < BLOCK_GRID; r++) {
      if (grid[idx(r, c)] === 0) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }

  for (const r of rows) {
    for (let c = 0; c < BLOCK_GRID; c++) grid[idx(r, c)] = 0;
  }
  for (const c of cols) {
    for (let r = 0; r < BLOCK_GRID; r++) grid[idx(r, c)] = 0;
  }

  const lines = rows.length + cols.length;
  const perfect = lines > 0 && grid.every((v) => v === 0);
  return { rows, cols, lines, perfect };
}

/** Does this piece fit anywhere at all? The game-over test, one piece at a time. */
export function anyFit(grid: Grid, piece: BlockPiece): boolean {
  for (let r = 0; r + piece.h <= BLOCK_GRID; r++) {
    for (let c = 0; c + piece.w <= BLOCK_GRID; c++) {
      if (fits(grid, piece, r, c)) return true;
    }
  }
  return false;
}

/** Every legal top-left for this piece. Used by the bot. */
export function allFits(grid: Grid, piece: BlockPiece): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let r = 0; r + piece.h <= BLOCK_GRID; r++) {
    for (let c = 0; c + piece.w <= BLOCK_GRID; c++) {
      if (fits(grid, piece, r, c)) out.push({ r, c });
    }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────
 * Scoring
 * ──────────────────────────────────────────────────────────────────────── */

/** One line is worth ten. See `lineScore` for what several at once are worth. */
export const LINE_BASE = 10;
/** Emptying the board completely. The rarest thing a player can do. */
export const PERFECT_CLEAR_BONUS = 300;

/**
 * Clearing several lines in one placement is worth far more than clearing
 * them one at a time: 10, 30, 60, 100 for one through four.
 *
 * That gap is the entire skill ceiling of the genre. If four singles paid the
 * same as one quadruple there would be no reason to ever set anything up.
 */
export function lineScore(lines: number): number {
  return (LINE_BASE * lines * (lines + 1)) / 2;
}

/**
 * Re-exported from shared so the engine and the scoreboard cannot disagree
 * about what multiplier a streak is worth. See `blockStreakMultiplier`.
 */
export const streakMultiplier = blockStreakMultiplier;

export interface PlacementScore {
  /** What the player gains in total. */
  gained: number;
  /** Their streak after this placement — 0 if it cleared nothing. */
  streak: number;
}

/**
 * Placing always pays a little (one point per cell) so an early board still
 * ticks over; clearing is where the score actually comes from.
 */
export function scorePlacement(
  cellsPlaced: number,
  clear: ClearResult,
  streakBefore: number,
): PlacementScore {
  if (clear.lines === 0) {
    return { gained: cellsPlaced, streak: 0 };
  }
  const streak = streakBefore + 1;
  const base = lineScore(clear.lines);
  const gained =
    cellsPlaced +
    Math.round(base * streakMultiplier(streak)) +
    (clear.perfect ? PERFECT_CLEAR_BONUS : 0);
  return { gained, streak };
}
