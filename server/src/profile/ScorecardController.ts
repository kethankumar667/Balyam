import { Router } from "express";
import { scorecardService } from "./ScorecardService.js";
import { requireSelfParam, callerId } from "../auth/identity.js";
import type { RecordScorePayload, AllGameSlug } from "@shared/profile/Scorecard.js";

export const scorecardRouter = Router();

/**
 * PUBLIC — GET /api/profile/:playerId/scorecards
 *
 * Fetches all mode scorecards and personal best records for a player.
 */
scorecardRouter.get("/:playerId/scorecards", (req, res) => {
  const named = req.params.playerId;
  if (!named) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }
  const archive = scorecardService.getScorecards(named);
  res.json({ archive });
});

/**
 * PUBLIC — GET /api/profile/:playerId/scorecards/:game/:mode/ghost
 *
 * Query params: ?currentScore=number
 * Returns real-time Ghost Pace status against player's personal best.
 */
scorecardRouter.get("/:playerId/scorecards/:game/:mode/ghost", (req, res) => {
  const { playerId, game, mode } = req.params;
  const currentScoreRaw = req.query.currentScore;
  const currentScore = typeof currentScoreRaw === "string" ? Number(currentScoreRaw) : 0;

  if (!playerId || !game || !mode) {
    res.status(400).json({ error: "Missing required params: playerId, game, mode" });
    return;
  }

  const ghostPace = scorecardService.getGhostPace(playerId, game as AllGameSlug, mode, currentScore);
  res.json({ ghostPace });
});

/**
 * PRIVATE — POST /api/profile/:playerId/scorecards/record
 *
 * Records a solo/arcade game score (e.g. 2048, Nokia Snake, Nokia Cricket).
 */
scorecardRouter.post("/:playerId/scorecards/record", requireSelfParam(), (req, res) => {
  const named = req.params.playerId;
  const targetId = callerId(req) || named;

  const { game, modeId, score, context, matchId, secondaryMetrics, radarMetrics } = req.body as Partial<RecordScorePayload>;

  if (!game || !modeId || typeof score !== "number") {
    res.status(400).json({ error: "Missing game, modeId, or numeric score" });
    return;
  }

  const result = scorecardService.recordScore(targetId, {
    game,
    modeId,
    score,
    context: context || "SOLO",
    matchId: matchId || `solo_${Date.now()}`,
    secondaryMetrics,
    radarMetrics,
  });

  res.json({ result });
});
