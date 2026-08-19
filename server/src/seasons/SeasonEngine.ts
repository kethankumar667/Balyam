import type { Season } from "@shared/seasons/Season.js";
import { SEASON_REWARD_TIERS } from "@shared/seasons/SeasonRewards.js";

export class SeasonEngine {
  public static readonly SEASON_DURATION_DAYS = 30;

  /**
   * Generates or retrieves the active season definition based on current timestamp.
   */
  public static getCurrentSeason(now = Date.now()): Season {
    const epoch = new Date(2026, 0, 1).getTime(); // Season 1 starts Jan 1, 2026
    const seasonDurationMs = this.SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;
    
    const seasonIndex = Math.max(0, Math.floor((now - epoch) / seasonDurationMs));
    const seasonNumber = seasonIndex + 1;
    const startsAt = epoch + seasonIndex * seasonDurationMs;
    const endsAt = startsAt + seasonDurationMs;

    return {
      id: `season_${seasonNumber}`,
      name: `Season ${seasonNumber}: Champions of BHALYAM`,
      seasonNumber,
      startsAt,
      endsAt,
      isActive: true,
    };
  }

  /**
   * Derives current seasonal tier based on accumulated Season XP.
   */
  public static getSeasonTier(seasonXP: number): { tierName: string; badge: string } {
    let current = { tierName: "Unranked", badge: "🌱" };
    for (const reward of SEASON_REWARD_TIERS) {
      if (seasonXP >= reward.minSeasonXP) {
        current = { tierName: reward.name, badge: reward.badge };
      }
    }
    return current;
  }
}
