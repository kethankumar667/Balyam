import { randomUUID } from "crypto";
import { Router, type Request, type Response } from "express";
import { callerId, requireIdentity, requireMember } from "../auth/identity.js";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { logger } from "../lib/logger.js";
import {
  DuplicateParticipantIdentityError,
  EconomyService,
  EconomyServiceError,
  EconomyServiceInfrastructureError,
  EmptyParticipantListError,
  InvalidParticipantShapeError,
  InvalidRankingShapeError,
  InvalidRequestError,
  VoucherHashPolicyViolationError,
} from "./EconomyService.js";
import {
  EconomyInfrastructureError,
  EconomyRepositoryError,
  IdentityNotFoundError,
  InsufficientFundsError,
  IntentLeaseStillActiveError,
  InvalidIdentityIdError,
  InvalidIdentityKindError,
  InvalidIntentStateTransitionError,
  InvalidSeatConfigurationError,
  InvalidTerminalIntentPayloadError,
  InvalidVoucherHashError,
  MatchAlreadySettledError,
  MatchNotCommittedError,
  MatchNotFoundError,
  OnlyMembersCanRedeemError,
  SettlementConservationViolationError,
  TerminalIntentNotFoundError,
  UnsupportedSeatCountError,
  VoucherAlreadyRedeemedError,
  VoucherCodeCollisionError,
  VoucherNotActiveError,
  VoucherNotFoundError,
  WalletFrozenError,
  WalletNotFoundError,
  type TerminalIntentStatus,
} from "../persistence/EconomyRepository.js";

/**
 * BHALYAM Economy V1 Phase 6 — the HTTP transport layer over `EconomyService`.
 *
 * ── The one rule this whole file exists to hold ──────────────────────────
 * `EconomyService` is the only business-logic entry point. Every handler
 * below does exactly three things, in order: validate shape, call ONE (or a
 * small composed pair of) `EconomyService` method(s), map the result or
 * error to a response. Nothing here imports `EconomyRepository.js` for
 * anything but its error CLASSES (to `instanceof`-check and map them) — no
 * handler ever calls a repository method directly.
 *
 * ── Why a router factory, not a module-level `Router()` singleton ────────
 * Every other player-facing router in this codebase (`profileRouter`,
 * `tournamentRouter`, ...) is a singleton, because the service underneath it
 * is one too. `EconomyService` deliberately is NOT a singleton — Phase 5's
 * own constraint is constructor injection, no `economyRepository()`-style
 * factory. `createDashboardRouter()`/`createOperationalRouter()` are this
 * codebase's existing precedent for exactly this shape (a router that needs
 * a dependency handed to it), so this file follows them, not the singleton
 * routers.
 *
 * ── Auth, mapped from existing patterns only (no new rule invented) ──────
 *   requireIdentity          wallet, ledger, checkout quote/commit, own
 *                            settlement lookup — any authenticated identity,
 *                            member or guest, exactly like every other
 *                            "this is MY data" route in this codebase.
 *   requireMember             voucher redemption — reuses the EXISTING
 *                            403-for-guest behavior verbatim (blueprint
 *                            §2.6), no new member-only guard invented.
 *   requireOperationalAuth    settlement reconciliation, stale-settlement
 *                            listing, World Bank snapshot — all three are
 *                            platform-financial/audit surfaces, not player
 *                            data (`economy-admin-dashboard-plan.md` §2.1
 *                            already designs the World Bank view as an admin
 *                            dashboard panel). Reuses the SAME gate
 *                            `DashboardController.ts`/`OperationalController.ts`
 *                            already use — no new admin boundary invented.
 *   (none)                    voucher status lookup — see the flagged
 *                            conflict below.
 *
 * ── A flagged architectural conflict, not silently resolved ──────────────
 * `GET /vouchers/:voucherId` is defined by this phase's own endpoint
 * inventory, but `EconomyService` has no method that looks up a voucher by
 * an id — `getVoucherStatus` takes the RAW BEARER CODE (the only key the
 * frozen service contract supports; a `voucherId`-keyed lookup does not
 * exist and this phase may not add one). Putting the bearer secret in a URL
 * PATH is a real anti-pattern this project has otherwise been careful about
 * (§3.1 of economy-v1.md, the whole reason `voucherCrypto.ts` exists) — a
 * URL path can land in browser history, `Referer` headers, and any
 * proxy/CDN access log this codebase does not control. This route is
 * implemented literally as specified, with this comment and the completion
 * report flagging it prominently, and no auth guard (consistent with the
 * bearer nature already established for redemption eligibility — whoever
 * holds the code already holds the "credential"). It is NOT logged with its
 * request path (see `logOutcome` below) as the one mitigation available at
 * this layer. Recommended follow-up: migrate to a POST body.
 */

