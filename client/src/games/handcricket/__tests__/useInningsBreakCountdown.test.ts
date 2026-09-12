import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { HcInnings, HcState } from "@shared/types";
import { useInningsBreakCountdown } from "../useInningsBreakCountdown";

vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({ emit: vi.fn() }),
}));

function makeInnings(overrides: Partial<HcInnings> = {}): HcInnings {
  return {
    number: 1,
    battingPlayerId: "p0",
    bowlingPlayerId: "p1",
    runs: 42,
    wickets: 3,
    balls: 36,
    overs: 10,
    endedReason: "oversUp",
    history: [],
    strikerIdx: 0,
    nonStrikerIdx: 1,
    nextBatterIdx: 2,
    currentBowlerId: null,
    lastBowlerId: null,
    batterStats: {},
    bowlerStats: {},
    restrictedBallsByOver: {},
    powerplayOvers: 0,
    needsNextBatterPick: false,
    pendingBatterSlot: null,
    ...overrides,
  };
}

function makeState(overrides: Partial<HcState> = {}): HcState {
  return {
    kind: "handcricket",
    phase: "innings2",
    playerOrder: ["p0", "p1"],
    options: { mode: "single", format: "t20", category: "international" },
    teamSelections: {},
    tossPicks: {},
    tossSum: null,
    tossWinnerId: null,
    innings1: makeInnings(),
    innings2: null,
    pendingPicks: {},
    winnerId: null,
    result: null,
    maxWickets: 10,
    inningsBreakUntil: null,
    inningsBreakReady: [],
    oversPerInnings: 10,
    startedAt: Date.now(),
    ...overrides,
  };
}

const players = [
  { id: "p0", name: "Asha" },
  { id: "p1", name: "Ravi" },
];

describe("useInningsBreakCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is inactive when there is no break running", () => {
    const state = makeState({ inningsBreakUntil: null });
    const { result } = renderHook(() => useInningsBreakCountdown(state, players, "p0"));
    expect(result.current.active).toBe(false);
  });

  it("counts down the seconds remaining while active", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const state = makeState({ inningsBreakUntil: now + 9500 });
    const { result } = renderHook(() => useInningsBreakCountdown(state, players, "p0"));

    expect(result.current.active).toBe(true);
    expect(result.current.secondsLeft).toBe(10);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.secondsLeft).toBeLessThanOrEqual(5);
  });

  it("becomes inactive once the deadline passes, even before the server clears it", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const state = makeState({ inningsBreakUntil: now - 1 });
    const { result } = renderHook(() => useInningsBreakCountdown(state, players, "p0"));
    expect(result.current.active).toBe(false);
  });

  it("lists everyone but self who hasn't pressed Continue", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const state = makeState({ inningsBreakUntil: now + 5000, inningsBreakReady: [] });
    const { result } = renderHook(() => useInningsBreakCountdown(state, players, "p0"));
    expect(result.current.iAmReady).toBe(false);
    expect(result.current.waitingOn).toEqual(["Ravi"]);
  });

  it("reports self as ready once in inningsBreakReady, excluding self from waitingOn", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const state = makeState({ inningsBreakUntil: now + 5000, inningsBreakReady: ["p0"] });
    const { result } = renderHook(() => useInningsBreakCountdown(state, players, "p0"));
    expect(result.current.iAmReady).toBe(true);
    expect(result.current.waitingOn).toEqual(["Ravi"]);
  });
});
