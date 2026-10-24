import { Router } from "express";
import { scorecardService } from "./ScorecardService.js";
import { requireSelfParam, callerId } from "../auth/identity.js";
import { validateRecordScorePayload } from "./scoreValidation.js";
import { rateLimitByCaller } from "../lib/httpRateLimiter.js";
import type { RecordScorePayload, AllGameSlug } from "@shared/profile/Scorecard.js";
import { persistScorecard, readPersistedScorecards } from "./scorecardPersistence.js";
import { progressionSync } from "../persistence/ProgressionSync.js";
import { logger } from "../lib/logger.js";
import { randomUUID } from "node:crypto";

export const scorecardRouter = Router();

/**
 * PUBLIC — GET /api/profile/:playerId/scorecards
 *
 * Fetches all mode scorecards and personal best records for a player.
 */
scorecardRouter.get("/:playerId/scorecards", async (req, res) => {
  const named = req.params.playerId;
  if (!named) {
    res.status(400).json({ error: "Missing playerId" });
    return;
  }
  try {
    const archive = await progressionSync.afterPending(async () => {
      await progressionSync.retryPendingScorecards(named);
      return readPersistedScorecards(named);
    });
    scorecardService.restoreArchive(archive);
    res.setHeader("Cache-Control", "no-store");
    res.json({ archive });
  } catch (error) {
    logger.error({ module: "SCORECARDS", message: `Failed to load account records: ${String(error)}` });
    res.status(503).json({ error: "Account records are temporarily unavailable. Please retry." });
  }
});

/**
 * PUBLIC — GET /api/profile/:playerId/scorecards/:game/:mode/ghost
 *
 * Query params: ?currentScore=number
 * Returns real-time Ghost Pace status against player's personal best.
 */
scorecardRouter.get("/:playerId/scorecards/:game/:mode/ghost", async (req, res) => {
  const { playerId, game, mode } = req.params;
  const currentScoreRaw = req.query.currentScore;
  const currentScore = typeof currentScoreRaw === "string" ? Number(currentScoreRaw) : 0;

  if (!playerId || !game || !mode) {
    res.status(400).json({ error: "Missing required params: playerId, game, mode" });
    return;
  }

  try {
    const archive = await progressionSync.afterPending(async () => {
      await progressionSync.retryPendingScorecards(playerId);
      return readPersistedScorecards(playerId);
    });
    scorecardService.restoreArchive(archive);
    const ghostPace = scorecardService.getGhostPace(playerId, game as AllGameSlug, mode, currentScore);
    res.setHeader("Cache-Control", "no-store");
    res.json({ ghostPace });
  } catch (error) {
    logger.error({ module: "SCORECARDS", message: `Failed to load record pace: ${String(error)}` });
    res.status(503).json({ error: "Account records are temporarily unavailable. Please retry." });
  }
});

/**
 * PRIVATE — POST /api/profile/:playerId/scorecards/record
 *
 * Records a solo/arcade game score (e.g. 2048, Retro Snake, Retro Cricket).
 */
// A solo game records once per finished run, so 30 in a burst refilling at one
// every two seconds is generous for a real player and stops a script from
// replaying scores (which inflates play counts and foil tiers) or growing
// the stored archive.
const recordRateLimit = rateLimitByCaller({
  capacity: 30,
  refillPerSec: 0.5,
  keyOf: (req) => callerId(req) ?? req.ip ?? "anonymous",
});

scorecardRouter.post("/:playerId/scorecards/record", requireSelfParam(), recordRateLimit, async (req, res) => {
  const named = req.params.playerId;
  const targetId = callerId(req) || named;

  const validation = validateRecordScorePayload(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const { game, modeId, score, context, matchId, secondaryMetrics, radarMetrics } = req.body as RecordScorePayload;

  try {
    const result = await progressionSync.afterPending(() => persistScorecard(targetId, {
      game, modeId, score, context: context || "SOLO",
      matchId: matchId || `solo_${randomUUID()}`, secondaryMetrics, radarMetrics,
    }));
    scorecardService.restoreArchive(await progressionSync.afterPending(() => readPersistedScorecards(targetId)));
    res.json({ result });
  } catch (error) {
    logger.error({ module: "SCORECARDS", message: `Failed to save account record: ${String(error)}` });
    res.status(503).json({ error: "Your account record could not be saved. Please retry." });
  }
});
