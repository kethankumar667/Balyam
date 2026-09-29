import { describe, it, expect } from "vitest";
import {
  MIN_MATCH_DURATION_MS,
  PACE_MAX_MATCHES,
  PACE_WINDOW_MS,
  PaceTracker,
  assessSession,
  isTooShort,
} from "../SessionRules.js";
import { REASON } from "../types.js";

describe("match duration rule", () => {
  it("has a floor for every game, and none is shorter than ten seconds", () => {
    const floors = Object.values(MIN_MATCH_DURATION_MS);
    expect(floors).toHaveLength(20);
    expect(Math.min(...floors)).toBeGreaterThanOrEqual(10_000);
  });

  it("treats a match one millisecond under the floor as too short and one exactly at it as fine", () => {
    const floor = MIN_MATCH_DURATION_MS.rps;

    expect(isTooShort("rps", floor - 1)).toBe(true);
    expect(isTooShort("rps", floor)).toBe(false);
  });

  it("gives longer games a longer floor than quick ones", () => {
    expect(MIN_MATCH_DURATION_MS.ludo).toBeGreaterThan(MIN_MATCH_DURATION_MS.tictactoe);
    expect(MIN_MATCH_DURATION_MS.rummy).toBeGreaterThan(MIN_MATCH_DURATION_MS.connect4);
  });
});

describe("assessSession", () => {
  it("passes a normal match", () => {
    expect(assessSession("chess", 5 * 60_000, 1)).toEqual({ ok: true });
  });

  it("names TOO_SHORT for a match that cannot have been played", () => {
    expect(assessSession("chess", 3_000, 1)).toEqual({ ok: false, code: REASON.TOO_SHORT });
  });

  it("names PACE_LIMIT only once the player passes the ceiling, not at it", () => {
    expect(assessSession("rps", 60_000, PACE_MAX_MATCHES)).toEqual({ ok: true });
    expect(assessSession("rps", 60_000, PACE_MAX_MATCHES + 1)).toEqual({ ok: false, code: REASON.PACE_LIMIT });
  });

  it("reports the duration problem before the pace one", () => {
    expect(assessSession("rps", 1_000, PACE_MAX_MATCHES + 5)).toEqual({ ok: false, code: REASON.TOO_SHORT });
  });
});

describe("PaceTracker", () => {
  it("counts matches finished inside the window, including the one just recorded", () => {
    const pace = new PaceTracker();

    expect(pace.record("p", 0)).toBe(1);
    expect(pace.record("p", 30_000)).toBe(2);
    expect(pace.record("p", 60_000)).toBe(3);
  });

  it("forgets matches that fell out of the window", () => {
    const pace = new PaceTracker();
    pace.record("p", 0);
    pace.record("p", 1_000);

    expect(pace.record("p", PACE_WINDOW_MS + 5_000)).toBe(1);
  });

  it("keeps each player's pace separate", () => {
    const pace = new PaceTracker();
    pace.record("a", 0);
    pace.record("a", 1_000);

    expect(pace.record("b", 2_000)).toBe(1);
  });

  it("flags a script that wins every 20 seconds, but not a person playing a match a minute", () => {
    const scripted = new PaceTracker();
    let last = 0;
    for (let i = 0; i < 30; i++) last = scripted.record("bot", i * 20_000);
    expect(last).toBeGreaterThan(PACE_MAX_MATCHES);

    const human = new PaceTracker();
    for (let i = 0; i < 30; i++) last = human.record("person", i * 60_000);
    expect(last).toBeLessThanOrEqual(PACE_MAX_MATCHES);
  });
});
