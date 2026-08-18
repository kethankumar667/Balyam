import { Router } from "express";
import { profileService } from "./ProfileService.js";
import { matchHistoryService } from "./MatchHistoryService.js";
import type { GameKind } from "@shared/types.js";

export const profileRouter = Router();

// GET /api/profile/:playerId
profileRouter.get("/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  const profile = profileService.getOrCreateProfile(playerId);
  res.json({ profile });
});

// PUT /api/profile/:playerId
profileRouter.put("/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  const { displayName, avatar } = req.body;
  const updated = profileService.updateProfile(playerId, { displayName, avatar });
  res.json({ profile: updated });
});

// GET /api/profile/:playerId/stats
profileRouter.get("/:playerId/stats", (req, res) => {
  const playerId = req.params.playerId;
  const stats = profileService.getStats(playerId);
  res.json({ stats });
});

// GET /api/profile/:playerId/matches
profileRouter.get("/:playerId/matches", (req, res) => {
  const playerId = req.params.playerId;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const game = req.query.game as GameKind | undefined;

  const result = matchHistoryService.getMatches(playerId, { limit, offset, game });
  res.json(result);
});

// GET /api/profile/:playerId/matches/:matchId
profileRouter.get("/:playerId/matches/:matchId", (req, res) => {
  const { playerId, matchId } = req.params;
  const detail = matchHistoryService.getMatchDetail(playerId, matchId);
  if (!detail) {
    res.status(404).json({ error: "Match details not found" });
    return;
  }
  res.json({ match: detail });
});

// GET /api/profile/:playerId/achievements
profileRouter.get("/:playerId/achievements", (req, res) => {
  const playerId = req.params.playerId;
  const achievements = profileService.getAchievements(playerId);
  res.json({ achievements });
});
