import { logger } from "../lib/logger.js";
import {
  type CoinLedgerEntryRecord,
  type CoinWalletRecord,
  type CommitMatchEntryInput,
  type EconomyRepository,
  type MatchEconomySettlementRecord,
  type ParticipantIdentityKind,
  type RewardVoucherRecord,
  type SettlementParticipantInput as RepoSettlementParticipantInput,
  type SettlementReconciliation,
  type VoucherStatusView,
  type WorldBankSnapshot,
  EconomyRepositoryError,
  EconomyInfrastructureError,
  InvalidSeatConfigurationError,
  MatchNotCommittedError,
  UnsupportedSeatCountError,
  VoucherCodeCollisionError,
} from "../persistence/EconomyRepository.js";
import { generateRawVoucherCode, hashVoucherCode } from "./voucherCrypto.js";
import { isStructurallyValidSeatConfiguration } from "./economyCapacityContract.js";

/**
 * BHALYAM Economy V1 Phase 5 — the server-authoritative orchestration layer
 * over `EconomyRepository`.
 *
 * ── What this file adds that the repository deliberately does not ───────
 * `EconomyRepository.ts`'s own header says it plainly: "No business
 * validation beyond shape... No retry logic — exactly one layer owns that,
 * and it is `EconomyService`". Concretely, three things live here and
 * nowhere else in the stack:
 *
 *   1. Settlement-shape validation the database does not enforce itself —
 *      non-empty participants, unique identities, a placement permutation
 *      that actually covers every seat. See "Settlement validation
 *      findings" in the Phase 5 completion report for the real gaps this
 *      closes (verified by reading `InMemoryEconomyRepository.settleMatchEconomy`
 *      and the migration's `settle_match_economy` body — neither rejects a
 *      duplicate placement or an empty array on its own).
 *   2. The bearer-voucher generator `economy-v1.md` §3.1 requires and the
 *      migration explicitly declines to be — see `voucherCrypto.ts`.
 *   3. The one retry policy this whole system gets: bounded, typed-error-
 *      aware, and never applied to a business rejection.
 *
 * ── Bigint-safe arithmetic ────────────────────────────────────────────────
 * Every coin amount this file touches is a decimal string in, a decimal
 * string out. `toBig`/`fromBig` below are the only two functions that ever
 * convert between that string and a `bigint` for arithmetic; nothing in this
 * file ever routes a coin amount through `Number`.
 *
 * ── What is deliberately NOT here ─────────────────────────────────────────
 * No HTTP, no Express, no socket handling (Phase 6+). No RoomManager call
 * site. No game-specific ranking derivation — `settleMatchEconomy` validates
 * the SHAPE of whatever ranking it's given; deciding who actually placed
 * where is a future RoomManager adapter's job, per this phase's own
 * instructions. No `SupabaseEconomyRepository` import — the repository this
 * class talks to is a constructor argument, never instantiated here.
 */

/* ═══════════════════════════ Service-level errors ═══════════════════════
 * Distinct from `EconomyRepositoryError` (owned by EconomyRepository.ts,
 * never modified here) because these validate conditions the repository
 * layer never claimed to check — see the file header. Same shape
 * (abstract base + a stable `.code`) for a caller that wants to branch on
 * either hierarchy identically.
 */

export abstract class EconomyServiceError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** `matchId` empty, or a refund/invalid-ranking call with no `refundReason`. */
export class InvalidRequestError extends EconomyServiceError {
  readonly code = "INVALID_REQUEST";
}
/** `settleMatchEconomy` called with `isValidRanking: true` and zero participants. */
export class EmptyParticipantListError extends EconomyServiceError {
  readonly code = "EMPTY_PARTICIPANT_LIST";
}
/** The same `identityId` appears more than once in one settlement's participants. */
export class DuplicateParticipantIdentityError extends EconomyServiceError {
  readonly code = "DUPLICATE_PARTICIPANT_IDENTITY";
}
/**
 * The participants' placements are not exactly a permutation of
 * `1..seatCount` — a gap, a duplicate, an out-of-range value, or a length
 * that doesn't match the committed seat count. This is the shape check for
 * "deterministic authoritative ranking"; it says nothing about who SHOULD
 * have won, only that what's given is a well-formed total ordering.
 */
