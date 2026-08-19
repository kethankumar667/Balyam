import type { GameKind } from "@shared/types.js";
import type { PlayerRank, RankTierName } from "@shared/ranking/PlayerRank.js";
import {
  calculateCompetitiveRating,
  getRankTier,
} from "@shared/ranking/RankingRules.js";
import { profileService } from "../profile/ProfileService.js";
import type { PlayerStats } from "@shared/profile/PlayerStats.js";

interface CachedRankSnapshot {
  timestamp: number;
  ranks: Map<string, PlayerRank>;
}

export class RankingService {
  private cache: CachedRankSnapshot | null = null;
  private readonly CACHE_TTL_MS = 10_000; // 10s TTL for snapshot caching

  /**
   * Retrieves or computes the PlayerRank for a player.
   */
  public getPlayerRank(playerId: string): PlayerRank {
    this.ensureFreshSnapshot();
    const cached = this.cache?.ranks.get(playerId);
    if (cached) return cached;

    // Direct computation fallback
    const stats = profileService.getStats(playerId);
    return this.computeSingleRank(playerId, stats, 1, 1);
  }

  /**
   * Invalidates snapshot cache when new matches complete.
   */
  public invalidateCache(): void {
    this.cache = null;
  }

  private ensureFreshSnapshot(): void {
    const now = Date.now();
    if (this.cache && now - this.cache.timestamp < this.CACHE_TTL_MS) {
      return;
    }

    const profiles = profileService.getAllProfiles();
    const playerStatsList: Array<{ playerId: string; stats: PlayerStats; rating: number }> = [];

    for (const prof of profiles) {
      const stats = profileService.getStats(prof.playerId);
      const rating = calculateCompetitiveRating(stats);
      playerStatsList.push({ playerId: prof.playerId, stats, rating });
    }

    // Sort descending by rating
    playerStatsList.sort((a, b) => b.rating - a.rating);

    const total = Math.max(1, playerStatsList.length);
    const ranks = new Map<string, PlayerRank>();

    for (let i = 0; i < playerStatsList.length; i++) {
      const item = playerStatsList[i]!;
      const globalRank = i + 1;
      const rankObj = this.computeSingleRank(item.playerId, item.stats, globalRank, total);
      ranks.set(item.playerId, rankObj);
    }

    this.cache = {
      timestamp: now,
      ranks,
    };
  }

  private computeSingleRank(
    playerId: string,
    stats: PlayerStats,
    globalRank: number,
    totalPlayers: number
  ): PlayerRank {
    const rating = calculateCompetitiveRating(stats);
    const { tier, progressPercent } = getRankTier(rating);
    const percentile = Math.max(1, Math.round(((totalPlayers - globalRank + 1) / totalPlayers) * 100));

    const perGameRank: Partial<Record<GameKind, { rank: number; rating: number; tier: RankTierName }>> = {};

    for (const [gameKey, gStats] of Object.entries(stats.perGame)) {
      if (gStats && gStats.matchesPlayed > 0) {
        const gRating = Math.max(100, 400 + gStats.wins * 30 - gStats.losses * 10 + Math.round(gStats.winRate * 5));
        const gTier = getRankTier(gRating).tier;
        perGameRank[gameKey as GameKind] = {
          rank: globalRank,
          rating: gRating,
          tier: gTier,
        };
      }
    }

    return {
      playerId,
      rating,
      tier,
      tierProgressPercent: progressPercent,
      globalRank,
      perGameRank,
      percentile,
    };
  }

  public reset(): void {
    this.cache = null;
  }
}

export const rankingService = new RankingService();
