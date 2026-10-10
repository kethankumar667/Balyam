import {
  GUEST_UPGRADE_BONUS_COINS,
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
import type { TrustService } from "./TrustService.js";
import { REASON, type RewardRecord } from "./types.js";

/**
 * A guest who signs up brings their coins, and earns an upgrade bonus after a first real match.
 *
 * ── Two payments, both through the gateway ────────────────────────────
 * The carried coins and the bonus are ordinary reward rows (`GUEST_CARRYOVER`,
 * `GUEST_UPGRADE_BONUS`), keyed on the guest's id, so each can be granted once and a retry
 * is a no-op. They wait out the gateway's hold and are refused for an account under review.
 *
 * ── Why the debit is not undone when the credit fails ─────────────────
 * The guest's coins leave the guest wallet inside the claim. If the reward row then cannot
 * be written, the amount sits on the claim and the next call grants it: the member sees
 * "still arriving", never a loss, and the guest wallet cannot be claimed twice.
 *
 * ── The bonus is gated on play, not on sign-up ────────────────────────
 * It unlocks once the member has finished one match with real people (the same count the
 * trust tiers use), so a sign-up alone, and a match against bots alone, earn nothing.
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
  NOTHING_TO_CLAIM: "There is no upgrade bonus to claim.",
  NEEDS_MATCH: "Finish a match with other players to unlock your bonus.",
  UNDER_REVIEW: "Rewards are paused while your account is being reviewed.",
  UNAVAILABLE: "Your bonus is temporarily unavailable. Try again in a moment.",
} as const;

export interface GuestCarryOverDeps {
  store: GuestCarryOverStore;
  gateway: RewardGateway;
  trust: TrustService;
  now?: () => number;
}

export class GuestCarryOverService {
  private readonly store: GuestCarryOverStore;
  private readonly gateway: RewardGateway;
  private readonly trust: TrustService;
  private readonly now: () => number;

  constructor(deps: GuestCarryOverDeps) {
    this.store = deps.store;
    this.gateway = deps.gateway;
    this.trust = deps.trust;
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

    if (outcome.amount === 0) return { ok: true, amount: 0, replay: outcome.status === "REPLAY", vestingUntil: null };

    const grant = await this.gateway.grantCoins({
      playerId: memberId,
      identityKind: "member",
      rewardType: "GUEST_CARRYOVER",
      reasonCode: REASON.GUEST_CARRYOVER,
      amount: outcome.amount,
      sourceId: `guest:${guestId}`,
      description: "Coins brought over from your guest account",
    });
    // The coins are safe on the claim; the next call grants them. Say so, don't say "lost".
    if (!grant.ok) return refuse(grant.code === REASON.RISK_UNDER_REVIEW ? "UNDER_REVIEW" : "UNAVAILABLE");

    return { ok: true, amount: outcome.amount, replay: outcome.status === "REPLAY", vestingUntil: this.heldUntil(grant.record) };
  }

  async status(memberId: string): Promise<CarryOverStatus> {
    const claim = await this.store.findByMember(memberId);
    if (!claim) {
      return { carriedAmount: null, carriedPaid: false, bonusPending: false, bonusAmount: GUEST_UPGRADE_BONUS_COINS, bonusUnlocked: false, bonusPaid: false };
    }
    const [carried, bonus, unlocked] = await Promise.all([
      claim.amount > 0 ? this.rewardFor(memberId, "GUEST_CARRYOVER", claim) : Promise.resolve(null),
      this.rewardFor(memberId, "GUEST_UPGRADE_BONUS", claim),
      this.hasFinishedRealMatch(memberId),
    ]);
    const bonusPaid = bonus?.status === "RELEASED";
    return {
      carriedAmount: claim.amount,
      carriedPaid: claim.amount === 0 || carried?.status === "RELEASED",
      bonusPending: bonus?.status === "VOIDED" ? false : !bonusPaid,
      bonusAmount: GUEST_UPGRADE_BONUS_COINS,
      bonusUnlocked: unlocked,
      bonusPaid,
    };
  }

  async claimBonus(memberId: string): Promise<BonusResult> {
    const refuse = (code: keyof typeof BONUS_MESSAGES): BonusResult => ({ ok: false, code, message: BONUS_MESSAGES[code] });

    const claim = await this.store.findByMember(memberId);
    if (!claim) return refuse("NOTHING_TO_CLAIM");
    if (!(await this.hasFinishedRealMatch(memberId))) return refuse("NEEDS_MATCH");

    const grant = await this.gateway.grantCoins({
      playerId: memberId,
      identityKind: "member",
      rewardType: "GUEST_UPGRADE_BONUS",
      reasonCode: REASON.GUEST_UPGRADE_BONUS,
      amount: GUEST_UPGRADE_BONUS_COINS,
      sourceId: `guest:${claim.guestId}`,
      description: "Welcome bonus for creating an account",
    });
    if (!grant.ok) return refuse(grant.code === REASON.RISK_UNDER_REVIEW ? "UNDER_REVIEW" : "UNAVAILABLE");
    if (grant.record.status === "VOIDED") return refuse("UNAVAILABLE");

    return { ok: true, amount: grant.record.amount, vestingUntil: this.heldUntil(grant.record) };
  }

  private async hasFinishedRealMatch(memberId: string): Promise<boolean> {
    const { metrics } = await this.trust.assess(memberId);
    return metrics.completedMatches >= 1;
  }

  private async rewardFor(
    memberId: string,
    type: "GUEST_CARRYOVER" | "GUEST_UPGRADE_BONUS",
    claim: GuestClaimRecord,
  ): Promise<RewardRecord | null> {
    const latest = await this.gateway.latestOfType(memberId, type);
    return latest && latest.sourceId === `guest:${claim.guestId}` ? latest : null;
  }

  private heldUntil(record: RewardRecord): number | null {
    return record.status === "PENDING" && record.vestingUntil > this.now() ? record.vestingUntil : null;
  }
}