export class InvalidRankingShapeError extends EconomyServiceError {
  readonly code = "INVALID_RANKING_SHAPE";
}
/** A participant's `identityId`/`identityKind`/`placement` is missing or malformed. */
export class InvalidParticipantShapeError extends EconomyServiceError {
  readonly code = "INVALID_PARTICIPANT_SHAPE";
}
/**
 * An internal invariant this service's own construction must uphold and
 * never actually violate in practice: every guest participant winning a
 * nonzero prize carries a server-generated voucher hash, and no member/bot/
 * non-winning participant carries one. See Phase 5's explicit validation
 * bullets — this is what proves them, not merely documents them.
 */
export class VoucherHashPolicyViolationError extends EconomyServiceError {
  readonly code = "VOUCHER_HASH_POLICY_VIOLATION";
}
/**
 * An `EconomyInfrastructureError` survived this method's retry budget, or a
 * genuinely unexpected (non-`EconomyRepositoryError`) exception was thrown.
 * The ONLY error class in this file whose message is guaranteed generic —
 * the original detail (which may contain raw PostgREST/Postgres text) is
 * logged server-side and never placed on this instance.
 */
export class EconomyServiceInfrastructureError extends EconomyServiceError {
  readonly code = "ECONOMY_SERVICE_INFRASTRUCTURE_ERROR";
}

/* ═══════════════════════════ Bigint-safe arithmetic ═══════════════════════ */

const BIGINT_STRING_PATTERN = /^-?\d+$/;

/**
 * A coin amount this file trusts (repository output) into a `bigint`.
 * Malformed input here means the transport contract upstream regressed —
 * see `SupabaseEconomyRepository.ts`'s own `bigStr()`, which this mirrors —
 * so it is reported the same way: an infrastructure error, never a silent
 * `Number` fallback.
 */
function toBig(value: string): bigint {
  if (!BIGINT_STRING_PATTERN.test(value)) {
    throw new EconomyServiceInfrastructureError(
      "A coin amount arrived in a shape this service does not trust; refusing to guess at its value.",
    );
  }
  return BigInt(value);
}

/** The only place a `bigint` becomes the string this service hands back out. `BigInt.prototype.toString` is already canonical (no leading zeros, no scientific notation, "0" for zero). */
function fromBig(value: bigint): string {
  return value.toString();
}

/* ═══════════════════════════ Public DTOs ══════════════════════════════════ */

export interface MatchCheckoutQuoteInput {
  hostIdentityId: string;
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
}

export interface MatchCheckoutQuote {
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
  costPerSeat: string;
  totalCommitment: string;
  prizeDistribution: {
    firstPlace: string;
    secondPlace: string;
    thirdPlace: string;
  };
  worldBankContribution: string;
  hostBalance: string;
  /** `hostBalance - totalCommitment`. May be negative — this is a projection, not a promise; `commitMatchEntry` remains authoritative. */
  projectedBalance: string;
  hasSufficientFunds: boolean;
  /** `totalCommitment - hostBalance`, present only when `hasSufficientFunds` is false. */
  shortfall: string | null;
  configurationVersion: number;
}

export interface CommitMatchEntryRequest {
  matchId: string;
  roomCode: string | null;
  hostIdentityId: string;
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
  isSolo: boolean;
}

export interface CommitMatchEntryResult {
  applied: boolean;
  settlement: MatchEconomySettlementRecord;
}

/**
 * What a caller (a future RoomManager adapter) supplies for one seat's
 * outcome. Deliberately has NO prize amount and NO voucher hash — both are
 * computed/generated by this service, never accepted from a caller. See the
 * file header and Phase 5's "never accept authoritative prize values from
 * clients" constraint.
 */
export interface SettlementParticipantOutcome {
  identityId: string;
  identityKind: ParticipantIdentityKind;
  placement: number;
}

export interface SettleMatchEconomyRequest {
  matchId: string;
  isValidRanking: boolean;
  participants: SettlementParticipantOutcome[];
  refundReason?: string;
}

/**
 * The one and only place a raw bearer code exists after this call returns.
 * Never logged (see Phase 8 tests), never persisted by this service, never
 * reconstructable later — the repository stores only `hashVoucherCode(rawCode)`.
 */
