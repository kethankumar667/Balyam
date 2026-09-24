import type { SharedHistory } from "@shared/social/Friend.js";
import { isFriendshipMilestoneKind, type FriendshipMilestone } from "@shared/social/Friendship.js";
import { logger } from "../lib/logger.js";
import { progressionRepository } from "../persistence/index.js";
import type {
  FriendshipPairRecord,
  ProgressionRepository,
} from "../persistence/ProgressionRepository.js";
import {
  applyMatch,
  currentStreakDays,
  orderedPair,
  type PairState,
} from "./friendshipMath.js";

/** One seat at a finished table, as far as friendship history is concerned. */
export interface FinishedMatchParticipant {
  /** The verified account (`identityId`), not the per-room seat id. Absent for anyone unverified. */
  identityId?: string | null;
  isBot?: boolean;
  /** A Pass & Play seat: one person on a shared device, not a second player. */
  isLocal?: boolean;
}

export interface FinishedMatch {
  matchId: string;
  playedAt: number;
  participants: ReadonlyArray<FinishedMatchParticipant>;
  /**
   * Verified identities on the winning side. A game that reports a single
   * winner can never put TWO here, so pairs from such a game count the match
   * but never a win together — see `wonTogether` in the plan.
   */
  winnerIdentityIds: readonly string[];
  isTournament?: boolean;
}

export interface RecordOutcome {
  /** False when the match was a repeat, had fewer than two eligible players, or failed. */
  counted: boolean;
  pairs: number;
}

const NOT_COUNTED: RecordOutcome = { counted: false, pairs: 0 };

const toState = (r: FriendshipPairRecord): PairState => ({
  matchesTogether: r.matchesTogether,
  winsTogether: r.winsTogether,
  tournamentsTogether: r.tournamentsTogether,
  firstMatchAt: r.firstMatchAt,
  lastMatchAt: r.lastMatchAt,
  currentDailyStreak: r.currentDailyStreak,
  bestDailyStreak: r.bestDailyStreak,
  streakLastDay: r.streakLastDay,
});

const toRecord = (low: string, high: string, s: PairState): FriendshipPairRecord => ({
  playerLow: low,
  playerHigh: high,
  ...s,
});

/**
 * Who has played with whom, and the moments worth remembering in each pairing.
 *
 * ── Every pair is recorded, only friends can read it ──────────────────
 * A pair is written for any two eligible players who shared a finished match,
 * friends or not, so that history already exists the day they become friends.
 * Reading it is a different question, answered by the route: only the two
 * friends can see their own pair.
 *
 * ── Who counts ────────────────────────────────────────────────────────
 * Verified human accounts only: no bots, no Pass & Play seats (one person on a
 * shared device), and nobody without a verified identity — a friendship is
 * between accounts, and a per-room seat id names no account.
 *
 * ── A match is counted once, whatever happens ─────────────────────────
 * A room can report a finish more than once (a host failover, a retry, a
 * restart mid-write). The STORE decides: `claimFriendshipMatch` is a primary-key
 * insert, so the second claim of a match id — from this process or another, now
 * or after a restart — comes back false and nothing is counted. The direction
 * of the one remaining failure is the safe one: a crash between the claim and
 * the writes loses that match's contribution rather than doubling it.
 *
 * ── One at a time ─────────────────────────────────────────────────────
 * Updating a pair reads it, changes it, and writes it back. Two matches
 * finishing together for the same pair would race and one update would be
 * lost, so every write here goes through one queue. Matches finish far too
 * rarely for that to be a cost.
 */
