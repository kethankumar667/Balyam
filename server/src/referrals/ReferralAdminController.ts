import { Router, type Request, type Response } from "express";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { rateLimitByCaller } from "../lib/httpRateLimiter.js";
import { logger } from "../lib/logger.js";
import { checkCampaignPatch, checkNote, type ReferralAdminService } from "./ReferralAdminService.js";

const REWARD_ID = /^[A-Za-z0-9_\-:.]{1,64}$/;
const DEFAULT_PENDING_LIMIT = 50;
const DEFAULT_EVENTS_LIMIT = 30;

/** Who is acting, from the verified credential. Never from the request body. */
function actorOf(req: Request): string {
  const principal = req.operationalPrincipal;
  return principal?.kind === "admin-user" ? `admin:${principal.userId}` : "ops-key";
}

function refuse(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function limitFrom(raw: unknown, fallback: number): number {
  const value = typeof raw === "string" ? Number(raw) : NaN;
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * The referral operator console: `/api/admin/referrals`.
 *
 * Behind the same operational-auth guard as every other admin surface (super admins and the operations key), so
 * nothing here is reachable by a member. Reads are views; the two actions, changing the campaign and withdrawing a
 * pending bonus, each need a written note, are attributed to the verified operator, and are recorded.
 */
export function createReferralAdminRouter(service: ReferralAdminService | null): Router {
  const router = Router();

  router.use(requireOperationalAuth);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use((_req, res, next) => {
    if (!service) refuse(res, 503, "Referrals are not connected in this environment.");
    else next();
  });
  const actionBudget = rateLimitByCaller({ capacity: 10, refillPerSec: 0.2, keyOf: (req) => actorOf(req) });
  const unavailable = (res: Response, what: string, err: unknown) => {
    logger.error({ message: `Referral console could not ${what}: ${String(err)}`, module: "REFERRALS" });
    refuse(res, 503, "That could not be done right now. Nothing was changed.");
  };

  router.get("/overview", async (_req, res) => {
    try { res.json(await service!.overview()); }
    catch (err) { unavailable(res, "read the overview", err); }
  });

  router.get("/pending", async (req, res) => {
    try { res.json({ rewards: await service!.pending(limitFrom(req.query.limit, DEFAULT_PENDING_LIMIT)) }); }
    catch (err) { unavailable(res, "list pending bonuses", err); }
  });

  router.get("/events", async (req, res) => {
    try { res.json({ events: await service!.events(limitFrom(req.query.limit, DEFAULT_EVENTS_LIMIT)) }); }
    catch (err) { unavailable(res, "read the record", err); }
  });

  /** PUT /campaign  { note, changes: { inviterBonus?, inviteeBonus?, rollingCap?, capWindowDays?, codeWindowDays? } } */
  router.put("/campaign", actionBudget, async (req, res) => {
    const body = (req.body ?? {}) as { note?: unknown; changes?: unknown };
    const note = checkNote(body.note);
    if (!note.ok) return refuse(res, 400, note.message);
    const changes = checkCampaignPatch(body.changes);
    if (!changes.ok) return refuse(res, 400, changes.message);
    try {
      const result = await service!.updateCampaign(changes.patch, note.note, actorOf(req));
      if (!result.ok) return refuse(res, 400, result.message);
      res.json({ campaign: result.campaign });
    } catch (err) { unavailable(res, "change the campaign", err); }
  });

  /** POST /rewards/:rewardId/void  { reason }  — withdraws one referral bonus that has not started being paid. */
  router.post("/rewards/:rewardId/void", actionBudget, async (req, res) => {
    const { rewardId } = req.params;
    if (!REWARD_ID.test(rewardId ?? "")) return refuse(res, 400, "That is not a valid reward id.");
    const reason = checkNote((req.body as { reason?: unknown } | undefined)?.reason);
    if (!reason.ok) return refuse(res, 400, reason.message);
    try {
      const result = await service!.voidBonus(rewardId!, reason.note, actorOf(req));
      if (result.ok) return void res.json({ ok: true, logged: result.logged });
      if (result.code === "NOT_FOUND") return refuse(res, 404, "No such bonus.");
      if (result.code === "NOT_REFERRAL") return refuse(res, 400, "That reward is not a referral bonus.");
      refuse(res, 409, `That bonus is ${result.status ?? "already being paid"} and can no longer be withdrawn.`);
    } catch (err) { unavailable(res, "withdraw the bonus", err); }
  });

  return router;
}
