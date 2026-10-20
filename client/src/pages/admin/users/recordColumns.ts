import { fieldLabel, flattenRecord } from "./recordFormat";

/**
 * What an operator sees of each kind of record.
 *
 * `admin_player_records` returns whole database rows: ids, row versions, avatar file names, both sides of a
 * join. Almost none of that helps someone reading a player's history, and a row that wide scrolls
 * sideways. Each section here names the few fields worth reading, in reading order, with a label and how
 * to show it. Anything not listed is not shown. The list is per section and by field name; a section the
 * server returns in some other shape falls back to showing what it has (see `presentSection`).
 *
 * `risk_state` is deliberately absent from `rewards`: a watch on a player is never shown to anyone but
 * the operator who set it, and not as a table column.
 */

export type CellKind = "text" | "date" | "day" | "duration" | "number" | "yesNo" | "slug" | "game" | "shortId";

export interface ColumnSpec {
  field: string;
  label: string;
  kind?: CellKind;
}

/** `detail` is one record laid out as labelled fields; `table` is many records, one per row. */
type Layout = "table" | "detail";

interface SectionSpec {
  layout: Layout;
  columns: ColumnSpec[];
}

export interface PresentedColumn {
  field: string;
  label: string;
  kind: CellKind;
}

export interface PresentedSection {
  layout: Layout;
  columns: PresentedColumn[];
  rows: Record<string, unknown>[];
}

const SECTION_SPECS: Record<string, SectionSpec> = {
  account: {
    layout: "detail",
    columns: [
      { field: "display_name", label: "Display name" },
      { field: "first_name", label: "First name" },
      { field: "last_name", label: "Last name" },
      { field: "email", label: "Email" },
      { field: "dob", label: "Date of birth", kind: "day" },
      { field: "gender", label: "Gender", kind: "slug" },
      { field: "region", label: "Region" },
      { field: "bio", label: "Bio" },
      { field: "created_at", label: "Created", kind: "date" },
      { field: "updated_at", label: "Updated", kind: "date" },
    ],
  },
  profile: {
    layout: "detail",
    columns: [
      { field: "display_name", label: "Display name" },
      { field: "level", label: "Level", kind: "number" },
      { field: "experience_points", label: "XP", kind: "number" },
      { field: "joined_at", label: "Joined", kind: "date" },
      { field: "last_seen_at", label: "Last seen", kind: "date" },
      { field: "updated_at", label: "Updated", kind: "date" },
    ],
  },
  matches: {
    layout: "table",
    columns: [
      { field: "finished_at", label: "Finished", kind: "date" },
      { field: "game", label: "Game", kind: "game" },
      { field: "room_code", label: "Room" },
      { field: "duration_ms", label: "Duration", kind: "duration" },
      { field: "participant_count", label: "Players", kind: "number" },
      { field: "winner_kind", label: "Winner", kind: "slug" },
    ],
  },
  participants: {
    layout: "table",
    columns: [
      { field: "match_id", label: "Match", kind: "shortId" },
      { field: "placement", label: "Place", kind: "number" },
      { field: "is_winner", label: "Won", kind: "yesNo" },
    ],
  },
  xp: {
    layout: "table",
    columns: [
      { field: "created_at", label: "When", kind: "date" },
      { field: "amount", label: "XP", kind: "number" },
      { field: "reason", label: "Reason", kind: "slug" },
      { field: "source_kind", label: "Source", kind: "slug" },
    ],
  },
  achievements: {
    layout: "table",
    columns: [
      { field: "unlocked_at", label: "Unlocked", kind: "date" },
      { field: "achievement_id", label: "Achievement", kind: "slug" },
    ],
  },
  challenges: {
    layout: "table",
    columns: [
      { field: "claimed_at", label: "Claimed", kind: "date" },
      { field: "challenge_id", label: "Challenge", kind: "slug" },
      { field: "period_key", label: "Period" },
      { field: "xp_awarded", label: "XP awarded", kind: "number" },
    ],
  },
  progression: {
    layout: "detail",
    columns: [
      { field: "season_id", label: "Season" },
      { field: "season_level", label: "Level", kind: "number" },
      { field: "season_matches", label: "Matches", kind: "number" },
      { field: "season_wins", label: "Wins", kind: "number" },
      { field: "season_xp", label: "XP", kind: "number" },
      { field: "tournament_wins", label: "Tournament wins", kind: "number" },
      { field: "updated_at", label: "Updated", kind: "date" },
    ],
  },
  wallet: {
    layout: "detail",
    columns: [
      { field: "balance", label: "Balance", kind: "number" },
      { field: "lifetime_granted", label: "Granted", kind: "number" },
      { field: "lifetime_earned", label: "Earned", kind: "number" },
      { field: "lifetime_spent", label: "Spent", kind: "number" },
      { field: "lifetime_refunded", label: "Refunded", kind: "number" },
      { field: "is_frozen", label: "Frozen", kind: "yesNo" },
      { field: "created_at", label: "Opened", kind: "date" },
      { field: "updated_at", label: "Updated", kind: "date" },
    ],
  },
  ledger: {
    layout: "table",
    columns: [
      { field: "created_at", label: "When", kind: "date" },
      { field: "entry_type", label: "Type", kind: "slug" },
      { field: "amount", label: "Amount", kind: "number" },
      { field: "balance_after", label: "Balance", kind: "number" },
      { field: "description", label: "Description" },
    ],
  },
  rewards: {
    layout: "table",
    columns: [
      { field: "earned_at", label: "Earned", kind: "date" },
      { field: "reward_type", label: "Type", kind: "slug" },
      { field: "reason_code", label: "Reason", kind: "slug" },
      { field: "amount", label: "Amount", kind: "number" },
      { field: "status", label: "Status", kind: "slug" },
      { field: "vesting_until", label: "Vests", kind: "date" },
      { field: "released_at", label: "Released", kind: "date" },
      { field: "voided_reason", label: "Void reason", kind: "slug" },
    ],
  },
  reward_audit: {
    layout: "table",
    columns: [
      { field: "created_at", label: "When", kind: "date" },
      { field: "reward_kind", label: "Reward", kind: "slug" },
      { field: "xp_delta", label: "XP", kind: "number" },
      { field: "outcome", label: "Outcome", kind: "slug" },
      { field: "detail", label: "Detail" },
    ],
  },
  friends: {
    layout: "table",
    columns: [
      { field: "display_name", label: "Friend" },
      { field: "created_at", label: "Friends since", kind: "date" },
    ],
  },
  friend_requests: {
    layout: "table",
    columns: [
      { field: "created_at", label: "Sent", kind: "date" },
      { field: "sender_name", label: "From" },
      { field: "status", label: "Status", kind: "slug" },
      { field: "updated_at", label: "Updated", kind: "date" },
    ],
  },
  mandali: {
    layout: "table",
    columns: [
      { field: "joined_at", label: "Joined", kind: "date" },
      { field: "mandali_id", label: "Mandali", kind: "shortId" },
      { field: "role", label: "Role", kind: "slug" },
      { field: "state", label: "State", kind: "slug" },
    ],
  },
  moderation: {
    layout: "table",
    columns: [
      { field: "created_at", label: "When", kind: "date" },
      { field: "action", label: "Action", kind: "slug" },
      { field: "reason", label: "Reason" },
      { field: "actor_id", label: "By", kind: "shortId" },
    ],
  },
};

