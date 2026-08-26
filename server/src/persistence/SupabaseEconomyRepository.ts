import { PostgrestClient, PostgrestError, type PostgrestConfig } from "./postgrest.js";
import {
  EconomyInfrastructureError,
  IdentityNotFoundError,
  InsufficientFundsError,
  InvalidIdentityIdError,
  InvalidIdentityKindError,
  InvalidSeatConfigurationError,
  InvalidVoucherHashError,
  MatchAlreadySettledError,
  MatchNotCommittedError,
  MatchNotFoundError,
  OnlyMembersCanRedeemError,
  SettlementConservationViolationError,
  UnsupportedSeatCountError,
  VoucherAlreadyRedeemedError,
  VoucherCodeCollisionError,
  VoucherNotActiveError,
  VoucherNotFoundError,
  WalletFrozenError,
  WalletNotFoundError,
  type CoinLedgerEntryRecord,
  type CoinWalletRecord,
  type CommitMatchEntryInput,
  type EconomyConfigurationRecord,
  type EconomyOperationResult,
  type EconomyPrizeScheduleRecord,
  type EconomyRepository,
  type IssueGuestVoucherInput,
  type MatchEconomySettlementRecord,
  type MatchSettlementStatus,
  type PlayerIdentityKind,
  type RewardVoucherRecord,
  type SettleMatchEconomyInput,
  type SettlementReconciliation,
  type VoucherStatus,
  type VoucherStatusView,
  type WalletLedgerEntryType,
  type WorldBankSnapshot,
} from "./EconomyRepository.js";

/**
 * `EconomyRepository`, in Supabase Postgres.
 *
 * ── Where the guarantees live ────────────────────────────────────────────
 * Not here — every method below is a thin wrapper over exactly one RPC (or
 * one narrow read) in `supabase/migrations/20260826000000_economy_v1.sql`.
 * The database already decided every business rule under real row locks,
 * proven under real concurrency
 * (`scripts/economy/verifyEconomySchema.mjs`). This class's only job is
 * request shaping, response shaping, and error translation.
 *
 * ── The bigint transport finding, and how this file now closes it ────────
 * PostgREST generates its JSON responses server-side, via Postgres's own
 * `to_jsonb`/`row_to_json`, for BOTH a plain table `select` and an RPC's
 * jsonb return — and that serialization emits a `bigint` column as a bare
 * JSON NUMBER, always, regardless of magnitude. A prior pass of this file
 * accepted that number and merely `String()`-converted it afterward — which
 * cannot recover precision already lost during `JSON.parse`, since a value
 * once parsed as an IEEE-754 double past 2^53 is corrupted before any
 * application code runs (proven in
 * `server/src/persistence/__tests__/bigintTransportBoundary.test.ts`).
 *
 * That gap is now closed at the SOURCE, not papered over here: every read
 * this class issues targets a `*_safe` VIEW (`coin_wallets_safe`,
 * `coin_ledger_entries_safe`, `match_economy_settlements_safe`,
 * `world_bank_accounts_safe`, `reward_vouchers_safe`,
 * `economy_configurations_safe`, `economy_prize_schedules_safe`), and every
 * RPC's jsonb envelope is built by `wallet_to_safe_jsonb()` /
 * `settlement_to_safe_jsonb()` / `voucher_to_safe_jsonb()` instead of a bare
 * `to_jsonb(row)` — all defined in the migration's §11a, casting every
 * bigint column to `text` before it is ever serialized. `bigStr()` below
 * has correspondingly changed roles: it is no longer a lenient
 * number-or-string converter — it is a STRICT validator that REJECTS a
 * `number` outright (the transport now guarantees a string; a `number`
 * arriving here means something bypassed the safe views/functions, or a
 * stale pre-remediation deployment is in play) and rejects any string that
 * isn't a clean base-10 bigint shape. See
 * `docs/economy/economy-v1-bigint-transport-remediation-proposal.md` for
 * the full finding and the fix this file now implements.
 */

const ms = (isoString: string | null | undefined): number => (isoString ? Date.parse(isoString) : 0);

