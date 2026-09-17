import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGame2048, TARGET_TILE, TIME_ATTACK_SECONDS } from "../useGame2048";

describe("useGame2048", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Deterministic spawns: always picks the FIRST empty cell and always a
    // "2" (roll < 0.9). The two seed tiles from selectMode() therefore
    // always land at indices 0 and 1 — a "left" move merges them into a
    // single 4 at index 0, every time.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts at the mode-select menu", () => {
    const { result } = renderHook(() => useGame2048());
    expect(result.current.mode).toBeNull();
  });

  it("selectMode seeds exactly two tiles and resets score", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("zen"));
    expect(result.current.mode).toBe("zen");
    expect(result.current.score).toBe(0);
    expect(result.current.grid.filter((c) => c != null).length).toBe(2);
    expect(result.current.undosLeft).toBe(3);
  });

  it("move() slides and merges, updating the score", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("zen"));
    act(() => result.current.move("left"));
    // Both seed tiles (indices 0,1) were "2"s and merge into a 4.
    expect(result.current.score).toBe(4);
    expect(result.current.grid[0]?.value).toBe(4);
  });

  it("a no-op move (nothing to slide) leaves score and grid untouched", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("zen"));
    act(() => result.current.move("left")); // packs everything to index 0
    const gridAfterFirst = result.current.grid;
    act(() => result.current.move("left")); // already packed left — no-op
    expect(result.current.score).toBe(4);
    expect(result.current.grid).toEqual(gridAfterFirst);
  });

  it("undo (Zen only) restores the previous grid/score and decrements the allowance", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("zen"));
    const before = result.current.grid;
    act(() => result.current.move("left"));
    expect(result.current.score).toBe(4);

    act(() => result.current.undo());
    expect(result.current.score).toBe(0);
    expect(result.current.grid).toEqual(before);
    expect(result.current.undosLeft).toBe(2);
  });

  it("refuses undo outside Zen mode", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("battle"));
    act(() => result.current.move("left"));
    const scoreAfterMove = result.current.score;
    act(() => result.current.undo());
    expect(result.current.score).toBe(scoreAfterMove);
  });

  it("refuses undo once the allowance is spent", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("zen"));
    act(() => result.current.move("left"));
    act(() => result.current.undo());
    act(() => result.current.undo()); // nothing left to undo, but allowance also isn't there
    expect(result.current.undosLeft).toBe(2); // second undo was a no-op (empty history), not a third decrement
  });

  it("exposes every mode's best score via allBestScores even before a mode is picked", () => {
    const { result } = renderHook(() => useGame2048());
    expect(result.current.allBestScores).toEqual({ battle: 0, timeattack: 0, zen: 0 });
    expect(result.current.bestRaceTimeMs).toBeNull();
  });

  it("Race mode's elapsed time ticks upward while the run is live", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("race"));
    expect(result.current.elapsedMs).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(1000);
  });

  it("Time Attack counts down and auto-finishes when the clock reaches zero, recording a best score", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("timeattack"));
    expect(result.current.secondsLeft).toBe(TIME_ATTACK_SECONDS);

    act(() => result.current.move("left")); // score becomes 4

    act(() => {
      vi.advanceTimersByTime((TIME_ATTACK_SECONDS + 1) * 1000);
    });
    expect(result.current.isOver).toBe(true);
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.allBestScores.timeattack).toBe(4);
  });

  it("persists the best Time Attack score to localStorage for the next hook instance", () => {
    vi.useFakeTimers();
    const first = renderHook(() => useGame2048());
    act(() => first.result.current.selectMode("timeattack"));
    act(() => first.result.current.move("left"));
    act(() => {
      vi.advanceTimersByTime((TIME_ATTACK_SECONDS + 1) * 1000);
    });
    expect(first.result.current.allBestScores.timeattack).toBe(4);

    const second = renderHook(() => useGame2048());
    expect(second.result.current.allBestScores.timeattack).toBe(4);
  });

  it("TARGET_TILE is the classic 2048 target", () => {
    expect(TARGET_TILE).toBe(2048);
  });
});
