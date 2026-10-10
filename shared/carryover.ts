/**
 * Bringing a guest's coins to a new account.
 *
 * A guest who signs up carries their whole wallet over, and earns a one-time upgrade
 * bonus once they have finished a real match as a member. Both go through the reward
 * gateway, so both wait out its hold before they reach the wallet.
 */

/** Paid once, only after the new member has finished one match with real people. */
export const GUEST_UPGRADE_BONUS_COINS = 5_000;

/** Why a carry-over was refused. Stable codes: the app maps each to its own wording. */
export type CarryOverRefusalCode =
  | "NOT_MEMBER"
  | "NO_GUEST"
  | "EMAIL_NOT_CONFIRMED"
  | "GUEST_ALREADY_CLAIMED"
  | "MEMBER_ALREADY_CLAIMED"
  | "UNDER_REVIEW"
  | "UNAVAILABLE";

export type CarryOverResult =
  | { ok: true; amount: number; replay: boolean; vestingUntil: number | null }
  | { ok: false; code: CarryOverRefusalCode; message: string };

/** What the app shows a member who brought a guest over. */
export interface CarryOverStatus {
  /** Coins that came over (0 for a guest with an empty wallet), or `null` if no guest was brought over. */
  carriedAmount: number | null;
  /** True once the carried coins have reached the wallet. */
  carriedPaid: boolean;
  /** The upgrade bonus is on offer: a guest was brought over and it has not been paid. */
  bonusPending: boolean;
  bonusAmount: number;
  /** True once the member has finished a real match, so the bonus can be claimed. */
  bonusUnlocked: boolean;
  bonusPaid: boolean;
}

export type BonusResult =
  | { ok: true; amount: number; vestingUntil: number | null }
  | { ok: false; code: "NOTHING_TO_CLAIM" | "NEEDS_MATCH" | "UNDER_REVIEW" | "UNAVAILABLE"; message: string };
