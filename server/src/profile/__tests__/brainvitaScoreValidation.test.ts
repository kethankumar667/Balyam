import { describe, expect, it } from "vitest";
import { getGameModeConfig } from "@shared/profile/GameModes.js";
import { validateRecordScorePayload } from "../scoreValidation.js";

/**
 * Brain Vita is a client-only game, so the server cannot replay it; what it can do is refuse a score
 * no game could produce. The score is the marbles left when no jump remained: 1 (perfect) to 31.
 */
describe("Brain Vita score validation", () => {
  const post = (score: number, modeId = "classic") => validateRecordScorePayload({ game: "brainvita", modeId, score });

  it("is registered as a lower-is-better game with one strict mode", () => {
    const config = getGameModeConfig("brainvita");
    expect(config.game).toBe("brainvita");
    expect(config.strictModes).toBe(true);
    expect(config.modes.map((mode) => mode.modeId)).toEqual(["classic"]);
    expect(config.modes[0].scoringDirection).toBe("LOWER_IS_BETTER");
    expect(config.defaultModeId).toBe("classic");
  });

  it.each([1, 2, 5, 16, 31])("accepts %d marbles left", (score) => {
    expect(post(score).ok).toBe(true);
  });

  it("refuses a score below the best possible game: nobody finishes with no marbles", () => {
    expect(post(0).ok).toBe(false);
    expect(post(-1).ok).toBe(false);
  });

  it("refuses a score above anything reachable: the first jump already leaves 31", () => {
    expect(post(32).ok).toBe(false);
    expect(post(33).ok).toBe(false);
    expect(post(1_000).ok).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("refuses %p", (score) => {
    expect(post(score).ok).toBe(false);
  });

  it("refuses a mode that does not exist, so no phantom leaderboard can be created", () => {
    expect(post(1, "easy").ok).toBe(false);
    expect(post(1, "").ok).toBe(false);
    expect(post(1, "Classic").ok).toBe(false);
  });
});