export interface IssuedVoucherAck {
  identityId: string;
  matchId: string;
  coinAmount: string;
  rawCode: string;
}

export interface SettleMatchEconomyResult {
  applied: boolean;
  settlement: MatchEconomySettlementRecord;
  /** Empty on a replay (`applied: false`) — a raw code cannot be recovered from a stored hash, so nothing is re-issued. */
  issuedVouchers: IssuedVoucherAck[];
}

/** `RewardVoucherRecord` minus `codeHash` — this service never returns a hash to any caller. */
export type VoucherRecord = Omit<RewardVoucherRecord, "codeHash">;

export interface RedeemVoucherResult {
  applied: boolean;
  voucher: VoucherRecord;
}

export interface EconomyServiceOptions {
  now?: () => number;
  /** Injectable so tests never sleep for real. Defaults to a real `setTimeout`. */
  delay?: (ms: number) => Promise<void>;
  /** Bounded retries for a genuine `code_hash` unique-violation (economy-v1.md §3.1: "astronomically unlikely, but must be handled, not ignored"). */
  maxVoucherCollisionRetries?: number;
  /** economy-v1-implementation-blueprint.md §2.3/§2.4's approved backoff. */
  infrastructureRetryBackoffMs?: number;
}

const DEFAULT_INFRASTRUCTURE_RETRY_BACKOFF_MS = 250;
const DEFAULT_MAX_VOUCHER_COLLISION_RETRIES = 5;
const HEX64 = /^[0-9a-f]{64}$/;

function durationCategory(ms: number): "fast" | "normal" | "slow" {
  if (ms < 100) return "fast";
  if (ms < 500) return "normal";
  return "slow";
}

/** `err.code` for anything this file or the repository throws; a stable fallback otherwise. Never the raw message — that's a separate, deliberate choice at each log call site. */
function safeErrorCode(err: unknown): string {
  if (err instanceof EconomyRepositoryError || err instanceof EconomyServiceError) return err.code;
  return "UNKNOWN";
}

export class EconomyService {
  private readonly now: () => number;
  private readonly delay: (ms: number) => Promise<void>;
  private readonly maxVoucherCollisionRetries: number;
  private readonly infrastructureRetryBackoffMs: number;

  constructor(
    private readonly repository: EconomyRepository,
    options: EconomyServiceOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.maxVoucherCollisionRetries = options.maxVoucherCollisionRetries ?? DEFAULT_MAX_VOUCHER_COLLISION_RETRIES;
    this.infrastructureRetryBackoffMs = options.infrastructureRetryBackoffMs ?? DEFAULT_INFRASTRUCTURE_RETRY_BACKOFF_MS;
  }

  /* ═══════════════════════ logging (Phase 8) ═══════════════════════════
   * Every field logged below is safe by construction: operation name, a
   * match id (a room-scoped identifier, not a secret), applied/replay,
   * a duration bucket, and a `.code` string. Nothing here ever receives a
   * raw voucher code, a `codeHash`, a service-role key, or a full payload —
   * see EconomyService.test.ts's "no raw voucher data in logs" test, which
   * asserts this by scanning every logger call this class makes, not by
   * trusting this comment.
   */

  private logOutcome(operation: string, matchRef: string | null, startedAt: number, applied: boolean | "read"): void {
    logger.info({
      message: `${operation} completed`,
      module: "ECONOMY",
      operation,
      matchId: matchRef,
      applied,
      durationCategory: durationCategory(this.now() - startedAt),
    });
  }

  private logFailure(operation: string, matchRef: string | null, startedAt: number, err: unknown): void {
    logger.warn({
      message: `${operation} failed`,
      module: "ECONOMY",
      operation,
      matchId: matchRef,
      durationCategory: durationCategory(this.now() - startedAt),
      errorCode: safeErrorCode(err),
    });
  }

