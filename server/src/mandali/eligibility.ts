import { logger } from "../lib/logger.js";
import type { MandaliAccount } from "./account.js";

/**
 * Current account eligibility for Mandali.
 *
 * Asks Supabase `/auth/v1/user` FRESH on every decision — deliberately
 * bypassing the 5-minute verifier cache in supabaseAuth.ts, which is correct
 * for room hosting but would let a banned/deleted/revoked account keep
 * entering a private space for up to five minutes after revocation.
 *
 * Eligibility policy, all required:
 * • resolves to a real user id
 * • not anonymous (`is_anonymous`)
 * • actively confirmed (`email_confirmed_at` or `phone_confirmed_at` — the
 *   legacy aggregate `confirmed_at` is user-model compatibility, not policy)
 * • not banned (`banned_until` in the future)
 * • not deleted (`deleted_at` set)
 *
 * The outcome distinguishes two denials callers must not conflate:
 * • `ineligible` — the provider ANSWERED "no" (or the shape was unusable).
 *   A committed refusal; the caller refuses with 403.
 * • `unavailable` — we could not ask (no provider configured, network
 *   failure, non-OK status). Nothing was proven about the caller; the
 *   caller refuses with 503 so a transient outage does not masquerade as
 *   an authorization decision.
 */
export interface Eligibility {
  eligible: boolean;
  account: MandaliAccount;
}

export type EligibilityOutcome =
  | { kind: "eligible"; account: MandaliAccount }
  | { kind: "ineligible" }
  | { kind: "unavailable" };

function isFutureTimestamp(value: unknown, nowMs: number): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  return t > nowMs;
}

/** A confirmation timestamp is a parseable ISO-ish instant, nothing looser. */
function isConfirmedTimestamp(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  return !Number.isNaN(Date.parse(value));
}

/** Narrow the parts of the Supabase user model this decision needs. */
function parseUser(body: unknown): Eligibility | null {
  if (typeof body !== "object" || body === null) return null;
  const user = body as Record<string, unknown>;
  if (typeof user.id !== "string" || user.id.length === 0) return null;

  if (user.is_anonymous === true) return null;

  const confirmed =
    isConfirmedTimestamp(user.email_confirmed_at) || isConfirmedTimestamp(user.phone_confirmed_at);
  if (!confirmed) return null;

  const now = Date.now();
  if (isFutureTimestamp(user.banned_until, now)) return null;
  // `deleted_at` is a timestamp of deletion; presence of a parseable instant
  // is a deleted account regardless of whether it lies in the future.
  if (typeof user.deleted_at === "string" && user.deleted_at.length > 0 && !Number.isNaN(Date.parse(user.deleted_at))) {
    return null;
  }

  return {
    eligible: true,
    account: { userId: user.id, email: typeof user.email === "string" ? user.email : null },
  };
}

/** Read on every call — same testability reasoning as supabaseAuth.config(). */
function providerConfig(): { url: string; anonKey: string } | null {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const anonKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  ).trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function currentAccountEligibility(token: string): Promise<EligibilityOutcome> {
  const config = providerConfig();
  if (!config) return { kind: "unavailable" };
  try {
    const res = await fetch(`${config.url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: config.anonKey },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { kind: "unavailable" };
    const eligibility = parseUser(await res.json());
    return eligibility ? { kind: "eligible", account: eligibility.account } : { kind: "ineligible" };
  } catch (err) {
    logger.warn({
      message: `Mandali eligibility lookup could not reach the account provider: ${String(err)}`,
      module: "MANDALI",
    });
    return { kind: "unavailable" };
  }
}
