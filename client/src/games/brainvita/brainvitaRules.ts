/**
 * Brain Vita (peg solitaire) on the classic English board: a cross of 33 holes on a 7 by 7 grid.
 * Pure rules, no React and no browser APIs, so it can be tested, prerendered and shared by both layouts.
 *
 * A board is 33 booleans, one per hole in reading order: `true` is a marble, `false` an empty hole.
 * Every function returns a new board; none changes the one it was given.
 */

export const GRID_SIZE = 7;
export const HOLE_COUNT = 33;

/** `true` = a marble is in the hole. */
export type Board = readonly boolean[];

export interface Cell {
  row: number;
  col: number;
}

/** Jump the marble in `from` over the marble in `over` into the empty hole `to`; `over` is removed. */
export interface Move {
  from: number;
  over: number;
  to: number;
}

/** A hole exists where the row or the column is in the middle three: the shape of a cross. */
const isHoleCell = (row: number, col: number): boolean =>
  Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE && ((row >= 2 && row <= 4) || (col >= 2 && col <= 4));

const CELLS: readonly Cell[] = (() => {
  const cells: Cell[] = [];
  for (let row = 0; row < GRID_SIZE; row++) for (let col = 0; col < GRID_SIZE; col++) if (isHoleCell(row, col)) cells.push({ row, col });
  return cells;
})();

const HOLE_INDEX: ReadonlyMap<number, number> = new Map(CELLS.map((cell, hole) => [cell.row * GRID_SIZE + cell.col, hole]));

/** The hole number (0..32) at a grid cell, or null when the cell is outside the cross or off the grid. */
export function holeAt(row: number, col: number): number | null {
  if (!isHoleCell(row, col)) return null;
  return HOLE_INDEX.get(row * GRID_SIZE + col) ?? null;
}

export function cellOf(hole: number): Cell {
  return { ...CELLS[hole] };
}

export const CENTRE_HOLE = holeAt(3, 3) as number;

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Every geometrically possible jump on the board (76), grouped by the hole it starts from. */
const MOVES_BY_FROM: readonly (readonly Move[])[] = (() => {
  const groups: Move[][] = Array.from({ length: HOLE_COUNT }, () => []);
  CELLS.forEach(({ row, col }, from) => {
    for (const [dRow, dCol] of DIRECTIONS) {
      const over = holeAt(row + dRow, col + dCol);
      const to = holeAt(row + dRow * 2, col + dCol * 2);
      if (over !== null && to !== null) groups[from].push({ from, over, to });
    }
  });
  return groups;
})();

const isHole = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value < HOLE_COUNT;

export function createBoard(): boolean[] {
  return Array.from({ length: HOLE_COUNT }, (_, hole) => hole !== CENTRE_HOLE);
}

export const marbleCount = (board: Board): number => board.reduce((sum, marble) => sum + (marble ? 1 : 0), 0);

/** Moves available to the marble in `from` (none if the hole is empty or not a hole). */
export function movesFrom(board: Board, from: number): Move[] {
  if (!isHole(from) || !board[from]) return [];
  return MOVES_BY_FROM[from].filter((move) => board[move.over] && !board[move.to]).map((move) => ({ ...move }));
}

export function legalMoves(board: Board): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < HOLE_COUNT; from++) moves.push(...movesFrom(board, from));
  return moves;
}

/** True only for a real jump of exactly two holes in a straight line, over a marble, into an empty hole. */
export function isLegalMove(board: Board, move: Move): boolean {
  if (!isHole(move.from) || !isHole(move.over) || !isHole(move.to)) return false;
  return movesFrom(board, move.from).some((candidate) => candidate.over === move.over && candidate.to === move.to);
}

/** The board after the jump, or null when the move is not legal. */
export function applyMove(board: Board, move: Move): boolean[] | null {
  if (!isLegalMove(board, move)) return null;
  const next = [...board];
  next[move.from] = false;
  next[move.over] = false;
  next[move.to] = true;
  return next;
}

export const isStuck = (board: Board): boolean => legalMoves(board).length === 0;

export interface Rating {
  title: string;
  /** One marble left, in the centre hole: the best result there is. */
  isPerfect: boolean;
}

/** Marbles left decide the title; a single marble in the centre is the only "perfect" game. */
export function rateResult(marblesLeft: number, lastMarbleInCentre: boolean): Rating {
  const isPerfect = marblesLeft === 1 && lastMarbleInCentre;
  if (marblesLeft <= 1) return { title: "Genius", isPerfect };
  if (marblesLeft === 2) return { title: "Excellent", isPerfect };
  if (marblesLeft === 3) return { title: "Very good", isPerfect };
  if (marblesLeft === 4) return { title: "Good", isPerfect };
  return { title: "Keep practising", isPerfect };
}

const POWER_OF_TWO: readonly number[] = Array.from({ length: HOLE_COUNT }, (_, bit) => 2 ** bit);

/**
 * A full list of jumps that leaves exactly one marble, or null if there is none. `[]` means the board
 * already has a single marble. Depth-first, remembering positions already shown to be dead ends, so
 * even the opening position (about half a million reachable positions) is settled quickly.
 */
export function solveFrom(board: Board): Move[] | null {
  const state = [...board];
  let marbles = marbleCount(state);
  if (marbles === 0) return null;
  if (marbles === 1) return [];

  // The board as one number: 33 bits fit exactly in a double, so it can key a Set directly.
  let key = state.reduce((sum, marble, hole) => (marble ? sum + POWER_OF_TWO[hole] : sum), 0);
  const deadEnds = new Set<number>();
  const path: Move[] = [];

  const search = (): boolean => {
    if (marbles === 1) return true;
    if (deadEnds.has(key)) return false;
    for (let from = 0; from < HOLE_COUNT; from++) {
      if (!state[from]) continue;
      for (const move of MOVES_BY_FROM[from]) {
        if (!state[move.over] || state[move.to]) continue;
        state[move.from] = false;
        state[move.over] = false;
        state[move.to] = true;
        marbles -= 1;
        key += POWER_OF_TWO[move.to] - POWER_OF_TWO[move.from] - POWER_OF_TWO[move.over];
        path.push(move);
        if (search()) return true;
        path.pop();
        key -= POWER_OF_TWO[move.to] - POWER_OF_TWO[move.from] - POWER_OF_TWO[move.over];
        marbles += 1;
        state[move.from] = true;
        state[move.over] = true;
        state[move.to] = false;
      }
    }
    deadEnds.add(key);
    return false;
  };

  return search() ? path.map((move) => ({ ...move })) : null;
}
