import type { GameKind } from "../types.js";
import type { BhalyamGameSlug } from "../catalog.js";

export type AllGameSlug = GameKind | BhalyamGameSlug | "nokiasnake";

export type MatchContextType = "SOLO" | "VS_BOTS" | "PVP_MULTIPLAYER" | "PASS_AND_PLAY";

export type ScoringDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

export type FoilTier = "carbon" | "neon_cyan" | "prismatic_holo" | "obsidian_vanguard";

/**
 * 5-Axis Quantum Performance Radar scoring (0 to 100 for each axis).
 */
export interface QuantumPerformanceRadar {
  velocity: number;     // Action speed / pacing
  clutch: number;       // Performance under pressure
  efficiency: number;   // Points per turn / action ratio
  consistency: number;  // Low score variance
  aggression: number;   // Risk taking & boundary/capture rate
}

/**
 * Per-mode scorecard holding player's personal best, historical trend, and metrics.
 */
export interface ModeScorecard {
  modeId: string;
  modeDisplayName: string;
  bestScore: number;
  bestScoreAchievedAt: number;
  bestScoreMatchId: string;
  scoringDirection: ScoringDirection;
  timesPlayed: number;
  totalScoreAccumulated: number;
  averageScore: number;
  recentScores: number[]; // Last 5 scores (most recent first)
  bestContext: MatchContextType;
  secondaryMetrics: Record<string, number | string>;
  radar: QuantumPerformanceRadar;
  foilTier: FoilTier;
}

/**
 * Game-level scorecard grouping all modes for a specific game.
 */
export interface GameScorecard {
  game: AllGameSlug;
  gameDisplayName: string;
  modes: Record<string, ModeScorecard>;
  lastPlayedAt: number;
  totalModesPlayed: number;
}

/**
 * Complete scorecard archive for a player across all games.
 */
export interface PlayerScorecardArchive {
  playerId: string;
  games: Partial<Record<AllGameSlug, GameScorecard>>;
  totalPersonalBestsBeaten: number;
  updatedAt: number;
}

/**
 * Payload sent to record a match score.
 */
export interface RecordScorePayload {
  game: AllGameSlug;
  modeId: string;
  score: number;
  context: MatchContextType;
  matchId: string;
  secondaryMetrics?: Record<string, number | string>;
  radarMetrics?: Partial<QuantumPerformanceRadar>;
}

/**
 * Result returned upon recording a score.
 */
export interface RecordScoreResult {
  game: AllGameSlug;
  scorecard: ModeScorecard;
  isNewPersonalBest: boolean;
  deltaFromPrevious: number;
  previousBest?: number;
  totalPersonalBestsBeaten: number;
}

/**
 * Real-time Ghost Pace status for in-game HUD.
 */
export interface GhostPaceStatus {
  game: AllGameSlug;
  modeId: string;
  personalBest: number;
  scoringDirection: ScoringDirection;
  currentScore: number;
  delta: number;
  isAhead: boolean;
  isOverdrive: boolean;
}
