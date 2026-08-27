import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "../lib/logger.js";
import { verifyAccessToken } from "../lib/supabaseAuth.js";
import { verifyGuestToken } from "./guestToken.js";
import { operationalAuthConfig } from "../security/operationalAuth.js";
import { progressionRepository } from "../persistence/index.js";

/**
 * Who the server believes is making this request.
 *
 * ── The rule, and the thing it replaces ───────────────────────────────
 * Six routers read a player id out of the URL path or the JSON body and used
 * it as the caller's identity. That is not authorization; it is a naming
 * convention. `PUT /api/profile/victim_user` with no credential returned
 * `{"displayName":"PWNED"}` against a live server.
 *
 * The chain here runs one way only:
 *
 *     credential  →  verified server-side
 *                 →  identity taken from the VERIFIED claims
 *                 →  ownership or role checked against that identity
 *                 →  operation executed
 *
 * A path or body `playerId` is now an ARGUMENT — a thing being named — and
 * never evidence of who is doing the naming. Where a route needs to know its
 * caller, it reads `req.player`, which no request can set.
 *
 * ── Two kinds of identity ─────────────────────────────────────────────
 * • `member` — a Supabase session, verified by `lib/supabaseAuth.ts`
 *   (signature, expiry, issuer, audience). Identity is the `sub` claim.
 * • `guest`  — a signed token for a SERVER-minted `guest_<random>` id
 *   (`./guestToken.ts`). Identity is the id inside the signature.
 *
 * Guests keep working. That is deliberate and is the reason this is an
 * identity model rather than a sign-in wall: BHALYAM's promise is that the
 * friend who has not signed up can still play. What a guest cannot do is be
 * someone else — which was never a guest feature, only a missing check.
 *
 * ── Public reads are separate, and explicit ───────────────────────────
 * A leaderboard has to be readable, and gating it would be a product change
 * masquerading as a fix. So public reads are not "routes we forgot to
 * protect" — they are routes that never call a `require*` guard, and each one
 * says so at its definition. The distinction is visible in the source rather
 * than inferred from its absence.
 */

export type PlayerIdentity =
  | { kind: "member"; playerId: string; email: string | null }
  | { kind: "guest"; playerId: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `attachPlayerIdentity`. Absent means unauthenticated. */
      player?: PlayerIdentity;
    }
  }
}

