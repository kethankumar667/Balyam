import { BHALYAM_GAME_CATALOGUE } from "@shared/catalog.js";
import {
  type AggregateRating,
  type ListPage,
  type ReviewIdentityKind,
  type ReviewPageResult,
  type ReviewRecord,
  type ReviewsRepository,
  type ReviewStatus,
  AlreadyReviewedError,
  InvalidRatingError,
  InvalidReviewBodyError,
} from "../persistence/ReviewsRepository.js";

const VALID_GAME_IDS = new Set<string>(BHALYAM_GAME_CATALOGUE.map((g) => g.id));

/** Thrown before the repository is ever touched — `gameId` isn't a real game slug. */
export class InvalidGameIdError extends Error {
  readonly code = "INVALID_GAME_ID";
  constructor(gameId: string) {
    super(`"${gameId}" is not a known BHALYAM game.`);
    this.name = "InvalidGameIdError";
  }
}

export interface SubmitReviewRequest {
  identityId: string;
  identityKind: ReviewIdentityKind;
  gameId?: string | null;
  rating: number;
  body: string;
}

/**
 * The validation layer between the HTTP boundary and `ReviewsRepository`.
 * Mirrors `EconomyService`'s role: one place owns request-shape validation
 * so the repository interface stays free of it, per that file's own header.
 */
export class ReviewsService {
  constructor(private readonly repository: ReviewsRepository) {}

  private normalizeGameId(gameId: string | null | undefined): string | null {
    if (gameId === undefined || gameId === null) return null;
    const trimmed = gameId.trim();
    if (trimmed.length === 0) return null;
    if (!VALID_GAME_IDS.has(trimmed)) throw new InvalidGameIdError(trimmed);
    return trimmed;
  }

  async submitReview(req: SubmitReviewRequest): Promise<ReviewRecord> {
    const gameId = this.normalizeGameId(req.gameId);
    if (!Number.isInteger(req.rating) || req.rating < 1 || req.rating > 5) {
      throw new InvalidRatingError(`rating must be an integer 1-5, got ${req.rating}`);
    }
    const body = req.body.trim();
    if (body.length < 1 || body.length > 2000) {
      throw new InvalidReviewBodyError(`body must be 1-2000 characters, got ${body.length}`);
    }

    return this.repository.submitReview({
      identityId: req.identityId,
      identityKind: req.identityKind,
      gameId,
      rating: req.rating,
      body,
    });
  }

  async getMine(identityId: string): Promise<ReviewRecord[]> {
    return this.repository.listReviewsForIdentity(identityId);
  }

  async getForGame(gameId: string, opts?: ListPage): Promise<{ result: ReviewPageResult; aggregate: AggregateRating }> {
    const normalized = this.normalizeGameId(gameId);
    if (normalized === null) throw new InvalidGameIdError(gameId);
    const [result, aggregate] = await Promise.all([
      this.repository.listApprovedForGame(normalized, opts),
      this.repository.getAggregateForGame(normalized),
    ]);
    return { result, aggregate };
  }

  async getPlatformWide(opts?: ListPage): Promise<{ result: ReviewPageResult; aggregate: AggregateRating }> {
    const [result, aggregate] = await Promise.all([
      this.repository.listApprovedPlatformWide(opts),
      this.repository.getAggregatePlatformWide(),
    ]);
    return { result, aggregate };
  }

  async getFeatured(opts?: ListPage): Promise<ReviewRecord[]> {
    return this.repository.listFeatured(opts);
  }

  /* ── admin/moderation ── */

  async listPending(opts?: ListPage): Promise<ReviewPageResult> {
    return this.repository.listPending(opts);
  }

  async listAll(
    filters: { status?: ReviewStatus; gameId?: string | null; featured?: boolean },
    opts?: ListPage,
  ): Promise<ReviewPageResult> {
    return this.repository.listAll(filters, opts);
  }

  async approve(reviewId: string, moderatorId: string): Promise<ReviewRecord> {
    return this.repository.moderateReview({ reviewId, newStatus: "approved", moderatorId });
  }

  async reject(reviewId: string, moderatorId: string, reason: string): Promise<ReviewRecord> {
    return this.repository.moderateReview({ reviewId, newStatus: "rejected", moderatorId, reason });
  }

  async setFeatured(reviewId: string, featured: boolean, moderatorId: string): Promise<ReviewRecord> {
    return this.repository.setFeatured(reviewId, featured, moderatorId);
  }
}

export { AlreadyReviewedError } from "../persistence/ReviewsRepository.js";
