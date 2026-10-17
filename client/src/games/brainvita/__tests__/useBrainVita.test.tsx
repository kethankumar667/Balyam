import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const recordSoloScore = vi.fn();
vi.mock("../../../store/scorecardStore", () => ({
  recordSoloScore: (...args: unknown[]) => recordSoloScore(...args),
}));

import { BRAINVITA_TUTORIAL_KEY, useBrainVita } from "../useBrainVita";
import { CENTRE_HOLE, applyMove, createBoard, holeAt, isLegalMove, legalMoves, marbleCount, solveFrom, type Move } from "../brainvitaRules";

const hole = (row: number, col: number): number => holeAt(row, col) as number;

type HookResult = { current: ReturnType<typeof useBrainVita> };

/** Plays moves the way a player would: tap the marble, then tap where it lands. */
function playMoves(result: HookResult, moves: readonly Move[]): void {
  for (const move of moves) {
    act(() => result.current.tap(move.from));
    act(() => result.current.tap(move.to));
  }
}

const solution = (): Move[] => solveFrom(createBoard()) as Move[];

/** A line of legal jumps from the opening to a position that is not over but cannot be won, found by seeded walks. */
function findDoomedLine(): Move[] {
  let seed = 12345;
  const next = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let attempt = 0; attempt < 500; attempt++) {
    let board: readonly boolean[] = createBoard();
    const line: Move[] = [];
    for (;;) {
      const moves = legalMoves(board);
      if (moves.length === 0) break;
      const move = moves[Math.floor(next() * moves.length)];
      board = applyMove(board, move) as boolean[];
      line.push(move);
      // Proving a crowded board unwinnable searches everything; with few marbles left the proof is instant.
      if (marbleCount(board) <= 8 && legalMoves(board).length > 0 && solveFrom(board) === null) return line;
    }
  }
  throw new Error('no unwinnable, unfinished position found');
}

