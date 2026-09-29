import { Router } from "express";
import { callerId, requireSelfParam } from "../auth/identity.js";
import { logger } from "../lib/logger.js";
import type { RewardGateway } from "./RewardGateway.js";
import type { RiskService } from "./RiskService.js";
import { DAILY_TRANSFER_CAP_BY_TIER, type TrustService } from "./TrustService.js";
import type { TransferPolicy } from "./TransferPolicy.js";
import type { RewardRecord, RiskState } from "./types.js";

/**
 * What a player may see of their own rewards and standing. Self-only: a
 * pending reward and a trust checklist are about one person and nobody else's
 * business, so every route carries `requireSelfParam()`.
 *
 * ── What is deliberately NOT shown ────────────────────────────────────
 * A WATCHLIST account is not told: the effect there is only that some XP is
 * practice XP, and announcing a watch to the account it concerns would just
 * teach a farmer where the line is. RESTRICTED and UNDER_REVIEW are different —
 * coins are being held or sending is off — and hiding those would be dishonest,
 * so they are shown, with what to do about it.
 */

export interface RewardDto {
  rewardId: string;
  rewardType: RewardRecord["rewardType"];
  reasonCode: string;
  amount: number;
  status: RewardRecord["status"];
  earnedAt: number;
  vestingUntil: number;
  description: string;
  /** What earned it (`level:5`, a streak day). Lets the app tie a pending reward back to its milestone. */
  sourceId: string;
}

export interface StandingDto {
  state: Extract<RiskState, "RESTRICTED" | "UNDER_REVIEW">;
  message: string;
}

const toDto = (r: RewardRecord): RewardDto => ({
  rewardId: r.rewardId,
  rewardType: r.rewardType,
  reasonCode: r.reasonCode,
  amount: r.amount,
  status: r.status,
  earnedAt: r.earnedAt,
  vestingUntil: r.vestingUntil,
  description: r.description,
  sourceId: r.sourceId,
});

/** The visible face of a risk state: only the two that change what the player can do. */
export function standingFor(state: RiskState): StandingDto | null {
  if (state === "UNDER_REVIEW") {
    return {
      state,
      message: "Your rewards are paused while your account is being reviewed. Contact support if you think this is a mistake.",
    };
  }
  if (state === "RESTRICTED") {
    return {
      state,
      message: "Your rewards take longer to arrive and you cannot send coins right now. Contact support if you think this is a mistake.",
    };
  }
  return null;
}

export interface RewardsRouterDeps {
  gateway: RewardGateway;
  trust: TrustService;
  risk: RiskService;
  transferPolicy?: TransferPolicy | null;
}

export function createRewardsRouter(deps: RewardsRouterDeps): Router {
  const router = Router();

  /** GET /api/rewards/:playerId — recent rewards (pending ones first) and any visible standing. */
  router.get("/:playerId", requireSelfParam(), async (req, res) => {
    const playerId = callerId(req);
    try {
      const records = await deps.gateway.listForPlayer(playerId, 30);
      const onItsWay = (r: RewardDto): number => Number(r.status === "PENDING" || r.status === "RELEASING");
      // What is still on its way matters most, so it leads.
      const rewards = records.map(toDto).sort((a, b) => onItsWay(b) - onItsWay(a) || b.earnedAt - a.earnedAt);
      res.json({ rewards, standing: standingFor(deps.risk.getState(playerId)) });
    } catch (err) {
      logger.error({ message: `Could not list rewards for ${playerId}: ${String(err)}`, module: "REWARDS" });
      res.status(503).json({ error: "Rewards are temporarily unavailable." });
    }
  });

  /** GET /api/rewards/:playerId/trust — the tier, and every criterion behind it. */
  router.get("/:playerId/trust", requireSelfParam(), async (req, res) => {
    const playerId = callerId(req);
    let assessment;
    try {
      assessment = await deps.trust.assess(playerId);
    } catch (err) {
      logger.error({
        message: `Could not assess trust for ${playerId}: ${err instanceof Error ? err.message : String(err)}`,
        module: "REWARDS",
      });
      res.status(503).json({ error: "Trust details are temporarily unavailable." });
      return;
    }
    let sentToday: number | null = null;
    try {
      sentToday = deps.transferPolicy ? await deps.transferPolicy.sentToday(playerId) : null;
    } catch {
      sentToday = null;
    }
    res.json({
      trust: assessment,
      transfer: { dailyCap: DAILY_TRANSFER_CAP_BY_TIER[assessment.tier], sentToday },
      standing: standingFor(deps.risk.getState(playerId)),
    });
  });

  return router;
}
