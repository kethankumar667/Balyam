import { Router, type Request, type Response, type NextFunction } from "express";
import { requireIdentity } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import { verificationMode } from "../lib/supabaseAuth.js";
import type { ReferralService } from "./ReferralService.js";
import { rateLimitByCaller } from "../lib/httpRateLimiter.js";

export function createReferralRouter(service: ReferralService | null): Router {
  const router = Router();
  router.use((_req, res, next) => {
    if (!service || verificationMode() === "off") {
      res.status(503).json({ message: "Friend invitations are not connected in this build." });
    } else next();
  });
  const member = (req: Request, res: Response, next: NextFunction) => {
    if (req.player?.kind !== "member") {
      res.status(403).json({ message: "Sign in with a verified account to use friend invitations." });
    } else next();
  };
  const failed = (res: Response, err: unknown) => {
    logger.error({ message: `Referral request failed: ${String(err)}`, module: "REFERRALS" });
    res.status(503).json({ message: "Invitations could not be updated. Please try again." });
  };
  const publicBudget = rateLimitByCaller({ capacity: 60, refillPerSec: 1, keyOf: () => "referral-public" });
  const memberBudget = rateLimitByCaller({ capacity: 12, refillPerSec: 0.2, keyOf: req => req.player!.playerId });
  router.get("/invite/:code", publicBudget, async (req, res) => {
    try {
      if (!await service!.preview(req.params.code)) {
        res.status(404).json({ message: "This invitation is no longer available." });
      } else res.json({ valid: true });
    } catch (err) { failed(res, err); }
  });
  router.post("/accept", publicBudget, async (req, res) => {
    try {
      const accepted = await service!.accept(req.body?.code);
      if (!accepted) res.status(400).json({ message: "This invitation is no longer available." });
      else res.json(accepted);
    } catch (err) { failed(res, err); }
  });
  router.post("/attribute", requireIdentity, member, memberBudget, async (req, res) => {
    try { res.json(await service!.attribute(req.player!.playerId, req.body?.token)); }
    catch (err) { failed(res, err); }
  });
  router.post("/sync", requireIdentity, member, memberBudget, async (req, res) => {
    try { res.json(await service!.sync(req.player!.playerId)); }
    catch (err) { failed(res, err); }
  });
  return router;
}
