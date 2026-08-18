import type { GameKind } from "@shared/types.js";
import type { PlayerStats, GameStats } from "@shared/profile/PlayerStats.js";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats.js";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";

export class StatsProjection {
  /**
   * Projects a new match result onto an existing player's stats object.
   */
  public static projectMatch(
    currentStats: PlayerStats | undefined,
    playerId: string,
    match: MatchHistoryItem
  ): PlayerStats {
    const stats: PlayerStats = currentStats ? { ...currentStats, perGame: { ...currentStats.perGame } } : INITIAL_PLAYER_STATS(playerId);

    const isWin = match.result === "WIN";
    const isLoss = match.result === "LOSS";
    const isDraw = match.result === "DRAW";
    const durationMinutes = Math.max(0.1, Math.round((match.durationMs / 60000) * 10) / 10);

    stats.totalMatches += 1;
    stats.currentPlayStreak = (stats.currentPlayStreak || 0) + 1;
    stats.bestPlayStreak = Math.max(stats.bestPlayStreak || 0, stats.currentPlayStreak);

    if (isWin) {
      stats.wins += 1;
      stats.currentWinStreak = (stats.currentWinStreak || 0) + 1;
      stats.bestWinStreak = Math.max(stats.bestWinStreak || 0, stats.currentWinStreak);
    } else if (isLoss) {
      stats.losses += 1;
      stats.currentWinStreak = 0;
    } else if (isDraw) {
      stats.draws += 1;
    }

    stats.winRate = Math.round((stats.wins / stats.totalMatches) * 100);
    stats.totalPlayTimeMinutes = Math.round((stats.totalPlayTimeMinutes + durationMinutes) * 10) / 10;
    stats.longestMatchMinutes = Math.max(stats.longestMatchMinutes, durationMinutes);
    stats.averageMatchMinutes = Math.round((stats.totalPlayTimeMinutes / stats.totalMatches) * 10) / 10;

    // Per-game projection
    const game = match.game;
    const existingGameStats = stats.perGame[game] || {
      game,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      averageMatchDurationMinutes: 0,
      totalPlayTimeMinutes: 0,
    };

    const updatedGameStats: GameStats = {
      ...existingGameStats,
      matchesPlayed: existingGameStats.matchesPlayed + 1,
      wins: existingGameStats.wins + (isWin ? 1 : 0),
      losses: existingGameStats.losses + (isLoss ? 1 : 0),
      draws: existingGameStats.draws + (isDraw ? 1 : 0),
      totalPlayTimeMinutes: Math.round((existingGameStats.totalPlayTimeMinutes + durationMinutes) * 10) / 10,
    };

    updatedGameStats.winRate = Math.round((updatedGameStats.wins / updatedGameStats.matchesPlayed) * 100);
    updatedGameStats.averageMatchDurationMinutes = Math.round((updatedGameStats.totalPlayTimeMinutes / updatedGameStats.matchesPlayed) * 10) / 10;

    stats.perGame[game] = updatedGameStats;

    // Determine favorite game (game with most matches played)
    let maxMatches = 0;
    let fav: GameKind | "none" = "none";
    for (const [g, gStats] of Object.entries(stats.perGame)) {
      if (gStats && gStats.matchesPlayed > maxMatches) {
        maxMatches = gStats.matchesPlayed;
        fav = g as GameKind;
      }
    }
    stats.favoriteGame = fav;

    return stats;
  }
}
