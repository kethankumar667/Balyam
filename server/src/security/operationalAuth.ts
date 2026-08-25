import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";
import { verifyAccessToken } from "../lib/supabaseAuth.js";

/**
 * Who is allowed to read the operating theatre.
 *
 * ── The hole this closes ──────────────────────────────────────────────
 * The previous gate opened when it had nothing to check against:
 *
 *     const secret = process.env.OPERATIONAL_SECRET || "";
 *     if (!secret) return next();          // <- every request, every environment
 *
 * That is fail-OPEN, and it was unconditional — `NODE_ENV=production` did not
 * change it. A deploy that forgot one environment variable published room
 * summaries, socket counts, per-game telemetry, memory pressure, leak
 * diagnostics and full per-room event timelines to anyone who could spell the
 * URL. Confirmed against the running server before this file existed:
 * `GET /api/operational/metrics -> 200` with no credential, in production mode.
 *
 * There is no reading of that behaviour under which it is safe. A secret that
 * is absent is not a secret that is satisfied.
 *
 * ── The rule now ──────────────────────────────────────────────────────
 * Absence of configuration is a REFUSAL, never a pass:
 *
 *   production, nothing configured  → the process does not start at all
 *                                     (see `assertOperationalAuthConfigured`)
 *   anywhere,   nothing configured  → 401, and the log says why
 *   credential missing / wrong      → 401, identical body either way
 *   ops key matches                 → allowed, as `ops-key`
 *   admin session verifies          → allowed, as `admin-user`
 *
 * ── Two ways in, on purpose ───────────────────────────────────────────
 * • `OPERATIONAL_SECRET` — a shared key for machines: uptime probes, an
 *   on-call `curl`, a dashboard scraper. No user behind it, so no identity to
 *   attribute an action to, which is exactly why it is read-only surface.
 *
 * • `ADMIN_USER_IDS` — a comma-separated allowlist of Supabase user ids. The
 *   caller presents their normal session token, the server verifies it the
 *   same way it verifies a token on `room:create` (signature, expiry, issuer,
 *   audience — `lib/supabaseAuth.ts`), and the id in the verified `sub` claim
 *   is checked against the list. This is the chain the audit asked for:
 *   token → verified server-side → identity from claims → role check.
 *
 *   Note the direction. The allowlist is consulted against the id the SERVER
 *   extracted from a signature it checked, never against an id the request
 *   asked us to believe.
 *
 * ── What is deliberately gone ─────────────────────────────────────────
 * `?key=<secret>` used to be accepted "for simple browser inspection". A
 * credential in a query string lands in access logs, proxy logs, browser
 * history and `Referer` headers. The admin dashboard sends a header instead.
 */

/** Shortest key we will accept in production. Stops `admin` / `changeme`. */
const MIN_SECRET_LENGTH = 16;

export interface OperationalAuthConfig {
  /** The shared ops key, or `""` when unset. */
  secret: string;
  /** Verified-session ids permitted admin access. */
  adminUserIds: string[];
  /** True when at least one way in is usable. */
  configured: boolean;
}

/**
 * Read on every call rather than captured at import, for the same reason
 * `supabaseAuth.config()` is: a suite must be able to exercise the configured
 * and unconfigured paths in one process, and pinning it at import time makes
 * that impossible. Two string reads per operational request is not a cost.
 */
export function operationalAuthConfig(): OperationalAuthConfig {
  const secret = (process.env.OPERATIONAL_SECRET ?? process.env.ADMIN_API_KEY ?? "").trim();
  const adminUserIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return { secret, adminUserIds, configured: secret.length > 0 || adminUserIds.length > 0 };
}

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

/**
 * Compare two secrets without leaking their prefix through timing.
 *
 * Both sides are hashed first so `timingSafeEqual` always gets equal-length
 * buffers — it throws on a length mismatch, and the naive guard
 * (`if (a.length !== b.length) return false`) reintroduces exactly the leak
 * we are removing, by answering "wrong length" faster than "wrong bytes".
 */
