import {
  FAUCET_AMOUNT_COINS,
  FAUCET_COOLDOWN_MS,
  type FaucetClaimResult,
  type FaucetStatus,
} from "@shared/faucet.js";
import type { RewardGateway } from "./RewardGateway.js";
import { REASON, type RewardRecord } from "./types.js";

/**
 * The hourly coin faucet: 100 coins, then a four-hour wait that starts at the claim.
 *
 * ── No table of its own ───────────────────────────────────────────────
 * A claim is an ordinary `HOURLY_FAUCET` row in the reward ledger, so it inherits
 * everything the gateway already guarantees: a reason code, the player's risk state
 * on the row, the standing checks, and one idempotent wallet credit. "When did they
 * last claim?" is simply the newest such row.
 *
 * ── Two claims at the same instant ────────────────────────────────────
 * The ledger refuses a second row with the same (player, type, source). The source
 * of a claim names the claim before it (`after:<previous reward id>`, or `first`),
 * so two requests that both see the same previous claim build the same source and
 * only one is inserted. The loser is told to wait, exactly like a claim made a
 * moment too early; it is never paid and never an error.
 *
 * ── The server's clock decides ────────────────────────────────────────
 * Nothing from the client is read: not a time, not an amount. The answer carries
 * `serverNow` so the countdown on screen does not depend on the device clock.
 */

const MESSAGES = {
  NOT_MEMBER: "Sign in to claim free coins.",
  COOLDOWN: "Your next free coins aren't ready yet.",
  UNDER_REVIEW: "Rewards are paused while your account is being reviewed.",
  UNAVAILABLE: "Free coins are temporarily unavailable. Try again in a moment.",
} as const;

export interface HourlyFaucetDeps {
  gateway: RewardGateway;
  now?: () => number;
}

export class HourlyFaucetService {
  private readonly gateway: RewardGateway;
  private readonly now: () => number;

  constructor(deps: HourlyFaucetDeps) {
    this.gateway = deps.gateway;
    this.now = deps.now ?? Date.now;
  }

  async status(playerId: string, kind: "member" | "guest"): Promise<FaucetStatus> {
    const serverNow = this.now();
    const base = { amount: FAUCET_AMOUNT_COINS, cooldownMs: FAUCET_COOLDOWN_MS, serverNow };
    if (kind !== "member") return { ...base, eligible: false, nextClaimAt: null, canClaim: false };

    const last = await this.lastClaim(playerId);
    const nextClaimAt = last ? last.earnedAt + FAUCET_COOLDOWN_MS : null;
    const canClaim = nextClaimAt === null || serverNow >= nextClaimAt;
    return { ...base, eligible: true, nextClaimAt: canClaim ? null : nextClaimAt, canClaim };
  }

  async claim(playerId: string, kind: "member" | "guest"): Promise<FaucetClaimResult> {
    const serverNow = this.now();
    const refuse = (code: keyof typeof MESSAGES, nextClaimAt: number | null = null): FaucetClaimResult => ({
      ok: false,
      code,
      message: MESSAGES[code],
      nextClaimAt,
      serverNow,
    });

    if (kind !== "member") return refuse("NOT_MEMBER");

    const last = await this.lastClaim(playerId);
    if (last && serverNow < last.earnedAt + FAUCET_COOLDOWN_MS) {
      return refuse("COOLDOWN", last.earnedAt + FAUCET_COOLDOWN_MS);
    }

    const grant = await this.gateway.grantCoins({
      playerId,
      identityKind: "member",
      rewardType: "HOURLY_FAUCET",
      reasonCode: REASON.FAUCET_CLAIM,
      amount: FAUCET_AMOUNT_COINS,
      sourceId: last ? `after:${last.rewardId}` : "first",
      description: "Free coins",
    });

    if (!grant.ok) return refuse(grant.code === REASON.RISK_UNDER_REVIEW ? "UNDER_REVIEW" : "UNAVAILABLE");
    // A simultaneous claim got there first: this one is not paid, it just waits like any early claim.
    // Never promise a time that has already passed: the app would loop between "ready" and "refused".
    if (grant.duplicate) return refuse("COOLDOWN", Math.max(serverNow + 1_000, grant.record.earnedAt + FAUCET_COOLDOWN_MS));
    if (grant.record.status === "VOIDED") return refuse("UNAVAILABLE");

    const isHeld = grant.record.status === "PENDING" && grant.record.vestingUntil > serverNow;
    return {
      ok: true,
      amount: grant.record.amount,
      nextClaimAt: grant.record.earnedAt + FAUCET_COOLDOWN_MS,
      // Only a payment that has reached the wallet is "paid". A claim whose credit has not landed yet
      // (still being paid, or retried by the sweeper) is accepted and the wait has started, but is not paid now.
      paidNow: grant.record.status === "RELEASED",
      vestingUntil: isHeld ? grant.record.vestingUntil : null,
      serverNow,
    };
  }

  /** The player's newest faucet row, whatever its payment state: a held claim still starts the wait. */
  private lastClaim(playerId: string): Promise<RewardRecord | null> {
    return this.gateway.latestOfType(playerId, "HOURLY_FAUCET");
  }
}
