/**
 * 30-Day Daily Login Streak HTTP Controller
 *
 * Exposes server-authoritative streak endpoints:
 *   GET  /api/streak        — Read current streak state & 30-day schedule
 *   POST /api/streak/claim  — Authoritatively claim today's reward
 */

import { Router, type Request, type Response } from "express";
import { callerId, requireIdentity } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import { StreakService } from "./StreakService.js";

export function createStreakRouter(streakService: StreakService): Router {
  const router = Router();

  /**
   * GET /api/streak
   * Returns current streak state, 30-day schedule, and active status for caller.
   */
  router.get("/", requireIdentity, async (req: Request, res: Response) => {
    try {
      const playerId = callerId(req);
      const state = await streakService.getStreak(playerId);
      res.json(state);
    } catch (err) {
      logger.error({
        message: `GET /api/streak failed: ${String(err)}`,
        module: "STREAK_API",
      });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to load streak status. Please try again.",
      });
    }
  });

  /**
   * POST /api/streak/claim
   * Executes server-authoritative streak claim for caller.
   */
  router.post("/claim", requireIdentity, async (req: Request, res: Response) => {
    try {
      const playerId = callerId(req);

      // Deliberately ignores any client-supplied body (timestamp,
      // idempotency key): the claim's day and dedup key are always the
      // server's own — see StreakService.claimStreak for why.
      const result = await streakService.claimStreak(playerId);

      // If already claimed today or clock issue, return 200 with success: false (not 500)
      res.json(result);
    } catch (err) {
      logger.error({
        message: `POST /api/streak/claim failed: ${String(err)}`,
        module: "STREAK_API",
      });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to claim daily streak reward. Please try again.",
      });
    }
  });

  return router;
}
