import { describe, expect, it } from "vitest";
import { CENTRE_HOLE, holeAt, marbleCount, solveFrom, type Move } from "../brainvitaRules";
import { createGameState, gameResult, isFinished, reduceGame, targetsOf, type GameState } from "../brainvitaGame";

const hole = (row: number, col: number): number => holeAt(row, col) as number;
const tap = (state: GameState, ...holes: number[]): GameState => holes.reduce((s, h) => reduceGame(s, { type: "tap", hole: h }), state);

/** Plays the solver's moves through the reducer, the way a player would. */
function playSolution(state: GameState, solution: readonly Move[]): GameState {
  return solution.reduce((s, m) => tap(s, m.from, m.to), state);
}

describe("brain vita game state", () => {
  it("starts with the opening board, nothing selected, no help used", () => {
    const state = createGameState();
    expect(marbleCount(state.board)).toBe(32);
    expect(state.selected).toBeNull();
    expect(state.moves).toEqual([]);
    expect(state.hint).toBeNull();
    expect(state.hintsUsed).toBe(0);
    expect(state.undosUsed).toBe(0);
    expect(isFinished(state)).toBe(false);
  });

  it("selects a marble that can move, and lights up where it can land", () => {
    const state = tap(createGameState(), hole(1, 3));
    expect(state.selected).toBe(hole(1, 3));
    expect(targetsOf(state)).toEqual([CENTRE_HOLE]);
  });

  it("deselects when the selected marble is tapped again", () => {
    const state = tap(createGameState(), hole(1, 3), hole(1, 3));
    expect(state.selected).toBeNull();
  });

  it("does not select a marble that has no move, nor an empty hole", () => {
    expect(tap(createGameState(), hole(0, 2)).selected).toBeNull();
    expect(tap(createGameState(), CENTRE_HOLE).selected).toBeNull();
  });

  it("jumps when a legal landing hole is tapped, removing the jumped marble", () => {
    const state = tap(createGameState(), hole(1, 3), CENTRE_HOLE);
    expect(marbleCount(state.board)).toBe(31);
    expect(state.board[CENTRE_HOLE]).toBe(true);
    expect(state.board[hole(2, 3)]).toBe(false);
    expect(state.board[hole(1, 3)]).toBe(false);
    expect(state.selected).toBeNull();
    expect(state.moves).toHaveLength(1);
  });

  it("switches the selection when another movable marble is tapped", () => {
    const state = tap(createGameState(), hole(1, 3), hole(3, 1));
    expect(state.selected).toBe(hole(3, 1));
  });

  it("clears the selection when an unreachable hole is tapped", () => {
    const state = tap(createGameState(), hole(1, 3), hole(0, 2));
    expect(state.selected).toBeNull();
    expect(marbleCount(state.board)).toBe(32);
  });

  it("changes nothing for a hole that does not exist", () => {
    const before = createGameState();
    expect(reduceGame(before, { type: "tap", hole: -1 })).toEqual(before);
    expect(reduceGame(before, { type: "tap", hole: 33 })).toEqual(before);
    expect(reduceGame(before, { type: "tap", hole: 1.5 })).toEqual(before);
  });

  it("never mutates the state it is given", () => {
    const before = createGameState();
    const copy = JSON.parse(JSON.stringify(before));
    tap(before, hole(1, 3), CENTRE_HOLE);
    expect(JSON.parse(JSON.stringify(before))).toEqual(copy);
  });
});

describe("brain vita undo, restart and hints", () => {
  it("undoes the last jump and counts it as help", () => {
    const played = tap(createGameState(), hole(1, 3), CENTRE_HOLE);
    const undone = reduceGame(played, { type: "undo" });
    expect(marbleCount(undone.board)).toBe(32);
    expect(undone.moves).toEqual([]);
    expect(undone.undosUsed).toBe(1);
    expect(undone.selected).toBeNull();
  });

  it("does nothing, and counts nothing, when there is nothing to undo", () => {
    const undone = reduceGame(createGameState(), { type: "undo" });
    expect(undone.undosUsed).toBe(0);
  });

  it("can undo all the way back to the start", () => {
    let state = tap(createGameState(), hole(1, 3), CENTRE_HOLE);
    state = tap(state, hole(3, 1), hole(3, 3)); // illegal: centre is occupied
    expect(state.moves).toHaveLength(1);
    state = reduceGame(state, { type: "undo" });
    state = reduceGame(state, { type: "undo" });
    expect(marbleCount(state.board)).toBe(32);
  });

  it("restarts with a fresh board and forgets all help", () => {
    let state = tap(createGameState(), hole(1, 3), CENTRE_HOLE);
    state = reduceGame(state, { type: "undo" });
    state = reduceGame(state, { type: "hint", move: { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE } });
    const restarted = reduceGame(state, { type: "restart" });
    expect(restarted).toEqual(createGameState());
  });

  it("shows a hint and counts it as help", () => {
    const move: Move = { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE };
    const state = reduceGame(createGameState(), { type: "hint", move });
    expect(state.hint).toEqual(move);
    expect(state.hintsUsed).toBe(1);
  });

  it("clears the hint once a jump is made", () => {
    const move: Move = { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE };
    const hinted = reduceGame(createGameState(), { type: "hint", move });
    const jumped = tap(hinted, hole(1, 3), CENTRE_HOLE);
    expect(jumped.hint).toBeNull();
  });

  it("counts a request for a hint even when there is no solution to point at", () => {
    const state = reduceGame(createGameState(), { type: "hint", move: null });
    expect(state.hint).toBeNull();
    expect(state.hintsUsed).toBe(1);
  });
});

describe("brain vita finish", () => {
  it("finishes when no jump is left, and reports the marbles remaining", () => {
    const solution = solveFrom(createGameState().board) as Move[];
    const finished = playSolution(createGameState(), solution);
    expect(isFinished(finished)).toBe(true);
    const result = gameResult(finished);
    expect(result.marblesLeft).toBe(1);
    expect(result.moves).toBe(31);
    expect(result.usedHelp).toBe(false);
  });

  it("will not accept a tap once the game is over", () => {
    const solution = solveFrom(createGameState().board) as Move[];
    const finished = playSolution(createGameState(), solution);
    expect(tap(finished, 0, 1, 2)).toEqual(finished);
  });

  it("marks a result that used a hint or an undo as helped, so it can be kept off the leaderboard", () => {
    const solution = solveFrom(createGameState().board) as Move[];
    let state = playSolution(createGameState(), solution);
    expect(gameResult(state).usedHelp).toBe(false);
    state = { ...state, hintsUsed: 1 };
    expect(gameResult(state).usedHelp).toBe(true);
    state = { ...state, hintsUsed: 0, undosUsed: 1 };
    expect(gameResult(state).usedHelp).toBe(true);
  });

  it("records whether the last marble finished in the centre", () => {
    const solution = solveFrom(createGameState().board) as Move[];
    const finished = playSolution(createGameState(), solution);
    expect(gameResult(finished).lastInCentre).toBe(finished.board[CENTRE_HOLE]);
  });

  it("can still undo after getting stuck, to try again", () => {
    let state = createGameState();
    let guard = 0;
    while (!isFinished(state) && guard++ < 40) {
      const movable = state.board.map((m, h) => ({ m, h })).filter(({ m, h }) => m && tap(state, h).selected !== null);
      state = tap(state, movable[0].h);
      state = tap(state, targetsOf(state)[0]);
    }
    expect(isFinished(state)).toBe(true);
    const back = reduceGame(state, { type: "undo" });
    expect(isFinished(back)).toBe(false);
  });
});
