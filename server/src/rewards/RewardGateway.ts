import { nanoid } from "nanoid";
import { logger } from "../lib/logger.js";
import type { PlayerIdentityKind, WalletLedgerEntryType } from "../persistence/EconomyRepository.js";
import type { RewardRepository } from "./RewardRepository.js";
import type { RiskService } from "./RiskService.js";
import type { TrustService } from "./TrustService.js";
import {
  REASON,
  type ReasonCode,
  type RewardRecord,
  type RewardType,
  type RiskState,
  type TrustTier,
} from "./types.js";

/**
 * The one door coins come through.
 *
 *   game / event  ->  RewardGateway  ->  risk check  ->  reward_ledger  ->  wallet
 *
 * ── Why a gateway and not a helper ────────────────────────────────────
 * Level milestones and daily streaks each used to call the wallet's admin
 * credit directly, each with its own idea of "already paid", "who is allowed"
 * and "what if the wallet is down". Every rule added later (vesting, a pause, a
 * cap) would have had to be added to each, and the one somebody forgot would be
 * the hole. Here there is one place: a reward is a ROW first, with a reason and
 * a risk state on it, and reaches the wallet only by being released from that
 * row. Nothing else in the server credits coins for playing.
 *
 * ── Vesting ───────────────────────────────────────────────────────────
 * A reward waits 24 hours before it is paid: long enough for the daily risk
 * checks to look, short enough not to feel like punishment. A trusted member's
 * small daily streak reward is the one thing paid at once — a delay on a daily
 * login gift would be felt every single day, and the accounts that farm it are
 * exactly the new, low-trust ones the delay still applies to.
 *
 * ── Never paid twice, never lost ──────────────────────────────────────
 * Paying is PENDING -> RELEASING -> RELEASED, each step an atomic guarded
 * transition in the store, with the wallet credit in the middle keyed on the
 * reward id. A crash after the credit and before the last step leaves RELEASING;
 * the sweeper redrives it after a lease, and the wallet's idempotency key makes
 * the second credit a no-op. An operator can void only what has not started
 * being paid, so a void can never race a payment into a clawback.
 */

export const VESTING_MS = 24 * 60 * 60 * 1_000;
/** A restricted account's rewards wait longer, and the player can see that they are waiting. */
export const RESTRICTED_VESTING_MS = 72 * 60 * 60 * 1_000;
/** How long a RELEASING claim may sit before the sweeper assumes it died and redrives it. */
export const RELEASE_CLAIM_LEASE_MS = 5 * 60 * 1_000;
export const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH = 100;
const MAX_SWEEP_BATCHES = 10;

/** The slice of the economy this gateway needs, so it can be tested without a wallet backend. */
export interface RewardEconomy {
  ensureIdentityRegistered(identityId: string, kind: PlayerIdentityKind): Promise<void>;
  adminAdjustWallet(input: {
    identityId: string;
    amountCoins: string;
    adminPrincipalId: string;
    reason: string;
    idempotencyKey: string;
    entryType?: WalletLedgerEntryType;
  }): Promise<{ applied: boolean }>;
  getLedger(identityId: string, opts?: { limit?: number }): Promise<Array<{ id: number; idempotencyKey: string }>>;
}

export interface GrantRequest {
  playerId: string;
  identityKind: PlayerIdentityKind;
  rewardType: RewardType;
  reasonCode: ReasonCode;
  /** Coins, a positive whole number. */
  amount: number;
  /** What earned it: `level:5`, or the UTC date of a streak day. With `rewardType` it is the idempotency key. */
  sourceId: string;
  description: string;
}

export type GrantResult =
  | { ok: true; duplicate: boolean; record: RewardRecord }
  | { ok: false; code: ReasonCode; message: string };

export interface RewardGatewayDeps {
  economy: RewardEconomy | null;
  repository: RewardRepository;
  risk: RiskService;
  trust: TrustService;
  now?: () => number;
  /** How long risk audit events are kept. 0 keeps them forever. Defaults to a year. */
  riskEventRetentionMs?: number;
}

interface PayoutShape {
  entryType: WalletLedgerEntryType;
  principal: string;
}

/** How each reward type appears in the wallet ledger and in the audit trail. */
function payoutShape(type: RewardType): PayoutShape {
  switch (type) {
    case "DAILY_STREAK":
      return { entryType: "DAILY_REWARD_CREDIT", principal: "system:daily_streak" };
    case "LEVEL_MILESTONE":
      return { entryType: "ADMIN_ADJUSTMENT", principal: "system:level_milestone" };
    case "HOURLY_FAUCET":
      return { entryType: "ADMIN_ADJUSTMENT", principal: "system:hourly_faucet" };
    default:
      return { entryType: "ADMIN_ADJUSTMENT", principal: `system:${type.toLowerCase()}` };
  }
}

