/**
 * Calendar days as `YYYY-MM-DD` strings, without the timezone trap.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * A birthday is a calendar day, not a moment. The obvious way to turn a `Date`
 * into one — `date.toISOString().slice(0, 10)` — converts to UTC first, so for
 * anyone east of Greenwich (all of India, UTC+5:30) a date picked at local
 * midnight comes out as the PREVIOUS day. Every function here reads and writes
 * the date in the viewer's own local calendar instead, so what is picked is what
 * is saved.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A local calendar day as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * `YYYY-MM-DD` read back as that local calendar day, or `undefined` for anything
 * else. An impossible date (31 February) is refused rather than rolled over into
 * March, because `new Date(2023, 1, 31)` quietly becomes the 3rd of March.
 */
export function fromIsoDate(value: string): Date | undefined {
  const match = ISO_DAY.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isRealDay = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDay ? date : undefined;
}

/**
 * Where a birthday calendar should open when nothing is chosen yet: January,
 * `yearsAgo` years back. Opening on today's month would make every birthday a long
 * trek backwards; a grown-up year puts most people a dropdown tap away.
 */
export function defaultBirthMonth(today: Date, yearsAgo = 25): Date {
  return new Date(today.getFullYear() - yearsAgo, 0, 1);
}

/** "12 April 1995" — the day, the month in words, the year. */
export function formatBirthday(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
