import type { PostgrestClient } from "../persistence/postgrest.js";
import { InMemoryProgressionRepository } from "../persistence/InMemoryProgressionRepository.js";
import type { ProgressionRepository } from "../persistence/ProgressionRepository.js";
import { FriendshipHistoryService } from "./FriendshipHistoryService.js";

/**
 * Builds friendship history from matches that were stored BEFORE it was being
 * recorded live.
 *
 * It reuses `FriendshipHistoryService` — the same claim, the same maths, the
 * same milestones as the live path — so a backfilled pair and a live one can
 * never disagree about how a streak or a milestone works. Running it twice is
 * harmless: a match already counted is refused by the store's claim.
 *
 * ── What it can and cannot recover ────────────────────────────────────
 * Stored matches name each player by the id the room used, and for a long time
 * that was a per-room SEAT id (`p_<time>_<random>`), not the verified account.
 * A seat id belongs to no account, so a pair cannot honestly be built from one.
 * Only participants whose id is a verified account id (a UUID, or `guest_` and
 * hex) are used; the rest are counted in the report as unverifiable, never
 * guessed at. Whatever the report says it skipped is history this cannot give
 * back.
 */

/*
 * Both patterns are LOWERCASE only, on purpose. These are the forms the server
 * issues and the database stores (a guest check is case-sensitive), and ids are
 * compared by byte value to order a pair — accepting an upper-case spelling
 * would let one person be two identities.
 */
/** A member's Supabase user id. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A guest identity: `guest_` and hex. */
const GUEST = /^guest_[0-9a-f]+$/;

/** Whether an id names a verified ACCOUNT (as opposed to a per-room seat). */
export function isVerifiedIdentityId(id: string): boolean {
  return UUID.test(id) || GUEST.test(id);
}

export interface BackfillParticipant {
  playerId: string;
  isBot: boolean;
  isWinner: boolean;
}

export interface BackfillMatch {
  /** The stored match id — the same `m_<CODE>_<startedAt>` id the live path derives. */
  id: string;
  startedAt: number;
  finishedAt: number;
  participants: readonly BackfillParticipant[];
}

export interface BackfillOptions {
  /** Only matches that STARTED before this instant. The moment live recording began, so the two never overlap. */
  before?: number;
}

export interface BackfillReport {
  matchesSeen: number;
  /** Matches on or after `before`, left to the live path. */
  matchesAfterCutoff: number;
  /** Matches with fewer than two verified human players — nothing to pair. */
  matchesTooFewVerified: number;
  matchesCounted: number;
  /** Eligible matches the store had already counted (a repeat run, or the live path got there first). */
  matchesAlreadyCounted: number;
  pairsUpdated: number;
  /** Human participants whose id is a seat id, not an account: history this cannot recover. */
  participantsUnverifiable: number;
}

const emptyReport = (): BackfillReport => ({
  matchesSeen: 0,
  matchesAfterCutoff: 0,
  matchesTooFewVerified: 0,
  matchesCounted: 0,
  matchesAlreadyCounted: 0,
  pairsUpdated: 0,
  participantsUnverifiable: 0,
});

/**
 * Feeds matches, oldest first, through the service. Order matters: a streak is
 * a run of consecutive days, and it is built one day at a time.
 */
export async function backfillFriendshipPairs(
  matches: AsyncIterable<BackfillMatch> | Iterable<BackfillMatch>,
  service: FriendshipHistoryService,
  options: BackfillOptions = {},
): Promise<BackfillReport> {
  const report = emptyReport();

  for await (const match of matches) {
    report.matchesSeen += 1;
    if (options.before !== undefined && match.startedAt >= options.before) {
      report.matchesAfterCutoff += 1;
      continue;
    }

    const humans = match.participants.filter((p) => !p.isBot);
    const verified = humans.filter((p) => isVerifiedIdentityId(p.playerId));
    report.participantsUnverifiable += humans.length - verified.length;
    if (new Set(verified.map((p) => p.playerId)).size < 2) {
      report.matchesTooFewVerified += 1;
      continue;
    }

    const outcome = await service.recordMatch({
      matchId: match.id,
      playedAt: match.finishedAt,
      participants: verified.map((p) => ({ identityId: p.playerId })),
      winnerIdentityIds: verified.filter((p) => p.isWinner).map((p) => p.playerId),
    });
    if (outcome.counted) {
      report.matchesCounted += 1;
      report.pairsUpdated += outcome.pairs;
    } else {
      report.matchesAlreadyCounted += 1;
    }
  }

  return report;
}

/**
 * The store and service a run should use.
 *
 * A DRY run gets a fresh in-memory store: every claim, pair and milestone lands
 * there and is thrown away, so the real store is only ever READ by the caller's
 * match source. An APPLY run writes to the real one.
 */
export function backfillContext(
  realRepository: ProgressionRepository,
  dryRun: boolean,
): { repository: ProgressionRepository; service: FriendshipHistoryService } {
  const repository = dryRun ? new InMemoryProgressionRepository() : realRepository;
  return { repository, service: new FriendshipHistoryService(() => repository) };
}

interface MatchRow {
  id: string;
  started_at: string;
  finished_at: string;
  match_participants?: Array<{ player_id: string; is_bot: boolean; is_winner: boolean }>;
}

const PAGE_SIZE = 500;

/**
 * Reads stored matches, oldest first, a page at a time (PostgREST caps a single
 * response, so the whole table is never asked for at once).
 */
export async function* readStoredMatches(
  db: Pick<PostgrestClient, "select">,
  options: BackfillOptions = {},
): AsyncGenerator<BackfillMatch> {
  const filter = options.before === undefined ? "" : `&started_at=lt.${encodeURIComponent(new Date(options.before).toISOString())}`;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await db.select<MatchRow>(
      "match_summaries",
      `select=id,started_at,finished_at,match_participants(player_id,is_bot,is_winner)` +
        `&order=started_at.asc,id.asc&limit=${PAGE_SIZE}&offset=${offset}${filter}`,
    );
    for (const row of rows) {
      yield {
        id: row.id,
        startedAt: Date.parse(row.started_at),
        finishedAt: Date.parse(row.finished_at),
        participants: (row.match_participants ?? []).map((p) => ({
          playerId: p.player_id,
          isBot: p.is_bot,
          isWinner: p.is_winner,
        })),
      };
    }
    if (rows.length < PAGE_SIZE) return;
  }
}
