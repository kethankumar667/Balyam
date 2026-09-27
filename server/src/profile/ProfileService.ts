import type { PlayerProfile } from "@shared/profile/PlayerProfile.js";
import { calculateLevel } from "@shared/profile/PlayerProfile.js";
import type { PlayerStats } from "@shared/profile/PlayerStats.js";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats.js";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";
import type { Achievement } from "@shared/profile/Achievements.js";

import { StatsProjection } from "./StatsProjection.js";
import { AchievementsEngine } from "./AchievementsEngine.js";
import { matchHistoryService } from "./MatchHistoryService.js";
import { scorecardService } from "./ScorecardService.js";
import { resolveModeId } from "@shared/profile/GameModes.js";
import { progressionSync } from "../persistence/ProgressionSync.js";
import {
  calculateMiniclipXPProgression,
  LEVEL_MILESTONES,
} from "@shared/progression/MiniclipProgression.js";
import type {
  MiniclipXPProgression,
  LevelReward,
} from "@shared/progression/MiniclipProgression.js";
import type { EconomyService } from "../economy/EconomyService.js";
import type { PlayerIdentityKind } from "../persistence/EconomyRepository.js";
import { logger } from "../lib/logger.js";

export class ProfileService {
  private profiles: Map<string, PlayerProfile> = new Map();
  private stats: Map<string, PlayerStats> = new Map();
  private unlockedAchievements: Map<string, Record<string, number>> = new Map();
  private claimedMilestones: Map<string, Set<number>> = new Map();
  private economyService?: EconomyService | null;

  public setEconomyService(service: EconomyService | null | undefined): void {
    this.economyService = service;
  }

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
   * Deletes a player profile, career statistics, and achievement progress.
   */
  public deleteProfile(playerId: string): boolean {
    const hadProfile = this.profiles.delete(playerId);
    this.stats.delete(playerId);
    this.unlockedAchievements.delete(playerId);
    this.claimedMilestones.delete(playerId);
    return hadProfile;
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
    modeId?: string;
    participants: Array<{
      playerId: string;
      name: string;
      avatar?: string;
      isWinner: boolean;
      isBot?: boolean;
      score?: number;
      secondaryMetrics?: Record<string, number | string>;
    }>;
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

      // 2. Award XP & Level Up — MUST run before stats projection below.
      // getOrCreateProfile's "brand new player" branch seeds this.stats to
      // INITIAL_PLAYER_STATS as a side effect; ordering it after the stats
      // projection meant a player's first-ever recorded match was projected
      // correctly and then immediately overwritten back to all-zero the
      // instant this line ran for a player it had never seen before (every
      // OTHER match kept its stats, since the "existing profile" branch
      // never touches this.stats — only the very first one was silently
      // dropped).
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

      // 3. Project stats — after getOrCreateProfile, so this write is the
      // last thing to touch this.stats for this player this call.
      const currentStats = this.stats.get(p.playerId) || INITIAL_PLAYER_STATS(p.playerId);
      const updatedStats = StatsProjection.projectMatch(currentStats, p.playerId, matchItem);
      this.stats.set(p.playerId, updatedStats);

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

      // 5. Update personal best scorecard for this game and mode
      if (typeof p.score === "number") {
        const resolvedMode = params.modeId || resolveModeId(params.game);
        const isSoloOrBot = params.participants.filter((x) => !x.isBot).length <= 1;
        const context = isSoloOrBot ? "VS_BOTS" : "PVP_MULTIPLAYER";
        scorecardService.recordScore(p.playerId, {
          game: params.game,
          modeId: resolvedMode,
          score: p.score,
          context,
          matchId: matchItem.matchId,
          secondaryMetrics: p.secondaryMetrics,
        });
      }
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
    matches: Array<{ playerId: string; match: MatchHistoryItem }> = [],
    claimedMilestones: Array<{ playerId: string; level: number }> = [],
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

    const restoredStats = new Map<string, PlayerStats>();
    const seenMatches = new Map<string, Set<string>>();
    for (const { playerId, match } of [...matches].sort((a, b) =>
      a.match.finishedAt - b.match.finishedAt || a.match.matchId.localeCompare(b.match.matchId),
    )) {
      const seen = seenMatches.get(playerId) ?? new Set<string>();
      if (seen.has(match.matchId)) continue;
      seen.add(match.matchId);
      seenMatches.set(playerId, seen);
      restoredStats.set(playerId, StatsProjection.projectMatch(restoredStats.get(playerId), playerId, match));
    }
    for (const p of profiles) {
      this.stats.set(p.playerId, restoredStats.get(p.playerId) ?? INITIAL_PLAYER_STATS(p.playerId));
    }

    for (const a of achievements) {
      const existing = this.unlockedAchievements.get(a.playerId) ?? {};
      existing[a.achievementId] = a.unlockedAt;
      this.unlockedAchievements.set(a.playerId, existing);
    }

    if (claimedMilestones) {
      for (const cm of claimedMilestones) {
        let set = this.claimedMilestones.get(cm.playerId);
        if (!set) {
          set = new Set<number>();
          this.claimedMilestones.set(cm.playerId, set);
        }
        set.add(cm.level);
      }
    }
  }

