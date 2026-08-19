import { SEASON_REWARD_TIERS, type SeasonRewardTier } from "@shared/seasons/SeasonRewards.js";
import { profileService } from "../profile/ProfileService.js";
import { XPEngine } from "../ranking/XPEngine.js";

export class SeasonRewardsEngine {
  /**
   * Returns list of reward tiers with unlock and claim status for a given season XP.
   */
  public static evaluateRewards(
    seasonXP: number,
    claimedRewardIds: string[] = []
  ): Array<SeasonRewardTier & { unlocked: boolean; claimed: boolean }> {
    const claimedSet = new Set(claimedRewardIds);

    return SEASON_REWARD_TIERS.map((tier) => ({
      ...tier,
      unlocked: seasonXP >= tier.minSeasonXP,
      claimed: claimedSet.has(tier.tierId),
    }));
  }

  /**
   * Claims a season reward tier and awards bonus XP to player profile.
   */
  public static claimSeasonReward(
    playerId: string,
    tierId: string,
    seasonXP: number,
    claimedRewardIds: string[]
  ): { success: boolean; earnedXP: number; error?: string } {
    const target = SEASON_REWARD_TIERS.find((t) => t.tierId === tierId);
    if (!target) return { success: false, earnedXP: 0, error: "Tier not found" };

    if (seasonXP < target.minSeasonXP) {
      return { success: false, earnedXP: 0, error: "Season XP requirement not met" };
    }

    if (claimedRewardIds.includes(tierId)) {
      return { success: false, earnedXP: 0, error: "Reward already claimed" };
    }

    XPEngine.awardChallengeXP(playerId, target.bonusXP);
    return { success: true, earnedXP: target.bonusXP };
  }
}
