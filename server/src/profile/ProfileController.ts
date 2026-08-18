import { Router } from "express";
import { profileService } from "./ProfileService.js";
import { matchHistoryService } from "./MatchHistoryService.js";
import { requireSelfParam, callerId } from "../auth/identity.js";
import type { GameKind } from "@shared/types.js";

/**
 * Player profiles.
 *
 * ── What each route decided, and why ──────────────────────────────────
 * The split is between what a leaderboard legitimately shows about a stranger
 * and what belongs only to the person it is about.
 *
 *   PUBLIC   the profile card and career totals — a leaderboard row IS this
 *            data, and hiding it would break the product rather than fix it
 *   PRIVATE  match history, individual match detail, achievements — who you
 *            played with and when you played is not leaderboard material
 *
 * Every private route carries `requireSelfParam()`, so `:playerId` names a
 * record and never proves who is asking for it.
 */
export const profileRouter = Router();

/**
 * PUBLIC — GET /api/profile/:playerId
 *
 * Read-only for strangers, and that is a change: this used to call
 * `getOrCreateProfile` for everyone, so a GET for an id that did not exist
 * CREATED it. An anonymous loop over made-up ids would fill the profile table,
 * and the writer never had to prove anything. A read that creates is not a
 * read — unless you are reading your own, which is how a new player gets a row.
 */
profileRouter.get("/:playerId", (req, res) => {
  const named = req.params.playerId;
  const existing = profileService.getProfile(named);
  if (existing) {
    res.json({ profile: existing });
    return;
  }
  // Creating on first read is fine for the person the profile is ABOUT — it is
  // how a new player gets a row at all, and they could create it with a PUT a
  // moment later regardless. It is not fine for anyone else, which is the only
  // thing that changed.
  if (req.player?.playerId === named) {
    res.json({ profile: profileService.getOrCreateProfile(named) });
    return;
  }
  res.status(404).json({ error: "No profile for that player" });
});

/**
 * PRIVATE — PUT /api/profile/:playerId
 *
 * The route the baseline exploited: anonymous, it renamed another player's
 * profile to "PWNED" and returned the mutated record. Now the caller must BE
 * the named player, and the id written is the verified one rather than the one
 * in the path — so even a mismatch that slipped past the guard could not
 * address a stranger's row.
 */
profileRouter.put("/:playerId", requireSelfParam(), (req, res) => {
  const { displayName, avatar } = req.body ?? {};
  const updated = profileService.updateProfile(callerId(req), { displayName, avatar });
  res.json({ profile: updated });
});

/** PUBLIC — career totals. These are what a leaderboard row is made of. */
profileRouter.get("/:playerId/stats", (req, res) => {
  res.json({ stats: profileService.getStats(req.params.playerId) });
});

/** PRIVATE — who you played, and when. */
profileRouter.get("/:playerId/matches", requireSelfParam(), (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const game = req.query.game as GameKind | undefined;

  res.json(matchHistoryService.getMatches(callerId(req), { limit, offset, game }));
});

/** PRIVATE — one match, in full. */
profileRouter.get("/:playerId/matches/:matchId", requireSelfParam(), (req, res) => {
  const detail = matchHistoryService.getMatchDetail(callerId(req), req.params.matchId);
  if (!detail) {
    res.status(404).json({ error: "Match details not found" });
    return;
  }
  res.json({ match: detail });
});

/**
 * PRIVATE — achievements, including the ones still in progress.
 *
 * Progress toward an unearned achievement says what someone has been playing
 * and how much, which is not something a stranger gets to enumerate. Only the
 * profile screen reads this, and it reads its own.
 */
profileRouter.get("/:playerId/achievements", requireSelfParam(), (req, res) => {
  res.json({ achievements: profileService.getAchievements(callerId(req)) });
});
