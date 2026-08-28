/**
 * The seam between BHALYAM's virtual-currency schema (Economy V1) and
 * everything that spends, earns, or reports on it.
 *
 * ── Why this file has no logic ──────────────────────────────────────────
 * Every mutation this interface exposes maps to exactly one `SECURITY
 * DEFINER` RPC in `supabase/migrations/20260826000000_economy_v1.sql`. That
 * migration already decided every business rule that matters — sufficient
 * balance, frozen-wallet enforcement, voucher single-use, settlement
 * conservation — under real row locks, proven under real concurrency
 * (`scripts/economy/verifyEconomySchema.mjs`, five scenarios, eight parallel
 * callers each, exactly one `applied:true` every time). This file's only job
 * is to expose those decisions faithfully to TypeScript: same method per
 * capability, same idempotency envelope, bigint-safe types, and named error
 * classes in place of raw Postgres exception text. See
 * `docs/economy/economy-v1-phase1-implementation-package.md` for the full
 * boundary review this file implements.
 *
 * ── The `EconomyOperationResult` convention ─────────────────────────────
 * Every mutating method returns `{ applied, operation, idempotencyKey,
 * result }` — a direct pass-through of the database's own envelope, never
 * re-wrapped. `applied: false` means "this already happened; here is the
 * ORIGINAL result" and is a normal, successful return value — never thrown,
 * never logged as a failure. This mirrors `ProgressionRepository.ts`'s own
 * `Applied` convention one level richer, because these RPCs already carry
 * more than a boolean: `operation` and `idempotencyKey` let a caller log or
 * assert exactly which database contract resolved the call.
 *
 * ── What is deliberately NOT here ───────────────────────────────────────
 * No business validation beyond shape (a malformed id or hash is rejected
 * before a query is even attempted; whether a wallet has ENOUGH funds is the
 * database's decision, reported here, never pre-empted). No retry logic —
 * exactly one layer owns that, and it is `EconomyService`, not this one. No
 * caching. No cross-player aggregation. No knowledge of HTTP, sessions, or
 * sockets. No raw voucher code, ever, in any form — this file only ever
 * sees or produces a `codeHash`.
 */

/* ═══════════════════════════ Shared literal types ═══════════════════════ */

export type PlayerIdentityKind = "member" | "guest";
export type ParticipantIdentityKind = "member" | "guest" | "bot";
export type VoucherStatus = "ACTIVE" | "REDEEMED" | "CANCELLED";
export type MatchSettlementStatus = "COMMITTED" | "SETTLED" | "REFUNDED" | "ABANDONMENT_FORFEITED";

/**
 * The eight wallet-ledger entry types Economy V1 actually writes.
 * `GUEST_PRIZE_ESCROW` does not exist and never will — a guest's wallet
 * never changes when they win, so nothing belongs on this ledger for that
 * event (see `world_bank_ledger`'s `GUEST_ESCROW_DEPOSIT` instead).
 */
export type WalletLedgerEntryType =
  | "STARTER_GRANT"
  | "ROOM_ENTRY_DEBIT"
  | "SOLO_ENTRY_DEBIT"
  | "BOT_ENTRY_DEBIT"
  | "MATCH_PRIZE_CREDIT"
  | "VOUCHER_REDEMPTION"
  | "MATCH_REFUND"
  | "ADMIN_ADJUSTMENT";

/* ═══════════════════════════ Output DTOs (repository models) ════════════ */

export interface CoinWalletRecord {
  identityId: string;
  identityKind: PlayerIdentityKind;
  /** Bigint-as-string, always — see the file header. */
  balance: string;
  /** Audit counter; every mutation increments this by exactly 1. */
  version: number;
  lifetimeGranted: string;
  lifetimeEarned: string;
  /** Never decreases, under any method, for any reason. */
  lifetimeSpent: string;
  /** Separate from `lifetimeSpent` — a refund credits this, never the other. */
  lifetimeRefunded: string;
  starterGranted: boolean;
  /** Read-only from this repository's own consumers — nothing in Phase 1 sets it. */
  isFrozen: boolean;
  updatedAt: number;
}

export interface CoinLedgerEntryRecord {
  id: number;
  walletId: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  walletVersionBefore: number;
  walletVersionAfter: number;
  entryType: WalletLedgerEntryType;
  sourceKind: string;
  sourceId: string;
  idempotencyKey: string;
  description: string;
  createdAt: number;
}

