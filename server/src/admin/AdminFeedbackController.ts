import { Router, type Request, type Response } from "express";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { _allFeedbackSubmissions } from "../support/SupportController.js";

/**
 * Read-only admin view of the feedback inbox (`POST /api/support/feedback`).
 *
 * No moderation actions here, deliberately — feedback is an inbox an
 * operator reads, not public-facing content, unlike `AdminReviewsController`
 * routes exposed from `ReviewsController.ts`'s `createAdminReviewsRouter`,
 * which approve/reject/feature. Same gate as every other admin router:
 * `requireOperationalAuth` (`server/src/security/operationalAuth.ts`), same
 * boundary as `AdminUsersController.ts`, not a new one.
 */
export function createAdminFeedbackRouter(): Router {
  const router = Router();

  router.use(requireOperationalAuth);
  router.use((_req: Request, res: Response, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/", (_req: Request, res: Response) => {
    const submissions = [..._allFeedbackSubmissions()].sort((a, b) => b.createdAt - a.createdAt);
    res.json({ submissions });
  });

  return router;
}
