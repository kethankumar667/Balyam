import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "../lib/logger.js";
import { verifyAccessToken } from "../lib/supabaseAuth.js";
import { verifyGuestToken } from "./guestToken.js";
import { operationalAuthConfig } from "../security/operationalAuth.js";

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
    req.player = { kind: "guest", playerId: guestId };
    next();
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
