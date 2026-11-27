import { logger } from "../lib/logger.js";
import { progressionRepository } from "./index.js";
import type { RecordScorePayload } from "@shared/profile/Scorecard.js";
import {
  matchIdFor,
  rewardKeyFor,
  type ProgressionRepository,
  type RewardKind,
} from "./ProgressionRepository.js";

/**
 * Getting what the services already know into the store, without changing how
 * they work.
 *
 * ── The constraint that shaped this ───────────────────────────────────
 * Every progression service is SYNCHRONOUS, and several are called from the
 * realtime path — `RoomManager` records a finished match inside the same tick
 * that broadcasts the end of the game. Making those methods `async` would
 * ripple into the socket handlers and the engines, and "do not alter realtime
 * room behaviour" is a hard constraint of this remediation, not a preference.
 *
 * So the services keep their in-memory state and their synchronous signatures,
 * and every durable fact is ALSO handed to this module, which writes it behind
 * the caller. Reads still come from memory; the store is what memory is
 * restored from at boot (`hydrateProgression`). Personal scorecards instead
 * read their durable archive on demand, so other processes' results are visible.
 *
 * ── What write-behind does and does not buy ───────────────────────────
 * Once flushed, it buys durability across the thing that was destroying data: a
 * redeploy, a crash, an idle spin-down. Those are seconds-to-minutes apart from
 * the write, and the queue below is drained on `SIGTERM`.
 *
 * It does NOT make the database the arbiter of a single request. Within one
 * process the in-memory claim set still decides whether a reward is a
 * duplicate; the unique indexes decide it ACROSS processes and after a
 * restart. The honest failure window is therefore: a hard crash between
 * acknowledging a claim and flushing it loses the claim record, and the player
 * can claim again after the restart. That direction — a player occasionally
 * getting a second chance at their own reward — is the safe one, and it is
 * written down here rather than discovered later. A finished-room scorecard
 * can likewise be lost in that pre-flush crash window. Solo HTTP score writes
 * wait for the database commit before success is returned.
 *
 * ── Failures are loud, never silent ───────────────────────────────────
 * A rejected write increments a counter that `/health` and the operational API
 * report. A store that has started refusing writes must be visible without
 * anybody reading logs, because the symptom otherwise is "everything is fine
 * until the next deploy".
 */

interface SyncStatus {
  pending: number;
  written: number;
  failed: number;
  lastError: string | null;
  lastErrorAt: number | null;
}

class ProgressionSync {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;
  private written = 0;
  private failed = 0;
  private lastError: string | null = null;
  private lastErrorAt: number | null = null;
  private pendingScorecards = new Map<string, Map<string, { payload: RecordScorePayload; recordedAt: number }>>();

  scorecardRecorded(playerId: string, payload: RecordScorePayload, recordedAt: number): void {
    const saved = structuredClone(payload);
    const key = JSON.stringify([saved.game, saved.modeId, saved.matchId]);
    const pending = this.pendingScorecards.get(playerId) ?? new Map();
    pending.set(key, { payload: saved, recordedAt });
    this.pendingScorecards.set(playerId, pending);
    this.enqueue("recordScorecard", async () => {
      const { persistScorecard } = await import("../profile/scorecardPersistence.js");
      await persistScorecard(playerId, saved, recordedAt);
      pending.delete(key);
      if (pending.size === 0) this.pendingScorecards.delete(playerId);
    });
  }

  /** A failed write must not become a successful empty read. Retry it, or fail the read explicitly. */
  async retryPendingScorecards(playerId: string): Promise<void> {
    const pending = this.pendingScorecards.get(playerId);
    if (!pending) return;
    const { persistScorecard } = await import("../profile/scorecardPersistence.js");
    for (const [key, entry] of [...pending.entries()]) {
      await persistScorecard(playerId, entry.payload, entry.recordedAt);
      pending.delete(key);
    }
    if (pending.size === 0) this.pendingScorecards.delete(playerId);
  }

  private enqueue(label: string, work: (repo: ProgressionRepository) => Promise<unknown>): void {
    this.pending += 1;
    this.tail = this.tail
      .then(() => work(progressionRepository()))
      .then(() => {
        this.written += 1;
      })
      .catch((err) => {
        this.failed += 1;
        this.lastError = `${label}: ${err instanceof Error ? err.message : String(err)}`;
        this.lastErrorAt = Date.now();
        logger.error({
          message: `Progression write failed (${this.lastError}). This player's progress is in memory only.`,
          module: "PERSISTENCE",
        });
      })
      .finally(() => {
        this.pending -= 1;
      });
  }

