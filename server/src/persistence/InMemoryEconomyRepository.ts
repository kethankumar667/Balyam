import {
  type AdminAdjustWalletInput,
  type ClaimTerminalIntentResult,
  type CoinLedgerEntryRecord,
  type CoinWalletRecord,
  type CommitMatchEntryInput,
  type CreateTerminalIntentInput,
  type CreateTerminalIntentResult,
  type EconomyConfigurationRecord,
  type EconomyOperationResult,
  type EconomyPrizeScheduleRecord,
  type EconomyRepository,
  type IntentUpdateResult,
  type IssueGuestVoucherInput,
  type ListTerminalIntentsOptions,
  type MarkIntentFailedInput,
  type MarkIntentRetryableInput,
  type MatchEconomySettlementRecord,
  type MatchSettlementStatus,
  type ParticipantIdentityKind,
  type PlayerIdentityKind,
  type RewardVoucherRecord,
  type SettleMatchEconomyInput,
  type SettlementEventRecord,
  type SettlementEventType,
  type SettlementInitiatorKind,
  type SettlementParticipantInput,
  type SettlementReconciliation,
  type TerminalIntentRecord,
  type VoucherStatusView,
  type WalletLedgerEntryType,
  type WorldBankSnapshot,
  IdentityNotFoundError,
  InsufficientFundsError,
  IntentLeaseStillActiveError,
  InvalidIdentityIdError,
  InvalidIdentityKindError,
  InvalidIntentStateTransitionError,
  InvalidSeatConfigurationError,
  InvalidTerminalIntentPayloadError,
  InvalidVoucherHashError,
  MatchAlreadyForfeitedError,
  MatchAlreadyRefundedError,
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
} from "./EconomyRepository.js";
import { isStructurallyValidSeatConfiguration } from "../economy/economyCapacityContract.js";

/**
 * `EconomyRepository`, in memory.
 *
 * ── What this file is for ────────────────────────────────────────────────
 * The implementation the shared contract suite and every future
 * `EconomyService` unit test run against, and what `npm run dev` gets with
 * no Supabase project. It is NOT a durability story — everything here dies
 * with the process. It exists to make `SupabaseEconomyRepository`'s
 * behavior provable and swappable, per
 * `docs/economy/economy-v1-phase1-implementation-package.md` §1.
 *
 * ── Concurrency model — read this before touching lock keys ─────────────
 * This is a DETERMINISTIC SINGLE-PROCESS SIMULATION. It makes NO claim of
 * PostgreSQL row-lock parity — there is exactly one JS heap, one thread, and
 * no true parallelism to defend against. What genuinely matters here is
 * narrower and different: several public methods call ANOTHER public method
 * internally (`commitMatchEntry` calls `ensureWallet`; `settleMatchEconomy`
 * calls `ensureWallet` per credited member; `redeemRewardVoucher` calls
 * `ensureWallet` for the redeemer) — and each of those internal calls is a
 * real `await`, a real suspension point. Without per-key serialization, two
 * `Promise.all`-issued calls sharing a key COULD interleave at exactly that
 * point and both observe "not yet applied." `KeyedMutex` below exists
 * specifically to close that window — it is necessary because these methods
 * compose, not because this file is pretending to be Postgres.
 *
 * Lock-ordering discipline (deadlock-free by construction, not by luck):
 * match/voucher-scoped locks may acquire a wallet-scoped lock as a child;
 * a wallet-scoped lock's own critical section never acquires anything else.
 * Wallet locks are always leaves. No two top-level operations ever want
 * each other's lock in the opposite order.
 *
 * ── Atomicity ─────────────────────────────────────────────────────────────
 * `settleMatchEconomy` is the one method whose critical section can fail
 * partway through a multi-participant loop. It snapshots every structure it
 * might touch before the loop starts and restores all of them, verbatim, on
 * ANY thrown error — there is no ambient transaction to fall back on in
 * plain JS, so this is done explicitly. Every other mutating method is
 * wrapped the same way for defense in depth, even though their own
 * validation-before-mutation ordering makes a genuine partial write
 * essentially unreachable in practice.
 *
 * ── Defensive cloning ─────────────────────────────────────────────────────
 * Every record that crosses this class's public boundary — in or out — is
 * cloned with `structuredClone`, the same convention
 * `InMemoryProgressionRepository.ts` already uses. No caller can mutate this
 * store by holding onto a returned reference, and no caller-supplied object
 * is stored by reference either.
 */

/* ═══════════════════════════ Internal-only types ═════════════════════════
 * Not exported from EconomyRepository.ts (frozen, out of scope to modify) —
 * these mirror real Economy V1 tables that the public interface doesn't
 * expose a read method for (world_bank_ledger, match_economy_participants),
 * plus the per-settlement prize-schedule snapshot the real
 * `settle_match_economy` RPC consults instead of the LIVE schedule, which
 * `match_economy_settlements.prize_schedule_snapshot` stores and the public
 * `MatchEconomySettlementRecord` DTO does not surface. See "Contract
 * mismatches discovered" in this phase's completion report.
 */

type WorldBankAffectedBalance =
  | "base_fee_revenue"
  | "bot_prize_revenue"
  | "guest_escrow_liability"
  | "total_voucher_redeemed"
  | "abandonment_forfeiture_revenue";

type WorldBankLedgerEntryType =
  | "BASE_FEE_REVENUE"
  | "SOLO_ENTRY_COLLECTION"
  | "BOT_PRIZE_REVENUE"
  | "GUEST_ESCROW_DEPOSIT"
  | "GUEST_ESCROW_REDEMPTION"
  | "ADMIN_CORRECTION"
  | "ABANDONMENT_FORFEITURE";

interface WorldBankLedgerEntry {
  id: number;
  affectedBalance: WorldBankAffectedBalance;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  entryType: WorldBankLedgerEntryType;
  sourceKind: string;
  sourceId: string;
  idempotencyKey: string;
  description: string;
  createdAt: number;
}

type ParticipantPayoutStatus = "PAID_WALLET" | "ESCROWED_VOUCHER" | "BOT_TO_WORLD_BANK" | "NO_PRIZE";

interface MatchEconomyParticipantRecord {
  matchId: string;
  identityId: string;
  identityKind: ParticipantIdentityKind;
  placement: number;
  prizeCoins: string;
  payoutStatus: ParticipantPayoutStatus;
  voucherId: string | null;
  createdAt: number;
}

interface SettlementSnapshot {
  costPerSeat: string;
  schedule: EconomyPrizeScheduleRecord;
}

/** A deep, immutable-in-spirit view of every table this store owns — for test inspection only. */
export interface EconomyRepositorySnapshot {
  identities: Array<{ identityId: string; kind: PlayerIdentityKind }>;
  configuration: EconomyConfigurationRecord;
  prizeSchedules: EconomyPrizeScheduleRecord[];
  wallets: CoinWalletRecord[];
  walletLedger: CoinLedgerEntryRecord[];
  worldBank: WorldBankSnapshot;
  worldBankLedger: WorldBankLedgerEntry[];
  settlements: MatchEconomySettlementRecord[];
  participants: MatchEconomyParticipantRecord[];
  vouchers: RewardVoucherRecord[];
  settlementEvents: SettlementEventRecord[];
  idempotencyLog: Array<{ idempotencyKey: string; operation: string }>;
}

/** Test-only surface. Never reachable through a variable typed as plain `EconomyRepository`. */
export interface EconomyRepositoryTestFixture {
  seedIdentity(identityId: string, kind: PlayerIdentityKind): void;
  seedConfiguration(config: EconomyConfigurationRecord, schedules: EconomyPrizeScheduleRecord[]): void;
  removePrizeSchedule(seatCount: number): void;
  seedPrizeSchedule(schedule: EconomyPrizeScheduleRecord): void;
  /** Seeds the identity too, if not already known. Defaults fill any field the caller omits. */
  seedWallet(wallet: { identityId: string; identityKind: PlayerIdentityKind } & Partial<CoinWalletRecord>): CoinWalletRecord;
  setFrozen(identityId: string, isFrozen: boolean): void;
  snapshot(): EconomyRepositorySnapshot;
  reset(): void;
}

/* ═══════════════════════════ Small helpers ════════════════════════════════ */

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Deterministic semantic equality comparison for JSON-serializable payloads.
 * Matches PostgreSQL's `jsonb = jsonb` semantics:
 * - Primitives and nulls compared by value.
 * - Array elements compared element-by-element in order.
 * - Object properties compared by key-value regardless of property insertion order.
 * - Undefined properties are omitted / ignored (matching JSON/JSONB serialization).
 * - Zero `any` usage.
 */
function isSemanticJsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isSemanticJsonEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA).filter((k) => objA[k] !== undefined);
  const keysB = Object.keys(objB).filter((k) => objB[k] !== undefined);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, k)) return false;
    if (!isSemanticJsonEqual(objA[k], objB[k])) return false;
  }
  return true;
}

function toBig(amount: string): bigint {
  return BigInt(amount);
}

function fromBig(amount: bigint): string {
  return amount.toString();
}

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * A FIFO queue per key, not a true OS mutex — see the file header. Released
 * in a `finally`, so a throw inside `fn` never leaves the key permanently
 * locked. Different keys never wait on each other.
 */
class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const previousTail = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const myTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previousTail.then(() => myTail);
    this.tails.set(key, chained);

    await previousTail;
    try {
      return await fn();
    } finally {
      release();
      if (this.tails.get(key) === chained) {
        this.tails.delete(key);
      }
    }
  }
}

/* ═══════════════════════════ The implementation ═══════════════════════════ */

