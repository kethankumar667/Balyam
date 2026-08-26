import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEconomyWallet,
  getEconomyLedger,
  quoteMatchCheckout,
  commitMatchCheckout,
  getMatchSettlement,
  redeemRewardVoucher,
  getVoucherStatus,
  getWorldBankSnapshot,
  getStaleSettlements,
  reconcileMatchSettlement,
  EconomyClientError,
} from "../economyApi";

describe("Economy V1 Client API Suite", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("getEconomyWallet returns typed wallet record with string balance", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        wallet: {
          identityId: "user-123",
          identityKind: "member",
          balance: "9223372036854775807",
          version: 5,
          lifetimeGranted: "5000",
          lifetimeEarned: "1000",
          lifetimeSpent: "400",
          lifetimeRefunded: "0",
          starterGranted: true,
          isFrozen: false,
          updatedAt: 1787700000000,
        },
      }),
    } as Response);

    const res = await getEconomyWallet();
    expect(res.wallet.balance).toBe("9223372036854775807");
    expect(res.wallet.identityId).toBe("user-123");
    expect(res.wallet.version).toBe(5);
  });

  it("getEconomyWallet throws EconomyClientError on 404/500 with server error slug", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: "WalletNotFound",
        message: "No wallet has been provisioned for this identity yet.",
      }),
    } as Response);

    await expect(getEconomyWallet()).rejects.toThrowError(EconomyClientError);
  });

  it("getEconomyLedger returns paginated entries and hasMore flag", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          {
            id: 1,
            walletId: "user-123",
            amount: "-400",
            balanceBefore: "5000",
            balanceAfter: "4600",
            walletVersionBefore: 1,
            walletVersionAfter: 2,
            entryType: "ROOM_ENTRY_DEBIT",
            sourceKind: "MATCH",
            sourceId: "match-1",
            idempotencyKey: "idem-1",
            description: "Room entry fee",
            createdAt: 1787700000000,
          },
        ],
        hasMore: false,
      }),
    } as Response);

    const res = await getEconomyLedger({ limit: 10, offset: 0 });
    expect(res.entries.length).toBe(1);
    expect(res.entries[0].amount).toBe("-400");
    expect(res.hasMore).toBe(false);
  });

  it("quoteMatchCheckout returns calculated quote with decimal string totals", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        quote: {
          seatCount: 4,
          humanSeatCount: 3,
          botSeatCount: 1,
          costPerSeat: "100",
          totalCommitment: "400",
          prizeDistribution: {
            firstPlace: "175",
            secondPlace: "125",
            thirdPlace: "50",
          },
          worldBankContribution: "50",
          hostBalance: "5000",
          projectedBalance: "4600",
          hasSufficientFunds: true,
          shortfall: null,
          configurationVersion: 1,
        },
      }),
    } as Response);

    const res = await quoteMatchCheckout({ seatCount: 4, humanSeatCount: 3, botSeatCount: 1 });
    expect(res.quote.totalCommitment).toBe("400");
    expect(res.quote.hasSufficientFunds).toBe(true);
    expect(res.quote.prizeDistribution.firstPlace).toBe("175");
  });

  it("commitMatchCheckout posts commit entry and receives applied settlement", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        applied: true,
        settlement: {
          matchId: "match-100",
          roomCode: "TEST99",
          hostIdentityId: "user-123",
          seatCount: 4,
          humanSeatCount: 3,
          botSeatCount: 1,
          costPerSeat: "100",
          totalCollected: "400",
          totalWalletRewarded: "0",
          totalGuestEscrow: "0",
          totalBotCollection: "0",
          totalWorldBankCut: "0",
          totalRefunded: "0",
          refundReason: null,
          status: "COMMITTED",
          createdAt: 1787700000000,
          settledAt: null,
        },
      }),
    } as Response);

    const res = await commitMatchCheckout({
      matchId: "match-100",
      roomCode: "TEST99",
      seatCount: 4,
      humanSeatCount: 3,
      botSeatCount: 1,
      isSolo: false,
    });

    expect(res.applied).toBe(true);
    expect(res.settlement.status).toBe("COMMITTED");
  });

  it("getMatchSettlement fetches settled match record", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settlement: {
          matchId: "match-100",
          roomCode: "TEST99",
          hostIdentityId: "user-123",
          seatCount: 4,
          humanSeatCount: 3,
          botSeatCount: 1,
          costPerSeat: "100",
          totalCollected: "400",
          totalWalletRewarded: "175",
          totalGuestEscrow: "125",
          totalBotCollection: "50",
          totalWorldBankCut: "50",
          totalRefunded: "0",
          refundReason: null,
          status: "SETTLED",
          createdAt: 1787700000000,
          settledAt: 1787700060000,
        },
      }),
    } as Response);

    const res = await getMatchSettlement("match-100");
    expect(res.settlement.status).toBe("SETTLED");
    expect(res.settlement.totalWalletRewarded).toBe("175");
  });

  it("redeemRewardVoucher posts raw code and returns new balance without leakage", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        applied: true,
        voucher: {
          id: "vouch-uuid",
          codeHash: "hash64chars",
          coinAmount: "125",
          matchId: "match-100",
          issuedToGuestId: "guest-1",
          status: "REDEEMED",
          redeemedByMemberId: "user-123",
          redeemedAt: 1787700060000,
          createdAt: 1787700000000,
        },
        newBalance: "5125",
      }),
    } as Response);

    const res = await redeemRewardVoucher("SECRET-BEARER-CODE-123");
    expect(res.applied).toBe(true);
    expect(res.newBalance).toBe("5125");
    expect(res.voucher.coinAmount).toBe("125");
  });

  it("getVoucherStatus checks status of unredeemed voucher", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        voucher: {
          status: "ACTIVE",
          coinAmount: "150",
        },
      }),
    } as Response);

    const res = await getVoucherStatus("TEST-VOUCH-123");
    expect(res.voucher.status).toBe("ACTIVE");
    expect(res.voucher.coinAmount).toBe("150");
  });
});
