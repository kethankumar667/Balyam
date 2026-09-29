import { Router, type Request, type Response } from "express";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { logger } from "../lib/logger.js";
import type { RewardGateway } from "../rewards/RewardGateway.js";
import type { RewardRepository } from "../rewards/RewardRepository.js";
import type { RiskService } from "../rewards/RiskService.js";
import type { TrustService } from "../rewards/TrustService.js";
import { REASON, isRiskState } from "../rewards/types.js";

/**
 * The operator's view of account risk: who is on a watch, why, and the levers to
 * change it.
 *
 * ── What an operator can and cannot do ────────────────────────────────
 *   set an account's state      any state, either direction, with reason codes
 *   void a PENDING reward       only one that has not started being paid
 *
 * Everything is reversible (set the state back; a voided reward is the one
 * exception, and says so) and everything is attributed: the actor is taken from
 * the verified operational principal, never from the request body, and every
 * change lands in `risk_events` with who, what and why. There is no "ban" and no
 * way to delete an event.
 */

const PLAYER_ID = /^[A-Za-z0-9_\-:.]{1,128}$/;
const MAX_REASON_CODES = 5;
const MAX_CODE_LENGTH = 64;
const MAX_NOTE_LENGTH = 200;

export interface RiskAdminDeps {
  gateway: RewardGateway;
  repository: RewardRepository;
  risk: RiskService;
  trust: TrustService;
}

function actorOf(req: Request): string {
  const principal = req.operationalPrincipal;
  if (principal?.kind === "admin-user") return `admin:${principal.userId}`;
  return "ops-key";
}

function bad(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

export function createRiskAdminRouter(deps: RiskAdminDeps): Router {
  const router = Router();

  router.use(requireOperationalAuth);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  /** GET /api/admin/risk — every account that is not NORMAL, newest change first. */
  router.get("/", (_req, res) => {
    const accounts = deps.risk.listNonNormal();
    const counts = { WATCHLIST: 0, RESTRICTED: 0, UNDER_REVIEW: 0 };
    for (const a of accounts) if (a.state !== "NORMAL") counts[a.state] += 1;
    res.json({ accounts, counts });
  });

  /** GET /api/admin/risk/:playerId — the whole picture for one account. */
  router.get("/:playerId", async (req, res) => {
    const { playerId } = req.params;
    if (!PLAYER_ID.test(playerId ?? "")) return bad(res, "Invalid player id");
    try {
      const [events, rewards, trust] = await Promise.all([
        deps.repository.listRiskEventsForPlayer(playerId!, 50),
        deps.repository.listRewardsForPlayer(playerId!, 30),
        deps.trust.assess(playerId!),
      ]);
      res.json({
        playerId,
        state: deps.risk.getState(playerId!),
        record: deps.risk.getRecord(playerId!) ?? null,
        events,
        rewards,
        trust,
      });
    } catch (err) {
      logger.error({ message: `Risk lookup failed for ${playerId}: ${String(err)}`, module: "RISK" });
      res.status(503).json({ error: "Risk data is temporarily unavailable." });
    }
  });

  /** PUT /api/admin/risk/:playerId  { state, reasonCodes?, note? } */
  router.put("/:playerId", async (req, res) => {
    const { playerId } = req.params;
    if (!PLAYER_ID.test(playerId ?? "")) return bad(res, "Invalid player id");
    const body = (req.body ?? {}) as { state?: unknown; reasonCodes?: unknown; note?: unknown };

    if (!isRiskState(body.state)) return bad(res, "state must be NORMAL, WATCHLIST, RESTRICTED or UNDER_REVIEW");

    let reasonCodes: string[] = [REASON.OPERATOR_SET];
    if (body.reasonCodes !== undefined) {
      if (
        !Array.isArray(body.reasonCodes) ||
        body.reasonCodes.length === 0 ||
        body.reasonCodes.length > MAX_REASON_CODES ||
        !body.reasonCodes.every((c) => typeof c === "string" && c.trim().length > 0 && c.length <= MAX_CODE_LENGTH)
      ) {
        return bad(res, `reasonCodes must be 1 to ${MAX_REASON_CODES} short strings`);
      }
      reasonCodes = (body.reasonCodes as string[]).map((c) => c.trim());
    }
    if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > MAX_NOTE_LENGTH)) {
      return bad(res, `note must be a string of at most ${MAX_NOTE_LENGTH} characters`);
    }
    // Making an account worse needs a written reason: a person is deciding, and the next person has to see why.
    if (body.state !== "NORMAL" && !(typeof body.note === "string" && body.note.trim().length > 0)) {
      return bad(res, "A note is required when restricting or reviewing an account");
    }

    try {
      const record = await deps.risk.setState(playerId!, body.state, {
        reasonCodes,
        actor: actorOf(req),
        note: typeof body.note === "string" ? body.note.trim() : undefined,
      });
      res.json({ record });
    } catch (err) {
      // The store refused (for example: no such player). Memory was not changed.
      logger.error({ message: `Risk state change failed for ${playerId}: ${String(err)}`, module: "RISK" });
      res.status(409).json({ error: "The change could not be recorded. Nothing was changed." });
    }
  });

  /** POST /api/admin/risk/rewards/:rewardId/void  { reason } */
  router.post("/rewards/:rewardId/void", async (req, res) => {
    const { rewardId } = req.params;
    const reason = (req.body as { reason?: unknown } | undefined)?.reason;
    if (typeof rewardId !== "string" || rewardId.length === 0 || rewardId.length > 64) return bad(res, "Invalid reward id");
    if (typeof reason !== "string" || reason.trim().length === 0 || reason.length > MAX_NOTE_LENGTH) {
      return bad(res, `reason is required (at most ${MAX_NOTE_LENGTH} characters)`);
    }

    try {
      const result = await deps.gateway.voidReward(rewardId, reason.trim(), actorOf(req));
      if (result.ok) {
        res.json({ ok: true });
        return;
      }
      if (result.code === "NOT_FOUND") {
        res.status(404).json({ error: "No such reward." });
        return;
      }
      res.status(409).json({ error: `That reward is ${result.status ?? "already being paid"} and can no longer be withdrawn.` });
    } catch (err) {
      logger.error({ message: `Reward void failed for ${rewardId}: ${String(err)}`, module: "REWARDS" });
      res.status(503).json({ error: "Rewards are temporarily unavailable." });
    }
  });

  return router;
}
