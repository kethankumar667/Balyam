import { describe, expect, it } from "vitest";
import {
  CONNECT4_BOT_DIFFICULTIES,
  CONNECT4_MAX_TURN_SECONDS,
  CONNECT4_MIN_TURN_SECONDS,
  DEFAULT_CONNECT4_OPTIONS,
  sanitizeConnect4Options,
} from "@shared/types.js";

/**
 * The room-create payload is client-controlled. Every value is validated against a closed set
 * or clamped, and there is deliberately no way to switch the turn clock off: without a clock a
 * player could stall a paid match forever, and the platform's away-player takeover (two
 * consecutive timeouts) would never fire.
 */
describe("sanitizeConnect4Options", () => {
  it("has the agreed defaults and bounds", () => {
    expect(DEFAULT_CONNECT4_OPTIONS).toEqual({ turnTimerSeconds: 20, botDifficulty: "medium" });
    expect(CONNECT4_MIN_TURN_SECONDS).toBe(5);
    expect(CONNECT4_MAX_TURN_SECONDS).toBe(120);
    expect([...CONNECT4_BOT_DIFFICULTIES]).toEqual(["easy", "medium", "pro"]);
  });

  it.each([undefined, null, 0, 5, "", "options", true, [], [1, 2]])("turns %j into the defaults", (input) => {
    expect(sanitizeConnect4Options(input)).toEqual(DEFAULT_CONNECT4_OPTIONS);
  });

  it("returns the defaults for an empty object", () => {
    expect(sanitizeConnect4Options({})).toEqual(DEFAULT_CONNECT4_OPTIONS);
  });

  describe("turnTimerSeconds", () => {
    it.each([
      [20, 20],
      [5, 5],
      [120, 120],
      [45, 45],
      [20.4, 20],
      [20.6, 21],
      [4.6, 5],
      [1, 5],
      [4, 5],
      [121, 120],
      [10_000, 120],
      [Number.MAX_SAFE_INTEGER, 120],
    ])("%d becomes %d (whole seconds, clamped to 5-120)", (input, expected) => {
      expect(sanitizeConnect4Options({ turnTimerSeconds: input }).turnTimerSeconds).toBe(expected);
    });

    it.each([0, -1, -100, Number.NEGATIVE_INFINITY, Number.NaN, Number.POSITIVE_INFINITY, "20", "off", null, undefined, true, {}, [20]])(
      "%j falls back to the default: there is no 'untimed' setting",
      (input) => {
        expect(sanitizeConnect4Options({ turnTimerSeconds: input }).turnTimerSeconds).toBe(
          DEFAULT_CONNECT4_OPTIONS.turnTimerSeconds,
        );
      },
    );
  });

  describe("botDifficulty", () => {
    it.each(["easy", "medium", "pro"])("accepts %s", (level) => {
      expect(sanitizeConnect4Options({ botDifficulty: level }).botDifficulty).toBe(level);
    });

    it.each(["PRO", "Easy", "master", "hard", "", " pro", "pro ", 1, null, undefined, true, {}, ["pro"]])(
      "rejects %j (case-sensitive closed set) and uses the default",
      (level) => {
        expect(sanitizeConnect4Options({ botDifficulty: level }).botDifficulty).toBe(DEFAULT_CONNECT4_OPTIONS.botDifficulty);
      },
    );
  });

  it("drops unknown keys: the result has exactly the two known options", () => {
    const result = sanitizeConnect4Options({ turnTimerSeconds: 30, botDifficulty: "easy", boardColumns: 99, winLength: 2, isAdmin: true });
    expect(Object.keys(result).sort()).toEqual(["botDifficulty", "turnTimerSeconds"]);
    expect(result).toEqual({ turnTimerSeconds: 30, botDifficulty: "easy" });
  });

  it("is not affected by a prototype-pollution attempt", () => {
    const hostile = JSON.parse('{"__proto__":{"turnTimerSeconds":1,"polluted":true},"constructor":{"prototype":{"polluted":true}}}');
    const result = sanitizeConnect4Options(hostile);
    expect(result).toEqual(DEFAULT_CONNECT4_OPTIONS);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("returns a new object every time and never mutates its input", () => {
    const input = { turnTimerSeconds: 999, botDifficulty: "nonsense" };
    const snapshot = JSON.stringify(input);
    const a = sanitizeConnect4Options(input);
    const b = sanitizeConnect4Options(input);
    expect(a).not.toBe(b);
    expect(a).not.toBe(DEFAULT_CONNECT4_OPTIONS);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("cannot be used to hand back the shared defaults object for mutation", () => {
    const result = sanitizeConnect4Options(undefined);
    result.turnTimerSeconds = 1;
    expect(DEFAULT_CONNECT4_OPTIONS.turnTimerSeconds).toBe(20);
  });
});
