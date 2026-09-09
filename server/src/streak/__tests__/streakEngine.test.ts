import { describe, it, expect } from "vitest";
import {
  getUtcDateString,
  getUtcMidnightEpoch,
  getNextUtcMidnightEpoch,
  getUtcDayDifference,
  evaluateStreakClaim,
  buildStreakState,
  type StoredStreakRecord,
} from "../StreakEngine.js";
import { StreakService } from "../StreakService.js";
import { STREAK_REWARDS_SCHEDULE } from "@shared/streak-types.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";

describe("StreakEngine — UTC Date & Calendar Math", () => {
  it("formats timestamps to UTC YYYY-MM-DD correctly", () => {
    // 2026-09-09 10:30:00 UTC
    const ts = Date.UTC(2026, 8, 9, 10, 30, 0);
    expect(getUtcDateString(ts)).toBe("2026-09-09");

    // Boundary right before UTC midnight: 23:59:59
    const tsLate = Date.UTC(2026, 11, 31, 23, 59, 59);
    expect(getUtcDateString(tsLate)).toBe("2026-12-31");

    // 1 second later: 00:00:00 next year
    const tsNewYear = Date.UTC(2027, 0, 1, 0, 0, 0);
    expect(getUtcDateString(tsNewYear)).toBe("2027-01-01");
  });

  it("calculates next UTC midnight epoch accurately", () => {
    const ts = Date.UTC(2026, 8, 9, 14, 0, 0);
    const nextMidnight = getNextUtcMidnightEpoch(ts);
    const expected = Date.UTC(2026, 8, 10, 0, 0, 0);
    expect(nextMidnight).toBe(expected);
  });

  it("calculates UTC calendar day difference correctly", () => {
    expect(getUtcDayDifference("2026-09-09", "2026-09-09")).toBe(0);
    expect(getUtcDayDifference("2026-09-08", "2026-09-09")).toBe(1);
    expect(getUtcDayDifference("2026-09-01", "2026-09-09")).toBe(8);
    expect(getUtcDayDifference("2026-09-10", "2026-09-09")).toBe(-1);
    // Month rollover
    expect(getUtcDayDifference("2026-08-31", "2026-09-01")).toBe(1);
  });
});

