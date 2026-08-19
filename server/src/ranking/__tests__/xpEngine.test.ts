import { describe, it, expect, beforeEach } from "vitest";
import { XPEngine } from "../XPEngine.js";
import { profileService } from "../../profile/ProfileService.js";
import { calculateMatchXP, calculateXPProgression } from "@shared/ranking/RankingRules.js";

describe("XP & Level Progression Engine", () => {
  beforeEach(() => {
    profileService.reset();
  });

  it("calculates match XP including win, streak, and recovery bonuses", () => {
    const basePlayed = calculateMatchXP({ isWinner: false, durationMs: 60000 });
    expect(basePlayed).toBe(15);

    const winXP = calculateMatchXP({ isWinner: true, durationMs: 60000 });
    expect(winXP).toBe(50); // 15 base + 35 win

    const streakWinXP = calculateMatchXP({
      isWinner: true,
      durationMs: 60000,
      currentWinStreak: 3,
    });
    expect(streakWinXP).toBe(60); // 15 + 35 + (2 * 5)

    const recoveryWinXP = calculateMatchXP({
      isWinner: true,
      durationMs: 60000,
      recoveryCount: 1,
    });
    expect(recoveryWinXP).toBe(70); // 15 + 35 + 20
  });

  it("calculates level advancement and progression percentages", () => {
    const p1 = calculateXPProgression(0);
    expect(p1.currentLevel).toBe(1);
    expect(p1.currentXP).toBe(0);
    expect(p1.levelProgressPercent).toBe(0);

    const p2 = calculateXPProgression(250);
    expect(p2.currentLevel).toBe(3);
    expect(p2.currentXP).toBe(50);
    expect(p2.levelProgressPercent).toBe(50);
  });

  it("awards XP to player profiles through XPEngine", () => {
    profileService.getOrCreateProfile("xp_user", "XP User");
    const result = XPEngine.awardMatchXP("xp_user", { isWinner: true, durationMs: 120000 });

    expect(result.earnedXP).toBe(50);
    expect(result.profile.experiencePoints).toBe(50);
    expect(result.progression.currentLevel).toBe(1);
  });
});
