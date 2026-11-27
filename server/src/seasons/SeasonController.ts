import { Router, type Request, type Response } from "express";
import { seasonService } from "./SeasonService.js";
import { SeasonRewardsEngine } from "./SeasonRewardsEngine.js";
import { requireSelfParam, callerId } from "../auth/identity.js";

/**
 * Seasons.
 *
 * These routes used to share a file with the tournament routes. Tournaments were removed on 2026-11-27 and the
 * season routes moved here unchanged. Nothing feeds a season any more (only a finished tournament did), so the
 * routes answer with an empty season; they are kept, not extended.
 *
 *   PUBLIC   which season is running, and its board
 *   PRIVATE  your own season progress and claiming a reward tier, as yourself and only yourself
 */
export const seasonRouter = Router();

/** PUBLIC — which season is running. */
seasonRouter.get("/current", (_req: Request, res: Response) => {
  res.json({ season: seasonService.getCurrentSeason() });
});

/** PUBLIC — the season board. */
seasonRouter.get("/leaderboard", (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  res.json({ leaderboard: seasonService.getSeasonLeaderboard(undefined, limit) });
});

/** PRIVATE — your season progress and which rewards you can take. */
seasonRouter.get("/player/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  const stats = seasonService.getPlayerSeasonStats(callerId(req));
  res.json({
    stats,
    rewards: SeasonRewardsEngine.evaluateRewards(stats.seasonXP, stats.rewardsClaimed),
  });
});

/**
 * PRIVATE — claim a season reward tier.
 *
 * The second of the two reward-claim routes the audit called out. Anonymous at
 * baseline: it failed only because the tier id was invented, never because the
 * caller had no right to the account.
 */
seasonRouter.post(
  "/player/:playerId/claim/:tierId",
  requireSelfParam(),
  (req: Request, res: Response) => {
    const result = seasonService.claimReward(callerId(req), req.params.tierId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  },
);