  /**
   * Pre-loads claimed milestones from the durable coin ledger.
   * Scans ADMIN_ADJUSTMENT ledger entries for milestone claim idempotency keys
   * ('milestone:<playerId>:lvl:<level>') and repopulates the in-memory Set.
   */
  public async hydrateMilestonesFromEconomy(service?: EconomyService | null): Promise<number> {
    const eco = service ?? this.economyService;
    if (!eco) return 0;

    try {
      const entries = await eco.listLedgerEntriesByType("ADMIN_ADJUSTMENT");
      let count = 0;
      for (const entry of entries) {
        if (!entry.idempotencyKey || !entry.idempotencyKey.startsWith("milestone:")) continue;
        const match = entry.idempotencyKey.match(/^milestone:(.+):lvl:(\d+)$/);
        if (match) {
          const playerId = match[1];
          const level = parseInt(match[2]!, 10);
          if (playerId && !isNaN(level)) {
            let set = this.claimedMilestones.get(playerId);
            if (!set) {
              set = new Set<number>();
              this.claimedMilestones.set(playerId, set);
            }
            set.add(level);
            count++;
          }
        }
      }
      return count;
    } catch (err) {
      logger.error({
        message: `Failed to hydrate milestone claims from economy ledger: ${String(err)}`,
        module: "PROGRESSION",
      });
      return 0;
    }
  }

  /**
   * Retrieves full Miniclip XP progression and milestone roadmap status for a player.
   */
  public getProgression(playerId: string): MiniclipXPProgression {
    const profile = this.getOrCreateProfile(playerId);
    const prog = calculateMiniclipXPProgression(profile.experiencePoints);
    const claimed = this.claimedMilestones.get(playerId) || new Set<number>();

    // Unclaimed milestone rewards available to claim
    const unclaimed = LEVEL_MILESTONES.filter(
      (m) => m.level <= prog.currentLevel && !claimed.has(m.level)
    );

    return {
      ...prog,
      unclaimedRewards: unclaimed,
    };
  }

  /**
   * Claims a milestone level reward if reached and not already claimed.
   * If EconomyService is present and coins > 0, credits the reward coins directly to the player's wallet.
   */
  public async claimMilestoneReward(
    playerId: string,
    level: number,
    identityKind: PlayerIdentityKind = "guest"
  ): Promise<{ success: boolean; reward?: LevelReward; error?: string }> {
    const profile = this.getOrCreateProfile(playerId);
    if (level > profile.level) {
      return { success: false, error: "Level milestone not yet reached" };
    }
    const milestone = LEVEL_MILESTONES.find((m) => m.level === level);
    if (!milestone) {
      return { success: false, error: "Milestone reward not found for level" };
    }

    let claimed = this.claimedMilestones.get(playerId);
    if (!claimed) {
      claimed = new Set<number>();
      this.claimedMilestones.set(playerId, claimed);
    }

    if (claimed.has(level)) {
      return { success: false, error: "Reward already claimed" };
    }

    // Optimistically mark as claimed BEFORE async economy adjustment
    // to prevent concurrent race conditions from submitting multiple wallet adjustments.
    claimed.add(level);

    // Award coins through EconomyService if configured
    if (this.economyService && milestone.reward.coins > 0) {
      const idempotencyKey = `milestone:${playerId}:lvl:${level}`;
      try {
        await this.economyService.ensureIdentityRegistered(playerId, identityKind);
        const adjustment = await this.economyService.adminAdjustWallet({
          identityId: playerId,
          amountCoins: String(milestone.reward.coins),
          adminPrincipalId: "system:level_milestone",
          reason: `Level ${level} milestone reward: ${milestone.reward.title}`,
          idempotencyKey,
          entryType: "ADMIN_ADJUSTMENT",
        });

        if (!adjustment.applied) {
          // If the economy layer already had this idempotencyKey (e.g. across server restarts or replay),
          // it was already claimed. Keep it in claimed Set so in-memory state is up to date,
          // but return refusal.
          return { success: false, error: "Reward already claimed" };
        }
      } catch (err) {
        // Rollback optimistic claim on network/database failure so the player can retry later
        claimed.delete(level);
        logger.error({
          message: `Failed to credit wallet coins for level ${level} milestone claim by ${playerId}: ${String(err)}`,
          module: "PROGRESSION",
        });
        return { success: false, error: "Failed to credit milestone coins to wallet" };
      }
    }

    return {
      success: true,
      reward: milestone.reward,
    };
  }

  public reset(): void {
    this.profiles.clear();
    this.stats.clear();
    this.unlockedAchievements.clear();
    this.claimedMilestones.clear();
    matchHistoryService.reset();
  }
}

export const profileService = new ProfileService();