function secretsMatch(provided: string, expected: string): boolean {
  if (expected.length === 0 || provided.length === 0) return false;
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export type OperationalPrincipal =
  | { kind: "ops-key" }
  | { kind: "admin-user"; userId: string; email: string | null };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set only after `requireOperationalAuth` has allowed the request. */
      operationalPrincipal?: OperationalPrincipal;
    }
  }
}

/** The bearer credential on the request, whatever header carried it. */
function presentedCredential(req: Request): string | null {
  const header = req.headers["authorization"];
  const bearer =
    typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const custom = req.headers["x-operational-key"];
  const customKey = typeof custom === "string" ? custom.trim() : null;
  return bearer || customKey || null;
}

/**
 * One body for every refusal.
 *
 * "Unauthorized" and nothing else: a reply that distinguished "no key
 * configured" from "wrong key" from "not on the admin list" would hand an
 * attacker a map of the deployment. The reason goes to the log, where the
 * operator can read it and the caller cannot.
 */
function refuse(req: Request, res: Response, reason: string): void {
  logger.warn({
    message: `Operational API refused (${reason}) for ${req.method} ${req.path}`,
    module: "SECURITY",
  });
  res.status(401).json({
    error: "Unauthorized",
    message: "Valid operational credentials are required for this endpoint.",
  });
}

/**
 * Gate for every `/api/operational/*` route.
 *
 * Mounted by `createOperationalRouter`, on the router itself rather than beside
 * it, so a route added later cannot be added outside the gate. No handler runs
 * and no telemetry is gathered before this passes.
 *
 * The ops-key path stays synchronous. Only the admin-session path — which needs
 * `verifyAccessToken` — goes async, so the common cases resolve in one tick.
 */
export function requireOperationalAuth(req: Request, res: Response, next: NextFunction): void {
  const { secret, adminUserIds, configured } = operationalAuthConfig();

  // Unconfigured is a refusal. In production the startup guard means we should
  // never be here at all; if we somehow are, the answer is still "no".
  if (!configured) {
    logger.error({
      message:
        `Operational API is unconfigured and therefore closed. ${req.method} ${req.path} was ` +
        "refused. Set OPERATIONAL_SECRET (a random string of at least " +
        `${MIN_SECRET_LENGTH} characters) and/or ADMIN_USER_IDS. ` +
        "This endpoint does NOT open when the secret is missing.",
      module: "SECURITY",
    });
    res.status(401).json({
      error: "Unauthorized",
      message: "Valid operational credentials are required for this endpoint.",
    });
    return;
  }

  const customHeader = req.headers["x-operational-key"];
  const customKey = typeof customHeader === "string" ? customHeader.trim() : null;

  const authHeader = req.headers["authorization"];
  const bearer =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

  // 1. If custom key is provided and matches the operational secret -> allow
  if (customKey && secretsMatch(customKey, secret)) {
    req.operationalPrincipal = { kind: "ops-key" };
    next();
    return;
  }

  // 2. If bearer token matches the operational secret directly -> allow
  if (bearer && secretsMatch(bearer, secret)) {
    req.operationalPrincipal = { kind: "ops-key" };
    next();
    return;
  }

  // 3. If bearer token is provided and an admin allowlist exists -> verify session token
  if (bearer && adminUserIds.length > 0) {
    void (async () => {
      try {
        const account = await verifyAccessToken(bearer);
        if (!account) {
          refuse(req, res, "session token did not verify");
          return;
        }
        if (!adminUserIds.includes(account.userId)) {
          refuse(req, res, `verified user ${account.userId} is not on the admin allowlist`);
          return;
        }
        req.operationalPrincipal = {
          kind: "admin-user",
          userId: account.userId,
          email: account.email,
        };
        next();
      } catch (err) {
        // Never surface the cause. A verification that threw is a refusal like
        // any other from the caller's side.
        logger.error({
          message: `Operational auth check threw for ${req.method} ${req.path}: ${String(err)}`,
          module: "SECURITY",
        });
        res.status(401).json({
          error: "Unauthorized",
          message: "Valid operational credentials are required for this endpoint.",
        });
      }
    })();
    return;
  }

  if (!customKey && !bearer) {
    refuse(req, res, "no credential presented");
    return;
  }

  refuse(req, res, "credential did not match the operational key");
}

