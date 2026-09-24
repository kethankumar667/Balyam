import { Router, type Request, type Response } from "express";
import { isReportReason } from "@shared/social/Report.js";
import { requireIdentity, requireSelfParam, callerId } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import { blockActionLimiter, reportLimiters } from "./blockLimiters.js";
import { blockService } from "./BlockService.js";
import { isKnownPlayer } from "./knownPlayer.js";
import { MAX_PLAYER_ID_LENGTH } from "./limits.js";
import { UNABLE_TO_BLOCK, UNABLE_TO_REPORT } from "./refusals.js";
import { reportService } from "./ReportService.js";

/**
 * Blocking and reporting.
 *
 * The caller is always the verified caller: no request body names a blocker or
 * a reporter, and one that tries is simply not read. The person acted on is
 * named by id, and that id is checked twice — its SHAPE here (a client sent
 * it), and that the server has actually seen such a player.
 *
 * ── What a refusal never says ─────────────────────────────────────────
 * "Yourself" and "nobody by that id" get the same words, so the endpoint
 * cannot be used to ask whether an id exists. Nothing returned to anyone but
 * the blocker mentions a block.
 */
const router = Router();

/** Shape only. Player ids are `p_…`, UUIDs and `guest_…` — none needs a space, slash or dot-dot. */
const PLAYER_ID_PATTERN = /^[A-Za-z0-9_.:@-]+$/;

function parsePlayerId(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PLAYER_ID_LENGTH) return null;
  return PLAYER_ID_PATTERN.test(value) && !value.includes("..") ? value : null;
}

const INVALID_TARGET = "Missing or invalid targetId";
const SERVER_ERROR = "Something went wrong. Please try again.";

function failed(res: Response, who: string, action: string, err: unknown): void {
  // Ids only: never the body, a name or a token.
  logger.error({
    message: `${action} failed for ${who}: ${err instanceof Error ? err.message : String(err)}`,
    module: "SOCIAL",
  });
  res.status(500).json({ success: false, error: SERVER_ERROR });
}

/** PRIVATE — the players YOU have blocked. Nobody else can read this list. */
router.get("/blocks/:playerId", requireSelfParam(), (req: Request, res: Response) => {
  res.json({ success: true, blocked: blockService.listBlocked(callerId(req)) });
});

/** PRIVATE — block a player. Idempotent. */
router.post(
  "/blocks",
  requireIdentity,
  blockActionLimiter,
  async (req: Request, res: Response) => {
    const targetId = parsePlayerId((req.body ?? {}).targetId);
    if (!targetId) {
      res.status(400).json({ success: false, error: INVALID_TARGET });
      return;
    }

    const me = callerId(req);
    try {
      if (targetId === me || !(await isKnownPlayer(targetId))) {
        res.status(400).json({ success: false, error: UNABLE_TO_BLOCK });
        return;
      }
      const result = blockService.block(me, targetId);
      if (!result.ok) {
        const error = result.code === "LIMIT_REACHED" ? "Your block list is full" : UNABLE_TO_BLOCK;
        res.status(400).json({ success: false, error });
        return;
      }
      res.json({ success: true, alreadyBlocked: result.alreadyBlocked });
    } catch (err) {
      failed(res, me, "Block", err);
    }
  },
);

/** PRIVATE — lift YOUR block on a player. Shares the block rate limit. */
router.delete(
  "/blocks/:targetId",
  requireIdentity,
  blockActionLimiter,
  (req: Request, res: Response) => {
    const targetId = parsePlayerId(req.params.targetId);
    if (!targetId) {
      res.status(400).json({ success: false, error: INVALID_TARGET });
      return;
    }
    res.json({ success: true, removed: blockService.unblock(callerId(req), targetId) });
  },
);

/**
 * PRIVATE — report a player, for one of a fixed list of reasons.
 *
 * There is no free text and no evidence field: a note about another person is
 * personal data a report does not need to be actionable. Reporting does not
 * depend on any relationship — someone who has been blocked by the person they
 * are reporting can still report them.
 */
router.post("/reports", requireIdentity, ...reportLimiters, async (req: Request, res: Response) => {
  const { targetId: rawTarget, reason } = req.body ?? {};
  const targetId = parsePlayerId(rawTarget);
  if (!targetId) {
    res.status(400).json({ success: false, error: INVALID_TARGET });
    return;
  }
  if (!isReportReason(reason)) {
    // Not echoed: what a client sent as a "reason" is not repeated back to it.
    res.status(400).json({ success: false, error: "Invalid reason" });
    return;
  }

  const me = callerId(req);
  try {
    if (targetId === me || !(await isKnownPlayer(targetId))) {
      res.status(400).json({ success: false, error: UNABLE_TO_REPORT });
      return;
    }
    reportService.submit(me, targetId, reason);
    res.json({ success: true });
  } catch (err) {
    failed(res, me, "Report", err);
  }
});

export default router;
