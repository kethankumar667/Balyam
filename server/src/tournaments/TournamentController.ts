import { Router, type Request, type Response } from "express";
import { tournamentService } from "./TournamentService.js";
import { seasonService } from "../seasons/SeasonService.js";
import { SeasonRewardsEngine } from "../seasons/SeasonRewardsEngine.js";
import type { GameKind } from "@shared/types.js";
import type { TournamentStatus } from "@shared/tournaments/Tournament.js";

export const tournamentRouter = Router();
export const seasonRouter = Router();

// ── TOURNAMENTS ROUTES ──

// GET /api/tournaments
tournamentRouter.get("/", (req: Request, res: Response) => {
  const game = req.query.game as GameKind | undefined;
  const status = req.query.status as TournamentStatus | undefined;
  const list = tournamentService.getTournaments({ game, status });
  res.json({ tournaments: list });
});

// GET /api/tournaments/:id
tournamentRouter.get("/:id", (req: Request, res: Response) => {
  const t = tournamentService.getTournament(req.params.id);
  if (!t) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }
  res.json({ tournament: t });
});

// GET /api/tournaments/:id/bracket
tournamentRouter.get("/:id/bracket", (req: Request, res: Response) => {
  const bracket = tournamentService.getBracket(req.params.id);
  if (!bracket) {
    res.status(404).json({ error: "Bracket not generated yet" });
    return;
  }
  res.json({ bracket });
});

// POST /api/tournaments/:id/register
tournamentRouter.post("/:id/register", (req: Request, res: Response) => {
  const { playerId, displayName, avatar } = req.body;
  if (!playerId || !displayName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const result = tournamentService.registerPlayer(req.params.id, {
    playerId,
    displayName,
    avatar,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

// POST /api/tournaments/:id/checkin
tournamentRouter.post("/:id/checkin", (req: Request, res: Response) => {
  const { playerId } = req.body;
  if (!playerId) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }

  const result = tournamentService.checkInPlayer(req.params.id, playerId);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

// POST /api/tournaments/:id/start
tournamentRouter.post("/:id/start", (req: Request, res: Response) => {
  const result = tournamentService.startTournament(req.params.id);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

// POST /api/tournaments/:id/match
tournamentRouter.post("/:id/match", (req: Request, res: Response) => {
  const { matchId, winnerId, score1, score2 } = req.body;
  if (!matchId || !winnerId) {
    res.status(400).json({ error: "Missing matchId or winnerId" });
    return;
  }

  const result = tournamentService.reportMatchResult(
    req.params.id,
    matchId,
    winnerId,
    score1,
    score2
  );
  res.json(result);
});

// GET /api/tournaments/player/:playerId/history
tournamentRouter.get("/player/:playerId/history", (req: Request, res: Response) => {
  const history = tournamentService.getPlayerTournamentHistory(req.params.playerId);
  res.json({ history });
});

// ── SEASONS ROUTES ──

// GET /api/seasons/current
seasonRouter.get("/current", (_req: Request, res: Response) => {
  const season = seasonService.getCurrentSeason();
  res.json({ season });
});

// GET /api/seasons/player/:playerId
seasonRouter.get("/player/:playerId", (req: Request, res: Response) => {
  const stats = seasonService.getPlayerSeasonStats(req.params.playerId);
  const rewards = SeasonRewardsEngine.evaluateRewards(stats.seasonXP, stats.rewardsClaimed);
  res.json({ stats, rewards });
});

// POST /api/seasons/player/:playerId/claim/:tierId
seasonRouter.post("/player/:playerId/claim/:tierId", (req: Request, res: Response) => {
  const result = seasonService.claimReward(req.params.playerId, req.params.tierId);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

// GET /api/seasons/leaderboard
seasonRouter.get("/leaderboard", (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const list = seasonService.getSeasonLeaderboard(undefined, limit);
  res.json({ leaderboard: list });
});