/**
 * Base-10, optional leading `-`, digits only — no decimal point, no
 * scientific notation, no leading `+`, no commas, no locale formatting.
 * Exactly the shape a Postgres `bigint::text` cast produces, and the ONLY
 * shape accepted post-remediation.
 */
const BIGINT_TEXT_PATTERN = /^-?\d+$/;

/**
 * Strict, string-only economy transport (bigint transport remediation —
 * `docs/economy/economy-v1-bigint-transport-remediation-proposal.md`).
 * Every bigint column now crosses PostgREST as `text`, via the `*_safe`
 * views and `*_to_safe_jsonb()` helpers in the migration's §11a. A `number`
 * arriving here means either a real transport regression (something bypassed
 * the safe views/functions) or a stale deployment of the pre-remediation
 * migration — never silently accepted and converted, since a `number` that
 * has already been through `JSON.parse` may already have lost precision
 * irreversibly (Phase 4's own finding); converting it to a string afterward
 * would only paper over corruption that already happened. Malformed strings
 * (decimals, scientific notation, empty, non-digit garbage, `NaN`,
 * `Infinity`) are rejected the same way.
 */
function bigStr(value: unknown): string {
  if (typeof value !== "string") {
    throw new EconomyInfrastructureError(
      `Expected a bigint-safe decimal string from PostgREST, received ${typeof value} (${JSON.stringify(value)}) — ` +
        "this indicates a transport regression; every bigint column must cross PostgREST as text " +
        "(see docs/economy/economy-v1-bigint-transport-remediation-proposal.md)",
    );
  }
  if (!BIGINT_TEXT_PATTERN.test(value)) {
    throw new EconomyInfrastructureError(
      `Malformed bigint-safe string from PostgREST: ${JSON.stringify(value)} — expected base-10 digits only, ` +
        "with an optional leading '-', no decimal point, no scientific notation, no locale formatting",
    );
  }
  return value;
}

/* ═══════════════════════════ Raw row shapes (snake_case, as PostgREST/Postgres emit them) ═══ */

interface WalletRow {
  identity_id: string;
  identity_kind: PlayerIdentityKind;
  balance: string;
  version: number;
  lifetime_granted: string;
  lifetime_earned: string;
  lifetime_spent: string;
  lifetime_refunded: string;
  starter_granted: boolean;
  is_frozen: boolean;
  updated_at: string;
}

interface LedgerRow {
  id: number;
  wallet_id: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  wallet_version_before: number;
  wallet_version_after: number;
  entry_type: WalletLedgerEntryType;
  source_kind: string;
  source_id: string;
  idempotency_key: string;
  description: string;
  created_at: string;
}

interface VoucherRow {
  id: string;
  code_hash: string;
  coin_amount: string;
  match_id: string;
  issued_to_guest_id: string;
  status: VoucherStatus;
  redeemed_by_member_id: string | null;
  redeemed_at: string | null;
  created_at: string;
}

interface SettlementRow {
  match_id: string;
  room_code: string;
  host_identity_id: string;
  seat_count: number;
  human_seat_count: number;
  bot_seat_count: number;
  cost_per_seat: string;
  total_collected: string;
  total_wallet_rewarded: string;
  total_guest_escrow: string;
  total_bot_collection: string;
  total_world_bank_cut: string;
  total_refunded: string;
  refund_reason: string | null;
  status: MatchSettlementStatus;
  settled_at: string | null;
  created_at: string;
}

interface WorldBankRow {
  base_fee_revenue: string;
  bot_prize_revenue: string;
  guest_escrow_liability: string;
  total_voucher_redeemed: string;
}

interface ConfigRow {
  id: string;
  version: number;
  guest_starter_coins: string;
  member_starter_coins: string;
  seat_cost_coins: string;
  is_active: boolean;
}

interface ScheduleRow {
  seat_count: number;
  collected_coins: string;
  first_place_coins: string;
  second_place_coins: string;
  third_place_coins: string;
  world_bank_coins: string;
}

interface ReconcileRow {
  match_id: string;
  status: MatchSettlementStatus;
  is_balanced: boolean;
  collected: string;
  disbursed: string;
  delta: string;
  details: {
    wallet_rewarded: string;
    guest_escrow: string;
    bot_collection: string;
    world_bank_cut: string;
    refunded: string;
  };
}

