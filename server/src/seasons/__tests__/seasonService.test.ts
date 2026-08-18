import { describe, it, expect, beforeEach } from "vitest";
import { seasonService } from "../SeasonService.js";
import { SeasonEngine } from "../SeasonEngine.js";
import { SeasonRewardsEngine } from "../SeasonRewardsEngine.js";
import { profileService } from "../../profile/ProfileService.js";

describe("Season Platform & Rewards Engine", () => {
  beforeEach(() => {
    seasonService.reset();
    profileService.reset();
  });

  it("resolves the current active season correctly", () => {
    const season = SeasonEngine.getCurrentSeason();
    expect(season.id).toMatch(/^season_\d+$/);
    expect(season.seasonNumber).toBeGreaterThanOrEqual(1);
    expect(season.isActive).toBe(true);
    expect(season.endsAt).toBeGreaterThan(season.startsAt);
  });

  it("tracks seasonal XP and separates it from lifetime stats", () => {
    profileService.getOrCreateProfile("player_1", "Alice");

    // Award seasonal XP
    const stats = seasonService.recordSeasonMatch("player_1", {
      isWin: true,
      earnedXP: 150,
      isTournamentWin: false,
    });

    expect(stats.seasonXP).toBe(150);
    expect(stats.seasonWins).toBe(1);
    expect(stats.seasonMatches).toBe(1);
    expect(stats.seasonWinRate).toBe(100);
    expect(stats.seasonRankTier).toBe("Initiate");
  });

  it("evaluates seasonal reward claims and protects against duplicates", () => {
    profileService.getOrCreateProfile("player_1", "Alice");
    seasonService.recordSeasonMatch("player_1", { isWin: true, earnedXP: 350 });

    const stats = seasonService.getPlayerSeasonStats("player_1");
    const rewards = SeasonRewardsEngine.evaluateRewards(stats.seasonXP, stats.rewardsClaimed);

    // Tier 1 (100 XP) and Tier 2 (300 XP) should be unlocked
    expect(rewards[0]!.unlocked).toBe(true);
    expect(rewards[1]!.unlocked).toBe(true);
    expect(rewards[2]!.unlocked).toBe(false);

    // Claim Tier 1
    const claimRes = seasonService.claimReward("player_1", "season_tier_1");
    expect(claimRes.success).toBe(true);
    expect(claimRes.earnedXP).toBe(50);

    // Re-claiming Tier 1 should fail
    const reClaimRes = seasonService.claimReward("player_1", "season_tier_1");
    expect(reClaimRes.success).toBe(false);
  });

  it("produces immutable historical snapshots on season rollover", () => {
    profileService.getOrCreateProfile("p1", "Alice");
    profileService.getOrCreateProfile("p2", "Bob");

    seasonService.recordSeasonMatch("p1", { isWin: true, earnedXP: 500 });
    seasonService.recordSeasonMatch("p2", { isWin: false, earnedXP: 100 });

    const currentSeason = seasonService.getCurrentSeason();
    const snapshots = seasonService.rolloverSeason(currentSeason.id);

    expect(snapshots.length).toBe(2);
    expect(snapshots[0]!.placement).toBe(1);
    expect(snapshots[0]!.seasonXP).toBe(500);
    expect(snapshots[1]!.placement).toBe(2);
    expect(snapshots[1]!.seasonXP).toBe(100);
  });
});
