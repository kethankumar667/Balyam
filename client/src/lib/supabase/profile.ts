import { getSupabase } from "./client";

/**
 * The player's profile, as it exists on the server rather than on one phone.
 *
 * ── What this is for ──────────────────────────────────────────────────
 * Display name and avatar have always lived in `localStorage`, which means
 * they belong to a browser and not to a person: sign in on a phone after
 * setting them on a laptop and you are "Player 3" again. One table with two
 * columns fixes that, and it is the smallest thing an account can usefully
 * own.
 *
 * ── What it deliberately is NOT ───────────────────────────────────────
 * Not match history, not stats, not friends. Those need an outcome shape
 * every game agrees on, which does not exist yet (ten engines end in
 * genuinely different ways), and inventing one here would get it wrong for
 * most of them. Profiles are the part that is simple today.
 *
 * Every function no-ops when Supabase is unconfigured, so a build with no
 * keys keeps its local-only behaviour instead of throwing.
 */

export interface Profile {
  displayName: string | null;
  avatarId: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
  accountId?: string | null;
  bio?: string | null;
  region?: string | null;
}

/** Row shape, snake_case as Postgres has it. Kept private to this module. */
interface ProfileRow {
  display_name: string | null;
  avatar_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
  account_id?: string | null;
  bio?: string | null;
  region?: string | null;
}

/**
 * Read the profile for a signed-in user.
 *
 * Returns `null` both when there is no row and when the read fails. The
 * caller's response is the same either way — keep whatever this device
 * already had — and a profile fetch is never worth blocking sign-in over.
 *
 * ── Two queries, not one ──────────────────────────────────────────────
 * `display_name` and `avatar_id` have existed since the very first
 * migration; the other eight columns arrived later, in migrations that a
 * given Supabase project might not have applied yet. A single `select`
 * asking for all ten is one Postgres statement — one missing column fails
 * the *entire* query, silently returning `null` for a row that actually has
 * a perfectly good name and avatar sitting in it. Reading the two
 * load-bearing columns in their own request means a project that hasn't
 * run the later migrations still gets name/avatar sync; it only loses the
 * newer optional fields, instead of losing everything.
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const core = await supabase
    .from("profiles")
    .select("display_name, avatar_id")
    .eq("id", userId)
    .maybeSingle<Pick<ProfileRow, "display_name" | "avatar_id">>();
  if (core.error || !core.data) return null;

  const extended = await supabase
    .from("profiles")
    .select("first_name, last_name, email, dob, gender, account_id, bio, region")
    .eq("id", userId)
    .maybeSingle<Omit<ProfileRow, "display_name" | "avatar_id">>();
  const extra = extended.error ? null : extended.data;

  return {
    displayName: core.data.display_name,
    avatarId: core.data.avatar_id,
    firstName: extra?.first_name,
    lastName: extra?.last_name,
    email: extra?.email,
    dob: extra?.dob,
    gender: extra?.gender,
    accountId: extra?.account_id,
    bio: extra?.bio,
    region: extra?.region,
  };
}

/**
 * Write the profile back.
 *
 * An upsert rather than an update because the row may not exist yet: the
 * signup trigger creates one, but a project restored from a backup, or an
 * account made before that trigger existed, would otherwise have nothing to
 * update and fail silently forever.
 *
 * ── Partial by design — every field here is optional ──────────────────
 * `profile` is a `Partial<Profile>`: a caller passes only the fields it
 * actually changed (a name/avatar edit passes just those two; a bio/region
 * edit passes just those two), and only THOSE columns end up in the upsert
 * payload — Postgres leaves every column absent from the payload untouched
 * on the conflict-update path. Getting this wrong once meant every routine
 * name/avatar sync (see `startProfileSync`'s debounced push, which only
 * ever has `displayName`/`avatarId` to send) silently overwrote
 * firstName/lastName/email/dob/gender/accountId with NULL on every save,
 * because the old version always included all eight columns in the
 * payload, falling back to `null` for whichever ones the caller hadn't
 * provided. Never widen this back to an unconditional object literal.
 */
export async function saveProfile(
  userId: string,
  profile: Partial<Profile>,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const row: Record<string, unknown> = { id: userId, updated_at: new Date().toISOString() };
  if (profile.displayName !== undefined) row.display_name = profile.displayName?.trim() || null;
  if (profile.avatarId !== undefined) row.avatar_id = profile.avatarId;
  if (profile.firstName !== undefined) row.first_name = profile.firstName?.trim() || null;
  if (profile.lastName !== undefined) row.last_name = profile.lastName?.trim() || null;
  if (profile.email !== undefined) row.email = profile.email?.trim() || null;
  if (profile.dob !== undefined) row.dob = profile.dob || null;
  if (profile.gender !== undefined) row.gender = profile.gender || null;
  if (profile.accountId !== undefined) row.account_id = profile.accountId || null;
  if (profile.bio !== undefined) row.bio = profile.bio?.trim() || null;
  if (profile.region !== undefined) row.region = profile.region || null;

  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  return !error;
}

/**
 * Delete the account itself — DPDP Section 12, the half localStorage cannot
 * reach.
 *
 * Erasing this device is not erasure once a row with an email address exists
 * on someone else's server. Removing a user from `auth.users` normally needs
 * the service-role key, which must never be shipped to a browser, so the
 * migration defines a `security definer` function that deletes exactly
 * `auth.uid()` and nothing else. The client can therefore erase itself
 * without the app ever holding an admin credential.
 *
 * The profile row goes with it: the table's foreign key is `on delete
 * cascade`, so there is no second call to forget.
 */
export async function deleteAccount(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { ok: true };

  const { error } = await supabase.rpc("delete_account");
  if (error) return { ok: false, error: error.message };

  // The session now points at a user that no longer exists. Clearing it
  // locally is enough — every token minted for that user is already dead.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return { ok: true };
}
