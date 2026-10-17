import { describe, expect, it } from "vitest";
import {
  DEFAULT_VAMANA_OPTIONS,
  VAMANA_BOT_DIFFICULTIES,
  VAMANA_MAX_TURN_SECONDS,
  VAMANA_MIN_TURN_SECONDS,
  sanitizeVamanaOptions,
} from "@shared/types.js";

describe("sanitizeVamanaOptions", () => {
  it("returns the defaults for anything that is not an object", () => {
    for (const junk of [undefined, null, 5, "x", true, [], [1, 2], () => 1]) {
      expect(sanitizeVamanaOptions(junk)).toEqual(DEFAULT_VAMANA_OPTIONS);
    }
  });

  it("returns the defaults for an empty object", () => {
    expect(sanitizeVamanaOptions({})).toEqual(DEFAULT_VAMANA_OPTIONS);
  });

  it("keeps a sane timer, rounded to whole seconds", () => {
    expect(sanitizeVamanaOptions({ turnTimerSeconds: 30 }).turnTimerSeconds).toBe(30);
    expect(sanitizeVamanaOptions({ turnTimerSeconds: 30.6 }).turnTimerSeconds).toBe(31);
  });

  it("clamps the timer into [min, max]", () => {
    expect(sanitizeVamanaOptions({ turnTimerSeconds: 1 }).turnTimerSeconds).toBe(VAMANA_MIN_TURN_SECONDS);
    expect(sanitizeVamanaOptions({ turnTimerSeconds: 99_999 }).turnTimerSeconds).toBe(VAMANA_MAX_TURN_SECONDS);
  });

  it("replaces an unusable timer with the default (there is no untimed mode)", () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "20", null, {}, [20]]) {
      expect(sanitizeVamanaOptions({ turnTimerSeconds: bad }).turnTimerSeconds).toBe(DEFAULT_VAMANA_OPTIONS.turnTimerSeconds);
    }
  });

  it("accepts only the closed set of bot difficulties, exactly", () => {
    for (const level of VAMANA_BOT_DIFFICULTIES) {
      expect(sanitizeVamanaOptions({ botDifficulty: level }).botDifficulty).toBe(level);
    }
    for (const bad of ["Easy", "PRO", "impossible", "", " pro", 1, null, undefined, {}]) {
      expect(sanitizeVamanaOptions({ botDifficulty: bad }).botDifficulty).toBe(DEFAULT_VAMANA_OPTIONS.botDifficulty);
    }
  });

  it("drops every key it does not know", () => {
    const out = sanitizeVamanaOptions({ turnTimerSeconds: 40, botDifficulty: "pro", pits: 99, seedsPerPit: 100, __proto__: { x: 1 } });
    expect(Object.keys(out).sort()).toEqual(["botDifficulty", "turnTimerSeconds"]);
    expect(out).toEqual({ turnTimerSeconds: 40, botDifficulty: "pro" });
  });

  it("returns a new object each call and never aliases the defaults", () => {
    const a = sanitizeVamanaOptions({});
    a.turnTimerSeconds = 1;
    expect(sanitizeVamanaOptions({}).turnTimerSeconds).toBe(DEFAULT_VAMANA_OPTIONS.turnTimerSeconds);
    expect(DEFAULT_VAMANA_OPTIONS.turnTimerSeconds).not.toBe(1);
  });
});