export class FriendshipHistoryService {
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly repoOf: () => ProgressionRepository = progressionRepository) {}

  /** Runs `work` after everything already queued. Never rejects to the caller's chain. */
  private enqueue<T>(work: () => Promise<T>, fallback: T, what: string): Promise<T> {
    const run = this.tail.then(work);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run.catch((err: unknown) => {
      // Ids only — never a name. The history is lost for this event, not the process.
      logger.error({
        message: `Friendship history: ${what} failed: ${err instanceof Error ? err.message : String(err)}`,
        module: "SOCIAL",
      });
      return fallback;
    });
  }

  /** Counts a finished match toward every pair of eligible players at its table. Never rejects. */
  public recordMatch(match: FinishedMatch): Promise<RecordOutcome> {
    return this.enqueue(() => this.applyFinishedMatch(match), NOT_COUNTED, `recording match ${match.matchId}`);
  }

  private async applyFinishedMatch(match: FinishedMatch): Promise<RecordOutcome> {
    const players = eligiblePlayers(match.participants);
    if (players.length < 2) return NOT_COUNTED;

    const repo = this.repoOf();
    if (!(await repo.claimFriendshipMatch(match.matchId))) return NOT_COUNTED;

    await ensureIdentities(repo, players);

    const winners = new Set(match.winnerIdentityIds);
    let pairs = 0;
    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        const { low, high } = orderedPair(players[i], players[j]);
        const existing = await repo.getFriendshipPair(low, high);
        const { state, milestones } = applyMatch(existing ? toState(existing) : null, {
          matchId: match.matchId,
          playedAt: match.playedAt,
          wonTogether: winners.has(low) && winners.has(high),
          isTournament: Boolean(match.isTournament),
        });
        await repo.saveFriendshipPair(toRecord(low, high, state));
        await repo.addFriendshipMilestones(
          milestones.map((m) => ({ playerLow: low, playerHigh: high, ...m })),
        );
        pairs += 1;
      }
    }
    return { counted: true, pairs };
  }

  /** Marks the moment two players became friends. Kept once — a later re-friending does not move it. */
  public recordFriendsSince(a: string, b: string, at = Date.now()): Promise<void> {
    return this.enqueue(
      async () => {
        const repo = this.repoOf();
        const { low, high } = orderedPair(a, b);
        await ensureIdentities(repo, [low, high]);
        await repo.addFriendshipMilestones([
          { playerLow: low, playerHigh: high, kind: "FRIENDS_SINCE", reachedAt: at, matchId: null },
        ]);
      },
      undefined,
      "recording friends-since",
    );
  }

  /**
   * The shared history of two players, from `viewerId`'s point of view.
   *
   * No access check here — that is the route's job, because who may read a
   * pair is a question about friendship and blocking, which this service does
   * not know about. A pair with no history at all reads as zeros.
   */
  public async getHistory(viewerId: string, otherId: string, now = Date.now()): Promise<SharedHistory> {
    const repo = this.repoOf();
    const { low, high } = orderedPair(viewerId, otherId);
    const [pair, milestones] = await Promise.all([
      repo.getFriendshipPair(low, high),
      repo.listFriendshipMilestones(low, high),
    ]);

    const state = pair ? toState(pair) : null;
    const known: FriendshipMilestone[] = [];
    for (const m of milestones) {
      // Only kinds this build understands ever leave the server.
      if (!isFriendshipMilestoneKind(m.kind)) continue;
      known.push({ kind: m.kind, reachedAt: m.reachedAt, ...(m.matchId ? { matchId: m.matchId } : {}) });
    }

    return {
      playerId: viewerId,
      friendPlayerId: otherId,
      matchesPlayedTogether: state?.matchesTogether ?? 0,
      winsTogether: state?.winsTogether ?? 0,
      tournamentsTogether: state?.tournamentsTogether ?? 0,
      lastPlayedAt: state?.lastMatchAt ?? 0,
      ...(state?.firstMatchAt != null ? { firstPlayedAt: state.firstMatchAt } : {}),
      currentStreakDays: state ? currentStreakDays(state, now) : 0,
      bestStreakDays: state?.bestDailyStreak ?? 0,
      milestones: known,
    };
  }

  /** Resolves once everything queued so far has finished. For shutdown and tests. */
  public async drain(): Promise<void> {
    let previous: Promise<void>;
    do {
      previous = this.tail;
      await previous;
    } while (previous !== this.tail);
  }
}

/** Verified, human, non-local identities, each once. */
function eligiblePlayers(participants: ReadonlyArray<FinishedMatchParticipant>): string[] {
  const seen = new Set<string>();
  for (const p of participants) {
    if (p.isBot || p.isLocal) continue;
    if (typeof p.identityId !== "string" || p.identityId.length === 0) continue;
    seen.add(p.identityId);
  }
  return [...seen];
}

/**
 * A pair's rows point at identity rows. These players are verified (that is how
 * they got an `identityId`), so the row is real — but it may not have been
 * written yet, and this write must not race the queue that writes it.
 */
async function ensureIdentities(repo: ProgressionRepository, ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    const isGuest = id.startsWith("guest_");
    await repo.upsertIdentity({
      playerId: id,
      kind: isGuest ? "guest" : "member",
      authUserId: isGuest ? null : id,
      lastSeenAt: Date.now(),
    });
  }
}

export const friendshipHistoryService = new FriendshipHistoryService();
