import { describe, expect, it } from "vitest";
import {
  CENTRE_HOLE,
  HOLE_COUNT,
  applyMove,
  cellOf,
  createBoard,
  holeAt,
  isLegalMove,
  isStuck,
  legalMoves,
  marbleCount,
  movesFrom,
  rateResult,
  solveFrom,
  type Board,
  type Move,
} from "../brainvitaRules";

/** A board with marbles only on the listed (row, col) cells; every other hole is empty. */
function boardWith(cells: ReadonlyArray<readonly [number, number]>): Board {
  const board = Array<boolean>(HOLE_COUNT).fill(false);
  for (const [row, col] of cells) {
    const hole = holeAt(row, col);
    if (hole === null) throw new Error(`(${row},${col}) is not a hole`);
    board[hole] = true;
  }
  return board;
}

const move = (from: readonly [number, number], over: readonly [number, number], to: readonly [number, number]): Move => ({
  from: holeAt(...from) as number,
  over: holeAt(...over) as number,
  to: holeAt(...to) as number,
});

describe("brain vita geometry", () => {
  it("is the English board: 33 holes in a cross on a 7 by 7 grid", () => {
    expect(HOLE_COUNT).toBe(33);
    let holes = 0;
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (holeAt(row, col) !== null) holes += 1;
    expect(holes).toBe(33);
  });

  it("has no holes in the four corners, and the full middle row and column", () => {
    for (const [row, col] of [[0, 0], [0, 1], [1, 0], [0, 5], [0, 6], [1, 6], [5, 0], [6, 0], [6, 1], [5, 6], [6, 5], [6, 6]]) {
      expect(holeAt(row, col), `(${row},${col})`).toBeNull();
    }
    for (let i = 0; i < 7; i++) {
      expect(holeAt(3, i)).not.toBeNull();
      expect(holeAt(i, 3)).not.toBeNull();
    }
  });

  it("numbers the holes 0..32 in reading order and maps them back to their cells", () => {
    expect(holeAt(0, 2)).toBe(0);
    expect(holeAt(6, 4)).toBe(32);
    for (let hole = 0; hole < HOLE_COUNT; hole++) {
      const { row, col } = cellOf(hole);
      expect(holeAt(row, col)).toBe(hole);
    }
  });

  it("puts the centre hole in the middle of the board", () => {
    expect(cellOf(CENTRE_HOLE)).toEqual({ row: 3, col: 3 });
  });

  it("answers null for anything that is not on the 7 by 7 grid", () => {
    for (const [row, col] of [[-1, 3], [3, -1], [7, 3], [3, 7], [1.5, 3], [Number.NaN, 3]]) {
      expect(holeAt(row, col)).toBeNull();
    }
  });
});

describe("brain vita setup", () => {
  it("starts with 32 marbles and the centre hole empty", () => {
    const board = createBoard();
    expect(board).toHaveLength(HOLE_COUNT);
    expect(marbleCount(board)).toBe(32);
    expect(board[CENTRE_HOLE]).toBe(false);
  });

  it("returns a fresh board every time", () => {
    const a = createBoard();
    a[0] = false;
    expect(createBoard()[0]).toBe(true);
  });

  it("opens with exactly four legal moves, all into the centre", () => {
    const moves = legalMoves(createBoard());
    expect(moves).toHaveLength(4);
    for (const m of moves) expect(m.to).toBe(CENTRE_HOLE);
    const from = moves.map((m) => cellOf(m.from)).sort((a, b) => a.row - b.row || a.col - b.col);
    expect(from).toEqual([
      { row: 1, col: 3 },
      { row: 3, col: 1 },
      { row: 3, col: 5 },
      { row: 5, col: 3 },
    ]);
  });
});

