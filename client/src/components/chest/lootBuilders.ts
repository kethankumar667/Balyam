import type { LevelMilestone } from "@shared/progression/MiniclipProgression";
import type { DailyStreakClaimResult, StreakRewardType } from "@shared/streak-types";
import { formatArrival } from "../progression/formatArrival";
import type { ChestTier, LootItem, LootItemRarity } from "./types";

const PAID_AT_ONCE_FOOTNOTE = "Added to your BHALYAM balance & inventory";

/** Short card copy per special reward; the schedule's `description` is a whole-chest blurb. */
const SPECIAL_REWARD_BLURB: Record<StreakRewardType, string> = {
  coins: "Bonus coins",
  title: "Exclusive profile title",
  emojis: "Exclusive emoji pack",
  frame: "Exclusive avatar frame",
  badge: "Exclusive profile badge",
  shield: "Saves your streak once if you miss a day",
};

export function chestTierForLevel(level: number): ChestTier {
  if (level >= 75) return "diamond";
  if (level >= 40) return "gold";
  if (level >= 20) return "silver";
  return "bronze";
}

function levelRarity(level: number, tiers: { legendaryFrom: number; epicFrom: number }): LootItemRarity {
  if (level >= tiers.legendaryFrom) return "legendary";
  if (level >= tiers.epicFrom) return "epic";
  return "rare";
}

/**
 * The coin card must not say "added" for coins that are still vesting — the
 * reward gateway holds most payouts for a day, so a held payout says when it lands.
 */
function coinDescription(paidAtOnce: string, arrivesAt: number | undefined, now: number): string {
  return arrivesAt === undefined ? paidAtOnce : `Arrives ${formatArrival(arrivesAt, now)}`;
}

/** Closing line of the summary: only promises the balance when the coins were paid at once. */
export function lootFootnote(arrivesAt: number | undefined, now: number = Date.now()): string {
  return arrivesAt === undefined
    ? PAID_AT_ONCE_FOOTNOTE
    : `Coins arrive ${formatArrival(arrivesAt, now)}. Everything else is yours now.`;
}

/**
 * What a level-milestone chest shows. Every card mirrors something the milestone
 * table really grants — a title or perk the milestone does not define is not invented.
 */
export function buildLevelMilestoneLoot(
  milestone: LevelMilestone,
  coins: number,
  arrivesAt?: number,
  now: number = Date.now(),
): LootItem[] {
  const { level, reward } = milestone;
  const items: LootItem[] = [
    {
      id: `lvl-${level}-coins`,
      type: "coins",
      title: `${coins.toLocaleString()} Coins`,
      description: coinDescription("Milestone coin bonus", arrivesAt, now),
      amount: coins,
      rarity: levelRarity(level, { legendaryFrom: 50, epicFrom: 20 }),
    },
  ];

  if (reward.title) {
    items.push({
      id: `lvl-${level}-title`,
      type: "title",
      title: reward.title,
      description: `Exclusive Title for Level ${level}`,
      rarity: level >= 50 ? "legendary" : "epic",
      badgeText: "PRESTIGE TITLE",
    });
  }

  if (reward.perkDescription) {
    items.push({
      id: `lvl-${level}-perk`,
      type: "badge",
      title: "Prestige Perk",
      description: reward.perkDescription,
      rarity: "rare",
      badgeText: "PERK UNLOCKED",
    });
  }

  return items;
}

/**
 * What a streak milestone chest shows: the schedule's own coins and special
 * reward and shields, nothing more. A shield card appears exactly when
 * `shieldsGrantedBy` says the engine credits one, so the chest cannot promise
 * a shield the claim did not pay.
 */
export function buildStreakLoot(result: DailyStreakClaimResult, now: number = Date.now()): LootItem[] {
  const day = result.claimedDay;
  const items: LootItem[] = [
    {
      id: `streak-coins-${day}`,
      type: "coins",
      title: `${result.coinsAwarded.toLocaleString()} Coins`,
      description: coinDescription("Added to your BHALYAM balance", result.pendingUntil, now),
      amount: result.coinsAwarded,
      rarity: day >= 30 ? "legendary" : day >= 21 ? "rare" : "common",
    },
  ];

  const special = result.reward;
  if (special?.specialRewardTitle) {
    const specialType = special.specialRewardType ?? "title";
    items.push({
      id: `streak-special-${day}`,
      type: specialType,
      title: special.specialRewardTitle,
      description: SPECIAL_REWARD_BLURB[specialType],
      rarity: day >= 30 ? "legendary" : day >= 21 ? "epic" : "rare",
      badgeText: special.specialRewardType?.toUpperCase(),
    });
  }

  // A shield that rides on top of the special reward (Day 30: badge + shield). A shield that IS
  // the special reward already has its card above.
  const bonusShields = special?.bonusShields ?? 0;
  if (bonusShields > 0) {
    items.push({
      id: `streak-shield-${day}`,
      type: "shield",
      title: `${bonusShields}x Streak Shield`,
      description: SPECIAL_REWARD_BLURB.shield,
      rarity: day >= 30 ? "legendary" : "epic",
    });
  }

  return items;
}