function bearer(req: Request): string | null {
  const header = req.headers["authorization"];
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Guest identities become `player_identities` rows here, on first
 * authenticated use — not at `POST /api/auth/guest` (that route stays
 * stateless and unrate-limited by design, see `AuthController.ts`), and not
 * inside `ensure_wallet()` (the economy migration deliberately reverted that
 * once already — see `20260826000000_economy_v1.sql`'s own comment: "this
 * function NEVER writes to player_identities, for guests or members").
 * Reuses `ProgressionRepository.upsertIdentity` — the same, already-tested
 * write path `identitySeen()`/`profileSaved()` use — rather than a second
 * implementation of the same insert.
 *
 * ── Why this must be awaited, not fired-and-forgotten ─────────────────────
 * `ProgressionSync.identitySeen()` is a serial, write-behind QUEUE: calling
 * it and immediately calling `ensure_wallet()` in the same request would
 * race the queue and could still 404 on a guest's very first request. This
 * bypasses that queue and writes directly through `progressionRepository()`,
 * awaited, so the row provably exists before `next()` hands the request to
 * a route that might need it.
 *
 * ── Bounded memoization, not an unbounded process-level Set ───────────────
 * Once written, a guest's row never needs to be written again — but the
 * bound exists anyway (matches `supabaseAuth.ts`'s verification-cache
 * eviction shape) because a long-lived process must not grow this map once
 * per guest, forever. Eviction is safe to the point of being uninteresting:
 * `upsertIdentity` is a `player_id`-keyed upsert, so re-provisioning an
 * evicted-but-already-row-having guest is an idempotent no-op write, never a
 * correctness problem — only one avoidable round trip, at most.
 *
 * ── Concurrency ─────────────────────────────────────────────────────────
 * Two requests racing on the SAME brand-new guest id share one in-flight
 * write via `inFlight`, so a burst of simultaneous first requests (e.g. a
 * page mounting several economy-aware components at once) issues one upsert,
 * not several. Even without that, the upsert itself is safe to run
 * concurrently — `player_id` is the primary key and the write is a
 * conflict-tolerant upsert, not a plain insert that could collide.
 *
 * A failed write is deliberately NOT memoized as "done": the next request
 * from the same guest retries it, so a transient outage self-heals without a
 * server restart, and a guest is never permanently stuck unprovisioned by
 * one bad moment.
 */
const GUEST_IDENTITY_CACHE_MAX = 2000;
const provisionedGuestIds = new Map<string, true>();
const inFlightGuestProvisioning = new Map<string, Promise<void>>();

function rememberProvisioned(guestId: string): void {
  if (!provisionedGuestIds.has(guestId) && provisionedGuestIds.size >= GUEST_IDENTITY_CACHE_MAX) {
    const oldest = provisionedGuestIds.keys().next();
    if (!oldest.done) provisionedGuestIds.delete(oldest.value);
  }
  provisionedGuestIds.set(guestId, true);
}

/** Test seam — the module-level caches would otherwise carry state between cases. */
export function clearGuestIdentityProvisioningCache(): void {
  provisionedGuestIds.clear();
  inFlightGuestProvisioning.clear();
}

export async function ensureGuestIdentityProvisioned(guestId: string): Promise<void> {
  if (provisionedGuestIds.has(guestId)) return;

  const existing = inFlightGuestProvisioning.get(guestId);
  if (existing) {
    await existing;
    return;
  }

  const write = (async () => {
    await progressionRepository().upsertIdentity({
      playerId: guestId,
      kind: "guest",
      authUserId: null,
      lastSeenAt: Date.now(),
    });
    rememberProvisioned(guestId);
  })();

  inFlightGuestProvisioning.set(guestId, write);
  try {
    await write;
  } finally {
    inFlightGuestProvisioning.delete(guestId);
  }
}

/**
 * Resolve the caller, if they presented anything resolvable.
 *
 * Deliberately does NOT reject. Mounted globally so that every downstream
 * route sees a consistent `req.player`, including the public ones — a
 * leaderboard does not need a caller, but knowing there is one lets it stay a
 * single code path instead of two.
 *
 * Order matters slightly: guest tokens are checked first because they are
 * recognisable by prefix and cost one HMAC, whereas a Supabase check in
 * `auth-api` mode can be a network round trip. Neither can be mistaken for the
 * other — one is `bg1.…`, the other a JWT.
 */
export function attachPlayerIdentity(req: Request, _res: Response, next: NextFunction): void {
  const token = bearer(req);
  if (!token) {
    next();
    return;
  }

  const guestId = verifyGuestToken(token);
  if (guestId) {
    void (async () => {
      try {
        await ensureGuestIdentityProvisioned(guestId);
      } catch (err) {
        // Provisioning is not memoized on failure (see the comment above),
        // so the next request from this guest simply retries it. The guest
        // still gets treated as themself for THIS request — a transient
        // write failure must not be indistinguishable from an invalid token.
        logger.warn({
          message: `Guest identity provisioning failed for a resolved guest token: ${String(err)}`,
          module: "AUTH",
        });
      }
      req.player = { kind: "guest", playerId: guestId };
      next();
    })();
    return;
  }

  void (async () => {
    try {
      const account = await verifyAccessToken(token);
      if (account) {
        req.player = { kind: "member", playerId: account.userId, email: account.email };
      }
    } catch (err) {
      // An unresolvable credential is simply no identity. Downstream guards
      // decide whether that is fatal for the route in question.
      logger.warn({
        message: `Identity resolution failed for ${req.method} ${req.path}: ${String(err)}`,
        module: "AUTH",
      });
    }
    next();
  })();
}

/** One refusal shape, so nothing leaks through the difference between them. */
function deny(res: Response, status: 401 | 403, message: string): void {
  res.status(status).json({ error: status === 401 ? "Unauthorized" : "Forbidden", message });
}

/** The route needs a caller — member or guest, either is fine. */
export const requireIdentity: RequestHandler = (req, res, next) => {
  if (!req.player) {
    deny(res, 401, "Sign in, or request a guest identity from POST /api/auth/guest.");
    return;
  }
  next();
};

/** The route needs a real account. Used where a guest genuinely cannot act. */
export const requireMember: RequestHandler = (req, res, next) => {
  if (!req.player) {
    deny(res, 401, "Sign in, or request a guest identity from POST /api/auth/guest.");
    return;
  }
  if (req.player.kind !== "member") {
    deny(res, 403, "This action needs a BHALYAM account.");
    return;
  }
  next();
};

/**
 * The named player in the path must BE the caller.
 *
 * The workhorse. Every `/:playerId` route that touches something personal gets
 * this, and the id in the path stops being a way to address other people's
 * records.
 *
 * Note the refusal is 403 and not 404: hiding existence would be a nice
 * property, but these ids are already public (they appear on leaderboards), so
 * a 404 would buy nothing and would make a legitimate client's bug — sending
 * the wrong id — indistinguishable from a missing record.
 */
export function requireSelfParam(param = "playerId"): RequestHandler {
  return (req, res, next) => {
    if (!req.player) {
      deny(res, 401, "Sign in, or request a guest identity from POST /api/auth/guest.");
      return;
    }
    const named = req.params[param];
    if (named !== req.player.playerId) {
      logger.warn({
        message:
          `Ownership check refused ${req.method} ${req.path}: ` +
          `caller ${req.player.playerId} named ${String(named)}`,
        module: "AUTH",
      });
      deny(res, 403, "That is not your record.");
      return;
    }
    next();
  };
}

/**
 * The caller must be one of the players named in the path.
 *
 * For genuinely two-sided records — a head-to-head history belongs to both
 * players and either may read it, but a third party may not.
 */
export function requireParticipantParams(...params: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.player) {
      deny(res, 401, "Sign in, or request a guest identity from POST /api/auth/guest.");
      return;
    }
    const me = req.player.playerId;
    if (!params.some((p) => req.params[p] === me)) {
      deny(res, 403, "That record is not yours.");
      return;
    }
    next();
  };
}

