import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { MatchEconomySettlementRecord, MatchSettlementStatus } from "../../lib/economyApi";

const getMatchSettlement = vi.fn();
const refreshCurrentWallet = vi.fn(() => Promise.resolve());

vi.mock("../../lib/economyApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/economyApi")>();
  return { ...actual, getMatchSettlement: (...a: unknown[]) => getMatchSettlement(...a) };
});
vi.mock("../useEconomy", () => ({ refreshCurrentWallet: () => refreshCurrentWallet() }));

import { EconomyClientError } from "../../lib/economyApi";
import {
  useMatchSettlement,
  winnerPrizesFor,
  SETTLEMENT_POLL_INTERVAL_MS,
  SETTLEMENT_POLL_MAX_ATTEMPTS,
} from "../useMatchSettlement";

function record(status: MatchSettlementStatus): { settlement: MatchEconomySettlementRecord } {
  return {
    settlement: {
      matchId: "m_1",
      roomCode: "ABCDEF",
      hostIdentityId: "",
      seatCount: 2,
      humanSeatCount: 2,
      botSeatCount: 0,
      costPerSeat: "100",
      totalCollected: "200",
      totalWalletRewarded: status === "SETTLED" ? "160" : "0",
      totalGuestEscrow: "0",
      totalBotCollection: "0",
      totalWorldBankCut: status === "SETTLED" ? "40" : "0",
      totalRefunded: status === "REFUNDED" ? "200" : "0",
      refundReason: null,
      status,
      createdAt: 1,
      settledAt: status === "COMMITTED" ? null : 2,
    },
  };
}

/**
 * The result screen used to fetch the settlement ONCE, straight after the last
 * move, when it was still COMMITTED — so it showed no prize — and never looked
 * again. It also never told the wallet to reload, so the winner's balance chip
 * kept the debited figure. It now waits for the settlement to land, then
 * refreshes the wallet.
 */
