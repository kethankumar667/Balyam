import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MatchEconomySettlementRecord } from "../../../lib/economyApi";
import PlayerSettlementSummary from "../PlayerSettlementSummary";

function makeSettlement(overrides: Partial<MatchEconomySettlementRecord> = {}): MatchEconomySettlementRecord {
  return {
    matchId: "m_test_123",
    roomCode: "ABC123",
    hostIdentityId: "host-1",
    seatCount: 2,
    humanSeatCount: 2,
    botSeatCount: 0,
    costPerSeat: "100",
    totalCollected: "200",
    totalWalletRewarded: "160",
    totalGuestEscrow: "0",
    totalBotCollection: "0",
    totalWorldBankCut: "40",
    totalRefunded: "0",
    refundReason: null,
    status: "SETTLED",
    createdAt: Date.now() - 5000,
    settledAt: Date.now() - 1000,
    ...overrides,
  };
}

describe("PlayerSettlementSummary — per-player breakdown (2026-09-09)", () => {
  it("renders nothing when the match is not yet settled", () => {
    const { container } = render(
      <PlayerSettlementSummary settlement={makeSettlement({ status: "COMMITTED" })} myRank={0} isGuest={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when there is no settlement record at all", () => {
    const { container } = render(
      <PlayerSettlementSummary settlement={null} myRank={0} isGuest={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows a winner's entry fee, reward, and positive net result", () => {
    // 2-seat match: 1 winner takes the full 160-coin winner pool.
    render(<PlayerSettlementSummary settlement={makeSettlement()} myRank={0} isGuest={false} />);
    expect(screen.getByText(/Match Result: Winner/i)).toBeDefined();
    expect(screen.getByText("Entry Fee Paid")).toBeDefined();
    expect(screen.getByText("Reward Earned")).toBeDefined();
    // Net = 160 - 100 = +60, rendered as a plain "60" via CoinAmount.
    expect(screen.getByText("60")).toBeDefined();
    expect(screen.getByText(/Wallet Credited/i)).toBeDefined();
  });

  it("shows a loser's entry fee, zero reward, and negative net result", () => {
    render(<PlayerSettlementSummary settlement={makeSettlement()} myRank={1} isGuest={false} />);
    expect(screen.getByText(/Match Result: Defeated/i)).toBeDefined();
    // Net = 0 - 100 = -100.
    expect(screen.getByText("-100")).toBeDefined();
    expect(screen.queryByText(/Wallet Credited/i)).toBeNull();
  });

  it("labels a guest winner's reward as a voucher, ready to redeem, not a wallet credit", () => {
    render(<PlayerSettlementSummary settlement={makeSettlement()} myRank={0} isGuest={true} />);
    expect(screen.getByText(/Voucher Generated/i)).toBeDefined();
    expect(screen.getByText(/Ready to Redeem/i)).toBeDefined();
    expect(screen.queryByText(/Wallet Credited/i)).toBeNull();
  });

  it("shows the Match ID and Settled status in the audit footer", () => {
    render(<PlayerSettlementSummary settlement={makeSettlement()} myRank={0} isGuest={false} />);
    expect(screen.getByText(/m_test_123/)).toBeDefined();
    expect(screen.getByText(/Settled/)).toBeDefined();
  });
});
