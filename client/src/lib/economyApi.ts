import { getApiBaseUrl } from "./socket";
import { apiFetch } from "./playerIdentity";
import { operationalFetch } from "./operationalApi";

/* ═══════════════════════════ Types & DTOs ══════════════════════════════════ */

export type PlayerIdentityKind = "member" | "guest";
export type ParticipantIdentityKind = "member" | "guest" | "bot";
export type VoucherStatus = "ACTIVE" | "REDEEMED" | "CANCELLED";
export type MatchSettlementStatus = "COMMITTED" | "SETTLED" | "REFUNDED" | "ABANDONMENT_FORFEITED";

export type WalletLedgerEntryType =
  | "STARTER_GRANT"
  | "ROOM_ENTRY_DEBIT"
  | "SOLO_ENTRY_DEBIT"
  | "BOT_ENTRY_DEBIT"
  | "MATCH_PRIZE_CREDIT"
  | "VOUCHER_REDEMPTION"
  | "MATCH_REFUND"
  | "ADMIN_ADJUSTMENT";

export interface CoinWalletRecord extends Record<string, unknown> {
  identityId: string;
  identityKind: PlayerIdentityKind;
  /** Decimal string, always. */
  balance: string;
  version: number;
  lifetimeGranted: string;
  lifetimeEarned: string;
  lifetimeSpent: string;
  lifetimeRefunded: string;
  starterGranted: boolean;
  isFrozen: boolean;
  updatedAt: number;
}

export interface CoinLedgerEntryRecord extends Record<string, unknown> {
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

export interface MatchCheckoutQuoteInput {
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
  projectedBalance: string;
  hasSufficientFunds: boolean;
  shortfall: string | null;
  configurationVersion: number;
}

export interface CommitMatchEntryRequest {
  matchId: string;
  roomCode: string | null;
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
  isSolo: boolean;
}

export interface MatchEconomySettlementRecord extends Record<string, unknown> {
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
  status: MatchSettlementStatus;
  createdAt: number;
  settledAt: number | null;
}

export interface RewardVoucherRecord {
  id: string;
  codeHash: string;
  coinAmount: string;
  matchId: string;
  issuedToGuestId: string;
  status: VoucherStatus;
  redeemedByMemberId: string | null;
  redeemedAt: number | null;
  createdAt: number;
}

export interface VoucherStatusView {
  status: VoucherStatus;
  coinAmount: string;
}

export interface WorldBankSnapshot {
  systemAccountId: string;
  /** Decimal string balance of the central bank. */
  balance: string;
  lifetimeCollected: string;
  lifetimeGrants: string;
  lifetimeGuestEscrowDeposits: string;
  lifetimeVoucherClaims: string;
  activeVoucherCount: number;
  activeEscrowBalance: string;
  updatedAt: number;
}

export interface SettlementReconciliation {
  matchId: string;
  isConserved: boolean;
  committedTotal: string;
  actualDebited: string;
  actualCredited: string;
  discrepancy: string;
  detail: string;
}

export interface EconomyApiError {
  status: number;
  error: string;
  message: string;
}

export class EconomyClientError extends Error {
  readonly status: number;
  readonly code: string;
  /** Ties this failure back to the exact server-side log line, when the server supplied one. */
  readonly correlationId: string | null;

  constructor(status: number, code: string, message: string, correlationId: string | null = null) {
    super(message);
    this.name = "EconomyClientError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

/* ═══════════════════════════ API Client Methods ═══════════════════════════ */

/**
 * Parses JSON response safely and extracts typed error on failure.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorSlug = "UnknownError";
    let errorMessage = `Request failed with status ${res.status}`;
    let correlationId: string | null = null;
    try {
      const data = (await res.json()) as { error?: string; message?: string; correlationId?: string };
      if (data.error) errorSlug = data.error;
      if (data.message) errorMessage = data.message;
      if (data.correlationId) correlationId = data.correlationId;
    } catch {
      /* non-json error body */
    }
    throw new EconomyClientError(res.status, errorSlug, errorMessage, correlationId);
  }
  return (await res.json()) as T;
}

/**
 * A wallet response that survived `handleResponse` (a 2xx status) but does not
 * actually have the shape `CoinWalletRecord` requires — a contract break
 * between client and server, not a normal error the backend told us about.
 * Caught explicitly rather than let a malformed `balance` render as a
 * misleadingly-confident number (see Phase 1's root-cause investigation:
 * a silent shape mismatch is exactly the kind of failure that looks like
 * "the wallet is empty" instead of "something is broken").
 */
