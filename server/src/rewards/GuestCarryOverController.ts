import { Router, type Request, type Response } from "express";
import { callerId, requireMember } from "../auth/identity.js";
import { verifyGuestToken } from "../auth/guestToken.js";
import { logger } from "../lib/logger.js";
import type { GuestCarryOverService } from "./GuestCarryOverService.js";

/**
 * A guest's coins, brought to the account they just made.
 *
 *   GET  /api/carryover        what came over and whether the upgrade bonus is claimable
 *   POST /api/carryover/claim  bring the guest on this device over  { guestToken }
 *   POST /api/carryover/bonus  claim the upgrade bonus once a real match is done
 *
 * Both halves of the claim are proved on the server: the account by the bearer token
 * (`requireMember`), the guest by its own signed token in the body. A guest id read from
 * a body or a URL would let anyone drain anyone's wallet. A refusal that is part of the
 * flow (not confirmed yet, already done) is a 200 with `ok: false` and a stable code.
 */
export function createCarryOverRouter(service: GuestCarryOverService): Router {
  const router = Router();

  const fail = (res: Response, route: string, err: unknown, message: string): void => {
    logger.error({ message: `${route} failed: ${String(err)}`, module: "CARRYOVER_API" });
    res.status(500).json({ error: "Internal Server Error", message });
  };

  router.get("/", requireMember, async (req: Request, res: Response) => {
    try {
      res.json(await service.status(callerId(req)));
    } catch (err) {
      fail(res, "GET /api/carryover", err, "Failed to load your coins. Please try again.");
    }
  });

  router.post("/claim", requireMember, async (req: Request, res: Response) => {
    try {
      const token = (req.body as { guestToken?: unknown } | undefined)?.guestToken;
      const guestId = typeof token === "string" ? verifyGuestToken(token) : null;
      res.json(await service.carryOver(callerId(req), guestId));
    } catch (err) {
      fail(res, "POST /api/carryover/claim", err, "Failed to bring your coins over. Please try again.");
    }
  });

  router.post("/bonus", requireMember, async (req: Request, res: Response) => {
    try {
      res.json(await service.claimBonus(callerId(req)));
    } catch (err) {
      fail(res, "POST /api/carryover/bonus", err, "Failed to claim your bonus. Please try again.");
    }
  });

  return router;
}
