import crypto from "crypto";
import type { IceConfigResponse, IceServerSpec } from "@shared/types.js";

/**
 * ICE server configuration, issued by the server.
 *
 * ── Why this is not a client env var ──────────────────────────────────
 * The first pass read `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` in the
 * browser. Vite inlines `VITE_*` values into the bundle at build time, so
 * those credentials shipped in plain text inside the published JavaScript.
 * Anyone could read them from devtools and point their own traffic at the
 * relay. TURN is billed per gigabyte relayed, so that is not a theoretical
 * leak, it is somebody else's bandwidth on your invoice.
 *
 * The server now issues credentials instead, and the secret never leaves it.
 *
 * ── Two supported modes ───────────────────────────────────────────────
 * 1. EPHEMERAL (preferred, and what coturn is built for). Set `TURN_SECRET`
 *    to coturn's `static-auth-secret`. Credentials are derived per request:
 *
 *      username   = "<unix-expiry>:<identity>"
 *      credential = base64( HMAC-SHA1( secret, username ) )
 *
 *    coturn recomputes the same HMAC and accepts it until the expiry passes.
 *    A leaked pair is worthless within the hour, and no shared password
 *    exists to rotate.
 *
 * 2. STATIC. Some hosted providers only issue a fixed username/password. Set
 *    `TURN_USERNAME` / `TURN_PASSWORD` for those. Still served from here
 *    rather than baked into the bundle, so the credential is at least behind
 *    the socket rather than public, but prefer mode 1 where you can.
 *
 * With neither set, callers get STUN only and `hasRelay: false`, which the
 * client surfaces as "couldn't reach some players" rather than failing mute.
 */

/** Default TTL for an issued credential. One hour outlives any single match. */
const DEFAULT_TTL_SECONDS = 3600;

const DEFAULT_STUN = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Credentials for coturn's REST scheme.
 *
 * Exported for tests: the exact string layout is a protocol contract with
 * coturn, not an implementation detail we are free to change.
 */
export function makeEphemeralCredential(
  secret: string,
  identity: string,
  ttlSeconds: number,
  now = Date.now(),
): { username: string; credential: string } {
  const expiry = Math.floor(now / 1000) + ttlSeconds;
  // The identity half is informational — coturn only verifies the HMAC — but
  // it makes relay logs traceable to a player when diagnosing a bad call.
  const username = `${expiry}:${identity}`;
  const credential = crypto
    .createHmac("sha1", secret)
    .update(username)
    .digest("base64");
  return { username, credential };
}

/**
 * Build the ICE list for one player.
 *
 * `identity` is stamped into ephemeral usernames for traceability. It is not
 * a security boundary — anyone with a socket can request a credential, which
 * is the same trust level as being able to join a room.
 */
export function buildIceConfig(identity: string, now = Date.now()): IceConfigResponse {
  const stun = splitList(process.env.STUN_URLS);
  const iceServers: IceServerSpec[] = [
    { urls: stun.length > 0 ? stun : DEFAULT_STUN },
  ];

  const turnUrls = splitList(process.env.TURN_URLS ?? process.env.TURN_URL);
  const ttlSeconds = Number(process.env.TURN_TTL_SECONDS) || DEFAULT_TTL_SECONDS;

  if (turnUrls.length === 0) {
    return { iceServers, hasRelay: false, ttlSeconds };
  }

  const secret = process.env.TURN_SECRET;
  if (secret) {
    const { username, credential } = makeEphemeralCredential(
      secret,
      identity,
      ttlSeconds,
      now,
    );
    iceServers.push({ urls: turnUrls, username, credential });
    return { iceServers, hasRelay: true, ttlSeconds };
  }

  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_PASSWORD;
  if (username && credential) {
    iceServers.push({ urls: turnUrls, username, credential });
    return { iceServers, hasRelay: true, ttlSeconds };
  }

  // A TURN URL with no way to authenticate is a misconfiguration, not a
  // relay. Report it as absent so the client's warning is accurate rather
  // than advertising a relay that will reject every allocation.
  return { iceServers, hasRelay: false, ttlSeconds };
}

/** Which credential scheme is live, for logs and /health. */
export function turnStatus(): { configured: boolean; mode: "ephemeral" | "static" | "none"; urls: number } {
  const urls = splitList(process.env.TURN_URLS ?? process.env.TURN_URL);
  if (urls.length === 0) return { configured: false, mode: "none", urls: 0 };
  if (process.env.TURN_SECRET) return { configured: true, mode: "ephemeral", urls: urls.length };
  if (process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
    return { configured: true, mode: "static", urls: urls.length };
  }
  // URLs but no credentials: cannot allocate, so not configured.
  return { configured: false, mode: "none", urls: urls.length };
}
