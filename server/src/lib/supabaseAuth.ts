import crypto from "crypto";
import type { AccountKind } from "@shared/types.js";
import { logger } from "./logger.js";

/**
 * Checking that a player is who they say they are.
 *
 * ── The hole this closes ──────────────────────────────────────────────
 * `hostKind` arrived on `room:create` as a claim and the server believed it,
 * because there was nothing to check it against. Anyone willing to open
 * devtools could send `"member"` and host a shareable room. That was written
 * down as an accepted trade rather than an oversight — see shared/permissions
 * — on the understanding that it would stop being one the day sign-in became
 * real. It has.
 *
 * The client now signs in against Supabase and sends the access token
 * alongside the claim. This module turns the claim into a question with an
 * answer: a token that verifies makes you a member, and a member is who may
 * open a table other people can walk into.
 *
 * ── Three modes, because deployments differ ───────────────────────────
 * • `jwt-secret` — `SUPABASE_JWT_SECRET` is set, tokens are HS256, and we
 *   verify the signature here. No network, no per-join latency. This is the
 *   fast path and the one to prefer.
 *
 * • `auth-api` — no secret, but `SUPABASE_URL` and `SUPABASE_ANON_KEY` are
 *   set, so we ask Supabase who a token belongs to and cache the answer.
 *   Slower, and it needs the auth service reachable, but it is the only
 *   option for projects using asymmetric signing keys (whose private half
 *   never leaves Supabase) and it keeps working across a key rotation.
 *
 * • `off` — nothing configured. The claim is trusted exactly as before, which
 *   is what keeps `npm run dev` free of infrastructure and keeps every
 *   existing test meaningful. Not a security posture; the absence of one.
 *
 * ── What this deliberately does NOT do ────────────────────────────────
 * It does not gate joining, playing, or anything a guest was already allowed
 * to do. A failed verification means "you are a guest", never "you are locked
 * out": a player whose token expired mid-party should quietly lose the ability
 * to open a NEW shareable room, not be ejected from the one they are in.
 */

/**
 * Read on every call rather than captured at import.
 *
 * `seatToken` captures its secret once and is right to — one key, decided at
 * boot. Here the environment decides which of three code paths runs, and
 * pinning that at import time makes the module untestable: a suite cannot
 * exercise all three modes in one process if the first `import` froze the
 * answer. Three string reads per room creation is not a cost worth defending
 * against.
 */
function config(): { url: string; jwtSecret: string; anonKey: string } {
  return {
    url: (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, ""),
    jwtSecret: (process.env.SUPABASE_JWT_SECRET ?? "").trim(),
    // Supabase renamed this: newer projects issue an `sb_publishable_…` key
    // where older ones issued an "anon" JWT. Same header, same job — accept
    // whichever name the dashboard showed whoever set this up.
    anonKey: (
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      ""
    ).trim(),
  };
}

export type VerificationMode = "off" | "jwt-secret" | "auth-api";

/** Which of the three modes this process is in. Reported by `/health`. */
export function verificationMode(): VerificationMode {
  const { url, jwtSecret, anonKey } = config();
  if (jwtSecret) return "jwt-secret";
  if (url && anonKey) return "auth-api";
  return "off";
}

export interface VerifiedAccount {
  userId: string;
  email: string | null;
}

/**
 * Tolerance for clock drift, in seconds.
 *
 * A server whose clock is a few seconds ahead of Supabase's would otherwise
 * reject tokens that were minted correctly a moment ago — and the symptom
 * ("sometimes I can't host") is nearly impossible to diagnose from a report.
 */
const CLOCK_SKEW_S = 60;

/* ──────────────────────── HS256, verified here ──────────────────────── */

interface JwtClaims {
  sub?: string;
  email?: string;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

/**
 * Verify an HS256 token against the project's JWT secret.
 *
 * Returns `null` for anything that is not a well-formed, unexpired token
 * signed with that secret — including a token signed with an algorithm we
 * were not expecting. Trusting the token's own `alg` header is the classic
 * JWT forgery: a token that says `"alg": "none"`, or that swaps HS256 for a
 * public-key algorithm, must not be able to talk its way past the check.
 */
function verifyHs256(token: string): VerifiedAccount | null {
  const { url, jwtSecret } = config();
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: { alg?: string } ;
  let claims: JwtClaims;
  try {
    header = decodeSegment(headerB64) as { alg?: string };
    claims = decodeSegment(payloadB64) as JwtClaims;
  } catch {
    return null;
  }
  if (header?.alg !== "HS256") return null;

  const expected = crypto
    .createHmac("sha256", jwtSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  // timingSafeEqual throws on a length mismatch, which would turn a malformed
  // token into a 500 instead of a rejection.
  if (signatureB64.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expected))) return null;