export interface RewardVoucherRecord {
  id: string;
  /** Exactly 64 lowercase hex characters — the ONLY form of the code this repository ever holds. */
  codeHash: string;
  coinAmount: string;
  matchId: string;
  issuedToGuestId: string;
  status: VoucherStatus;
  /**
   * Present on the model, but never surfaced by any read method's public
   * consumers as "who redeemed this" beyond what the database itself
   * already restricts — see invariant 9 in the Phase 1 implementation
   * package. No convenience lookup for this field is exposed anywhere in
   * this interface.
   */
  redeemedByMemberId: string | null;
  redeemedAt: number | null;
  createdAt: number;
}

/** A narrow read — status and amount only, deliberately not the full record. */
export interface VoucherStatusView {
  status: VoucherStatus;
  coinAmount: string;
}

export interface MatchEconomySettlementRecord {
  matchId: string;
  roomCode: string;
  hostIdentityId: string;
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
  costPerSeat: string;
  totalCollected: string;
  totalWalletRewarded: string;
  totalGuestEscrow: string;
  totalBotCollection: string;
  totalWorldBankCut: string;
  totalRefunded: string;
  refundReason: string | null;
  /**
   * Present only once `status === "ABANDONMENT_FORFEITED"`. Deliberately a
   * SEPARATE field from `refundReason` — a forfeiture and a refund are two
   * different, mutually exclusive terminal causes, and conflating their
   * reason text would make it impossible to tell which one happened from
   * the reason string alone.
   */
  totalForfeited: string;
  forfeitureReason: string | null;
  /**
   * One-way, terminal: COMMITTED -> SETTLED, COMMITTED -> REFUNDED, or
   * COMMITTED -> ABANDONMENT_FORFEITED — never reversed, and never crossed
   * (a settled match can never become refunded or forfeited, etc.). See
   * `forfeitMatchEntry`'s own doc comment for the full terminal-exclusivity
   * matrix.
   */
  status: MatchSettlementStatus;
  settledAt: number | null;
  createdAt: number;
}

/**
 * Five independent, non-fungible balances — never merged into one aggregate
 * figure. `guestEscrowLiability` is money BHALYAM is HOLDING, not money
 * BHALYAM HAS; the other four are BHALYAM's own revenue/counters.
 * `abandonmentForfeitureRevenue` is neither a service fee nor a bot prize —
 * it is the ENTIRE committed pool of a match a human abandoned after
 * commitment with no eligible signed-in successor remaining, never merged
 * into `baseFeeRevenue` or `botPrizeRevenue`.
 */
export interface WorldBankSnapshot {
  baseFeeRevenue: string;
  botPrizeRevenue: string;
  guestEscrowLiability: string;
  totalVoucherRedeemed: string;
  abandonmentForfeitureRevenue: string;
}

export interface EconomyConfigurationRecord {
  id: string;
  version: number;
  guestStarterCoins: string;
  memberStarterCoins: string;
  seatCostCoins: string;
  isActive: boolean;
}

export interface EconomyPrizeScheduleRecord {
  seatCount: number;
  collectedCoins: string;
  firstPlaceCoins: string;
  secondPlaceCoins: string;
  thirdPlaceCoins: string;
  worldBankCoins: string;
}

export interface SettlementReconciliation {
  matchId: string;
  status: MatchSettlementStatus;
  isBalanced: boolean;
  collected: string;
  disbursed: string;
  delta: string;
  details: {
    walletRewarded: string;
    guestEscrow: string;
    botCollection: string;
    worldBankCut: string;
    refunded: string;
    forfeited: string;
  };
}

/**
 * Faithful pass-through of the database's own idempotency envelope
 * (`economy-v1.md` §6a). `applied: false` is a normal, successful outcome —
 * "already happened; here is the ORIGINAL result" — never thrown as an
 * error and never re-interpreted by this repository.
 */
export interface EconomyOperationResult<T> {
  applied: boolean;
  operation: string;
  idempotencyKey: string;
  result: T;
}

/* ═══════════════════════════ Input DTOs ══════════════════════════════════ */

export interface CommitMatchEntryInput {
  /** Also this operation's idempotency key. */
  matchId: string;
  roomCode: string | null;
  /** Must already exist in `player_identities` — this repository never creates it. */
  hostIdentityId: string;
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
  isSolo: boolean;
}

export interface SettlementParticipantInput {
  /** For `bot`, a synthetic id (e.g. `bot_seat_3`) — never FK-checked. */
  identityId: string;
  identityKind: ParticipantIdentityKind;
  placement: number;
  /** Required only when `identityKind === "guest"` AND the placement pays a nonzero prize. */
  voucherCodeHash?: string;
}

export interface SettleMatchEconomyInput {
  matchId: string;
  /** Never inferred by this repository — supplied as a fact by the caller. */
  isValidRanking: boolean;
  participants: SettlementParticipantInput[];
  refundReason?: string;
}

