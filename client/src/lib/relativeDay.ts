const DAY_MS = 86_400_000;
const WEEK_IN_DAYS = 7;

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * A match's day as a person says it: "Today", "Yesterday", "3 days ago", then a plain date.
 *
 * Counts calendar days in the viewer's time zone, not 24-hour spans: a match finished at 23:50 is
 * "Yesterday" ten minutes after midnight. A missing timestamp reads as a recorded match rather than a made-up
 * date, and a timestamp slightly in the future (clock skew) reads as today.
 */
export function formatRelativeDay(timestamp: number | undefined, now: number = Date.now()): string {
  if (!timestamp) return "Recorded match";
  // Rounded, because a daylight-saving day is 23 or 25 hours long.
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(timestamp)) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < WEEK_IN_DAYS) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" }).format(timestamp);
}
