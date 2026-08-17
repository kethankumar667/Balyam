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
  if (typeof window === "undefined") return null;
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
  if (typeof window === "undefined") return path;
  return new globalThis.URL(path, window.location.origin).toString();
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
/** The raw text of whatever the auth service threw, for matching against. */
function errorText(err: unknown): string {
  return typeof err === "object" && err !== null && "message" in err
    ? String((err as { message: unknown }).message)
    : String(err ?? "");
}

/**
 * "You have an account, but you never finished confirming it."
 *
 * Worth singling out because it is the one auth failure with an exact,
 * one-click remedy — the confirmation screen has a Resend button — and
 * because it is the state every player left stranded by a missing OTP email
 * ends up in. Treated as a message, it is a dead end: sign-up says the email
 * is taken, sign-in says to check an inbox that never received anything, and
 * the only escape is an admin deleting the row by hand.
 *
 * Callers use it to route to `/verify-email` instead of printing a sentence.
 */
export function isEmailNotConfirmed(err: unknown): boolean {
  return /email not confirmed|email_not_confirmed/i.test(errorText(err));
}

export function authErrorMessage(err: unknown): string {
  const raw = errorText(err);

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
  /**
   * The mail cap, and why it does not say "try again".
   *
   * Supabase returns 429 for two completely different things, and collapsing
   * them into one "too many tries" message is what turned a configuration
   * problem into eighty abandoned accounts.
   *
   *   "For security purposes, you can only request this after N seconds"
   *      — a per-address throttle. Waiting genuinely fixes it.
   *   "email rate limit exceeded"
   *      — the PROJECT's hourly mail allowance is spent. It is not this
   *        player's doing, they are simply the third person to sign up this
   *        hour, and no amount of retrying will help until the hour rolls
   *        over or custom SMTP is configured (docs/runbooks/supabase.md §7).
   *
   * Telling the second group to "wait a minute and try again" sent them into
   * a retry loop against a wall, and because the account row is created
   * before the mail is sent, they were left with an unconfirmed account they
   * could neither use nor sign up again with.
   *
   * The specific match must come first — the general one below would swallow
   * it, since both contain "rate limit".
   */
  if (/email rate limit exceeded|over_email_send_rate_limit/i.test(text)) {
    return "We couldn't send the email — this app has hit its hourly limit for sign-up emails. This is our problem, not yours. Try again later, or sign in with Google.";
  }
  /**
   * SMTP is misconfigured or the mail provider rejected the message. The raw
   * string is a developer's sentence ("Error sending confirmation email") and
   * says nothing a player can act on, so it does not pass through.
   */
  if (/error sending (confirmation|recovery|magic|invite)?\s*(e?mail)/i.test(text)) {
    return "We couldn't send the email just now. This is our problem, not yours — try again shortly, or sign in with Google.";
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
