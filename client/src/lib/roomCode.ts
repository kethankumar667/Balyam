/**
 * Turning whatever a player has in hand into a room code.
 *
 * ── Why this is not just `.toUpperCase()` ─────────────────────────────
 * Codes are minted from a deliberately unambiguous alphabet
 * (`server/src/rooms/codeGenerator.ts`): no `I`, no `O`, no `0`, no `1`,
 * because those are the pairs people misread off a phone screen. The
 * generator's care was being thrown away at the input box, which accepted
 * any character at all and let the player discover the problem only after a
 * round trip came back "Room not found".
 *
 * So the box now refuses what the generator can never produce. A typed `0`
 * simply does not appear, the same way a typed space already did not — an
 * input constraint people read instantly, and one that turns a ten-second
 * failed join into no failure at all.
 *
 * ── Why a URL goes in here too ────────────────────────────────────────
 * The fastest way into a room is the host's "Share Link" button, which sends
 * `https://…/room/ABC123` through WhatsApp. Players paste that whole thing
 * into the code box — it is what they were given — and a box that only
 * accepts six characters rejects the single most useful thing on their
 * clipboard. Pulling the code out of a pasted link costs one regex.
 */

/** Exactly the generator's alphabet. Keep the two in step. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const ROOM_CODE_LENGTH = 6;

/**
 * Two copies on purpose. The `g` flag makes a regex stateful across `.test()`
 * calls via `lastIndex`, so a single shared instance used for both stripping
 * and testing would return alternating answers for the same input.
 */
const DISALLOWED_ALL = new RegExp(`[^${ROOM_CODE_ALPHABET}]`, "g");
const DISALLOWED_ONE = new RegExp(`[^${ROOM_CODE_ALPHABET}]`);

/**
 * Pull a room code out of a pasted invite link.
 *
 * Matches `/room/<code>` anywhere in the string so it works on a bare path, a
 * full URL, and a URL with a query string or trailing slash attached by the
 * chat app that delivered it. Returns null when there is no `/room/` segment,
 * which is the common case — most input is someone typing.
 */
function codeFromUrl(raw: string): string | null {
  const m = /\/room\/([^/?#\s]+)/i.exec(raw);
  return m ? m[1] : null;
}

/**
 * Normalize anything a player pastes or types into a candidate code.
 *
 * Always returns something safe to put straight back into the input's value:
 * uppercase, at most `ROOM_CODE_LENGTH` characters, every one of them legal.
 * It does not judge completeness — a half-typed code is a normal state, and
 * `isCompleteRoomCode` is the separate question.
 */
export function normalizeRoomCode(raw: string): string {
  const source = codeFromUrl(raw) ?? raw;
  return source.toUpperCase().replace(DISALLOWED_ALL, "").slice(0, ROOM_CODE_LENGTH);
}

/** True when this is a full code and worth sending to the server. */
export function isCompleteRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && !DISALLOWED_ONE.test(code);
}