export interface IssueGuestVoucherInput {
  /** This operation's idempotency key — NOT `codeHash`; see the collision-vs-replay note below. */
  voucherId: string;
  codeHash: string;
  coinAmount: string;
  matchId: string;
  issuedToGuestId: string;
}

/* ═══════════════════════════ Error hierarchy ═════════════════════════════
 *
 * Organized by domain (Wallet / Voucher / Settlement / Concurrency /
 * Authorization / Persistence), not by check origin — a cheap shape check
 * this repository performs itself and a stateful rule the database reports
 * live in the same domain class, distinguished only by WHERE they're
 * checked, never by a different parent. Every leaf's `.code` matches the
 * database's own raised token verbatim where the database is the source of
 * the failure.
 */

export abstract class EconomyRepositoryError extends Error {
  abstract readonly code: string;
  /**
   * Deliberately not `protected`: `abstract class` already blocks
   * `new EconomyRepositoryError(...)` and `new WalletError(...)` (every
   * domain-level class is itself `abstract`), which is the only
   * instantiation this hierarchy needs to prevent. A `protected`
   * constructor here would instead make it IMPOSSIBLE to `new` any
   * CONCRETE leaf class (`IdentityNotFoundError`, etc.) from outside this
   * file, since none of them declares its own constructor — they inherit
   * this one, and TypeScript propagates `protected` down the chain. An
   * earlier draft of this file had exactly that bug, caught only once
   * `InMemoryEconomyRepository` actually tried to throw these classes.
   */
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export abstract class WalletError extends EconomyRepositoryError {}
export abstract class VoucherError extends EconomyRepositoryError {}
export abstract class SettlementError extends EconomyRepositoryError {}
export abstract class ConcurrencyError extends EconomyRepositoryError {}
export abstract class AuthorizationError extends EconomyRepositoryError {}
export abstract class PersistenceError extends EconomyRepositoryError {}

/** No `player_identities` row exists for the given id — thrown for guests AND members, unconditionally. This repository never auto-provisions an identity (see `ensureWallet`). */
export class IdentityNotFoundError extends WalletError {
  readonly code = "IDENTITY_NOT_FOUND";
}
/** `identityId` is null, empty, or malformed. Thrown BEFORE any query, by this repository itself. */
export class InvalidIdentityIdError extends WalletError {
  readonly code = "INVALID_IDENTITY_ID";
}
/** A wallet-scoped mutation was called against an identity with no `coin_wallets` row yet (`ensureWallet` was never called first). */
export class WalletNotFoundError extends WalletError {
  readonly code = "WALLET_NOT_FOUND";
}
/** `commitMatchEntry` or `redeemRewardVoucher` attempted against a frozen wallet. Never thrown by `settleMatchEconomy`'s credit path or `refundMatchEntry` — a frozen wallet may always receive. */
export class WalletFrozenError extends WalletError {
  readonly code = "WALLET_FROZEN";
}
/** `commitMatchEntry`'s host balance is below the required commitment, checked AFTER the frozen check. */
export class InsufficientFundsError extends WalletError {
  readonly code = "INSUFFICIENT_FUNDS";
}

/** `codeHash` is not exactly 64 lowercase hex characters. Thrown BEFORE any query, by this repository. */
export class InvalidVoucherHashError extends VoucherError {
  readonly code = "INVALID_VOUCHER_HASH";
}
/** `redeemRewardVoucher`'s `codeHash` matches no row, checked AFTER the membership check already passed. */
export class VoucherNotFoundError extends VoucherError {
  readonly code = "VOUCHER_NOT_FOUND";
}
/** Voucher status is `CANCELLED` (or any non-`ACTIVE`, non-`REDEEMED` state). */
export class VoucherNotActiveError extends VoucherError {
  readonly code = "VOUCHER_NOT_ACTIVE";
}
/** Voucher status is `REDEEMED` and the caller is NOT the original redeemer — a different redeemer attempting an already-redeemed voucher. The same-redeemer case is `applied:false`, never this error. */
export class VoucherAlreadyRedeemedError extends VoucherError {
  readonly code = "VOUCHER_ALREADY_REDEEMED";
}

/** `seatCount` does not equal `humanSeatCount + botSeatCount`. */
export class InvalidSeatConfigurationError extends SettlementError {
  readonly code = "INVALID_SEAT_CONFIGURATION";
}
/** `seatCount` is outside 1-5. */
export class UnsupportedSeatCountError extends SettlementError {
  readonly code = "UNSUPPORTED_SEAT_COUNT";
}
/** A `settleMatchEconomy` participant's `identityKind` is not exactly `member`, `guest`, or `bot`. */
export class InvalidIdentityKindError extends SettlementError {
  readonly code = "INVALID_IDENTITY_KIND";
}
/** `settleMatchEconomy` or `refundMatchEntry` called against a `matchId` with no `COMMITTED` settlement row at all. */
export class MatchNotCommittedError extends SettlementError {
  readonly code = "MATCH_NOT_COMMITTED";
}
/** `refundMatchEntry` or `forfeitMatchEntry` called against a settlement that reached `SETTLED` before this call arrived — a genuine race, not a bug. */
export class MatchAlreadySettledError extends SettlementError {
  readonly code = "MATCH_ALREADY_SETTLED";
}
/** `forfeitMatchEntry` called against a settlement that was already `REFUNDED` — a refund and a forfeiture are different, mutually exclusive terminal causes; never silently merged. */
export class MatchAlreadyRefundedError extends SettlementError {
  readonly code = "MATCH_ALREADY_REFUNDED";
}
/** `refundMatchEntry` called against a settlement that was already `ABANDONMENT_FORFEITED` — the committed pool already moved to World Bank; refunding on top would double-move it. */
export class MatchAlreadyForfeitedError extends SettlementError {
  readonly code = "MATCH_ALREADY_FORFEITED";
}
/** Computed disbursement does not equal total collected — a caller-side placement-extraction bug, not a database defect. */
export class SettlementConservationViolationError extends SettlementError {
  readonly code = "SETTLEMENT_CONSERVATION_VIOLATION";
}
/** `reconcileSettlement`'s specific "does not exist at all" — distinct from the `null`-returning plain reads. */
export class MatchNotFoundError extends SettlementError {
  readonly code = "MATCH_NOT_FOUND";
}

/**
 * A genuine unique-constraint race: two DIFFERENT `voucherId`s attempting to
 * use the SAME `codeHash`. The only member of this category by design, not
 * by omission — this repository's concurrency model is entirely pessimistic
 * (row locks + advisory locks), proven to resolve every genuinely-idempotent
 * operation to exactly one `applied:true` with zero errors. This is the one
 * place two both-legitimate operations can still collide on a real
 * constraint.
 */
export class VoucherCodeCollisionError extends ConcurrencyError {
  readonly code = "VOUCHER_CODE_COLLISION";
}

/**
 * The caller's identity is `kind: 'guest'`, attempting a member-only action.
 * Checked by the database BEFORE voucher lookup — this error can occur even
 * for a `codeHash` that doesn't exist, deliberately, so voucher existence is
 * never disclosed to a non-member.
 */
export class OnlyMembersCanRedeemError extends AuthorizationError {
  readonly code = "ONLY_MEMBERS_CAN_REDEEM_VOUCHERS";
}

/**
 * Connectivity, timeout, or any database error that does not match one of
 * the named tokens above. The ONLY class any future retry policy
 * (`EconomyService`, out of scope here) may treat as retryable.
 */
export class EconomyInfrastructureError extends PersistenceError {
  readonly code = "INFRASTRUCTURE_ERROR";
}

/* ═══════════════════════════ The repository interface ═══════════════════ */

export interface EconomyRepository {
  /** Which implementation this is. Reported by `/health`, logged at boot. */
  readonly kind: "memory" | "supabase";

