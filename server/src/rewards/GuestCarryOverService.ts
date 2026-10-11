import {
  GUEST_UPGRADE_BONUS_COINS,
  carryOverPayment,
  type BonusResult,
  type CarryOverResult,
  type CarryOverStatus,
} from "@shared/carryover.js";
import { logger } from "../lib/logger.js";
import {
  CarryOverStoreError,
  type GuestCarryOverStore,
  type GuestClaimRecord,
} from "./GuestCarryOverStore.js";
import type { RewardGateway } from "./RewardGateway.js";
import { REASON, type RewardRecord } from "./types.js";

/**
 * A guest who signs up keeps what they hold and gets a sign-up bonus on top.
 *
 * ── One payment, through the gateway ──────────────────────────────────
 * The account's final balance is `guest balance + GUEST_UPGRADE_BONUS_COINS` — but a new account is
 * already born with the member welcome, so what is paid is only the top-up from there
 * (`carryOverPayment`, see `shared/carryover.ts`). It is an ordinary reward row (`GUEST_CARRYOVER`)
 * keyed on the guest's id, so it is granted once and a retry is a no-op. It waits out the gateway's
 * hold and is refused for an account under review.
 *
 * ── Why the debit is not undone when the credit fails ─────────────────
 * The guest's coins leave the guest wallet inside the claim. If the reward row then cannot
 * be written, the amount sits on the claim and the next call grants it: the member sees
 * "still arriving", never a loss, and the guest wallet cannot be claimed twice.
 *
 * ── There is no separate bonus step any more ──────────────────────────
 * The upgrade bonus used to be a second payment unlocked by play. It is folded into the one
 * payment above, so `claimBonus` has nothing left to claim. It is kept (answering "nothing to
 * claim") so a client that still calls it gets a plain answer.
 */

const MESSAGES = {
  NOT_MEMBER: "Sign in to bring your guest coins over.",
  NO_GUEST: "There is no guest to bring over on this device.",
  EMAIL_NOT_CONFIRMED: "Confirm your email first, then your guest coins can come over.",
  GUEST_ALREADY_CLAIMED: "This guest has already been brought over.",
  MEMBER_ALREADY_CLAIMED: "This account has already brought a guest over.",
  UNDER_REVIEW: "Rewards are paused while your account is being reviewed.",
  UNAVAILABLE: "Bringing your coins over is temporarily unavailable. Try again in a moment.",
} as const;

const BONUS_MESSAGES = {
  NOTHING_TO_CLAIM: "Your sign-up bonus is already part of the coins brought over from your guest account.",
} as const;

export interface GuestCarryOverDeps {
  store: GuestCarryOverStore;
  gateway: RewardGateway;
  now?: () => number;
}

export class GuestCarryOverService {
  private readonly store: GuestCarryOverStore;
  private readonly gateway: RewardGateway;
  private readonly now: () => number;

  constructor(deps: GuestCarryOverDeps) {
    this.store = deps.store;
    this.gateway = deps.gateway;
    this.now = deps.now ?? Date.now;
  }

  /** `guestId` is already verified (a signed guest token); `memberId` is the verified account. */
  async carryOver(memberId: string, guestId: string | null): Promise<CarryOverResult> {
    const refuse = (code: keyof typeof MESSAGES): CarryOverResult => ({ ok: false, code, message: MESSAGES[code] });
    if (!guestId) return refuse("NO_GUEST");

    let outcome;
    try {
      outcome = await this.store.claim(guestId, memberId);
    } catch (err) {
      if (err instanceof CarryOverStoreError) {
        if (err.code === "EMAIL_NOT_CONFIRMED" || err.code === "MEMBER_NOT_FOUND") return refuse("EMAIL_NOT_CONFIRMED");
        if (err.code === "GUEST_ALREADY_CLAIMED") return refuse("GUEST_ALREADY_CLAIMED");
        if (err.code === "MEMBER_ALREADY_CLAIMED") return refuse("MEMBER_ALREADY_CLAIMED");
        if (err.code === "GUEST_WALLET_NOT_FOUND" || err.code === "NOT_A_GUEST" || err.code === "WALLET_FROZEN") return refuse("NO_GUEST");
      }
      logger.error({ message: `Guest carry-over failed for ${memberId}: ${String(err)}`, module: "CARRYOVER" });
      return refuse("UNAVAILABLE");
    }

    const payment = carryOverPayment(outcome.amount);
    // The account's member welcome already covers it: nothing to top up.
    if (payment === 0) return { ok: true, amount: 0, replay: outcome.status === "REPLAY", vestingUntil: null };

    const grant = await this.gateway.grantCoins({
      playerId: memberId,
      identityKind: "member",
      rewardType: "GUEST_CARRYOVER",
      reasonCode: REASON.GUEST_CARRYOVER,
      amount: payment,
      sourceId: `guest:${guestId}`,
      description: "Topped up to match your guest coins plus the sign-up bonus",
    });
    // The coins are safe on the claim; the next call grants them. Say so, don't say "lost".
    if (!grant.ok) return refuse(grant.code === REASON.RISK_UNDER_REVIEW ? "UNDER_REVIEW" : "UNAVAILABLE");

    return { ok: true, amount: payment, replay: outcome.status === "REPLAY", vestingUntil: this.heldUntil(grant.record) };
  }

  async status(memberId: string): Promise<CarryOverStatus> {
    const claim = await this.store.findByMember(memberId);
    if (!claim) {
      return { carriedAmount: null, carriedPaid: false, bonusPending: false, bonusAmount: GUEST_UPGRADE_BONUS_COINS, bonusUnlocked: false, bonusPaid: false };
    }
    const payment = carryOverPayment(claim.amount);
    const carried = payment > 0 ? await this.rewardFor(memberId, claim) : null;
    return {
      carriedAmount: payment,
      carriedPaid: payment === 0 || carried?.status === "RELEASED",
      bonusPending: false,
      bonusAmount: GUEST_UPGRADE_BONUS_COINS,
      bonusUnlocked: false,
      bonusPaid: false,
    };
  }

  /** The sign-up bonus is part of the carry-over payment; there is nothing separate to claim. */
  async claimBonus(_memberId: string): Promise<BonusResult> {
    return { ok: false, code: "NOTHING_TO_CLAIM", message: BONUS_MESSAGES.NOTHING_TO_CLAIM };
  }

  private async rewardFor(memberId: string, claim: GuestClaimRecord): Promise<RewardRecord | null> {
    const latest = await this.gateway.latestOfType(memberId, "GUEST_CARRYOVER");
    return latest && latest.sourceId === `guest:${claim.guestId}` ? latest : null;
  }

  private heldUntil(record: RewardRecord): number | null {
    return record.status === "PENDING" && record.vestingUntil > this.now() ? record.vestingUntil : null;
  }
}
