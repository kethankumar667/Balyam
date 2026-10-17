import {
  CENTRE_HOLE,
  HOLE_COUNT,
  applyMove,
  createBoard,
  isStuck,
  marbleCount,
  movesFrom,
  rateResult,
  type Board,
  type Move,
  type Rating,
} from "./brainvitaRules";

/**
 * The state of one Brain Vita game and the only ways it can change. Pure and immutable, so it is easy
 * to test and the same code serves the phone and the desktop layout.
 */
export interface GameState {
  board: Board;
  /** Every jump played so far, in order; undo replays all but the last. */
  moves: readonly Move[];
  /** The marble the player has picked up, or null. */
  selected: number | null;
  /** The jump the solver suggested, shown until the next jump. */
  hint: Move | null;
  hintsUsed: number;
  undosUsed: number;
}

export type GameAction =
  | { type: "tap"; hole: number }
  | { type: "undo" }
  | { type: "restart" }
  | { type: "hint"; move: Move | null };

export const createGameState = (): GameState => ({
  board: createBoard(),
  moves: [],
  selected: null,
  hint: null,
  hintsUsed: 0,
  undosUsed: 0,
});

export const isFinished = (state: GameState): boolean => isStuck(state.board);

/** Holes the selected marble can land in. */
export const targetsOf = (state: GameState): number[] =>
  state.selected === null ? [] : movesFrom(state.board, state.selected).map((move) => move.to);

const isHoleNumber = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value < HOLE_COUNT;

/** The board reached by playing `moves` from the start. */
function replay(moves: readonly Move[]): Board {
  return moves.reduce<Board>((board, move) => applyMove(board, move) ?? board, createBoard());
}

function tap(state: GameState, hole: number): GameState {
  if (!isHoleNumber(hole) || isFinished(state)) return state;

  if (state.selected !== null) {
    const move = movesFrom(state.board, state.selected).find((candidate) => candidate.to === hole);
    if (move) {
      const board = applyMove(state.board, move);
      if (board) return { ...state, board, moves: [...state.moves, move], selected: null, hint: null };
    }
  }

  if (state.board[hole] && movesFrom(state.board, hole).length > 0) {
    return { ...state, selected: state.selected === hole ? null : hole };
  }
  return { ...state, selected: null };
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "tap":
      return tap(state, action.hole);
    case "undo": {
      if (state.moves.length === 0) return state;
      const moves = state.moves.slice(0, -1);
      return { ...state, board: replay(moves), moves, selected: null, hint: null, undosUsed: state.undosUsed + 1 };
    }
    case "restart":
      return createGameState();
    case "hint":
      return { ...state, hint: action.move, hintsUsed: state.hintsUsed + 1 };
  }
}

export interface GameResult {
  marblesLeft: number;
  moves: number;
  lastInCentre: boolean;
  /** A hint or an undo was used, so the result is for practice and is not posted. */
  usedHelp: boolean;
  rating: Rating;
}

export function gameResult(state: GameState): GameResult {
  const marblesLeft = marbleCount(state.board);
  const lastInCentre = marblesLeft === 1 && state.board[CENTRE_HOLE] === true;
  return {
    marblesLeft,
    moves: state.moves.length,
    lastInCentre,
    usedHelp: state.hintsUsed > 0 || state.undosUsed > 0,
    rating: rateResult(marblesLeft, lastInCentre),
  };
}
