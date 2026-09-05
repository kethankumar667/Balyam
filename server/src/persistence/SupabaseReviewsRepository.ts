import { PostgrestClient, PostgrestError, type PostgrestConfig } from "./postgrest.js";
import {
  type AggregateRating,
  type ListAllFilters,
  type ListPage,
  type ModerateReviewInput,
  type ReviewIdentityKind,
  type ReviewPageResult,
  type ReviewRecord,
  type ReviewsRepository,
  type ReviewStatus,
  type SubmitReviewInput,
  AlreadyReviewedError,
  InvalidRatingError,
  InvalidReviewBodyError,
  InvalidStatusTransitionError,
  ReviewNotFoundError,
  ReviewsInfrastructureError,
} from "./ReviewsRepository.js";

/**
 * `ReviewsRepository`, in Supabase Postgres.
 *
 * ── Why a plain INSERT + caught unique violation, not `insertIgnoringDuplicates` ──
 * The two anti-abuse indexes (`reviews_one_platform_wide_per_identity`,
 * `reviews_one_per_identity_per_game` — see the migration) are PARTIAL
 * unique indexes. Postgres's `ON CONFLICT (columns) DO NOTHING` conflict
 * inference requires the predicate to match a partial index's own `WHERE`
 * clause, which PostgREST's `on_conflict` query parameter has no way to
 * express — so `insertIgnoringDuplicates("reviews", rows, "identity_id,game_id")`
 * would not reliably resolve to either partial index. A plain insert avoids
 * the problem entirely: Postgres raises a real `23505` unique-violation
 * error regardless of which of the two partial indexes caught it, and this
 * class recognizes that error by pattern (`DUPLICATE_REVIEW_PATTERN`) the
 * same way `SupabaseEconomyRepository` recognizes `VOUCHER_COLLISION_PATTERN`
 * — never a bespoke second mechanism.
 */

interface ReviewRow {
  id: string;
  identity_id: string;
  identity_kind: ReviewIdentityKind;
  game_id: string | null;
  rating: number;
  body: string;
  status: ReviewStatus;
  is_featured: boolean;
  moderator_id: string | null;
  moderated_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

function toEpochMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function toReview(row: ReviewRow): ReviewRecord {
  return {
    id: row.id,
    identityId: row.identity_id,
    identityKind: row.identity_kind,
    gameId: row.game_id,
    rating: row.rating,
    body: row.body,
    status: row.status,
    isFeatured: row.is_featured,
    moderatorId: row.moderator_id,
    moderatedAt: toEpochMs(row.moderated_at),
    rejectionReason: row.rejection_reason,
    createdAt: toEpochMs(row.created_at) ?? 0,
    updatedAt: toEpochMs(row.updated_at) ?? 0,
  };
}

const DUPLICATE_REVIEW_PATTERN = /duplicate key value violates unique constraint "reviews_one_/i;

export class SupabaseReviewsRepository implements ReviewsRepository {
  readonly kind = "supabase" as const;
  private readonly db: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.db = new PostgrestClient(config);
  }

  /** Never throws a raw `PostgrestError` — always one of the named classes in `ReviewsRepository.ts`. */
  private mapError(err: unknown): Error {
    if (err instanceof PostgrestError) return new ReviewsInfrastructureError(err.message);
    if (err instanceof Error) return new ReviewsInfrastructureError(err.message);
    return new ReviewsInfrastructureError(String(err));
  }

