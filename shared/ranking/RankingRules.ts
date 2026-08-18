import type { RankTier, RankTierName, XPProgression } from "./PlayerRank";
import type { PlayerStats } from "../profile/PlayerStats";

export const RANK_TIERS: Record<RankTierName, RankTier> = {
  Bronze: { name: "Bronze", minRating: 0, maxRating: 499, badge: "🥉", color: "#cd7f32" },
  Silver: { name: "Silver", minRating: 500, maxRating: 999, badge: "🥈", color: "#c0c0c0" },
  Gold: { name: "Gold", minRating: 1000, maxRating: 1499, badge: "🥇", color: "#ffd700" },
  Platinum: { name: "Platinum", minRating: 1500, maxRating: 1999, badge: "💠", color: "#00e5ff" },
  Diamond: { name: "Diamond", minRating: 2000, maxRating: 2499, badge: "💎", color: "#b9f2ff" },
  Master: { name: "Master", minRating: 2500, maxRating: 2999, badge: "👑", color: "#ff4081" },
  Grandmaster: { name: "Grandmaster", minRating: 3000, maxRating: 99999, badge: "🌌", color: "#7c4dff" },
};

export const XP_CONFIG = {
  MATCH_PLAYED: 15,
  MATCH_WIN: 35,
  WIN_STREAK_BONUS_PER_WIN: 5,
  MAX_STREAK_BONUS: 25,
  RECOVERY_BONUS: 20,
  ACHIEVEMENT_UNLOCK: 50,
  DAILY_CHALLENGE_REWARD: 75,
  WEEKLY_CHALLENGE_REWARD: 200,
  XP_PER_LEVEL: 100,
};

/**
 * Calculates XP earned from a completed match.
 */
export function calculateMatchXP(params: {
  isWinner: boolean;
  durationMs: number;
  recoveryCount?: number;
  currentWinStreak?: number;
}): number {
  let xp = XP_CONFIG.MATCH_PLAYED;
  if (params.isWinner) {
    xp += XP_CONFIG.MATCH_WIN;
    if (params.currentWinStreak && params.currentWinStreak > 1) {
      const streakBonus = Math.min(
        (params.currentWinStreak - 1) * XP_CONFIG.WIN_STREAK_BONUS_PER_WIN,
        XP_CONFIG.MAX_STREAK_BONUS
      );
      xp += streakBonus;
    }
  }
  if (params.recoveryCount && params.recoveryCount > 0) {
    xp += XP_CONFIG.RECOVERY_BONUS;
  }
  return xp;
}

/**
 * Calculates level and progress details from total accumulated XP.
 */
export function calculateXPProgression(totalXP: number): XPProgression {
  const currentLevel = Math.max(1, Math.floor(totalXP / XP_CONFIG.XP_PER_LEVEL) + 1);
  const currentLevelStartXP = (currentLevel - 1) * XP_CONFIG.XP_PER_LEVEL;
  const currentXP = totalXP - currentLevelStartXP;
  const nextLevelXP = XP_CONFIG.XP_PER_LEVEL;
  const levelProgressPercent = Math.min(100, Math.round((currentXP / nextLevelXP) * 100));

  return {
    currentXP,
    currentLevel,
    nextLevelXP,
    levelProgressPercent,
    totalXPForNextLevel: currentLevel * XP_CONFIG.XP_PER_LEVEL,
  };
}

/**
 * Derives competitive rating from PlayerStats.
 * Formula: Base 500 + (Wins * 25) - (Losses * 10) + (WinRate * 5) + (RecoveryCount * 15)
 */
export function calculateCompetitiveRating(stats: PlayerStats): number {
  if (stats.totalMatches === 0) return 400;

  const winPoints = stats.wins * 25;
  const lossPenalty = stats.losses * 8;
  const winRateBonus = Math.round(stats.winRate * 6);
  const recoveryBonus = stats.recoveryCount * 15;
  const raw = 400 + winPoints - lossPenalty + winRateBonus + recoveryBonus;

  return Math.max(100, raw);
}

/**
 * Derives the RankTier and progress within the tier for a given rating.
 */
export function getRankTier(rating: number): { tier: RankTierName; progressPercent: number } {
  const tierList: RankTierName[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
  
  for (const name of tierList) {
    const tier = RANK_TIERS[name];
    if (rating >= tier.minRating && rating <= tier.maxRating) {
      if (name === "Grandmaster") return { tier: name, progressPercent: 100 };
      const range = tier.maxRating - tier.minRating + 1;
      const progress = rating - tier.minRating;
      const progressPercent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
      return { tier: name, progressPercent };
    }
  }

  return { tier: "Bronze", progressPercent: 0 };
}