function durationCategory(ms: number): "fast" | "normal" | "slow" {
  if (ms < 100) return "fast";
  if (ms < 500) return "normal";
  return "slow";
}

/** `err.code` for anything typed; a stable fallback otherwise — mirrors EconomyService.ts's own helper (duplicated, not imported, per this phase's "do not modify EconomyService" constraint keeping that file's internals untouched and private). */
function safeErrorCode(err: unknown): string {
  if (err instanceof EconomyRepositoryError || err instanceof EconomyServiceError) return err.code;
  return "UNKNOWN";
}

/**
 * One correlation id per request, for tying a client-visible failure (Phase
 * 2's hardened `useWallet()`) back to this exact server-side log line without
 * a support back-and-forth. Accepts an inbound `x-correlation-id` so a future
 * client can supply its own; generates one otherwise. Cached on the request
 * via a `WeakMap` rather than a type augmentation — this file is the only
 * reader, so a global `Request.correlationId` field is not worth adding.
 */
const correlationIds = new WeakMap<Request, string>();
function correlationId(req: Request): string {
  const existing = correlationIds.get(req);
  if (existing) return existing;
  const header = req.headers["x-correlation-id"];
  const id = typeof header === "string" && header.trim().length > 0 ? header.trim() : randomUUID();
  correlationIds.set(req, id);
  return id;
}

/**
 * Structured diagnostics for every economy request, success or failure.
 *
 * Deliberately logs `identityId` (a Supabase `sub` UUID or a `guest_<random>`
 * id — never a secret, already logged elsewhere in this codebase, e.g.
 * `auth/identity.ts`'s ownership-refusal warnings) and the response status,
 * so a report like "the UI showed 0 but the ledger proves 5000" is
 * diagnosable from this one log line: which identity resolved (or didn't),
 * what the server actually answered, and how long it took. Never logs the
 * bearer token, the `Authorization` header, or any request/response body —
 * `errorCode` is always one of `mapEconomyError`'s stable PascalCase slugs
 * (see the catalogue above), never a raw exception message.
 */
function logOutcome(
  req: Request,
  res: Response,
  endpoint: string,
  operation: string,
  matchId: string | null,
  startedAt: number,
  outcome: "ok" | "error",
  errorCode?: string,
): void {
  const payload = {
    message: `${endpoint} ${outcome === "ok" ? "completed" : "failed"}`,
    module: "ECONOMY_API",
    correlationId: correlationId(req),
    endpoint,
    operation,
    matchId,
    identityKind: req.player?.kind ?? null,
    identityId: req.player?.playerId ?? null,
    status: res.statusCode,
    outcome,
    durationCategory: durationCategory(Date.now() - startedAt),
    ...(errorCode ? { errorCode } : {}),
  };
  if (outcome === "ok") logger.info(payload);
  else logger.warn(payload);
}

/* ═══════════════════════════ error mapping (Phase 6) ═══════════════════════
 * One function, one shape out: `{ status, error, message }`. `error` is a
 * stable PascalCase slug (this codebase's existing convention —
 * `auth/identity.ts`'s `deny()` already returns `{error:"Unauthorized"|...}`;
 * this extends the SAME shape with one slug per failure class instead of
 * two). Never a raw error message from `EconomyInfrastructureError`
 * (which can contain PostgREST/Postgres text) — that class, and its
 * service-level wrapper, always get the SAME generic slug and message here,
 * regardless of what's in `.message`.
 */

export interface ApiError {
  status: number;
  error: string;
  message: string;
}

const GENERIC_INFRA_ERROR: ApiError = {
  status: 503,
  error: "EconomyTemporarilyUnavailable",
  message: "A temporary problem occurred while processing this economy request. Try again shortly.",
};

/**
 * The full catalogue: every `EconomyRepositoryError` and every
 * `EconomyServiceError` subclass, mapped once. Endpoint-specific handlers
 * may override a mapping (see the voucher-redeem oracle-prevention merge
 * below) by checking their own `instanceof` cases FIRST and falling back to
 * this function — never the other way around.
 */
