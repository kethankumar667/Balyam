/**
 * 2048 Cloud-Synced Best Scores HTTP Controller
 *
 *   GET /api/games/2048/stats — Read the caller's cloud-synced personal bests
 *   PUT /api/games/2048/stats — Merge a locally-recorded run onto the cloud record
 */

import { Router, type Request, type Response } from "express";
import { callerId, requireIdentity } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import { Game2048StatsService } from "./Game2048StatsService.js";

export function createGame2048StatsRouter(service: Game2048StatsService): Router {
  const router = Router();

  /**
   * GET /api/games/2048/stats
   * Returns the caller's cloud-synced 2048 personal bests.
   */
  router.get("/", requireIdentity, async (req: Request, res: Response) => {
    try {
      const stats = await service.getStats(callerId(req));
      res.json(stats);
    } catch (err) {
      logger.error({
        message: `GET /api/games/2048/stats failed: ${String(err)}`,
        module: "GAME_2048_STATS_API",
      });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to load your 2048 stats. Please try again.",
      });
    }
  });

  /**
   * PUT /api/games/2048/stats
   * Merges a locally-recorded personal best onto the caller's cloud record —
   * never a raw overwrite, see `Game2048StatsService.syncStats` for why.
   */
  router.put("/", requireIdentity, async (req: Request, res: Response) => {
    try {
      const merged = await service.syncStats(callerId(req), req.body);
      res.json(merged);
    } catch (err) {
      logger.error({
        message: `PUT /api/games/2048/stats failed: ${String(err)}`,
        module: "GAME_2048_STATS_API",
      });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to sync your 2048 stats. Please try again.",
      });
    }
  });

  return router;
}
