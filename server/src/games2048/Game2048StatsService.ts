/**
 * 2048 Cloud-Synced Best Scores Service
 *
 * 2048 stays a client-only, solo game (no room, no socket) — see
 * `client/src/games/2048/useGame2048.ts`. This is the one small server
 * surface it needs: a player's personal-best stats (per solo mode, plus the
 * best Race run's ghost-pace timeline) tracked by account so they follow the
 * player across devices, mirroring `StreakService`'s in-memory + PostgREST
 * upsert shape exactly.
 */

import { logger } from "../lib/logger.js";
import { PostgrestClient, readPostgrestConfig, type PostgrestConfig } from "../persistence/postgrest.js";
import { scorecardService } from "../profile/ScorecardService.js";

export interface RaceGhostPoint {
  /** Milliseconds since the race started when this tile milestone was first reached. */
  atMs: number;
  tile: number;
}

export interface Game2048Stats {
  bestScore: { battle: number; timeattack: number; zen: number };
  bestRaceTimeMs: number | null;
  bestRaceGhost: RaceGhostPoint[] | null;
  /** Today's Daily Challenge best — resets each day, so it's meaningless without the date it belongs to. */
  dailyBestScore: number;
  dailyDate: string | null;
}

interface Game2048StatsRow {
  player_id: string;
  best_score_battle: number;
  best_score_timeattack: number;
  best_score_zen: number;
  best_race_time_ms: number | null;
  best_race_ghost: RaceGhostPoint[] | null;
  daily_best_score: number;
  daily_date: string | null;
  updated_at?: string;
}

export interface Game2048StatsServiceOptions {
  postgrestConfig?: PostgrestConfig | null;
}

