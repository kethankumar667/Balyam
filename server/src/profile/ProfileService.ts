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
import { progressionRepository } from "../persistence/index.js";
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

/**
 * Most XP one player can earn per UTC day from matches with no second real
 * person in them (solo vs bots, pass-and-play). Level milestones pay wallet
 * coins, and a bot table costs nothing to repeat, so uncapped practice XP was a
 * coin faucet. About four wins a day: solo play still levels you up, a script
 * cannot turn it into a payout. Matches against other humans are uncapped.
 */
export const PRACTICE_XP_DAILY_CAP = 200;

/**
 * Full XP for at most this many matches per UTC day against the SAME set of
 * real people; further ones count as practice. Two accounts trading wins would
 * otherwise be an uncapped faucet (the human-table path has no cap of its own).
 * The usual diminishing-returns rule for repeated content, applied to opponents.
 */
export const MAX_FULL_XP_MATCHES_PER_TABLE_PER_DAY = 5;

/**
 * Coin payouts additionally need this many finished matches against real people.
 * An account made to farm a bot table never satisfies it, and the count is read
 * from the durable XP ledger so a restart cannot reset it.
 */
export const MIN_HUMAN_MATCHES_FOR_COINS = 3;

const MS_PER_DAY = 86_400_000;
/** How much of a player's ledger a payout claim reads back to count real-people matches. */
const CLAIM_LEDGER_READBACK_LIMIT = 1000;

interface TableParticipant {
  playerId: string;
  isBot?: boolean;
  isLocal?: boolean;
  /** A signed-in account. Fails closed: absent means "not verified as a member". */
  isMember?: boolean;
}

/**
 * A person who counts toward "a table of real people": not a bot, not a seat
 * played from one device, and a signed-in member. A guest costs nothing to
 * create, so counting one would let a member farm full XP against throwaways.
 */
const countsAsRealPerson = (p: TableParticipant): boolean => !p.isBot && !p.isLocal && p.isMember === true;

function countRealPlayers(participants: ReadonlyArray<TableParticipant>): number {
  return participants.filter(countsAsRealPerson).length;
}

/** The same group of real people is the same table, whatever order they were seated in. */
function tableKeyOf(participants: ReadonlyArray<TableParticipant>): string {
  return participants
    .filter(countsAsRealPerson)
    .map((p) => p.playerId)
    .sort()
    .join("|");
}

/** How many past matches' classifications are remembered (so a replay classifies the same way). */
const CLASSIFIED_MATCH_MEMORY = 2000;