function mapEconomyError(err: unknown): ApiError {
  // Infrastructure failures never carry their original detail past this
  // point — EconomyService.ts already strips it before this file ever sees
  // the error (see its own `wrapUnexpected`), but a raw
  // EconomyInfrastructureError is handled identically here as a defensive
  // second layer, never trusting `.message`.
  if (err instanceof EconomyInfrastructureError || err instanceof EconomyServiceInfrastructureError) {
    return GENERIC_INFRA_ERROR;
  }
  if (err instanceof WalletFrozenError) {
    return { status: 403, error: "WalletFrozen", message: "This wallet is currently frozen." };
  }
  if (err instanceof InsufficientFundsError) {
    return { status: 422, error: "InsufficientFunds", message: "This wallet does not have enough balance for this commitment." };
  }
  if (err instanceof IdentityNotFoundError) {
    return { status: 404, error: "IdentityNotFound", message: "No registered identity was found for this account." };
  }
  if (err instanceof WalletNotFoundError) {
    return { status: 404, error: "WalletNotFound", message: "No wallet has been provisioned for this identity yet." };
  }
  if (err instanceof InvalidIdentityIdError) {
    return { status: 400, error: "InvalidIdentityId", message: "The supplied identity id is malformed." };
  }
  if (err instanceof InvalidVoucherHashError) {
    return { status: 400, error: "InvalidRequest", message: "The supplied voucher code is malformed." };
  }
  if (err instanceof VoucherNotFoundError || err instanceof VoucherNotActiveError || err instanceof VoucherAlreadyRedeemedError) {
    // Generic catalogue entry — the redeem endpoint overrides this to a
    // single merged slug (see below) so these three never distinguish
    // themselves at the API boundary for THAT specific call. Kept distinct
    // here only so the catalogue documents every class individually.
    return { status: 422, error: "VoucherNotRedeemable", message: "This code isn't valid or has already been used." };
  }
  if (err instanceof InvalidSeatConfigurationError) {
    return { status: 422, error: "InvalidSeatConfiguration", message: "seatCount must be a positive integer matching humanSeatCount + botSeatCount." };
  }
  if (err instanceof UnsupportedSeatCountError) {
    // Truthful, actionable, and specific to the actual failure — a
    // structurally-fine seat count with no approved economy schedule yet
    // — never the old hardcoded "must be between 1 and 5" text, which
    // both baked economy policy into a second location AND was wrong
    // outright for any catalog game whose OWN maximum already exceeded 5
    // (see economyCapacityContract.ts for the full incident writeup).
    return { status: 422, error: "UnsupportedSeatCount", message: "This table size is not yet supported by the game economy." };
  }
  if (err instanceof InvalidIdentityKindError) {
    return { status: 422, error: "InvalidIdentityKind", message: "A participant's identityKind must be member, guest, or bot." };
  }
  if (err instanceof MatchNotCommittedError) {
    return { status: 404, error: "MatchNotCommitted", message: "No committed entry exists for this match." };
  }
  if (err instanceof MatchAlreadySettledError) {
    return { status: 409, error: "MatchAlreadySettled", message: "This match's settlement already reached a terminal state." };
  }
  if (err instanceof SettlementConservationViolationError) {
    return { status: 409, error: "SettlementConservationViolation", message: "The supplied ranking's prize distribution does not conserve against the committed total." };
  }
  if (err instanceof MatchNotFoundError) {
    return { status: 404, error: "MatchNotFound", message: "No settlement exists for this match." };
  }
  if (err instanceof VoucherCodeCollisionError) {
    // Should never reach here — EconomyService retries this internally,
    // bounded. Reaching this line means the bound was exhausted.
    return { status: 503, error: "VoucherIssuanceUnavailable", message: "Could not issue a voucher for this match right now. Try again shortly." };
  }
  if (err instanceof OnlyMembersCanRedeemError) {
    return { status: 403, error: "OnlyMembersCanRedeem", message: "Only a registered member account can redeem a voucher." };
  }
  if (err instanceof InvalidRequestError) {
    return { status: 400, error: "InvalidRequest", message: err.message };
  }
  if (err instanceof EmptyParticipantListError) {
    return { status: 422, error: "EmptyParticipantList", message: "At least one participant is required for a valid-ranking settlement." };
  }
  if (err instanceof DuplicateParticipantIdentityError) {
    return { status: 422, error: "DuplicateParticipantIdentity", message: "The same identity was named more than once." };
  }
  if (err instanceof InvalidRankingShapeError) {
    return { status: 422, error: "InvalidRankingShape", message: "Placements must be exactly 1..seatCount with no gaps or duplicates." };
  }
  if (err instanceof InvalidParticipantShapeError) {
    return { status: 422, error: "InvalidParticipantShape", message: "A participant's identityId, identityKind, or placement is malformed." };
  }
  if (err instanceof VoucherHashPolicyViolationError) {
    // An internal EconomyService invariant, never a caller mistake — see
    // that class's own doc comment. 500 is correct here, not 4xx: this
    // means our OWN construction broke, not that the caller sent something
    // wrong.
    return { status: 500, error: "InternalError", message: "Settlement could not be processed due to an internal error." };
  }
  if (err instanceof TerminalIntentNotFoundError) {
    return { status: 404, error: "TerminalIntentNotFound", message: "No durable terminal intent exists with this id." };
  }
  if (err instanceof InvalidIntentStateTransitionError) {
    return { status: 409, error: "InvalidIntentStateTransition", message: err.message };
  }
  if (err instanceof IntentLeaseStillActiveError) {
    return { status: 409, error: "IntentLeaseStillActive", message: err.message };
  }
  if (err instanceof InvalidTerminalIntentPayloadError) {
    return { status: 400, error: "InvalidRequest", message: err.message };
  }
  // A genuinely unmapped error class (should not happen — every
  // EconomyRepositoryError/EconomyServiceError subclass is listed above).
  // Treated exactly like an infrastructure failure: generic, no detail.
  return GENERIC_INFRA_ERROR;
}

