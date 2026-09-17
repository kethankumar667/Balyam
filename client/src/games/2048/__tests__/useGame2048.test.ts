import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  useGame2048,
  TARGET_TILE,
  TIME_ATTACK_SECONDS,
  getAdaptiveGarbageThreshold,
  getGhostTileAtElapsed,
  type RaceGhostPoint,
} from "../useGame2048";
import { getGame2048Stats, syncGame2048Stats } from "../../../lib/game2048StatsApi";

// The hook syncs personal bests to the account (see `lib/game2048StatsApi.ts`)
// on mount and on every new best. Mocked here — same convention as
// `useEconomy.test.tsx` mocking `economyApi` — so these tests exercise game
// logic only, without a real network round trip on every `renderHook()`.
vi.mock("../../../lib/game2048StatsApi", () => ({
  getGame2048Stats: vi.fn().mockResolvedValue(null),
  syncGame2048Stats: vi.fn().mockResolvedValue(null),
}));

const mockedGetGame2048Stats = vi.mocked(getGame2048Stats);
const mockedSyncGame2048Stats = vi.mocked(syncGame2048Stats);

describe("useGame2048", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedGetGame2048Stats.mockReset().mockResolvedValue(null);
    mockedSyncGame2048Stats.mockReset().mockResolvedValue(null);
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

  it("Race mode has no ghost status until a best run exists", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("race"));
    expect(result.current.ghostStatus).toBeNull();
  });

  it("merges a cloud personal best onto local stats on mount", async () => {
    mockedGetGame2048Stats.mockResolvedValueOnce({
      bestScore: { battle: 500, timeattack: 0, zen: 0 },
      bestRaceTimeMs: null,
      bestRaceGhost: null,
      dailyBestScore: 0,
      dailyDate: null,
    });
    const { result } = renderHook(() => useGame2048());
    await waitFor(() => expect(result.current.allBestScores.battle).toBe(500));
  });

  it("a lower cloud score never regresses a higher local best", async () => {
    window.localStorage.setItem(
      "bhalyam.2048.stats.v1",
      JSON.stringify({ bestScore: { battle: 0, timeattack: 900, zen: 0 }, bestRaceTimeMs: null }),
    );
    mockedGetGame2048Stats.mockResolvedValueOnce({
      bestScore: { battle: 0, timeattack: 100, zen: 0 },
      bestRaceTimeMs: null,
      bestRaceGhost: null,
      dailyBestScore: 0,
      dailyDate: null,
    });
    const { result } = renderHook(() => useGame2048());
    await waitFor(() => expect(mockedGetGame2048Stats).toHaveBeenCalled());
    expect(result.current.allBestScores.timeattack).toBe(900);
  });

  it("merges today's cloud Daily Challenge score onto local", async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockedGetGame2048Stats.mockResolvedValueOnce({
      bestScore: { battle: 0, timeattack: 0, zen: 0 },
      bestRaceTimeMs: null,
      bestRaceGhost: null,
      dailyBestScore: 777,
      dailyDate: today,
    });
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("daily"));
    await waitFor(() => expect(result.current.dailyBestScore).toBe(777));
  });

  it("ignores a cloud Daily Challenge score from a previous day", async () => {
    mockedGetGame2048Stats.mockResolvedValueOnce({
      bestScore: { battle: 0, timeattack: 0, zen: 0 },
      bestRaceTimeMs: null,
      bestRaceGhost: null,
      dailyBestScore: 9999,
      dailyDate: "2020-01-01",
    });
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("daily"));
    await waitFor(() => expect(mockedGetGame2048Stats).toHaveBeenCalled());
    expect(result.current.dailyBestScore).toBe(0);
  });

  it("pushes a newly-recorded local best up to the cloud", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("timeattack"));
    act(() => result.current.move("left"));
    act(() => {
      vi.advanceTimersByTime((TIME_ATTACK_SECONDS + 1) * 1000);
    });
    expect(mockedSyncGame2048Stats).toHaveBeenCalledWith(
      expect.objectContaining({ bestScore: expect.objectContaining({ timeattack: 4 }) }),
    );
  });
});

describe("getAdaptiveGarbageThreshold", () => {
  it("holds the baseline threshold under normal conditions", () => {
    expect(getAdaptiveGarbageThreshold(false, 40)).toBe(4);
  });

  it("escalates pressure during an overclock cascade", () => {
    expect(getAdaptiveGarbageThreshold(true, 40)).toBe(2);
  });

  it("eases off when the board is nearly full, even mid-cascade", () => {
    expect(getAdaptiveGarbageThreshold(true, 85)).toBe(6);
  });
});

describe("getGhostTileAtElapsed", () => {
  const ghost: RaceGhostPoint[] = [
    { atMs: 1000, tile: 4 },
    { atMs: 5000, tile: 16 },
    { atMs: 12000, tile: 64 },
  ];

  it("returns 0 before the ghost's first milestone", () => {
    expect(getGhostTileAtElapsed(ghost, 500)).toBe(0);
  });

  it("returns the most recent milestone reached by the given elapsed time", () => {
    expect(getGhostTileAtElapsed(ghost, 6000)).toBe(16);
  });

  it("returns 0 for a null or empty ghost", () => {
    expect(getGhostTileAtElapsed(null, 6000)).toBe(0);
    expect(getGhostTileAtElapsed([], 6000)).toBe(0);
  });
});
