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
}

/**
 * Read the profile for a signed-in user.
 *
 * Returns `null` both when there is no row and when the read fails. The
 * caller's response is the same either way — keep whatever this device
 * already had — and a profile fetch is never worth blocking sign-in over.
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_id, first_name, last_name, email, dob, gender, account_id")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  if (error || !data) return null;
  return {
    displayName: data.display_name,
    avatarId: data.avatar_id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    dob: data.dob,
    gender: data.gender,
    accountId: data.account_id,
  };
}

/**
 * Write the profile back.
 *
 * An upsert rather than an update because the row may not exist yet: the
 * signup trigger creates one, but a project restored from a backup, or an
 * account made before that trigger existed, would otherwise have nothing to
 * update and fail silently forever.
 */
export async function saveProfile(
  userId: string,
  profile: Profile,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: profile.displayName?.trim() || null,
      avatar_id: profile.avatarId,
      first_name: profile.firstName?.trim() || null,
      last_name: profile.lastName?.trim() || null,
      email: profile.email?.trim() || null,
      dob: profile.dob || null,
      gender: profile.gender || null,
      account_id: profile.accountId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
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