describe("brain vita moves", () => {
  it("jumps a marble over its neighbour into the empty hole and removes the jumped marble", () => {
    const board = createBoard();
    const m = move([1, 3], [2, 3], [3, 3]);
    expect(isLegalMove(board, m)).toBe(true);
    const next = applyMove(board, m);
    expect(next).not.toBeNull();
    expect(next![m.from]).toBe(false);
    expect(next![m.over]).toBe(false);
    expect(next![m.to]).toBe(true);
    expect(marbleCount(next!)).toBe(31);
  });

  it("does not change the board it was given", () => {
    const board = createBoard();
    const copy = [...board];
    applyMove(board, move([1, 3], [2, 3], [3, 3]));
    expect(board).toEqual(copy);
  });

  it("refuses a jump when the starting hole has no marble", () => {
    const board = boardWith([[2, 3]]);
    expect(isLegalMove(board, move([1, 3], [2, 3], [3, 3]))).toBe(false);
    expect(applyMove(board, move([1, 3], [2, 3], [3, 3]))).toBeNull();
  });

  it("refuses a jump over an empty hole", () => {
    const board = boardWith([[1, 3]]);
    expect(isLegalMove(board, move([1, 3], [2, 3], [3, 3]))).toBe(false);
  });

  it("refuses a jump into an occupied hole", () => {
    const board = boardWith([[1, 3], [2, 3], [3, 3]]);
    expect(isLegalMove(board, move([1, 3], [2, 3], [3, 3]))).toBe(false);
  });

  it("refuses diagonal jumps", () => {
    const board = boardWith([[2, 2], [3, 3]]);
    expect(isLegalMove(board, { from: holeAt(2, 2) as number, over: holeAt(3, 3) as number, to: holeAt(4, 4) as number })).toBe(false);
  });

  it("refuses a jump that is not exactly two holes long", () => {
    const board = boardWith([[3, 0], [3, 1], [3, 2]]);
    expect(isLegalMove(board, move([3, 0], [3, 1], [3, 3]))).toBe(false);
    const far = boardWith([[3, 0], [3, 1]]);
    expect(isLegalMove(far, { from: holeAt(3, 0) as number, over: holeAt(3, 1) as number, to: holeAt(3, 1) as number })).toBe(false);
  });

  it("refuses a 'middle' that is not between the two ends", () => {
    const board = boardWith([[3, 1], [2, 3]]);
    expect(isLegalMove(board, { from: holeAt(3, 1) as number, over: holeAt(2, 3) as number, to: holeAt(3, 3) as number })).toBe(false);
  });

  it("refuses holes that do not exist, in any slot", () => {
    const board = createBoard();
    for (const bad of [-1, 33, 1.5, Number.NaN]) {
      expect(isLegalMove(board, { from: bad, over: 16, to: 16 })).toBe(false);
      expect(isLegalMove(board, { from: 10, over: bad, to: 16 })).toBe(false);
      expect(isLegalMove(board, { from: 10, over: 16, to: bad })).toBe(false);
    }
  });

  it("will not jump off the edge of the cross", () => {
    // (1,1) is not a hole, so a marble at (1,3) cannot jump left over (1,2).
    const board = boardWith([[1, 3], [1, 2]]);
    expect(movesFrom(board, holeAt(1, 3) as number)).toHaveLength(0);
  });

  it("lists the moves from one marble, and none from an empty hole", () => {
    const board = createBoard();
    expect(movesFrom(board, holeAt(1, 3) as number)).toHaveLength(1);
    expect(movesFrom(board, holeAt(3, 3) as number)).toHaveLength(0);
    expect(movesFrom(board, holeAt(0, 2) as number)).toHaveLength(0);
  });

  it("finds a marble's moves in all four directions", () => {
    const board = boardWith([[3, 3], [2, 3], [4, 3], [3, 2], [3, 4]]);
    const targets = movesFrom(board, holeAt(3, 3) as number).map((m) => cellOf(m.to));
    expect(targets).toHaveLength(4);
    expect(targets).toEqual(expect.arrayContaining([{ row: 1, col: 3 }, { row: 5, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 5 }]));
  });
});

describe("brain vita end of game", () => {
  it("is stuck when no jump exists", () => {
    expect(isStuck(boardWith([[0, 2], [6, 4]]))).toBe(true);
    expect(isStuck(createBoard())).toBe(false);
  });

  it("counts marbles", () => {
    expect(marbleCount(boardWith([[3, 3]]))).toBe(1);
    expect(marbleCount(Array<boolean>(HOLE_COUNT).fill(false))).toBe(0);
  });

  it("rates a result by the marbles left, and honours a last marble in the centre", () => {
    expect(rateResult(1, true).title).toBe("Genius");
    expect(rateResult(1, true).isPerfect).toBe(true);
    expect(rateResult(1, false).isPerfect).toBe(false);
    expect(rateResult(1, false).title).toBe("Genius");
    expect(rateResult(2, false).title).toBe("Excellent");
    expect(rateResult(3, false).title).toBe("Very good");
    expect(rateResult(4, false).title).toBe("Good");
    expect(rateResult(9, false).title).toBe("Keep practising");
  });

  it("never claims perfect for more than one marble", () => {
    expect(rateResult(2, true).isPerfect).toBe(false);
  });
});

describe("brain vita solver", () => {
  it("solves the opening position, and the solution really plays out to one marble", () => {
    const started = Date.now();
    const solution = solveFrom(createBoard());
    expect(solution).not.toBeNull();
    expect(solution).toHaveLength(31);
    let board: Board | null = createBoard();
    for (const m of solution as Move[]) {
      board = applyMove(board as Board, m);
      expect(board, "every solver move is legal").not.toBeNull();
    }
    expect(marbleCount(board as Board)).toBe(1);
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  it("returns an empty solution for a board that is already solved", () => {
    expect(solveFrom(boardWith([[3, 3]]))).toEqual([]);
  });

  it("answers null when the position cannot be solved", () => {
    expect(solveFrom(boardWith([[0, 2], [6, 4]]))).toBeNull();
    expect(solveFrom(Array<boolean>(HOLE_COUNT).fill(false))).toBeNull();
  });

  it("solves from the middle of a game and does not touch the board it was given", () => {
    const first = applyMove(createBoard(), move([1, 3], [2, 3], [3, 3])) as Board;
    const copy = [...first];
    const solution = solveFrom(first);
    expect(solution).not.toBeNull();
    expect(first).toEqual(copy);
    let board: Board | null = first;
    for (const m of solution as Move[]) board = applyMove(board as Board, m);
    expect(marbleCount(board as Board)).toBe(1);
  });

  it("finds a short finish for a nearly empty board", () => {
    const board = boardWith([[3, 1], [3, 2]]);
    expect(solveFrom(board)).toEqual([move([3, 1], [3, 2], [3, 3])]);
  });
});
