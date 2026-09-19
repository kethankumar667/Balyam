import { describe, it, expect } from "vitest";
import { validateRecordScorePayload, MAX_RECORDABLE_SCORE } from "../scoreValidation.js";

describe("validateRecordScorePayload — client-reported scores", () => {
  it("accepts a normal payload", () => {
    expect(validateRecordScorePayload({ game: "handcricket", modeId: "2_overs", score: 48 })).toEqual({ ok: true });
  });

  it("requires game, modeId and a numeric score", () => {
    expect(validateRecordScorePayload({ modeId: "x", score: 1 }).ok).toBe(false);
    expect(validateRecordScorePayload({ game: "g", score: 1 }).ok).toBe(false);
    expect(validateRecordScorePayload({ game: "g", modeId: "x" }).ok).toBe(false);
    expect(validateRecordScorePayload({ game: "g", modeId: "x", score: "12" as never }).ok).toBe(false);
    expect(validateRecordScorePayload(undefined).ok).toBe(false);
    expect(validateRecordScorePayload(null).ok).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity])("rejects non-finite score %p", (score) => {
    expect(validateRecordScorePayload({ game: "g", modeId: "x", score }).ok).toBe(false);
  });

  it("rejects negative scores, which would top any lower-is-better board", () => {
    expect(validateRecordScorePayload({ game: "2048", modeId: "zen", score: -1 }).ok).toBe(false);
  });

  it("rejects absurdly large scores", () => {
    expect(validateRecordScorePayload({ game: "2048", modeId: "zen", score: MAX_RECORDABLE_SCORE + 1 }).ok).toBe(false);
    expect(validateRecordScorePayload({ game: "2048", modeId: "zen", score: MAX_RECORDABLE_SCORE }).ok).toBe(true);
  });

  it("still tolerates a game/mode pair the registry does not know (existing behaviour)", () => {
    expect(validateRecordScorePayload({ game: "brand_new_game", modeId: "m", score: 5 }).ok).toBe(true);
  });

  describe("sudoku solve-time floor", () => {
    it.each([
      ["easy", 25],
      ["medium", 35],
      ["hard", 50],
      ["expert", 60],
    ])("rejects an impossible %s time and accepts the floor (%ss)", (modeId, floor) => {
      expect(validateRecordScorePayload({ game: "sudoku", modeId, score: 0 }).ok).toBe(false);
      expect(validateRecordScorePayload({ game: "sudoku", modeId, score: floor - 1 }).ok).toBe(false);
      expect(validateRecordScorePayload({ game: "sudoku", modeId, score: floor }).ok).toBe(true);
    });

    it("rejects a solve time longer than a day", () => {
      expect(validateRecordScorePayload({ game: "sudoku", modeId: "easy", score: 86_401 }).ok).toBe(false);
    });

    it("gives a specific, safe error message", () => {
      const r = validateRecordScorePayload({ game: "sudoku", modeId: "expert", score: 0 });
      expect(r).toEqual({ ok: false, error: expect.stringContaining("out of range") });
    });
  });
});
