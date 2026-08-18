import { describe, it, expect } from "vitest";
import { AchievementsEngine } from "../AchievementsEngine.js";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats.js";

describe("Achievements Rule Engine", () => {
  it("evaluates locked and unlocked achievements based on PlayerStats", () => {
    const stats = INITIAL_PLAYER_STATS("p1");

    // Initially all locked except progress = 0
    let achs = AchievementsEngine.evaluateAchievements(stats);
    expect(achs.every((a) => !a.unlocked)).toBe(true);

    // Player wins 1 match
    stats.totalMatches = 1;
    stats.wins = 1;
    stats.winRate = 100;

    achs = AchievementsEngine.evaluateAchievements(stats);
    const firstMatch = achs.find((a) => a.id === "first_match");
    const firstWin = achs.find((a) => a.id === "first_win");
    const tenWins = achs.find((a) => a.id === "ten_wins");

    expect(firstMatch?.unlocked).toBe(true);
    expect(firstWin?.unlocked).toBe(true);
    expect(tenWins?.unlocked).toBe(false);
    expect(tenWins?.currentProgress).toBe(1);
    expect(tenWins?.progressPercent).toBe(10);
  });
});
