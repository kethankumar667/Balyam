/**
 * 30-Day Daily Login Streak Engine — Pure Domain Logic
 *
 * Implements UTC timezone normalization, calendar date difference calculations,
 * streak progression, anti-time-travel verification, shield protection,
 * and 30-day grand cycle rollover mechanics.
 */

import {
  STREAK_REWARDS_SCHEDULE,
  type DailyStreakState,
  type StreakDayStatus,
  type StreakRewardItem,
  type StreakScheduledDay,
  type StreakClaimStatusCode,
} from "@shared/streak-types.js";

export interface StoredStreakRecord {
  playerId: string;
  currentStreak: number;
  longestStreak: number;
  cycleCount: number;
  lastClaimedDate: string | null; // YYYY-MM-DD UTC
  lastClaimedAt: number | null; // epoch ms
  shieldsRemaining: number;
  claimHistory: Array<{
    date: string;
    claimedAt: number;
    day: number;
    coins: number;
    cycle: number;
  }>;
}

/**
 * Returns UTC calendar date string in format YYYY-MM-DD.
 */
export function getUtcDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the epoch timestamp (ms) for the start of the current UTC day (00:00:00.000 UTC).
 */
export function getUtcMidnightEpoch(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
}

/**
 * Returns the epoch timestamp (ms) for the start of the next UTC day (00:00:00.000 UTC).
 */
export function getNextUtcMidnightEpoch(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0);
}

/**
 * Calculates calendar day difference between two UTC date strings (toDate - fromDate).
 * Example: '2026-09-08' to '2026-09-09' returns 1.
 */
export function getUtcDayDifference(fromDateStr: string, toDateStr: string): number {
  if (fromDateStr === toDateStr) return 0;
  const [fromY, fromM, fromD] = fromDateStr.split("-").map(Number);
  const [toY, toM, toD] = toDateStr.split("-").map(Number);

  const fromEpoch = Date.UTC(fromY, fromM - 1, fromD);
  const toEpoch = Date.UTC(toY, toM - 1, toD);

  const MS_PER_DAY = 86_400_000;
  return Math.round((toEpoch - fromEpoch) / MS_PER_DAY);
}

export interface EvaluateClaimResult {
  canClaim: boolean;
  code: StreakClaimStatusCode;
  message: string;
  newStreak: number;
  claimedDay: number;
  reward: StreakRewardItem | null;
  coinsAwarded: number;
  cycleCompleted: boolean;
  newCycleCount: number;
  shieldUsed: boolean;
  newShieldsRemaining: number;
  newLongestStreak: number;
  newHistoryEntry?: {
    date: string;
    claimedAt: number;
    day: number;
    coins: number;
    cycle: number;
  };
}

/**
 * Evaluates whether a streak reward can be claimed at the given timestamp
 * and determines the resulting streak state, coin reward, and progression.
 */
