/**
 * Bringing a guest's coins to a new account.
 *
 * A guest who signs up keeps everything they hold and gets a sign-up bonus on top. The account's
 * final balance is therefore `guest balance + GUEST_UPGRADE_BONUS_COINS`: a guest with 3,800 coins
 * lands on 5,800.
 *
 * ── Why the payment is a top-up, not the whole amount ─────────────────────
 * Every new account is born with the member welcome (5,000), including one made by a guest. Paying
 * the full 5,800 on top of that would give such a person 10,800. So the payment is only the
 * DIFFERENCE between where the account already stands and where the guest should land:
 *
 *     final = max(MEMBER_WELCOME_COINS, guest balance + GUEST_UPGRADE_BONUS_COINS)
 *
 * A guest who held little keeps the plain member welcome and is paid nothing extra; a guest who did
 * well is topped up to their balance plus the bonus. Nothing is taken from anyone, and no database
 * rule changes. It also means a throwaway guest is worth no more to a farmer than a brand-new
 * mailbox already is (5,000), so there is nothing to launder through here.
 *
 * The payment goes through the reward gateway, so it waits out the gateway's hold before it
 * reaches the wallet.
 */

/** Added on top of a guest's balance when they sign up. */
export const GUEST_UPGRADE_BONUS_COINS = 2_000;

/**
 * What every new member is born with. KEEP EQUAL to `economy_configurations.member_starter_coins`
 * (5,000) — the carry-over payment is computed against it.
 */
export const MEMBER_WELCOME_COINS = 5_000;

/**
 * The coins to pay a new account for a guest wallet holding `guestBalance`: the top-up that takes the
 * account from its member welcome to `guestBalance + GUEST_UPGRADE_BONUS_COINS`, never negative.
 */
export function carryOverPayment(guestBalance: number): number {
  return Math.max(0, guestBalance + GUEST_UPGRADE_BONUS_COINS - MEMBER_WELCOME_COINS);
}

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

/**
 * What the app shows a member who brought a guest over.
 *
 * The `bonus*` fields are the old separate upgrade bonus. The bonus is now part of the carry-over
 * payment, so they are always "nothing pending"; they stay on the wire so older clients keep parsing it.
 */
export interface CarryOverStatus {
  /** The top-up coins (0 when the account's member welcome already covered it), or `null` if no guest was brought over. */
  carriedAmount: number | null;
  /** True once the top-up has reached the wallet (or there was nothing to pay). */
  carriedPaid: boolean;
  /** Always false: the bonus is folded into the carry-over payment. */
  bonusPending: boolean;
  bonusAmount: number;
  /** Always false: see `bonusPending`. */
  bonusUnlocked: boolean;
  /** Always false: see `bonusPending`. */
  bonusPaid: boolean;
}

export type BonusResult =
  | { ok: true; amount: number; vestingUntil: number | null }
  | { ok: false; code: "NOTHING_TO_CLAIM" | "NEEDS_MATCH" | "UNDER_REVIEW" | "UNAVAILABLE"; message: string };