function sendError(req: Request, res: Response, err: unknown): ApiError {
  const mapped = mapEconomyError(err);
  res.status(mapped.status).json({ error: mapped.error, message: mapped.message, correlationId: correlationId(req) });
  return mapped;
}

/* ═══════════════════════════ request validation (Phase 3) ══════════════════
 * Shape-only, cheap, and BEFORE any EconomyService call — a malformed
 * request never reaches the service layer. This is intentionally narrower
 * than EconomyService's own validation (which re-checks business rules
 * regardless of what passed here) — the division mirrors
 * EconomyService/EconomyRepository's own "fast reject here, authoritative
 * check there" split, one layer further out.
 */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * A stable, auditable operator identifier for terminal-intent admin
 * actions (Blocker 06, Phase 11: "never allow an unaudited retry") —
 * the specific admin user's id when authenticated as one, or the literal
 * string `"ops-key"` for the shared operational secret (which carries no
 * per-caller identity of its own; see `requireOperationalAuth`'s own doc
 * comment). Every terminal-intent audit event this file writes uses this,
 * never a bare "system".
 */
function operatorId(req: Request): string {
  const principal = req.operationalPrincipal;
  if (principal?.kind === "admin-user") return principal.userId;
  return "ops-key";
}

const VALID_INTENT_STATUSES: ReadonlySet<TerminalIntentStatus> = new Set([
  "PENDING",
  "PROCESSING",
  "RETRYABLE",
  "COMPLETED",
  "FAILED",
]);
function isPlainInteger(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}
function isNonNegativeInteger(v: unknown): v is number {
  return isPlainInteger(v) && v >= 0;
}

/**
 * No route in this file accepts a participants array — this phase's own
 * endpoint inventory has no settlement-accepting endpoint at all
 * (`settleMatchEconomy`/`refundMatchEntry` stay RoomManager-only, in-process
 * calls, per this task's "do not implement settlement orchestration"
 * constraint and the blueprint's own note that the HTTP checkout endpoints
 * are "NOT the same call RoomManager makes internally"). A participant-array
 * validator therefore has no current call site and was deliberately not
 * built speculatively — see Phase 1 findings in the completion report.
 */

/* ═══════════════════════════ the router ══════════════════════════════════ */

