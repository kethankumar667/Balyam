import type { Connect4BotDifficulty, Connect4Disc } from "@shared/types.js";
import { CONNECT4_COLUMNS, CONNECT4_ROWS, CONNECT4_WIN_LENGTH } from "@shared/types.js";
import { cloneGrid, findWinningCells, landingRow, legalColumns, type Grid } from "./connect4Board.js";

/**
 * Search budget in visited NODES, not milliseconds. A wall-clock limit would make a bot's strength
 * depend on how busy the server is (and its moves irreproducible in tests); a node count is
 * deterministic, and bounds the work a single bot move can cost. `easy` never searches.
 *
 * A search runs synchronously on the server's only thread, so the budgets are sized to keep even
 * `pro` to a small fraction of a second (see the timing test) — a bot must never stall other rooms.
 */
export const BOT_NODE_BUDGET: Readonly<Record<Connect4BotDifficulty, number>> = {
  easy: 0,
  medium: 6_000,
  pro: 40_000,
};

const MAX_SEARCH_DEPTH: Readonly<Record<Connect4BotDifficulty, number>> = { easy: 0, medium: 4, pro: 8 };

/** Centre columns first: they join the most possible fours, and trying them first prunes more. */
const CENTRE_FIRST: readonly number[] = [3, 2, 4, 1, 5, 0, 6];
const CENTRE_COLUMN = 3;

const WIN_SCORE = 1_000_000;
/** Anything at or above this is a forced win found within the search horizon. */
const FORCED_WIN_THRESHOLD = WIN_SCORE - 100;

const opponentOf = (disc: Connect4Disc): Connect4Disc => (disc === "R" ? "Y" : "R");

/** The column that wins for `disc` on the very next drop, or null. Never mutates `grid`. */
export function findImmediateWin(grid: Grid, disc: Connect4Disc): number | null {
  const scratch = cloneGrid(grid);
  for (const column of CENTRE_FIRST) {
    const row = landingRow(scratch, column);
    if (row === null) continue;
    scratch[row][column] = disc;
    const wins = findWinningCells(scratch, row, column) !== null;
    scratch[row][column] = null;
    if (wins) return column;
  }
  return null;
}

/**
 * The move the server plays for a HUMAN whose turn clock ran out: win if it can, else stop the
 * opponent winning, else the most central legal column. Deliberately modest: if a timeout produced
 * a strong move, stalling would pay.
 */
export function chooseFallbackColumn(grid: Grid, me: Connect4Disc): number | null {
  const win = findImmediateWin(grid, me);
  if (win !== null) return win;
  const block = findImmediateWin(grid, opponentOf(me));
  if (block !== null) return block;
  return CENTRE_FIRST.find((column) => landingRow(grid, column) !== null) ?? null;
}

// ---------------------------------------------------------------------------
// The search works on a flat typed array for speed: nested arrays made each node several times
// slower, and node cost is what decides how long a bot blocks the server.
// ---------------------------------------------------------------------------

const EMPTY = 0;
const RED = 1;
const YELLOW = 2;
type Side = typeof RED | typeof YELLOW;
const sideOf = (disc: Connect4Disc): Side => (disc === "R" ? RED : YELLOW);
const otherSide = (side: Side): Side => (side === RED ? YELLOW : RED);

const cellIndex = (row: number, col: number): number => row * CONNECT4_COLUMNS + col;

/** Every window of four in a line, as flat cell indices (69 windows x 4 cells), built once. */
const WINDOW_CELLS: Int8Array = (() => {
  const directions: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  const cells: number[] = [];
  for (let row = 0; row < CONNECT4_ROWS; row++) {
    for (let col = 0; col < CONNECT4_COLUMNS; col++) {
      for (const [dRow, dCol] of directions) {
        const endRow = row + dRow * (CONNECT4_WIN_LENGTH - 1);
        const endCol = col + dCol * (CONNECT4_WIN_LENGTH - 1);
        if (endRow < 0 || endRow >= CONNECT4_ROWS || endCol < 0 || endCol >= CONNECT4_COLUMNS) continue;
        for (let step = 0; step < CONNECT4_WIN_LENGTH; step++) cells.push(cellIndex(row + dRow * step, col + dCol * step));
      }
    }
  }
  return Int8Array.from(cells);
})();
const WINDOW_COUNT = WINDOW_CELLS.length / CONNECT4_WIN_LENGTH;