describe("StreakEngine — Progression & Evaluation", () => {
  const day1Ts = Date.UTC(2026, 8, 1, 10, 0, 0);
  const day2Ts = Date.UTC(2026, 8, 2, 12, 0, 0);
  const day3Ts = Date.UTC(2026, 8, 3, 9, 0, 0);
  const day5Ts = Date.UTC(2026, 8, 5, 8, 0, 0);

  it("handles the first claim ever (Day 1)", () => {
    const result = evaluateStreakClaim(null, day1Ts);

    expect(result.canClaim).toBe(true);
    expect(result.code).toBe("SUCCESS");
    expect(result.claimedDay).toBe(1);
    expect(result.newStreak).toBe(1);
    expect(result.coinsAwarded).toBe(100);
    expect(result.reward?.coins).toBe(100);
    expect(result.cycleCompleted).toBe(false);
  });

  it("handles consecutive claims across multiple days", () => {
    // Record after Day 1
    const recordDay1: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 1,
      longestStreak: 1,
      cycleCount: 0,
      lastClaimedDate: "2026-09-01",
      lastClaimedAt: day1Ts,
      shieldsRemaining: 0,
      claimHistory: [],
    };

    const resDay2 = evaluateStreakClaim(recordDay1, day2Ts);
    expect(resDay2.canClaim).toBe(true);
    expect(resDay2.code).toBe("SUCCESS");
    expect(resDay2.claimedDay).toBe(2);
    expect(resDay2.newStreak).toBe(2);
    expect(resDay2.coinsAwarded).toBe(120);

    // Record after Day 2
    const recordDay2: StoredStreakRecord = {
      ...recordDay1,
      currentStreak: 2,
      longestStreak: 2,
      lastClaimedDate: "2026-09-02",
      lastClaimedAt: day2Ts,
    };

    const resDay3 = evaluateStreakClaim(recordDay2, day3Ts);
    expect(resDay3.canClaim).toBe(true);
    expect(resDay3.claimedDay).toBe(3);
    expect(resDay3.newStreak).toBe(3);
    expect(resDay3.coinsAwarded).toBe(150);
  });

  it("rejects same-day duplicate claims idempotently", () => {
    const record: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 5,
      longestStreak: 5,
      cycleCount: 0,
      lastClaimedDate: "2026-09-01",
      lastClaimedAt: day1Ts,
      shieldsRemaining: 0,
      claimHistory: [],
    };

    // Attempt to claim again on the exact same UTC date (even later that day)
    const duplicateTs = Date.UTC(2026, 8, 1, 18, 0, 0);
    const result = evaluateStreakClaim(record, duplicateTs);

    expect(result.canClaim).toBe(false);
    expect(result.code).toBe("ALREADY_CLAIMED");
    expect(result.coinsAwarded).toBe(0);
    expect(result.newStreak).toBe(5);
  });

  it("detects clock anomaly / time-travel backwards", () => {
    const record: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 5,
      longestStreak: 5,
      cycleCount: 0,
      lastClaimedDate: "2026-09-05",
      lastClaimedAt: day5Ts,
      shieldsRemaining: 0,
      claimHistory: [],
    };

    // Earlier timestamp
    const result = evaluateStreakClaim(record, day1Ts);
    expect(result.canClaim).toBe(false);
    expect(result.code).toBe("TIME_TRAVEL_DETECTED");
  });

  it("resets streak to Day 1 when days are missed with 0 shields", () => {
    const record: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 5,
      longestStreak: 5,
      cycleCount: 0,
      lastClaimedDate: "2026-09-01",
      lastClaimedAt: day1Ts,
      shieldsRemaining: 0,
      claimHistory: [],
    };

    // Check in on Day 5 (missed Days 2, 3, 4)
    const result = evaluateStreakClaim(record, day5Ts);

    expect(result.canClaim).toBe(true);
    expect(result.code).toBe("STREAK_RESET");
    expect(result.claimedDay).toBe(1);
    expect(result.newStreak).toBe(1);
    expect(result.coinsAwarded).toBe(100);
    expect(result.shieldUsed).toBe(false);
  });

  it("protects and preserves streak when a shield is available", () => {
    const record: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 6,
      longestStreak: 6,
      cycleCount: 0,
      lastClaimedDate: "2026-09-01",
      lastClaimedAt: day1Ts,
      shieldsRemaining: 1, // Has 1 shield
      claimHistory: [],
    };

    // Check in on Day 5 (missed days)
    const result = evaluateStreakClaim(record, day5Ts);

    expect(result.canClaim).toBe(true);
    expect(result.code).toBe("SUCCESS");
    expect(result.shieldUsed).toBe(true);
    expect(result.newShieldsRemaining).toBe(0);
    expect(result.claimedDay).toBe(7); // Successfully stepped into Day 7!
    expect(result.newStreak).toBe(7);
    expect(result.coinsAwarded).toBe(1000); // Day 7 Bronze Chest
    expect(result.reward?.milestoneChest).toBe("bronze");
    expect(result.reward?.specialRewardTitle).toBe("Early Bird");
  });

  it("awards milestone chests correctly on Days 7, 14, 21, and 30", () => {
    // Day 7: Bronze Chest
    const day7Reward = STREAK_REWARDS_SCHEDULE[6];
    expect(day7Reward.day).toBe(7);
    expect(day7Reward.coins).toBe(1000);
    expect(day7Reward.milestoneChest).toBe("bronze");

    // Day 14: Silver Chest
    const day14Reward = STREAK_REWARDS_SCHEDULE[13];
    expect(day14Reward.day).toBe(14);
    expect(day14Reward.coins).toBe(2500);
    expect(day14Reward.milestoneChest).toBe("silver");

    // Day 21: Gold Chest
    const day21Reward = STREAK_REWARDS_SCHEDULE[20];
    expect(day21Reward.day).toBe(21);
    expect(day21Reward.coins).toBe(5000);
    expect(day21Reward.milestoneChest).toBe("gold");

    // Day 30: Diamond Crown Chest
    const day30Reward = STREAK_REWARDS_SCHEDULE[29];
    expect(day30Reward.day).toBe(30);
    expect(day30Reward.coins).toBe(10000);
    expect(day30Reward.milestoneChest).toBe("diamond");
    expect(day30Reward.specialRewardType).toBe("badge");
  });

  it("handles Day 30 completion and cycle rollover", () => {
    const recordDay29: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 29,
      longestStreak: 29,
      cycleCount: 0,
      lastClaimedDate: "2026-09-29",
      lastClaimedAt: Date.UTC(2026, 8, 29, 12, 0, 0),
      shieldsRemaining: 0,
      claimHistory: [],
    };

    // Claim Day 30
    const day30Ts = Date.UTC(2026, 8, 30, 12, 0, 0);
    const resDay30 = evaluateStreakClaim(recordDay29, day30Ts);

    expect(resDay30.canClaim).toBe(true);
    expect(resDay30.claimedDay).toBe(30);
    expect(resDay30.newStreak).toBe(30);
    expect(resDay30.coinsAwarded).toBe(10000);
    expect(resDay30.cycleCompleted).toBe(true);
    expect(resDay30.code).toBe("CYCLE_COMPLETED");

    // Claim Day 31 (Day 1 of new cycle)
    const recordDay30: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 30,
      longestStreak: 30,
      cycleCount: 0,
      lastClaimedDate: "2026-09-30",
      lastClaimedAt: day30Ts,
      shieldsRemaining: 1, // Shield granted by Day 30
      claimHistory: [],
    };

    const day31Ts = Date.UTC(2026, 9, 1, 12, 0, 0); // October 1st
    const resDay31 = evaluateStreakClaim(recordDay30, day31Ts);

    expect(resDay31.canClaim).toBe(true);
    expect(resDay31.claimedDay).toBe(1);
    expect(resDay31.newStreak).toBe(1);
    expect(resDay31.newCycleCount).toBe(1);
    expect(resDay31.coinsAwarded).toBe(100);
  });
});