  /**
   * Wait for every queued write.
   *
   * Called on graceful shutdown and by tests. Without it, `SIGTERM` during a
   * deploy would drop exactly the writes the deploy was about to make matter.
   */
  async drain(): Promise<void> {
    // The tail moves while we await it, so keep awaiting until it stops.
    let previous: Promise<void>;
    do {
      previous = this.tail;
      await previous.catch(() => undefined);
    } while (previous !== this.tail);
  }

  status(): SyncStatus {
    return {
      pending: this.pending,
      written: this.written,
      failed: this.failed,
      lastError: this.lastError,
      lastErrorAt: this.lastErrorAt,
    };
  }

  /* ────────────────────── identities & profiles ────────────────────── */

  identitySeen(playerId: string, kind: "member" | "guest", authUserId: string | null): void {
    this.enqueue("upsertIdentity", (r) =>
      r.upsertIdentity({ playerId, kind, authUserId, lastSeenAt: Date.now() }),
    );
  }

  profileSaved(profile: {
    playerId: string;
    displayName: string;
    avatar?: string;
    level: number;
    experiencePoints: number;
    joinedAt: number;
    lastSeenAt: number;
  }): void {
    // A profile row needs an identity row to point at. The identity upsert is
    // queued first and the queue is serial, so the foreign key is satisfied by
    // construction rather than by hoping the writes race the right way.
    this.identitySeen(
      profile.playerId,
      profile.playerId.startsWith("guest_") ? "guest" : "member",
      profile.playerId.startsWith("guest_") ? null : profile.playerId,
    );
    this.enqueue("upsertProfile", (r) =>
      r.upsertProfile({
        playerId: profile.playerId,
        displayName: profile.displayName,
        avatar: profile.avatar ?? null,
        level: profile.level,
        experiencePoints: profile.experiencePoints,
        joinedAt: profile.joinedAt,
        lastSeenAt: profile.lastSeenAt,
      }),
    );
  }

  /* ────────────────────── xp & achievements ────────────────────── */

