import {
  DAILY_CHALLENGE_TEMPLATES,
  WEEKLY_CHALLENGE_TEMPLATES,
  type Challenge,
  type PlayerChallenges,
} from "@shared/ranking/Challenges.js";
import { profileService } from "../profile/ProfileService.js";
import { XPEngine } from "./XPEngine.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

interface StoredClaimState {
  claimedIds: Set<string>;
}

export class ChallengeEngine {
  private playerClaims = new Map<string, StoredClaimState>();

  /**
   * Returns the player's active daily and weekly challenges with evaluated progress and claim state.
   */
  public getPlayerChallenges(playerId: string): PlayerChallenges {
    const stats = profileService.getStats(playerId);
    const claims = this.getOrCreateClaims(playerId);

    const now = new Date();
    const dailyResetTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).getTime();
    
    // Days until next Sunday UTC midnight
    const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
    const weeklyResetTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday)).getTime();

    const dateSeed = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;

    // Select 3 daily challenges deterministically based on date seed
    const daily: Challenge[] = DAILY_CHALLENGE_TEMPLATES.slice(0, 3).map((tmpl, idx) => {
      const id = `daily_${dateSeed}_${tmpl.templateId}_${idx}`;
      let current = 0;

      switch (tmpl.category) {
        case "matches":
          if (tmpl.game) {
            current = stats.perGame[tmpl.game]?.matchesPlayed || 0;
          } else {
            current = stats.totalMatches;
          }
          break;
        case "wins":
          if (tmpl.game) {
            current = stats.perGame[tmpl.game]?.wins || 0;
          } else {
            current = stats.wins;
          }
          break;
        case "duration":
          current = Math.floor(stats.totalPlayTimeMinutes);
          break;
        default:
          current = stats.totalMatches;
      }

      const completed = current >= tmpl.target;
      const claimed = claims.claimedIds.has(id);

      return {
        id,
        type: "daily",
        title: tmpl.title,
        description: tmpl.description,
        target: tmpl.target,
        current: Math.min(tmpl.target, current),
        completed,
        claimed,
        xpReward: tmpl.xpReward,
        game: tmpl.game,
        category: tmpl.category,
      };
    });

    // Select weekly challenges
    const weekNumber = Math.ceil(now.getUTCDate() / 7);
    const weekSeed = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-W${weekNumber}`;

    const weekly: Challenge[] = WEEKLY_CHALLENGE_TEMPLATES.map((tmpl, idx) => {
      const id = `weekly_${weekSeed}_${tmpl.templateId}_${idx}`;
      let current = 0;

      switch (tmpl.category) {
        case "matches":
          current = stats.totalMatches;
          break;
        case "wins":
          current = stats.wins;
          break;
        case "duration":
          current = Math.floor(stats.totalPlayTimeMinutes);
          break;
        case "multi_game":
          current = Object.keys(stats.perGame).length;
          break;
        default:
          current = stats.totalMatches;
      }

      const completed = current >= tmpl.target;
      const claimed = claims.claimedIds.has(id);

      return {
        id,
        type: "weekly",
        title: tmpl.title,
        description: tmpl.description,
        target: tmpl.target,
        current: Math.min(tmpl.target, current),
        completed,
        claimed,
        xpReward: tmpl.xpReward,
        category: tmpl.category,
      };
    });

    return {
      playerId,
      daily,
      weekly,
      dailyResetTime,
      weeklyResetTime,
    };
  }

  /**
   * Claims a completed challenge reward and awards XP.
   */
  public claimChallengeReward(
    playerId: string,
    challengeId: string
  ): { success: boolean; earnedXP: number; error?: string } {
    const challenges = this.getPlayerChallenges(playerId);
    const all = [...challenges.daily, ...challenges.weekly];
    const target = all.find((c) => c.id === challengeId);

    if (!target) {
      return { success: false, earnedXP: 0, error: "Challenge not found" };
    }

    if (!target.completed) {
      return { success: false, earnedXP: 0, error: "Challenge not completed yet" };
    }

    if (target.claimed) {
      return { success: false, earnedXP: 0, error: "Challenge reward already claimed" };
    }

    const claims = this.getOrCreateClaims(playerId);
    claims.claimedIds.add(challengeId);

    XPEngine.awardChallengeXP(playerId, target.xpReward);
    // Durable, and audited. The in-memory set above decides duplicates within
    // this process; the store's primary key decides them across a restart —
    // which is the case that used to hand every player their daily rewards
    // again after every deploy.
    progressionSync.challengeClaimed(playerId, challengeId, target.xpReward);

    return {
      success: true,
      earnedXP: target.xpReward,
    };
  }

  private getOrCreateClaims(playerId: string): StoredClaimState {
    let claims = this.playerClaims.get(playerId);
    if (!claims) {
      claims = { claimedIds: new Set() };
      this.playerClaims.set(playerId, claims);
    }
    return claims;
  }

  /**
   * Restore which challenge rewards have already been taken.
   *
   * This is the one that made "already claimed" a lie: the claim set lived in
   * a Map, so every redeploy handed every player their daily rewards again.
   */
  public hydrate(claims: Array<{ playerId: string; challengeId: string }>): void {
    for (const c of claims) {
      this.getOrCreateClaims(c.playerId).claimedIds.add(c.challengeId);
    }
  }

  public reset(): void {
    this.playerClaims.clear();
  }
}

export const challengeEngine = new ChallengeEngine();
