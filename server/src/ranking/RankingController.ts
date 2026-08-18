import { Router, type Request, type Response } from "express";
import { leaderboardService } from "./LeaderboardService.js";
import { rankingService } from "./RankingService.js";
import { challengeEngine } from "./ChallengeEngine.js";
import { recentPlayersService } from "./RecentPlayersService.js";
import { XPEngine } from "./XPEngine.js";
import type { GameKind } from "@shared/types.js";
import type { LeaderboardMetric, LeaderboardTimeframe } from "@shared/ranking/PlayerRank.js";

export const rankingRouter = Router();

// GET /api/ranking/leaderboard
rankingRouter.get("/leaderboard", (req: Request, res: Response) => {
  const metric = req.query.metric as LeaderboardMetric | undefined;
  const game = req.query.game as GameKind | undefined;
  const timeframe = req.query.timeframe as LeaderboardTimeframe | undefined;
  const search = req.query.search as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 25;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  const result = leaderboardService.getLeaderboard({
    metric,
    game,
    timeframe,
    search,
    limit,
    offset,
  });

  res.json(result);
});

// GET /api/ranking/rank/:playerId
rankingRouter.get("/rank/:playerId", (req: Request, res: Response) => {
  const playerId = req.params.playerId;
  if (!playerId) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }

  const rank = rankingService.getPlayerRank(playerId);
  const progression = XPEngine.getProgression(playerId);

  res.json({ rank, progression });
});

// GET /api/ranking/challenges/:playerId
rankingRouter.get("/challenges/:playerId", (req: Request, res: Response) => {
  const playerId = req.params.playerId;
  if (!playerId) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }

  const challenges = challengeEngine.getPlayerChallenges(playerId);
  res.json({ challenges });
});

// POST /api/ranking/challenges/:playerId/claim/:challengeId
rankingRouter.post("/challenges/:playerId/claim/:challengeId", (req: Request, res: Response) => {
  const { playerId, challengeId } = req.params;
  if (!playerId || !challengeId) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  const result = challengeEngine.claimChallengeReward(playerId, challengeId);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result);
});

// GET /api/ranking/recent/:playerId
rankingRouter.get("/recent/:playerId", (req: Request, res: Response) => {
  const playerId = req.params.playerId;
  if (!playerId) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }

  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const recent = recentPlayersService.getRecentPlayers(playerId, limit);
  res.json({ recent });
});

// GET /api/ranking/friends/:playerId
rankingRouter.get("/friends/:playerId", (req: Request, res: Response) => {
  const playerId = req.params.playerId;
  if (!playerId) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }

  const friends = recentPlayersService.getFriends(playerId);
  res.json({ friends });
});

// POST /api/ranking/friends/:playerId
rankingRouter.post("/friends/:playerId", (req: Request, res: Response) => {
  const playerId = req.params.playerId;
  const { friendId } = req.body;
  if (!playerId || !friendId) {
    res.status(400).json({ error: "Missing playerId or friendId" });
    return;
  }

  const added = recentPlayersService.addFriend(playerId, friendId);
  res.json({ success: added });
});

// DELETE /api/ranking/friends/:playerId/:friendId
rankingRouter.delete("/friends/:playerId/:friendId", (req: Request, res: Response) => {
  const { playerId, friendId } = req.params;
  if (!playerId || !friendId) {
    res.status(400).json({ error: "Missing playerId or friendId" });
    return;
  }

  const removed = recentPlayersService.removeFriend(playerId, friendId);
  res.json({ success: removed });
});
