import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The account backend — Supabase, when it is configured.
 *
 * ── Why Supabase, and why it is optional ──────────────────────────────
 * Accounts need a database and somewhere to send email, and the project has
 * no budget for a server it has to run. Supabase's free tier is Postgres,
 * an auth service and a mailer, so it buys all three at once, and the client
 * talks to it directly over HTTPS — the game server never sees a password.
 *
 * Everything here returns `null` when the two env vars are unset, and every
 * caller is written to treat that as a normal state rather than a failure.
 * That is what keeps the project's standing promise that `npm run dev` needs
 * zero infrastructure: with no keys, the app behaves exactly as it did before
 * accounts existed — sign-in flips a local flag and says so on the page.
 *
 * ── One storage key, deliberately named ───────────────────────────────
 * supabase-js defaults to `sb-<projectRef>-auth-token`, a key whose name
 * changes with the project. The DPDP data inventory has to declare every key
 * this app writes by name (see lib/privacy/dataInventory.ts), and a key that
 * shifts with an env var cannot be declared. Pinning `storageKey` makes the
 * session a named, declarable, erasable thing.
 *
 * PKCE adds a second, short-lived key derived from the first
 * (`<storageKey>-code-verifier`); both are declared.
 */

const URL = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");

/**
 * Supabase renamed this key.
 *
 * Older projects show an "anon" key (a JWT); newer ones show a "publishable"
 * key (`sb_publishable_…`). They go in the same header and do the same job, so
 * both names are accepted rather than making whoever copies from the
 * dashboard notice that the docs and the UI disagree. Publishable wins if both
 * are set, since a project that has one is the newer kind.
 */
const ANON_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  ""
).trim();

/** Where the session lives. Declared in the data inventory under this name. */
export const SESSION_STORAGE_KEY = "bhalyam.session";
/** PKCE's half-finished handshake. Written on redirect out, cleared on return. */
export const SESSION_VERIFIER_KEY = `${SESSION_STORAGE_KEY}-code-verifier`;

/**
 * True when this build has somewhere to send a sign-in.
 *
 * Read it before promising the player anything: every screen that can only
 * pretend says so out loud rather than faking a success.
 */

export const isSupabaseConfigured = URL !== "" && ANON_KEY !== "";

let cached: SupabaseClient | null = null;

/**
 * The one client for the whole app, or `null` when unconfigured.
 *
 * Single instance for the same reason `getSocket()` is a singleton: two
 * clients would each hold their own auth state and refresh timer against the
 * same storage key, and would race each other into signing the player out.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;

  cached = createClient(URL, ANON_KEY, {
    auth: {
      storageKey: SESSION_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      // The OAuth and password-recovery links both come back as a `?code=`
      // on one of our own routes; this is what exchanges it for a session.
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    // Identifies our traffic in Supabase's logs, which is the difference
    // between "some client" and "the game client" when reading them later.
    global: { headers: { "x-application-name": "bhalyam-client" } },
  });
  return cached;
}

/** Absolute URL for a route Supabase should send the player back to. */
export function redirectTo(path: string): string {
  return new window.URL(path, window.location.origin).toString();
}

/**
 * Turn whatever the auth service returned into one line a player can act on.
 *
 * Supabase's messages are written for developers ("Invalid login
 * credentials", "AuthApiError"), and a few of them are worse than useless on
 * a phone at someone else's house. The ones worth rewording are rewritten;
 * the rest pass through, because an unhelpful real message still beats a
 * generic one that hides which thing went wrong.
 */
export function authErrorMessage(err: unknown): string {
  const raw =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err ?? "");

  const text = raw.trim();
  if (!text) return "Something went wrong. Try again in a moment.";

  if (/invalid login credentials/i.test(text)) {
    // Deliberately does not say which half was wrong: "no account with that
    // email" tells anyone probing a list of addresses which ones are real.
    return "That email and password don't match an account.";
  }
  if (/email not confirmed/i.test(text)) {
    return "Confirm your email first — the link is in your inbox.";
  }
  if (/user already registered|already been registered/i.test(text)) {
    return "That email already has an account. Try signing in instead.";
  }
  if (/token has expired or is invalid|otp_expired|invalid.*(otp|token)/i.test(text)) {
    // One message for expired and mistyped on purpose. Supabase does not
    // distinguish them, and guessing would either accuse someone of
    // mistyping a code they read correctly or send them chasing a new
    // email when the digits were simply wrong. The fix covers both.
    return "That code didn't work — it may have expired. Resend to get a fresh one.";
  }
  if (/for security purposes|rate limit|too many requests/i.test(text)) {
    return "Too many tries. Wait a minute and try again.";
  }
  if (/password should be at least/i.test(text)) {
    return "That password is too short — use at least 8 characters.";
  }
  if (/failed to fetch|network|load failed/i.test(text)) {
    return "Couldn't reach the account service. Check your connection.";
  }
  if (/provider is not enabled|unsupported provider/i.test(text)) {
    return "That sign-in method isn't switched on for this app yet.";
  }
  return text;
}