/** The database's own `{applied, operation, idempotencyKey, result}` envelope — camelCase keys, unlike every nested row's own snake_case columns. See `economy-v1.md` §6a. */
interface RawEnvelope<TResult> {
  applied: boolean;
  operation: string;
  idempotencyKey: string;
  result: TResult;
}

/* ═══════════════════════════ Row → DTO mappers ═══════════════════════════ */

function toWallet(row: WalletRow): CoinWalletRecord {
  return {
    identityId: row.identity_id,
    identityKind: row.identity_kind,
    balance: bigStr(row.balance),
    version: row.version,
    lifetimeGranted: bigStr(row.lifetime_granted),
    lifetimeEarned: bigStr(row.lifetime_earned),
    lifetimeSpent: bigStr(row.lifetime_spent),
    lifetimeRefunded: bigStr(row.lifetime_refunded),
    starterGranted: row.starter_granted,
    isFrozen: row.is_frozen,
    updatedAt: ms(row.updated_at),
  };
}

function toLedgerEntry(row: LedgerRow): CoinLedgerEntryRecord {
  return {
    id: row.id,
    walletId: row.wallet_id,
    amount: bigStr(row.amount),
    balanceBefore: bigStr(row.balance_before),
    balanceAfter: bigStr(row.balance_after),
    walletVersionBefore: row.wallet_version_before,
    walletVersionAfter: row.wallet_version_after,
    entryType: row.entry_type,
    sourceKind: row.source_kind,
    sourceId: row.source_id,
    idempotencyKey: row.idempotency_key,
    description: row.description,
    createdAt: ms(row.created_at),
  };
}

function toVoucher(row: VoucherRow): RewardVoucherRecord {
  return {
    id: row.id,
    codeHash: row.code_hash,
    coinAmount: bigStr(row.coin_amount),
    matchId: row.match_id,
    issuedToGuestId: row.issued_to_guest_id,
    status: row.status,
    redeemedByMemberId: row.redeemed_by_member_id,
    redeemedAt: row.redeemed_at ? ms(row.redeemed_at) : null,
    createdAt: ms(row.created_at),
  };
}

function toSettlement(row: SettlementRow): MatchEconomySettlementRecord {
  return {
    matchId: row.match_id,
    roomCode: row.room_code,
    hostIdentityId: row.host_identity_id,
    seatCount: row.seat_count,
    humanSeatCount: row.human_seat_count,
    botSeatCount: row.bot_seat_count,
    costPerSeat: bigStr(row.cost_per_seat),
    totalCollected: bigStr(row.total_collected),
    totalWalletRewarded: bigStr(row.total_wallet_rewarded),
    totalGuestEscrow: bigStr(row.total_guest_escrow),
    totalBotCollection: bigStr(row.total_bot_collection),
    totalWorldBankCut: bigStr(row.total_world_bank_cut),
    totalRefunded: bigStr(row.total_refunded),
    refundReason: row.refund_reason,
    status: row.status,
    settledAt: row.settled_at ? ms(row.settled_at) : null,
    createdAt: ms(row.created_at),
  };
}

function toWorldBank(row: WorldBankRow): WorldBankSnapshot {
  return {
    baseFeeRevenue: bigStr(row.base_fee_revenue),
    botPrizeRevenue: bigStr(row.bot_prize_revenue),
    guestEscrowLiability: bigStr(row.guest_escrow_liability),
    totalVoucherRedeemed: bigStr(row.total_voucher_redeemed),
  };
}

function toConfig(row: ConfigRow): EconomyConfigurationRecord {
  return {
    id: row.id,
    version: row.version,
    guestStarterCoins: bigStr(row.guest_starter_coins),
    memberStarterCoins: bigStr(row.member_starter_coins),
    seatCostCoins: bigStr(row.seat_cost_coins),
    isActive: row.is_active,
  };
}

function toSchedule(row: ScheduleRow): EconomyPrizeScheduleRecord {
  return {
    seatCount: row.seat_count,
    collectedCoins: bigStr(row.collected_coins),
    firstPlaceCoins: bigStr(row.first_place_coins),
    secondPlaceCoins: bigStr(row.second_place_coins),
    thirdPlaceCoins: bigStr(row.third_place_coins),
    worldBankCoins: bigStr(row.world_bank_coins),
  };
}

