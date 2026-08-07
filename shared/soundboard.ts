/**
 * Soundboard clips — ONE source of truth for both ends.
 *
 * Same rationale as reactions.ts: the picker and the server's allowlist are
 * derived from this single array, so a clip that renders as a button can
 * never be one the server silently drops.
 *
 * A clip id is an opaque string, NOT a filename. The client maps each id to
 * an `AudioKey`, and the AudioManager resolves that key per audio theme
 * (Classic 90's / Modern / Festival) — so a soundboard button plays a
 * theme-appropriate dhol without the server, the shared layer, or the picker
 * knowing anything about files.
 *
 * Add a clip:
 *   1. Append an entry here.
 *   2. Add an AUDIO key + map it in client/src/lib/soundboard.ts.
 *   3. Map the key to a file in each theme manifest.
 * A clip with no file in the active theme is silent, not an error — the
 * banner still shows, so the social beat survives a missing asset.
 */

export interface SoundClip {
  /** Wire id. Never rename — old clients keep sending the old string. */
  id: string;
  /** Button caption. */
  label: string;
  /** Glyph on the button. Unicode 6.0 or older, so old Android renders it. */
  glyph: string;
  /**
   * Grouping for the picker. "cheer" is celebratory, "tease" is playful
   * retaliation, "drama" is tension/timing. Mirrors the split the emoji
   * picker already uses so the two panels feel like one thing.
   */
  group: "cheer" | "tease" | "drama";
}

export const SOUNDBOARD_CLIPS: readonly SoundClip[] = [
  /* ── Cheer ── */
  { id: "dhol", label: "Dhol", glyph: "🥁", group: "cheer" },
  { id: "applause", label: "Applause", glyph: "👏", group: "cheer" },
  { id: "tada", label: "Ta-da", glyph: "✨", group: "cheer" },
  { id: "shankh", label: "Shankh", glyph: "🐚", group: "cheer" },

  /* ── Tease ── */
  { id: "airhorn", label: "Airhorn", glyph: "📣", group: "tease" },
  { id: "laugh", label: "Laugh", glyph: "😂", group: "tease" },
  { id: "boo", label: "Boo", glyph: "👎", group: "tease" },
  { id: "sadtrombone", label: "Oof", glyph: "📉", group: "tease" },

  /* ── Drama ── */
  { id: "drumroll", label: "Drumroll", glyph: "🎬", group: "drama" },
  { id: "suspense", label: "Suspense", glyph: "😬", group: "drama" },
  { id: "tick", label: "Clock", glyph: "⏰", group: "drama" },
  { id: "whoosh", label: "Whoosh", glyph: "💨", group: "drama" },
] as const;

/** Everything a client may send. The server validates against exactly this. */
export const ALLOWED_SOUND_CLIPS: ReadonlySet<string> = new Set<string>(
  SOUNDBOARD_CLIPS.map((c) => c.id),
);

export function soundClipById(id: string): SoundClip | undefined {
  return SOUNDBOARD_CLIPS.find((c) => c.id === id);
}

/**
 * Server-side spam budget for sounds.
 *
 * Deliberately tighter than the emoji budget (6 per 4s). A floating emoji is
 * easy to ignore; a sound plays over everyone's game whether they are looking
 * at it or not, so it is the more abusable of the two. These constants live
 * here rather than in RoomManager so the client can show the same cooldown on
 * the button and the two can never disagree about the rate.
 */
export const SOUND_RATE_LIMIT = { max: 3, windowMs: 6000 } as const;
