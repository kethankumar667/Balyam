import { describe, it, expect } from "vitest";
import { validateRecordScorePayload } from "../scoreValidation.js";

/**
 * Hardening found by the security review of the client-reported score route:
 * server-scored games must not be postable, prototype-key names must not reach
 * the object lookups behind it, and the free-form fields need a shape.
 */
describe("validateRecordScorePayload — hardening", () => {
  const ok = { game: "handcricket", modeId: "2_overs", score: 10 };

  describe("server-scored games", () => {
    it("rejects a client-reported Tic Tac Toe score — the server computes it from the match", () => {
      for (const modeId of ["quantum", "classic"]) {
        const r = validateRecordScorePayload({ game: "tictactoe", modeId, score: 8 });
        expect(r).toEqual({ ok: false, error: expect.stringContaining("recorded by the server") });
      }
    });
  });

  describe("strict modes (Sudoku)", () => {
    it("rejects a mode id the game does not have, so a bogus mode cannot dodge the time floor", () => {
      expect(validateRecordScorePayload({ game: "sudoku", modeId: "easy2", score: 0 }).ok).toBe(false);
      expect(validateRecordScorePayload({ game: "sudoku", modeId: "", score: 100 }).ok).toBe(false);
    });

    it("still accepts a real Sudoku mode at a plausible time", () => {
      expect(validateRecordScorePayload({ game: "sudoku", modeId: "medium", score: 300 }).ok).toBe(true);
    });

    it("keeps tolerating an unregistered mode on a non-strict game (existing solo modes)", () => {
      expect(validateRecordScorePayload({ game: "2048", modeId: "some_new_mode", score: 5 }).ok).toBe(true);
    });
  });

  describe("prototype-key names", () => {
    it.each(["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf"])(
      "rejects %s as a game or a mode without throwing",
      (key) => {
        expect(() => validateRecordScorePayload({ game: key, modeId: "x", score: 1 })).not.toThrow();
        expect(validateRecordScorePayload({ game: key, modeId: "x", score: 1 }).ok).toBe(false);
        expect(validateRecordScorePayload({ game: "2048", modeId: key, score: 1 }).ok).toBe(false);
      }
    );
  });

  describe("identifier shape", () => {
    it.each(["", "a".repeat(41), "has space", "semi;colon", "über", "../x"])("rejects game/mode id %p", (id) => {
      expect(validateRecordScorePayload({ ...ok, game: id }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, modeId: id }).ok).toBe(false);
    });

    it("accepts the ids real games use", () => {
      for (const [game, modeId] of [
        ["2048", "timeattack"],
        ["nokiasnake", "classic_walled"],
        ["roadrash", "circuit_rush"],
        ["handcricket", "2_overs"],
      ]) {
        expect(validateRecordScorePayload({ game, modeId, score: 1 }).ok).toBe(true);
      }
    });
  });

  describe("secondaryMetrics", () => {
    it("accepts a normal metrics bag", () => {
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: { balls: 12, strikeRate: 400.5, note: "gg" } }).ok).toBe(true);
    });

    it("rejects too many keys, odd key names, non-primitive or oversized values", () => {
      const many = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`k${i}`, i]));
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: many }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: { "bad key!": 1 } }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: { a: { nested: 1 } } as never }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: { a: [1, 2] } as never }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: { a: "x".repeat(81) } }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: { a: Infinity } as never }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: [1, 2] as never }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: "x" as never }).ok).toBe(false);
    });

    it("rejects a __proto__ key in the bag", () => {
      const bag = JSON.parse('{"__proto__": 1}');
      expect(validateRecordScorePayload({ ...ok, secondaryMetrics: bag }).ok).toBe(false);
    });
  });

  describe("radarMetrics", () => {
    it("accepts the five known axes within 0..100", () => {
      expect(
        validateRecordScorePayload({ ...ok, radarMetrics: { velocity: 0, clutch: 50, efficiency: 100, consistency: 12.5, aggression: 1 } }).ok
      ).toBe(true);
    });

    it("rejects unknown axes, out-of-range and non-numeric values", () => {
      expect(validateRecordScorePayload({ ...ok, radarMetrics: { hax: 1 } as never }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, radarMetrics: { velocity: 101 } }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, radarMetrics: { velocity: -1 } }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, radarMetrics: { velocity: "9" } as never }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, radarMetrics: 5 as never }).ok).toBe(false);
    });
  });

  describe("context and matchId", () => {
    it("accepts every real context and an absent one", () => {
      for (const context of ["SOLO", "VS_BOTS", "PVP_MULTIPLAYER", "PASS_AND_PLAY", undefined]) {
        expect(validateRecordScorePayload({ ...ok, context: context as never }).ok).toBe(true);
      }
    });

    it("rejects an invented context", () => {
      expect(validateRecordScorePayload({ ...ok, context: "GOD_MODE" as never }).ok).toBe(false);
    });

    it("bounds matchId", () => {
      expect(validateRecordScorePayload({ ...ok, matchId: "solo_2048_zen_1789781237595" }).ok).toBe(true);
      expect(validateRecordScorePayload({ ...ok, matchId: "m".repeat(101) }).ok).toBe(false);
      expect(validateRecordScorePayload({ ...ok, matchId: 5 as never }).ok).toBe(false);
    });
  });
});
