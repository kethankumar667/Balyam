/**
 * How the server's record keys and field names read to an operator.
 *
 * The server names things for code, not people: a section's title is its key ("reward audit",
 * "moderation") and its fields arrive as `matchId`, `coins_delta` or `createdAt`. These turn them into
 * words, without changing the data underneath.
 */

const ACRONYM = /\b(id|xp|ip|url)\b/gi;

/** "reward audit" -> "Reward Audit", "xp" -> "XP". A title that already has capitals was written by a person: left as is. */
export function sectionTitle(title: string): string {
  if (/[A-Z]/.test(title)) return title;
  return title
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(ACRONYM, (word) => word.toUpperCase());
}

/** "matchId" / "coins_delta" / "self.isWinner" -> "match ID" / "coins delta" / "self is Winner"; CSS capitalises each word. */
export function fieldLabel(field: string): string {
  return field
    .replace(/[_.]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(ACRONYM, (word) => word.toUpperCase());
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * One row with its nested objects spread into dotted fields: `{ self: { placement: 2 } }` becomes
 * `{ "self.placement": 2 }`. A table cell holding a block of JSON is unreadable; a column is not.
 * Arrays stay whole, and nesting below one level stays whole too.
 */
export function flattenRecord(record: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(record)) {
    if (isPlainObject(value) && Object.keys(value).length > 0) {
      for (const [inner, innerValue] of Object.entries(value)) flat[`${field}.${inner}`] = innerValue;
    } else {
      flat[field] = value;
    }
  }
  return flat;
}

// Epoch milliseconds from 2001 to 2286: anything smaller is a count, not a moment.
const MIN_EPOCH_MS = 1e12;
const MAX_EPOCH_MS = 1e13;
const MOMENT_FIELD = /(At|_at|Time|_time|Date|_date)$/;

/** A number in a field named like a time, large enough to be milliseconds since 1970. */
export function isEpochMoment(field: string, value: unknown): value is number {
  return typeof value === "number" && MOMENT_FIELD.test(field) && value >= MIN_EPOCH_MS && value < MAX_EPOCH_MS;
}
