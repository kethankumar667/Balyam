import { logger } from "../lib/logger.js";
import { readPostgrestConfig } from "../persistence/postgrest.js";
import { InMemoryReviewsRepository } from "../persistence/InMemoryReviewsRepository.js";
import { SupabaseReviewsRepository } from "../persistence/SupabaseReviewsRepository.js";
import type { ReviewsRepository } from "../persistence/ReviewsRepository.js";
import { ReviewsService } from "./ReviewsService.js";

/**
 * Choosing where Reviews & Testimonials V1 lives, once, at boot. Mirrors
 * `economy/index.ts`'s `initialiseEconomyStore` exactly — same rule, same
 * reasoning, reused rather than reinvented:
 *
 *   service-role key present  ->  Supabase Postgres (durable)
 *   absent, development       ->  memory, with a warning that says what is lost
 *   absent, PRODUCTION        ->  refuse to start
 *
 * Reviews get this same production durability guard because they are
 * permanent public-facing content (per-game ratings, the Testimonials feed)
 * — a process that silently ran this in memory would mean every submitted
 * review, and every moderation decision made on it, vanishes on the next
 * restart or idle spin-down.
 */

export interface ReviewsStoreStatus {
  kind: "memory" | "supabase";
  durable: boolean;
  reachable: boolean;
  detail: string;
}

let status: ReviewsStoreStatus = {
  kind: "memory",
  durable: false,
  reachable: true,
  detail: "not initialised",
};

/** For `/health` — never includes credentials. */
export function reviewsStoreStatus(): ReviewsStoreStatus {
  return { ...status };
}

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

export async function initialiseReviewsStore(): Promise<{ service: ReviewsService; status: ReviewsStoreStatus }> {
  const forceEphemeral = (process.env.ALLOW_EPHEMERAL_REVIEWS ?? "").trim().toLowerCase() === "true";
  const config = forceEphemeral ? null : readPostgrestConfig();

  if (!config) {
    const escapeHatch = forceEphemeral;

    if (isProduction() && !escapeHatch) {
      throw new Error(
        "Refusing to start in production without durable Reviews & Testimonials persistence. " +
          "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set, and " +
          "supabase/migrations/20260906000003_reviews_and_feedback_v1.sql must have been applied. " +
          "Without them every submitted review and moderation decision is lost on restart. " +
          "Set ALLOW_EPHEMERAL_REVIEWS=true only for a smoke test that must not keep anything.",
      );
    }

    if (isProduction()) {
      logger.error({
        message:
          "ALLOW_EPHEMERAL_REVIEWS is set in production. Reviews & Testimonials is IN MEMORY and " +
          "will be erased by the next restart, crash, or idle spin-down.",
        module: "REVIEWS",
      });
    } else {
      logger.warn({
        message:
          "Reviews & Testimonials is in memory: SUPABASE_SERVICE_ROLE_KEY is not set. Every " +
          "submitted review is lost when this process stops. Fine for development.",
        module: "REVIEWS",
      });
    }

    const repository: ReviewsRepository = new InMemoryReviewsRepository();
    status = { kind: "memory", durable: false, reachable: true, detail: "no service-role key configured" };
    return { service: new ReviewsService(repository), status: reviewsStoreStatus() };
  }

  const supabase = new SupabaseReviewsRepository(config);
  try {
    await supabase.ping();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error({
      message:
        `Configured for durable Reviews & Testimonials but the store did not answer: ${detail}. Check ` +
        "SUPABASE_URL, that the key is the SERVICE-ROLE key, and that " +
        "20260906000003_reviews_and_feedback_v1.sql has been applied.",
      module: "REVIEWS",
    });
    throw new Error(`Reviews & Testimonials store unreachable: ${detail}`);
  }

  status = { kind: "supabase", durable: true, reachable: true, detail: "supabase postgres" };
  logger.info({
    message: "Reviews & Testimonials is durable (Supabase Postgres). Submissions survive a restart.",
    module: "REVIEWS",
  });
  return { service: new ReviewsService(supabase), status: reviewsStoreStatus() };
}

export { ReviewsService } from "./ReviewsService.js";
