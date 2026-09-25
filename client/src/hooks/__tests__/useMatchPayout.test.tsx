import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type {
  CoinLedgerEntryRecord,
  MatchEconomySettlementRecord,
  MatchSettlementStatus,
  WalletLedgerEntryType,
} from "../../lib/economyApi";

const getEconomyLedger = vi.fn();

vi.mock("../../lib/economyApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/economyApi")>();
  return { ...actual, getEconomyLedger: (...a: unknown[]) => getEconomyLedger(...a) };
});

import { findMatchPayout, useMatchPayout, PAYOUT_FETCH_MAX_ATTEMPTS, PAYOUT_FETCH_RETRY_MS } from "../useMatchPayout";

function entry(over: Partial<CoinLedgerEntryRecord> & { entryType: WalletLedgerEntryType; amount: string }): CoinLedgerEntryRecord {
  return {
    id: 1,
    walletId: "w",
    balanceBefore: "0",
    balanceAfter: "0",
    walletVersionBefore: 0,
    walletVersionAfter: 1,
    sourceKind: "match",
    sourceId: "m_1",
    idempotencyKey: "k",
    description: "",
    gameKind: "handcricket",
    createdAt: 1,
    ...over,
  };
}

function settlement(status: MatchSettlementStatus, matchId = "m_1"): MatchEconomySettlementRecord {
  return {
    matchId,
    roomCode: "ABCDEF",
    hostIdentityId: "",
    seatCount: 2,
    humanSeatCount: 2,
    botSeatCount: 0,
    costPerSeat: "100",
    totalCollected: "200",
    totalWalletRewarded: "0",
    totalGuestEscrow: "0",
    totalBotCollection: "0",
    totalWorldBankCut: "0",
    totalRefunded: "0",
    refundReason: null,
    status,
    createdAt: 1,
    settledAt: status === "COMMITTED" ? null : 2,
  };
}

describe("findMatchPayout", () => {
  it("reports the prize credited for the match", () => {
    const entries = [
      entry({ entryType: "ROOM_ENTRY_DEBIT", amount: "-100" }),
      entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "160" }),
    ];
    expect(findMatchPayout(entries, "m_1")).toEqual({ matchId: "m_1", kind: "prize", amount: "160" });
  });

  it("returns null for a loss — only the stake debit exists", () => {
    expect(findMatchPayout([entry({ entryType: "ROOM_ENTRY_DEBIT", amount: "-100" })], "m_1")).toBeNull();
  });

  it("ignores credits that belong to a different match", () => {
    const entries = [entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "160", sourceId: "m_other" })];
    expect(findMatchPayout(entries, "m_1")).toBeNull();
  });

  it("ignores non-match credits that share the id, such as a wallet gift", () => {
    const entries = [entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "160", sourceKind: "admin" })];
    expect(findMatchPayout(entries, "m_1")).toBeNull();
  });

  it("reports a refund when the match was refunded", () => {
    const entries = [entry({ entryType: "MATCH_REFUND", amount: "100" })];
    expect(findMatchPayout(entries, "m_1")).toEqual({ matchId: "m_1", kind: "refund", amount: "100" });
  });

  it("prefers the prize over a refund and never mixes them", () => {
    const entries = [
      entry({ entryType: "MATCH_REFUND", amount: "100" }),
      entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "160" }),
    ];
    expect(findMatchPayout(entries, "m_1")?.kind).toBe("prize");
    expect(findMatchPayout(entries, "m_1")?.amount).toBe("160");
  });

  it("sums split credits exactly, beyond Number precision", () => {
    const entries = [
      entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "9007199254740993" }),
      entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "2" }),
    ];
    expect(findMatchPayout(entries, "m_1")?.amount).toBe("9007199254740995");
  });

  it("skips a malformed amount instead of throwing", () => {
    const entries = [entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "not-a-number" })];
    expect(findMatchPayout(entries, "m_1")).toBeNull();
  });
});

describe("useMatchPayout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getEconomyLedger.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
  const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it("does not touch the ledger while the settlement is still COMMITTED", async () => {
    renderHook(() => useMatchPayout("m_1", settlement("COMMITTED")));
    await flush();
    expect(getEconomyLedger).not.toHaveBeenCalled();
  });

  it("does not touch the ledger without a match id", async () => {
    renderHook(() => useMatchPayout(undefined, null));
    await flush();
    expect(getEconomyLedger).not.toHaveBeenCalled();
  });

  it("does not use a settlement that belongs to a previous match", async () => {
    renderHook(() => useMatchPayout("m_2", settlement("SETTLED", "m_1")));
    await flush();
    expect(getEconomyLedger).not.toHaveBeenCalled();
  });

  it("reports the prize once the settlement is final", async () => {
    getEconomyLedger.mockResolvedValue({
      entries: [entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "160" })],
      hasMore: false,
    });
    const { result } = renderHook(() => useMatchPayout("m_1", settlement("SETTLED")));
    await flush();
    expect(result.current).toEqual({ matchId: "m_1", kind: "prize", amount: "160" });
    expect(getEconomyLedger).toHaveBeenCalledTimes(1);
  });

  it("stays null for a loser — nothing to announce", async () => {
    getEconomyLedger.mockResolvedValue({
      entries: [entry({ entryType: "ROOM_ENTRY_DEBIT", amount: "-100" })],
      hasMore: false,
    });
    const { result } = renderHook(() => useMatchPayout("m_1", settlement("SETTLED")));
    await flush();
    expect(result.current).toBeNull();
  });

  it("retries a failed ledger read, then reports the payout", async () => {
    getEconomyLedger
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ entries: [entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "160" })], hasMore: false });
    const { result } = renderHook(() => useMatchPayout("m_1", settlement("SETTLED")));
    await flush();
    expect(result.current).toBeNull();
    await tick(PAYOUT_FETCH_RETRY_MS);
    expect(result.current?.amount).toBe("160");
  });

  it("gives up after the bounded number of attempts", async () => {
    getEconomyLedger.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useMatchPayout("m_1", settlement("SETTLED")));
    await flush();
    await tick(PAYOUT_FETCH_RETRY_MS * PAYOUT_FETCH_MAX_ATTEMPTS * 2);
    expect(getEconomyLedger).toHaveBeenCalledTimes(PAYOUT_FETCH_MAX_ATTEMPTS);
    expect(result.current).toBeNull();
  });

  it("clears the previous payout when the next match starts", async () => {
    getEconomyLedger.mockResolvedValue({
      entries: [entry({ entryType: "MATCH_PRIZE_CREDIT", amount: "160" })],
      hasMore: false,
    });
    const { result, rerender } = renderHook(
      ({ id, s }) => useMatchPayout(id, s),
      { initialProps: { id: "m_1" as string | undefined, s: settlement("SETTLED") as MatchEconomySettlementRecord | null } },
    );
    await flush();
    expect(result.current?.matchId).toBe("m_1");
    rerender({ id: "m_2", s: null });
    await flush();
    expect(result.current).toBeNull();
  });
});