describe("useMatchSettlement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getMatchSettlement.mockReset();
    refreshCurrentWallet.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
  const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it("does nothing without a match id", async () => {
    const { result } = renderHook(() => useMatchSettlement(undefined));
    await flush();
    expect(getMatchSettlement).not.toHaveBeenCalled();
    expect(result.current).toEqual({ settlement: null, isLoading: false, error: null });
  });

  it("returns an already-settled match at once, refreshes the wallet once, and stops asking", async () => {
    getMatchSettlement.mockResolvedValue(record("SETTLED"));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    expect(result.current.settlement?.status).toBe("SETTLED");
    expect(result.current.isLoading).toBe(false);
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);

    await tick(SETTLEMENT_POLL_INTERVAL_MS * 5);
    expect(getMatchSettlement).toHaveBeenCalledTimes(1);
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
  });

  it("keeps asking while COMMITTED and picks up the payout when it lands — the exact case that showed no prize", async () => {
    getMatchSettlement
      .mockResolvedValueOnce(record("COMMITTED"))
      .mockResolvedValueOnce(record("COMMITTED"))
      .mockResolvedValue(record("SETTLED"));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    expect(result.current.settlement?.status).toBe("COMMITTED");
    expect(result.current.isLoading).toBe(false); // shown as pending, not spinning forever
    expect(refreshCurrentWallet).not.toHaveBeenCalled(); // money has not moved yet

    await tick(SETTLEMENT_POLL_INTERVAL_MS);
    expect(result.current.settlement?.status).toBe("COMMITTED");
    await tick(SETTLEMENT_POLL_INTERVAL_MS);
    expect(result.current.settlement?.status).toBe("SETTLED");
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
    expect(getMatchSettlement).toHaveBeenCalledTimes(3);

    await tick(SETTLEMENT_POLL_INTERVAL_MS * 3);
    expect(getMatchSettlement).toHaveBeenCalledTimes(3); // no polling after a final status
  });

  it.each(["REFUNDED", "ABANDONMENT_FORFEITED"] as const)("treats %s as final and refreshes the wallet", async (status) => {
    getMatchSettlement.mockResolvedValue(record(status));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    expect(result.current.settlement?.status).toBe(status);
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
  });

  it("gives up after a bounded number of attempts, leaving the pending state and not touching the wallet", async () => {
    getMatchSettlement.mockResolvedValue(record("COMMITTED"));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    await tick(SETTLEMENT_POLL_INTERVAL_MS * (SETTLEMENT_POLL_MAX_ATTEMPTS + 5));
    expect(getMatchSettlement).toHaveBeenCalledTimes(SETTLEMENT_POLL_MAX_ATTEMPTS);
    expect(result.current.settlement?.status).toBe("COMMITTED");
    expect(result.current.error).toBeNull();
    expect(refreshCurrentWallet).not.toHaveBeenCalled();
  });

  it("surfaces a definite refusal (403) once and does not keep polling", async () => {
    getMatchSettlement.mockRejectedValue(new EconomyClientError(403, "Forbidden", "That is not your record."));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    expect(result.current.error).toBe("That is not your record.");
    expect(result.current.isLoading).toBe(false);
    await tick(SETTLEMENT_POLL_INTERVAL_MS * 4);
    expect(getMatchSettlement).toHaveBeenCalledTimes(1);
    expect(refreshCurrentWallet).not.toHaveBeenCalled();
  });

  it.each([502, 503, 504, 429])("treats a %i from the server as transient and keeps polling", async (status) => {
    getMatchSettlement.mockRejectedValueOnce(new EconomyClientError(status, "Upstream", "Try again")).mockResolvedValue(record("SETTLED"));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    expect(result.current.error).toBeNull(); // a proxy blip is not shown as a definite refusal
    await tick(SETTLEMENT_POLL_INTERVAL_MS);
    expect(result.current.settlement?.status).toBe("SETTLED");
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
  });

  it("retries through a transient network failure instead of giving up on the first one", async () => {
    getMatchSettlement.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(record("SETTLED"));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    await tick(SETTLEMENT_POLL_INTERVAL_MS);
    expect(result.current.settlement?.status).toBe("SETTLED");
    expect(result.current.error).toBeNull();
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
  });

  it("reports an unavailable record if the network never recovers", async () => {
    getMatchSettlement.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    await tick(SETTLEMENT_POLL_INTERVAL_MS * (SETTLEMENT_POLL_MAX_ATTEMPTS + 2));
    expect(result.current.error).toBe("Settlement record unavailable for this match.");
    expect(getMatchSettlement).toHaveBeenCalledTimes(SETTLEMENT_POLL_MAX_ATTEMPTS);
  });

  it("stops polling when the screen goes away", async () => {
    getMatchSettlement.mockResolvedValue(record("COMMITTED"));
    const { unmount } = renderHook(() => useMatchSettlement("m_1"));
    await flush();
    unmount();
    await tick(SETTLEMENT_POLL_INTERVAL_MS * 5);
    expect(getMatchSettlement).toHaveBeenCalledTimes(1);
  });

  it("starts over for a different match and never applies a late answer for the old one", async () => {
    let resolveOld: (v: unknown) => void = () => {};
    getMatchSettlement.mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }));
    getMatchSettlement.mockResolvedValue(record("SETTLED"));
    const { result, rerender } = renderHook(({ id }) => useMatchSettlement(id), { initialProps: { id: "m_old" as string | undefined } });
    rerender({ id: "m_new" });
    await flush();
    expect(result.current.settlement?.status).toBe("SETTLED");
    resolveOld({ settlement: { ...record("REFUNDED").settlement, matchId: "m_old" } });
    await flush();
    expect(result.current.settlement?.status).toBe("SETTLED"); // not overwritten by the stale response
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
  });
});

/**
 * The result screens show the winner's prize from `winnerPrizesFor`. Rummy is winner-takes-all
 * with no platform cut, so re-deriving its prize with the standard 20% split would show the
 * winner a smaller number than the wallet was actually credited with.
 */
describe("winnerPrizesFor", () => {
  const settled = (over: Partial<MatchEconomySettlementRecord>): MatchEconomySettlementRecord => ({
    ...record("SETTLED").settlement,
    ...over,
  });

  it("standard match: 80% of the pot to the winner, the rest to the platform", () => {
    expect(winnerPrizesFor(settled({ totalCollected: "200", totalWorldBankCut: "40", seatCount: 2 }))).toEqual(["160"]);
  });

  it("Rummy (no platform cut): the whole pot to first place, at any seat count", () => {
    expect(winnerPrizesFor(settled({ totalCollected: "480", totalWorldBankCut: "0", seatCount: 6 }))).toEqual(["480"]);
    expect(winnerPrizesFor(settled({ totalCollected: "320", totalWorldBankCut: "0", seatCount: 2 }))).toEqual(["320"]);
  });

  it("nothing is shown until the match is actually settled", () => {
    expect(winnerPrizesFor(null)).toBeNull();
    expect(winnerPrizesFor(record("COMMITTED").settlement)).toBeNull();
    expect(winnerPrizesFor(record("REFUNDED").settlement)).toBeNull();
  });
});
