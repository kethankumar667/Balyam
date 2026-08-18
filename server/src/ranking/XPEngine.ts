import {
  calculateMatchXP,
  calculateXPProgression,
  XP_CONFIG,
} from "@shared/ranking/RankingRules.js";
import type { XPProgression } from "@shared/ranking/PlayerRank.js";
import type { PlayerProfile } from "@shared/profile/PlayerProfile.js";
import { profileService } from "../profile/ProfileService.js";

export class XPEngine {
  /**
   * Awards XP for a completed match and updates the player's profile and level.
   */
  public static awardMatchXP(
    playerId: string,
    params: {
      isWinner: boolean;
      durationMs: number;
      recoveryCount?: number;
      currentWinStreak?: number;
    }
  ): { earnedXP: number; profile: PlayerProfile; progression: XPProgression } {
    const earnedXP = calculateMatchXP(params);
    const profile = profileService.awardXP(playerId, earnedXP);
    const progression = calculateXPProgression(profile.experiencePoints);
    return { earnedXP, profile, progression };
  }

  /**
   * Awards XP for an achievement unlock.
   */
  public static awardAchievementXP(playerId: string): { earnedXP: number; profile: PlayerProfile } {
    const earnedXP = XP_CONFIG.ACHIEVEMENT_UNLOCK;
    const profile = profileService.awardXP(playerId, earnedXP);
    return { earnedXP, profile };
  }

  /**
   * Awards XP for challenge completion.
   */
  public static awardChallengeXP(playerId: string, amount: number): { earnedXP: number; profile: PlayerProfile } {
    const profile = profileService.awardXP(playerId, amount);
    return { earnedXP: amount, profile };
  }

  /**
   * Gets current XP progression breakdown for a player.
   */
  public static getProgression(playerId: string): XPProgression {
    const profile = profileService.getOrCreateProfile(playerId);
    return calculateXPProgression(profile.experiencePoints);
  }
}
