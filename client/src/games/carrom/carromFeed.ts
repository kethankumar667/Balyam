/**
 * Shot-feed semantics for the Carrom lounge, kept free of React so it can be
 * tested directly (same arrangement as `chessMoves.ts`).
 *
 * The screen previously rendered a single `lastShot` line stamped with
 * `new Date()` evaluated *during render*. That clock therefore showed the time
 * of the latest React render rather than the time of the shot it sat next to,
 * and during a 60Hz resolution it was rewritten sixty times a second while
 * presenting itself as the timestamp of a past event.
 *
 * Recording is driven by the `resolving` -> settled phase transition rather
 * than by a change in the `lastShot` string. That distinction matters: two
 * consecutive shots that both miss produce the identical string ("no pot"),
 * so a string-equality check would silently drop the second one.
 */

export interface CarromFeedEntry {
  id: number;
  text: string;
  combo?: string | null;
  at: number;
}

/** Cap on retained entries — a long match should not grow unboundedly. */
export const FEED_LIMIT = 40;

/**
 * Should the shot described by `lastShot` be appended to the feed?
 *
 * @param prevPhase the phase observed on the previous render, or `null` on the
 *   very first observation (fresh mount, or a rejoin into a match already in
 *   progress).
 */
export function shouldRecordShot(
  prevPhase: string | null,
  phase: string,
  lastShot: string | null
): boolean {
  if (!lastShot) return false;
  // Seed once on mount so a reconnecting player is not shown an empty history
  // for a match that is already under way.
  if (prevPhase === null) return true;
  return prevPhase === "resolving" && phase !== "resolving";
}

/** Append an entry, holding the feed at `FEED_LIMIT` most-recent items. */
export function appendEntry(
  entries: readonly CarromFeedEntry[],
  entry: CarromFeedEntry
): CarromFeedEntry[] {
  return [...entries, entry].slice(-FEED_LIMIT);
}

/** 12-hour wall clock for a recorded timestamp. */
export function formatFeedClock(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
