import type { Request, Response, NextFunction } from "express";

/**
 * Mandali strict account authorization.
 *
 * ── Why this exists beside `requireMember` ────────────────────────────
 * `requireMember` (server/src/auth/identity.ts) is deliberately generous: in
 * auth-off mode it INVENTS `dev_member`, and with a token it trusts a 5-minute
 * cached verification or a bare HS256 signature. That is right for routes
 * where the failure mode is "a guest could not host a room". Mandali is a
 * private space backed by durable data and, eventually, wallet transfers —
 * there, an unverifiable caller must be refused, not promoted, and a
 * signature alone must not stand in for a live account check.
 *
 * ── Fail-closed contract ──────────────────────────────────────────────
 * • Auth-off is never an authorization. Dev convenience must not open a
 *   door that production will inherit.
 * • Guest credentials (the `bg1.…` HMAC tokens) are not accounts.
 * • A verified signature proves the token MINTS, not that the account still
 *   exists. Current eligibility — not anonymous, not banned, not deleted —
 *   comes from a fresh `/auth/v1/user` fetch; cached verifier answers are
 *   never used. A cached success cannot outlive a ban here.
 * • The actor id is taken only from the provider's answer, never from the
 *   request.
 *
 * Two distinct refusals: 403 when the provider answered "this account is not
 * eligible" (or none was configured — a jwt-secret-only deployment cannot
 * establish current eligibility, so it fails closed), and 503 when we could
 * not ask at all — a transient outage is not an authorization decision.
 *
 * Eligibility requires the auth-api path (SUPABASE_URL + publishable/anon
 * key). This is the cost of "current eligibility" and is accepted on purpose.
 */
import { bearerFrom, type MandaliAccount } from "./account.js";
import { currentAccountEligibility } from "./eligibility.js";

/** Pure decision over an eligibility outcome — exported for focused tests. */
export function decideStrictAccount(
  outcome: Awaited<ReturnType<typeof currentAccountEligibility>>,
): { ok: boolean; account?: MandaliAccount } {
  if (outcome.kind !== "eligible") return { ok: false };
  return { ok: true, account: outcome.account };
}

/**
 * Mount BEFORE the global `attachPlayerIdentity`: this guard derives identity
 * itself from a fresh provider answer and must not fall through into the
 * identity-provisioning writes, and must not inherit a pre-attached
 * `req.player` whose cached verification predates a revocation.
 */
export function requireStrictMandaliAccount(
  flagsEnabled: () => boolean,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!flagsEnabled()) {
      // Feature read-only/off is a distinct refusal from unauthorized: the
      // client can tell "not rolled out to you" from "fix your session".
      res.status(503).json({ error: "FeatureDisabled", message: "Mandali is not enabled." });
      return;
    }
    const token = bearerFrom(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized", message: "Sign in with a verified BHALYAM account." });
      return;
    }
    void (async () => {
      try {
        const outcome = await currentAccountEligibility(token);
        if (outcome.kind === "unavailable") {
          res.status(503).json({ error: "Unavailable", message: "Authorization is temporarily unavailable." });
          return;
        }
        const decision = decideStrictAccount(outcome);
        if (!decision.ok || !decision.account) {
          res.status(403).json({ error: "Forbidden", message: "This action needs an eligible BHALYAM account." });
          return;
        }
        res.locals.mandaliAccount = decision.account;
        next();
      } catch {
        // Belt and braces: any unexpected failure is still fail-closed, and
        // still 503 — we could not complete the check, we did not decide it.
        res.status(503).json({ error: "Unavailable", message: "Authorization is temporarily unavailable." });
      }
    })();
  };
}