function isCoinWalletRecord(value: unknown): value is CoinWalletRecord {
  if (!value || typeof value !== "object") return false;
  const w = value as Record<string, unknown>;
  return typeof w.identityId === "string" && typeof w.balance === "string" && typeof w.version === "number";
}

/**
 * GET /api/economy/wallet — retrieves caller's own verified wallet.
 */
export async function getEconomyWallet(): Promise<{ wallet: CoinWalletRecord }> {
  const res = await apiFetch("/api/economy/wallet");
  const body = await handleResponse<{ wallet: unknown }>(res);
  if (!isCoinWalletRecord(body.wallet)) {
    throw new EconomyClientError(res.status, "MalformedResponse", "The wallet response did not match the expected shape.");
  }
  return { wallet: body.wallet };
}

/**
 * GET /api/economy/wallet/ledger — retrieves caller's own ledger history.
 */
export async function getEconomyLedger(
  options: { limit?: number; offset?: number } = {},
): Promise<{ entries: CoinLedgerEntryRecord[]; hasMore: boolean }> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const res = await apiFetch(`/api/economy/wallet/ledger?limit=${limit}&offset=${offset}`);
  return handleResponse<{ entries: CoinLedgerEntryRecord[]; hasMore: boolean }>(res);
}

/**
 * POST /api/economy/checkout/quote — fetches authoritative checkout quote.
 */
export async function quoteMatchCheckout(
  input: MatchCheckoutQuoteInput,
): Promise<{ quote: MatchCheckoutQuote }> {
  const res = await apiFetch("/api/economy/checkout/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return handleResponse<{ quote: MatchCheckoutQuote }>(res);
}

/**
 * POST /api/economy/checkout/commit — commits match entry fee.
 */
export async function commitMatchCheckout(
  input: CommitMatchEntryRequest,
): Promise<{ applied: boolean; settlement: MatchEconomySettlementRecord }> {
  const res = await apiFetch("/api/economy/checkout/commit", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return handleResponse<{ applied: boolean; settlement: MatchEconomySettlementRecord }>(res);
}

/**
 * GET /api/economy/settlements/:matchId — retrieves settlement outcome for a match.
 */
export async function getMatchSettlement(
  matchId: string,
): Promise<{ settlement: MatchEconomySettlementRecord }> {
  const res = await apiFetch(`/api/economy/settlements/${encodeURIComponent(matchId)}`);
  return handleResponse<{ settlement: MatchEconomySettlementRecord }>(res);
}

/**
 * POST /api/economy/vouchers/redeem — redeems a guest reward bearer voucher.
 * Note: Never logs the raw code or stores it in telemetry.
 */
export async function redeemRewardVoucher(
  code: string,
): Promise<{ applied: boolean; voucher: RewardVoucherRecord; newBalance: string }> {
  const res = await apiFetch("/api/economy/vouchers/redeem", {
    method: "POST",
    body: JSON.stringify({ code: code.trim() }),
  });
  return handleResponse<{ applied: boolean; voucher: RewardVoucherRecord; newBalance: string }>(res);
}

/**
 * GET /api/economy/vouchers/:voucherId — public pre-redemption status check.
 * (Note: Uses raw bearer code as parameter).
 */
export async function getVoucherStatus(
  rawCode: string,
): Promise<{ voucher: VoucherStatusView }> {
  const res = await fetch(`${getApiBaseUrl()}/api/economy/vouchers/${encodeURIComponent(rawCode.trim())}`);
  return handleResponse<{ voucher: VoucherStatusView }>(res);
}

/**
 * GET /api/economy/world-bank — operational snapshot of central treasury.
 */
export async function getWorldBankSnapshot(): Promise<{ worldBank: WorldBankSnapshot }> {
  return operationalFetch<{ worldBank: WorldBankSnapshot }>("/api/economy/world-bank");
}

/**
 * GET /api/economy/settlements/stale — operational stale committed settlements.
 */
export async function getStaleSettlements(
  olderThanMs = 3_600_000,
): Promise<{ settlements: MatchEconomySettlementRecord[] }> {
  return operationalFetch<{ settlements: MatchEconomySettlementRecord[] }>(
    `/api/economy/settlements/stale?olderThanMs=${olderThanMs}`,
  );
}

/**
 * GET /api/economy/settlements/:matchId/reconcile — operational settlement reconciliation audit.
 */
export async function reconcileMatchSettlement(
  matchId: string,
): Promise<{ reconciliation: SettlementReconciliation }> {
  return operationalFetch<{ reconciliation: SettlementReconciliation }>(
    `/api/economy/settlements/${encodeURIComponent(matchId)}/reconcile`,
  );
}