describe("StreakEngine — Schedule State Builder", () => {
  it("builds correct schedule state when reward is claimable today", () => {
    const ts = Date.UTC(2026, 8, 5, 10, 0, 0);
    const record: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 4,
      longestStreak: 4,
      cycleCount: 0,
      lastClaimedDate: "2026-09-04",
      lastClaimedAt: Date.UTC(2026, 8, 4, 10, 0, 0),
      shieldsRemaining: 0,
      claimHistory: [],
    };

    const state = buildStreakState(record, ts);

    expect(state.isClaimableToday).toBe(true);
    expect(state.activeDayInCycle).toBe(5);
    expect(state.schedule).toHaveLength(30);

    // Days 1..4 should be CLAIMED
    expect(state.schedule[0].status).toBe("CLAIMED");
    expect(state.schedule[1].status).toBe("CLAIMED");
    expect(state.schedule[2].status).toBe("CLAIMED");
    expect(state.schedule[3].status).toBe("CLAIMED");

    // Day 5 should be CLAIMABLE
    expect(state.schedule[4].status).toBe("CLAIMABLE");

    // Day 6..30 should be LOCKED
    expect(state.schedule[5].status).toBe("LOCKED");
    expect(state.schedule[29].status).toBe("LOCKED");
  });

  it("builds correct schedule state when already claimed today", () => {
    const ts = Date.UTC(2026, 8, 5, 15, 0, 0);
    const record: StoredStreakRecord = {
      playerId: "p1",
      currentStreak: 5,
      longestStreak: 5,
      cycleCount: 0,
      lastClaimedDate: "2026-09-05",
      lastClaimedAt: Date.UTC(2026, 8, 5, 10, 0, 0),
      shieldsRemaining: 0,
      claimHistory: [],
    };

    const state = buildStreakState(record, ts);

    expect(state.isClaimableToday).toBe(false);
    expect(state.activeDayInCycle).toBe(5);

    // Day 5 should be CLAIMED
    expect(state.schedule[4].status).toBe("CLAIMED");
    // Day 6 should be LOCKED
    expect(state.schedule[5].status).toBe("LOCKED");
  });
});

describe("StreakService — In-Memory Integration", () => {
  it("claims Day 1 and idempotently prevents duplicate claims", async () => {
    let mockTime = Date.UTC(2026, 8, 1, 10, 0, 0);
    const service = new StreakService({
      economyService: null,
      postgrestConfig: null,
      now: () => mockTime,
    });

    // 1. Initial State: Claimable Day 1
    const state0 = await service.getStreak("user_123");
    expect(state0.isClaimableToday).toBe(true);
    expect(state0.currentStreak).toBe(0);

    // 2. Execute First Claim
    const claim1 = await service.claimStreak("user_123");
    expect(claim1.success).toBe(true);
    expect(claim1.claimedDay).toBe(1);
    expect(claim1.newStreak).toBe(1);
    expect(claim1.coinsAwarded).toBe(100);

    // 3. Immediately re-fetch: should show claimed today
    const state1 = await service.getStreak("user_123");
    expect(state1.isClaimableToday).toBe(false);
    expect(state1.currentStreak).toBe(1);

    // 4. Duplicate claim on same day: should fail gracefully
    const claimDuplicate = await service.claimStreak("user_123");
    expect(claimDuplicate.success).toBe(false);
    expect(claimDuplicate.code).toBe("ALREADY_CLAIMED");
    expect(claimDuplicate.coinsAwarded).toBe(0);

    // 5. Advance to next UTC day
    mockTime = Date.UTC(2026, 8, 2, 10, 0, 0);
    const stateDay2 = await service.getStreak("user_123");
    expect(stateDay2.isClaimableToday).toBe(true);
    expect(stateDay2.activeDayInCycle).toBe(2);

    // 6. Claim Day 2
    const claim2 = await service.claimStreak("user_123");
    expect(claim2.success).toBe(true);
    expect(claim2.claimedDay).toBe(2);
    expect(claim2.newStreak).toBe(2);
    expect(claim2.coinsAwarded).toBe(120);
  });
});