export function createEconomyRouter(service: EconomyService): Router {
  const router = Router();

  /** GET /wallet — always the caller's own wallet; no addressable :playerId, mirrors profileRouter's reasoning. */
  router.get("/wallet", requireIdentity, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    try {
      const wallet = await service.getWallet(callerId(req));
      res.json({ wallet });
      logOutcome(req, res, "GET /wallet", "getWallet", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /wallet", "getWallet", null, startedAt, "error", mapped.error);
    }
  });

  /** GET /wallet/ledger — caller's own ledger only. Same limit/offset convention as ProfileController's matches route. */
  router.get("/wallet/ledger", requireIdentity, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : 20;
    const rawOffset = req.query.offset !== undefined ? Number(req.query.offset) : 0;
    if (!isNonNegativeInteger(rawLimit) || !isNonNegativeInteger(rawOffset)) {
      res.status(400).json({ error: "InvalidRequest", message: "limit and offset must be non-negative integers." });
      return;
    }
    try {
      const entries = await service.getLedger(callerId(req), { limit: rawLimit, offset: rawOffset });
      // The repository clamps limit to [0,100] internally and reports no
      // total count, so "hasMore" is a heuristic (a full page MIGHT mean
      // more exist), never an authoritative count — documented, not hidden.
      res.json({ entries, hasMore: entries.length === rawLimit && rawLimit > 0 });
      logOutcome(req, res, "GET /wallet/ledger", "getLedger", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /wallet/ledger", "getLedger", null, startedAt, "error", mapped.error);
    }
  });

  /** POST /checkout/quote — read-only, non-binding; commit remains authoritative. */
  router.post("/checkout/quote", requireIdentity, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { seatCount, humanSeatCount, botSeatCount } = body;
    if (!isPlainInteger(seatCount) || !isNonNegativeInteger(humanSeatCount) || !isNonNegativeInteger(botSeatCount)) {
      res.status(400).json({ error: "InvalidRequest", message: "seatCount, humanSeatCount, and botSeatCount must be integers." });
      return;
    }
    try {
      const quote = await service.quoteMatchCheckout({
        hostIdentityId: callerId(req),
        seatCount, humanSeatCount, botSeatCount,
      });
      res.json({ quote });
      logOutcome(req, res, "POST /checkout/quote", "quoteMatchCheckout", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "POST /checkout/quote", "quoteMatchCheckout", null, startedAt, "error", mapped.error);
    }
  });

  /**
   * POST /checkout/commit
   *
   * Known, deliberate limitation (Phase 1 finding): this endpoint commits an
   * entry for WHATEVER matchId/roomCode the caller names — it cannot verify
   * a real room exists, that the caller is its host, or that the room is in
   * a ready state, because none of that lives in EconomyService and
   * RoomManager integration is explicitly out of this phase's scope. It IS
   * safe with respect to funds: `hostIdentityId` is always the caller's own
   * verified identity (never taken from the body), so this can only ever
   * spend the caller's OWN wallet, never anyone else's. Closing the
   * "is this a real, ready room" gap is exactly what RoomManager
   * integration (a future phase) is for.
   */
  router.post("/checkout/commit", requireIdentity, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { matchId, roomCode, seatCount, humanSeatCount, botSeatCount, isSolo } = body;
    if (!isNonEmptyString(matchId)) {
      res.status(400).json({ error: "InvalidRequest", message: "matchId must be a non-empty string." });
      return;
    }
    if (roomCode !== null && roomCode !== undefined && typeof roomCode !== "string") {
      res.status(400).json({ error: "InvalidRequest", message: "roomCode must be a string or null." });
      return;
    }
    if (!isPlainInteger(seatCount) || !isNonNegativeInteger(humanSeatCount) || !isNonNegativeInteger(botSeatCount)) {
      res.status(400).json({ error: "InvalidRequest", message: "seatCount, humanSeatCount, and botSeatCount must be integers." });
      return;
    }
    if (typeof isSolo !== "boolean") {
      res.status(400).json({ error: "InvalidRequest", message: "isSolo must be a boolean." });
      return;
    }
    try {
      const result = await service.commitMatchEntry({
        matchId, roomCode: (roomCode as string | undefined) ?? null,
        hostIdentityId: callerId(req), seatCount, humanSeatCount, botSeatCount, isSolo,
      });
      res.status(result.applied ? 201 : 200).json({ applied: result.applied, settlement: result.settlement });
      logOutcome(req, res, "POST /checkout/commit", "commitMatchEntry", matchId, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "POST /checkout/commit", "commitMatchEntry", matchId, startedAt, "error", mapped.error);
    }
  });

  /**
   * GET /settlements/stale — audit surface, not player data. Default 1h,
   * mirroring the RPC's own default.
   *
   * MUST be registered before `/settlements/:matchId` below: Express
   * matches routes in registration order, and `/settlements/stale` is
   * syntactically indistinguishable from `/settlements/:matchId` with
   * `matchId="stale"` — registering the dynamic route first would silently
   * swallow every request to this one under the wrong auth guard
   * (`requireIdentity` instead of `requireOperationalAuth`). Caught by this
   * phase's own tests, not by inspection.
   */
  router.get("/settlements/stale", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const rawOlderThanMs = req.query.olderThanMs !== undefined ? Number(req.query.olderThanMs) : 3_600_000;
    if (!isNonNegativeInteger(rawOlderThanMs)) {
      res.status(400).json({ error: "InvalidRequest", message: "olderThanMs must be a non-negative integer." });
      return;
    }
    try {
      const settlements = await service.listStaleCommittedSettlements(rawOlderThanMs);
      res.json({ settlements });
      logOutcome(req, res, "GET /settlements/stale", "listStaleCommittedSettlements", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /settlements/stale", "listStaleCommittedSettlements", null, startedAt, "error", mapped.error);
    }
  });

  /**
   * GET /settlements/:matchId
   *
   * Ownership pattern: the frozen repository/service surface exposes no
   * participant list for a settlement (see
   * economy-v1-bigint-boundary-inventory.md — `match_economy_participants`
   * is NOT EXPOSED), so the only ownership check possible without a new
   * repository read method (forbidden this phase) is against the
   * settlement's own `hostIdentityId` — mirrors `requireSelfParam`'s
   * ownership spirit, applied to a resolved record field instead of a path
   * param, since `:matchId` is not itself a player id.
   */
  router.get("/settlements/:matchId", requireIdentity, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const matchId = req.params.matchId;
    try {
      const settlement = await service.getSettlement(matchId);
      if (!settlement) {
        res.status(404).json({ error: "MatchNotFound", message: "No settlement exists for this match." });
        logOutcome(req, res, "GET /settlements/:matchId", "getSettlement", matchId, startedAt, "error", "MatchNotFound");
        return;
      }
      if (settlement.hostIdentityId !== callerId(req)) {
        res.status(403).json({ error: "Forbidden", message: "That is not your record." });
        logOutcome(req, res, "GET /settlements/:matchId", "getSettlement", matchId, startedAt, "error", "Forbidden");
        return;
      }
      res.json({ settlement });
      logOutcome(req, res, "GET /settlements/:matchId", "getSettlement", matchId, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /settlements/:matchId", "getSettlement", matchId, startedAt, "error", mapped.error);
    }
  });

  /** GET /settlements/:matchId/reconcile — audit surface, not player data. */
  router.get("/settlements/:matchId/reconcile", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const matchId = req.params.matchId;
    try {
      const reconciliation = await service.reconcileSettlement(matchId);
      res.json({ reconciliation });
      logOutcome(req, res, "GET /settlements/:matchId/reconcile", "reconcileSettlement", matchId, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /settlements/:matchId/reconcile", "reconcileSettlement", matchId, startedAt, "error", mapped.error);
    }
  });

  /**
   * POST /vouchers/redeem
   *
   * `VoucherNotFoundError`/`VoucherNotActiveError`/`VoucherAlreadyRedeemedError`/
   * `InvalidVoucherHashError` are deliberately merged into ONE generic
   * response here (blueprint §2.6): distinguishing "not found" from
   * "already used" from "malformed" for a bearer instrument is an oracle for
   * guessing other people's codes one bit at a time. The real distinction
   * IS logged (`errorCode` in `logOutcome`), for support/ops purposes only
   * — never returned to the caller.
   */
  router.post("/vouchers/redeem", requireMember, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { code } = body;
    if (!isNonEmptyString(code)) {
      res.status(400).json({ error: "InvalidRequest", message: "code must be a non-empty string." });
      return;
    }
    const memberIdentityId = callerId(req);
    try {
      const result = await service.redeemVoucher(code, memberIdentityId);
      const wallet = await service.getWallet(memberIdentityId);
      res.json({ applied: result.applied, voucher: result.voucher, newBalance: wallet.balance });
      logOutcome(req, res, "POST /vouchers/redeem", "redeemVoucher", null, startedAt, "ok");
    } catch (err) {
      if (
        err instanceof VoucherNotFoundError ||
        err instanceof VoucherNotActiveError ||
        err instanceof VoucherAlreadyRedeemedError ||
        err instanceof InvalidVoucherHashError
      ) {
        res.status(422).json({ error: "VoucherNotRedeemable", message: "This code isn't valid or has already been used." });
        logOutcome(req, res, "POST /vouchers/redeem", "redeemVoucher", null, startedAt, "error", safeErrorCode(err));
        return;
      }
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "POST /vouchers/redeem", "redeemVoucher", null, startedAt, "error", mapped.error);
    }
  });

  /**
   * GET /vouchers/:voucherId — PUBLIC, no auth guard (see the file header's
   * flagged conflict: `:voucherId` must actually contain the raw bearer
   * code, the only key `getVoucherStatus` accepts). `matchId` is
   * deliberately NOT logged for this one route — see `logOutcome` call
   * below, which passes `null` even though a real match reference may be
   * knowable, to avoid the raw code's presence in this request being
   * correlated any more than the URL itself already allows.
   */
  router.get("/vouchers/:voucherId", async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const rawCode = req.params.voucherId;
    if (!isNonEmptyString(rawCode)) {
      res.status(400).json({ error: "InvalidRequest", message: "A voucher code is required." });
      return;
    }
    try {
      const status = await service.getVoucherStatus(rawCode);
      if (!status) {
        res.status(404).json({ error: "VoucherNotFound", message: "No voucher matches this code." });
        logOutcome(req, res, "GET /vouchers/:voucherId", "getVoucherStatus", null, startedAt, "error", "VoucherNotFound");
        return;
      }
      res.json({ voucher: status });
      logOutcome(req, res, "GET /vouchers/:voucherId", "getVoucherStatus", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /vouchers/:voucherId", "getVoucherStatus", null, startedAt, "error", mapped.error);
    }
  });

  /** GET /world-bank — platform treasury figures; admin/audit surface, not player data. */
  router.get("/world-bank", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    try {
      const worldBank = await service.getWorldBankSnapshot();
      res.json({ worldBank });
      logOutcome(req, res, "GET /world-bank", "getWorldBankSnapshot", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /world-bank", "getWorldBankSnapshot", null, startedAt, "error", mapped.error);
    }
  });

  /* ═══════════════════════ Blocker 06 — durable terminal-intent admin ═════
   * All five routes below are `requireOperationalAuth`-gated — the same
   * platform-financial/audit boundary `/world-bank` and `/settlements/stale`
   * already use, no new admin boundary invented. None accepts a client-
   * supplied wallet amount, identity kind, or replacement payload — the
   * ONLY writes these expose are the two narrow, already-audited state
   * transitions `retryTerminalIntent`/`requeueExpiredTerminalIntentClaim`
   * already enforce at the repository layer (FAILED -> PENDING only;
   * PROCESSING with an expired-or-force-overridden lease -> PENDING only).
   */

  /** GET /terminal-intents — list by status (optional), for operator triage. */
  router.get("/terminal-intents", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const rawStatus = req.query.status;
    if (rawStatus !== undefined && (typeof rawStatus !== "string" || !VALID_INTENT_STATUSES.has(rawStatus as TerminalIntentStatus))) {
      res.status(400).json({ error: "InvalidRequest", message: "status must be one of PENDING, PROCESSING, RETRYABLE, COMPLETED, FAILED." });
      return;
    }
    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
    const rawOffset = req.query.offset !== undefined ? Number(req.query.offset) : 0;
    if (!isNonNegativeInteger(rawLimit) || !isNonNegativeInteger(rawOffset)) {
      res.status(400).json({ error: "InvalidRequest", message: "limit and offset must be non-negative integers." });
      return;
    }
    try {
      const intents = await service.listTerminalIntents({
        status: rawStatus as TerminalIntentStatus | undefined,
        limit: rawLimit,
        offset: rawOffset,
      });
      res.json({ intents });
      logOutcome(req, res, "GET /terminal-intents", "listTerminalIntents", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /terminal-intents", "listTerminalIntents", null, startedAt, "error", mapped.error);
    }
  });

  /** GET /terminal-intents/:intentId — inspect one intent, including its full replay payload (no secrets/voucher codes ever live in it — see the migration's own column comment). */
  router.get("/terminal-intents/:intentId", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const { intentId } = req.params;
    try {
      const intent = await service.getTerminalIntent(intentId);
      if (!intent) {
        res.status(404).json({ error: "TerminalIntentNotFound", message: "No durable terminal intent exists with this id." });
        logOutcome(req, res, "GET /terminal-intents/:intentId", "getTerminalIntent", null, startedAt, "error", "TerminalIntentNotFound");
        return;
      }
      res.json({ intent });
      logOutcome(req, res, "GET /terminal-intents/:intentId", "getTerminalIntent", intent.matchId, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /terminal-intents/:intentId", "getTerminalIntent", null, startedAt, "error", mapped.error);
    }
  });

  /** GET /terminal-intents/:intentId/reconcile — the settlement reconciliation view for the intent's own match, so an operator investigating a FAILED intent can see the underlying financial state in the same call. */
  router.get("/terminal-intents/:intentId/reconcile", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const { intentId } = req.params;
    try {
      const intent = await service.getTerminalIntent(intentId);
      if (!intent) {
        res.status(404).json({ error: "TerminalIntentNotFound", message: "No durable terminal intent exists with this id." });
        logOutcome(req, res, "GET /terminal-intents/:intentId/reconcile", "getTerminalIntent", null, startedAt, "error", "TerminalIntentNotFound");
        return;
      }
      const reconciliation = await service.reconcileSettlement(intent.matchId);
      res.json({ intent, reconciliation });
      logOutcome(req, res, "GET /terminal-intents/:intentId/reconcile", "reconcileSettlement", intent.matchId, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /terminal-intents/:intentId/reconcile", "reconcileSettlement", null, startedAt, "error", mapped.error);
    }
  });

  /** POST /terminal-intents/:intentId/retry — FAILED -> PENDING only, same recorded payload, audited. */
  router.post("/terminal-intents/:intentId/retry", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const { intentId } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    try {
      const outcome = await service.retryTerminalIntent(intentId, operatorId(req), reason);
      res.json({ updated: outcome.updated, intent: outcome.intent });
      logOutcome(req, res, "POST /terminal-intents/:intentId/retry", "retryTerminalIntent", outcome.intent.matchId, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "POST /terminal-intents/:intentId/retry", "retryTerminalIntent", null, startedAt, "error", mapped.error);
    }
  });

  /** POST /terminal-intents/:intentId/requeue — PROCESSING with an expired (or explicitly force-overridden) lease -> PENDING only. */
  router.post("/terminal-intents/:intentId/requeue", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const { intentId } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (body.force !== undefined && typeof body.force !== "boolean") {
      res.status(400).json({ error: "InvalidRequest", message: "force must be a boolean when present." });
      return;
    }
    try {
      const outcome = await service.requeueExpiredTerminalIntentClaim(intentId, operatorId(req), body.force as boolean | undefined);
      res.json({ updated: outcome.updated, intent: outcome.intent });
      logOutcome(req, res, "POST /terminal-intents/:intentId/requeue", "requeueExpiredTerminalIntentClaim", outcome.intent.matchId, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "POST /terminal-intents/:intentId/requeue", "requeueExpiredTerminalIntentClaim", null, startedAt, "error", mapped.error);
    }
  });

  /**
   * GET /admin/wallet/:identityId — operational lookup of any player's wallet and ledger history.
   * Gated by requireOperationalAuth.
   */
  router.get("/admin/wallet/:identityId", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const rawIdentityId = req.params.identityId;
    if (!rawIdentityId || rawIdentityId.trim().length === 0) {
      res.status(400).json({ error: "InvalidRequest", message: "identityId is required." });
      return;
    }
    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
    const rawOffset = req.query.offset !== undefined ? Number(req.query.offset) : 0;
    if (!isNonNegativeInteger(rawLimit) || !isNonNegativeInteger(rawOffset)) {
      res.status(400).json({ error: "InvalidRequest", message: "limit and offset must be non-negative integers." });
      return;
    }
    try {
      const identityId = await service.resolveIdentity(rawIdentityId.trim());
      const wallet = await service.getWallet(identityId);
      const ledger = await service.getLedger(identityId, { limit: rawLimit, offset: rawOffset });
      res.json({ wallet, ledger });
      logOutcome(req, res, "GET /admin/wallet/:identityId", "adminLookupWallet", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "GET /admin/wallet/:identityId", "adminLookupWallet", null, startedAt, "error", mapped.error);
    }
  });

  /**
   * POST /admin/wallet/adjust — operational manual top-up / adjustment of a player's wallet.
   * Gated by requireOperationalAuth.
   */
  router.post("/admin/wallet/adjust", requireOperationalAuth, async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawIdentityId = typeof body.identityId === "string" ? body.identityId.trim() : "";
    const amountCoins = typeof body.amountCoins === "string" ? body.amountCoins.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const rawIdempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";

    if (!rawIdentityId) {
      res.status(400).json({ error: "InvalidRequest", message: "identityId is required." });
      return;
    }
    if (!amountCoins || !/^\d+$/.test(amountCoins)) {
      res.status(400).json({ error: "InvalidRequest", message: "amountCoins must be a positive integer string." });
      return;
    }

    try {
      const identityId = await service.resolveIdentity(rawIdentityId);
      const idempotencyKey = rawIdempotencyKey.length > 0
        ? rawIdempotencyKey
        : `admin-adjust:${identityId}:${randomUUID()}`;

      const result = await service.adminAdjustWallet({
        identityId,
        amountCoins,
        adminPrincipalId: operatorId(req),
        reason: reason.length > 0 ? reason : "Admin manual top-up",
        idempotencyKey,
      });
      res.json(result);
      logOutcome(req, res, "POST /admin/wallet/adjust", "adminAdjustWallet", null, startedAt, "ok");
    } catch (err) {
      const mapped = sendError(req, res, err);
      logOutcome(req, res, "POST /admin/wallet/adjust", "adminAdjustWallet", null, startedAt, "error", mapped.error);
    }
  });

  return router;
}

export { mapEconomyError, type ApiError as EconomyApiError };
