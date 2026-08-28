import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DataTable, { type Column } from "../index";
import type {
  CoinWalletRecord,
  CoinLedgerEntryRecord,
  MatchEconomySettlementRecord,
} from "../../../../lib/economyApi";

describe("DataTable — Strict Generic Typing & DTO Protection (Phase 5.3)", () => {
  it("renders strict CoinWalletRecord without index signatures or Record<string, unknown> widening", () => {
    const wallets: CoinWalletRecord[] = [
      {
        identityId: "user-alpha-999",
        identityKind: "member",
        balance: "5000",
        version: 1,
        lifetimeGranted: "5000",
        lifetimeEarned: "0",
        lifetimeSpent: "0",
        lifetimeRefunded: "0",
        starterGranted: true,
        isFrozen: false,
        updatedAt: 1787800000000,
      },
    ];

    const columns: Column<CoinWalletRecord>[] = [
      { key: "identityId", header: "Identity" },
      { key: "balance", header: "Balance", render: (item) => `${item.balance} 🪙` },
    ];

    render(<DataTable columns={columns} data={wallets} />);

    expect(screen.getByText("user-alpha-999")).toBeDefined();
    expect(screen.getByText("5000 🪙")).toBeDefined();
  });

  it("renders strict MatchEconomySettlementRecord in DataTable without type errors", () => {
    const settlements: MatchEconomySettlementRecord[] = [
      {
        matchId: "m_TEST_STRICT_101",
        roomCode: "TEST01",
        hostIdentityId: "host-strict-1",
        seatCount: 4,
        humanSeatCount: 2,
        botSeatCount: 2,
        costPerSeat: "100",
        totalCollected: "400",
        totalWalletRewarded: "300",
        totalGuestEscrow: "0",
        totalBotCollection: "0",
        totalWorldBankCut: "100",
        totalRefunded: "0",
        refundReason: null,
        status: "SETTLED",
        createdAt: 1787800000000,
        settledAt: 1787800060000,
      },
    ];

    const columns: Column<MatchEconomySettlementRecord>[] = [
      { key: "matchId", header: "Match ID" },
      { key: "roomCode", header: "Room" },
      { key: "status", header: "Status", render: (item) => `STATUS: ${item.status}` },
    ];

    render(<DataTable columns={columns} data={settlements} />);

    expect(screen.getByText("m_TEST_STRICT_101")).toBeDefined();
    expect(screen.getByText("TEST01")).toBeDefined();
    expect(screen.getByText("STATUS: SETTLED")).toBeDefined();
  });

  it("renders strict CoinLedgerEntryRecord without custom render using fallback cell access", () => {
    const entries: CoinLedgerEntryRecord[] = [
      {
        id: 101,
        walletId: "w_123",
        amount: "5000",
        balanceBefore: "0",
        balanceAfter: "5000",
        walletVersionBefore: 0,
        walletVersionAfter: 1,
        entryType: "STARTER_GRANT",
        sourceKind: "SYSTEM",
        sourceId: "signup",
        idempotencyKey: "idem_101",
        description: "Welcome starter grant",
        createdAt: 1787800000000,
      },
    ];

    const columns: Column<CoinLedgerEntryRecord>[] = [
      { key: "description", header: "Description" },
      { key: "entryType", header: "Type" },
    ];

    render(<DataTable columns={columns} data={entries} />);

    expect(screen.getByText("Welcome starter grant")).toBeDefined();
    expect(screen.getByText("STARTER_GRANT")).toBeDefined();
  });
});
