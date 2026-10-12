/**
 * Fills the profile fields a Google sign-in leaves empty.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * The email sign-up form collects first name, last name and date of birth
 * itself and hands them to Supabase as `first_name` / `last_name` / `dob`.
 * Google hands over a single `full_name` (and `name`), and — on the basic
 * scopes we use — no birthday or gender at all. Reading only the form's own
 * keys therefore left every Google account with null names.
 *
 * Only what is already in the metadata is derived here. The Google `picture`
 * is deliberately NOT used: avatars are a closed set (`sanitizeAvatar`), and
 * an off-site image URL would hand every player's IP to a third party.
 */

import { isKnownAvatar } from "@shared/avatars";

export interface PersonName {
  firstName: string;
  lastName: string;
}

const EMPTY_NAME: PersonName = { firstName: "", lastName: "" };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** "Mary Jane Watson" → first "Mary", last "Jane Watson". One word → no last name. */
export function splitFullName(full: unknown): PersonName {
  const words = text(full).split(/\s+/).filter(Boolean);
  if (words.length === 0) return EMPTY_NAME;
  const [firstName, ...rest] = words;
  return { firstName, lastName: rest.join(" ") };
}

/**
 * First/last name from a Supabase `user_metadata` blob, most specific source
 * first: the sign-up form's own keys, then Google's `given_name` /
 * `family_name`, then a split of `full_name` / `name`.
 */
export function namesFromMetadata(meta: Record<string, unknown> | null | undefined): PersonName {
  if (!meta) return EMPTY_NAME;

  const formFirst = text(meta.first_name);
  const formLast = text(meta.last_name);
  if (formFirst || formLast) return { firstName: formFirst, lastName: formLast };

  const givenFirst = text(meta.given_name);
  const givenLast = text(meta.family_name);
  if (givenFirst || givenLast) return { firstName: givenFirst, lastName: givenLast };

  return splitFullName(text(meta.full_name) || text(meta.name));
}

/** The profile columns this module is allowed to fill in, and nothing else. */
export interface FillableProfile {
  firstName?: string | null;
  lastName?: string | null;
  accountId?: string | null;
  dob?: string | null;
}

/**
 * What to write into a profile row that has gaps: names from the sign-in
 * metadata, and a Bhalyam ID if there is none (internal only — the user is
 * never asked for it). A field the row already has is never touched, and a
 * name that cannot be derived is left out rather than written as "".
 */
export function missingProfileFields(
  row: FillableProfile,
  meta: Record<string, unknown> | null | undefined,
  makeAccountId: (dob?: string | null) => string,
): Partial<Pick<FillableProfile, "firstName" | "lastName" | "accountId">> {
  const names = namesFromMetadata(meta);
  const fill: Partial<Pick<FillableProfile, "firstName" | "lastName" | "accountId">> = {};
  if (!row.firstName && names.firstName) fill.firstName = names.firstName;
  if (!row.lastName && names.lastName) fill.lastName = names.lastName;
  if (!row.accountId) fill.accountId = makeAccountId(row.dob);
  return fill;
}

/**
 * A member with no avatar of their own. Only an id from the app's closed list
 * counts (`isKnownAvatar`): a Google photo URL, or anything else that is not a
 * shipped file, is treated as "none" so it is never trusted or rendered.
 */
export function needsAvatar(profile: { avatarId?: string | null }): boolean {
  return !isKnownAvatar(profile.avatarId);
}

/**
 * A member who has not told us their birthday. It is asked for one reason —
 * so the Bhalyam group can send birthday wishes — and is always skippable.
 */
export function needsBirthday(profile: { dob?: string | null }): boolean {
  return !profile.dob;
}
