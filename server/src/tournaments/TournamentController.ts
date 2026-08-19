import { Router, type Request, type Response } from "express";
import { tournamentService } from "./TournamentService.js";
import { seasonService } from "../seasons/SeasonService.js";
import { SeasonRewardsEngine } from "../seasons/SeasonRewardsEngine.js";
import {
  requireIdentity,
  requireSelfParam,
  requireTournamentAdmin,
  callerId,
} from "../auth/identity.js";
import type { GameKind } from "@shared/types.js";
import type { TournamentStatus } from "@shared/tournaments/Tournament.js";

/**
 * Tournaments and seasons.
 *
 * ── Three tiers here, not two ─────────────────────────────────────────
 *   PUBLIC  the listing, one tournament, its bracket — a bracket nobody can
 *           read is not a bracket
 *   PLAYER  register, check in — you may enter, as yourself, and only yourself
 *   ADMIN   start a tournament, write a match result
 *
 * The admin tier is the one worth explaining. `POST /:id/start` and
 * `POST /:id/match` decide who advances and who is eliminated, and both were
 * open to anyone with the URL: an anonymous POST could seed a bracket early or
 * declare any player the winner of any match. There is no organiser role in
 * the tournament model to check against — every seeded tournament carries
 * `createdBy: "system"` — so these reuse the deployment's existing operational
 * admin boundary rather than inventing a second one that could disagree with
 * it. See `requireTournamentAdmin`.
 */
export const tournamentRouter = Router();
export const seasonRouter = Router();

/* ────────────────────────── TOURNAMENTS ────────────────────────── */

/** PUBLIC — what is on. */
tournamentRouter.get("/", (req: Request, res: Response) => {
  const game = req.query.game as GameKind | undefined;
  const status = req.query.status as TournamentStatus | undefined;
  res.json({ tournaments: tournamentService.getTournaments({ game, status }) });
});

/**
 * PRIVATE — your own tournament record.
 *
 * Declared before `/:id` on purpose: Express matches in declaration order, and
 * `/:id` would otherwise swallow `/player/...` and treat "player" as an id.
 */
tournamentRouter.get(
  "/player/:playerId/history",
  requireSelfParam(),
  (req: Request, res: Response) => {
    res.json({ history: tournamentService.getPlayerTournamentHistory(callerId(req)) });
  },
);

/** PUBLIC — one tournament. */
tournamentRouter.get("/:id", (req: Request, res: Response) => {
  const t = tournamentService.getTournament(req.params.id);
  if (!t) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }
  res.json({ tournament: t });
});

/** PUBLIC — the bracket. Spectating a bracket is the point of a bracket. */
tournamentRouter.get("/:id/bracket", (req: Request, res: Response) => {
  const bracket = tournamentService.getBracket(req.params.id);
  if (!bracket) {
    res.status(404).json({ error: "Bracket not generated yet" });
    return;
  }
  res.json({ bracket });
});

/**
 * PLAYER — enter, as yourself.
 *
 * `playerId` no longer comes from the body. It used to, so a POST could enrol
 * anyone into anything: fill a bracket with strangers, or register a rival
 * under a name of your choosing. The display name and avatar still come from
 * the body — they are presentation, not identity, and the caller is entitled
 * to choose how they appear.
 */
tournamentRouter.post("/:id/register", requireIdentity, (req: Request, res: Response) => {
  const { displayName, avatar } = req.body ?? {};
  if (!displayName || typeof displayName !== "string") {
    res.status(400).json({ error: "Missing displayName" });
    return;
  }

  const result = tournamentService.registerPlayer(req.params.id, {
    playerId: callerId(req),
    displayName,
    avatar,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

/** PLAYER — check yourself in. Checking someone else in is not a thing. */
tournamentRouter.post("/:id/checkin", requireIdentity, (req: Request, res: Response) => {
  const result = tournamentService.checkInPlayer(req.params.id, callerId(req));
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

/** ADMIN — seed the bracket and begin. */
tournamentRouter.post("/:id/start", requireTournamentAdmin, (req: Request, res: Response) => {
  const result = tournamentService.startTournament(req.params.id);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result);
});

/**
 * ADMIN — record who won a match.
 *
 * Restricted rather than allowed-to-participants because a participant
 * reporting their own result can report themselves the winner, and nothing in
 * the model can contradict them. Attributing results needs either a trusted
 * reporter or a server-observed match; this takes the first, and the second is
 * the better answer once room outcomes feed tournaments directly.
 */
tournamentRouter.post("/:id/match", requireTournamentAdmin, (req: Request, res: Response) => {
  const { matchId, winnerId, score1, score2 } = req.body ?? {};
  if (!matchId || !winnerId) {
    res.status(400).json({ error: "Missing matchId or winnerId" });
    return;
  }
  res.json(tournamentService.reportMatchResult(req.params.id, matchId, winnerId, score1, score2));
});

/* ──────────────────────────── SEASONS ──────────────────────────── */

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
