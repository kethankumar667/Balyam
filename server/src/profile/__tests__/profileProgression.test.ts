import { describe, it, expect, beforeEach } from "vitest";
import { profileService } from "../ProfileService.js";
import {
  calculateMiniclipXPProgression,
  calculateMiniclipMatchXP,
  getLevelTier,
  getLevelTitle,
  calculateLevelCoinReward,
  LEVEL_MILESTONES,
  calculateLevel,
  totalXPForLevel,
  XP_CONFIG,
} from "@shared/progression/MiniclipProgression.js";

describe("Miniclip XP & Levels Progression System", () => {
  beforeEach(() => {
    profileService.reset();
  });

  describe("Tier and Level Calculations", () => {
    it("correctly identifies all 8 Miniclip level tiers", () => {
      // Tier 1: Bronze (1-5)
      expect(getLevelTier(1).name).toBe("Bronze");
      expect(getLevelTier(1).stars).toBe(1);
      expect(getLevelTier(1).hasWings).toBe(false);
      expect(getLevelTier(5).name).toBe("Bronze");

      // Tier 2: Silver (6-15)
      expect(getLevelTier(6).name).toBe("Silver");
      expect(getLevelTier(6).stars).toBe(2);
      expect(getLevelTier(6).hasWings).toBe(false);
      expect(getLevelTier(15).name).toBe("Silver");

      // Tier 3: Cobalt (16-30)
      expect(getLevelTier(16).name).toBe("Cobalt");
      expect(getLevelTier(16).stars).toBe(2);
      expect(getLevelTier(16).hasWings).toBe(true);
      expect(getLevelTier(30).name).toBe("Cobalt");

      // Tier 4: Gold (31-50)
      expect(getLevelTier(31).name).toBe("Gold");
      expect(getLevelTier(31).stars).toBe(3);
      expect(getLevelTier(31).hasLaurel).toBe(true);
      expect(getLevelTier(50).name).toBe("Gold");

      // Tier 5: Ruby (51-75)
      expect(getLevelTier(51).name).toBe("Ruby");
      expect(getLevelTier(51).stars).toBe(4);
      expect(getLevelTier(51).hasCrown).toBe(true);
      expect(getLevelTier(75).name).toBe("Ruby");

      // Tier 6: Amethyst (76-100)
      expect(getLevelTier(76).name).toBe("Amethyst");
      expect(getLevelTier(76).stars).toBe(5);
      expect(getLevelTier(76).badgeShape).toBe("imperial-crest");
      expect(getLevelTier(100).name).toBe("Amethyst");

      // Tier 7: Emerald (101-150)
      expect(getLevelTier(101).name).toBe("Emerald");
      expect(getLevelTier(101).stars).toBe(5);
      expect(getLevelTier(101).badgeShape).toBe("dragon-crest");
      expect(getLevelTier(150).name).toBe("Emerald");

      // Tier 8: Celestial (151+)
      expect(getLevelTier(151).name).toBe("Celestial");
      expect(getLevelTier(151).badgeShape).toBe("celestial-crown");
      expect(getLevelTier(999).name).toBe("Celestial");
    });

    it("returns accurate authentic titles across levels", () => {
      expect(getLevelTitle(1)).toBe("Novice");
      expect(getLevelTitle(2)).toBe("Rookie");
      expect(getLevelTitle(4)).toBe("Trainee");
      expect(getLevelTitle(5)).toBe("Rising Talent");
      expect(getLevelTitle(10)).toBe("Contender");
      expect(getLevelTitle(20)).toBe("Sharpshooter");
      expect(getLevelTitle(50)).toBe("High Roller");
      expect(getLevelTitle(100)).toBe("Table Overlord");
      expect(getLevelTitle(150)).toBe("Legendary Icon");
      expect(getLevelTitle(200)).toBe("Living Legend");
    });

    it("calculates level and total XP thresholds correctly", () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(250)).toBe(3);
      expect(calculateLevel(1500)).toBe(16);

      expect(totalXPForLevel(1)).toBe(0);
      expect(totalXPForLevel(2)).toBe(100);
      expect(totalXPForLevel(10)).toBe(900);
    });

    it("calculates progression object with tier, percent, and next reward", () => {
      const prog = calculateMiniclipXPProgression(240);
      expect(prog.currentLevel).toBe(3);
      expect(prog.currentXP).toBe(40);
      expect(prog.nextLevelXP).toBe(100);
      expect(prog.levelProgressPercent).toBe(40);
      expect(prog.tier.name).toBe("Bronze");
      expect(prog.levelTitle).toBe("Trainee");
      expect(prog.rewardForNextLevel).toBeDefined();
      expect(prog.rewardForNextLevel.coins).toBeGreaterThan(0);
    });
  });

  describe("Match XP Breakdown Engine", () => {
    it("calculates participation and victory bonus", () => {
      const match = calculateMiniclipMatchXP({
        isWinner: true,
        durationMs: 60000,
        previousXP: 0,
      });

      expect(match.totalXP).toBe(XP_CONFIG.MATCH_PLAYED + XP_CONFIG.MATCH_WIN);
      expect(match.previousLevel).toBe(1);
      expect(match.newLevel).toBe(1);
      expect(match.leveledUp).toBe(false);
      expect(match.items.some((i) => i.id === "match_played")).toBe(true);
      expect(match.items.some((i) => i.id === "match_win")).toBe(true);
    });

    it("calculates draw bonus", () => {
      const match = calculateMiniclipMatchXP({
        isWinner: false,
        isDraw: true,
        durationMs: 60000,
        previousXP: 50,
      });

      expect(match.totalXP).toBe(XP_CONFIG.MATCH_PLAYED + XP_CONFIG.MATCH_DRAW);
      expect(match.items.some((i) => i.id === "match_draw")).toBe(true);
    });

    it("calculates win streak bonus scaled up to max cap", () => {
      const match = calculateMiniclipMatchXP({
        isWinner: true,
        durationMs: 60000,
        currentWinStreak: 3,
        previousXP: 0,
      });

      // 15 played + 35 win + (3-1)*5 = 60
      expect(match.totalXP).toBe(60);
      const streakItem = match.items.find((i) => i.id === "win_streak");
      expect(streakItem).toBeDefined();
      expect(streakItem?.amount).toBe(10);

      // Capped streak
      const maxStreakMatch = calculateMiniclipMatchXP({
        isWinner: true,
        durationMs: 60000,
        currentWinStreak: 10,
        previousXP: 0,
      });
      const maxStreakItem = maxStreakMatch.items.find((i) => i.id === "win_streak");
      expect(maxStreakItem?.amount).toBe(XP_CONFIG.MAX_STREAK_BONUS);
    });

    it("calculates high stakes table multiplier bonus", () => {
      const match50 = calculateMiniclipMatchXP({
        isWinner: false,
        durationMs: 60000,
        entryStakeCoins: 50,
        previousXP: 0,
      });
      expect(match50.items.find((i) => i.id === "stakes_tier")?.amount).toBe(5);

      const match200 = calculateMiniclipMatchXP({
        isWinner: false,
        durationMs: 60000,
        entryStakeCoins: 200,
        previousXP: 0,
      });
      expect(match200.items.find((i) => i.id === "stakes_tier")?.amount).toBe(10);

      const match500 = calculateMiniclipMatchXP({
        isWinner: false,
        durationMs: 60000,
        entryStakeCoins: 500,
        previousXP: 0,
      });
      expect(match500.items.find((i) => i.id === "stakes_tier")?.amount).toBe(15);
    });

    it("detects level up and generates rewards unlocked", () => {
      const match = calculateMiniclipMatchXP({
        isWinner: true,
        durationMs: 60000,
        previousXP: 80,
      });

      // 80 + 50 = 130 XP -> level 1 to level 2
      expect(match.previousLevel).toBe(1);
      expect(match.newLevel).toBe(2);
      expect(match.leveledUp).toBe(true);
      expect(match.rewardsUnlocked.length).toBe(1);
      expect(match.rewardsUnlocked[0]?.coins).toBe(150);
    });
  });

  describe("Server ProfileService Progression & Milestone Claiming", () => {
    it("returns player progression with unclaimed milestones", () => {
      profileService.getOrCreateProfile("prog_player_1", "Progression Player");
      // Give enough XP to reach level 5 (400 XP)
      profileService.recordMatchFinished({
        roomCode: "TEST01",
        game: "rps",
        startedAt: 1000,
        finishedAt: 61000,
        durationMs: 60000,
        winnerId: "prog_player_1",
        participants: [
          { playerId: "prog_player_1", name: "Progression Player", isWinner: true },
        ],
      });

      const prog = profileService.getProgression("prog_player_1");
      expect(prog).toBeDefined();
      expect(prog.currentLevel).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(prog.unclaimedRewards)).toBe(true);
    });

    it("allows claiming milestone rewards when level requirement is satisfied", async () => {
      profileService.getOrCreateProfile("hero_player", "Hero Player");
      // Set player's experience to level 6 (550 XP)
      profileService.awardXP("hero_player", 550);

      const claimResult = await profileService.claimMilestoneReward("hero_player", 5);
      expect(claimResult.success).toBe(true);
      expect(claimResult.reward).toBeDefined();
      expect(claimResult.reward?.coins).toBe(500);
    });

    it("prevents claiming milestone rewards if level requirement is not reached", async () => {
      profileService.getOrCreateProfile("low_level_player", "Low Level");
      profileService.awardXP("low_level_player", 50);

      const claimResult = await profileService.claimMilestoneReward("low_level_player", 10);
      expect(claimResult.success).toBe(false);
      expect(claimResult.error).toContain("Level milestone not yet reached");
    });

    it("prevents double-claiming the same milestone reward", async () => {
      profileService.getOrCreateProfile("double_claim_player", "Claimer");
      profileService.awardXP("double_claim_player", 200);

      const firstClaim = await profileService.claimMilestoneReward("double_claim_player", 2);
      expect(firstClaim.success).toBe(true);

      const secondClaim = await profileService.claimMilestoneReward("double_claim_player", 2);
      expect(secondClaim.success).toBe(false);
      expect(secondClaim.error).toContain("already claimed");
    });

    it("clears claimed milestones on profileService.reset()", async () => {
      profileService.getOrCreateProfile("reset_player", "Reset Player");
      profileService.awardXP("reset_player", 200);

      await profileService.claimMilestoneReward("reset_player", 2);
      profileService.reset();

      profileService.getOrCreateProfile("reset_player", "Reset Player");
      profileService.awardXP("reset_player", 200);

      const reClaim = await profileService.claimMilestoneReward("reset_player", 2);
      expect(reClaim.success).toBe(true);
    });

    it("credits player wallet when EconomyService is configured", async () => {
      const { InMemoryEconomyRepository } = await import("../../persistence/InMemoryEconomyRepository.js");
      const { EconomyService } = await import("../../economy/EconomyService.js");
      const repo = new InMemoryEconomyRepository();
      const economyService = new EconomyService(repo);

      profileService.setEconomyService(economyService);

      profileService.getOrCreateProfile("economy_player", "Economy Player");
      profileService.awardXP("economy_player", 550); // Reaches level 6

      // Pre-provision identity to read baseline wallet balance (includes starter coins)
      await repo.ensureIdentityRegistered("economy_player", "guest");
      const initialWallet = await economyService.getWallet("economy_player");
      const initialBalance = BigInt(initialWallet?.balance ?? "0");

      // Claim milestone for level 5 (500 coins)
      const claimResult = await profileService.claimMilestoneReward("economy_player", 5);
      expect(claimResult.success).toBe(true);
      expect(claimResult.reward?.coins).toBe(500);

      // After claim: wallet has exactly 500 more coins
      const updatedWallet = await economyService.getWallet("economy_player");
      expect(BigInt(updatedWallet!.balance) - initialBalance).toBe(500n);

      // Verify ledger entry
      const ledger = await repo.listLedgerEntriesByType("ADMIN_ADJUSTMENT");
      const milestoneEntry = ledger.find((e) => e.walletId === "economy_player");
      expect(milestoneEntry?.amount).toBe("500");
      expect(milestoneEntry?.description).toContain("Level 5 milestone reward");

      // Replay attempt fails and wallet is not double-credited
      const duplicateClaim = await profileService.claimMilestoneReward("economy_player", 5);
      expect(duplicateClaim.success).toBe(false);
      const unchangedWallet = await economyService.getWallet("economy_player");
      expect(unchangedWallet?.balance).toBe(updatedWallet?.balance);

      // Cleanup
      profileService.setEconomyService(undefined);
    });

    it("cleans up claimedMilestones when deleteProfile is called to prevent memory leaks", async () => {
      profileService.getOrCreateProfile("leak_test_player", "Leak Tester");
      profileService.awardXP("leak_test_player", 550);

      const claim = await profileService.claimMilestoneReward("leak_test_player", 5);
      expect(claim.success).toBe(true);

      // Delete profile should clear memory for leak_test_player
      const deleted = profileService.deleteProfile("leak_test_player");
      expect(deleted).toBe(true);

      // When recreated, player has no previous claimedMilestones Set leak in memory
      profileService.getOrCreateProfile("leak_test_player", "Leak Tester Reborn");
      profileService.awardXP("leak_test_player", 550);

      // Player should be able to claim again on a genuinely fresh profile
      const reClaim = await profileService.claimMilestoneReward("leak_test_player", 5);
      expect(reClaim.success).toBe(true);
    });

    it("prevents race condition when concurrent claims for the same milestone occur simultaneously", async () => {
      const { InMemoryEconomyRepository } = await import("../../persistence/InMemoryEconomyRepository.js");
      const { EconomyService } = await import("../../economy/EconomyService.js");
      const repo = new InMemoryEconomyRepository();
      const economyService = new EconomyService(repo);

      profileService.setEconomyService(economyService);
      profileService.getOrCreateProfile("race_player", "Race Player");
      profileService.awardXP("race_player", 550); // Level 6

      await repo.ensureIdentityRegistered("race_player", "guest");
      const initialWallet = await economyService.getWallet("race_player");
      const initialBalance = BigInt(initialWallet?.balance ?? "0");

      // Execute 3 concurrent claims in parallel
      const results = await Promise.all([
        profileService.claimMilestoneReward("race_player", 5),
        profileService.claimMilestoneReward("race_player", 5),
        profileService.claimMilestoneReward("race_player", 5),
      ]);

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(2);
      expect(failures[0]?.error).toContain("already claimed");

      // Wallet was credited exactly once (+500 coins)
      const finalWallet = await economyService.getWallet("race_player");
      expect(BigInt(finalWallet!.balance) - initialBalance).toBe(500n);

      profileService.setEconomyService(undefined);
    });

    it("detects and blocks claims when economy repository reports applied: false across simulated server reboots", async () => {
      const { InMemoryEconomyRepository } = await import("../../persistence/InMemoryEconomyRepository.js");
      const { EconomyService } = await import("../../economy/EconomyService.js");
      const repo = new InMemoryEconomyRepository();
      const economyService = new EconomyService(repo);

      profileService.setEconomyService(economyService);
      profileService.getOrCreateProfile("reboot_player", "Reboot Player");
      profileService.awardXP("reboot_player", 550);

      // Claim first time
      const firstClaim = await profileService.claimMilestoneReward("reboot_player", 5);
      expect(firstClaim.success).toBe(true);

      // Simulate server reboot without hydrating: in-memory state is wiped, but repo has the row
      profileService.reset();
      profileService.setEconomyService(economyService);
      profileService.getOrCreateProfile("reboot_player", "Reboot Player");
      profileService.awardXP("reboot_player", 550);

      // Attempt claim after simulated reboot: economy repository returns applied: false
      const postRebootClaim = await profileService.claimMilestoneReward("reboot_player", 5);
      expect(postRebootClaim.success).toBe(false);
      expect(postRebootClaim.error).toContain("already claimed");

      // In-memory set is also updated, so immediate subsequent check also rejects without touching DB
      const immediateRetry = await profileService.claimMilestoneReward("reboot_player", 5);
      expect(immediateRetry.success).toBe(false);

      profileService.setEconomyService(undefined);
    });

    it("restores claimed milestones across restarts via hydrateMilestonesFromEconomy", async () => {
      const { InMemoryEconomyRepository } = await import("../../persistence/InMemoryEconomyRepository.js");
      const { EconomyService } = await import("../../economy/EconomyService.js");
      const repo = new InMemoryEconomyRepository();
      const economyService = new EconomyService(repo);

      profileService.setEconomyService(economyService);
      profileService.getOrCreateProfile("hydrate_player", "Hydrate Player");
      profileService.awardXP("hydrate_player", 1200); // Level 13

      // Claim level 5 and level 10
      await profileService.claimMilestoneReward("hydrate_player", 5);
      await profileService.claimMilestoneReward("hydrate_player", 10);

      // Simulate reboot: clear memory and re-create profiles
      profileService.reset();
      profileService.setEconomyService(economyService);
      profileService.getOrCreateProfile("hydrate_player", "Hydrate Player");
      profileService.awardXP("hydrate_player", 1200);

      // Hydrate from economy ledger
      const restoredCount = await profileService.hydrateMilestonesFromEconomy();
      expect(restoredCount).toBe(2);

      // Level 5 and 10 should now be recognized as claimed in progression roadmap
      const prog = profileService.getProgression("hydrate_player");
      const unclaimedLevels = prog.unclaimedRewards?.map((r) => r.level) ?? [];
      expect(unclaimedLevels).not.toContain(5);
      expect(unclaimedLevels).not.toContain(10);

      profileService.setEconomyService(undefined);
    });

    it("rolls back optimistic claim in memory if EconomyService throws an error", async () => {
      const { InMemoryEconomyRepository } = await import("../../persistence/InMemoryEconomyRepository.js");
      const { EconomyService } = await import("../../economy/EconomyService.js");
      const repo = new InMemoryEconomyRepository();
      const economyService = new EconomyService(repo);

      // Make adminAdjustWallet fail
      const originalAdjust = economyService.adminAdjustWallet.bind(economyService);
      let shouldFail = true;
      economyService.adminAdjustWallet = async (input) => {
        if (shouldFail) {
          throw new Error("Simulated database timeout");
        }
        return originalAdjust(input);
      };

      profileService.setEconomyService(economyService);
      profileService.getOrCreateProfile("fail_retry_player", "Retry Player");
      profileService.awardXP("fail_retry_player", 550);

      const failedClaim = await profileService.claimMilestoneReward("fail_retry_player", 5);
      expect(failedClaim.success).toBe(false);
      expect(failedClaim.error).toContain("Failed to credit milestone coins to wallet");

      // Fix failure and retry: player should be able to retry because optimistic claim was rolled back
      shouldFail = false;
      const retryClaim = await profileService.claimMilestoneReward("fail_retry_player", 5);
      expect(retryClaim.success).toBe(true);
      expect(retryClaim.reward?.coins).toBe(500);

      profileService.setEconomyService(undefined);
    });
  });
});