export function evaluateStreakClaim(
  record: StoredStreakRecord | null,
  currentTimestamp: number,
): EvaluateClaimResult {
  const currentUtcDate = getUtcDateString(currentTimestamp);
  const currentStreak = record?.currentStreak ?? 0;
  const longestStreak = record?.longestStreak ?? 0;
  const cycleCount = record?.cycleCount ?? 0;
  const shieldsRemaining = record?.shieldsRemaining ?? 0;
  const lastClaimedDate = record?.lastClaimedDate ?? null;

  // Case 1: First claim ever
  if (!lastClaimedDate || currentStreak === 0) {
    const claimedDay = 1;
    const reward = STREAK_REWARDS_SCHEDULE[0];
    const newStreak = 1;
    const newLongestStreak = Math.max(longestStreak, 1);
    const newShieldsRemaining = shieldsRemaining + (reward.specialRewardType === "shield" ? 1 : 0);

    return {
      canClaim: true,
      code: "SUCCESS",
      message: "Day 1 streak claimed successfully!",
      newStreak,
      claimedDay,
      reward,
      coinsAwarded: reward.coins,
      cycleCompleted: false,
      newCycleCount: cycleCount,
      shieldUsed: false,
      newShieldsRemaining,
      newLongestStreak,
      newHistoryEntry: {
        date: currentUtcDate,
        claimedAt: currentTimestamp,
        day: claimedDay,
        coins: reward.coins,
        cycle: cycleCount,
      },
    };
  }

  // Case 2: Compare UTC days
  const dayDiff = getUtcDayDifference(lastClaimedDate, currentUtcDate);

  // Already claimed today
  if (dayDiff === 0) {
    const currentDayInCycle = ((currentStreak - 1) % 30) + 1;
    const currentReward = STREAK_REWARDS_SCHEDULE[currentDayInCycle - 1];
    return {
      canClaim: false,
      code: "ALREADY_CLAIMED",
      message: "You have already claimed today's streak reward. Check back after 00:00 UTC!",
      newStreak: currentStreak,
      claimedDay: currentDayInCycle,
      reward: currentReward,
      coinsAwarded: 0,
      cycleCompleted: false,
      newCycleCount: cycleCount,
      shieldUsed: false,
      newShieldsRemaining: shieldsRemaining,
      newLongestStreak: longestStreak,
    };
  }

  // Anti-time-travel check: current timestamp is in the past relative to last claim
  if (dayDiff < 0) {
    return {
      canClaim: false,
      code: "TIME_TRAVEL_DETECTED",
      message: "Clock anomaly detected: Claim timestamp is prior to the last recorded claim date.",
      newStreak: currentStreak,
      claimedDay: 1,
      reward: null,
      coinsAwarded: 0,
      cycleCompleted: false,
      newCycleCount: cycleCount,
      shieldUsed: false,
      newShieldsRemaining: shieldsRemaining,
      newLongestStreak: longestStreak,
    };
  }

  // Case 3: Consecutive day claim (dayDiff === 1)
  if (dayDiff === 1) {
    let newStreak: number;
    let cycleCompleted = false;
    let newCycleCount = cycleCount;

    if (currentStreak >= 30) {
      // Completed previous 30-day cycle, start fresh cycle on Day 1
      newStreak = 1;
      cycleCompleted = true;
      newCycleCount = cycleCount + 1;
    } else {
      newStreak = currentStreak + 1;
      if (newStreak === 30) {
        cycleCompleted = true;
      }
    }

    const claimedDay = ((newStreak - 1) % 30) + 1;
    const reward = STREAK_REWARDS_SCHEDULE[claimedDay - 1];
    const newLongestStreak = Math.max(longestStreak, newStreak);
    const newShieldsRemaining = shieldsRemaining + (reward.specialRewardType === "shield" ? 1 : 0);

    const code: StreakClaimStatusCode = cycleCompleted && newStreak === 30 ? "CYCLE_COMPLETED" : "SUCCESS";
    const message = cycleCompleted && newStreak === 30
      ? "Grand 30-Day Cycle Completed! Diamond Crown Chest unlocked!"
      : `Day ${claimedDay} streak claimed successfully!`;

    return {
      canClaim: true,
      code,
      message,
      newStreak,
      claimedDay,
      reward,
      coinsAwarded: reward.coins,
      cycleCompleted,
      newCycleCount,
      shieldUsed: false,
      newShieldsRemaining,
      newLongestStreak,
      newHistoryEntry: {
        date: currentUtcDate,
        claimedAt: currentTimestamp,
        day: claimedDay,
        coins: reward.coins,
        cycle: newCycleCount,
      },
    };
  }

  // Case 4: Missed day(s) (dayDiff > 1)
  if (shieldsRemaining > 0) {
    // Streak Protection Shield saves the streak!
    const shieldUsed = true;
    const newShieldsRemaining = shieldsRemaining - 1;

    let newStreak: number;
    let cycleCompleted = false;
    let newCycleCount = cycleCount;

    if (currentStreak >= 30) {
      newStreak = 1;
      cycleCompleted = true;
      newCycleCount = cycleCount + 1;
    } else {
      newStreak = currentStreak + 1;
      if (newStreak === 30) {
        cycleCompleted = true;
      }
    }

    const claimedDay = ((newStreak - 1) % 30) + 1;
    const reward = STREAK_REWARDS_SCHEDULE[claimedDay - 1];
    const newLongestStreak = Math.max(longestStreak, newStreak);
    const finalShieldsRemaining = newShieldsRemaining + (reward.specialRewardType === "shield" ? 1 : 0);

    return {
      canClaim: true,
      code: "SUCCESS",
      message: `Streak saved by Streak Protection Shield! Day ${claimedDay} claimed.`,
      newStreak,
      claimedDay,
      reward,
      coinsAwarded: reward.coins,
      cycleCompleted,
      newCycleCount,
      shieldUsed,
      newShieldsRemaining: finalShieldsRemaining,
      newLongestStreak,
      newHistoryEntry: {
        date: currentUtcDate,
        claimedAt: currentTimestamp,
        day: claimedDay,
        coins: reward.coins,
        cycle: newCycleCount,
      },
    };
  }

  // Case 5: Missed day without shield -> Streak resets to Day 1
  const claimedDay = 1;
  const reward = STREAK_REWARDS_SCHEDULE[0];
  const newStreak = 1;
  const newLongestStreak = Math.max(longestStreak, 1);
  const newShieldsRemaining = shieldsRemaining + (reward.specialRewardType === "shield" ? 1 : 0);

  return {
    canClaim: true,
    code: "STREAK_RESET",
    message: "Streak was reset due to missed day(s). Starting fresh at Day 1!",
    newStreak,
    claimedDay,
    reward,
    coinsAwarded: reward.coins,
    cycleCompleted: false,
    newCycleCount: cycleCount,
    shieldUsed: false,
    newShieldsRemaining,
    newLongestStreak,
    newHistoryEntry: {
      date: currentUtcDate,
      claimedAt: currentTimestamp,
      day: claimedDay,
      coins: reward.coins,
      cycle: cycleCount,
    },
  };
}

