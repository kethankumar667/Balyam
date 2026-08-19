import type { PlayerProfile } from "@shared/profile/PlayerProfile.js";
import { calculateLevel } from "@shared/profile/PlayerProfile.js";
import type { PlayerStats } from "@shared/profile/PlayerStats.js";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats.js";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";
import type { Achievement } from "@shared/profile/Achievements.js";

import { StatsProjection } from "./StatsProjection.js";
import { AchievementsEngine } from "./AchievementsEngine.js";
import { matchHistoryService } from "./MatchHistoryService.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

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
    progressionSync.profileSaved(profile);
    return profile;
  }

  /**
   * Reads a profile WITHOUT creating one.
   *
   * Added because `GET /api/profile/:playerId` used `getOrCreateProfile`, so a
   * read for an unknown id created it. That made an anonymous GET a write: a
   * loop over invented ids filled the profile table, and nothing about the
   * caller was ever checked. A read that creates is not a read.
   */
  public getProfile(playerId: string): PlayerProfile | undefined {
    return this.profiles.get(playerId);
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
    progressionSync.profileSaved(profile);
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
        // Derived from the match, not from the clock. `Date.now()` here meant
        // a replayed completion produced a NEW id, so a host failover wrote a
        // second copy of the same match into somebody's history and inflated
        // the stats projected from it.
        matchId: `m_${params.roomCode}_${params.startedAt}_${p.playerId.slice(-4)}`,
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
      progressionSync.profileSaved(profile);
      // The ledger row carries the match id as its source, so replaying the
      // completion cannot award the XP twice.
      progressionSync.xpAwarded(
        p.playerId, xpEarned, "match", matchItem.matchId, `${result} at ${params.game}`,
      );

      // 4. Update achievements
      const unlMap = this.unlockedAchievements.get(p.playerId) || {};
      const achievements = AchievementsEngine.evaluateAchievements(updatedStats, unlMap);
      for (const ach of achievements) {
        if (ach.unlocked && !unlMap[ach.id]) {
          unlMap[ach.id] = Date.now();
          progressionSync.achievementUnlocked(p.playerId, ach.id);
        }
      }
      this.unlockedAchievements.set(p.playerId, unlMap);
    }

    // One summary row for the match, after the per-player loop. Keyed on
    // (roomCode, startedAt) in the store, so a second report of the same match
    // is refused by a unique index rather than by this code remembering.
    progressionSync.matchFinished(params);
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
  /**
   * Add XP and re-derive the level.
   *
   * The durable side is only the resulting TOTAL. The ledger entry that
   * explains it is written by whoever knows the cause — a match, a challenge, a
   * season tier — because only they can name a source id, and a ledger row
   * without one cannot be deduplicated. See `ProgressionSync.xpAwarded`.
   */
  public awardXP(playerId: string, amount: number): PlayerProfile {
    const profile = this.getOrCreateProfile(playerId);
    profile.experiencePoints += amount;
    profile.level = calculateLevel(profile.experiencePoints);
    progressionSync.profileSaved(profile);
    return profile;
  }

  /**
   * Restore profiles and achievement unlocks from the durable store.
   *
   * Called once at boot, BEFORE the server accepts traffic. Nothing else in
   * this class knows the store exists: the service stays a synchronous
   * in-memory thing, and this is the single seam where memory is refilled.
   *
   * Career stats are deliberately NOT restored here. They are a projection of
   * match history (`StatsProjection`), and re-deriving them from the restored
   * matches keeps one source of truth instead of two that can disagree after
   * a rule change.
   */
  public hydrate(
    profiles: Array<{
      playerId: string;
      displayName: string;
      avatar?: string | null;
      level: number;
      experiencePoints: number;
      joinedAt: number;
      lastSeenAt: number;
    }>,
    achievements: Array<{ playerId: string; achievementId: string; unlockedAt: number }>,
  ): void {
    for (const p of profiles) {
      this.profiles.set(p.playerId, {
        playerId: p.playerId,
        displayName: p.displayName,
        avatar: p.avatar ?? undefined,
        joinedAt: p.joinedAt,
        lastSeenAt: p.lastSeenAt,
        level: p.level,
        experiencePoints: p.experiencePoints,
      });
      if (!this.stats.has(p.playerId)) this.stats.set(p.playerId, INITIAL_PLAYER_STATS(p.playerId));
      if (!this.unlockedAchievements.has(p.playerId)) this.unlockedAchievements.set(p.playerId, {});
    }

    for (const a of achievements) {
      const existing = this.unlockedAchievements.get(a.playerId) ?? {};
      existing[a.achievementId] = a.unlockedAt;
      this.unlockedAchievements.set(a.playerId, existing);
    }
  }

  public reset(): void {
    this.profiles.clear();
    this.stats.clear();
    this.unlockedAchievements.clear();
    matchHistoryService.reset();
  }
}

export const profileService = new ProfileService();