  /**
   * Runs `work` after every write queued so far. A row that REFERENCES a profile
   * (a risk event, a reward) must not reach the database before the profile write
   * that creates its identity, or the foreign key refuses it; queueing behind the
   * profile writes makes that order a guarantee instead of a race.
   */
  afterPending<T>(work: () => Promise<T>): Promise<T> {
    const run = this.tail.then(work);
    // The shared tail must never carry a rejection into the next write.
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  xpAwarded(
    playerId: string,
    amount: number,
    sourceKind: "match" | "practice_match" | "challenge" | "season_tier" | "achievement" | "manual",
    sourceId: string,
    reason: string,
  ): void {
    this.enqueue("appendXp", (r) =>
      r.appendXp({ playerId, amount, reason, sourceKind, sourceId, createdAt: Date.now() }),
    );
  }

  achievementUnlocked(playerId: string, achievementId: string): void {
    this.enqueue("unlockAchievement", (r) =>
      r.unlockAchievement({ playerId, achievementId, unlockedAt: Date.now() }),
    );
  }

  /* ────────────────────── rewards ────────────────────── */

  /**
   * The period a challenge id belongs to.
   *
   * Ids look like `daily_2026-8-18_win_streak_0` or `weekly_2026-33_…`, so the
   * second segment IS the period. Splitting it out means `challenge_claims`
   * can hold "claimed the daily win yesterday AND today" as two rows rather
   * than one row that has to be deleted and rewritten every midnight.
   */
  private static periodKeyOf(challengeId: string): string {
    const parts = challengeId.split("_");
    return parts.length >= 2 ? parts[1]! : "static";
  }

  challengeClaimed(playerId: string, challengeId: string, xpAwarded: number): void {
    const periodKey = ProgressionSync.periodKeyOf(challengeId);
    const key = rewardKeyFor(playerId, "challenge", `${challengeId}`);
    this.enqueue("claimChallenge", async (r) => {
      const { applied } = await r.claimChallenge({
        playerId,
        challengeId,
        periodKey,
        xpAwarded,
        claimedAt: Date.now(),
      });
      await this.auditReward(r, playerId, "challenge", challengeId, xpAwarded, key, applied);
    });
    this.xpAwarded(playerId, xpAwarded, "challenge", challengeId, `challenge ${challengeId}`);
  }

  seasonTierClaimed(seasonId: string, playerId: string, tierId: string, xpAwarded: number): void {
    const key = rewardKeyFor(playerId, "season_tier", `${seasonId}:${tierId}`);
    this.enqueue("claimSeasonTier", async (r) => {
      const { applied } = await r.claimSeasonTier({
        seasonId,
        playerId,
        tierId,
        xpAwarded,
        claimedAt: Date.now(),
      });
      await this.auditReward(r, playerId, "season_tier", `${seasonId}:${tierId}`, xpAwarded, key, applied);
    });
    this.xpAwarded(playerId, xpAwarded, "season_tier", `${seasonId}:${tierId}`, `season tier ${tierId}`);
  }

  private async auditReward(
    repo: ProgressionRepository,
    playerId: string,
    rewardKind: RewardKind,
    rewardRef: string,
    xpDelta: number,
    idempotencyKey: string,
    applied: boolean,
  ): Promise<void> {
    await repo.recordRewardDecision({
      playerId,
      rewardKind,
      rewardRef,
      xpDelta: applied ? xpDelta : 0,
      idempotencyKey,
      outcome: applied ? "granted" : "duplicate",
      detail: applied ? null : "refused by the store's uniqueness constraint",
      createdAt: Date.now(),
    });
  }

  /* ────────────────────── seasons ────────────────────── */

  seasonStatsChanged(stats: {
    seasonId: string;
    playerId: string;
    seasonXP: number;
    seasonLevel: number;
    seasonWins: number;
    seasonMatches: number;
    tournamentWins: number;
  }): void {
    this.enqueue("upsertSeasonStats", (r) => r.upsertSeasonStats(stats));
  }

  seasonSnapshotTaken(seasonId: string, reason: string, standings: unknown): void {
    this.enqueue("saveSeasonSnapshot", (r) =>
      r.saveSeasonSnapshot({ seasonId, capturedAt: Date.now(), reason, standings }),
    );
  }

  /* ────────────────────── matches ────────────────────── */

  matchFinished(match: {
    roomCode: string;
    game: string;
    startedAt: number;
    finishedAt: number;
    durationMs: number;
    winnerId?: string;
    participants: Array<{
      playerId: string;
      name: string;
      avatar?: string;
      isWinner: boolean;
      isBot?: boolean;
      isLocal?: boolean;
      identityId?: string | null;
    }>;
  }): void {
    // Bots have no identity row and no progression. Filtering here rather than
    // letting a foreign key reject the whole match write.
    const humans = match.participants.filter((p) => !p.isBot && !p.isLocal && p.identityId !== null);
    if (humans.length === 0) return;

    for (const p of humans) {
      this.identitySeen(
        p.playerId,
        p.playerId.startsWith("guest_") ? "guest" : "member",
        p.playerId.startsWith("guest_") ? null : p.playerId,
      );
    }

    this.enqueue("recordMatch", (r) =>
      r.recordMatch({
        id: matchIdFor(match.roomCode, match.startedAt),
        roomCode: match.roomCode,
        game: match.game,
        startedAt: match.startedAt,
        finishedAt: match.finishedAt,
        durationMs: match.durationMs,
        winnerId: humans.some((p) => p.playerId === match.winnerId) ? match.winnerId : null,
        winnerKind: !match.winnerId ? "draw" : match.participants.find(p => p.isWinner)?.isBot ? "bot"
          : match.participants.find(p => p.isWinner)?.isLocal ? "local"
          : humans.some(p => p.playerId === match.winnerId) ? "human" : "unverified",
        participants: humans.map((p, index) => ({
          playerId: p.playerId,
          displayName: p.name,
          avatar: p.avatar ?? null,
          isWinner: p.isWinner,
          isBot: false,
          placing: p.isWinner ? 1 : index + 1,
        })),
      }),
    );
  }

  /* ────────────────────── social ────────────────────── */

  friendAdded(edge: {
    playerId: string;
    friendPlayerId: string;
    displayName?: string;
    avatar?: string;
  }): void {
    /*
     * Both ends need an identity row before the edge can exist.
     *
     * `friends` has foreign keys to `player_identities` on BOTH columns, so
     * befriending someone the store has never seen was silently rejected by
     * the database — the friendship worked in memory for the rest of the
     * process's life and vanished at the next restart. Caught by the
     * durability run, which found zero rows where it expected one.
     *
     * The queue is serial, so queueing the identities first is what makes the
     * foreign key satisfiable rather than a race.
     */
    for (const id of [edge.playerId, edge.friendPlayerId]) {
      this.identitySeen(
        id,
        id.startsWith("guest_") ? "guest" : "member",
        id.startsWith("guest_") ? null : id,
      );
    }
    this.enqueue("addFriend", (r) =>
      r.addFriend({
        playerId: edge.playerId,
        friendPlayerId: edge.friendPlayerId,
        displayName: edge.displayName ?? null,
        avatar: edge.avatar ?? null,
        createdAt: Date.now(),
      }),
    );
  }

  friendRemoved(playerId: string, friendPlayerId: string): void {
    this.enqueue("removeFriend", (r) => r.removeFriend(playerId, friendPlayerId));
  }

}

export const progressionSync = new ProgressionSync();