  if (typeof claims.sub !== "string" || claims.sub === "") return null;
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_S < Date.now() / 1000) return null;

  // Both of these are cheap and both catch a real mistake: a token minted by
  // a DIFFERENT Supabase project (someone pasted the wrong URL), and an
  // anon-key token, which is a valid JWT for the same project but represents
  // nobody at all.
  if (url && typeof claims.iss === "string" && claims.iss !== `${url}/auth/v1`) {
    return null;
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes("authenticated")) return null;

  return { userId: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

/* ──────────────────────── Asking Supabase ──────────────────────── */

interface CacheEntry {
  account: VerifiedAccount | null;
  expiresAt: number;
}

/**
 * Answers we already have.
 *
 * A player creating three rooms in a minute should not cost three round trips
 * to the auth service, and a client retrying a failing join should not turn
 * into a stampede against it. Failures are cached too, briefly — long enough
 * to absorb a retry loop, short enough that fixing the cause does not need a
 * server restart.
 */
const cache = new Map<string, CacheEntry>();
const CACHE_MAX = 500;
const CACHE_OK_MS = 60_000;
const CACHE_FAIL_MS = 15_000;

function cacheKey(token: string): string {
  // The token is a bearer credential; a hash is enough to look one up and
  // keeps the credentials themselves out of a long-lived map.
  return crypto.createHash("sha256").update(token).digest("base64url");
}

function readCache(key: string): CacheEntry | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit;
}

function writeCache(key: string, account: VerifiedAccount | null): void {
  if (cache.size >= CACHE_MAX) {
    // Cheapest useful eviction: drop what has already expired, and if none
    // has, drop the oldest insertion. Map preserves insertion order.
    for (const [k, v] of cache) {
      if (v.expiresAt <= Date.now()) cache.delete(k);
    }
    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
  }
  cache.set(key, {
    account,
    expiresAt: Date.now() + (account ? CACHE_OK_MS : CACHE_FAIL_MS),
  });
}

/** Test seam — the cache would otherwise carry answers between cases. */
export function clearVerificationCache(): void {
  cache.clear();
}

async function verifyViaAuthApi(token: string): Promise<VerifiedAccount | null> {
  const { url, anonKey } = config();
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      // Without a timeout this inherits Node's default of none, and a hung
      // auth service would leave `room:create` waiting with no ack — the
      // client has no timeout of its own and would spin forever.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: string; email?: string } | null;
    if (!body?.id) return null;
    return { userId: body.id, email: typeof body.email === "string" ? body.email : null };
  } catch (err) {
    // A network failure is not the player's fault and not proof of anything
    // about their token, but the safe reading is still "unverified". Logged
    // because a service that is down looks exactly like everyone suddenly
    // being a guest, and that is a confusing bug report to receive.
    logger.warn({
      message: `Could not reach Supabase to verify a session: ${String(err)}`,
      module: "AUTH",
    });
    return null;
  }
}

/**
 * Who this token belongs to, or `null` if it belongs to nobody.
 *
 * Returns `null` in `off` mode as well: with nothing configured there is no
 * such thing as a verified account, and callers must not read the absence of
 * a verification as a denial — see `resolveAccountKind`, which is what nearly
 * every caller actually wants.
 */
export async function verifyAccessToken(
  token: string | null | undefined,
): Promise<VerifiedAccount | null> {
  if (typeof token !== "string" || token.length === 0) return null;

  const mode = verificationMode();
  if (mode === "off") return null;
  if (mode === "jwt-secret") return verifyHs256(token);

  const key = cacheKey(token);
  const hit = readCache(key);
  if (hit) return hit.account;

  const account = await verifyViaAuthApi(token);
  writeCache(key, account);
  return account;
}

/**
 * What the server should BELIEVE this connection is.
 *
 * The claim is what the client says; the token is the evidence. With
 * verification configured, evidence wins and a claim without any is downgraded
 * — that is the whole point. With it off, the claim stands, exactly as it did
 * before this file existed.
 *
 * Note the direction of the downgrade: a caller that sends no token gets
 * `"guest"`, and a guest can still play everything except open a shareable
 * room. Nobody is refused entry by this function.
 */
export async function resolveAccountKind(
  claimed: AccountKind | undefined,
  token: string | null | undefined,
): Promise<AccountKind> {
  if (verificationMode() === "off") return claimed ?? "member";

  const account = await verifyAccessToken(token);
  if (account) return "member";

  if (claimed === "member") {
    // The single most likely cause is a client build with no Supabase keys
    // talking to a server that has them — in which case every player silently
    // becomes a guest and nobody can host. Worth a line in the log.
    logger.warn({
      message:
        `A client claimed to be signed in but its session ${token ? "did not verify" : "was missing"}. ` +
        "It will be treated as a guest. If this is every client, check that " +
        "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or the older " +
        "VITE_SUPABASE_ANON_KEY) are set on the client BUILD — Vite bakes them " +
        "in at build time, so setting them on the host without rebuilding " +
        "changes nothing — and that they name the same project as the server.",
      module: "AUTH",
    });
  }
  return "guest";
}
