/**
 * What a guest is called, and how long a guest identity lives.
 *
 * ── The product rule ──────────────────────────────────────────────────
 * A guest does not own a name. They get one for the duration of a game room, and when they leave
 * it they are "Guest 12345678" again. Only an account keeps a name. Both halves of that rule —
 * the default name and the expiry window the invite popup quotes to the player — live here so the
 * client copy and the server's token lifetime cannot drift apart.
 */

/** A guest identity that has been idle this long can no longer be renewed or used. */
export const GUEST_IDLE_EXPIRY_DAYS = 7;

const GUEST_NAME_PREFIX = "Guest";
const SERIAL_FLOOR = 10_000_000;
const SERIAL_SPAN = 90_000_000;

/**
 * The automatic name for a guest id: "Guest" plus a stable 8-digit serial.
 *
 * Derived from the id rather than stored or counted, so it is the same on every screen, in every
 * room, until the identity expires — and needs no server round trip or table. FNV-1a, 32-bit:
 * not a security primitive, only a spread that makes two different guests very unlikely to share
 * a serial at one table (about 1 in 90 million per pair).
 */
export function guestDisplayName(guestId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < guestId.length; i += 1) {
    hash ^= guestId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${GUEST_NAME_PREFIX} ${SERIAL_FLOOR + (hash % SERIAL_SPAN)}`;
}
