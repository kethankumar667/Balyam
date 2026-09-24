/**
 * Socket identity — the wire contract for proving who a connection belongs to.
 *
 * A socket carries no identity of its own: `room:create` names a seat, not a
 * person. Every social socket event (presence, DMs, feed) needs a VERIFIED
 * person, so a connection presents the same bearer token the HTTP API uses and
 * the server binds the result to the connection. The payload carries the
 * credential only — never a player id — so there is nothing to spoof.
 */

/** A JWT is a few hundred bytes to a couple of KB; anything past this is not one. */
export const MAX_SESSION_TOKEN_LENGTH = 4096;

export interface SessionAuthenticatePayload {
  token: string;
}

/**
 * Closed set of refusals. Deliberately coarse: a caller learns "your credential
 * did not verify", never why, so the endpoint cannot be used to probe tokens.
 */
export const SESSION_ERRORS = ["INVALID_CREDENTIAL", "RATE_LIMITED", "SUPERSEDED", "INTERNAL"] as const;
export type SessionError = (typeof SESSION_ERRORS)[number];

export type SessionAuthenticateResult =
  | { ok: true; playerId: string; kind: "guest" | "member"; expiresAt: number }
  | { ok: false; error: SessionError };

/** What a social socket event acks when the connection has no live session. */
export const UNAUTHENTICATED = "UNAUTHENTICATED" as const;
