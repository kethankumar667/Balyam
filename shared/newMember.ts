/**
 * What a brand-new member has to wait for.
 *
 * Signing up is the start of a relationship, not a withdrawal slip. The welcome
 * bonus is the one thing a new member gets at once (after the welcome popup, see
 * `EconomyService.claimMemberWelcome`); the two recurring rewards begin later:
 *
 *   • the daily streak does not start on the day of registration — the first
 *     claim is the next UTC day, so "Day 1" is a reason to come back tomorrow;
 *   • the free-coins faucet opens an hour after registration, and only then
 *     does its usual wait between claims apply.
 *
 * Both are computed from ONE number — when the member's account was first seen
 * by the server — so the two rules cannot drift apart. A member who registered
 * long ago is never held: the rule only ever bites in the first day.
 */

/** How long after registering the first free-coins claim opens. */
export const NEW_MEMBER_FAUCET_WAIT_MS = 60 * 60 * 1_000;

const MS_PER_DAY = 86_400_000;

/** The earliest moment a new member may make their first free-coins claim. */
export function firstFaucetClaimAt(registeredAt: number): number {
  return registeredAt + NEW_MEMBER_FAUCET_WAIT_MS;
}

/**
 * The earliest moment a new member may make their first daily-streak claim: 00:00 UTC on the day
 * AFTER the one they registered on. Streak days are UTC days, so this is the same boundary the
 * streak itself already resets on.
 */
export function firstStreakClaimAt(registeredAt: number): number {
  return Math.floor(registeredAt / MS_PER_DAY) * MS_PER_DAY + MS_PER_DAY;
}