function defaultStats(): Game2048Stats {
  return {
    bestScore: { battle: 0, timeattack: 0, zen: 0 },
    bestRaceTimeMs: null,
    bestRaceGhost: null,
    dailyBestScore: 0,
    dailyDate: null,
  };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isRaceGhostPoint(v: unknown): v is RaceGhostPoint {
  const p = v as Partial<RaceGhostPoint> | null;
  return !!p && isFiniteNumber(p.atMs) && isFiniteNumber(p.tile);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateStr(v: unknown): v is string {
  return typeof v === "string" && ISO_DATE_RE.test(v);
}

/**
 * Defensive parse of a client-supplied candidate — this is user input over
 * HTTP, so shape and value ranges are never trusted (matches this codebase's
 * "validate all user input" convention). A malformed or hostile body decays
 * to all-zero/null rather than throwing or corrupting the stored record.
 */
export function sanitizeCandidateStats(input: unknown): Game2048Stats {
  const candidate = (input ?? {}) as Partial<Game2048Stats>;
  const bestScore = (candidate.bestScore ?? {}) as Record<string, unknown>;
  const clampScore = (v: unknown): number => (isFiniteNumber(v) && v >= 0 ? Math.floor(v) : 0);
  const ghost = Array.isArray(candidate.bestRaceGhost) ? candidate.bestRaceGhost.filter(isRaceGhostPoint) : null;
  // A daily score is meaningless without a valid date to compare it against —
  // an invalid/missing date discards the score too, rather than storing an
  // orphaned number that `mergeGame2048Stats` could never safely compare.
  const dailyDate = isValidDateStr(candidate.dailyDate) ? candidate.dailyDate : null;

  return {
    bestScore: {
      battle: clampScore(bestScore.battle),
      timeattack: clampScore(bestScore.timeattack),
      zen: clampScore(bestScore.zen),
    },
    bestRaceTimeMs:
      isFiniteNumber(candidate.bestRaceTimeMs) && candidate.bestRaceTimeMs >= 0
        ? Math.floor(candidate.bestRaceTimeMs)
        : null,
    bestRaceGhost: ghost && ghost.length > 0 ? ghost : null,
    dailyBestScore: dailyDate ? clampScore(candidate.dailyBestScore) : 0,
    dailyDate,
  };
}

/**
 * Merges a candidate onto the stored record such that a sync can never
 * regress a personal best — the server is authoritative for "is this
 * actually an improvement," the client is just the messenger for a run it
 * just played locally (which could be stale, replayed, or tampered with).
 */
export function mergeGame2048Stats(existing: Game2048Stats, candidate: Game2048Stats): Game2048Stats {
  const merged: Game2048Stats = {
    bestScore: {
      battle: Math.max(existing.bestScore.battle, candidate.bestScore.battle),
      timeattack: Math.max(existing.bestScore.timeattack, candidate.bestScore.timeattack),
      zen: Math.max(existing.bestScore.zen, candidate.bestScore.zen),
    },
    bestRaceTimeMs: existing.bestRaceTimeMs,
    bestRaceGhost: existing.bestRaceGhost,
    dailyBestScore: existing.dailyBestScore,
    dailyDate: existing.dailyDate,
  };

  if (candidate.bestRaceTimeMs != null) {
    if (merged.bestRaceTimeMs == null || candidate.bestRaceTimeMs < merged.bestRaceTimeMs) {
      merged.bestRaceTimeMs = candidate.bestRaceTimeMs;
      merged.bestRaceGhost = candidate.bestRaceGhost ?? merged.bestRaceGhost;
    }
  }

  // Only "today" is ever tracked (no historical daily archive), so a newer
  // date always supersedes whatever day is currently stored, same day takes
  // the higher score, and an older date is a stale/replayed sync — ignored.
  if (candidate.dailyDate != null) {
    if (existing.dailyDate == null || candidate.dailyDate > existing.dailyDate) {
      merged.dailyBestScore = candidate.dailyBestScore;
      merged.dailyDate = candidate.dailyDate;
    } else if (candidate.dailyDate === existing.dailyDate) {
      merged.dailyBestScore = Math.max(existing.dailyBestScore, candidate.dailyBestScore);
    }
  }

  return merged;
}

export class Game2048StatsService {
  private readonly memoryStore = new Map<string, Game2048Stats>();
  private readonly postgrest: PostgrestClient | null;

  constructor(options: Game2048StatsServiceOptions = {}) {
    const config = options.postgrestConfig !== undefined ? options.postgrestConfig : readPostgrestConfig();
    this.postgrest = config ? new PostgrestClient(config) : null;
  }

  private async loadRecord(playerId: string): Promise<Game2048Stats> {
    const cached = this.memoryStore.get(playerId);
    if (cached) return cached;

    if (!this.postgrest) return defaultStats();

    try {
      const rows = await this.postgrest.select<Game2048StatsRow>(
        "game_2048_stats",
        `player_id=eq.${encodeURIComponent(playerId)}`,
      );
      if (rows.length === 0) return defaultStats();

      const row = rows[0];
      const record: Game2048Stats = {
        bestScore: {
          battle: row.best_score_battle ?? 0,
          timeattack: row.best_score_timeattack ?? 0,
          zen: row.best_score_zen ?? 0,
        },
        bestRaceTimeMs: row.best_race_time_ms ?? null,
        bestRaceGhost: Array.isArray(row.best_race_ghost) ? row.best_race_ghost : null,
        dailyBestScore: row.daily_best_score ?? 0,
        dailyDate: row.daily_date ?? null,
      };
      this.memoryStore.set(playerId, record);
      return record;
    } catch (err) {
      logger.warn({
        message: `Failed to query game_2048_stats from Supabase for ${playerId}: ${String(err)}`,
        module: "GAME_2048_STATS",
      });
      return defaultStats();
    }
  }

  private async persistRecord(playerId: string, record: Game2048Stats): Promise<void> {
    this.memoryStore.set(playerId, record);
    if (!this.postgrest) return;

    try {
      const row: Game2048StatsRow = {
        player_id: playerId,
        best_score_battle: record.bestScore.battle,
        best_score_timeattack: record.bestScore.timeattack,
        best_score_zen: record.bestScore.zen,
        best_race_time_ms: record.bestRaceTimeMs,
        best_race_ghost: record.bestRaceGhost,
        daily_best_score: record.dailyBestScore,
        daily_date: record.dailyDate,
        updated_at: new Date().toISOString(),
      };
      await this.postgrest.upsert("game_2048_stats", [row], "player_id");
    } catch (err) {
      logger.error({
        message: `Failed to persist game_2048_stats to Supabase for ${playerId}: ${String(err)}`,
        module: "GAME_2048_STATS",
      });
    }
  }

  /** Returns the authoritative cloud stats for a player (defaults if never synced). */
  async getStats(playerId: string): Promise<Game2048Stats> {
    return this.loadRecord(playerId);
  }

  /** Merges the candidate onto the stored record and persists, returning the authoritative merged result. */
  async syncStats(playerId: string, candidateInput: unknown): Promise<Game2048Stats> {
    const existing = await this.loadRecord(playerId);
    const candidate = sanitizeCandidateStats(candidateInput);
    const merged = mergeGame2048Stats(existing, candidate);
    await this.persistRecord(playerId, merged);

    // Wire authoritative personal bests directly into the universal Chrono-Scorecard system
    try {
      if (merged.bestScore.battle > 0) {
        scorecardService.recordScore(playerId, {
          game: "2048",
          modeId: "battle",
          score: merged.bestScore.battle,
          context: "SOLO",
          matchId: `2048_sync_battle_${Date.now()}`,
        });
      }
      if (merged.bestScore.zen > 0) {
        scorecardService.recordScore(playerId, {
          game: "2048",
          modeId: "zen",
          score: merged.bestScore.zen,
          context: "SOLO",
          matchId: `2048_sync_zen_${Date.now()}`,
        });
      }
      if (merged.bestScore.timeattack > 0) {
        scorecardService.recordScore(playerId, {
          game: "2048",
          modeId: "timeattack",
          score: merged.bestScore.timeattack,
          context: "SOLO",
          matchId: `2048_sync_timeattack_${Date.now()}`,
        });
      }
      if (merged.bestRaceTimeMs != null && merged.bestRaceTimeMs > 0) {
        scorecardService.recordScore(playerId, {
          game: "2048",
          modeId: "race",
          score: Math.round(merged.bestRaceTimeMs / 1000),
          context: "SOLO",
          matchId: `2048_sync_race_${Date.now()}`,
        });
      }
      if (merged.dailyBestScore > 0) {
        scorecardService.recordScore(playerId, {
          game: "2048",
          modeId: "daily",
          score: merged.dailyBestScore,
          context: "SOLO",
          matchId: `2048_sync_daily_${Date.now()}`,
        });
      }
    } catch (err) {
      logger.warn({
        message: `Failed to project 2048 stats into scorecardService for ${playerId}: ${String(err)}`,
        module: "GAME_2048_STATS",
      });
    }

    return merged;
  }
}
