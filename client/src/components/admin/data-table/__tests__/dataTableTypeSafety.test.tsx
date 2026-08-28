import { describe, it, expect, expectTypeOf } from "vitest";
import { render, screen } from "@testing-library/react";
import DataTable, { type Column, type PropertyColumn, type ComputedColumn } from "../index";
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
      { kind: "property", key: "identityId", header: "Identity" },
      { kind: "property", key: "balance", header: "Balance", render: (item) => `${item.balance} 🪙` },
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
      { kind: "property", key: "matchId", header: "Match ID" },
      { kind: "property", key: "roomCode", header: "Room" },
      { kind: "property", key: "status", header: "Status", render: (item) => `STATUS: ${item.status}` },
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
      { kind: "property", key: "description", header: "Description" },
      { kind: "property", key: "entryType", header: "Type" },
    ];

    render(<DataTable columns={columns} data={entries} />);

    expect(screen.getByText("Welcome starter grant")).toBeDefined();
    expect(screen.getByText("STARTER_GRANT")).toBeDefined();
  });
});

describe("DataTable — column contract compile-time safety (kind discriminant)", () => {
  it("accepts a property column whose key is a genuine keyof T", () => {
    const columns: Column<CoinWalletRecord>[] = [
      { kind: "property", key: "identityId", header: "Identity" },
    ];

    expect(columns).toHaveLength(1);
  });

  it("accepts a computed column with a synthetic key, provided render is supplied", () => {
    const columns: Column<CoinWalletRecord>[] = [
      {
        kind: "computed",
        key: "actions",
        header: "Actions",
        render: (item) => `${item.identityId}-action`,
      },
    ];

    expect(columns).toHaveLength(1);
  });

  it("rejects a property column whose key does not exist on T", () => {
    // "thisPropertyDoesNotExist" is not a keyof CoinWalletRecord, and this
    // object has no `render`, so it cannot fall back to the computed branch
    // either. This is the exact defect Phase 5.3 shipped with (this column
    // used to compile with zero errors and silently render blank).
    const columns: Column<CoinWalletRecord>[] = [
      // @ts-expect-error — invalid property key, no renderer to fall back on.
      { kind: "property", key: "thisPropertyDoesNotExist", header: "Invalid" },
    ];

    expect(columns).toBeDefined();
  });

  it("rejects a computed column that omits the required renderer", () => {
    // ComputedColumn<T>.render is required. A synthetic key with no property
    // to fall back on and no renderer to produce content must fail to
    // compile rather than render an empty cell forever.
    const columns: Column<CoinWalletRecord>[] = [
      // @ts-expect-error — computed column is missing the required `render`.
      { kind: "computed", key: "actions", header: "Actions" },
    ];

    expect(columns).toBeDefined();
  });

  it("infers the renderer's row parameter as the exact row type, not Record<string, unknown>", () => {
    const columns: Column<MatchEconomySettlementRecord>[] = [
      {
        kind: "computed",
        key: "combined",
        header: "Combined",
        render: (item) => {
          expectTypeOf(item).toEqualTypeOf<MatchEconomySettlementRecord>();
          return `${item.matchId}:${item.seatCount}`;
        },
      },
    ];

    expect(columns).toBeDefined();
  });

  it("rejects renderer property access to a field that does not exist on the row", () => {
    const columns: Column<MatchEconomySettlementRecord>[] = [
      {
        kind: "computed",
        key: "combined",
        header: "Combined",
        // `participantCount` is not a field on MatchEconomySettlementRecord.
        // Because the renderer's `item` parameter is typed exactly as T (not
        // `Record<string, unknown>`), a typo'd or stale field name fails to
        // compile instead of evaluating to `undefined`.
        // @ts-expect-error — invalid property access on the row type.
        render: (item) => item.participantCount,
      },
    ];

    expect(columns).toBeDefined();
  });

  it("keeps DTO excess-property checks intact — no index signature swallows typos", () => {
    // CoinWalletRecord no longer extends Record<string, unknown>, so it
    // carries no index signature. An object literal with an unrecognized
    // property fails excess-property checking instead of being silently
    // accepted as a wallet.
    const bogusWallet: CoinWalletRecord = {
      identityId: "user-x",
      identityKind: "member",
      balance: "0",
      version: 1,
      lifetimeGranted: "0",
      lifetimeEarned: "0",
      lifetimeSpent: "0",
      lifetimeRefunded: "0",
      starterGranted: false,
      isFrozen: false,
      updatedAt: 0,
      // @ts-expect-error — unrecognized property, rejected by excess-property checking.
      thisFieldDoesNotExist: "oops",
    };

    expect(bogusWallet).toBeDefined();
  });

  it("PropertyColumn and ComputedColumn are mutually exclusive branches of Column<T>", () => {
    // A bare `{ key, render? }` shape (no `kind`) must not satisfy either
    // branch — this is what would let the union "collapse" back to an
    // effectively unconstrained string key. Both assignments below require an
    // explicit, correct `kind` literal.
    const property: PropertyColumn<CoinWalletRecord> = {
      kind: "property",
      key: "identityId",
      header: "Identity",
    };
    const computed: ComputedColumn<CoinWalletRecord> = {
      kind: "computed",
      key: "actions",
      header: "Actions",
      render: (item) => item.identityId,
    };

    expect(property.kind).toBe("property");
    expect(computed.kind).toBe("computed");
  });
});
