import { verifyAccessToken } from "../lib/supabaseAuth.js";
import { verifyGuestToken } from "../auth/guestToken.js";
import { ensureGuestIdentityProvisioned } from "../auth/identity.js";
import { logger } from "../lib/logger.js";

/**
 * The one thing RoomManager needed and never had: a durable, server-
 * verified account id for a seat.
 *
 * ── The gap this closed ───────────────────────────────────────────────
 * `RoomManager.ts`'s only player identifier is `newPlayerId()` —
 * `p_<timestamp>_<random>`, minted fresh per room, per seat, unrelated to
 * anything durable. `resolveAccountKind()` (`lib/supabaseAuth.ts`) already
 * verifies `payload.accessToken` on `room:create`/`room:join` today, but
 * only to answer "member or guest?" — the verified `userId` it briefly
 * holds is discarded. Economy V1 needs that `userId` as `hostIdentityId`/
 * a participant's `identityId`; this module is the one place it's kept.
 *
 * ── Guests: the gap this phase closes ─────────────────────────────────
 * `CreateRoomPayload`/`JoinRoomPayload` now carry an optional `guestToken`
 * (`lib/guestToken.ts`'s signed bearer, the same one the HTTP economy/profile
 * APIs already verify) alongside `accessToken`. A guest token that verifies
 * resolves to `{ kind: "guest", identityId: "guest_..." }` — the SAME
 * verified id `attachPlayerIdentity` (HTTP) would resolve for that guest,
 * since both call `verifyGuestToken` on the identical signed token. A guest
 * who never sends one, or sends one that fails verification (forged,
 * expired, tampered — `verifyGuestToken` returns `null` for all of these,
 * never throws), resolves to `identityId: null`, exactly as before this
 * phase — safe by construction, not by a special case.
 *
 * ── What resolving a guest identity does NOT change ────────────────────
 * Guests still cannot HOST an economy-gated match — that is a standing
 * product rule (2026-08-27 decision), enforced independently by
 * `RoomManager.requestGameStart`/`requestRematchStart` checking
 * `player.isGuest` directly, NOT by the absence of an `identityId`. Making
 * guest identities resolvable here must not silently reopen guest hosting
 * as a side effect — it does not, because that check does not rely on this
 * function's output. What it DOES enable: a guest who JOINS a member-hosted
 * match can now be named correctly in that match's settlement
 * (`economyPlacements.ts`), instead of always forcing `isValidRanking:
 * false` for any match containing a guest seat.
 */

export interface ResolvedIdentity {
  kind: "member" | "guest";
  /** A verified Supabase `userId` for a member, or a verified `guest_<random>` id for a guest with a valid token; `null` when neither verifies. */
  identityId: string | null;
}

/**
 * Verifies `accessToken` using the same underlying `verifyAccessToken` call
 * `resolveAccountKind` does, but keeps the `userId` instead of collapsing it
 * away. Falls back to verifying `guestToken` when there is no verified
 * member session.
 *
 * Deliberately does NOT replicate `resolveAccountKind`'s "verification is
 * off -> trust the client's claimed kind" dev convenience for MEMBERS. That
 * trust is safe for a kind label (worst case, a stranger's room shows the
 * wrong badge); it is not safe for who gets debited. With no way to verify a
 * claim, there is no real member identity to charge, so a caller with no
 * verifiable member session always falls through to the guest branch.
 *
 * A verified guest token DOES resolve, unconditionally — a guest identity
 * carries no debit risk by itself (guests cannot host, see the file header),
 * and withholding it would just reintroduce the settlement gap this phase
 * exists to close. Provisioning (`ensureGuestIdentityProvisioned`, the same
 * awaited, idempotent write Phase 3 added to the HTTP identity middleware)
 * runs here too, awaited, so a guest whose FIRST authenticated touch of any
 * kind is a socket `room:create`/`room:join` — not an HTTP call — still gets
 * a durable `player_identities` row before this identity is handed to
 * `RoomManager`.
 */
export async function resolveIdentity(
  accessToken: string | null | undefined,
  guestToken: string | null | undefined,
): Promise<ResolvedIdentity> {
  const account = await verifyAccessToken(accessToken);
  if (account) {
    return { kind: "member", identityId: account.userId };
  }

  const guestId = verifyGuestToken(guestToken);
  if (!guestId) {
    return { kind: "guest", identityId: null };
  }

  try {
    await ensureGuestIdentityProvisioned(guestId);
  } catch (err) {
    // Provisioning is not memoized on failure (see identity.ts), so the next
    // request retries it. Handing back `identityId: null` for THIS request
    // is the safe failure mode: it falls back to exactly today's behavior
    // (unresolvable guest, refund-safe) rather than naming an identity whose
    // row may not actually exist yet.
    logger.warn({
      message: `Guest identity provisioning failed during socket identity resolution: ${String(err)}`,
      module: "ECONOMY_ROOM",
    });
    return { kind: "guest", identityId: null };
  }

  return { kind: "guest", identityId: guestId };
}