/** How long risk audit events are kept by default. Set with the privacy notice; see the runbook. */
export const RISK_EVENT_RETENTION_MS = 365 * 86_400_000;
const PURGE_INTERVAL_MS = 86_400_000;

export class RewardGateway {
  private readonly economy: RewardEconomy | null;
  private readonly repository: RewardRepository;
  private readonly risk: RiskService;
  private readonly trust: TrustService;
  private readonly now: () => number;
  private timer: NodeJS.Timeout | null = null;
  private sweeping: Promise<void> | null = null;
  private readonly riskEventRetentionMs: number;
  private lastPurgeAt = 0;

  constructor(deps: RewardGatewayDeps) {
    this.economy = deps.economy;
    this.repository = deps.repository;
    this.risk = deps.risk;
    this.trust = deps.trust;
    this.now = deps.now ?? Date.now;
    this.riskEventRetentionMs = deps.riskEventRetentionMs ?? RISK_EVENT_RETENTION_MS;
  }

  /** How long a reward waits before it is paid. Pure, so the policy can be read and tested on its own. */
  vestingFor(type: RewardType, tier: TrustTier, state: RiskState): number {
    if (state === "RESTRICTED") return RESTRICTED_VESTING_MS;
    if (type === "DAILY_STREAK" && tier >= 2 && state === "NORMAL") return 0;
    // The hourly faucet is a small gift meant to be spent in the next few minutes; a day's wait would
    // defeat it. What stops farming is the transfer cap and the account's standing, not a delay here.
    if (type === "HOURLY_FAUCET" && state === "NORMAL") return 0;
    return VESTING_MS;
  }

  async grantCoins(req: GrantRequest): Promise<GrantResult> {
    if (!this.economy) {
      return { ok: false, code: REASON.NO_ECONOMY, message: "Coin rewards are temporarily unavailable. Try again later." };
    }
    if (!Number.isInteger(req.amount) || req.amount <= 0) {
      throw new Error(`A coin reward must be a positive whole number, got ${req.amount}`);
    }

    const state = this.risk.getState(req.playerId);
    if (state === "UNDER_REVIEW") {
      return {
        ok: false,
        code: REASON.RISK_UNDER_REVIEW,
        message: "Rewards are paused while your account is being reviewed.",
      };
    }

    try {
      const tier = await this.trust.tierOf(req.playerId);
      const earnedAt = this.now();
      const record: RewardRecord = {
        rewardId: `rwd_${nanoid(16)}`,
        playerId: req.playerId,
        rewardType: req.rewardType,
        reasonCode: req.reasonCode,
        amount: req.amount,
        sourceId: req.sourceId,
        earnedAt,
        vestingUntil: earnedAt + this.vestingFor(req.rewardType, tier, state),
        status: "PENDING",
        riskState: state,
        ledgerEntryId: null,
        releaseStartedAt: null,
        releasedAt: null,
        voidedReason: null,
        description: req.description,
      };

      // The identity row must exist before a reward can reference it; harmless if it already does.
      await this.economy.ensureIdentityRegistered(req.playerId, req.identityKind);
      const inserted = await this.repository.insertReward(record);
      if (!inserted.inserted) return { ok: true, duplicate: true, record: inserted.record };

      // Nothing to wait for: pay now. If that fails the row stays PENDING and the sweeper pays it.
      if (record.vestingUntil <= earnedAt) await this.pay(inserted.record);

      return { ok: true, duplicate: false, record: (await this.repository.getReward(record.rewardId)) ?? inserted.record };
    } catch (err) {
      logger.error({
        message: `Reward grant failed for ${req.playerId} (${req.rewardType}/${req.sourceId}): ${err instanceof Error ? err.message : String(err)}`,
        module: "REWARDS",
      });
      return {
        ok: false,
        code: REASON.REWARD_STORE_UNAVAILABLE,
        message: "Rewards are temporarily unavailable. Try again in a moment.",
      };
    }
  }

  /** Pay every reward that has finished vesting. Returns what happened, for the log and for tests. */
  async releaseDue(): Promise<{ released: number; heldForReview: number; failed: number }> {
    const totals = { released: 0, heldForReview: 0, failed: 0 };
    for (let batch = 0; batch < MAX_SWEEP_BATCHES; batch++) {
      const now = this.now();
      const due = await this.repository.listDueForRelease(now, now - RELEASE_CLAIM_LEASE_MS, SWEEP_BATCH);
      if (due.length === 0) break;

      let progressed = false;
      for (const record of due) {
        // An account under review is paid nothing until a person clears it; the reward waits, it is not lost.
        if (this.risk.getState(record.playerId) === "UNDER_REVIEW") {
          totals.heldForReview += 1;
          continue;
        }
        if (await this.pay(record)) {
          totals.released += 1;
          progressed = true;
        } else {
          totals.failed += 1;
        }
      }
      // A full batch of held or failing rewards must not spin: stop when nothing moved.
      if (!progressed || due.length < SWEEP_BATCH) break;
    }
    return totals;
  }

