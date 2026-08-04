/**
 * Reaction emoji — ONE source of truth for both ends.
 *
 * These lists used to be duplicated: the picker in
 * client/src/components/InlineRoomRail.tsx and the ALLOWED set in
 * server/src/rooms/RoomManager.ts, kept in step by nothing but a comment
 * warning that a glyph missing from the server list "is silently dropped".
 *
 * That is a bad failure mode — the button is there, the tap does nothing, and
 * there is no error anywhere to notice. Deriving the server's allowlist from
 * the same arrays the picker renders makes the drift impossible rather than
 * merely discouraged.
 *
 * Every glyph here is Unicode 6.0 or older, so it renders on old Android
 * rather than showing a tofu box.
 */

/** General cheering — the default set when reacting to nobody in particular. */
export const QUICK_REACTIONS = ["👍", "😂", "🔥", "🎉", "😮", "💯", "👏", "🤝"] as const;

/**
 * Playful retaliation. The chappal, the tomato and the Diwali firecracker are
 * things you'd actually lob at a cousin who just sent your token home.
 * Harmless props by design: the feeling is sibling teasing, not violence, and
 * it keeps our own visual identity rather than mimicking another title's.
 */
export const THROW_REACTIONS = ["😡", "🩴", "🍅", "🧨", "😭", "🎯", "💪", "💔"] as const;

/**
 * Pace nudges — the "oi, it's your turn" set. Aimed at a player these arc
 * across the table like the throwables do, which is the whole joke: a clock
 * sailing into the seat of whoever is dawdling says it better than a chat
 * message. Deliberately good-natured (a snail, a cup of chai, a dice) rather
 * than scolding.
 */
export const NUDGE_REACTIONS = ["⏰", "🐌", "😴", "☕", "👀", "🎲", "⚡", "🙏"] as const;

/** Older glyphs still accepted from clients that predate the split lists. */
const LEGACY_REACTIONS = ["😢", "🤔", "🙌"] as const;

/** Everything a client may send. The server validates against exactly this. */
export const ALLOWED_REACTIONS: ReadonlySet<string> = new Set<string>([
  ...QUICK_REACTIONS,
  ...THROW_REACTIONS,
  ...NUDGE_REACTIONS,
  ...LEGACY_REACTIONS,
]);