/**
 * Score of a position for `side` to move, from a count of open windows of four. Cheap and crude on
 * purpose: the search does the real work, this only breaks ties between quiet positions.
 */
function evaluate(board: Uint8Array, side: Side): number {
  const opponent = otherSide(side);
  let score = 0;
  for (let row = 0; row < CONNECT4_ROWS; row++) {
    const disc = board[cellIndex(row, CENTRE_COLUMN)];
    if (disc === side) score += 3;
    else if (disc === opponent) score -= 3;
  }
  for (let w = 0; w < WINDOW_COUNT; w++) {
    const base = w * CONNECT4_WIN_LENGTH;
    let mine = 0;
    let theirs = 0;
    for (let k = 0; k < CONNECT4_WIN_LENGTH; k++) {
      const disc = board[WINDOW_CELLS[base + k]];
      if (disc === side) mine += 1;
      else if (disc === opponent) theirs += 1;
    }
    if (mine > 0 && theirs > 0) continue; // a blocked window is worth nothing to either side
    if (mine === 3) score += 50;
    else if (mine === 2) score += 10;
    else if (theirs === 3) score -= 60;
    else if (theirs === 2) score -= 10;
  }
  return score;
}

/** Row and column steps of the four line directions (horizontal, vertical, both diagonals). */
const STEP_ROW = Int8Array.of(0, 1, 1, 1);
const STEP_COL = Int8Array.of(1, 0, 1, -1);

/**
 * Does the disc just placed at (row, col) complete four or more in a line? This runs at most nodes
 * of the search, so it uses plain index loops over preallocated arrays: allocating a pair or an
 * iterator per call was the single biggest cost.
 */
function completesFour(board: Uint8Array, row: number, col: number, side: Side): boolean {
  for (let direction = 0; direction < STEP_ROW.length; direction++) {
    const dRow = STEP_ROW[direction];
    const dCol = STEP_COL[direction];
    let run = 1;
    let r = row + dRow;
    let c = col + dCol;
    while (r >= 0 && r < CONNECT4_ROWS && c >= 0 && c < CONNECT4_COLUMNS && board[r * CONNECT4_COLUMNS + c] === side) {
      run += 1;
      r += dRow;
      c += dCol;
    }
    r = row - dRow;
    c = col - dCol;
    while (r >= 0 && r < CONNECT4_ROWS && c >= 0 && c < CONNECT4_COLUMNS && board[r * CONNECT4_COLUMNS + c] === side) {
      run += 1;
      r -= dRow;
      c -= dCol;
    }
    if (run >= CONNECT4_WIN_LENGTH) return true;
  }
  return false;
}

interface SearchContext {
  /** A private scratch board, mutated with make/unmake. It never escapes this module. */
  board: Uint8Array;
  /** Discs already in each column, so the landing row is O(1). */
  heights: Uint8Array;
  nodes: number;
  budget: number;
  aborted: boolean;
}

function toContext(grid: Grid, budget: number): SearchContext {
  const board = new Uint8Array(CONNECT4_ROWS * CONNECT4_COLUMNS);
  const heights = new Uint8Array(CONNECT4_COLUMNS);
  for (let row = 0; row < CONNECT4_ROWS; row++) {
    for (let col = 0; col < CONNECT4_COLUMNS; col++) {
      const disc = grid[row][col];
      if (disc === null) continue;
      board[cellIndex(row, col)] = sideOf(disc);
      heights[col] += 1;
    }
  }
  return { board, heights, nodes: 0, budget, aborted: false };
}