function toReconciliation(row: ReconcileRow): SettlementReconciliation {
  return {
    matchId: row.match_id,
    status: row.status,
    isBalanced: row.is_balanced,
    collected: bigStr(row.collected),
    disbursed: bigStr(row.disbursed),
    delta: bigStr(row.delta),
    details: {
      walletRewarded: bigStr(row.details.wallet_rewarded),
      guestEscrow: bigStr(row.details.guest_escrow),
      botCollection: bigStr(row.details.bot_collection),
      worldBankCut: bigStr(row.details.world_bank_cut),
      refunded: bigStr(row.details.refunded),
    },
  };
}

/* ═══════════════════════════ Error normalization ══════════════════════════
 *
 * The ONE place this class matches raw PostgREST/Postgres error text — every
 * other line of this file only ever sees named DTOs and named error classes.
 * Every token below is matched as `TOKEN:` (the exact shape every
 * `raise exception` in the migration uses), never a loose substring.
 *
 * `VOUCHER_INVALID` and `INVALID_VOUCHER_HASH` are two DIFFERENT tokens the
 * migration raises for the SAME conceptual failure (malformed code_hash
 * shape) from different functions — `redeem_reward_voucher` uses the
 * former, `issue_guest_voucher`/`settle_match_economy`'s guest branch use
 * the latter. Both normalize to `InvalidVoucherHashError`, per Phase 3's
 * explicit instruction — a caller of this repository must never need to
 * know which underlying function phrased the rejection differently.
 */
const ERROR_TOKEN_MAP: ReadonlyArray<[RegExp, new (message: string) => Error]> = [
  [/\bIDENTITY_NOT_FOUND:/, IdentityNotFoundError],
  [/\bINVALID_IDENTITY_ID:/, InvalidIdentityIdError],
  [/\bWALLET_NOT_FOUND:/, WalletNotFoundError],
  [/\bWALLET_FROZEN:/, WalletFrozenError],
  [/\bINSUFFICIENT_FUNDS:/, InsufficientFundsError],
  [/\bINVALID_VOUCHER_HASH:/, InvalidVoucherHashError],
  [/\bVOUCHER_INVALID:/, InvalidVoucherHashError],
  [/\bVOUCHER_NOT_FOUND:/, VoucherNotFoundError],
  [/\bVOUCHER_NOT_ACTIVE:/, VoucherNotActiveError],
  [/\bVOUCHER_ALREADY_REDEEMED:/, VoucherAlreadyRedeemedError],
  [/\bINVALID_SEAT_CONFIGURATION:/, InvalidSeatConfigurationError],
  [/\bUNSUPPORTED_SEAT_COUNT:/, UnsupportedSeatCountError],
  [/\bINVALID_IDENTITY_KIND:/, InvalidIdentityKindError],
  [/\bMATCH_NOT_COMMITTED:/, MatchNotCommittedError],
  [/\bMATCH_ALREADY_SETTLED:/, MatchAlreadySettledError],
  [/\bSETTLEMENT_CONSERVATION_VIOLATION:/, SettlementConservationViolationError],
  [/\bMATCH_NOT_FOUND:/, MatchNotFoundError],
  [/\bONLY_MEMBERS_CAN_REDEEM_VOUCHERS:/, OnlyMembersCanRedeemError],
];

/** Never a custom `raise exception` — a genuine Postgres unique-violation. */
const VOUCHER_COLLISION_PATTERN = /reward_vouchers_code_hash_key/;

