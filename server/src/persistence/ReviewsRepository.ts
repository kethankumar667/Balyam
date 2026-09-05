/**
 * The seam between the `reviews` table (Reviews & Testimonials V1) and
 * everything that submits, moderates, or displays a review.
 *
 * ── Why this file has no logic ────────────────────────────────────────
 * The one invariant that matters — "this identity has not already reviewed
 * this scope" — is enforced by the two partial unique indexes in
 * `supabase/migrations/20260906000003_reviews_and_feedback_v1.sql`, not by
 * this file. This file's job is to expose that database's decisions
 * faithfully to TypeScript: same method per capability, named error classes
 * in place of raw Postgres exception text, no business rule invented twice.
 *
 * ── What is deliberately NOT here ──────────────────────────────────────
 * No HTTP, no sessions, no rate limiting (that lives one layer up, at the
 * router — see `server/src/lib/httpRateLimiter.ts`). No knowledge of the
 * game catalog beyond treating `gameId` as an opaque string (validating it
 * against `@shared/catalog` is `ReviewsService`'s job). No caching.
 */

export type ReviewIdentityKind = "member" | "guest";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewRecord {
  id: string;
  identityId: string;
  identityKind: ReviewIdentityKind;
  /** `null` = platform-wide review. */
  gameId: string | null;
  /** 1-5 inclusive. */
  rating: number;
  body: string;
  status: ReviewStatus;
  /** Only ever `true` while `status === "approved"` — enforced at the database, not just here. */
  isFeatured: boolean;
  moderatorId: string | null;
  moderatedAt: number | null;
  rejectionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SubmitReviewInput {
  identityId: string;
  identityKind: ReviewIdentityKind;
  /** `null` for a platform-wide review. */
  gameId: string | null;
  rating: number;
  body: string;
}

export interface ModerateReviewInput {
  reviewId: string;
  newStatus: "approved" | "rejected";
  moderatorId: string;
  /** Required when `newStatus === "rejected"`, ignored otherwise. */
  reason?: string;
}

export interface ListPage {
  limit?: number;
  offset?: number;
}

export interface ReviewPageResult {
  reviews: ReviewRecord[];
  total: number;
}

export interface AggregateRating {
  averageRating: number;
  count: number;
}

export interface ListAllFilters {
  status?: ReviewStatus;
  /** `null` explicitly filters to platform-wide reviews; `undefined` means "any scope". */
  gameId?: string | null;
  featured?: boolean;
}

/* ═══════════════════════════ Error hierarchy ═════════════════════════════
 *
 * Mirrors EconomyRepository.ts's own hierarchy shape: an abstract base with
 * a `.code`, concrete leaves that never declare their own constructor
 * (`abstract class` alone is what blocks direct instantiation of the base
 * and of the never-abstract-again leaves).
 */

export abstract class ReviewsRepositoryError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** `rating` is not an integer in 1-5. Thrown before any query, by this repository. */
export class InvalidRatingError extends ReviewsRepositoryError {
  readonly code = "INVALID_RATING";
}

/** `body` is empty or exceeds 2000 characters after trimming. Thrown before any query. */
export class InvalidReviewBodyError extends ReviewsRepositoryError {
  readonly code = "INVALID_BODY";
}

/**
 * The unique-index violation on submit: this identity already has a review
 * for this exact scope (platform-wide, or this `gameId`). `existing` is the
 * review that already occupies the slot, so a caller can show it back
 * ("you already reviewed this") instead of just failing.
 */
export class AlreadyReviewedError extends ReviewsRepositoryError {
  readonly code = "ALREADY_REVIEWED";
  constructor(public readonly existing: ReviewRecord) {
    super("This identity already submitted a review for this scope.");
  }
}

/** `reviewId` does not resolve to a row. */
export class ReviewNotFoundError extends ReviewsRepositoryError {
  readonly code = "REVIEW_NOT_FOUND";
}

/**
 * A moderation call attempted an illegal transition — moderating a review
 * that is not `pending`, featuring a review that is not `approved`, or a
 * concurrent double-moderation losing the race (the Supabase implementation
 * detects this because its `UPDATE` filters on the expected source status,
 * so a second concurrent caller's update matches zero rows).
 */
export class InvalidStatusTransitionError extends ReviewsRepositoryError {
  readonly code = "INVALID_STATUS_TRANSITION";
}

/** Connectivity, timeout, or any database error not matching a named token above. */
export class ReviewsInfrastructureError extends ReviewsRepositoryError {
  readonly code = "INFRASTRUCTURE_ERROR";
}

/* ═══════════════════════════ The repository interface ═══════════════════ */

export interface ReviewsRepository {
  /** Which implementation this is. Reported by `/health`, logged at boot. */
  readonly kind: "memory" | "supabase";

  /** Prove the store is reachable and the `reviews` table exists. Called once at boot. */
  ping(): Promise<void>;

  /**
   * Throws `AlreadyReviewedError` (carrying the existing row) if this
   * identity already has a review for this scope — the caller decides
   * whether that's a 409 or something friendlier.
   */
  submitReview(input: SubmitReviewInput): Promise<ReviewRecord>;

  /** `null` if this identity has no review for this scope yet. */
  getReviewForIdentity(identityId: string, gameId: string | null): Promise<ReviewRecord | null>;

  /** All of one identity's reviews (platform-wide and per-game), newest first. */
  listReviewsForIdentity(identityId: string): Promise<ReviewRecord[]>;

  /** Approved reviews for one game, newest first. */
  listApprovedForGame(gameId: string, opts?: ListPage): Promise<ReviewPageResult>;

  /** Approved platform-wide reviews, newest first. */
  listApprovedPlatformWide(opts?: ListPage): Promise<ReviewPageResult>;

  /** Approved + featured, across all scopes, newest first — the Testimonials feed. */
  listFeatured(opts?: ListPage): Promise<ReviewRecord[]>;

  getAggregateForGame(gameId: string): Promise<AggregateRating>;
  getAggregatePlatformWide(): Promise<AggregateRating>;

  /** The moderation queue: pending reviews, oldest first (first in, first moderated). */
  listPending(opts?: ListPage): Promise<ReviewPageResult>;

  /** Filterable admin listing across every status/scope, newest first. */
  listAll(filters?: ListAllFilters, opts?: ListPage): Promise<ReviewPageResult>;

  /**
   * `pending -> approved` or `pending -> rejected`. Throws
   * `ReviewNotFoundError` if `reviewId` doesn't exist, or
   * `InvalidStatusTransitionError` if it is not currently `pending`.
   */
  moderateReview(input: ModerateReviewInput): Promise<ReviewRecord>;

  /**
   * Toggle the Testimonials flag. Throws `InvalidStatusTransitionError` if
   * `featured: true` is requested against a review that is not currently
   * `approved` — the database's own check constraint backs this up, this
   * error is the friendly form of that same rule.
   */
  setFeatured(reviewId: string, featured: boolean, moderatorId: string): Promise<ReviewRecord>;
}
