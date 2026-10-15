import { describe, it, expect } from "vitest";
import { LEVEL_MILESTONES } from "@shared/progression/MiniclipProgression";
import { STREAK_REWARDS_SCHEDULE, shieldsGrantedBy, type DailyStreakClaimResult } from "@shared/streak-types";
import {
  buildLevelMilestoneLoot,
  buildStreakLoot,
  chestTierForLevel,
  lootFootnote,
} from "../lootBuilders";

const NOW = 1_000_000;
const HOUR_MS = 60 * 60 * 1000;

function streakResult(day: number, overrides: Partial<DailyStreakClaimResult> = {}): DailyStreakClaimResult {
  const reward = STREAK_REWARDS_SCHEDULE.find((r) => r.day === day) ?? null;
  return {
    success: true,
    code: "SUCCESS",
    message: "ok",
    claimedDay: day,
    reward,
    coinsAwarded: reward?.coins ?? 0,
    newStreak: day,
    cycleCompleted: day === 30,
    cycleCount: 0,
    shieldUsed: false,
    walletBalance: "0",
    updatedState: {} as DailyStreakClaimResult["updatedState"],
    ...overrides,
  } as DailyStreakClaimResult;
}

describe("chestTierForLevel", () => {
  it.each([
    [5, "bronze"],
    [19, "bronze"],
    [20, "silver"],
    [39, "silver"],
    [40, "gold"],
    [74, "gold"],
    [75, "diamond"],
    [100, "diamond"],
  ] as const)("maps level %i to the %s chest", (level, tier) => {
    expect(chestTierForLevel(level)).toBe(tier);
  });
});

describe("buildLevelMilestoneLoot", () => {
  const withTitle = LEVEL_MILESTONES.find((m) => m.isMajor && m.reward.title)!;
  const coinsOnly = { level: 6, tierId: 1, isMajor: true, reward: { coins: 300 } } as (typeof LEVEL_MILESTONES)[number];

  it("always leads with the coin reward carrying the amount the server paid", () => {
    const [first] = buildLevelMilestoneLoot(withTitle, 777, undefined, NOW);
    expect(first.type).toBe("coins");
    expect(first.amount).toBe(777);
  });

  it("adds a title card only when the milestone grants a title", () => {
    expect(buildLevelMilestoneLoot(withTitle, 500, undefined, NOW).some((i) => i.type === "title")).toBe(true);
    expect(buildLevelMilestoneLoot(coinsOnly, 300, undefined, NOW).map((i) => i.type)).toEqual(["coins"]);
  });

  it("never invents a perk the milestone does not define", () => {
    const perkless = { ...withTitle, reward: { coins: 500, title: "T" } };
    expect(buildLevelMilestoneLoot(perkless, 500, undefined, NOW).some((i) => i.type === "badge")).toBe(false);
  });

  it("says when vesting coins arrive instead of claiming they are already there", () => {
    const [held] = buildLevelMilestoneLoot(coinsOnly, 300, NOW + 3 * HOUR_MS, NOW);
    const [paid] = buildLevelMilestoneLoot(coinsOnly, 300, undefined, NOW);
    expect(held.description).toBe("Arrives in 3 hr");
    expect(paid.description).not.toMatch(/arrives/i);
  });

  it("gives every item a unique id", () => {
    const ids = buildLevelMilestoneLoot(withTitle, 500, undefined, NOW).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("scales rarity with the level", () => {
    const low = buildLevelMilestoneLoot({ ...coinsOnly, level: 5 }, 1, undefined, NOW)[0];
    const mid = buildLevelMilestoneLoot({ ...coinsOnly, level: 25 }, 1, undefined, NOW)[0];
    const high = buildLevelMilestoneLoot({ ...coinsOnly, level: 60 }, 1, undefined, NOW)[0];
    expect([low.rarity, mid.rarity, high.rarity]).toEqual(["rare", "epic", "legendary"]);
  });
});

describe("buildStreakLoot", () => {
  it("lists exactly the schedule's coins and special reward on a milestone day", () => {
    const items = buildStreakLoot(streakResult(7), NOW);
    expect(items.map((i) => i.type)).toEqual(["coins", "title"]);
    expect(items[0].amount).toBe(1000);
    expect(items[1].title).toBe("Early Bird");
  });

  it("shows Day 30's shield, because the engine credits one with the badge", () => {
    const items = buildStreakLoot(streakResult(30), NOW);
    expect(items.map((i) => i.type)).toEqual(["coins", "badge", "shield"]);
    expect(items[2].title).toBe("1x Streak Shield");
  });

  it("shows a shield card for exactly the days whose reward credits one", () => {
    for (const reward of STREAK_REWARDS_SCHEDULE.filter((r) => r.milestoneChest)) {
      const shown = buildStreakLoot(streakResult(reward.day), NOW).some((i) => i.type === "shield");
      expect(shown, `day ${reward.day}`).toBe(shieldsGrantedBy(reward) > 0);
    }
  });

  it("uses short card copy, not the schedule's whole-chest blurb", () => {
    expect(buildStreakLoot(streakResult(30), NOW)[1].description).toBe("Exclusive profile badge");
  });

  it("gives a shield special reward a single card, not a second bonus card", () => {
    const result = streakResult(7, {
      reward: { day: 7, coins: 1, description: "d", specialRewardTitle: "Streak Shield", specialRewardType: "shield" },
    });
    expect(buildStreakLoot(result, NOW).filter((i) => i.type === "shield")).toHaveLength(1);
  });

  it("reports the vesting arrival time on the coin card", () => {
    const [coins] = buildStreakLoot(streakResult(14, { pendingUntil: NOW + 2 * HOUR_MS }), NOW);
    expect(coins.description).toBe("Arrives in 2 hr");
  });

  it("gives every item a unique id", () => {
    const ids = buildStreakLoot(streakResult(21), NOW).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("lootFootnote", () => {
  it("promises the balance only when the coins were paid at once", () => {
    expect(lootFootnote(undefined, NOW)).toMatch(/added to your/i);
  });

  it("names the arrival time when the coins are still vesting", () => {
    const note = lootFootnote(NOW + HOUR_MS, NOW);
    expect(note).toContain("in 1 hr");
    expect(note).not.toMatch(/added to your/i);
  });
});
