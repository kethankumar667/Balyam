import type { Season, PlayerSeasonStats, SeasonSnapshot } from "@shared/seasons/Season.js";
import { SeasonEngine } from "./SeasonEngine.js";
import { SeasonRewardsEngine } from "./SeasonRewardsEngine.js";
import { profileService } from "../profile/ProfileService.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

export class SeasonService {
  // seasonId -> Map<playerId, PlayerSeasonStats>
  private seasonalStats = new Map<string, Map<string, PlayerSeasonStats>>();
  // seasonId -> SeasonSnapshot[]
  private historicalSnapshots = new Map<string, SeasonSnapshot[]>();

  public getCurrentSeason(): Season {
    return SeasonEngine.getCurrentSeason();
  }

  /**
   * Retrieves seasonal stats for a player.
   */
  public getPlayerSeasonStats(playerId: string, seasonId?: string): PlayerSeasonStats {
    const activeSeason = this.getCurrentSeason();
    const sid = seasonId || activeSeason.id;

    let sMap = this.seasonalStats.get(sid);
    if (!sMap) {
      sMap = new Map();
      this.seasonalStats.set(sid, sMap);
    }

    let stats = sMap.get(playerId);
    if (!stats) {
      stats = {
        playerId,
        seasonId: sid,
        seasonXP: 0,
        seasonLevel: 1,
        seasonRankTier: "Unranked",
        seasonWins: 0,
        seasonMatches: 0,
        seasonWinRate: 0,
        tournamentWins: 0,
        rewardsClaimed: [],
      };
      sMap.set(playerId, stats);
    }

    return stats;
  }

  /**
   * Records match outcome and seasonal XP for a player.
   */
  public recordSeasonMatch(
    playerId: string,
    params: { isWin: boolean; earnedXP: number; isTournamentWin?: boolean }
  ): PlayerSeasonStats {
    const stats = this.getPlayerSeasonStats(playerId);
    stats.seasonMatches += 1;
    if (params.isWin) stats.seasonWins += 1;
    if (params.isTournamentWin) stats.tournamentWins += 1;

    stats.seasonXP += params.earnedXP;
    stats.seasonLevel = Math.max(1, Math.floor(stats.seasonXP / 100) + 1);
    stats.seasonWinRate = Math.round((stats.seasonWins / stats.seasonMatches) * 100);
    stats.seasonRankTier = SeasonEngine.getSeasonTier(stats.seasonXP).tierName;

    progressionSync.seasonStatsChanged({
      seasonId: stats.seasonId,
      playerId,
      seasonXP: stats.seasonXP,
      seasonLevel: stats.seasonLevel,
      seasonWins: stats.seasonWins,
      seasonMatches: stats.seasonMatches,
      tournamentWins: stats.tournamentWins,
    });

    return stats;
  }

  /**
   * Claims a seasonal reward tier.
   */
  public claimReward(
    playerId: string,
    tierId: string
  ): { success: boolean; earnedXP: number; error?: string } {
    const stats = this.getPlayerSeasonStats(playerId);
    const result = SeasonRewardsEngine.claimSeasonReward(
      playerId,
      tierId,
      stats.seasonXP,
      stats.rewardsClaimed
    );

    if (result.success) {
      stats.rewardsClaimed.push(tierId);
      progressionSync.seasonTierClaimed(stats.seasonId, playerId, tierId, result.earnedXP);
      progressionSync.seasonStatsChanged({
        seasonId: stats.seasonId,
        playerId,
        seasonXP: stats.seasonXP,
        seasonLevel: stats.seasonLevel,
        seasonWins: stats.seasonWins,
        seasonMatches: stats.seasonMatches,
        tournamentWins: stats.tournamentWins,
      });
    }

    return result;
  }

