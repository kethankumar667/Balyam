import { describe, it, expect, beforeEach } from "vitest";
import { challengeEngine } from "../ChallengeEngine.js";
import { profileService } from "../../profile/ProfileService.js";

describe("Daily & Weekly Challenge Engine", () => {
  beforeEach(() => {
    challengeEngine.reset();
    profileService.reset();
  });

  it("generates date-deterministic daily and weekly challenges", () => {
    const res = challengeEngine.getPlayerChallenges("p_chal_1");
    expect(res.daily.length).toBe(3);
    expect(res.weekly.length).toBeGreaterThanOrEqual(3);
    expect(res.dailyResetTime).toBeGreaterThan(Date.now());
    expect(res.weeklyResetTime).toBeGreaterThan(Date.now());
  });

  it("evaluates progress and supports reward claiming", () => {
    profileService.getOrCreateProfile("p_chal_1", "Challenge Player");

    // Play 3 matches to complete "Table Veteran" challenge
    for (let i = 0; i < 3; i++) {
      profileService.recordMatchFinished({
        roomCode: `RM_${i}`,
        game: "ludo",
        startedAt: 1000,
        finishedAt: 61000,
        durationMs: 60000,
        winnerId: "p_chal_1",
        participants: [{ playerId: "p_chal_1", name: "Challenge Player", isWinner: true }],
      });
    }

    const challenges = challengeEngine.getPlayerChallenges("p_chal_1");
    const play3Chal = challenges.daily.find((c) => c.title === "Table Veteran");
    expect(play3Chal?.completed).toBe(true);

    // Claim reward
    const claimRes = challengeEngine.claimChallengeReward("p_chal_1", play3Chal!.id);
    expect(claimRes.success).toBe(true);
    expect(claimRes.earnedXP).toBe(play3Chal?.xpReward);

    // Cannot claim twice
    const doubleClaim = challengeEngine.claimChallengeReward("p_chal_1", play3Chal!.id);
    expect(doubleClaim.success).toBe(false);
  });
});
