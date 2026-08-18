import type { GameKind } from "../types";

export type RankTierName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Grandmaster";

export interface RankTier {
  name: RankTierName;
  minRating: number;
  maxRating: number;
  badge: string;
  color: string;
}

export interface PlayerRank {
  playerId: string;
  rating: number;
  tier: RankTierName;
  tierProgressPercent: number;
  globalRank: number;
  perGameRank: Partial<Record<GameKind, { rank: number; rating: number; tier: RankTierName }>>;
  percentile: number;
}

export interface XPProgression {
  currentXP: number;
  currentLevel: number;
  nextLevelXP: number;
  levelProgressPercent: number;
  totalXPForNextLevel: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  avatar?: string;
  level: number;
  tier: RankTierName;
  rating: number;
  wins: number;
  matchesPlayed: number;
  winRate: number;
  totalPlayTimeMinutes: number;
  favoriteGame: GameKind | "none";
}

export type LeaderboardMetric = "rating" | "wins" | "winRate" | "matchesPlayed" | "level";
export type LeaderboardTimeframe = "allTime" | "monthly" | "weekly";
