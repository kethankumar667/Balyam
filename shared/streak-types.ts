/**
 * 30-Day Daily Login Streak & Rewards System — Shared Contracts & Schedules
 *
 * Defines the complete reward schedule (Days 1–30), milestone prize chests,
 * claim payload types, streak state interfaces, and claim result status codes.
 */

export type StreakRewardType =
  | "coins"
  | "title"
  | "emojis"
  | "frame"
  | "badge"
  | "shield";

export type StreakMilestoneChest = "bronze" | "silver" | "gold" | "diamond";

export interface StreakRewardItem {
  day: number;
  coins: number;
  milestoneChest?: StreakMilestoneChest;
  specialRewardTitle?: string;
  specialRewardType?: StreakRewardType;
  description: string;
}

export type StreakDayStatus = "CLAIMED" | "CLAIMABLE" | "LOCKED";

export interface StreakScheduledDay extends StreakRewardItem {
  status: StreakDayStatus;
}

/**
 * Authoritative 30-Day Streak Rewards Schedule.
 * Days 1-6: Base escalating coin grants.
 * Day 7: Bronze Chest (1,000 coins + "Early Bird" title).
 * Days 8-13: Mid-tier coin grants.
 * Day 14: Silver Chest (2,500 coins + Custom reaction/emoji pack).
 * Days 15-20: Higher tier coin grants.
 * Day 21: Gold Chest (5,000 coins + Avatar frame).
 * Days 22-29: Advanced coin grants.
 * Day 30: Diamond Crown Chest (10,000 coins + 1x Streak Shield + "Monthly Champion" badge).
 */
export const STREAK_REWARDS_SCHEDULE: readonly StreakRewardItem[] = [
  { day: 1,  coins: 100,  description: "Day 1 Welcome Reward" },
  { day: 2,  coins: 120,  description: "Day 2 Momentum Bonus" },
  { day: 3,  coins: 150,  description: "Day 3 Streak Multiplier" },
  { day: 4,  coins: 180,  description: "Day 4 Consistency Grant" },
  { day: 5,  coins: 200,  description: "Day 5 High Roller Spark" },
  { day: 6,  coins: 250,  description: "Day 6 Eve of Milestone" },
  {
    day: 7,
    coins: 1000,
    milestoneChest: "bronze",
    specialRewardTitle: "Early Bird",
    specialRewardType: "title",
    description: "Bronze Chest: 1,000 Coins + 'Early Bird' Title",
  },
  { day: 8,  coins: 300,  description: "Day 8 Fresh Week Kickoff" },
  { day: 9,  coins: 350,  description: "Day 9 Coin Boost" },
  { day: 10, coins: 400,  description: "Day 10 Milestone Builder" },
  { day: 11, coins: 450,  description: "Day 11 Fortitude Bonus" },
  { day: 12, coins: 500,  description: "Day 12 Silver Eve Spark" },
  { day: 13, coins: 600,  description: "Day 13 Silver Horizon" },
  {
    day: 14,
    coins: 2500,
    milestoneChest: "silver",
    specialRewardTitle: "Flame & Crown Emojis",
    specialRewardType: "emojis",
    description: "Silver Chest: 2,500 Coins + Exclusive Emoji Pack",
  },
  { day: 15, coins: 650,  description: "Day 15 Halfway Power" },
  { day: 16, coins: 700,  description: "Day 16 Gold Quest Grant" },
  { day: 17, coins: 750,  description: "Day 17 Determination Boost" },
  { day: 18, coins: 800,  description: "Day 18 Persistence Reward" },
  { day: 19, coins: 850,  description: "Day 19 Champion In The Making" },
  { day: 20, coins: 900,  description: "Day 20 Gold Eve Surge" },
  {
    day: 21,
    coins: 5000,
    milestoneChest: "gold",
    specialRewardTitle: "Solar Flare Frame",
    specialRewardType: "frame",
    description: "Gold Chest: 5,000 Coins + Exclusive Avatar Frame",
  },
  { day: 22, coins: 950,  description: "Day 22 Grand Final Stretch" },
  { day: 23, coins: 1000, description: "Day 23 Mastery Grant" },
  { day: 24, coins: 1100, description: "Day 24 Veteran Coin Vault" },
  { day: 25, coins: 1200, description: "Day 25 Elite Dedication" },
  { day: 26, coins: 1300, description: "Day 26 High Stakes Payout" },
  { day: 27, coins: 1400, description: "Day 27 Legend Pathway" },
  { day: 28, coins: 1500, description: "Day 28 Diamond Eve Spark" },
  { day: 29, coins: 1600, description: "Day 29 Penultimate Peak" },
  {
    day: 30,
    coins: 10000,
    milestoneChest: "diamond",
    specialRewardTitle: "Monthly Champion",
    specialRewardType: "badge",
    description: "Diamond Crown Chest: 10,000 Coins + Streak Shield + 'Monthly Champion' Badge",
  },
] as const;

export interface DailyStreakState {
  playerId: string;
  currentStreak: number;
  longestStreak: number;
  cycleCount: number;
  lastClaimedDate: string | null; // YYYY-MM-DD UTC
  lastClaimedAt: number | null; // epoch ms
  isClaimableToday: boolean;
  todayUtcDate: string; // YYYY-MM-DD UTC
  activeDayInCycle: number; // 1..30
  nextResetAt: number; // epoch ms of next 00:00:00 UTC
  shieldsRemaining: number;
  history: string[]; // Recent claimed UTC dates
  schedule: StreakScheduledDay[];
}

export type StreakClaimStatusCode =
  | "SUCCESS"
  | "ALREADY_CLAIMED"
  | "TIME_TRAVEL_DETECTED"
  | "STREAK_RESET"
  | "CYCLE_COMPLETED"
  | "UNAUTHENTICATED"
  | "ERROR";

export interface DailyStreakClaimRequest {
  idempotencyKey?: string;
  clientTimestamp?: number;
}

export interface DailyStreakClaimResult {
  success: boolean;
  code: StreakClaimStatusCode;
  message: string;
  claimedDay: number;
  reward: StreakRewardItem | null;
  coinsAwarded: number;
  newStreak: number;
  cycleCompleted: boolean;
  cycleCount: number;
  shieldUsed: boolean;
  walletBalance: string;
  updatedState: DailyStreakState;
}
