import { Router, type Request, type Response } from "express";
import { requireIdentity, callerId } from "../auth/identity.js";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { rateLimitByCaller } from "../lib/httpRateLimiter.js";
import {
  AlreadyReviewedError,
  InvalidRatingError,
  InvalidReviewBodyError,
  InvalidStatusTransitionError,
  ReviewNotFoundError,
  ReviewsInfrastructureError,
  type ReviewStatus,
} from "../persistence/ReviewsRepository.js";
import { InvalidGameIdError, type ReviewsService } from "./ReviewsService.js";

interface MappedError {
  status: number;
  error: string;
  message: string;
}

/**
 * One `instanceof` chain, one response shape — mirrors
 * `EconomyController.ts`'s own error-mapping convention rather than
 * inventing a second one for this router.
 */
function mapReviewsError(err: unknown): MappedError {
  if (err instanceof AlreadyReviewedError) {
    return { status: 409, error: "AlreadyReviewed", message: err.message };
  }
  if (err instanceof InvalidRatingError || err instanceof InvalidReviewBodyError || err instanceof InvalidGameIdError) {
    return { status: 400, error: "InvalidRequest", message: err.message };
  }
  if (err instanceof ReviewNotFoundError) {
    return { status: 404, error: "ReviewNotFound", message: err.message };
  }
  if (err instanceof InvalidStatusTransitionError) {
    return { status: 409, error: "InvalidStatusTransition", message: err.message };
  }
  if (err instanceof ReviewsInfrastructureError) {
    return { status: 503, error: "ServiceUnavailable", message: "The reviews store is temporarily unavailable." };
  }
  return { status: 500, error: "InternalError", message: "Something went wrong." };
}

function respondError(res: Response, err: unknown): void {
  const mapped = mapReviewsError(err);
  res.status(mapped.status).json({ error: mapped.error, message: mapped.message });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Public/player-facing surface: submit, read your own, and public approved/featured reads. */
export function createReviewsRouter(service: ReviewsService): Router {
  const router = Router();

  const submitRateLimit = rateLimitByCaller({
    capacity: 5,
    refillPerSec: 5 / 3600, // 5 tokens/hour
    keyOf: (req) => callerId(req),
  });

  router.post("/", requireIdentity, submitRateLimit, async (req: Request, res: Response) => {
    const body = isPlainRecord(req.body) ? req.body : {};
    const rating = Number(body.rating);
    const reviewBody = typeof body.body === "string" ? body.body : "";
    const gameId = typeof body.gameId === "string" ? body.gameId : body.gameId === null ? null : undefined;

    if (!req.player) {
      res.status(401).json({ error: "Unauthorized", message: "Sign in or continue as a guest first." });
      return;
    }

    try {
      const record = await service.submitReview({
        identityId: req.player.playerId,
        identityKind: req.player.kind,
        gameId,
        rating,
        body: reviewBody,
      });
      res.status(201).json({ review: record });
    } catch (err) {
      respondError(res, err);
    }
  });

  router.get("/mine", requireIdentity, async (req: Request, res: Response) => {
    try {
      const reviews = await service.getMine(callerId(req));
      res.json({ reviews });
    } catch (err) {
      respondError(res, err);
    }
  });

  /** Public — approved reviews for one game plus its aggregate rating. No identity required. */
  router.get("/game/:gameId", async (req: Request, res: Response) => {
    try {
      const { result, aggregate } = await service.getForGame(req.params.gameId, pageOptions(req));
      res.json({ reviews: result.reviews, total: result.total, aggregate });
    } catch (err) {
      respondError(res, err);
    }
  });

  /** Public — approved platform-wide reviews plus the platform aggregate. */
  router.get("/platform", async (req: Request, res: Response) => {
    try {
      const { result, aggregate } = await service.getPlatformWide(pageOptions(req));
      res.json({ reviews: result.reviews, total: result.total, aggregate });
    } catch (err) {
      respondError(res, err);
    }
  });

  /** Public — the Testimonials feed. */
  router.get("/featured", async (req: Request, res: Response) => {
    try {
      const reviews = await service.getFeatured(pageOptions(req));
      res.json({ reviews });
    } catch (err) {
      respondError(res, err);
    }
  });

  return router;
}

/** Admin/moderation surface — every route here requires operational credentials. */
export function createAdminReviewsRouter(service: ReviewsService): Router {
  const router = Router();

  router.use(requireOperationalAuth);
  router.use((_req: Request, res: Response, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  function moderatorId(req: Request): string {
    const principal = req.operationalPrincipal;
    return principal?.kind === "admin-user" ? principal.userId : "ops-key";
  }

  router.get("/pending", async (req: Request, res: Response) => {
    try {
      const result = await service.listPending(pageOptions(req));
      res.json(result);
    } catch (err) {
      respondError(res, err);
    }
  });

  router.get("/", async (req: Request, res: Response) => {
    const status = typeof req.query.status === "string" ? (req.query.status as ReviewStatus) : undefined;
    const gameIdParam = req.query.gameId;
    const filters: { status?: ReviewStatus; gameId?: string | null; featured?: boolean } = { status };
    if (gameIdParam === "null") filters.gameId = null;
    else if (typeof gameIdParam === "string") filters.gameId = gameIdParam;
    if (typeof req.query.featured === "string") filters.featured = req.query.featured === "true";

    try {
      const result = await service.listAll(filters, pageOptions(req));
      res.json(result);
    } catch (err) {
      respondError(res, err);
    }
  });

  router.post("/:id/approve", async (req: Request, res: Response) => {
    try {
      const review = await service.approve(req.params.id, moderatorId(req));
      res.json({ review });
    } catch (err) {
      respondError(res, err);
    }
  });

  router.post("/:id/reject", async (req: Request, res: Response) => {
    const body = isPlainRecord(req.body) ? req.body : {};
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      res.status(400).json({ error: "InvalidRequest", message: "A rejection reason is required." });
      return;
    }
    try {
      const review = await service.reject(req.params.id, moderatorId(req), reason);
      res.json({ review });
    } catch (err) {
      respondError(res, err);
    }
  });

  router.post("/:id/feature", async (req: Request, res: Response) => {
    const body = isPlainRecord(req.body) ? req.body : {};
    const featured = body.featured === true;
    try {
      const review = await service.setFeatured(req.params.id, featured, moderatorId(req));
      res.json({ review });
    } catch (err) {
      respondError(res, err);
    }
  });

  return router;
}

function pageOptions(req: Request): { limit?: number; offset?: number } {
  const limit = Number(req.query.limit);
  const offset = Number(req.query.offset);
  return {
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  };
}