describe("StreakService — real EconomyService wallet crediting (regression)", () => {
  // Previously, a player whose identity had never touched the (dev,
  // in-memory) economy store before — e.g. their very first daily-streak
  // claim, before ever playing a paid match — got a claim response that
  // said success:true and a specific coin count, while the wallet was
  // NEVER actually credited: `adminAdjustWallet` threw IdentityNotFoundError,
  // StreakService caught it silently and fell back to a stale "0" balance.
  // Every earlier test in this file used `economyService: null`, so this
  // path had zero coverage.
  it("credits a brand-new, never-before-registered guest identity on their first claim", async () => {
    const repo = new InMemoryEconomyRepository();
    const economyService = new EconomyService(repo);
    let mockTime = Date.UTC(2026, 8, 1, 10, 0, 0);
    const service = new StreakService({ economyService, postgrestConfig: null, now: () => mockTime });

    const playerId = "guest_never_seen_before";

    // Sanity: this identity has genuinely never touched the economy store.
    await expect(economyService.getWallet(playerId)).rejects.toThrow(/not registered/i);

    const claim1 = await service.claimStreak(playerId, "guest");
    expect(claim1.success).toBe(true);
    expect(claim1.coinsAwarded).toBe(100);

    // The response's own walletBalance must reflect a real credit, not the
    // "0" fallback the bug used to silently return.
    const balanceAfterClaim1 = BigInt(claim1.walletBalance);
    expect(balanceAfterClaim1).toBeGreaterThan(100n);

    // The ledger row must be tagged DAILY_REWARD_CREDIT, not the generic
    // ADMIN_ADJUSTMENT — reusing that type made every streak claim render
    // as "Adjustment" in the wallet drawer and pollute the Operational
    // Audit Logs' "Wallet Adjustment" (manual-top-up) trail.
    const ledger = await economyService.getLedger(playerId, { limit: 10 });
    const streakEntry = ledger.find((e) => e.amount === "100");
    expect(streakEntry?.entryType).toBe("DAILY_REWARD_CREDIT");

    // And a subsequent independent wallet read (mirrors the client's
    // post-claim `refreshCurrentWallet()`) must see the same balance —
    // proving the credit was actually persisted, not just echoed back.
    const wallet = await economyService.getWallet(playerId);
    expect(BigInt(wallet.balance)).toBe(balanceAfterClaim1);
    expect(wallet.identityKind).toBe("guest");

    // Claiming Day 2 must credit an ADDITIONAL 120 coins on top of Day 1's
    // balance, proving this isn't a one-off fluke of wallet creation.
    mockTime = Date.UTC(2026, 8, 2, 10, 0, 0);
    const claim2 = await service.claimStreak(playerId, "guest");
    expect(claim2.success).toBe(true);
    expect(claim2.coinsAwarded).toBe(120);
    expect(BigInt(claim2.walletBalance)).toBe(balanceAfterClaim1 + 120n);
  });

  it("registers a member identity's kind correctly (not defaulted to guest)", async () => {
    const repo = new InMemoryEconomyRepository();
    const economyService = new EconomyService(repo);
    const service = new StreakService({
      economyService,
      postgrestConfig: null,
      now: () => Date.UTC(2026, 8, 1, 10, 0, 0),
    });

    const playerId = "member_never_seen_before";
    const claim = await service.claimStreak(playerId, "member");
    expect(claim.success).toBe(true);

    const wallet = await economyService.getWallet(playerId);
    expect(wallet.identityKind).toBe("member");
  });
});