// A section keeps one record about the player (their profile, their wallet), not a history.
const DETAIL_FALLBACK = new Set(["account", "profile", "progression", "wallet"]);
// The list applies only when the rows really are the shape it was written for: at least this share of its
// fields present. A row in some other shape (the in-memory store's, say) is shown as it comes instead of
// being cut down to a list that does not describe it.
const MIN_SPEC_SHARE = 0.6;
const MIN_SPEC_FIELDS = 2;

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === "";

function fieldsOf(rows: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const field of Object.keys(row)) seen.add(field);
  return [...seen];
}

/** The columns and rows to draw for one section: the curated list when it fits, else what the rows have. */
export function presentSection(key: string, records: Record<string, unknown>[]): PresentedSection {
  const rows = records.map(flattenRecord);
  const spec = SECTION_SPECS[key];
  const present = new Set(fieldsOf(rows));
  const fitting = spec?.columns.filter((column) => present.has(column.field)) ?? [];

  if (spec && fitting.length >= Math.max(MIN_SPEC_FIELDS, Math.ceil(spec.columns.length * MIN_SPEC_SHARE))) {
    // A history table drops a column nobody has a value in; a detail view keeps its fields and says so.
    const columns = spec.layout === "table" ? fitting.filter((column) => rows.some((row) => !isEmpty(row[column.field]))) : fitting;
    return { layout: spec.layout, columns: columns.map((column) => ({ ...column, kind: column.kind ?? "text" })), rows };
  }

  const columns = fieldsOf(rows)
    .filter((field) => rows.some((row) => !isEmpty(row[field])))
    .map((field): PresentedColumn => ({ field, label: fieldLabel(field), kind: "text" }));
  return { layout: DETAIL_FALLBACK.has(key) ? "detail" : "table", columns, rows };
}
