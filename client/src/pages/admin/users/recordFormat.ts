import { gameLabel } from "../../../components/mandali/album/games";

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

/** "matchId" / "coins_delta" / "self.isWinner" -> "Match ID" / "Coins Delta" / "Self Is Winner". */
export function fieldLabel(field: string): string {
  return field
    .replace(/[_.]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
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

// A full ISO-8601 timestamp such as 2026-10-20T15:10:08.001Z.
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/** An ISO timestamp, or epoch milliseconds, in the operator's own time zone; anything else is left as it came. */
function formatMoment(value: unknown): string {
  const moment = typeof value === "number" ? new Date(value) : typeof value === "string" ? new Date(value) : null;
  return moment && !Number.isNaN(moment.getTime()) ? moment.toLocaleString() : String(value);
}

/** A calendar day with no time ("1997-08-28"): built from its parts so no time zone can move it a day. */
function formatDay(value: unknown): string {
  const parts = typeof value === "string" ? ISO_DAY.exec(value) : null;
  if (!parts) return formatMoment(value);
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])).toLocaleDateString();
}

/** 432000 -> "7m 12s"; an hour or more adds hours. */
function formatDuration(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return String(value);
  const totalSeconds = Math.round(value / MS_PER_SECOND);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return totalMinutes > 0 ? `${totalMinutes}m ${seconds}s` : `${seconds}s`;
}

/** "match_played" -> "Match played". */
function formatSlug(value: unknown): string {
  const words = String(value).replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SHORT_ID_LENGTH = 8;

/** How a non-empty value reads in a cell, by the kind its column declared. */
export function formatText(kind: string, field: string, value: unknown): string {
  switch (kind) {
    case "date":
      return formatMoment(value);
    case "day":
      return formatDay(value);
    case "duration":
      return formatDuration(value);
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "yesNo":
      return value === true ? "Yes" : value === false ? "No" : String(value);
    case "slug":
      return formatSlug(value);
    case "game":
      return gameLabel(String(value));
    case "shortId":
      return String(value).slice(0, SHORT_ID_LENGTH);
    default:
      if (isEpochMoment(field, value)) return formatMoment(value);
      if (typeof value === "string" && ISO_TIMESTAMP.test(value)) return formatMoment(value);
      return String(value);
  }
}
