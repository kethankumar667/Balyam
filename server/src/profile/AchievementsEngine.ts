import { ACHIEVEMENT_CATALOG, type Achievement } from "@shared/profile/Achievements.js";
import type { PlayerStats } from "@shared/profile/PlayerStats.js";

export class AchievementsEngine {
  /**
   * Evaluates all achievements for a player and returns their unlock status & progress.
   */
  public static evaluateAchievements(
    stats: PlayerStats | undefined,
    unlockedMap: Record<string, number> = {}
  ): Achievement[] {
    if (!stats) {
      return ACHIEVEMENT_CATALOG.map((def) => ({
        ...def,
        unlocked: false,
        currentProgress: 0,
        progressPercent: 0,
      }));
    }

    return ACHIEVEMENT_CATALOG.map((def) => {
      let progress = 0;

      switch (def.id) {
        case "first_match":
          progress = stats.totalMatches;
          break;
        case "first_win":
          progress = stats.wins;
          break;
        case "three_streak":
          progress = stats.bestWinStreak || stats.currentWinStreak || 0;
          break;
        case "five_streak":
          progress = stats.bestWinStreak || stats.currentWinStreak || 0;
          break;
        case "ten_wins":
        case "fifty_wins":
        case "hundred_wins":
          progress = stats.wins;
          break;
        case "fifty_matches":
        case "hundred_matches":
          progress = stats.totalMatches;
          break;
        case "recovery_master":
          progress = stats.recoveryCount;
          break;
        case "five_recoveries":
          progress = stats.recoveryCount;
          break;
        case "ludo_master":
          progress = stats.perGame["ludo"]?.wins || 0;
          break;
        case "rummy_champ":
          progress = stats.perGame["rummy"]?.wins || 0;
          break;
        case "uno_expert":
          progress = stats.perGame["uno"]?.wins || 0;
          break;
        case "cricket_legend":
          progress = stats.perGame["handcricket"]?.wins || 0;
          break;
        case "chess_grandmaster":
          progress = stats.perGame["chess"]?.wins || 0;
          break;
        case "carrom_striker":
          progress = stats.perGame["carrom"]?.wins || 0;
          break;
        case "marathon_gamer":
          progress = Math.floor(stats.totalPlayTimeMinutes);
          break;
        case "tournament_ready":
          progress = stats.totalMatches >= 20 && stats.winRate >= 60 ? 20 : Math.min(stats.totalMatches, 19);
          break;
        case "variety_player":
          progress = Object.keys(stats.perGame).length;
          break;
        default:
          progress = 0;
      }

      const unlocked = progress >= def.targetValue || !!unlockedMap[def.id];
      const progressPercent = Math.min(100, Math.round((progress / def.targetValue) * 100));

      return {
        ...def,
        unlocked,
        unlockedAt: unlockedMap[def.id] || (unlocked ? Date.now() : undefined),
        currentProgress: progress,
        progressPercent,
      };
    });
  }
}
