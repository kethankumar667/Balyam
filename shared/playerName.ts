/**
 * What a player may be called at a table — one definition for the client's input box and the server's
 * authority.
 *
 * ── Why the server enforces it, not only the form ─────────────────────
 * A name is the one piece of free text every other player at the table reads, and it arrives from a
 * socket event anyone can send by hand. The form's 20-character cap proves nothing about what the
 * server receives. Everything here is therefore applied again, on the server, in `RoomManager`.
 *
 * ── What is stripped, and why ─────────────────────────────────────────
 * Control characters and invisible formatters (zero-width, bidi overrides) — they let two different
 * names render identically, or flip the order of the text around them, which is how a table is
 * tricked into thinking one person is another. `<` and `>` are dropped as well; names are rendered as
 * text and never as HTML (AGENTS.md), but a name that looks like a tag is never wanted. Compatibility
 * normalisation (NFKC) turns full-width and styled lookalikes ("ＡＤＭＩＮ") into their plain letters
 * before any comparison, so "is this name taken" and "is this name reserved" cannot be dodged with them.
 */

export const MAX_PLAYER_NAME_LENGTH = 20;

/**
 * Code-point ranges that never belong in a display name. Written as numbers so no invisible character
 * ever has to appear in this file: C0/C1 controls, zero-width and directional formatters, line and
 * paragraph separators, and the angle brackets.
 */
const UNSAFE_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
  [0x003c, 0x003c],
  [0x003e, 0x003e],
];

function isUnsafeCodePoint(codePoint: number): boolean {
  return UNSAFE_CODE_POINT_RANGES.some(([low, high]) => codePoint >= low && codePoint <= high);
}

/** A display name made safe to store and show: normalised, stripped, collapsed, trimmed, capped. */
export function sanitizePlayerName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Whitespace first (a newline or tab becomes a plain space rather than vanishing), then the unsafe
  // characters, then whitespace again in case removing one left two spaces side by side.
  const spaced = raw.normalize("NFKC").replace(/\s+/g, " ");
  const stripped = Array.from(spaced)
    .filter((character) => !isUnsafeCodePoint(character.codePointAt(0) ?? 0))
    .join("");
  const cleaned = stripped.replace(/\s+/g, " ").trim();
  // Spread by code point so a capped name never ends in half an emoji.
  return Array.from(cleaned).slice(0, MAX_PLAYER_NAME_LENGTH).join("").trim();
}

/** The form two names are compared in: sanitised and case-folded. */
export function playerNameKey(name: string): string {
  return sanitizePlayerName(name).toLowerCase();
}

/** Words that speak with the table's or the product's authority. A guest may not call themselves these. */
const RESERVED_NAMES = new Set([
  "system",
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "staff",
  "bhalyam",
  "host",
  "owner",
  "server",
  "bot",
]);

/** "Guest 123", "guest#7" — the shape of the automatic name, which only its owner may carry. */
const GUEST_STYLE_NAME = /^guest\s*#?\s*\d+$/;

/**
 * True when a GUEST may not choose this name.
 *
 * `ownAutomaticName` is the guest's own "Guest 12345678", which stays allowed for them: the name
 * prefilled in the box must be accepted, while no one else may borrow someone's number.
 */
export function isReservedGuestName(name: string, ownAutomaticName?: string): boolean {
  const key = playerNameKey(name);
  if (!key) return true;
  if (ownAutomaticName && key === playerNameKey(ownAutomaticName)) return false;
  if (RESERVED_NAMES.has(key.replace(/[\s._-]/g, ""))) return true;
  return GUEST_STYLE_NAME.test(key);
}

/** What the server answers when a guest picks a name already worn at the table. */
export const NAME_TAKEN_ERROR = "That name is already taken at this table. Pick another.";

/** What the server answers when a guest picks a reserved or impersonating name. */
export const NAME_NOT_ALLOWED_ERROR = "That name isn't available. Pick another.";

/** True when a join failure is about the name, so the client can send the player back to the name box. */
export function isNameRefusal(error: string | undefined): boolean {
  return error === NAME_TAKEN_ERROR || error === NAME_NOT_ALLOWED_ERROR;
}