  /* ═══════════════════════ error + retry policy (Phase 6/7) ═════════════
   * Classification, applied uniformly:
   *   - A typed `EconomyRepositoryError` that is NOT `EconomyInfrastructureError`
   *     is a business outcome. Rethrown unchanged, never retried — retrying
   *     `WalletFrozenError` or `SettlementConservationViolationError`
   *     changes nothing about why it failed.
   *   - `EconomyInfrastructureError` gets exactly one retry (fn(), specific
   *     to the caller) after `infrastructureRetryBackoffMs`. If the retry
   *     also fails, it is wrapped into `EconomyServiceInfrastructureError`
   *     with a generic message — the original detail (which may contain raw
   *     PostgREST/Postgres text) is logged here, server-side, and never
   *     placed on the thrown instance.
   *   - Anything else (a non-`EconomyRepositoryError` exception — a bug,
   *     not a database outcome) is wrapped the same way, immediately, no
   *     retry.
   */

  private wrapUnexpected(operation: string, err: unknown): Error {
    if (err instanceof EconomyRepositoryError && !(err instanceof EconomyInfrastructureError)) {
      return err;
    }
    if (err instanceof EconomyServiceError) {
      return err;
    }
    const detail = err instanceof Error ? err.message : String(err);
    logger.error({
      message: `${operation} hit an unrecoverable infrastructure failure`,
      module: "ECONOMY",
      operation,
      errorCode: safeErrorCode(err),
      // Server-side only — this is exactly the raw PostgREST/Postgres detail
      // Phase 6 requires never reach a caller. It belongs in the log, not on
      // the thrown error.
      detail,
    });
    return new EconomyServiceInfrastructureError(
      "A temporary problem occurred while processing this economy operation. Try again shortly.",
    );
  }

  /** Reads and most mutations: one infrastructure retry, business errors pass through untouched. */
  private async withRetry<T>(operation: string, matchRef: string | null, fn: () => Promise<T>): Promise<T> {
    const startedAt = this.now();
    try {
      const result = await fn();
      return result;
    } catch (err) {
      if (err instanceof EconomyInfrastructureError) {
        logger.warn({
          message: `${operation} hit an infrastructure error; retrying once`,
          module: "ECONOMY",
          operation,
          matchId: matchRef,
        });
        await this.delay(this.infrastructureRetryBackoffMs);
        try {
          return await fn();
        } catch (retryErr) {
          this.logFailure(operation, matchRef, startedAt, retryErr);
          throw this.wrapUnexpected(operation, retryErr);
        }
      }
      this.logFailure(operation, matchRef, startedAt, err);
      throw this.wrapUnexpected(operation, err);
    }
  }

  /**
   * No retry at all, for anything at or beyond it — `redeemVoucher`'s own
   * policy (blueprint §2.6): "no automatic retry at all... rather than the
   * service silently re-submitting a raw code multiple times."
   */
  private async withoutRetry<T>(operation: string, matchRef: string | null, fn: () => Promise<T>): Promise<T> {
    const startedAt = this.now();
    try {
      return await fn();
    } catch (err) {
      this.logFailure(operation, matchRef, startedAt, err);
      throw this.wrapUnexpected(operation, err);
    }
  }

  /* ═══════════════════════ wallet & ledger ═══════════════════════════════ */

  /**
   * Always provisions (idempotent) rather than returning a bare "not found"
   * — blueprint §2.1: a player who hasn't played yet is not an error state.
   */
  async getWallet(identityId: string): Promise<CoinWalletRecord> {
    const startedAt = this.now();
    const wallet = await this.withRetry("getWallet", null, () => this.repository.ensureWallet(identityId));
    this.logOutcome("getWallet", null, startedAt, "read");
    return wallet;
  }