export interface OperationalConfigProblem {
  fatal: boolean;
  message: string;
}

/**
 * Is this process configured well enough to serve an operational API?
 *
 * Separated from the exit so tests can assert the decision without killing the
 * runner. `fatal` means "must not boot"; a non-fatal problem is worth a warning
 * and nothing more.
 */
export function operationalConfigProblems(): OperationalConfigProblem[] {
  const { secret, adminUserIds, configured } = operationalAuthConfig();
  const problems: OperationalConfigProblem[] = [];
  const production = isProduction();

  if (!configured) {
    problems.push({
      fatal: production,
      message:
        "Neither OPERATIONAL_SECRET nor ADMIN_USER_IDS is set, so /api/operational/* has no " +
        "way to authorize anyone and will refuse every request. Set OPERATIONAL_SECRET to a " +
        `random string of at least ${MIN_SECRET_LENGTH} characters.`,
    });
    return problems;
  }

  if (secret.length > 0 && secret.length < MIN_SECRET_LENGTH) {
    problems.push({
      fatal: production,
      message:
        `OPERATIONAL_SECRET is ${secret.length} characters; at least ${MIN_SECRET_LENGTH} are ` +
        "required. A short key is guessable and the endpoints behind it expose room " +
        "summaries, player counts and full event timelines.",
    });
  }

  // An admin allowlist that nothing can verify is decoration: `verifyAccessToken`
  // returns null in `off` mode, so every session token would be refused.
  if (adminUserIds.length > 0 && !process.env.SUPABASE_JWT_SECRET?.trim()) {
    const canUseAuthApi =
      Boolean(process.env.SUPABASE_URL?.trim()) &&
      Boolean(
        (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "").trim(),
      );
    if (!canUseAuthApi) {
      problems.push({
        fatal: false,
        message:
          "ADMIN_USER_IDS is set but session verification is off, so no admin session can be " +
          "verified and only OPERATIONAL_SECRET will work. Set SUPABASE_JWT_SECRET, or " +
          "SUPABASE_URL + SUPABASE_ANON_KEY.",
      });
    }
  }

  return problems;
}

/**
 * Refuse to boot a production process that cannot protect its own telemetry.
 *
 * Throwing rather than serving is the point. The failure mode being replaced is
 * a server that started perfectly, looked healthy, and published its internals
 * — a silence nobody was going to notice. A process that will not start gets
 * noticed within a minute of the deploy.
 *
 * Outside production this only warns: `npm run dev` must keep needing zero
 * infrastructure, and a refusing 401 is already the honest local behaviour.
 */
export function assertOperationalAuthConfigured(): void {
  const problems = operationalConfigProblems();
  const fatal = problems.filter((p) => p.fatal);

  for (const problem of problems.filter((p) => !p.fatal)) {
    logger.warn({ message: problem.message, module: "SECURITY" });
  }

  if (fatal.length === 0) {
    if (problems.length === 0) {
      const { secret, adminUserIds } = operationalAuthConfig();
      logger.info({
        message:
          "Operational API is protected by " +
          [
            secret ? "a shared operational key" : null,
            adminUserIds.length > 0 ? `${adminUserIds.length} admin session id(s)` : null,
          ]
            .filter(Boolean)
            .join(" and "),
        module: "SECURITY",
      });
    }
    return;
  }

  for (const problem of fatal) {
    logger.error({ message: problem.message, module: "SECURITY" });
  }
  throw new Error(
    "Refusing to start in production: the operational API cannot be secured. " +
      fatal.map((p) => p.message).join(" "),
  );
}

/** For `/health` and boot logs — never includes the key itself. */
export function operationalAuthStatus(): {
  configured: boolean;
  opsKey: boolean;
  adminUsers: number;
} {
  const { secret, adminUserIds, configured } = operationalAuthConfig();
  return { configured, opsKey: secret.length > 0, adminUsers: adminUserIds.length };
}
