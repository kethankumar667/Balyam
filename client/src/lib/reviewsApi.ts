import { apiFetch } from "./playerIdentity";
import { operationalFetch, operationalPost } from "./operationalApi";

/**
 * Typed client for `/api/reviews/*` — built on `apiFetch`
 * (`./playerIdentity.ts`), the same foundation `economyApi.ts` uses, so a
 * guest identity is minted/attached and a stale-guest 401 is retried once
 * automatically. Never a raw `fetch` — see `ContactUsPage.tsx`'s own
 * `setTimeout`-mock submit handler for the regression this avoids.
 */

export type ReviewIdentityKind = "member" | "guest";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewRecord {
  id: string;
  identityId: string;
  identityKind: ReviewIdentityKind;
  gameId: string | null;
  rating: number;
  body: string;
  status: ReviewStatus;
  isFeatured: boolean;
  moderatorId: string | null;
  moderatedAt: number | null;
  rejectionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AggregateRating {
  averageRating: number;
  count: number;
}

export class ReviewsClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ReviewsClientError";
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorSlug = "UnknownError";
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      if (data.error) errorSlug = data.error;
      if (data.message) errorMessage = data.message;
    } catch {
      /* non-json error body */
    }
    throw new ReviewsClientError(res.status, errorSlug, errorMessage);
  }
  return (await res.json()) as T;
}

export interface SubmitReviewInput {
  rating: number;
  body: string;
  /** Omit or `null` for a platform-wide review. */
  gameId?: string | null;
}

/** POST /api/reviews. Throws `ReviewsClientError` with `code === "AlreadyReviewed"` (status 409) if this identity already reviewed this scope. */
export async function submitReview(input: SubmitReviewInput): Promise<{ review: ReviewRecord }> {
  const res = await apiFetch("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ rating: input.rating, body: input.body, gameId: input.gameId ?? null }),
  });
  return handleResponse<{ review: ReviewRecord }>(res);
}

/** GET /api/reviews/mine — the caller's own reviews, across every scope. */
export async function getMyReviews(): Promise<{ reviews: ReviewRecord[] }> {
  const res = await apiFetch("/api/reviews/mine");
  return handleResponse<{ reviews: ReviewRecord[] }>(res);
}

/** GET /api/reviews/game/:gameId — public, no identity required. */
export async function getGameReviews(
  gameId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ reviews: ReviewRecord[]; total: number; aggregate: AggregateRating }> {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  const query = params.toString();
  const res = await apiFetch(`/api/reviews/game/${encodeURIComponent(gameId)}${query ? `?${query}` : ""}`);
  return handleResponse(res);
}

/** GET /api/reviews/platform — public, approved platform-wide reviews. */
export async function getPlatformReviews(
  opts: { limit?: number; offset?: number } = {},
): Promise<{ reviews: ReviewRecord[]; total: number; aggregate: AggregateRating }> {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  const query = params.toString();
  const res = await apiFetch(`/api/reviews/platform${query ? `?${query}` : ""}`);
  return handleResponse(res);
}

/** GET /api/reviews/featured — public, the Testimonials feed. */
export async function getFeaturedReviews(opts: { limit?: number } = {}): Promise<{ reviews: ReviewRecord[] }> {
  const query = opts.limit !== undefined ? `?limit=${opts.limit}` : "";
  const res = await apiFetch(`/api/reviews/featured${query}`);
  return handleResponse(res);
}

/* ═══════════════════════ Admin/moderation (operational auth) ═══════════════
 * Built on `operationalFetch`/`operationalPost` (`./operationalApi.ts`) —
 * the same foundation `economyApi.ts`'s admin functions use — rather than
 * `apiFetch`, since these routes require operational credentials, not a
 * player identity.
 */

export interface AdminReviewFilters {
  status?: ReviewStatus;
  /** `null` filters to platform-wide reviews. */
  gameId?: string | null;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

function adminListQuery(filters: AdminReviewFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.gameId !== undefined) params.set("gameId", filters.gameId === null ? "null" : filters.gameId);
  if (filters.featured !== undefined) params.set("featured", String(filters.featured));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  return params.toString();
}

/** GET /api/admin/reviews/pending — the moderation queue, oldest first. */
export async function adminListPendingReviews(opts: { limit?: number; offset?: number } = {}): Promise<{
  reviews: ReviewRecord[];
  total: number;
}> {
  const query = adminListQuery(opts);
  return operationalFetch(`/api/admin/reviews/pending${query ? `?${query}` : ""}`);
}

/** GET /api/admin/reviews — filterable full history. */
export async function adminListReviews(filters: AdminReviewFilters = {}): Promise<{ reviews: ReviewRecord[]; total: number }> {
  const query = adminListQuery(filters);
  return operationalFetch(`/api/admin/reviews${query ? `?${query}` : ""}`);
}

export async function adminApproveReview(reviewId: string): Promise<{ review: ReviewRecord }> {
  return operationalPost(`/api/admin/reviews/${encodeURIComponent(reviewId)}/approve`, {});
}

export async function adminRejectReview(reviewId: string, reason: string): Promise<{ review: ReviewRecord }> {
  return operationalPost(`/api/admin/reviews/${encodeURIComponent(reviewId)}/reject`, { reason });
}

export async function adminSetReviewFeatured(reviewId: string, featured: boolean): Promise<{ review: ReviewRecord }> {
  return operationalPost(`/api/admin/reviews/${encodeURIComponent(reviewId)}/feature`, { featured });
}