  /** Claim, credit, complete. Returns false if someone else has it or the credit failed (redriven later). */
  private async pay(record: RewardRecord): Promise<boolean> {
    const economy = this.economy;
    if (!economy) return false;
    const now = this.now();
    if (!(await this.repository.claimForRelease(record.rewardId, now, now - RELEASE_CLAIM_LEASE_MS))) return false;

    const key = `reward:${record.rewardId}`;
    const shape = payoutShape(record.rewardType);
    try {
      await economy.adminAdjustWallet({
        identityId: record.playerId,
        amountCoins: String(record.amount),
        adminPrincipalId: shape.principal,
        reason: record.description,
        idempotencyKey: key,
        entryType: shape.entryType,
      });
      const entries = await economy.getLedger(record.playerId, { limit: 20 });
      const ledgerEntryId = entries.find((e) => e.idempotencyKey === key)?.id ?? null;
      await this.repository.completeRelease(record.rewardId, ledgerEntryId, this.now());
      return true;
    } catch (err) {
      // Left RELEASING on purpose: the credit may or may not have landed, and the
      // idempotency key makes re-driving it after the lease safe either way.
      logger.error({
        message: `Reward ${record.rewardId} payment did not complete: ${err instanceof Error ? err.message : String(err)}`,
        module: "REWARDS",
      });
      return false;
    }
  }

  /** An operator withdraws a reward that has not started being paid. Reversible only by a fresh grant. */
  async voidReward(
    rewardId: string,
    reason: string,
    actor: string,
  ): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" | "NOT_PENDING"; status?: string }> {
    const record = await this.repository.getReward(rewardId);
    if (!record) return { ok: false, code: "NOT_FOUND" };
    if (!(await this.repository.voidPending(rewardId, reason, this.now()))) {
      return { ok: false, code: "NOT_PENDING", status: record.status };
    }
    await this.repository.appendRiskEvent({
      playerId: record.playerId,
      kind: "REWARD_VOIDED",
      reasonCode: REASON.OPERATOR_VOID,
      detail: { rewardId, amount: record.amount, rewardType: record.rewardType, actor, note: reason },
      createdAt: this.now(),
    });
    return { ok: true };
  }

  listForPlayer(playerId: string, limit = 20): Promise<RewardRecord[]> {
    return this.repository.listRewardsForPlayer(playerId, limit);
  }

  /** The player's newest reward of one type, however many of other types came after it. */
  latestOfType(playerId: string, type: RewardType): Promise<RewardRecord | null> {
    return this.repository.latestRewardOfType(playerId, type);
  }

  /** One sweep: pay what is due, let stale system watches lapse. Overlapping calls share one run. */
  sweep(): Promise<void> {
    if (this.sweeping) return this.sweeping;
    this.sweeping = (async () => {
      try {
        const result = await this.releaseDue();
        this.risk.expireStaleWatchlist(this.now());
        await this.purgeOldRiskEvents();
        if (result.released > 0 || result.failed > 0) {
          logger.info({
            message: `Reward sweep: released ${result.released}, held for review ${result.heldForReview}, failed ${result.failed}`,
            module: "REWARDS",
          });
        }
      } catch (err) {
        logger.error({ message: `Reward sweep failed: ${err instanceof Error ? err.message : String(err)}`, module: "REWARDS" });
      } finally {
        this.sweeping = null;
      }
    })();
    return this.sweeping;
  }

  /** Audit events are kept for a set time, not forever: this runs at most once a day. */
  private async purgeOldRiskEvents(): Promise<void> {
    const now = this.now();
    if (this.riskEventRetentionMs <= 0 || now - this.lastPurgeAt < PURGE_INTERVAL_MS) return;
    this.lastPurgeAt = now;
    try {
      await this.repository.purgeRiskEventsBefore(now - this.riskEventRetentionMs);
    } catch (err) {
      // Retried at the next sweep after the interval; never blocks paying rewards.
      this.lastPurgeAt = 0;
      logger.error({ message: `Risk event purge failed: ${err instanceof Error ? err.message : String(err)}`, module: "REWARDS" });
    }
  }

  startSweeper(intervalMs: number = SWEEP_INTERVAL_MS): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.sweep(), intervalMs);
    this.timer.unref?.();
  }

  stopSweeper(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** For graceful shutdown: let a sweep already in flight finish. */
  async drain(): Promise<void> {
    await this.sweeping;
  }
}