  /**
   * Returns seasonal leaderboard ranked by Season XP.
   */
  public getSeasonLeaderboard(seasonId?: string, limit = 50): Array<PlayerSeasonStats & { displayName: string; avatar?: string; rank: number }> {
    const sid = seasonId || this.getCurrentSeason().id;
    const sMap = this.seasonalStats.get(sid);
    if (!sMap) return [];

    const list: Array<PlayerSeasonStats & { displayName: string; avatar?: string; rank: number }> = [];

    for (const stats of sMap.values()) {
      const prof = profileService.getOrCreateProfile(stats.playerId);
      list.push({
        ...stats,
        displayName: prof.displayName,
        avatar: prof.avatar,
        rank: 0,
      });
    }

    list.sort((a, b) => b.seasonXP - a.seasonXP);

    for (let i = 0; i < list.length; i++) {
      list[i]!.rank = i + 1;
    }

    return list.slice(0, limit);
  }

  /**
   * Creates an immutable historical season snapshot on rollover.
   */
  public rolloverSeason(oldSeasonId: string): SeasonSnapshot[] {
    const sMap = this.seasonalStats.get(oldSeasonId);
    if (!sMap) return [];

    const leaderboard = this.getSeasonLeaderboard(oldSeasonId);
    const snapshots: SeasonSnapshot[] = leaderboard.map((entry) => ({
      seasonId: oldSeasonId,
      seasonNumber: parseInt(oldSeasonId.replace("season_", "")) || 1,
      seasonName: `Season: ${oldSeasonId}`,
      placement: entry.rank,
      seasonRank: entry.seasonRankTier,
      seasonXP: entry.seasonXP,
      seasonWins: entry.seasonWins,
      rewardsEarned: entry.rewardsClaimed,
      achievementsUnlocked: [],
      completedAt: Date.now(),
    }));

    this.historicalSnapshots.set(oldSeasonId, snapshots);
    return snapshots;
  }

  public getPlayerHistoricalSnapshots(playerId: string): SeasonSnapshot[] {
    const results: SeasonSnapshot[] = [];
    for (const snapList of this.historicalSnapshots.values()) {
      const found = snapList.find((s) => s.placement > 0);
      if (found) results.push(found);
    }
    return results;
  }

  /** Restore season standings, taken rewards and frozen snapshots at boot. */
  public hydrate(
    stats: Array<{
      seasonId: string;
      playerId: string;
      seasonXP: number;
      seasonLevel: number;
      seasonWins: number;
      seasonMatches: number;
      tournamentWins: number;
    }>,
    claims: Array<{ seasonId: string; playerId: string; tierId: string }>,
    snapshots: SeasonSnapshot[] = [],
  ): void {
    for (const s of stats) {
      let sMap = this.seasonalStats.get(s.seasonId);
      if (!sMap) {
        sMap = new Map();
        this.seasonalStats.set(s.seasonId, sMap);
      }
      sMap.set(s.playerId, {
        playerId: s.playerId,
        seasonId: s.seasonId,
        seasonXP: s.seasonXP,
        seasonLevel: s.seasonLevel,
        seasonRankTier: SeasonEngine.getSeasonTier(s.seasonXP).tierName,
        seasonWins: s.seasonWins,
        seasonMatches: s.seasonMatches,
        seasonWinRate:
          s.seasonMatches > 0 ? Math.round((s.seasonWins / s.seasonMatches) * 100) : 0,
        tournamentWins: s.tournamentWins,
        rewardsClaimed: [],
      });
    }

    // Claimed tiers go on last, so a stats row restored above cannot overwrite
    // them with the empty array it was created with.
    for (const c of claims) {
      const stats = this.getPlayerSeasonStats(c.playerId, c.seasonId);
      if (!stats.rewardsClaimed.includes(c.tierId)) stats.rewardsClaimed.push(c.tierId);
    }

    for (const snap of snapshots) {
      const list = this.historicalSnapshots.get(snap.seasonId) ?? [];
      list.push(snap);
      this.historicalSnapshots.set(snap.seasonId, list);
    }
  }

  public reset(): void {
    this.seasonalStats.clear();
    this.historicalSnapshots.clear();
  }
}

export const seasonService = new SeasonService();
