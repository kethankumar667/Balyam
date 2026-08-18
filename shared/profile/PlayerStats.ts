import type { GameKind } from "../types.js";

export interface GameStats {
  game: GameKind;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0..100 %
  averageMatchDurationMinutes: number;
  totalPlayTimeMinutes: number;
}

export interface PlayerStats {
  playerId: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0..100 %
  totalPlayTimeMinutes: number;
  longestMatchMinutes: number;
  averageMatchMinutes: number;
  recoveryCount: number;
  currentWinStreak: number;
  bestWinStreak: number;
  currentPlayStreak: number;
  bestPlayStreak: number;
  favoriteGame: GameKind | "none";
  perGame: Partial<Record<GameKind, GameStats>>;
}

export const INITIAL_PLAYER_STATS = (playerId: string): PlayerStats => ({
  playerId,
  totalMatches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winRate: 0,
  totalPlayTimeMinutes: 0,
  longestMatchMinutes: 0,
  averageMatchMinutes: 0,
  recoveryCount: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  currentPlayStreak: 0,
  bestPlayStreak: 0,
  favoriteGame: "none",
  perGame: {},
});
