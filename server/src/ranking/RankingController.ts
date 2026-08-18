import { Router, type Request, type Response } from "express";
import { leaderboardService } from "./LeaderboardService.js";
import { rankingService } from "./RankingService.js";
import { challengeEngine } from "./ChallengeEngine.js";
import { recentPlayersService } from "./RecentPlayersService.js";
import { XPEngine } from "./XPEngine.js";
import { requireSelfParam, callerId } from "../auth/identity.js";
import type { GameKind } from "@shared/types.js";
import type { LeaderboardMetric, LeaderboardTimeframe } from "@shared/ranking/PlayerRank.js";

/**
 * Ranking, challenges and the friends list that hangs off recent play.
 *
 *   PUBLIC   the leaderboard, and any single player's rank — a leaderboard
 *            that needed a credential per row would not be a leaderboard
 *   PRIVATE  challenges and their rewards, recent opponents, friends
 *
 * The reward claim is the sharpest one. `POST /challenges/:playerId/claim/:id`
 * granted XP to whichever id the URL named, with no credential at all — so
 * anyone could drain another account's unclaimed rewards, or farm their own by
 * naming ids they did not own. It now grants to the VERIFIED caller.
 */
export const rankingRouter = Router();

/** PUBLIC — the board itself. */
rankingRouter.get("/leaderboard", (req: Request, res: Response) => {
  const metric = req.query.metric as LeaderboardMetric | undefined;
  const game = req.query.game as GameKind | undefined;
  const timeframe = req.query.timeframe as LeaderboardTimeframe | undefined;
  const search = req.query.search as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 25;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  res.json(leaderboardService.getLeaderboard({ metric, game, timeframe, search, limit, offset }));
});

/** PUBLIC — one player's standing. Already visible on the board above. */
rankingRouter.get("/rank/:playerId", (req: Request, res: Response) => {
  const playerId = req.params.playerId;
  if (!playerId) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }
  res.json({
    rank: rankingService.getPlayerRank(playerId),
    progression: XPEngine.getProgression(playerId),
  });
});

/** PRIVATE — what you still have to do today. */
rankingRouter.get("/challenges/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  res.json({ challenges: challengeEngine.getPlayerChallenges(callerId(req)) });
});

/**
 * PRIVATE — claim a completed challenge.
 *
 * `callerId(req)` rather than `req.params.playerId` is the fix. The guard
 * already proves they are the same, and reading the verified one means a
 * future change to the guard cannot silently reintroduce the hole.
 *
 * Idempotency is the engine's, and it holds: `claimChallengeReward` refuses a
 * second claim with "already claimed". Durability is not — the claim set is a
 * process-local `Map`, so a restart makes every claim available again. That is
 * P0-3, and it is why this is only half-closed until then.
 */
rankingRouter.post(
  "/challenges/:playerId/claim/:challengeId",
  requireSelfParam(),
  (req: Request, res: Response) => {
    const { challengeId } = req.params;
    if (!challengeId) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    const result = challengeEngine.claimChallengeReward(callerId(req), challengeId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  },
);

/** PRIVATE — who you have been playing with. Names other people. */
rankingRouter.get("/recent/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  res.json({ recent: recentPlayersService.getRecentPlayers(callerId(req), limit) });
});

/** PRIVATE — your friends list. */
rankingRouter.get("/friends/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  res.json({ friends: recentPlayersService.getFriends(callerId(req)) });
});

/** PRIVATE — add a friend to YOUR list. */
rankingRouter.post("/friends/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  const { friendId } = req.body ?? {};
  if (!friendId || typeof friendId !== "string") {
    res.status(400).json({ error: "Missing or invalid friendId" });
    return;
  }
  res.json({ success: recentPlayersService.addFriend(callerId(req), friendId) });
});

/** PRIVATE — remove one from YOUR list. */
rankingRouter.delete(
  "/friends/:playerId/:friendId",
  requireSelfParam(),
  (req: Request, res: Response) => {
    const { friendId } = req.params;
    if (!friendId) {
      res.status(400).json({ error: "Missing friendId" });
      return;
    }
    res.json({ success: recentPlayersService.removeFriend(callerId(req), friendId) });
  },
);
