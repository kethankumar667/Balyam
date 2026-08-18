import type { GameKind } from "@shared/types.js";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardTimeframe,
} from "@shared/ranking/PlayerRank.js";
import {
  calculateCompetitiveRating,
  getRankTier,
} from "@shared/ranking/RankingRules.js";
import { profileService } from "../profile/ProfileService.js";

export interface LeaderboardQueryOptions {
  metric?: LeaderboardMetric;
  game?: GameKind;
  timeframe?: LeaderboardTimeframe;
  search?: string;
  limit?: number;
  offset?: number;
}

export class LeaderboardService {
  /**
   * Queries the leaderboard with multi-dimensional filtering, metric selection, and pagination.
   */
  public getLeaderboard(options: LeaderboardQueryOptions = {}): {
    entries: LeaderboardEntry[];
    total: number;
    metric: LeaderboardMetric;
    timeframe: LeaderboardTimeframe;
  } {
    const metric: LeaderboardMetric = options.metric || "rating";
    const timeframe: LeaderboardTimeframe = options.timeframe || "allTime";
    const limit = Math.min(100, Math.max(1, options.limit || 25));
    const offset = Math.max(0, options.offset || 0);

    const profiles = profileService.getAllProfiles();
    const allEntries: LeaderboardEntry[] = [];

    for (const prof of profiles) {
      const stats = profileService.getStats(prof.playerId);

      // If filtering by specific game, require matches played in that game
      if (options.game) {
        const gStats = stats.perGame[options.game];
        if (!gStats || gStats.matchesPlayed === 0) continue;
      }

      const rating = calculateCompetitiveRating(stats);
      const { tier } = getRankTier(rating);

      const entry: LeaderboardEntry = {
        rank: 0,
        playerId: prof.playerId,
        displayName: prof.displayName,
        avatar: prof.avatar,
        level: prof.level,
        tier,
        rating,
        wins: options.game ? stats.perGame[options.game]?.wins || 0 : stats.wins,
        matchesPlayed: options.game ? stats.perGame[options.game]?.matchesPlayed || 0 : stats.totalMatches,
        winRate: options.game ? stats.perGame[options.game]?.winRate || 0 : stats.winRate,
        totalPlayTimeMinutes: Math.round(
          options.game ? stats.perGame[options.game]?.totalPlayTimeMinutes || 0 : stats.totalPlayTimeMinutes
        ),
        favoriteGame: stats.favoriteGame,
      };

      if (options.search) {
        const q = options.search.toLowerCase().trim();
        if (!entry.displayName.toLowerCase().includes(q)) continue;
      }

      allEntries.push(entry);
    }

    // Sort entries based on requested metric
    allEntries.sort((a, b) => {
      switch (metric) {
        case "rating":
          return b.rating - a.rating;
        case "wins":
          return b.wins - a.wins;
        case "winRate":
          return b.winRate - a.winRate;
        case "matchesPlayed":
          return b.matchesPlayed - a.matchesPlayed;
        case "level":
          return b.level - a.level;
        default:
          return b.rating - a.rating;
      }
    });

    // Assign 1-indexed ranks
    for (let i = 0; i < allEntries.length; i++) {
      allEntries[i]!.rank = i + 1;
    }

    const paginated = allEntries.slice(offset, offset + limit);

    return {
      entries: paginated,
      total: allEntries.length,
      metric,
      timeframe,
    };
  }
}

export const leaderboardService = new LeaderboardService();
