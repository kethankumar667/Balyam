import crypto from "crypto";

/**
 * Proof that you are the person sitting in a seat.
 *
 * ── The hole this closes ──────────────────────────────────────────────
 * A seat used to be reclaimable by anyone who could name it. `joinRoom`
 * accepted a `playerId` and, if the room had a player by that id, handed the
 * socket that seat — no secret checked, not even a check that the seat was
 * vacant. And `playerId` is not a secret: `toPublicState` broadcasts the whole
 * `Player` record, id included, to every player AND every spectator.
 *
 * So the attack was: open `/tv/<code>` as a spectator, read the ids off the
 * room state, stop spectating, then `room:join` with somebody else's id. The
 * server would seat you and immediately emit `getStateFor(theirId)` — which in
 * Rummy, UNO and Star Game is that player's private hand. You could then play
 * moves as them. All you needed was the room code, which is printed on a QR
 * code and shared in group chats.
 *
 * ── The fix ───────────────────────────────────────────────────────────
 * The id stays public and becomes what it always should have been: a name, not
 * a credential. Alongside it the server issues a token that only the socket
 * which took the seat ever sees, and reclaiming a seat requires presenting it.
 *
 *     token = base64url( HMAC-SHA256( secret, "<ROOMCODE>:<playerId>" ) )
 *
 * Derived rather than stored, so there is no per-seat table to keep in sync
 * with joins, leaves, host migration and room teardown — and therefore no way
 * for that table to leak or drift. Forging one requires the secret.
 *
 * ── On expiry ─────────────────────────────────────────────────────────
 * There is none, deliberately. A token is only meaningful while its room is in
 * `RoomManager`'s in-memory map, so the room dying is the revocation, and
 * rooms die with the process. Adding a TTL would only create a way for a
 * legitimate player to be locked out of a game still in progress.
 *
 * That also makes the unset-secret case coherent rather than merely tolerable:
 * a per-process random secret invalidates every token on restart, and a
 * restart has already destroyed every room those tokens referred to.
 */

/**
 * Signing key. `SESSION_SECRET` in production; otherwise random per process.
 *
 * The random fallback is what keeps the project's zero-infrastructure `npm run
 * dev` promise — no env file, no key management, and nothing weaker than the
 * configured path while a single process holds the rooms anyway.
 */
const secret = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString("hex");

/** True when the key is ephemeral, i.e. seats will not survive a restart. */
export const usingEphemeralSecret = !process.env.SESSION_SECRET?.trim();

/**
 * Normalised subject line. Room codes are matched case-insensitively
 * everywhere else (`joinRoom` upper-cases before lookup), so a token minted
 * for "ab12cd" must verify for "AB12CD" or a link with a lower-case code
 * silently stops reclaiming seats.
 */
function subject(roomCode: string, playerId: string): string {
  return `${roomCode.trim().toUpperCase()}:${playerId}`;
}

/** Issue the proof for one seat. Give it only to the socket taking that seat. */
export function mintSeatToken(roomCode: string, playerId: string): string {
  return crypto.createHmac("sha256", secret).update(subject(roomCode, playerId)).digest("base64url");
}

/**
 * Is this the holder of that seat?
 *
 * Compared in constant time. The margin an early-exit `===` leaks is small
 * over a network, but the constant-time version costs one line and removes the
 * question entirely.
 */
export function verifySeatToken(
  roomCode: string,
  playerId: string,
  token: string | undefined | null,
): boolean {
  if (typeof token !== "string" || token.length === 0) return false;
  const expected = mintSeatToken(roomCode, playerId);
  // timingSafeEqual throws on a length mismatch, which would turn a malformed
  // token into a 500 instead of a rejection.
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
