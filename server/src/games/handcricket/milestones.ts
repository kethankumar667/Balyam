/**
 * The 50-run mark a ball carried a batter's score past, if any — 50, 100,
 * 150, and so on. Returns `null` on every ball that didn't cross one,
 * including a dismissal ball (0 runs scored, so it can never cross a mark)
 * — callers should pass `wicket: false` there, but this also treats a
 * dismissal defensively as a non-crossing regardless of what runs it's
 * given, since a wicket ball can never legitimately carry runs.
 */
export function milestoneCrossed(runsBefore: number, runsAfter: number, wicket: boolean): number | null {
  if (wicket) return null;
  const before = Math.floor(runsBefore / 50);
  const after = Math.floor(runsAfter / 50);
  return after > before ? after * 50 : null;
}