/**
 * Administrative routes on the player API.
 *
 * Starting a tournament and writing a match result decide who advances and who
 * is eliminated. At baseline both were open to anyone with the URL. There is
 * no organiser role in the tournament model to check against — every seeded
 * tournament has `createdBy: "system"` — so the honest gate is the operational
 * one this deployment already has, rather than inventing a role hierarchy in a
 * P0 fix.
 *
 * Reuses the operational credential deliberately: one admin boundary in this
 * codebase, not two that can disagree.
 */
export const requireTournamentAdmin: RequestHandler = (req, res, next) => {
  const { secret, adminUserIds } = operationalAuthConfig();

  const key = req.headers["x-operational-key"];
  if (typeof key === "string" && secret.length > 0 && key.trim() === secret) {
    next();
    return;
  }

  if (req.player?.kind === "member" && adminUserIds.includes(req.player.playerId)) {
    next();
    return;
  }

  logger.warn({
    message: `Tournament admin action refused: ${req.method} ${req.path}`,
    module: "AUTH",
  });
  deny(res, 403, "This action is restricted to tournament administrators.");
};

/**
 * The caller's id, for a handler that has already passed a guard.
 *
 * Throws rather than returning a fallback. A handler reaching this without an
 * identity is a routing mistake, and the loudest possible failure is the one
 * that gets fixed — a silent `"anonymous"` default is how the original bug
 * would come back.
 */
export function callerId(req: Request): string {
  if (!req.player) {
    throw new Error("callerId() called on a request with no verified identity");
  }
  return req.player.playerId;
}
