import { describe, it, expect } from "vitest";
import type { HcBall, HcInnings } from "@shared/types";
import {
  allPartnerships,
  currentPartnership,
  economy,
  fallOfWickets,
  lastOvers,
  overBreakdown,
  oversFromBalls,
  strikeRate,
} from "../hc-stats";

/**
 * Cricket arithmetic is the kind that looks right in a screenshot and is
 * quietly off by one, so these tests pin the boundaries specifically: the
 * sixth ball completing an over, a wicket ball belonging to the partnership it
 * ended rather than the one it started, and an in-progress over not counting
 * as a maiden.
 */

/** Build a ball sequence from a compact spec; `w` marks a wicket. */
function balls(spec: Array<number | "w">, batters: string[] = []): HcBall[] {
  return spec.map((s, i) => ({
    inningsNumber: 1 as const,
    overNumber: Math.floor(i / 6) + 1,
    ballInOver: (i % 6) + 1,
    batterPick: 1,
    bowlerPick: 2,
    runs: s === "w" ? 0 : s,
    wicket: s === "w",
    isBoundary: s === 4 || s === 6,
    isRestrictedBall: false,
    batterId: batters[i] ?? "bat1",
    bowlerId: "bowl1",
  }));
}

function innings(spec: Array<number | "w">, batters: string[] = []): HcInnings {
  const h = balls(spec, batters);
  return {
    number: 1,
    battingPlayerId: "a",
    bowlingPlayerId: "b",
    runs: h.reduce((a, b) => a + b.runs, 0),
    wickets: h.filter((b) => b.wicket).length,
    balls: h.length,
    overs: 10,
    endedReason: null,
    history: h,
    strikerIdx: 0,
    nonStrikerIdx: 1,
    nextBatterIdx: 2,
    currentBowlerId: "bowl1",
    batterStats: {},
    bowlerStats: {},
    restrictedBallsByOver: {},
    powerplayOvers: 2,
    needsNextBatterPick: false,
    pendingBatterSlot: null,
  } as HcInnings;
}

describe("oversFromBalls", () => {
  it("counts the sixth ball as a completed over, not 0.6", () => {
    expect(oversFromBalls(0)).toBe("0.0");
    expect(oversFromBalls(5)).toBe("0.5");
    expect(oversFromBalls(6)).toBe("1.0");
    expect(oversFromBalls(7)).toBe("1.1");
    expect(oversFromBalls(60)).toBe("10.0");
  });

  it("never renders a negative or fractional over", () => {
    expect(oversFromBalls(-3)).toBe("0.0");
    expect(oversFromBalls(6.9)).toBe("1.0");
  });
});

describe("rates", () => {
  it("computes strike rate per 100 balls", () => {
    expect(strikeRate(50, 25)).toBe(200);
    expect(strikeRate(0, 10)).toBe(0);
  });

  it("computes economy per over, not per ball", () => {
    // 30 runs off 5 overs (30 balls) is 6.00 an over.
    expect(economy(30, 30)).toBe(6);
    expect(economy(13, 5)).toBeCloseTo(15.6, 5);
  });

  it("returns null rather than dividing by zero", () => {
    expect(strikeRate(0, 0)).toBeNull();
    expect(economy(0, 0)).toBeNull();
  });
});

describe("currentPartnership", () => {
  it("counts only balls since the last wicket", () => {
    // 4,6 then a wicket, then 1,2 — the live stand is 3 off 2.
    const p = currentPartnership(innings([4, 6, "w", 1, 2]));
    expect(p).toMatchObject({ runs: 3, balls: 2 });
  });

  it("treats the wicket ball as ending the PREVIOUS stand, not starting the new one", () => {
    // Regression guard: an off-by-one here makes the new partnership inherit
    // the dismissal ball and read 1 ball too long from the moment it starts.
    const p = currentPartnership(innings([4, 6, "w"]));
    expect(p.balls).toBe(0);
    expect(p.runs).toBe(0);
  });

  it("covers the whole innings when no wicket has fallen", () => {
    const p = currentPartnership(innings([1, 4, 6, 2]));
    expect(p).toMatchObject({ runs: 13, balls: 4, forWicket: 0 });
  });

  it("reports which batters are in the stand, without duplicates", () => {
    const p = currentPartnership(innings([1, 2, 3], ["x", "y", "x"]));
    expect(p.batterIds).toEqual(["x", "y"]);
  });

  it("is empty for an innings with no balls", () => {
    expect(currentPartnership(innings([]))).toMatchObject({ runs: 0, balls: 0 });
  });
});

describe("allPartnerships", () => {
  it("closes a stand on each wicket and excludes the live one", () => {
    const p = allPartnerships(innings([4, 6, "w", 1, 2, "w", 3]));
    expect(p).toHaveLength(2);
    // First stand: 4+6+0 across 3 balls, for the 0th wicket down.
    expect(p[0]).toMatchObject({ runs: 10, balls: 3, forWicket: 0 });
    expect(p[1]).toMatchObject({ runs: 3, balls: 3, forWicket: 1 });
  });

  it("returns nothing when no wicket has fallen", () => {
    expect(allPartnerships(innings([1, 2, 3]))).toEqual([]);
  });
});

describe("fallOfWickets", () => {
  it("reports the running score and over at each dismissal", () => {
    const f = fallOfWickets(innings([4, 6, "w", 1, 2, "w"]));
    expect(f).toHaveLength(2);
    expect(f[0]).toMatchObject({ wicket: 1, score: 10, over: "0.3" });
    // Second wicket falls on the sixth ball — that completes an over.
    expect(f[1]).toMatchObject({ wicket: 2, score: 13, over: "1.0" });
  });

  it("credits the bowler and names the dismissed batter", () => {
    const f = fallOfWickets(innings([1, "w"], ["x", "y"]));
    expect(f[0].batterId).toBe("y");
    expect(f[0].bowlerId).toBe("bowl1");
  });

  it("is empty when nobody is out", () => {
    expect(fallOfWickets(innings([1, 2, 3]))).toEqual([]);
  });
});

describe("lastOvers", () => {
  it("windows to the requested number of overs", () => {
    // 12 balls: first over all 1s, second over all 6s.
    const spec: Array<number | "w"> = [1, 1, 1, 1, 1, 1, 6, 6, 6, 6, 6, 6];
    expect(lastOvers(innings(spec), 1)).toMatchObject({ runs: 36, balls: 6 });
    expect(lastOvers(innings(spec), 2)).toMatchObject({ runs: 42, balls: 12 });
  });

  it("returns the whole innings when it is shorter than the window", () => {
    expect(lastOvers(innings([4, 4]), 5)).toMatchObject({ runs: 8, balls: 2 });
  });
});

describe("overBreakdown", () => {
  it("groups runs and wickets by over", () => {
    const spec: Array<number | "w"> = [1, 1, 1, 1, 1, 1, 6, "w", 2, 0, 0, 0];
    const o = overBreakdown(innings(spec));
    expect(o).toHaveLength(2);
    expect(o[0]).toMatchObject({ over: 1, runs: 6, wickets: 0 });
    expect(o[1]).toMatchObject({ over: 2, runs: 8, wickets: 1 });
  });

  it("counts a completed wicketless over as a maiden", () => {
    const o = overBreakdown(innings([0, 0, 0, 0, 0, 0]));
    expect(o[0].maiden).toBe(true);
  });

  it("does NOT call an in-progress scoreless over a maiden", () => {
    // Two dots into an over is not a maiden yet — it can still be hit for six.
    const o = overBreakdown(innings([0, 0]));
    expect(o[0].maiden).toBe(false);
  });
});
