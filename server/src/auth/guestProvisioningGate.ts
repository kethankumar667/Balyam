/**
 * A ceiling on how fast new guest identities can be written to the database.
 *
 * ── Why a gate on this write ──────────────────────────────────────────
 * Minting a guest token (`POST /api/auth/guest`) is stateless and costs nothing to serve, so it is
 * left open. The first request that CARRIES a guest token is what writes a `player_identities` row,
 * and so (through the wallet) a welcome grant. That is the step an attacker, a crawler or a runaway
 * client can turn into unbounded rows and free coins, so that is the step bounded here.
 *
 * ── What it does not do ───────────────────────────────────────────────
 * It uses no device, browser, IP or location signal: the privacy notice forbids adding one without a
 * decision, and a count of "new guests this minute" needs none. It is a global ceiling, so under a
 * flood it protects the database but cannot say WHICH callers to refuse; a per-caller limit (by
 * network address) is the stronger control and needs that privacy decision first.
 *
 * A guest that already has a row is unaffected: the caller skips only the redundant write, and the
 * row, wallet and coins are exactly where they were. Only a brand-new guest waits for the next window.
 */

const WINDOW_MS = 60_000;
const DEFAULT_PER_MINUTE = 600;

export class GuestProvisioningThrottledError extends Error {
  constructor() {
    super("Too many new guest identities this minute.");
    this.name = "GuestProvisioningThrottledError";
  }
}

export function guestProvisioningLimitPerMinute(): number {
  const raw = Number(process.env.GUEST_PROVISION_PER_MINUTE);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_PER_MINUTE;
}

let windowStart = 0;
let taken = 0;

/** Test seam: forget the current window. */
export function resetGuestProvisioningGate(): void {
  windowStart = 0;
  taken = 0;
}

/** Claims one new-identity slot in the current minute. Returns false when the minute is used up. */
export function tryTakeGuestProvisioningSlot(now: number = Date.now()): boolean {
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    taken = 0;
  }
  if (taken >= guestProvisioningLimitPerMinute()) return false;
  taken += 1;
  return true;
}