  private async select<T>(query: string): Promise<T[]> {
    try {
      return await this.db.select<T>("reviews", query);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  private async count(query: string): Promise<number> {
    try {
      return await this.db.count("reviews", query);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async ping(): Promise<void> {
    await this.select("select=id&limit=1");
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewRecord> {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new InvalidRatingError(`rating must be an integer 1-5, got ${input.rating}`);
    }
    const body = input.body.trim();
    if (body.length < 1 || body.length > 2000) {
      throw new InvalidReviewBodyError(`body must be 1-2000 characters, got ${body.length}`);
    }

    const row = {
      identity_id: input.identityId,
      identity_kind: input.identityKind,
      game_id: input.gameId,
      rating: input.rating,
      body,
    };

    try {
      const inserted = await this.insertReviewRow(row);
      return toReview(inserted);
    } catch (err) {
      if (err instanceof PostgrestError && DUPLICATE_REVIEW_PATTERN.test(err.message)) {
        const existing = await this.getReviewForIdentity(input.identityId, input.gameId);
        if (existing) throw new AlreadyReviewedError(existing);
      }
      throw this.mapError(err);
    }
  }

  private async insertReviewRow(row: unknown): Promise<ReviewRow> {
    const rows = await this.db.insert<ReviewRow>("reviews", [row]);
    const first = rows[0];
    if (!first) throw new ReviewsInfrastructureError("Insert into reviews returned no row");
    return first;
  }

  async getReviewForIdentity(identityId: string, gameId: string | null): Promise<ReviewRecord | null> {
    const scopeFilter = gameId === null ? "game_id=is.null" : `game_id=eq.${encodeURIComponent(gameId)}`;
    const rows = await this.select<ReviewRow>(
      `identity_id=eq.${encodeURIComponent(identityId)}&${scopeFilter}&limit=1`,
    );
    return rows[0] ? toReview(rows[0]) : null;
  }

  async listReviewsForIdentity(identityId: string): Promise<ReviewRecord[]> {
    const rows = await this.select<ReviewRow>(
      `identity_id=eq.${encodeURIComponent(identityId)}&order=created_at.desc`,
    );
    return rows.map(toReview);
  }

  async listApprovedForGame(gameId: string, opts?: ListPage): Promise<ReviewPageResult> {
    const filter = `status=eq.approved&game_id=eq.${encodeURIComponent(gameId)}`;
    return this.pagedSelect(filter, "created_at.desc", opts);
  }

  async listApprovedPlatformWide(opts?: ListPage): Promise<ReviewPageResult> {
    const filter = "status=eq.approved&game_id=is.null";
    return this.pagedSelect(filter, "created_at.desc", opts);
  }

  async listFeatured(opts?: ListPage): Promise<ReviewRecord[]> {
    const { limit, offset } = clampLimit(opts);
    const rows = await this.select<ReviewRow>(
      `status=eq.approved&is_featured=eq.true&order=created_at.desc&limit=${limit}&offset=${offset}`,
    );
    return rows.map(toReview);
  }

  async getAggregateForGame(gameId: string): Promise<AggregateRating> {
    const rows = await this.select<{ rating: number }>(
      `status=eq.approved&game_id=eq.${encodeURIComponent(gameId)}&select=rating`,
    );
    return aggregateOf(rows);
  }

  async getAggregatePlatformWide(): Promise<AggregateRating> {
    const rows = await this.select<{ rating: number }>("status=eq.approved&game_id=is.null&select=rating");
    return aggregateOf(rows);
  }

  async listPending(opts?: ListPage): Promise<ReviewPageResult> {
    return this.pagedSelect("status=eq.pending", "created_at.asc", opts);
  }

  async listAll(filters?: ListAllFilters, opts?: ListPage): Promise<ReviewPageResult> {
    const clauses: string[] = [];
    if (filters?.status) clauses.push(`status=eq.${filters.status}`);
    if (filters && "gameId" in filters) {
      clauses.push(filters.gameId === null ? "game_id=is.null" : `game_id=eq.${encodeURIComponent(filters.gameId ?? "")}`);
    }
    if (filters?.featured !== undefined) clauses.push(`is_featured=eq.${filters.featured}`);
    return this.pagedSelect(clauses.join("&"), "created_at.desc", opts);
  }

  async moderateReview(input: ModerateReviewInput): Promise<ReviewRecord> {
    const patch = {
      status: input.newStatus,
      moderator_id: input.moderatorId,
      moderated_at: new Date().toISOString(),
      rejection_reason: input.newStatus === "rejected" ? (input.reason ?? null) : null,
    };
    // The `status=eq.pending` filter is the state-transition guard: a review
    // that is not currently pending (already moderated, or a concurrent
    // double-moderation) matches zero rows here instead of racing.
    let updated: ReviewRow[];
    try {
      updated = await this.db.update<ReviewRow>(
        "reviews",
        patch,
        `id=eq.${encodeURIComponent(input.reviewId)}&status=eq.pending`,
      );
    } catch (err) {
      throw this.mapError(err);
    }
    if (updated.length === 0) {
      const existing = await this.getById(input.reviewId);
      if (!existing) throw new ReviewNotFoundError(`No review with id ${input.reviewId}`);
      throw new InvalidStatusTransitionError(
        `Review ${input.reviewId} is ${existing.status}, not pending — cannot moderate again.`,
      );
    }
    return toReview(updated[0]);
  }

  async setFeatured(reviewId: string, featured: boolean, moderatorId: string): Promise<ReviewRecord> {
    const patch = { is_featured: featured, moderator_id: moderatorId };
    // Featuring requires the row to currently be approved (mirrors the
    // database's own check constraint); un-featuring has no such
    // requirement, so the filter only adds `status=eq.approved` in the
    // featuring direction.
    const filter = featured
      ? `id=eq.${encodeURIComponent(reviewId)}&status=eq.approved`
      : `id=eq.${encodeURIComponent(reviewId)}`;
    let updated: ReviewRow[];
    try {
      updated = await this.db.update<ReviewRow>("reviews", patch, filter);
    } catch (err) {
      throw this.mapError(err);
    }
    if (updated.length === 0) {
      const existing = await this.getById(reviewId);
      if (!existing) throw new ReviewNotFoundError(`No review with id ${reviewId}`);
      throw new InvalidStatusTransitionError(
        `Review ${reviewId} is ${existing.status}, not approved — cannot be featured.`,
      );
    }
    return toReview(updated[0]);
  }

  private async getById(reviewId: string): Promise<ReviewRecord | null> {
    const rows = await this.select<ReviewRow>(`id=eq.${encodeURIComponent(reviewId)}&limit=1`);
    return rows[0] ? toReview(rows[0]) : null;
  }

  private async pagedSelect(filter: string, order: string, opts?: ListPage): Promise<ReviewPageResult> {
    const { limit, offset } = clampLimit(opts);
    const prefix = filter ? `${filter}&` : "";
    const [rows, total] = await Promise.all([
      this.select<ReviewRow>(`${prefix}order=${order}&limit=${limit}&offset=${offset}`),
      this.count(filter),
    ]);
    return { reviews: rows.map(toReview), total };
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(opts?: ListPage): { limit: number; offset: number } {
  const limit = Math.max(1, Math.min(MAX_LIMIT, opts?.limit ?? DEFAULT_LIMIT));
  const offset = Math.max(0, opts?.offset ?? 0);
  return { limit, offset };
}

function aggregateOf(rows: { rating: number }[]): AggregateRating {
  if (rows.length === 0) return { averageRating: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { averageRating: sum / rows.length, count: rows.length };
}
