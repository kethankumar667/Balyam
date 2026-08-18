import type { PlayerProfile } from "@shared/profile/PlayerProfile.js";
import { calculateLevel } from "@shared/profile/PlayerProfile.js";
import type { PlayerStats } from "@shared/profile/PlayerStats.js";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats.js";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";
import type { Achievement } from "@shared/profile/Achievements.js";

import { StatsProjection } from "./StatsProjection.js";
import { AchievementsEngine } from "./AchievementsEngine.js";
import { matchHistoryService } from "./MatchHistoryService.js";

export class ProfileService {
  private profiles: Map<string, PlayerProfile> = new Map();
  private stats: Map<string, PlayerStats> = new Map();
  private unlockedAchievements: Map<string, Record<string, number>> = new Map();

  /**
   * Retrieves or creates a player profile.
   */
  public getOrCreateProfile(playerId: string, displayName = "Player", avatar?: string): PlayerProfile {
    const existing = this.profiles.get(playerId);
    if (existing) {
      existing.lastSeenAt = Date.now();
      if (displayName && displayName !== "Player") existing.displayName = displayName;
      if (avatar) existing.avatar = avatar;
      return existing;
    }

    const now = Date.now();
    const profile: PlayerProfile = {
      playerId,
      displayName,
      avatar,
      joinedAt: now,
      lastSeenAt: now,
      level: 1,
      experiencePoints: 0,
    };

    this.profiles.set(playerId, profile);
    this.stats.set(playerId, INITIAL_PLAYER_STATS(playerId));
    this.unlockedAchievements.set(playerId, {});
    return profile;
  }

  /**
   * Updates an existing profile.
   */
  public updateProfile(
    playerId: string,
    updates: { displayName?: string; avatar?: string }
  ): PlayerProfile {
    const profile = this.getOrCreateProfile(playerId);
    if (updates.displayName) profile.displayName = updates.displayName.trim().slice(0, 24);
    if (updates.avatar) profile.avatar = updates.avatar;
    profile.lastSeenAt = Date.now();
    return profile;
  }

  /**
   * Records match outcome for all participants in a finished match.
   */
  public recordMatchFinished(params: {
    roomCode: string;
    game: MatchHistoryItem["game"];
    startedAt: number;
    finishedAt: number;
    durationMs: number;
    winnerId?: string;
    participants: Array<{ playerId: string; name: string; avatar?: string; isWinner: boolean; isBot?: boolean }>;
  }): void {
    const replayAvailable = true;

    for (const p of params.participants) {
      if (p.isBot) continue; // Skip bot persistence

      const result = params.winnerId
        ? p.playerId === params.winnerId
          ? "WIN"
          : "LOSS"
        : "DRAW";

      const matchItem: MatchHistoryItem = {
        matchId: `m_${params.roomCode}_${Date.now()}_${p.playerId.slice(-4)}`,
        roomCode: params.roomCode,
        game: params.game,
        startedAt: params.startedAt,
        finishedAt: params.finishedAt,
        durationMs: params.durationMs,
        result,
        participants: params.participants,
        replayAvailable,
      };

      // 1. Record in match history
      matchHistoryService.recordMatch(p.playerId, matchItem);

      // 2. Project stats
      const currentStats = this.stats.get(p.playerId) || INITIAL_PLAYER_STATS(p.playerId);
      const updatedStats = StatsProjection.projectMatch(currentStats, p.playerId, matchItem);
      this.stats.set(p.playerId, updatedStats);

      // 3. Award XP & Level Up
      const profile = this.getOrCreateProfile(p.playerId, p.name, p.avatar);
      const xpEarned = result === "WIN" ? 50 : result === "DRAW" ? 25 : 15;
      profile.experiencePoints += xpEarned;
      profile.level = calculateLevel(profile.experiencePoints);

      // 4. Update achievements
      const unlMap = this.unlockedAchievements.get(p.playerId) || {};
      const achievements = AchievementsEngine.evaluateAchievements(updatedStats, unlMap);
      for (const ach of achievements) {
        if (ach.unlocked && !unlMap[ach.id]) {
          unlMap[ach.id] = Date.now();
        }
      }
      this.unlockedAchievements.set(p.playerId, unlMap);
    }
  }

  /**
   * Retrieves player stats.
   */
  public getStats(playerId: string): PlayerStats {
    return this.stats.get(playerId) || INITIAL_PLAYER_STATS(playerId);
  }

  /**
   * Retrieves player achievements.
   */
  public getAchievements(playerId: string): Achievement[] {
    const stats = this.stats.get(playerId);
    const unlMap = this.unlockedAchievements.get(playerId) || {};
    return AchievementsEngine.evaluateAchievements(stats, unlMap);
  }

  /**
   * Increments recovery count for player.
   */
  public recordRecovery(playerId: string): void {
    const stats = this.stats.get(playerId);
    if (stats) {
      stats.recoveryCount += 1;
      const unlMap = this.unlockedAchievements.get(playerId) || {};
      if (stats.recoveryCount >= 1 && !unlMap["recovery_master"]) {
        unlMap["recovery_master"] = Date.now();
        this.unlockedAchievements.set(playerId, unlMap);
      }
    }
  }

  /**
   * Returns all registered player profiles.
   */
  public getAllProfiles(): PlayerProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Awards XP to a player and updates their level.
   */
  public awardXP(playerId: string, amount: number): PlayerProfile {
    const profile = this.getOrCreateProfile(playerId);
    profile.experiencePoints += amount;
    profile.level = calculateLevel(profile.experiencePoints);
    return profile;
  }

  public reset(): void {
    this.profiles.clear();
    this.stats.clear();
    this.unlockedAchievements.clear();
    matchHistoryService.reset();
  }
}

export const profileService = new ProfileService();