export class SupabaseEconomyRepository implements EconomyRepository {
  readonly kind = "supabase" as const;
  private readonly db: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.db = new PostgrestClient(config);
  }

  /** Never throws a raw `PostgrestError` or any other unmapped error — always one of the named classes in `EconomyRepository.ts`. */
  private mapError(err: unknown): Error {
    if (err instanceof PostgrestError) {
      if (VOUCHER_COLLISION_PATTERN.test(err.message)) {
        return new VoucherCodeCollisionError("A voucher with this code hash already exists");
      }
      for (const [pattern, ErrorClass] of ERROR_TOKEN_MAP) {
        if (pattern.test(err.message)) {
          return new ErrorClass(err.message);
        }
      }
      // A real PostgREST/Postgres failure this repository doesn't recognize
      // — connectivity, a schema mismatch, an unexpected constraint. Never
      // surfaced as a raw PostgrestError to any caller.
      return new EconomyInfrastructureError(err.message);
    }
    if (err instanceof Error) {
      return new EconomyInfrastructureError(err.message);
    }
    return new EconomyInfrastructureError(String(err));
  }

  private async select<T>(table: string, query: string): Promise<T[]> {
    try {
      return await this.db.select<T>(table, query);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  private async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    try {
      return await this.db.rpc<T>(fn, args);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  /* ═══════════════════════════ reads ═══════════════════════════════════ */

  async ping(): Promise<void> {
    // Checks the _safe view, not the base table — this also proves the
    // bigint-transport remediation's own schema objects (§11a) are present,
    // not just the base tables, so a stale pre-remediation deployment fails
    // loudly here rather than at the first wallet read.
    await this.select("economy_configurations_safe", "select=id&limit=1");
  }

  async getWallet(identityId: string): Promise<CoinWalletRecord | null> {
    const rows = await this.select<WalletRow>(
      "coin_wallets_safe",
      `identity_id=eq.${encodeURIComponent(identityId)}&limit=1`,
    );
    return rows[0] ? toWallet(rows[0]) : null;
  }

  async listLedger(
    walletId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<CoinLedgerEntryRecord[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 20, 0), 100);
    const offset = Math.max(opts?.offset ?? 0, 0);
    const rows = await this.select<LedgerRow>(
      "coin_ledger_entries_safe",
      `wallet_id=eq.${encodeURIComponent(walletId)}&order=created_at.desc,id.desc&limit=${limit}&offset=${offset}`,
    );
    return rows.map(toLedgerEntry);
  }

  async getSettlement(matchId: string): Promise<MatchEconomySettlementRecord | null> {
    const rows = await this.select<SettlementRow>(
      "match_economy_settlements_safe",
      `match_id=eq.${encodeURIComponent(matchId)}&limit=1`,
    );
    return rows[0] ? toSettlement(rows[0]) : null;
  }

  async getWorldBankSnapshot(): Promise<WorldBankSnapshot> {
    const rows = await this.select<WorldBankRow>("world_bank_accounts_safe", "id=eq.primary&limit=1");
    if (!rows[0]) {
      throw new EconomyInfrastructureError("world_bank_accounts singleton row ('primary') is missing");
    }
    return toWorldBank(rows[0]);
  }

  async getVoucherStatus(codeHash: string): Promise<VoucherStatusView | null> {
    const rows = await this.select<{ status: VoucherStatus; coin_amount: string }>(
      "reward_vouchers_safe",
      `code_hash=eq.${encodeURIComponent(codeHash)}&select=status,coin_amount&limit=1`,
    );
    return rows[0] ? { status: rows[0].status, coinAmount: bigStr(rows[0].coin_amount) } : null;
  }

  async getActiveConfiguration(): Promise<EconomyConfigurationRecord> {
    const rows = await this.select<ConfigRow>("economy_configurations_safe", "is_active=eq.true&limit=1");
    if (!rows[0]) {
      throw new EconomyInfrastructureError("No active economy configuration found");
    }
    return toConfig(rows[0]);
  }

  async getPrizeSchedule(seatCount: number): Promise<EconomyPrizeScheduleRecord | null> {
    // Mirrors commit_match_entry's own two-step lookup exactly: the active
    // configuration's version, THEN the schedule row for that version.
    const config = await this.getActiveConfiguration();
    const rows = await this.select<ScheduleRow>(
      "economy_prize_schedules_safe",
      `config_version=eq.${config.version}&seat_count=eq.${seatCount}&limit=1`,
    );
    return rows[0] ? toSchedule(rows[0]) : null;
  }

  async reconcileSettlement(matchId: string): Promise<SettlementReconciliation> {
    const rows = await this.rpc<ReconcileRow[]>("reconcile_match_settlement", { p_match_id: matchId });
    // reconcile_match_settlement raises MATCH_NOT_FOUND itself (mapped by
    // `mapError` before this line is ever reached) when nothing matches, so
    // `rows[0]` is only ever absent here on a genuine transport anomaly.
    if (!rows[0]) {
      throw new EconomyInfrastructureError(`reconcile_match_settlement returned no row for ${matchId}`);
    }
    return toReconciliation(rows[0]);
  }

  async listStaleCommittedSettlements(olderThanMs: number): Promise<MatchEconomySettlementRecord[]> {
    const seconds = Math.max(0, Math.floor(olderThanMs / 1000));
    const rows = await this.rpc<SettlementRow[]>("list_stale_committed_settlements", {
      p_older_than: `${seconds} seconds`,
    });
    return rows.map(toSettlement);
  }

  /* ═══════════════════════════ mutations ═══════════════════════════════ */

  async ensureWallet(identityId: string): Promise<CoinWalletRecord> {
    const row = await this.rpc<WalletRow>("ensure_wallet", { p_identity_id: identityId });
    return toWallet(row);
  }

  async grantStarterCoins(identityId: string): Promise<EconomyOperationResult<CoinWalletRecord>> {
    const envelope = await this.rpc<RawEnvelope<WalletRow>>("grant_starter_coins", {
      p_identity_id: identityId,
    });
    return { ...envelope, result: toWallet(envelope.result) };
  }

  async commitMatchEntry(
    input: CommitMatchEntryInput,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    const envelope = await this.rpc<RawEnvelope<SettlementRow>>("commit_match_entry", {
      p_match_id: input.matchId,
      p_room_code: input.roomCode,
      p_host_identity_id: input.hostIdentityId,
      p_seat_count: input.seatCount,
      p_human_seat_count: input.humanSeatCount,
      p_bot_seat_count: input.botSeatCount,
      p_is_solo: input.isSolo,
    });
    return { ...envelope, result: toSettlement(envelope.result) };
  }

  async settleMatchEconomy(
    input: SettleMatchEconomyInput,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    const envelope = await this.rpc<RawEnvelope<SettlementRow>>("settle_match_economy", {
      p_match_id: input.matchId,
      p_is_valid_ranking: input.isValidRanking,
      // The migration's own jsonb_array_elements loop reads camelCase keys
      // (`identityId`, `identityKind`, `placement`, `voucherCodeHash`) from
      // each participant object — unlike every top-level RPC parameter
      // (snake_case `p_xxx`) and every table column (snake_case). Passed
      // through as-is; no case conversion here would be a real bug.
      p_participants: input.participants,
      p_refund_reason: input.refundReason ?? null,
    });
    return { ...envelope, result: toSettlement(envelope.result) };
  }

  async refundMatchEntry(
    matchId: string,
    reason: string,
  ): Promise<EconomyOperationResult<MatchEconomySettlementRecord>> {
    const envelope = await this.rpc<RawEnvelope<SettlementRow>>("refund_match_entry", {
      p_match_id: matchId,
      p_reason: reason,
    });
    return { ...envelope, result: toSettlement(envelope.result) };
  }

  async issueGuestVoucher(
    input: IssueGuestVoucherInput,
  ): Promise<EconomyOperationResult<RewardVoucherRecord>> {
    const envelope = await this.rpc<RawEnvelope<VoucherRow>>("issue_guest_voucher", {
      p_voucher_id: input.voucherId,
      p_code_hash: input.codeHash,
      // Sent as the DTO's own string — PostgREST casts a JSON string to the
      // RPC's declared `bigint` parameter. Never coerced to a JS number here.
      p_coin_amount: input.coinAmount,
      p_match_id: input.matchId,
      p_issued_to_guest_id: input.issuedToGuestId,
    });
    return { ...envelope, result: toVoucher(envelope.result) };
  }

  async redeemRewardVoucher(
    codeHash: string,
    memberIdentityId: string,
  ): Promise<EconomyOperationResult<RewardVoucherRecord>> {
    const envelope = await this.rpc<RawEnvelope<VoucherRow>>("redeem_reward_voucher", {
      p_code_hash: codeHash,
      p_member_identity_id: memberIdentityId,
    });
    return { ...envelope, result: toVoucher(envelope.result) };
  }
}