/** Drops `side` into `col` on the scratch board and returns the row it landed in. */
function place(ctx: SearchContext, col: number, side: Side): number {
  const row = CONNECT4_ROWS - 1 - ctx.heights[col];
  ctx.board[cellIndex(row, col)] = side;
  ctx.heights[col] += 1;
  return row;
}

function unplace(ctx: SearchContext, col: number, row: number): void {
  ctx.board[cellIndex(row, col)] = EMPTY;
  ctx.heights[col] -= 1;
}

/** Negamax with alpha-beta pruning. The score is from the point of view of `side`, who is to move. */
function negamax(ctx: SearchContext, side: Side, depth: number, alpha: number, beta: number, ply: number): number {
  ctx.nodes += 1;
  if (ctx.nodes > ctx.budget) {
    ctx.aborted = true;
    return 0;
  }
  if (depth === 0) return evaluate(ctx.board, side);

  const opponent = otherSide(side);
  let best = -Infinity;
  let anyMove = false;
  for (let i = 0; i < CENTRE_FIRST.length; i++) {
    const col = CENTRE_FIRST[i];
    if (ctx.heights[col] >= CONNECT4_ROWS) continue;
    anyMove = true;
    const row = place(ctx, col, side);
    // Winning sooner is better than winning later, so a forced win is found by its shortest route.
    const score = completesFour(ctx.board, row, col, side) ? WIN_SCORE - ply : -negamax(ctx, opponent, depth - 1, -beta, -alpha, ply + 1);
    unplace(ctx, col, row);
    if (ctx.aborted) return 0;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return anyMove ? best : 0; // no legal move: the board is full, a draw
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

/**
 * Iterative deepening under a node budget: search one ply deeper each round and keep the last
 * COMPLETE round's answer, so running out of budget mid-round never yields a half-searched move.
 * Equally good moves are chosen between at random (from the injected, seedable source).
 */
function searchColumn(grid: Grid, me: Connect4Disc, difficulty: Connect4BotDifficulty, legal: readonly number[], random: () => number): number {
  const ctx = toContext(grid, BOT_NODE_BUDGET[difficulty]);
  const mySide = sideOf(me);
  const opponent = otherSide(mySide);
  const rootMoves = CENTRE_FIRST.filter((column) => legal.includes(column));
  let chosen = rootMoves[0];

  for (let depth = 1; depth <= MAX_SEARCH_DEPTH[difficulty]; depth++) {
    const scores = new Map<number, number>();
    for (const col of rootMoves) {
      const row = place(ctx, col, mySide);
      const score = completesFour(ctx.board, row, col, mySide) ? WIN_SCORE : -negamax(ctx, opponent, depth - 1, -Infinity, Infinity, 1);
      unplace(ctx, col, row);
      if (ctx.aborted) break;
      scores.set(col, score);
    }
    if (ctx.aborted) break;

    const bestScore = Math.max(...scores.values());
    chosen = pickRandom(
      rootMoves.filter((column) => scores.get(column) === bestScore),
      random,
    );
    if (bestScore >= FORCED_WIN_THRESHOLD) break; // a forced win: searching deeper cannot improve on it
  }
  return chosen;
}

/**
 * The move a bot seat plays. Every level takes an immediate win and blocks an immediate loss;
 * beyond that `easy` plays at random, `medium` searches a few plies and `pro` searches deeper.
 * Returns null only when there is no legal move (a full board).
 */
export function chooseBotColumn(grid: Grid, me: Connect4Disc, difficulty: Connect4BotDifficulty, random: () => number): number | null {
  const legal = legalColumns(grid);
  if (legal.length === 0) return null;

  const win = findImmediateWin(grid, me);
  if (win !== null) return win;
  const block = findImmediateWin(grid, opponentOf(me));
  if (block !== null) return block;

  if (difficulty === "easy") return pickRandom(legal, random);
  return searchColumn(grid, me, difficulty, legal, random);
}
