import { Router, type Request, type Response } from "express";
import { callerId, requireIdentity } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import type { HourlyFaucetService } from "./HourlyFaucetService.js";

/**
 * The hourly coin faucet over HTTP.
 *
 *   GET  /api/faucet        can the caller claim, and if not, when
 *   POST /api/faucet/claim  claim now
 *
 * Like the streak, a refusal that is part of the game (too early, a guest) is a 200
 * with `ok: false` and a stable code: the app shows a countdown or a sign-in
 * nudge, not an error. Only a genuine failure is a 500. The body of a POST is never
 * read: the amount, the clock and the player are all the server's.
 */
export function createFaucetRouter(service: HourlyFaucetService): Router {
  const router = Router();

  router.get("/", requireIdentity, async (req: Request, res: Response) => {
    try {
      res.json(await service.status(callerId(req), req.player!.kind));
    } catch (err) {
      logger.error({ message: `GET /api/faucet failed: ${String(err)}`, module: "FAUCET_API" });
      res.status(500).json({ error: "Internal Server Error", message: "Failed to load free coins. Please try again." });
    }
  });

  router.post("/claim", requireIdentity, async (req: Request, res: Response) => {
    try {
      res.json(await service.claim(callerId(req), req.player!.kind));
    } catch (err) {
      logger.error({ message: `POST /api/faucet/claim failed: ${String(err)}`, module: "FAUCET_API" });
      res.status(500).json({ error: "Internal Server Error", message: "Failed to claim free coins. Please try again." });
    }
  });

  return router;
}