  /**
   * Prove the store is reachable and the Economy V1 schema is present.
   * Called once at boot. Throws `EconomyInfrastructureError` otherwise.
   */
  ping(): Promise<void>;

  /* ── reads ── */

  /** `null` if no wallet has been provisioned yet — a valid, non-error state. */
  getWallet(identityId: string): Promise<CoinWalletRecord | null>;

  /** Newest-first. `opts.limit` defaults to 20, clamped to a hard max of 100. */
  listLedger(
    walletId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<CoinLedgerEntryRecord[]>;

  /** `null` if the match hasn't been committed yet. */
  getSettlement(matchId: string): Promise<MatchEconomySettlementRecord | null>;

  /** Non-nullable — `world_bank_accounts` is a database-enforced singleton. */
  getWorldBankSnapshot(): Promise<WorldBankSnapshot>;

  /** `null` if no voucher matches. */
  getVoucherStatus(codeHash: string): Promise<VoucherStatusView | null>;

  /** Non-nullable — the active configuration is a database-enforced singleton. */
  getActiveConfiguration(): Promise<EconomyConfigurationRecord>;

  /** `null` for an unsupported seat count — never throws for an out-of-range value. */
  getPrizeSchedule(seatCount: number): Promise<EconomyPrizeScheduleRecord | null>;

  /** Wraps `reconcile_match_settlement`. Throws `MatchNotFoundError` if the settlement doesn't exist — the one read where "not found" is an error, not a `null`. */
  reconcileSettlement(matchId: string): Promise<SettlementReconciliation>;

  /**
   * Wraps `list_stale_committed_settlements`. Read-only; nothing calls this
   * automatically at any layer, in this repository or above it.
   */
  listStaleCommittedSettlements(olderThanMs: number): Promise<MatchEconomySettlementRecord[]>;

  /* ── mutations ── */

  /**
   * Idempotent wallet provisioning. Returns the wallet, guaranteed to exist
   * by the time this resolves. Deliberately NOT wrapped in
   * `EconomyOperationResult` — its effect is idempotent, but there is no
   * "was THIS call the one that provisioned it" question worth answering.
   *
   * Throws `IdentityNotFoundError` if `identityId` has no `player_identities`
   * row. Never creates one — for guests or members, under any input, ever.
   */
  ensureWallet(identityId: string): Promise<CoinWalletRecord>;

  /** Keyed by `identityId`; guarded by the wallet's own `starter_granted` flag, not the key alone. */
  grantStarterCoins(identityId: string): Promise<EconomyOperationResult<CoinWalletRecord>>;

  /** Keyed by `matchId`. */
  commitMatchEntry(
    input: CommitMatchEntryInput,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>;

  /**
   * Keyed by `matchId`. A settled or refunded match's replay returns
   * `applied:false` regardless of what `isValidRanking` the replay passes.
   *
   * Atomicity guarantee: on ANY failure (`InvalidIdentityKindError`,
   * `InvalidVoucherHashError`, `VoucherCodeCollisionError`,
   * `SettlementConservationViolationError`, `IdentityNotFoundError` for a
   * member participant), this method leaves zero partial effect — no wallet
   * credit, no ledger row, no participant row survives for ANY participant
   * in the array, even ones that would have succeeded had they been
   * processed alone. Every implementation of this interface must uphold
   * this independently, not merely inherit it from a database transaction —
   * `InMemoryEconomyRepository` in particular has no ambient transaction to
   * fall back on.
   */
  settleMatchEconomy(
    input: SettleMatchEconomyInput,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>;

  /**
   * Keyed by `matchId`. Standalone from `settleMatchEconomy`'s internal
   * invalid-ranking path. Throws `MatchAlreadyForfeitedError` if the
   * settlement already reached `ABANDONMENT_FORFEITED` — refunding a
   * forfeited match would double-move the same pool.
   */
  refundMatchEntry(
    matchId: string,
    reason: string,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>;

  /**
   * Keyed by `matchId`. Player-fault abandonment of an economically active
   * match with no eligible signed-in successor remaining — see
   * `RoomManager.abandonRoom`'s "Economic routing" doc comment. Moves the
   * ENTIRE `total_collected` pool to the dedicated
   * `abandonmentForfeitureRevenue` World Bank balance; the economic owner
   * (`hostIdentityId`) is never credited, and no participant row, wallet
   * credit, or voucher is ever created by this method. Deliberately takes
   * no amount — the forfeited total is always derived from the settlement's
   * own `totalCollected`, never a caller-supplied value.
   *
   * A settlement already `ABANDONMENT_FORFEITED` replays `applied:false`
   * with the original result (idempotent, not an error). Throws
   * `MatchAlreadySettledError` if the settlement already reached `SETTLED`,
   * or `MatchAlreadyRefundedError` if it already reached `REFUNDED` — both
   * are different, mutually exclusive terminal causes reached by a
   * different action entirely, never silently resolved into a forfeiture.
   */
  forfeitMatchEntry(
    matchId: string,
    reason: string,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>;

  /**
   * Keyed by `voucherId`, NOT by `codeHash`. A replay with the same
   * `voucherId` is `applied:false`; a DIFFERENT `voucherId` reusing the same
   * `codeHash` is a `VoucherCodeCollisionError`, thrown, never a replay.
   */
  issueGuestVoucher(
    input: IssueGuestVoucherInput,
  ): Promise<EconomyOperationResult<RewardVoucherRecord>>;

  /**
   * Keyed by `(voucherId, memberIdentityId)` together. The SAME member
   * redeeming an already-redeemed-by-them voucher is `applied:false`. A
   * DIFFERENT member attempting the same voucher is `VoucherAlreadyRedeemedError`.
   */
  redeemRewardVoucher(
    codeHash: string,
    memberIdentityId: string,
  ): Promise<EconomyOperationResult<RewardVoucherRecord>>;
}