describe("useBrainVita", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    recordSoloScore.mockReset();
    recordSoloScore.mockResolvedValue({ isNewPersonalBest: true });
    try {
      localStorage.setItem(BRAINVITA_TUTORIAL_KEY, "1");
    } catch {
      /* storage unavailable: the lesson simply stays closed */
    }
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a fresh game", () => {
    const { result } = renderHook(() => useBrainVita());
    expect(marbleCount(result.current.state.board)).toBe(32);
    expect(result.current.finished).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.seconds).toBe(0);
    expect(result.current.resultOpen).toBe(false);
  });

  it("picks up a marble and offers where it can land, then jumps when a landing hole is tapped", () => {
    const { result } = renderHook(() => useBrainVita());
    act(() => result.current.tap(hole(1, 3)));
    expect(result.current.state.selected).toBe(hole(1, 3));
    expect(result.current.targets).toEqual([CENTRE_HOLE]);
    act(() => result.current.tap(CENTRE_HOLE));
    expect(marbleCount(result.current.state.board)).toBe(31);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.lastMove).toEqual({ from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE });
  });

  it("undoes a jump", () => {
    const { result } = renderHook(() => useBrainVita());
    playMoves(result, [{ from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE }]);
    act(() => result.current.undo());
    expect(marbleCount(result.current.state.board)).toBe(32);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.state.undosUsed).toBe(1);
  });

  it("restarts to the opening position", () => {
    const { result } = renderHook(() => useBrainVita());
    playMoves(result, [{ from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE }]);
    act(() => result.current.restart());
    expect(marbleCount(result.current.state.board)).toBe(32);
    expect(result.current.state.moves).toEqual([]);
    expect(result.current.seconds).toBe(0);
  });

  it("runs the clock from the first jump, not from opening the page", () => {
    const { result } = renderHook(() => useBrainVita());
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.seconds).toBe(0);
    playMoves(result, [{ from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE }]);
    act(() => vi.advanceTimersByTime(4_000));
    expect(result.current.seconds).toBe(4);
    act(() => result.current.restart());
    expect(result.current.seconds).toBe(0);
  });

  it("asks the solver for a hint that is a legal jump, and counts it", () => {
    const { result } = renderHook(() => useBrainVita());
    act(() => result.current.requestHint());
    act(() => vi.advanceTimersByTime(5));
    const hint = result.current.state.hint;
    expect(hint).not.toBeNull();
    expect(isLegalMove(result.current.state.board, hint as Move)).toBe(true);
    expect(result.current.state.hintsUsed).toBe(1);
    expect(result.current.hintNote).toBeNull();
  });

  it("says so, instead of guessing, when no hint can finish on one marble", () => {
    const line = findDoomedLine();
    const { result } = renderHook(() => useBrainVita());
    playMoves(result, line);
    expect(result.current.finished).toBe(false);
    act(() => result.current.requestHint());
    act(() => vi.advanceTimersByTime(5));
    expect(result.current.state.hint).toBeNull();
    expect(result.current.hintNote).toMatch(/no way/i);
    expect(result.current.state.hintsUsed).toBe(1);
  });

  it("finishes an unassisted game: opens the results and posts the marbles left", async () => {
    const hook = renderHook(() => useBrainVita());
    playMoves(hook.result, solution());
    expect(hook.result.current.finished).toBe(true);
    expect(hook.result.current.result?.marblesLeft).toBe(1);
    expect(hook.result.current.result?.usedHelp).toBe(false);
    expect(hook.result.current.resultOpen).toBe(true);
    expect(recordSoloScore).toHaveBeenCalledTimes(1);
    expect(recordSoloScore).toHaveBeenCalledWith("brainvita", "classic", 1, { seconds: expect.any(Number), moves: 31 });
    await act(async () => {});
    expect(hook.result.current.newPersonalBest).toBe(true);
  });

  it("does not post a game that used undo", () => {
    const hook = renderHook(() => useBrainVita());
    playMoves(hook.result, [{ from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE }]);
    act(() => hook.result.current.undo());
    playMoves(hook.result, solution());
    expect(hook.result.current.finished).toBe(true);
    expect(hook.result.current.result?.usedHelp).toBe(true);
    expect(recordSoloScore).not.toHaveBeenCalled();
  });

  it("does not post a game that used a hint", () => {
    const hook = renderHook(() => useBrainVita());
    act(() => hook.result.current.requestHint());
    act(() => vi.advanceTimersByTime(5));
    playMoves(hook.result, solution());
    expect(hook.result.current.result?.usedHelp).toBe(true);
    expect(recordSoloScore).not.toHaveBeenCalled();
  });

  it("claims a personal best only when the scorecard confirms it", async () => {
    recordSoloScore.mockResolvedValue({ isNewPersonalBest: false });
    const hook = renderHook(() => useBrainVita());
    playMoves(hook.result, solution());
    await act(async () => {});
    expect(hook.result.current.newPersonalBest).toBe(false);
  });

  it("survives the leaderboard being unreachable", async () => {
    recordSoloScore.mockRejectedValue(new Error("offline"));
    const hook = renderHook(() => useBrainVita());
    playMoves(hook.result, solution());
    await act(async () => {});
    expect(hook.result.current.finished).toBe(true);
    expect(hook.result.current.newPersonalBest).toBe(false);
  });

  it("closes the results dialog, and ignores taps once the game is over", () => {
    const hook = renderHook(() => useBrainVita());
    playMoves(hook.result, solution());
    act(() => hook.result.current.closeResult());
    expect(hook.result.current.resultOpen).toBe(false);
    const before = hook.result.current.state.board;
    act(() => hook.result.current.tap(0));
    act(() => hook.result.current.tap(CENTRE_HOLE));
    expect(hook.result.current.state.board).toEqual(before);
  });

  it("starts over from the results dialog", () => {
    const hook = renderHook(() => useBrainVita());
    playMoves(hook.result, solution());
    act(() => hook.result.current.restart());
    expect(hook.result.current.finished).toBe(false);
    expect(hook.result.current.resultOpen).toBe(false);
    expect(marbleCount(hook.result.current.state.board)).toBe(32);
  });

  it("posts again after a fresh unassisted game", () => {
    const hook = renderHook(() => useBrainVita());
    playMoves(hook.result, solution());
    act(() => hook.result.current.restart());
    playMoves(hook.result, solution());
    expect(recordSoloScore).toHaveBeenCalledTimes(2);
  });
});
