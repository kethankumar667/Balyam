/**
 * The hourly coin faucet: a signed-in player may claim a small gift of coins,
 * then must wait before claiming again.
 *
 * The wait starts at the moment of the CLAIM, not at a fixed clock time, so a
 * player who claims late is not punished and nobody can bank several claims.
 * It is separate from the daily login streak (`streak-types.ts`): the streak
 * rewards showing up once a day, this rewards coming back during the day.
 */

/** Coins paid by one claim. Matches the Mandali send/request amount on purpose. */
export const FAUCET_AMOUNT_COINS = 100;

/** Time that must pass after a claim before the next one is allowed. */
export const FAUCET_COOLDOWN_MS = 4 * 60 * 60 * 1_000;

/** Why a claim was not paid. Stable codes: the app maps each to its own wording. */
export type FaucetRefusalCode =
  | "NOT_MEMBER"
  | "COOLDOWN"
  | "UNDER_REVIEW"
  | "UNAVAILABLE";

/** What the app needs to draw the claim button: can they claim, and if not, when. */
export interface FaucetStatus {
  /** Signed-in players only. A guest sees `false` and the sign-in nudge. */
  eligible: boolean;
  amount: number;
  cooldownMs: number;
  /** Epoch ms of the next allowed claim, or `null` when a claim is available now. */
  nextClaimAt: number | null;
  /** Server clock at the time of the answer, so the countdown never trusts the device clock. */
  serverNow: number;
  canClaim: boolean;
}

export type FaucetClaimResult =
  | { ok: true; amount: number; nextClaimAt: number; paidNow: boolean; vestingUntil: number | null; serverNow: number }
  | { ok: false; code: FaucetRefusalCode; message: string; nextClaimAt: number | null; serverNow: number };
