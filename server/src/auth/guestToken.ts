import crypto from "crypto";
import { logger } from "../lib/logger.js";

/**
 * An identity for someone who has not signed up.
 *
 * ── Why guests need a credential at all ───────────────────────────────
 * "A guest can play" is a product promise this project takes seriously, so the
 * answer to an unauthenticated API could not be "sign in or go away". But the
 * answer it actually gave was worse: every player-scoped route read the id out
 * of the URL and believed it. `PUT /api/profile/victim_user` renamed a
 * stranger's profile, anonymously, in production. Recorded in
 * docs/remediation/P0-00-BASELINE.md §4.
 *
 * A guest therefore gets a real, limited identity rather than no identity:
 *
 *   POST /api/auth/guest  →  { playerId: "guest_<random>", token, expiresAt }
 *
 * ── The one property that makes it work ───────────────────────────────
 * The SERVER chooses the id. That is not a detail — it is the whole mechanism.
 * If the caller could name the id it wanted a token for, an attacker would ask
 * for a token for `victim_user` and every ownership check downstream would
 * wave them through. A guest can only ever hold a token for an id that was
 * minted for them, and ids are 128 bits of randomness, so they cannot arrive
 * at somebody else's by guessing.
 *
 * ── Shape ─────────────────────────────────────────────────────────────
 *     bg1.<base64url(JSON payload)>.<base64url(HMAC-SHA256)>
 *
 * The payload is readable, which is fine — it holds an id the holder already
 * knows and two timestamps. The signature is what cannot be produced without
 * the key. Self-contained and derived rather than stored, for the same reason
 * `lib/seatToken.ts` is: no table to keep in sync, and therefore no table to
 * leak or drift.
 *
 * ── Expiry, unlike seat tokens ────────────────────────────────────────
 * Seat tokens deliberately have none, because the room dying is the
 * revocation. A guest identity outlives every room, so nothing else would ever
 * end it. Thirty days: long enough that a returning player keeps their
 * progress, short enough that a token copied off a shared machine stops
 * working.
 */

const VERSION = "bg1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fallback key for a process with no `SESSION_SECRET`.
 *
 * Generated once per process, exactly like `lib/seatToken.ts`, and with the
 * same consequence made explicit: without `SESSION_SECRET`, a restart
 * invalidates every guest token and every guest becomes a new person. That is
 * survivable today only because everything a guest accumulates also dies with
 * the process (see P0-3). It stops being survivable the moment progression is
 * durable, which is why `guestTokenDurability()` exists and why the server
 * warns about it at boot.
 */
const ephemeralSecret = crypto.randomBytes(32).toString("hex");

function signingKey(): string {
  return process.env.SESSION_SECRET?.trim() || ephemeralSecret;
}

/** True when guest identities will NOT survive a restart of this process. */
export function guestTokenDurability(): { durable: boolean; reason: string } {
  return process.env.SESSION_SECRET?.trim()
    ? { durable: true, reason: "SESSION_SECRET is set" }
    : {
        durable: false,
        reason:
          "SESSION_SECRET is not set, so guest tokens are signed with a per-process key. " +
          "Every restart signs guests out and orphans whatever they had accumulated.",
      };
}

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

/**
 * Refuse to boot a production process with no stable guest-signing key.
 *
 * Mirrors `security/operationalAuth.ts`'s `assertOperationalAuthConfigured()`
 * and `economy/voucherCrypto.ts`'s `assertVoucherHmacConfigured()`: an
 * ephemeral key is the normal, harmless default in development (see
 * `signingKey()` above) and a silent economy-integrity defect in production —
 * every outstanding guest wallet becomes permanently unreachable across the
 * very next restart or redeploy, with no error surfaced anywhere except a log
 * line nobody is paged on, and the player simply finds themselves starting
 * over with a fresh starter grant. Warns everywhere else; throws only when
 * `NODE_ENV=production`, so a process that cannot protect outstanding guest
 * progress never starts accepting traffic. Reports only
 * `guestTokenDurability()`'s safe boolean/reason pair — never the secret, a
 * hash of it, or any part of it, whether present or absent.
 */
export function assertGuestTokenDurabilityConfigured(): void {
  const { durable, reason } = guestTokenDurability();
  if (durable) return;

  if (!isProduction()) {
    logger.warn({ message: reason, module: "AUTH" });
    return;
  }

  logger.error({ message: `Refusing to start in production: ${reason}`, module: "AUTH" });
  throw new Error(`Refusing to start in production: ${reason}`);
}

export interface GuestClaims {
  /** The server-minted player id this token speaks for. */
  pid: string;
  /** Issued at, epoch ms. */
  iat: number;
  /** Expires at, epoch ms. */
  exp: number;
}

/**
 * A fresh guest id.
 *
 * The `guest_` prefix is load-bearing: it keeps guest ids in a namespace that
 * can never collide with a Supabase user id (a UUID), so a check of the form
 * "is this identity the owner of that row" can never be satisfied across the
 * two kinds by accident.
 */
export function newGuestPlayerId(): string {
  return `guest_${crypto.randomBytes(16).toString("hex")}`;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export interface MintedGuest {
  playerId: string;
  token: string;
  expiresAt: number;
}

export function mintGuestToken(playerId = newGuestPlayerId(), now = Date.now()): MintedGuest {
  const claims: GuestClaims = { pid: playerId, iat: now, exp: now + TTL_MS };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return {
    playerId,
    token: `${VERSION}.${payload}.${sign(payload)}`,
    expiresAt: claims.exp,
  };
}

/**
 * The guest this token speaks for, or `null`.
 *
 * `null` for anything that is not a well-formed, unexpired token signed with
 * this process's key — a wrong signature, a tampered payload, a different
 * version prefix, or a token whose thirty days are up.
 */
export function verifyGuestToken(token: string | null | undefined, now = Date.now()): string | null {
  if (typeof token !== "string" || token.length === 0) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, payload, signature] = parts;
  if (version !== VERSION) return null;

  const expected = sign(payload);
  // timingSafeEqual throws on a length mismatch, which would turn a malformed
  // token into a 500 rather than a refusal.
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  let claims: GuestClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GuestClaims;
  } catch {
    return null;
  }

  if (typeof claims.pid !== "string" || !claims.pid.startsWith("guest_")) return null;
  if (typeof claims.exp !== "number" || claims.exp <= now) return null;

  return claims.pid;
}