const DEFAULT_CONFIG: EconomyConfigurationRecord = {
  id: "active",
  version: 1,
  guestStarterCoins: "2000",
  memberStarterCoins: "5000",
  seatCostCoins: "100",
  isActive: true,
};

/**
 * Mirrors the migration's own seed data exactly — Section 10 of
 * `20260826000000_economy_v1.sql` for seat 1, and
 * `20260906000000_economy_prize_schedules_ranked_payout.sql` for seats 2-5
 * (6-12 were already on this exact 20%-platform / 50-30-20-ranked formula
 * from the earlier `20260905000000_economy_expand_prize_schedules_6_to_12.sql`
 * — seats 2-5 predate that formula and paid a flatter, non-conforming cut
 * until the 2026-09-05 product decision to standardize every seat count on
 * one rule: platform keeps 20%, the remaining 80% pays out top-3 ranked
 * 50/30/20 (top-2 ranked 62.5/37.5 at 3 seats, winner-take-all at 2 seats —
 * there is no 3rd/2nd place to pay at a 2- or 3-seat table).
 */
const DEFAULT_SCHEDULES: EconomyPrizeScheduleRecord[] = [
  { seatCount: 1, collectedCoins: "100", firstPlaceCoins: "0", secondPlaceCoins: "0", thirdPlaceCoins: "0", worldBankCoins: "100" },
  { seatCount: 2, collectedCoins: "200", firstPlaceCoins: "160", secondPlaceCoins: "0", thirdPlaceCoins: "0", worldBankCoins: "40" },
  { seatCount: 3, collectedCoins: "300", firstPlaceCoins: "150", secondPlaceCoins: "90", thirdPlaceCoins: "0", worldBankCoins: "60" },
  { seatCount: 4, collectedCoins: "400", firstPlaceCoins: "160", secondPlaceCoins: "96", thirdPlaceCoins: "64", worldBankCoins: "80" },
  { seatCount: 5, collectedCoins: "500", firstPlaceCoins: "200", secondPlaceCoins: "120", thirdPlaceCoins: "80", worldBankCoins: "100" },
  { seatCount: 6, collectedCoins: "600", firstPlaceCoins: "240", secondPlaceCoins: "144", thirdPlaceCoins: "96", worldBankCoins: "120" },
  { seatCount: 7, collectedCoins: "700", firstPlaceCoins: "280", secondPlaceCoins: "168", thirdPlaceCoins: "112", worldBankCoins: "140" },
  { seatCount: 8, collectedCoins: "800", firstPlaceCoins: "320", secondPlaceCoins: "192", thirdPlaceCoins: "128", worldBankCoins: "160" },
  { seatCount: 9, collectedCoins: "900", firstPlaceCoins: "360", secondPlaceCoins: "216", thirdPlaceCoins: "144", worldBankCoins: "180" },
  { seatCount: 10, collectedCoins: "1000", firstPlaceCoins: "400", secondPlaceCoins: "240", thirdPlaceCoins: "160", worldBankCoins: "200" },
  { seatCount: 11, collectedCoins: "1100", firstPlaceCoins: "440", secondPlaceCoins: "264", thirdPlaceCoins: "176", worldBankCoins: "220" },
  { seatCount: 12, collectedCoins: "1200", firstPlaceCoins: "480", secondPlaceCoins: "288", thirdPlaceCoins: "192", worldBankCoins: "240" },
];

export class InMemoryEconomyRepository implements EconomyRepository {
  readonly kind = "memory" as const;

  /** Not part of Economy V1's own schema — a minimal stand-in for the `player_identities` table this repository reads but does not own. Test-seeded only; see `ensureWallet`'s contract. */
  private identities = new Map<string, PlayerIdentityKind>();
  private configuration: EconomyConfigurationRecord = clone(DEFAULT_CONFIG);
  private prizeSchedules = new Map<number, EconomyPrizeScheduleRecord>();
  private wallets = new Map<string, CoinWalletRecord>();
  private walletLedger: CoinLedgerEntryRecord[] = [];
  private nextWalletLedgerId = 1;
  private worldBank: WorldBankSnapshot = {
    baseFeeRevenue: "0",
    botPrizeRevenue: "0",
    guestEscrowLiability: "0",
    totalVoucherRedeemed: "0",
    abandonmentForfeitureRevenue: "0",
  };
  private worldBankLedger: WorldBankLedgerEntry[] = [];
  private nextWorldBankLedgerId = 1;
  private settlements = new Map<string, MatchEconomySettlementRecord>();
  private settlementSnapshots = new Map<string, SettlementSnapshot>();
  private participants: MatchEconomyParticipantRecord[] = [];
  private vouchers = new Map<string, RewardVoucherRecord>();
  private voucherIdByCodeHash = new Map<string, string>();
  private settlementEvents: SettlementEventRecord[] = [];
  private nextSettlementEventId = 1;
  /** Diagnostic only — see the completion report's "Idempotency implementation" section. Applied/not-applied is always determined by row state, never by this map. */
  private idempotencyLog = new Map<string, string>();

  /* ── durable terminal intents (Blocker 06) ── */
  private terminalIntents = new Map<string, TerminalIntentRecord>();
  private terminalIntentIdByMatchId = new Map<string, string>();
  private nextTerminalIntentSeq = 1;

  private readonly mutex = new KeyedMutex();

  constructor() {
    for (const schedule of DEFAULT_SCHEDULES) {
      this.prizeSchedules.set(schedule.seatCount, clone(schedule));
    }
  }

  /* ── the test fixture — never reachable via a plain EconomyRepository-typed reference ── */

  get testFixture(): EconomyRepositoryTestFixture {
    return {
      seedIdentity: (identityId, kind) => this.identities.set(identityId, kind),
      seedConfiguration: (config, schedules) => {
        this.configuration = clone(config);
        this.prizeSchedules = new Map(schedules.map((s) => [s.seatCount, clone(s)]));
      },
      removePrizeSchedule: (seatCount) => {
        this.prizeSchedules.delete(seatCount);
      },
      seedPrizeSchedule: (schedule) => {
        this.prizeSchedules.set(schedule.seatCount, clone(schedule));
      },
      seedWallet: (wallet) => {
        this.identities.set(wallet.identityId, wallet.identityKind);
        const now = Date.now();
        const record: CoinWalletRecord = {
          identityId: wallet.identityId,
          identityKind: wallet.identityKind,
          balance: wallet.balance ?? "0",
          version: wallet.version ?? 0,
          lifetimeGranted: wallet.lifetimeGranted ?? "0",
          lifetimeEarned: wallet.lifetimeEarned ?? "0",
          lifetimeSpent: wallet.lifetimeSpent ?? "0",
          lifetimeRefunded: wallet.lifetimeRefunded ?? "0",
          starterGranted: wallet.starterGranted ?? false,
          isFrozen: wallet.isFrozen ?? false,
          updatedAt: wallet.updatedAt ?? now,
        };
        this.assertWalletReconciles(record);
        this.wallets.set(wallet.identityId, record);
        return clone(record);
      },
      setFrozen: (identityId, isFrozen) => {
        const wallet = this.wallets.get(identityId);
        if (!wallet) throw new WalletNotFoundError(`Cannot freeze ${identityId}: no wallet exists`);
        this.wallets.set(identityId, { ...wallet, isFrozen, updatedAt: Date.now() });
      },
      snapshot: () => ({
        identities: [...this.identities.entries()].map(([identityId, kind]) => ({ identityId, kind })),
        configuration: clone(this.configuration),
        prizeSchedules: [...this.prizeSchedules.values()].map(clone),
        wallets: [...this.wallets.values()].map(clone),
        walletLedger: this.walletLedger.map(clone),
        worldBank: clone(this.worldBank),
        worldBankLedger: this.worldBankLedger.map(clone),
        settlements: [...this.settlements.values()].map(clone),
        participants: this.participants.map(clone),
        vouchers: [...this.vouchers.values()].map(clone),
        settlementEvents: this.settlementEvents.map(clone),
        idempotencyLog: [...this.idempotencyLog.entries()].map(([idempotencyKey, operation]) => ({ idempotencyKey, operation })),
      }),
      reset: () => this.resetState(),
    };
  }

  private resetState(): void {
    this.identities = new Map();
    this.configuration = clone(DEFAULT_CONFIG);
    this.prizeSchedules = new Map(DEFAULT_SCHEDULES.map((s) => [s.seatCount, clone(s)]));
    this.wallets = new Map();
    this.walletLedger = [];
    this.nextWalletLedgerId = 1;
    this.worldBank = {
      baseFeeRevenue: "0",
      botPrizeRevenue: "0",
      guestEscrowLiability: "0",
      totalVoucherRedeemed: "0",
      abandonmentForfeitureRevenue: "0",
    };
    this.worldBankLedger = [];
    this.nextWorldBankLedgerId = 1;
    this.settlements = new Map();
    this.settlementSnapshots = new Map();
    this.participants = [];
    this.vouchers = new Map();
    this.voucherIdByCodeHash = new Map();
    this.settlementEvents = [];
    this.nextSettlementEventId = 1;
    this.idempotencyLog = new Map();
  }

  /* ═══════════════════════════ reads ═══════════════════════════════════ */

  async ping(): Promise<void> {
    // Always reachable — there is no external store to fail to reach.
  }

  async getWallet(identityId: string): Promise<CoinWalletRecord | null> {
    const wallet = this.wallets.get(identityId);
    return wallet ? clone(wallet) : null;
  }