export class ProfileService {
  private profiles: Map<string, PlayerProfile> = new Map();
  /** Practice XP earned so far on `day` (UTC day number). Rebuilt from the ledger at boot (`restoreFromLedger`). */
  private practiceXp: Map<string, { day: number; xp: number }> = new Map();
  /** Matches played with other real people, this process (the durable count is read at claim time). */
  private humanMatches: Map<string, number> = new Map();
  /** Matches per real-people table per day. In memory only: a restart forgives a repeat-table count, nothing more. */
  private tableRepeats: Map<string, { day: number; count: number }> = new Map();
  /** matchKey -> was it practice. Makes classification idempotent across a replayed completion. */
  private classifiedMatches: Map<string, boolean> = new Map();
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
    this.practiceXp.delete(playerId);
    this.humanMatches.delete(playerId);
    return hadProfile;
  }

  /**
   * Whether this match earns full XP (a table of real people not played too
   * often today) or counts as practice. Called once per genuinely new match:
   * it advances the repeat-table counter, so a replay must not reach it.
   */
  private isPracticeMatch(participants: ReadonlyArray<TableParticipant>, at: number, matchKey: string): boolean {
    // A completion replayed after a partial failure must classify exactly as it
    // did the first time, and must not advance the repeat counter again.
    const known = this.classifiedMatches.get(matchKey);
    if (known !== undefined) return known;

    let practice = true;
    if (countRealPlayers(participants) >= 2) {
      const key = tableKeyOf(participants);
      const day = Math.floor(at / MS_PER_DAY);
      const seen = this.tableRepeats.get(key);
      const count = seen && seen.day === day ? seen.count : 0;
      this.tableRepeats.set(key, { day, count: count + 1 });
      practice = count >= MAX_FULL_XP_MATCHES_PER_TABLE_PER_DAY;
    }

    this.classifiedMatches.set(matchKey, practice);
    if (this.classifiedMatches.size > CLASSIFIED_MATCH_MEMORY) {
      // Maps iterate in insertion order: drop the oldest.
      const oldest = this.classifiedMatches.keys().next().value;
      if (oldest !== undefined) this.classifiedMatches.delete(oldest);
    }
    return practice;
  }

  /**
   * Rebuilds what a restart would otherwise forget, from the durable XP ledger:
   * today's practice XP (so the daily cap survives a deploy) and how many matches
   * the player has finished with other real people. Called at boot, per player.
   */
  public restoreFromLedger(
    playerId: string,
    entries: ReadonlyArray<{ sourceKind: string; amount: number; createdAt: number }>,
    now: number = Date.now(),
  ): void {
    const today = Math.floor(now / MS_PER_DAY);
    let practiceToday = 0;
    let human = 0;
    for (const e of entries) {
      if (e.sourceKind === "match") human += 1;
      if (e.sourceKind === "practice_match" && Math.floor(e.createdAt / MS_PER_DAY) === today) practiceToday += e.amount;
    }
    if (practiceToday > 0) this.practiceXp.set(playerId, { day: today, xp: practiceToday });
    if (human > (this.humanMatches.get(playerId) ?? 0)) this.humanMatches.set(playerId, human);
  }

  /**
   * Has this player finished enough matches against real people to be paid coins?
   * The in-process count answers the common case; otherwise the durable ledger
   * decides. If the ledger cannot be read the answer is no — a payout waits, it
   * is never guessed.
   */
  private async hasPlayedRealPeople(playerId: string): Promise<boolean> {
    if ((this.humanMatches.get(playerId) ?? 0) >= MIN_HUMAN_MATCHES_FOR_COINS) return true;
    try {
      // Read deep: long stretches of practice (up to ~13 rows a day) must not push
      // a legitimate player's older real-people matches out of the window.
      const entries = await progressionRepository().listXp(playerId, CLAIM_LEDGER_READBACK_LIMIT);
      const found = entries.filter((e) => e.sourceKind === "match").length;
      if (found >= MIN_HUMAN_MATCHES_FOR_COINS) this.humanMatches.set(playerId, found);
      return found >= MIN_HUMAN_MATCHES_FOR_COINS;
    } catch (err) {
      logger.error({
        message: `Could not read the XP ledger to check human play for ${playerId}: ${String(err)}`,
        module: "PROGRESSION",
      });
      return false;
    }
  }

  /** Grants up to `wanted` XP from what is left of today's practice allowance; returns what was granted. */
  private takePracticeXp(playerId: string, wanted: number, at: number): number {
    const day = Math.floor(at / MS_PER_DAY);
    const entry = this.practiceXp.get(playerId);
    const used = entry && entry.day === day ? entry.xp : 0;
    const granted = Math.max(0, Math.min(wanted, PRACTICE_XP_DAILY_CAP - used));
    this.practiceXp.set(playerId, { day, xp: used + granted });
    return granted;
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
      /** A seat played from the host's own device (pass-and-play), not a separate person. */
      isLocal?: boolean;
      /** A signed-in account. Only members count as real people for XP and coin eligibility; absent = not a member. */
      isMember?: boolean;
      score?: number;
      secondaryMetrics?: Record<string, number | string>;
    }>;
  }): void {
    const replayAvailable = true;
    // Decided once, at the first participant that is genuinely new (not a replay).
    let isPracticeTable: boolean | null = null;

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

      // 1. Record in match history. A replayed completion (host failover, retried
      // ack) is recognised here and must not be counted again: XP, stats and
      // achievements are all in-memory accumulators with no dedupe of their own,
      // so a replay used to double the XP and inflate the level that gates
      // milestone coin claims.
      if (!matchHistoryService.recordMatch(p.playerId, matchItem)) continue;
      if (isPracticeTable === null) {
        isPracticeTable = this.isPracticeMatch(
          params.participants,
          params.finishedAt,
          `${params.roomCode}_${params.startedAt}`,
        );
      }
      const practice = isPracticeTable;

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
      const baseXp = result === "WIN" ? 50 : result === "DRAW" ? 25 : 15;
      const xpEarned = practice ? this.takePracticeXp(p.playerId, baseXp, params.finishedAt) : baseXp;
      if (xpEarned > 0) {
        profile.experiencePoints += xpEarned;
        profile.level = calculateLevel(profile.experiencePoints);
        progressionSync.profileSaved(profile);
        // The ledger row carries the match id as its source, so replaying the
        // completion cannot award the XP twice. Practice XP is its own kind so the
        // daily cap can be rebuilt from the ledger after a restart.
        progressionSync.xpAwarded(
          p.playerId, xpEarned, practice ? "practice_match" : "match", matchItem.matchId, `${result} at ${params.game}`,
        );
      }
      if (!practice) this.humanMatches.set(p.playerId, (this.humanMatches.get(p.playerId) ?? 0) + 1);

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
    // Read-only, like `getProfile`: this backs a PUBLIC route, and an id nobody has
    // played under is simply level 1 with no XP — not a row to create.
    const prog = calculateMiniclipXPProgression(this.getProfile(playerId)?.experiencePoints ?? 0);
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
    // Coins need an account: a guest costs nothing to create, so paying them
    // wallet coins would let one person farm the same payout with many identities.
    if (milestone.reward.coins > 0 && identityKind !== "member") {
      return { success: false, error: "Sign in to claim coin rewards" };
    }
    // With no economy there is no wallet to pay into. Saying "claimed" would be a
    // lie the player only discovers when the coins never arrive, so refuse.
    if (milestone.reward.coins > 0 && !this.economyService) {
      return { success: false, error: "Coin rewards are temporarily unavailable. Try again later." };
    }
    // Coins are for people who play with people: a member account that has only
    // ever played bot tables (the farmable path) has not earned a payout yet.
    if (milestone.reward.coins > 0 && !(await this.hasPlayedRealPeople(playerId))) {
      return {
        success: false,
        error: `Finish ${MIN_HUMAN_MATCHES_FOR_COINS} matches against real people to unlock coin rewards.`,
      };
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
    this.practiceXp.clear();
    this.humanMatches.clear();
    this.tableRepeats.clear();
    this.classifiedMatches.clear();
    matchHistoryService.reset();
  }
}

export const profileService = new ProfileService();