/**
 * Builds the complete 30-day scheduled view with individual status per day
 * for rendering on client mobile/desktop modal surfaces.
 */
export function buildStreakState(
  record: StoredStreakRecord | null,
  currentTimestamp: number,
): DailyStreakState {
  const currentUtcDate = getUtcDateString(currentTimestamp);
  const currentStreak = record?.currentStreak ?? 0;
  const longestStreak = record?.longestStreak ?? 0;
  const cycleCount = record?.cycleCount ?? 0;
  const lastClaimedDate = record?.lastClaimedDate ?? null;
  const lastClaimedAt = record?.lastClaimedAt ?? null;
  const shieldsRemaining = record?.shieldsRemaining ?? 0;
  const history = (record?.claimHistory ?? []).map((h) => h.date);

  let isClaimableToday = false;
  let activeDayInCycle = 1;

  if (!lastClaimedDate || currentStreak === 0) {
    isClaimableToday = true;
    activeDayInCycle = 1;
  } else {
    const dayDiff = getUtcDayDifference(lastClaimedDate, currentUtcDate);
    if (dayDiff === 0) {
      // Claimed today already
      isClaimableToday = false;
      activeDayInCycle = ((currentStreak - 1) % 30) + 1;
    } else if (dayDiff === 1) {
      // Consecutive next day
      isClaimableToday = true;
      activeDayInCycle = currentStreak >= 30 ? 1 : currentStreak + 1;
    } else {
      // Missed day: if has shield, continues, else resets to 1
      isClaimableToday = true;
      activeDayInCycle = shieldsRemaining > 0
        ? (currentStreak >= 30 ? 1 : currentStreak + 1)
        : 1;
    }
  }

  // Construct 30-day schedule statuses
  const schedule: StreakScheduledDay[] = STREAK_REWARDS_SCHEDULE.map((item) => {
    let status: StreakDayStatus;

    if (isClaimableToday) {
      if (item.day < activeDayInCycle) {
        status = "CLAIMED";
      } else if (item.day === activeDayInCycle) {
        status = "CLAIMABLE";
      } else {
        status = "LOCKED";
      }
    } else {
      // Already claimed today
      if (item.day <= activeDayInCycle) {
        status = "CLAIMED";
      } else {
        status = "LOCKED";
      }
    }

    return {
      ...item,
      status,
    };
  });

  return {
    playerId: record?.playerId ?? "",
    currentStreak,
    longestStreak,
    cycleCount,
    lastClaimedDate,
    lastClaimedAt,
    isClaimableToday,
    todayUtcDate: currentUtcDate,
    activeDayInCycle,
    nextResetAt: getNextUtcMidnightEpoch(currentTimestamp),
    shieldsRemaining,
    history,
    schedule,
  };
}