  async listLedger(
    walletId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<CoinLedgerEntryRecord[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 20, 0), 100);
    const offset = Math.max(opts?.offset ?? 0, 0);
    const rows = this.walletLedger
      .filter((entry) => entry.walletId === walletId)
      .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)
      .slice(offset, offset + limit);
    return rows.map(clone);
  }

  async getSettlement(matchId: string): Promise<MatchEconomySettlementRecord | null> {
    const settlement = this.settlements.get(matchId);
    return settlement ? clone(settlement) : null;
  }

  async getWorldBankSnapshot(): Promise<WorldBankSnapshot> {
    return clone(this.worldBank);
  }

  async getVoucherStatus(codeHash: string): Promise<VoucherStatusView | null> {
    const voucherId = this.voucherIdByCodeHash.get(codeHash);
    if (!voucherId) return null;
    const voucher = this.vouchers.get(voucherId);
    if (!voucher) return null;
    return { status: voucher.status, coinAmount: voucher.coinAmount };
  }

  async getActiveConfiguration(): Promise<EconomyConfigurationRecord> {
    return clone(this.configuration);
  }

  async getPrizeSchedule(seatCount: number): Promise<EconomyPrizeScheduleRecord | null> {
    const schedule = this.prizeSchedules.get(seatCount);
    return schedule ? clone(schedule) : null;
  }

  async reconcileSettlement(matchId: string): Promise<SettlementReconciliation> {
    const settlement = this.settlements.get(matchId);
    if (!settlement) {
      throw new MatchNotFoundError(`No settlement exists for matchId ${matchId}`);
    }
    const disbursed =
      toBig(settlement.totalWalletRewarded) +
      toBig(settlement.totalGuestEscrow) +
      toBig(settlement.totalBotCollection) +
      toBig(settlement.totalWorldBankCut) +
      toBig(settlement.totalRefunded) +
      toBig(settlement.totalForfeited);
    const collected = toBig(settlement.totalCollected);
    const isBalanced =
      (settlement.status === "COMMITTED" && disbursed === 0n) ||
      (settlement.status !== "COMMITTED" && collected === disbursed);

    const details = {
      walletRewarded: settlement.totalWalletRewarded,
      guestEscrow: settlement.totalGuestEscrow,
      botCollection: settlement.totalBotCollection,
      worldBankCut: settlement.totalWorldBankCut,
      refunded: settlement.totalRefunded,
      forfeited: settlement.totalForfeited,
    };

    this.emitSettlementEvent(
      matchId,
      "RECONCILIATION_AUDITED",
      settlement.status,
      settlement.status,
      "reconcile_match_settlement",
      `reconcile:${matchId}`,
      true,
      false,
      false,
      "operator",
      null,
      "Settlement balance reconciliation audit executed",
      {
        isBalanced,
        collected: fromBig(collected),
        disbursed: fromBig(disbursed),
        delta: fromBig(collected - disbursed),
        details,
      },
    );

    return {
      matchId: settlement.matchId,
      status: settlement.status,
      isBalanced,
      collected: fromBig(collected),
      disbursed: fromBig(disbursed),
      delta: fromBig(collected - disbursed),
      details,
    };
  }

  async listStaleCommittedSettlements(olderThanMs: number): Promise<MatchEconomySettlementRecord[]> {
    const cutoff = Date.now() - olderThanMs;
    return [...this.settlements.values()]
      .filter((s) => s.status === "COMMITTED" && s.createdAt < cutoff)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(clone);
  }

  async listSettlementEvents(matchId: string): Promise<SettlementEventRecord[]> {
    return this.settlementEvents
      .filter((e) => e.matchId === matchId)
      .sort((a, b) => (a.sequenceNumber !== b.sequenceNumber ? a.sequenceNumber - b.sequenceNumber : a.id - b.id))
      .map(clone);
  }

  /* ═══════════════════════════ mutations ═══════════════════════════════ */

  async ensureWallet(identityId: string): Promise<CoinWalletRecord> {
    return this.mutex.runExclusive(`wallet:${identityId}`, () => this.ensureWalletLocked(identityId));
  }

  async grantStarterCoins(identityId: string): Promise<EconomyOperationResult<CoinWalletRecord>> {
    return this.mutex.runExclusive(`wallet:${identityId}`, () =>
      this.withRollback(() => this.grantStarterCoinsLocked(identityId)),
    );
  }

  async commitMatchEntry(
    input: CommitMatchEntryInput,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.mutex.runExclusive(`match:${input.matchId}`, () =>
      this.withRollback(() => this.commitMatchEntryLocked(input)),
    );
  }

  async settleMatchEconomy(
    input: SettleMatchEconomyInput,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.mutex.runExclusive(`match:${input.matchId}`, () =>
      this.withRollback(() => this.settleMatchEconomyLocked(input)),
    );
  }

  async refundMatchEntry(
    matchId: string,
    reason: string,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.mutex.runExclusive(`match:${matchId}`, () =>
      this.withRollback(() => this.refundMatchEntryLocked(matchId, reason)),
    );
  }

  async forfeitMatchEntry(
    matchId: string,
    reason: string,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    return this.mutex.runExclusive(`match:${matchId}`, () =>
      this.withRollback(() => this.forfeitMatchEntryLocked(matchId, reason)),
    );
  }

  async issueGuestVoucher(
    input: IssueGuestVoucherInput,
  ): Promise<EconomyOperationResult<RewardVoucherRecord>> {
    return this.mutex.runExclusive(`voucher:${input.voucherId}`, () =>
      this.withRollback(() => this.issueGuestVoucherLocked(input)),
    );
  }

  async redeemRewardVoucher(
    codeHash: string,
    memberIdentityId: string,
  ): Promise<EconomyOperationResult<RewardVoucherRecord>> {
    return this.mutex.runExclusive(`voucher-code:${codeHash}`, () =>
      this.withRollback(() => this.redeemRewardVoucherLocked(codeHash, memberIdentityId)),
    );
  }

  async adminAdjustWallet(
    input: AdminAdjustWalletInput,
  ): Promise<EconomyOperationResult<CoinWalletRecord>> {
    return this.mutex.runExclusive(`wallet:${input.identityId}`, () =>
      this.withRollback(() => this.adminAdjustWalletLocked(input)),
    );
  }

  async resolveIdentityId(query: string): Promise<string | null> {
    return query.trim();
  }

  /* ═══════════════════════════ locked implementations ═══════════════════
   * Everything below assumes its caller already holds the relevant mutex
   * key and runs entirely synchronously (no internal `await` other than the
   * one nested nested-mutex call `ensureWalletLocked` itself never makes —
   * it IS the leaf). Never call these directly from outside the `runExclusive`
   * wrappers above.
   */

  private ensureWalletLocked(identityId: string): CoinWalletRecord {
    if (!identityId || identityId.trim().length === 0) {
      throw new InvalidIdentityIdError("identity_id cannot be null or empty");
    }
    const kind = this.identities.get(identityId);
    if (!kind) {
      throw new IdentityNotFoundError(`Player identity ${identityId} is not registered`);
    }
    let wallet = this.wallets.get(identityId);
    if (!wallet) {
      const now = Date.now();
      wallet = {
        identityId,
        identityKind: kind,
        balance: "0",
        version: 0,
        lifetimeGranted: "0",
        lifetimeEarned: "0",
        lifetimeSpent: "0",
        lifetimeRefunded: "0",
        starterGranted: false,
        isFrozen: false,
        updatedAt: now,
      };
      this.wallets.set(identityId, wallet);
      this.grantStarterCoinsLocked(identityId);
      wallet = this.wallets.get(identityId)!;
    }
    return clone(wallet);
  }

  private grantStarterCoinsLocked(identityId: string): EconomyOperationResult<CoinWalletRecord> {
    const idempotencyKey = `starter-grant:${identityId}`;
    const wallet = this.wallets.get(identityId);
    if (!wallet) {
      throw new WalletNotFoundError(`Wallet for ${identityId} does not exist`);
    }
    if (wallet.starterGranted) {
      this.logIdempotency(idempotencyKey, "grant_starter_coins");
      return { applied: false, operation: "grant_starter_coins", idempotencyKey, result: clone(wallet) };
    }

    const grantAmount = toBig(
      wallet.identityKind === "guest" ? this.configuration.guestStarterCoins : this.configuration.memberStarterCoins,
    );
    const updated = this.creditWallet(wallet, grantAmount, {
      entryType: "STARTER_GRANT",
      sourceKind: "starter_grant",
      sourceId: identityId,
      idempotencyKey,
      description: `Authoritative starter grant (${wallet.identityKind})`,
      lifetimeField: "lifetimeGranted",
    });
    updated.starterGranted = true;
    this.wallets.set(identityId, updated);
    this.logIdempotency(idempotencyKey, "grant_starter_coins");
    return { applied: true, operation: "grant_starter_coins", idempotencyKey, result: clone(updated) };
  }

  private commitMatchEntryLocked(
    input: CommitMatchEntryInput,
  ): EconomyOperationResult<MatchEconomySettlementRecord> {
    const idempotencyKey = `match-entry:${input.matchId}`;
    const existing = this.settlements.get(input.matchId);
    if (existing) {
      this.emitSettlementEvent(
        input.matchId,
        "MATCH_COMMITMENT_REPLAYED",
        existing.status,
        existing.status,
        "commit_match_entry",
        idempotencyKey,
        false,
        true,
        false,
        "system",
        input.hostIdentityId,
        "Idempotent match commitment replay",
        {
          seatCount: existing.seatCount,
          totalCollected: existing.totalCollected,
        },
      );
      this.logIdempotency(idempotencyKey, "commit_match_entry");
      return { applied: false, operation: "commit_match_entry", idempotencyKey, result: clone(existing) };
    }

    // Bundled exactly as the real RPC bundles it: the structural-sanity
    // check and the human+bot arithmetic check share ONE error,
    // InvalidSeatConfigurationError — see "Contract mismatches
    // discovered". UnsupportedSeatCountError (below) is reserved for a
    // structurally-fine seat count with no matching schedule row — this
    // must never re-add a hardcoded upper bound of its own (economy V1's
    // approved seat counts live in ONE place, economyCapacityContract.ts,
    // precisely because a second hardcoded copy of that number here is
    // what caused the 2026-08-28 P0 incident).
    if (!isStructurallyValidSeatConfiguration(input.seatCount, input.humanSeatCount, input.botSeatCount)) {
      throw new InvalidSeatConfigurationError(
        "seat_count must be a positive integer matching human + bot counts",
      );
    }

    this.ensureWalletLocked(input.hostIdentityId);

    const schedule = this.prizeSchedules.get(input.seatCount);
    if (!schedule) {
      throw new UnsupportedSeatCountError(`No prize schedule for ${input.seatCount} seats`);
    }

    let totalCollectedAmount = 0n;
    if (input.participantDebits && input.participantDebits.length > 0) {
      // 1. Validation pass: every participant must exist, be unfrozen, and have sufficient balance
      for (const p of input.participantDebits) {
        this.ensureWalletLocked(p.identityId);
        const wallet = this.wallets.get(p.identityId);
        if (!wallet) {
          throw new WalletNotFoundError(`Wallet for ${p.identityId} does not exist`);
        }
        if (wallet.isFrozen) {
          throw new WalletFrozenError(`Player ${p.identityId} cannot commit a match entry while frozen`);
        }
        const cost = toBig(p.amountCoins);
        if (toBig(wallet.balance) < cost) {
          throw new InsufficientFundsError(
            `Player ${p.identityId} balance ${wallet.balance} is less than required commitment ${p.amountCoins}`,
          );
        }
        totalCollectedAmount += cost;
      }

      // 2. Execution pass: debit each participant's wallet
      for (const p of input.participantDebits) {
        const wallet = this.wallets.get(p.identityId)!;
        const cost = toBig(p.amountCoins);
        const entryType: WalletLedgerEntryType = input.isSolo
          ? "SOLO_ENTRY_DEBIT"
          : input.botSeatCount > 0 && input.humanSeatCount <= 1
            ? "BOT_ENTRY_DEBIT"
            : "ROOM_ENTRY_DEBIT";

        const debited = this.debitWallet(wallet, cost, {
          entryType,
          sourceKind: "match",
          sourceId: input.matchId,
          idempotencyKey: `${idempotencyKey}:debit:${p.identityId}`,
          description: `Match entry commitment: ${p.amountCoins} coins (${input.roomCode ?? "SOLO"})`,
          lifetimeField: "lifetimeSpent",
        });
        this.wallets.set(p.identityId, debited);
      }
    } else {
      const totalCost = toBig(input.seatCount.toString()) * toBig(this.configuration.seatCostCoins);
      const hostWallet = this.wallets.get(input.hostIdentityId)!;

      if (hostWallet.isFrozen) {
        throw new WalletFrozenError(`Host ${input.hostIdentityId} cannot commit a match entry while frozen`);
      }
      if (toBig(hostWallet.balance) < totalCost) {
        throw new InsufficientFundsError(
          `Host balance ${hostWallet.balance} is less than required commitment ${fromBig(totalCost)}`,
        );
      }

      const entryType: WalletLedgerEntryType = input.isSolo
        ? "SOLO_ENTRY_DEBIT"
        : input.botSeatCount > 0 && input.humanSeatCount <= 1
          ? "BOT_ENTRY_DEBIT"
          : "ROOM_ENTRY_DEBIT";

      const debited = this.debitWallet(hostWallet, totalCost, {
        entryType,
        sourceKind: "match",
        sourceId: input.matchId,
        idempotencyKey,
        description: `Match commitment: ${input.seatCount} seats (${input.roomCode ?? "SOLO"})`,
        lifetimeField: "lifetimeSpent",
      });
      this.wallets.set(input.hostIdentityId, debited);
      totalCollectedAmount = totalCost;
    }

    const now = Date.now();
    const settlement: MatchEconomySettlementRecord = {
      matchId: input.matchId,
      roomCode: input.roomCode ?? "SOLO",
      hostIdentityId: input.hostIdentityId,
      seatCount: input.seatCount,
      humanSeatCount: input.humanSeatCount,
      botSeatCount: input.botSeatCount,
      costPerSeat: this.configuration.seatCostCoins,
      totalCollected: fromBig(totalCollectedAmount),
      totalWalletRewarded: "0",
      totalGuestEscrow: "0",
      totalBotCollection: "0",
      totalWorldBankCut: "0",
      totalRefunded: "0",
      refundReason: null,
      participantDebits: input.participantDebits ? clone(input.participantDebits) : undefined,
      totalForfeited: "0",
      forfeitureReason: null,
      status: "COMMITTED",
      settledAt: null,
      createdAt: now,
    };
    this.settlements.set(input.matchId, settlement);
    this.settlementSnapshots.set(input.matchId, {
      costPerSeat: this.configuration.seatCostCoins,
      schedule: clone(schedule),
    });

    this.emitSettlementEvent(
      input.matchId,
      "MATCH_COMMITTED",
      null,
      "COMMITTED",
      "commit_match_entry",
      idempotencyKey,
      true,
      false,
      false,
      "system",
      input.hostIdentityId,
      null,
      {
        roomCode: input.roomCode ?? "SOLO",
        hostIdentityId: input.hostIdentityId,
        seatCount: input.seatCount,
        humanSeatCount: input.humanSeatCount,
        botSeatCount: input.botSeatCount,
        costPerSeat: this.configuration.seatCostCoins,
        totalCollected: fromBig(totalCollectedAmount),
        isSolo: input.isSolo,
      },
    );

    this.logIdempotency(idempotencyKey, "commit_match_entry");
    return { applied: true, operation: "commit_match_entry", idempotencyKey, result: clone(settlement) };
  }

  private settleMatchEconomyLocked(
    input: SettleMatchEconomyInput,
  ): EconomyOperationResult<MatchEconomySettlementRecord> {
    const idempotencyKey = `match-settlement:${input.matchId}`;
    const settlement = this.settlements.get(input.matchId);
    if (!settlement) {
      throw new MatchNotCommittedError(`Match settlement ${input.matchId} not found`);
    }
    if (settlement.status === "SETTLED" || settlement.status === "REFUNDED" || settlement.status === "ABANDONMENT_FORFEITED") {
      if (settlement.status === "SETTLED") {
        this.emitSettlementEvent(
          input.matchId,
          "MATCH_SETTLEMENT_REPLAYED",
          "SETTLED",
          "SETTLED",
          "settle_match_economy",
          idempotencyKey,
          false,
          true,
          false,
          "system",
          settlement.hostIdentityId,
          "Idempotent match settlement replay",
          {
            totalWalletRewarded: settlement.totalWalletRewarded,
            totalGuestEscrow: settlement.totalGuestEscrow,
            totalBotCollection: settlement.totalBotCollection,
            totalWorldBankCut: settlement.totalWorldBankCut,
          },
        );
      } else {
        this.emitSettlementEvent(
          input.matchId,
          "SETTLEMENT_RACE_LOST",
          settlement.status,
          settlement.status,
          "settle_match_economy",
          idempotencyKey,
          false,
          false,
          true,
          "system",
          settlement.hostIdentityId,
          `Settlement attempt arrived after match had already reached terminal state: ${settlement.status}`,
          {
            terminalStatus: settlement.status,
            totalCollected: settlement.totalCollected,
          },
        );
      }
      this.logIdempotency(idempotencyKey, "settle_match_economy");
      return { applied: false, operation: "settle_match_economy", idempotencyKey, result: clone(settlement) };
    }

    if (!input.isValidRanking) {
      return this.applyRefundLocked(
        settlement,
        idempotencyKey,
        input.refundReason ?? "Invalid or tied authoritative result",
      );
    }

    const snapshot = this.settlementSnapshots.get(input.matchId);
    const schedule = snapshot?.schedule ?? this.prizeSchedules.get(settlement.seatCount);
    if (!schedule) {
      // Unreachable via any path this repository itself creates — every
      // COMMITTED settlement always has a snapshot. Guarded defensively
      // rather than asserted with a non-null assertion.
      throw new UnsupportedSeatCountError(`No prize schedule snapshot for match ${input.matchId}`);
    }
    const isSolo = settlement.seatCount === 1;
    const prizeByPlacement = (placement: number): bigint => {
      if (placement === 1) return toBig(schedule.firstPlaceCoins);
      if (placement === 2) return toBig(schedule.secondPlaceCoins);
      if (placement === 3) return toBig(schedule.thirdPlaceCoins);
      return 0n;
    };

    let totalWalletRewarded = 0n;
    let totalGuestEscrow = 0n;
    let totalBotCollection = 0n;

    for (const participant of input.participants) {
      const prize = prizeByPlacement(participant.placement);

      if (participant.identityKind === "member") {
        if (prize > 0n) {
          this.ensureWalletLocked(participant.identityId);
          const wallet = this.wallets.get(participant.identityId)!;
          const credited = this.creditWallet(wallet, prize, {
            entryType: "MATCH_PRIZE_CREDIT",
            sourceKind: "match",
            sourceId: input.matchId,
            idempotencyKey: `${idempotencyKey}:credit:${participant.identityId}`,
            description: `Match placement ${participant.placement} prize`,
            lifetimeField: "lifetimeEarned",
          });
          this.wallets.set(participant.identityId, credited);
          totalWalletRewarded += prize;
          this.recordParticipant(input.matchId, participant, prize, "PAID_WALLET", null);
        } else {
          this.recordParticipant(input.matchId, participant, 0n, "NO_PRIZE", null);
        }
      } else if (participant.identityKind === "guest") {
        if (prize > 0n) {
          if (!participant.voucherCodeHash || !HEX64.test(participant.voucherCodeHash)) {
            throw new InvalidVoucherHashError(
              "Guest prize requires a 64-hex-character voucher code hash",
            );
          }
          if (this.voucherIdByCodeHash.has(participant.voucherCodeHash)) {
            throw new VoucherCodeCollisionError(
              "A voucher with this code hash already exists",
            );
          }
          const voucherId = this.generateVoucherId();
          const now = Date.now();
          const voucher: RewardVoucherRecord = {
            id: voucherId,
            codeHash: participant.voucherCodeHash,
            coinAmount: fromBig(prize),
            matchId: input.matchId,
            issuedToGuestId: participant.identityId,
            status: "ACTIVE",
            redeemedByMemberId: null,
            redeemedAt: null,
            createdAt: now,
          };
          this.vouchers.set(voucherId, voucher);
          this.voucherIdByCodeHash.set(participant.voucherCodeHash, voucherId);

          this.moveWorldBank("guestEscrowLiability", prize, {
            entryType: "GUEST_ESCROW_DEPOSIT",
            sourceKind: "match",
            sourceId: input.matchId,
            idempotencyKey: `${idempotencyKey}:escrow:${participant.identityId}`,
            description: "Guest match prize placed in bearer voucher escrow",
          });

          totalGuestEscrow += prize;
          this.recordParticipant(input.matchId, participant, prize, "ESCROWED_VOUCHER", voucherId);
        } else {
          this.recordParticipant(input.matchId, participant, 0n, "NO_PRIZE", null);
        }
      } else if (participant.identityKind === "bot") {
        if (prize > 0n) {
          this.moveWorldBank("botPrizeRevenue", prize, {
            entryType: "BOT_PRIZE_REVENUE",
            sourceKind: "match",
            sourceId: input.matchId,
            idempotencyKey: `${idempotencyKey}:bot:${participant.placement}`,
            description: `Bot placement ${participant.placement} prize collection`,
          });
          totalBotCollection += prize;
          this.recordParticipant(input.matchId, participant, prize, "BOT_TO_WORLD_BANK", null);
        } else {
          this.recordParticipant(input.matchId, participant, 0n, "NO_PRIZE", null);
        }
      } else {
        // Unreachable through the TypeScript-typed interface — reachable
        // only if a caller constructs this input from untyped/external
        // data. See EconomyRepository.ts's own note on this exact gap.
        throw new InvalidIdentityKindError(
          `Participant identityKind must be member, guest, or bot (got ${String(participant.identityKind)})`,
        );
      }
    }

    let totalWorldBankCut = 0n;
    const worldBankCut = toBig(schedule.worldBankCoins);
    if (worldBankCut > 0n) {
      this.moveWorldBank("baseFeeRevenue", worldBankCut, {
        entryType: isSolo ? "SOLO_ENTRY_COLLECTION" : "BASE_FEE_REVENUE",
        sourceKind: "match",
        sourceId: input.matchId,
        idempotencyKey: `${idempotencyKey}:world-bank`,
        description: isSolo ? "Solo session fee collection" : `Base room house cut (${settlement.seatCount} seats)`,
      });
      totalWorldBankCut = worldBankCut;
    }

    const disbursed = totalWalletRewarded + totalGuestEscrow + totalBotCollection + totalWorldBankCut;
    if (toBig(settlement.totalCollected) !== disbursed) {
      throw new SettlementConservationViolationError(
        `Collected ${settlement.totalCollected} does not equal disbursed ${fromBig(disbursed)}`,
      );
    }

    const now = Date.now();
    const updated: MatchEconomySettlementRecord = {
      ...settlement,
      totalWalletRewarded: fromBig(totalWalletRewarded),
      totalGuestEscrow: fromBig(totalGuestEscrow),
      totalBotCollection: fromBig(totalBotCollection),
      totalWorldBankCut: fromBig(totalWorldBankCut),
      status: "SETTLED",
      settledAt: now,
    };
    this.settlements.set(input.matchId, updated);

    this.emitSettlementEvent(
      input.matchId,
      "MATCH_SETTLED",
      "COMMITTED",
      "SETTLED",
      "settle_match_economy",
      idempotencyKey,
      true,
      false,
      false,
      "system",
      settlement.hostIdentityId,
      null,
      {
        totalWalletRewarded: fromBig(totalWalletRewarded),
        totalGuestEscrow: fromBig(totalGuestEscrow),
        totalBotCollection: fromBig(totalBotCollection),
        totalWorldBankCut: fromBig(totalWorldBankCut),
        totalCollected: settlement.totalCollected,
      },
    );

    this.logIdempotency(idempotencyKey, "settle_match_economy");
    return { applied: true, operation: "settle_match_economy", idempotencyKey, result: clone(updated) };
  }

  private refundMatchEntryLocked(
    matchId: string,
    reason: string,
  ): EconomyOperationResult<MatchEconomySettlementRecord> {
    const idempotencyKey = `match-refund:${matchId}`;
    const settlement = this.settlements.get(matchId);
    if (!settlement) {
      throw new MatchNotCommittedError(`Match settlement ${matchId} not found`);
    }
    if (settlement.status === "REFUNDED") {
      this.emitSettlementEvent(
        matchId,
        "MATCH_REFUND_REPLAYED",
        "REFUNDED",
        "REFUNDED",
        "refund_match_entry",
        idempotencyKey,
        false,
        true,
        false,
        "system",
        settlement.hostIdentityId,
        "Idempotent match refund replay",
        {
          totalRefunded: settlement.totalRefunded,
          refundReason: settlement.refundReason,
        },
      );
      this.logIdempotency(idempotencyKey, "refund_match_entry");
      return { applied: false, operation: "refund_match_entry", idempotencyKey, result: clone(settlement) };
    }
    if (settlement.status === "SETTLED") {
      throw new MatchAlreadySettledError(`Settled match ${matchId} cannot be refunded`);
    }
    if (settlement.status === "ABANDONMENT_FORFEITED") {
      throw new MatchAlreadyForfeitedError(`Forfeited match ${matchId} cannot be refunded`);
    }
    return this.applyRefundLocked(settlement, idempotencyKey, reason);
  }

  /**
   * Player-fault abandonment forfeiture — mirrors the migration's
   * `forfeit_match_entry` exactly: same terminal-status precedence as
   * `refundMatchEntryLocked` (self-replay is idempotent, either OTHER
   * terminal is a hard error), moves the entire `total_collected` pool to
   * `abandonmentForfeitureRevenue`, and never touches any wallet,
   * participant row, or voucher. Assumes the caller already holds the
   * `match:${matchId}` lock.
   */
  private forfeitMatchEntryLocked(
    matchId: string,
    reason: string,
  ): EconomyOperationResult<MatchEconomySettlementRecord> {
    const idempotencyKey = `match-forfeit:${matchId}`;
    const settlement = this.settlements.get(matchId);
    if (!settlement) {
      throw new MatchNotCommittedError(`Match settlement ${matchId} not found`);
    }
    if (settlement.status === "ABANDONMENT_FORFEITED") {
      this.emitSettlementEvent(
        matchId,
        "MATCH_FORFEITURE_REPLAYED",
        "ABANDONMENT_FORFEITED",
        "ABANDONMENT_FORFEITED",
        "forfeit_match_entry",
        idempotencyKey,
        false,
        true,
        false,
        "system",
        settlement.hostIdentityId,
        "Idempotent match forfeiture replay",
        {
          totalForfeited: settlement.totalForfeited,
          forfeitureReason: settlement.forfeitureReason,
        },
      );
      this.logIdempotency(idempotencyKey, "forfeit_match_entry");
      return { applied: false, operation: "forfeit_match_entry", idempotencyKey, result: clone(settlement) };
    }
    if (settlement.status === "SETTLED") {
      throw new MatchAlreadySettledError(`Settled match ${matchId} cannot be forfeited`);
    }
    if (settlement.status === "REFUNDED") {
      throw new MatchAlreadyRefundedError(`Refunded match ${matchId} cannot be forfeited`);
    }

    const forfeitAmount = toBig(settlement.totalCollected);
    this.moveWorldBank("abandonmentForfeitureRevenue", forfeitAmount, {
      entryType: "ABANDONMENT_FORFEITURE",
      sourceKind: "match",
      sourceId: matchId,
      idempotencyKey,
      description: `Match abandoned after commitment: ${reason}`,
    });

    const now = Date.now();
    const updated: MatchEconomySettlementRecord = {
      ...settlement,
      totalForfeited: fromBig(forfeitAmount),
      status: "ABANDONMENT_FORFEITED",
      forfeitureReason: reason,
      settledAt: now,
    };
    this.settlements.set(matchId, updated);

    this.emitSettlementEvent(
      matchId,
      "MATCH_FORFEITED",
      "COMMITTED",
      "ABANDONMENT_FORFEITED",
      "forfeit_match_entry",
      idempotencyKey,
      true,
      false,
      false,
      "system",
      settlement.hostIdentityId,
      reason,
      {
        totalForfeited: fromBig(forfeitAmount),
        hostIdentityId: settlement.hostIdentityId,
        forfeitureReason: reason,
      },
    );

    this.logIdempotency(idempotencyKey, "forfeit_match_entry");
    return { applied: true, operation: "forfeit_match_entry", idempotencyKey, result: clone(updated) };
  }

  /** Shared by `refundMatchEntry` and `settleMatchEconomy`'s invalid-ranking path — mirrors `economy_apply_refund` in the migration. Assumes the caller already holds the `match:${matchId}` lock. */
  private applyRefundLocked(
    settlement: MatchEconomySettlementRecord,
    idempotencyKey: string,
    reason: string,
  ): EconomyOperationResult<MatchEconomySettlementRecord> {
    const refundAmount = toBig(settlement.totalCollected);
    if (settlement.participantDebits && settlement.participantDebits.length > 0) {
      for (const p of settlement.participantDebits) {
        const wallet = this.wallets.get(p.identityId);
        if (wallet) {
          const cost = toBig(p.amountCoins);
          const credited = this.creditWallet(wallet, cost, {
            entryType: "MATCH_REFUND",
            sourceKind: "match",
            sourceId: settlement.matchId,
            idempotencyKey: `${idempotencyKey}:refund:${p.identityId}`,
            description: `Refund match commitment: ${reason}`,
            lifetimeField: "lifetimeRefunded",
          });
          this.wallets.set(p.identityId, credited);
        }
      }
    } else {
      const hostWallet = this.wallets.get(settlement.hostIdentityId);
      if (!hostWallet) {
        throw new WalletNotFoundError(`Host wallet ${settlement.hostIdentityId} does not exist`);
      }
      const credited = this.creditWallet(hostWallet, refundAmount, {
        entryType: "MATCH_REFUND",
        sourceKind: "match",
        sourceId: settlement.matchId,
        idempotencyKey,
        description: `Refund match commitment: ${reason}`,
        lifetimeField: "lifetimeRefunded",
      });
      this.wallets.set(settlement.hostIdentityId, credited);
    }

    const now = Date.now();
    const updated: MatchEconomySettlementRecord = {
      ...settlement,
      totalRefunded: fromBig(refundAmount),
      status: "REFUNDED",
      refundReason: reason,
      settledAt: now,
    };
    this.settlements.set(settlement.matchId, updated);

    this.emitSettlementEvent(
      settlement.matchId,
      "MATCH_REFUNDED",
      settlement.status,
      "REFUNDED",
      "economy_apply_refund",
      idempotencyKey,
      true,
      false,
      false,
      "system",
      settlement.hostIdentityId,
      reason,
      {
        totalRefunded: fromBig(refundAmount),
        hostIdentityId: settlement.hostIdentityId,
      },
    );

    this.logIdempotency(idempotencyKey, "refund_match_entry");
    return { applied: true, operation: "refund_match_entry", idempotencyKey, result: clone(updated) };
  }

  private issueGuestVoucherLocked(
    input: IssueGuestVoucherInput,
  ): EconomyOperationResult<RewardVoucherRecord> {
    const idempotencyKey = `voucher-issue:${input.voucherId}`;
    if (!HEX64.test(input.codeHash)) {
      throw new InvalidVoucherHashError("Code hash must be exactly 64 hex characters");
    }
    if (toBig(input.coinAmount) <= 0n) {
      throw new InvalidVoucherHashError("Voucher coin amount must be greater than zero");
    }

    const existing = this.vouchers.get(input.voucherId);
    if (existing) {
      this.logIdempotency(idempotencyKey, "issue_guest_voucher");
      return { applied: false, operation: "issue_guest_voucher", idempotencyKey, result: clone(existing) };
    }

    if (this.voucherIdByCodeHash.has(input.codeHash)) {
      throw new VoucherCodeCollisionError("A voucher with this code hash already exists");
    }
    if (!this.identities.has(input.issuedToGuestId)) {
      throw new IdentityNotFoundError(`Player identity ${input.issuedToGuestId} is not registered`);
    }

    const now = Date.now();
    const voucher: RewardVoucherRecord = {
      id: input.voucherId,
      codeHash: input.codeHash,
      coinAmount: input.coinAmount,
      matchId: input.matchId,
      issuedToGuestId: input.issuedToGuestId,
      status: "ACTIVE",
      redeemedByMemberId: null,
      redeemedAt: null,
      createdAt: now,
    };
    this.vouchers.set(input.voucherId, voucher);
    this.voucherIdByCodeHash.set(input.codeHash, input.voucherId);

    this.logIdempotency(idempotencyKey, "issue_guest_voucher");
    return { applied: true, operation: "issue_guest_voucher", idempotencyKey, result: clone(voucher) };
  }

  private redeemRewardVoucherLocked(
    codeHash: string,
    memberIdentityId: string,
  ): EconomyOperationResult<RewardVoucherRecord> {
    // Real RPC note: redeem_reward_voucher raises `VOUCHER_INVALID` for a
    // malformed hash while issue_guest_voucher/settle_match_economy raise
    // `INVALID_VOUCHER_HASH` for the same shape failure — this repository
    // deliberately normalizes both to InvalidVoucherHashError. See
    // "Contract mismatches discovered".
    if (!HEX64.test(codeHash)) {
      throw new InvalidVoucherHashError("Malformed code hash");
    }

    const kind = this.identities.get(memberIdentityId);
    if (kind !== "member") {
      // Checked BEFORE voucher lookup, deliberately — never discloses
      // whether codeHash exists to a non-member caller.
      throw new OnlyMembersCanRedeemError(
        `Identity ${memberIdentityId} is not a registered member`,
      );
    }

    const voucherId = this.voucherIdByCodeHash.get(codeHash);
    const voucher = voucherId ? this.vouchers.get(voucherId) : undefined;
    if (!voucher) {
      throw new VoucherNotFoundError("No active voucher matches this code hash");
    }

    const idempotencyKey = `voucher-redeem:${voucher.id}:${memberIdentityId}`;
    if (voucher.status === "REDEEMED") {
      if (voucher.redeemedByMemberId === memberIdentityId) {
        this.logIdempotency(idempotencyKey, "redeem_reward_voucher");
        return { applied: false, operation: "redeem_reward_voucher", idempotencyKey, result: clone(voucher) };
      }
      throw new VoucherAlreadyRedeemedError("Voucher has already been claimed by another member");
    }
    if (voucher.status !== "ACTIVE") {
      throw new VoucherNotActiveError(`Voucher status is ${voucher.status}`);
    }

    this.ensureWalletLocked(memberIdentityId);
    const memberWallet = this.wallets.get(memberIdentityId)!;
    if (memberWallet.isFrozen) {
      throw new WalletFrozenError(`Member ${memberIdentityId} cannot redeem a voucher while frozen`);
    }

    const amount = toBig(voucher.coinAmount);
    const credited = this.creditWallet(memberWallet, amount, {
      entryType: "VOUCHER_REDEMPTION",
      sourceKind: "voucher",
      sourceId: voucher.id,
      idempotencyKey,
      description: `Redeemed guest reward voucher (${voucher.id})`,
      lifetimeField: "lifetimeEarned",
    });
    this.wallets.set(memberIdentityId, credited);

    this.moveWorldBank("guestEscrowLiability", -amount, {
      entryType: "GUEST_ESCROW_REDEMPTION",
      sourceKind: "voucher",
      sourceId: voucher.id,
      idempotencyKey: `${idempotencyKey}:escrow`,
      description: "Escrow liability released on redemption",
    });
    this.worldBank.totalVoucherRedeemed = fromBig(toBig(this.worldBank.totalVoucherRedeemed) + amount);

    const now = Date.now();
    const updatedVoucher: RewardVoucherRecord = {
      ...voucher,
      status: "REDEEMED",
      redeemedByMemberId: memberIdentityId,
      redeemedAt: now,
    };
    this.vouchers.set(voucher.id, updatedVoucher);

    this.logIdempotency(idempotencyKey, "redeem_reward_voucher");
    return { applied: true, operation: "redeem_reward_voucher", idempotencyKey, result: clone(updatedVoucher) };
  }

  private adminAdjustWalletLocked(
    input: AdminAdjustWalletInput,
  ): EconomyOperationResult<CoinWalletRecord> {
    if (!input.identityId || input.identityId.trim().length === 0) {
      throw new InvalidIdentityIdError(input.identityId);
    }
    const amountBn = toBig(input.amountCoins);
    if (amountBn <= 0n) {
      throw new Error("INVALID_AMOUNT: top-up amount must be strictly greater than 0");
    }

    this.ensureWalletLocked(input.identityId);

    const existing = this.idempotencyLog.get(input.idempotencyKey);
    if (existing) {
      const wallet = this.wallets.get(input.identityId)!;
      return {
        applied: false,
        operation: "admin_adjust_wallet",
        idempotencyKey: input.idempotencyKey,
        result: clone(wallet),
      };
    }

    const wallet = this.wallets.get(input.identityId)!;
    if (wallet.isFrozen) {
      throw new WalletFrozenError(`Wallet for ${input.identityId} is frozen`);
    }

    const updated = this.creditWallet(wallet, amountBn, {
      entryType: "ADMIN_ADJUSTMENT",
      sourceKind: "admin",
      sourceId: input.adminPrincipalId,
      idempotencyKey: input.idempotencyKey,
      description: input.reason || "Admin manual top-up",
      lifetimeField: "lifetimeGranted",
    });

    this.wallets.set(input.identityId, updated);
    this.logIdempotency(input.idempotencyKey, "admin_adjust_wallet");
    return {
      applied: true,
      operation: "admin_adjust_wallet",
      idempotencyKey: input.idempotencyKey,
      result: clone(updated),
    };
  }

  /* ═══════════════════════════ shared mutation primitives ═══════════════ */

  private creditWallet(
    wallet: CoinWalletRecord,
    amount: bigint,
    ledger: {
      entryType: WalletLedgerEntryType;
      sourceKind: string;
      sourceId: string;
      idempotencyKey: string;
      description: string;
      lifetimeField: "lifetimeGranted" | "lifetimeEarned" | "lifetimeRefunded";
    },
  ): CoinWalletRecord {
    const balanceBefore = toBig(wallet.balance);
    const balanceAfter = balanceBefore + amount;
    const versionBefore = wallet.version;
    const updated: CoinWalletRecord = {
      ...wallet,
      balance: fromBig(balanceAfter),
      version: versionBefore + 1,
      [ledger.lifetimeField]: fromBig(toBig(wallet[ledger.lifetimeField]) + amount),
      updatedAt: Date.now(),
    };
    this.assertWalletReconciles(updated);
    this.appendWalletLedger(wallet.identityId, amount, balanceBefore, balanceAfter, versionBefore, ledger);
    return updated;
  }

  private debitWallet(
    wallet: CoinWalletRecord,
    amount: bigint,
    ledger: {
      entryType: WalletLedgerEntryType;
      sourceKind: string;
      sourceId: string;
      idempotencyKey: string;
      description: string;
      lifetimeField: "lifetimeSpent";
    },
  ): CoinWalletRecord {
    const balanceBefore = toBig(wallet.balance);
    const balanceAfter = balanceBefore - amount;
    if (balanceAfter < 0n) {
      // Defensive — INSUFFICIENT_FUNDS should already have prevented this.
      throw new InsufficientFundsError(`Debit of ${fromBig(amount)} would take ${wallet.identityId} negative`);
    }
    const versionBefore = wallet.version;
    const updated: CoinWalletRecord = {
      ...wallet,
      balance: fromBig(balanceAfter),
      version: versionBefore + 1,
      lifetimeSpent: fromBig(toBig(wallet.lifetimeSpent) + amount),
      updatedAt: Date.now(),
    };
    this.assertWalletReconciles(updated);
    this.appendWalletLedger(wallet.identityId, -amount, balanceBefore, balanceAfter, versionBefore, ledger);
    return updated;
  }

  private appendWalletLedger(
    walletId: string,
    amount: bigint,
    balanceBefore: bigint,
    balanceAfter: bigint,
    versionBefore: number,
    meta: { entryType: WalletLedgerEntryType; sourceKind: string; sourceId: string; idempotencyKey: string; description: string },
  ): void {
    const entry: CoinLedgerEntryRecord = {
      id: this.nextWalletLedgerId++,
      walletId,
      amount: fromBig(amount),
      balanceBefore: fromBig(balanceBefore),
      balanceAfter: fromBig(balanceAfter),
      walletVersionBefore: versionBefore,
      walletVersionAfter: versionBefore + 1,
      entryType: meta.entryType,
      sourceKind: meta.sourceKind,
      sourceId: meta.sourceId,
      idempotencyKey: meta.idempotencyKey,
      description: meta.description,
      createdAt: Date.now(),
    };
    this.walletLedger.push(entry);
  }

  private moveWorldBank(
    balance: keyof WorldBankSnapshot,
    amount: bigint,
    meta: { entryType: WorldBankLedgerEntryType; sourceKind: string; sourceId: string; idempotencyKey: string; description: string },
  ): void {
    const before = toBig(this.worldBank[balance]);
    const after = before + amount;
    this.worldBank[balance] = fromBig(after);
    const affected: WorldBankAffectedBalance =
      balance === "baseFeeRevenue"
        ? "base_fee_revenue"
        : balance === "botPrizeRevenue"
          ? "bot_prize_revenue"
          : balance === "guestEscrowLiability"
            ? "guest_escrow_liability"
            : balance === "abandonmentForfeitureRevenue"
              ? "abandonment_forfeiture_revenue"
              : "total_voucher_redeemed";
    this.worldBankLedger.push({
      id: this.nextWorldBankLedgerId++,
      affectedBalance: affected,
      amount: fromBig(amount),
      balanceBefore: fromBig(before),
      balanceAfter: fromBig(after),
      entryType: meta.entryType,
      sourceKind: meta.sourceKind,
      sourceId: meta.sourceId,
      idempotencyKey: meta.idempotencyKey,
      description: meta.description,
      createdAt: Date.now(),
    });
  }

  private recordParticipant(
    matchId: string,
    participant: SettlementParticipantInput,
    prize: bigint,
    payoutStatus: ParticipantPayoutStatus,
    voucherId: string | null,
  ): void {
    this.participants.push({
      matchId,
      identityId: participant.identityId,
      identityKind: participant.identityKind,
      placement: participant.placement,
      prizeCoins: fromBig(prize),
      payoutStatus,
      voucherId,
      createdAt: Date.now(),
    });
  }

  private generateVoucherId(): string {
    return `vch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${(this.nextWorldBankLedgerId++).toString(36)}`;
  }

  private emitSettlementEvent(
    matchId: string,
    eventType: SettlementEventType,
    previousStatus: MatchSettlementStatus | null,
    currentStatus: MatchSettlementStatus,
    operation: string,
    idempotencyKey: string,
    applied: boolean,
    isReplay: boolean,
    raceLost: boolean,
    initiatorKind: SettlementInitiatorKind = "system",
    initiatorId: string | null = null,
    reason: string | null = null,
    payload: Record<string, unknown> = {},
  ): SettlementEventRecord {
    const existingCount = this.settlementEvents.filter((e) => e.matchId === matchId).length;
    const sequenceNumber = existingCount + 1;
    const event: SettlementEventRecord = {
      id: this.nextSettlementEventId++,
      matchId,
      sequenceNumber,
      eventType,
      previousStatus,
      currentStatus,
      operation,
      idempotencyKey,
      applied,
      isReplay,
      raceLost,
      initiatorKind,
      initiatorId,
      reason,
      payload: clone(payload),
      createdAt: Date.now(),
    };
    this.settlementEvents.push(event);
    return clone(event);
  }

  private logIdempotency(idempotencyKey: string, operation: string): void {
    if (!this.idempotencyLog.has(idempotencyKey)) {
      this.idempotencyLog.set(idempotencyKey, operation);
    }
  }

  private assertWalletReconciles(wallet: CoinWalletRecord): void {
    const computed =
      toBig(wallet.lifetimeGranted) + toBig(wallet.lifetimeEarned) + toBig(wallet.lifetimeRefunded) - toBig(wallet.lifetimeSpent);
    if (computed !== toBig(wallet.balance) || toBig(wallet.balance) < 0n) {
      throw new InsufficientFundsError(
        `Internal invariant violated for wallet ${wallet.identityId}: balance ${wallet.balance} does not reconcile`,
      );
    }
  }

  /* ═══════════════════════════ atomic rollback ═══════════════════════════
   * Snapshots every structure a mutating method could touch, runs it, and
   * restores all of them verbatim on ANY thrown error before re-throwing —
   * a manual stand-in for a database transaction, since plain JS has none.
   * Cheap: every snapshot is a shallow copy of a Map/array reference or a
   * spread of the single WorldBankSnapshot object, never a deep clone —
   * safe ONLY because every stored record is replaced wholesale on mutation,
   * never mutated in place. See the file header.
   */
  private withRollback<T>(fn: () => T): T {
    const wallets = new Map(this.wallets);
    const walletLedgerLength = this.walletLedger.length;
    const worldBank = { ...this.worldBank };
    const worldBankLedgerLength = this.worldBankLedger.length;
    const settlements = new Map(this.settlements);
    const settlementSnapshots = new Map(this.settlementSnapshots);
    const participantsLength = this.participants.length;
    const vouchers = new Map(this.vouchers);
    const voucherIdByCodeHash = new Map(this.voucherIdByCodeHash);
    const identities = new Map(this.identities);
    const settlementEventsLength = this.settlementEvents.length;

    try {
      return fn();
    } catch (err) {
      this.wallets = wallets;
      this.walletLedger.length = walletLedgerLength;
      this.worldBank = worldBank;
      this.worldBankLedger.length = worldBankLedgerLength;
      this.settlements = settlements;
      this.settlementSnapshots = settlementSnapshots;
      this.participants.length = participantsLength;
      this.vouchers = vouchers;
      this.voucherIdByCodeHash = voucherIdByCodeHash;
      this.identities = identities;
      this.settlementEvents.length = settlementEventsLength;
      throw err;
    }
  }

  /* ═══════════════════════ durable terminal intents (Blocker 06) ═════════
   * Mirrors `20260901000000_economy_terminal_intents.sql`'s RPCs field for
   * field — see that migration's own comments for the reasoning behind each
   * guard. "NOT a durability story" (this file's own header) applies here
   * as much as anywhere else: this proves the CLAIM/LEASE/REPLAY LOGIC is
   * correct, never that a real OS process crash is survived — only a real
   * Postgres-backed run can prove that (see `SupabaseEconomyRepository`'s
   * own implementation and the Blocker 06 verification report).
   *
   * Every stored record is replaced wholesale on mutation (this file's own
   * stated convention — see `withRollback`'s comment above), never mutated
   * in place, so a `TerminalIntentRecord` reference a caller is still
   * holding never changes out from under it.
   */

  private mintTerminalIntentId(): string {
    return `intent_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${(this.nextTerminalIntentSeq++).toString(36)}`;
  }

  async createTerminalIntent(input: CreateTerminalIntentInput): Promise<CreateTerminalIntentResult> {
    if (!input.matchId || input.matchId.trim().length === 0) {
      throw new InvalidTerminalIntentPayloadError("matchId must not be empty");
    }
    if (input.operationKind !== "SETTLEMENT" && input.operationKind !== "REFUND" && input.operationKind !== "FORFEITURE") {
      throw new InvalidTerminalIntentPayloadError(`operationKind must be SETTLEMENT, REFUND, or FORFEITURE (got ${String(input.operationKind)})`);
    }
    if (!input.payload || typeof input.payload !== "object" || input.payload.operationKind !== input.operationKind) {
      throw new InvalidTerminalIntentPayloadError("payload must be a non-null object whose operationKind matches the requested operationKind");
    }
    if (!input.payload.matchId || input.payload.matchId !== input.matchId) {
      throw new InvalidTerminalIntentPayloadError("payload.matchId must match the requested matchId");
    }
    if (input.payloadVersion !== undefined && input.payloadVersion < 1) {
      throw new InvalidTerminalIntentPayloadError("payloadVersion must be at least 1");
    }

    return this.mutex.runExclusive(`terminal-intent:${input.matchId}`, () => {
      const existingId = this.terminalIntentIdByMatchId.get(input.matchId);
      if (existingId) {
        const existing = this.terminalIntents.get(existingId)!;
        const requestedVersion = input.payloadVersion ?? 1;
        const isIdentical =
          existing.operationKind === input.operationKind &&
          existing.payloadVersion === requestedVersion &&
          isSemanticJsonEqual(existing.payload, input.payload);

        if (isIdentical) {
          return { created: false, conflict: false, intent: clone(existing) };
        }
        return { created: false, conflict: true, intent: clone(existing) };
      }

      const now = Date.now();
      const id = this.mintTerminalIntentId();
      const intent: TerminalIntentRecord = {
        id,
        matchId: input.matchId,
        operationKind: input.operationKind,
        payloadVersion: input.payloadVersion ?? 1,
        payload: clone(input.payload),
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: now,
        claimOwner: null,
        claimedAt: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        lastErrorCategory: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      this.terminalIntents.set(id, intent);
      this.terminalIntentIdByMatchId.set(input.matchId, id);
      return { created: true, conflict: false, intent: clone(intent) };
    });
  }

  async claimTerminalIntent(workerId: string, leaseSeconds = 30): Promise<ClaimTerminalIntentResult> {
    if (!workerId || workerId.trim().length === 0) {
      throw new InvalidTerminalIntentPayloadError("workerId must not be empty");
    }
    // Synchronous body, no `await` between the eligibility scan and the
    // claim mutation — Node never preempts synchronous code, so this is
    // atomic under concurrent `Promise.all` callers without needing the
    // mutex at all (unlike `createTerminalIntent`, which spans no async gap
    // either, but is wrapped in the mutex anyway for the SAME defense-in-
    // depth reasoning every other mutation in this file already applies).
    return this.mutex.runExclusive("terminal-intent-claim", () => {
      const now = Date.now();
      const eligible = [...this.terminalIntents.values()]
        .filter(
          (i) =>
            i.status === "PENDING" ||
            (i.status === "RETRYABLE" && i.nextAttemptAt <= now) ||
            (i.status === "PROCESSING" && i.leaseExpiresAt !== null && i.leaseExpiresAt <= now),
        )
        .sort((a, b) => a.createdAt - b.createdAt);

      const target = eligible[0];
      if (!target) return { claimed: false, intent: null };

      const claimed: TerminalIntentRecord = {
        ...target,
        status: "PROCESSING",
        claimOwner: workerId,
        claimedAt: now,
        leaseExpiresAt: now + leaseSeconds * 1000,
        attemptCount: target.attemptCount + 1,
        lastErrorCode: null,
        lastErrorCategory: null,
        updatedAt: now,
      };
      this.terminalIntents.set(target.id, claimed);
      return { claimed: true, intent: clone(claimed) };
    });
  }

  async completeTerminalIntent(intentId: string, workerId: string): Promise<IntentUpdateResult> {
    const existing = this.terminalIntents.get(intentId);
    if (!existing) throw new TerminalIntentNotFoundError(`Terminal intent ${intentId} does not exist`);
    if (existing.status === "COMPLETED") {
      return { updated: false, intent: clone(existing) };
    }
    const now = Date.now();
    const updated: TerminalIntentRecord = {
      ...existing,
      status: "COMPLETED",
      claimOwner: workerId,
      completedAt: now,
      leaseExpiresAt: null,
      updatedAt: now,
    };
    this.terminalIntents.set(intentId, updated);
    return { updated: true, intent: clone(updated) };
  }

  async markTerminalIntentRetryable(input: MarkIntentRetryableInput): Promise<IntentUpdateResult> {
    const existing = this.terminalIntents.get(input.intentId);
    if (!existing) throw new TerminalIntentNotFoundError(`Terminal intent ${input.intentId} does not exist`);
    if (existing.status === "COMPLETED") {
      return { updated: false, intent: clone(existing) };
    }
    const updated: TerminalIntentRecord = {
      ...existing,
      status: "RETRYABLE",
      claimOwner: null,
      claimedAt: null,
      leaseExpiresAt: null,
      nextAttemptAt: input.nextAttemptAt,
      lastErrorCode: input.errorCode,
      lastErrorCategory: input.errorCategory,
      updatedAt: Date.now(),
    };
    this.terminalIntents.set(input.intentId, updated);
    return { updated: true, intent: clone(updated) };
  }

  async markTerminalIntentFailed(input: MarkIntentFailedInput): Promise<IntentUpdateResult> {
    const existing = this.terminalIntents.get(input.intentId);
    if (!existing) throw new TerminalIntentNotFoundError(`Terminal intent ${input.intentId} does not exist`);
    if (existing.status === "COMPLETED") {
      return { updated: false, intent: clone(existing) };
    }
    const updated: TerminalIntentRecord = {
      ...existing,
      status: "FAILED",
      claimOwner: null,
      claimedAt: null,
      leaseExpiresAt: null,
      lastErrorCode: input.errorCode,
      lastErrorCategory: input.errorCategory,
      updatedAt: Date.now(),
    };
    this.terminalIntents.set(input.intentId, updated);
    return { updated: true, intent: clone(updated) };
  }

  async listTerminalIntents(opts: ListTerminalIntentsOptions = {}): Promise<TerminalIntentRecord[]> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const offset = Math.max(opts.offset ?? 0, 0);
    const all = [...this.terminalIntents.values()]
      .filter((i) => !opts.status || i.status === opts.status)
      .sort((a, b) => b.createdAt - a.createdAt);
    return all.slice(offset, offset + limit).map(clone);
  }

  async getTerminalIntent(intentId: string): Promise<TerminalIntentRecord | null> {
    const existing = this.terminalIntents.get(intentId);
    return existing ? clone(existing) : null;
  }

  async retryTerminalIntent(intentId: string, operatorId: string, reason?: string): Promise<IntentUpdateResult> {
    if (!operatorId || operatorId.trim().length === 0) {
      throw new InvalidTerminalIntentPayloadError("operatorId is required for an audited retry");
    }
    const existing = this.terminalIntents.get(intentId);
    if (!existing) throw new TerminalIntentNotFoundError(`Terminal intent ${intentId} does not exist`);
    if (existing.status !== "FAILED") {
      throw new InvalidIntentStateTransitionError(
        `Only a FAILED intent may be retried (current status ${existing.status})`,
      );
    }
    const now = Date.now();
    const updated: TerminalIntentRecord = {
      ...existing,
      status: "PENDING",
      nextAttemptAt: now,
      lastErrorCode: null,
      lastErrorCategory: null,
      updatedAt: now,
    };
    this.terminalIntents.set(intentId, updated);
    this.emitSettlementEvent(
      existing.matchId,
      "STALE_SETTLEMENT_DETECTED",
      this.settlements.get(existing.matchId)?.status ?? null,
      this.settlements.get(existing.matchId)?.status ?? "COMMITTED",
      "retryTerminalIntent",
      `terminal-intent-retry:${existing.id}`,
      true,
      false,
      false,
      "operator",
      operatorId,
      reason ?? "Operator-initiated retry of a failed terminal intent",
      { intentId: existing.id, operationKind: existing.operationKind },
    );
    return { updated: true, intent: clone(updated) };
  }

  async requeueExpiredTerminalIntentClaim(
    intentId: string,
    operatorId: string,
    force = false,
  ): Promise<IntentUpdateResult> {
    if (!operatorId || operatorId.trim().length === 0) {
      throw new InvalidTerminalIntentPayloadError("operatorId is required for an audited requeue");
    }
    const existing = this.terminalIntents.get(intentId);
    if (!existing) throw new TerminalIntentNotFoundError(`Terminal intent ${intentId} does not exist`);
    if (existing.status !== "PROCESSING") {
      throw new InvalidIntentStateTransitionError(
        `Only a PROCESSING intent may be requeued (current status ${existing.status})`,
      );
    }
    if (!force && existing.leaseExpiresAt !== null && existing.leaseExpiresAt > Date.now()) {
      throw new IntentLeaseStillActiveError(
        `Intent ${intentId} lease does not expire until ${new Date(existing.leaseExpiresAt).toISOString()} (pass force to override)`,
      );
    }
    const now = Date.now();
    const updated: TerminalIntentRecord = {
      ...existing,
      status: "PENDING",
      claimOwner: null,
      claimedAt: null,
      leaseExpiresAt: null,
      nextAttemptAt: now,
      updatedAt: now,
    };
    this.terminalIntents.set(intentId, updated);
    return { updated: true, intent: clone(updated) };
  }
}
