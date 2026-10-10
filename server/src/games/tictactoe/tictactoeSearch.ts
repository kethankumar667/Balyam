import type { TicTacToeMark } from "@shared/types.js";

/**
 * A tic-tac-toe bot that plans ahead, in both modes.
 *
 * The old bot did three things: win now, block now, then take the centre, a corner or an edge in that
 * order. That never loses to a careless player, but it walks into forks (a move that threatens two lines
 * at once, which cannot be blocked) and, in the default "quantum" mode where each player's oldest mark
 * vanishes when a fourth is placed, it has no idea what its own moves are about to undo.
 *
 * This searches the game properly:
 *
 *   classic   the whole game tree (it is tiny), so it plays PERFECTLY: it never loses, and it wins whenever
 *             the opponent gives it the chance.
 *   quantum   a depth-limited search that simulates the vanishing marks exactly as the engine does, so it
 *             sees that a line it is building will lose a corner next turn, and that a block it could
 *             make would be undone. That game never ends in a draw, so it cannot be searched to the end;
 *             8 plies is far enough to see every forced win and loss.
 *
 * A faster win is worth more than a slower one and a slower loss is better than a quicker one, so it
 * finishes games it is winning and fights on in games it is losing.
 *
 * Pure: it takes the position and returns a cell. The same position always gives the same answer, with
 * ties broken in a fixed order (centre, corners, edges).
 */

export type Cell = TicTacToeMark | null;

export interface TicTacToePosition {
  cells: readonly Cell[];
  /** Cells each player placed, oldest first. Only meaningful in quantum mode. */
  queues: { X: readonly number[]; O: readonly number[] };
  mode: "classic" | "quantum";
  /** The player to move. */
  mark: TicTacToeMark;
}

const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/** Preferred order for equally good moves: the centre, then corners, then edges. */
const PREFERENCE = [4, 0, 2, 6, 8, 1, 3, 5, 7] as const;

const WIN = 1_000;
const QUANTUM_DEPTH = 8;

interface State {
  cells: Cell[];
  queues: { X: number[]; O: number[] };
}

function winner(cells: readonly Cell[]): TicTacToeMark | null {
  for (const [a, b, c] of LINES) {
    if (cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return null;
}

/** Plays `cell` for `mark` exactly as the engine does, vanishing the oldest mark first in quantum mode. Returns an undo. */
function place(state: State, mark: TicTacToeMark, cell: number, mode: "classic" | "quantum"): () => void {
  let vanished: number | null = null;
  if (mode === "quantum") {
    const queue = state.queues[mark];
    if (queue.length >= 3) {
      vanished = queue.shift() ?? null;
      if (vanished !== null) state.cells[vanished] = null;
    }
    queue.push(cell);
  }
  state.cells[cell] = mark;

  return () => {
    state.cells[cell] = null;
    if (mode === "quantum") {
      state.queues[mark].pop();
      if (vanished !== null) {
        state.queues[mark].unshift(vanished);
        state.cells[vanished] = mark;
      }
    }
  };
}

/** The empty cells, in preference order. */
function emptyCells(cells: readonly Cell[]): number[] {
  return PREFERENCE.filter((i) => cells[i] === null);
}

/** The value of the position to the player about to move: positive is good. */
function negamax(state: State, mark: TicTacToeMark, mode: "classic" | "quantum", depth: number, ply: number, alpha: number, beta: number): number {
  const moves = emptyCells(state.cells);
  if (moves.length === 0) return 0; // a full board with no winner is a draw (classic only)
  if (depth === 0) return 0;

  const opponent: TicTacToeMark = mark === "X" ? "O" : "X";
  let best = -Infinity;
  for (const cell of moves) {
    const undo = place(state, mark, cell, mode);
    // Only the player who just moved can have completed a line.
    const score = winner(state.cells) === mark ? WIN - ply : -negamax(state, opponent, mode, depth - 1, ply + 1, -beta, -alpha);
    undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** The cell to play, or `null` when the board is full. */
export function chooseTicTacToeCell(position: TicTacToePosition): number | null {
  const state: State = {
    cells: [...position.cells],
    queues: { X: [...position.queues.X], O: [...position.queues.O] },
  };
  const moves = emptyCells(state.cells);
  if (moves.length === 0) return null;

  const opponent: TicTacToeMark = position.mark === "X" ? "O" : "X";
  const depth = position.mode === "classic" ? 9 : QUANTUM_DEPTH;

  let best = moves[0];
  let bestScore = -Infinity;
  for (const cell of moves) {
    const undo = place(state, position.mark, cell, position.mode);
    const score = winner(state.cells) === position.mark ? WIN : -negamax(state, opponent, position.mode, depth - 1, 1, -Infinity, Infinity);
    undo();
    // Strictly better only, so ties keep the earlier (more central) cell.
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return best;
}
