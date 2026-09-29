const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * How long until a pending reward reaches the wallet, in words a player reads at
 * a glance. Rounds UP: "in 1 hr" for 61 minutes, never "in 0 hr" — a reward
 * should not appear to be arriving sooner than it is.
 */
export function formatArrival(vestingUntil: number, now: number = Date.now()): string {
  const remaining = vestingUntil - now;
  if (remaining <= 0) return "arriving now";
  if (remaining < HOUR_MS) return `in ${Math.max(1, Math.ceil(remaining / MINUTE_MS))} min`;
  return `in ${Math.ceil(remaining / HOUR_MS)} hr`;
}
