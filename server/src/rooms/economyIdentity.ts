import { verifyAccessToken } from "../lib/supabaseAuth.js";

/**
 * The one thing RoomManager needed and never had: a durable, server-
 * verified account id for a seat.
 *
 * ── The gap this closes ───────────────────────────────────────────────
 * `RoomManager.ts`'s only player identifier is `newPlayerId()` —
 * `p_<timestamp>_<random>`, minted fresh per room, per seat, unrelated to
 * anything durable. `resolveAccountKind()` (`lib/supabaseAuth.ts`) already
 * verifies `payload.accessToken` on `room:create`/`room:join` today, but
 * only to answer "member or guest?" — the verified `userId` it briefly
 * holds is discarded. Economy V1 needs that `userId` as `hostIdentityId`/
 * a participant's `identityId`; this module is the one place it's kept.
 *
 * ── Guests: a real, product-decided gap, not an oversight ────────────
 * There is no guest-token channel through the socket layer —
 * `CreateRoomPayload.accessToken` is documented as "A Supabase access
 * token" specifically, and no field carries a guest's bearer token today.
 * Adding one is a client change, out of this phase's scope ("no frontend
 * code"). Per product decision (2026-08-27): guests may join and play but
 * may never HOST an economy-gated match — `resolveHostIdentity` returns
 * `identityId: null` for a guest by construction, and the caller
 * (`RoomManager.requestGameStart`) refuses to start when the host has no
 * resolvable identity. This function does not attempt to resolve a guest
 * identity at all; that is not a bug to fix here, it's the boundary this
 * phase's product decision draws.
 */

export interface ResolvedIdentity {
  kind: "member" | "guest";
  /** A verified Supabase `userId` for a member; always `null` for a guest. */
  identityId: string | null;
}

/**
 * Verifies `accessToken` using the same underlying `verifyAccessToken` call
 * `resolveAccountKind` does, but keeps the `userId` instead of collapsing it
 * away.
 *
 * Deliberately does NOT replicate `resolveAccountKind`'s "verification is
 * off -> trust the client's claimed kind" dev convenience. That trust is
 * safe for a kind label (worst case, a stranger's room shows the wrong
 * badge); it is not safe for who gets debited. With no way to verify a
 * claim, there is no real identity to charge, so this always resolves to
 * `guest`/`null` when verification is off — economy-gated hosting in that
 * mode requires actually configuring `SUPABASE_JWT_SECRET` (or the auth
 * API), same as any other real economy test in this codebase.
 */
export async function resolveIdentity(accessToken: string | null | undefined): Promise<ResolvedIdentity> {
  const account = await verifyAccessToken(accessToken);
  if (account) {
    return { kind: "member", identityId: account.userId };
  }
  return { kind: "guest", identityId: null };
}