  async getLedger(
    identityId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<CoinLedgerEntryRecord[]> {
    const startedAt = this.now();
    await this.withRetry("getLedger:ensureWallet", null, () => this.repository.ensureWallet(identityId));
    const entries = await this.withRetry("getLedger", null, () => this.repository.listLedger(identityId, opts));
    this.logOutcome("getLedger", null, startedAt, "read");
    return entries;
  }

  /* ═══════════════════════ checkout quotation (Phase 4) ══════════════════
   * Read-only by construction: every repository call below is a plain read
   * (`getWallet`, never `ensureWallet`; `getActiveConfiguration`;
   * `getPrizeSchedule`). Nothing here reserves or deducts coins —
   * `commitMatchEntry` remains the sole authority, and independently
   * revalidates everything this quote computed (economy-v1.md §6b).
   */
  async quoteMatchCheckout(input: MatchCheckoutQuoteInput): Promise<MatchCheckoutQuote> {
    const startedAt = this.now();
    // Structural validity only (seat math, sanity bound) — NEVER a
    // hardcoded economy-policy ceiling here. Whether this exact seatCount
    // is actually financially supported is decided by the prize-schedule
    // lookup immediately below, which is the sole authority: this used to
    // ALSO hardcode `seatCount > 5`, duplicating (and, for the 2026-08-28
    // P0 incident, silently drifting from) the catalog's own per-game
    // maximums in shared/catalog.ts. See economyCapacityContract.ts.
    if (!isStructurallyValidSeatConfiguration(input.seatCount, input.humanSeatCount, input.botSeatCount)) {
      throw new InvalidSeatConfigurationError(
        "seatCount must be a positive integer matching humanSeatCount + botSeatCount",
      );
    }

    const [config, schedule, wallet] = await Promise.all([
      this.withRetry("quoteMatchCheckout:config", null, () => this.repository.getActiveConfiguration()),
      this.withRetry("quoteMatchCheckout:schedule", null, () => this.repository.getPrizeSchedule(input.seatCount)),
      this.withRetry("quoteMatchCheckout:wallet", null, () => this.repository.getWallet(input.hostIdentityId)),
    ]);

    if (!schedule) {
      throw new UnsupportedSeatCountError(`No prize schedule for ${input.seatCount} seats`);
    }

    const costPerSeat = toBig(config.seatCostCoins);
    const totalCommitment = costPerSeat * BigInt(input.seatCount);
    const hostBalance = wallet ? toBig(wallet.balance) : 0n;
    const projectedBalance = hostBalance - totalCommitment;
    const hasSufficientFunds = hostBalance >= totalCommitment;

    const quote: MatchCheckoutQuote = {
      seatCount: input.seatCount,
      humanSeatCount: input.humanSeatCount,
      botSeatCount: input.botSeatCount,
      costPerSeat: fromBig(costPerSeat),
      totalCommitment: fromBig(totalCommitment),
      prizeDistribution: {
        firstPlace: schedule.firstPlaceCoins,
        secondPlace: schedule.secondPlaceCoins,
        thirdPlace: schedule.thirdPlaceCoins,
      },
      worldBankContribution: schedule.worldBankCoins,
      hostBalance: fromBig(hostBalance),
      projectedBalance: fromBig(projectedBalance),
      hasSufficientFunds,
      shortfall: hasSufficientFunds ? null : fromBig(totalCommitment - hostBalance),
      configurationVersion: config.version,
    };

    this.logOutcome("quoteMatchCheckout", null, startedAt, "read");
    return quote;
  }

  /* ═══════════════════════ entry commitment ═══════════════════════════════ */

  async commitMatchEntry(request: CommitMatchEntryRequest): Promise<CommitMatchEntryResult> {
    const startedAt = this.now();
    if (request.matchId.trim().length === 0) {
      throw new InvalidRequestError("matchId must not be empty");
    }
    // Same split as quoteMatchCheckout above: structural validity only.
    // Mirrors the database's own structural CHECK exactly (see
    // commit_match_entry in 20260826000000_economy_v1.sql, relaxed
    // alongside this in <migration>) — a faster failure for the common
    // caller bug, never a substitute for the repository's own enforcement.
    // Economic support for this exact seatCount is decided entirely by
    // whether commitMatchEntry's repository call below finds a schedule —
    // this must NEVER re-add a hardcoded upper bound (that duplication is
    // exactly what caused the 2026-08-28 P0 incident).
    if (!isStructurallyValidSeatConfiguration(request.seatCount, request.humanSeatCount, request.botSeatCount)) {
      throw new InvalidSeatConfigurationError(
        "seatCount must be a positive integer matching humanSeatCount + botSeatCount",
      );
    }

    const input: CommitMatchEntryInput = {
      matchId: request.matchId,
      roomCode: request.roomCode,
      hostIdentityId: request.hostIdentityId,
      seatCount: request.seatCount,
      humanSeatCount: request.humanSeatCount,
      botSeatCount: request.botSeatCount,
      isSolo: request.isSolo,
    };

    const outcome = await this.withRetry("commitMatchEntry", request.matchId, () =>
      this.repository.commitMatchEntry(input),
    );
    this.logOutcome("commitMatchEntry", request.matchId, startedAt, outcome.applied);
    return { applied: outcome.applied, settlement: outcome.result };
  }

  /* ═══════════════════════ settlement (Phase 5) ═══════════════════════════
   * Validation order, each step independently testable:
   *   1. isValidRanking === false  → refundReason required, participants
   *      ignored entirely (mirrors the repository's own short-circuit to
   *      `economy_apply_refund` before it ever reads the participant array).
   *   2. isValidRanking === true   → non-empty, unique identities, a
   *      placement permutation covering every committed seat, well-formed
   *      per-participant shape.
   *   3. Voucher generation for qualifying guest participants — the ONE
   *      place a raw bearer code is created (voucherCrypto.ts).
   *   4. A final self-check that step 3's own output obeys the hash policy
   *      (VoucherHashPolicyViolationError) before it ever reaches the
   *      repository.
   */

  async settleMatchEconomy(request: SettleMatchEconomyRequest): Promise<SettleMatchEconomyResult> {
    const startedAt = this.now();
    if (request.matchId.trim().length === 0) {
      throw new InvalidRequestError("matchId must not be empty");
    }

    if (!request.isValidRanking) {
      if (!request.refundReason || request.refundReason.trim().length === 0) {
        throw new InvalidRequestError("refundReason is required when isValidRanking is false");
      }
      const outcome = await this.withRetry("settleMatchEconomy:refund", request.matchId, () =>
        this.repository.settleMatchEconomy({
          matchId: request.matchId,
          isValidRanking: false,
          participants: [],
          refundReason: request.refundReason,
        }),
      );
      this.logOutcome("settleMatchEconomy", request.matchId, startedAt, outcome.applied);
      return { applied: outcome.applied, settlement: outcome.result, issuedVouchers: [] };
    }

    if (request.participants.length === 0) {
      throw new EmptyParticipantListError("settleMatchEconomy requires at least one participant when isValidRanking is true");
    }

    const seenIdentities = new Set<string>();
    for (const p of request.participants) {
      if (typeof p.identityId !== "string" || p.identityId.trim().length === 0) {
        throw new InvalidParticipantShapeError("Every participant requires a non-empty identityId");
      }
      if (p.identityKind !== "member" && p.identityKind !== "guest" && p.identityKind !== "bot") {
        throw new InvalidParticipantShapeError(
          `Participant identityKind must be member, guest, or bot (got ${String(p.identityKind)})`,
        );
      }
      if (!Number.isInteger(p.placement) || p.placement < 1) {
        throw new InvalidParticipantShapeError("Every participant requires a positive integer placement");
      }
      if (seenIdentities.has(p.identityId)) {
        throw new DuplicateParticipantIdentityError(`identityId ${p.identityId} appears more than once`);
      }
      seenIdentities.add(p.identityId);
    }

    const settlement = await this.withRetry("settleMatchEconomy:lookup", request.matchId, () =>
      this.repository.getSettlement(request.matchId),
    );
    if (!settlement) {
      throw new MatchNotCommittedError(`Match settlement ${request.matchId} not found`);
    }

    // The permutation check: "deterministic authoritative ranking" means a
    // full, gapless, duplicate-free ordering over every committed seat — not
    // an opinion about who should have won. Deciding placements is a future
    // RoomManager adapter's job (this phase's own instruction); this is
    // purely the shape a valid ranking must have.
    if (request.participants.length !== settlement.seatCount) {
      throw new InvalidRankingShapeError(
        `Expected exactly ${settlement.seatCount} participants (one per committed seat), got ${request.participants.length}`,
      );
    }
    const placements = request.participants.map((p) => p.placement).sort((a, b) => a - b);
    for (let i = 0; i < placements.length; i++) {
      if (placements[i] !== i + 1) {
        throw new InvalidRankingShapeError(
          `Placements must be exactly 1..${settlement.seatCount} with no gaps or duplicates`,
        );
      }
    }

    const schedule = await this.withRetry("settleMatchEconomy:schedule", request.matchId, () =>
      this.repository.getPrizeSchedule(settlement.seatCount),
    );
    if (!schedule) {
      // Unreachable in practice — commitMatchEntry could not have succeeded
      // for this seatCount without a schedule exisiting. Guarded rather than
      // assumed.
      throw new UnsupportedSeatCountError(`No prize schedule for ${settlement.seatCount} seats`);
    }
    const prizeFor = (placement: number): bigint => {
      if (placement === 1) return toBig(schedule.firstPlaceCoins);
      if (placement === 2) return toBig(schedule.secondPlaceCoins);
      if (placement === 3) return toBig(schedule.thirdPlaceCoins);
      return 0n;
    };

    const build = (): { repoParticipants: RepoSettlementParticipantInput[]; issuedVouchers: IssuedVoucherAck[] } => {
      const repoParticipants: RepoSettlementParticipantInput[] = [];
      const issuedVouchers: IssuedVoucherAck[] = [];
      for (const p of request.participants) {
        const prize = prizeFor(p.placement);
        if (p.identityKind === "guest" && prize > 0n) {
          const rawCode = generateRawVoucherCode();
          const codeHash = hashVoucherCode(rawCode);
          repoParticipants.push({
            identityId: p.identityId,
            identityKind: p.identityKind,
            placement: p.placement,
            voucherCodeHash: codeHash,
          });
          issuedVouchers.push({
            identityId: p.identityId,
            matchId: request.matchId,
            coinAmount: fromBig(prize),
            rawCode,
          });
        } else {
          repoParticipants.push({
            identityId: p.identityId,
            identityKind: p.identityKind,
            placement: p.placement,
          });
        }
      }

      // The literal validation Phase 5 asks for, proven on this service's
      // OWN construction rather than merely assumed by writing the branch
      // above correctly: every guest winning a nonzero prize carries a
      // hash, and nothing else does.
      for (const rp of repoParticipants) {
        const isWinningGuest = issuedVouchers.some((v) => v.identityId === rp.identityId);
        if (isWinningGuest) {
          if (!rp.voucherCodeHash || !HEX64.test(rp.voucherCodeHash)) {
            throw new VoucherHashPolicyViolationError(
              `Guest reward recipient ${rp.identityId} is missing a server-generated voucher hash`,
            );
          }
        } else if (rp.voucherCodeHash !== undefined) {
          throw new VoucherHashPolicyViolationError(
            `Participant ${rp.identityId} (${rp.identityKind}) must not carry a voucher hash`,
          );
        }
      }

      return { repoParticipants, issuedVouchers };
    };

    let attempt = build();
    for (let collisionRetry = 0; ; collisionRetry++) {
      try {
        const outcome = await this.withRetry("settleMatchEconomy", request.matchId, () =>
          this.repository.settleMatchEconomy({
            matchId: request.matchId,
            isValidRanking: true,
            participants: attempt.repoParticipants,
          }),
        );
        this.logOutcome("settleMatchEconomy", request.matchId, startedAt, outcome.applied);
        return {
          applied: outcome.applied,
          settlement: outcome.result,
          issuedVouchers: outcome.applied ? attempt.issuedVouchers : [],
        };
      } catch (err) {
        if (err instanceof VoucherCodeCollisionError && collisionRetry < this.maxVoucherCollisionRetries) {
          logger.warn({
            message: "settleMatchEconomy hit a voucher code_hash collision; regenerating and retrying",
            module: "ECONOMY",
            operation: "settleMatchEconomy",
            matchId: request.matchId,
            attempt: collisionRetry + 1,
          });
          attempt = build();
          continue;
        }
        throw err;
      }
    }
  }

  /* ═══════════════════════ refund ═══════════════════════════════════════ */

  async refundMatchEntry(matchId: string, reason: string): Promise<CommitMatchEntryResult> {
    const startedAt = this.now();
    if (matchId.trim().length === 0) {
      throw new InvalidRequestError("matchId must not be empty");
    }
    if (reason.trim().length === 0) {
      throw new InvalidRequestError("A refund without a reason is an audit gap");
    }
    const outcome = await this.withRetry("refundMatchEntry", matchId, () =>
      this.repository.refundMatchEntry(matchId, reason),
    );
    this.logOutcome("refundMatchEntry", matchId, startedAt, outcome.applied);
    return { applied: outcome.applied, settlement: outcome.result };
  }

  /* ═══════════════════════ abandonment forfeiture ═════════════════════════
   * Player-fault abandonment of an economically active, actually-playing
   * match with no eligible signed-in successor remaining — see
   * `RoomManager.abandonRoom`'s "Economic routing" doc comment. Deliberately
   * the same shape as `refundMatchEntry` (matchId + a required, non-empty
   * reason; never an amount — the repository derives the forfeited total
   * from the settlement's own `total_collected`, exactly like
   * `commit_match_entry` derives `host_identity_id` from its own input, but
   * here there is no caller-supplied value to trust in the first place).
   */
  async forfeitMatchEntry(matchId: string, reason: string): Promise<CommitMatchEntryResult> {
    const startedAt = this.now();
    if (matchId.trim().length === 0) {
      throw new InvalidRequestError("matchId must not be empty");
    }
    if (reason.trim().length === 0) {
      throw new InvalidRequestError("A forfeiture without a reason is an audit gap");
    }
    const outcome = await this.withRetry("forfeitMatchEntry", matchId, () =>
      this.repository.forfeitMatchEntry(matchId, reason),
    );
    this.logOutcome("forfeitMatchEntry", matchId, startedAt, outcome.applied);
    return { applied: outcome.applied, settlement: outcome.result };
  }

  /* ═══════════════════════ vouchers ═══════════════════════════════════════
   * Both methods below accept a RAW code and hash it internally — the same
   * boundary choice blueprint §2.6 makes for redemption, extended here to
   * status lookup too, so that a `codeHash` never needs to appear in this
   * class's PUBLIC signature at all, matching "never expose raw voucher
   * hashes."
   */

  async getVoucherStatus(rawCode: string): Promise<VoucherStatusView | null> {
    const startedAt = this.now();
    const status = await this.withRetry("getVoucherStatus", null, () =>
      this.repository.getVoucherStatus(hashVoucherCode(rawCode)),
    );
    this.logOutcome("getVoucherStatus", null, startedAt, "read");
    return status;
  }

  async redeemVoucher(rawCode: string, memberIdentityId: string): Promise<RedeemVoucherResult> {
    const startedAt = this.now();
    const codeHash = hashVoucherCode(rawCode);
    const outcome = await this.withoutRetry("redeemVoucher", null, () =>
      this.repository.redeemRewardVoucher(codeHash, memberIdentityId),
    );
    this.logOutcome("redeemVoucher", null, startedAt, outcome.applied);
    const { codeHash: _omit, ...voucher } = outcome.result;
    return { applied: outcome.applied, voucher };
  }

  /* ═══════════════════════ settlement lookups ═════════════════════════════ */

  async getSettlement(matchId: string): Promise<MatchEconomySettlementRecord | null> {
    const startedAt = this.now();
    const settlement = await this.withRetry("getSettlement", matchId, () => this.repository.getSettlement(matchId));
    this.logOutcome("getSettlement", matchId, startedAt, "read");
    return settlement;
  }

  async getWorldBankSnapshot(): Promise<WorldBankSnapshot> {
    const startedAt = this.now();
    const snapshot = await this.withRetry("getWorldBankSnapshot", null, () => this.repository.getWorldBankSnapshot());
    this.logOutcome("getWorldBankSnapshot", null, startedAt, "read");
    return snapshot;
  }

  async listStaleCommittedSettlements(olderThanMs: number): Promise<MatchEconomySettlementRecord[]> {
    const startedAt = this.now();
    const clamped = Math.max(olderThanMs, 0);
    const rows = await this.withRetry("listStaleCommittedSettlements", null, () =>
      this.repository.listStaleCommittedSettlements(clamped),
    );
    this.logOutcome("listStaleCommittedSettlements", null, startedAt, "read");
    return rows;
  }

  async reconcileSettlement(matchId: string): Promise<SettlementReconciliation> {
    const startedAt = this.now();
    if (matchId.trim().length === 0) {
      throw new InvalidRequestError("matchId must not be empty");
    }
    const reconciliation = await this.withRetry("reconcileSettlement", matchId, () =>
      this.repository.reconcileSettlement(matchId),
    );
    this.logOutcome("reconcileSettlement", matchId, startedAt, "read");
    return reconciliation;
  }
}
