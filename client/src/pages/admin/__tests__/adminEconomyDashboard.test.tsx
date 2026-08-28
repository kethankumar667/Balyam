import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEconomyPage from "../economy/index";
import * as economyApi from "../../../lib/economyApi";

// Mock resize observer for Recharts responsive containers
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("Admin Economy Operations Dashboard (/admin/economy)", () => {
  const mockWorldBank: economyApi.WorldBankSnapshot = {
    systemAccountId: "world-bank-001",
    balance: "1250000",
    lifetimeCollected: "450000",
    activeEscrowBalance: "35000",
    activeVoucherCount: 14,
    lifetimeGrants: "980000",
    lifetimeVoucherClaims: "120000",
    lifetimeGuestEscrowDeposits: "155000",
    updatedAt: Date.now(),
  };

  const mockRecentSettlements: economyApi.MatchEconomySettlementRecord[] = [
    {
      matchId: "m_TEST01_1001",
      roomCode: "RM1001",
      hostIdentityId: "user-alpha-1234",
      seatCount: 4,
      humanSeatCount: 3,
      botSeatCount: 1,
      costPerSeat: "100",
      totalCollected: "400",
      totalWalletRewarded: "220",
      totalGuestEscrow: "100",
      totalBotCollection: "0",
      totalWorldBankCut: "80",
      totalRefunded: "0",
      refundReason: null,
      status: "SETTLED",
      createdAt: Date.now() - 10 * 60_000,
      settledAt: Date.now() - 2 * 60_000,
    },
    {
      matchId: "m_TEST02_1002",
      roomCode: "RM1002",
      hostIdentityId: "user-beta-5678",
      seatCount: 2,
      humanSeatCount: 2,
      botSeatCount: 0,
      costPerSeat: "100",
      totalCollected: "200",
      totalWalletRewarded: "0",
      totalGuestEscrow: "0",
      totalBotCollection: "0",
      totalWorldBankCut: "0",
      totalRefunded: "200",
      refundReason: "Host departed before match start",
      status: "REFUNDED",
      createdAt: Date.now() - 25 * 60_000,
      settledAt: Date.now() - 24 * 60_000,
    },
    {
      matchId: "m_TEST03_1003",
      roomCode: "RM1003",
      hostIdentityId: "user-gamma-9012",
      seatCount: 4,
      humanSeatCount: 2,
      botSeatCount: 2,
      costPerSeat: "100",
      totalCollected: "400",
      totalWalletRewarded: "0",
      totalGuestEscrow: "0",
      totalBotCollection: "0",
      totalWorldBankCut: "0",
      totalRefunded: "0",
      refundReason: null,
      status: "ABANDONMENT_FORFEITED",
      createdAt: Date.now() - 45 * 60_000,
      settledAt: Date.now() - 35 * 60_000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(economyApi, "getWorldBankSnapshot").mockResolvedValue({
      worldBank: mockWorldBank,
    });

    vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({
      settlements: [],
    });

    // Mirrors the real server: a match ID the store has no settlement for
    // is a genuine 404, not a plausible-looking placeholder record.
    vi.spyOn(economyApi, "getMatchSettlement").mockImplementation(async (matchId: string) => {
      const match = mockRecentSettlements.find((s) => s.matchId === matchId);
      if (match) return { settlement: match };
      throw new economyApi.EconomyClientError(404, "SettlementNotFound", "No settlement found for this match ID.");
    });

    vi.spyOn(economyApi, "reconcileMatchSettlement").mockImplementation(async (matchId: string) => {
      const match = mockRecentSettlements.find((s) => s.matchId === matchId);
      if (!match) {
        throw new economyApi.EconomyClientError(404, "SettlementNotFound", "No settlement found for this match ID.");
      }
      return {
        reconciliation: {
          matchId,
          isConserved: true,
          committedTotal: match.totalCollected,
          actualDebited: match.totalCollected,
          actualCredited: match.totalCollected,
          discrepancy: "0",
          detail: `${match.totalCollected} 🪙 debited = ${match.totalCollected} 🪙 credited (0 discrepancy)`,
        },
      };
    });
  });

  const renderDashboard = () =>
    render(
      <MemoryRouter initialEntries={["/admin/economy"]}>
        <AdminEconomyPage />
      </MemoryRouter>,
    );

  describe("1. Economy Overview Module (Module 1)", () => {
    it("renders page header, Economy V1 badge, and all sub-navigation tabs", async () => {
      renderDashboard();

      expect(screen.getByText("Economy & Treasury Console")).toBeDefined();
      expect(screen.getByText("Economy V1 Active")).toBeDefined();

      const tabs = screen.getByRole("tablist", { name: "Economy Dashboard Modules" });
      expect(tabs).toBeDefined();

      expect(screen.getByRole("tab", { name: /Overview/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /Settlements/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /Stale Queue/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /World Bank/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /Analytics/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /Player Lookup/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /Match Audit/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /Health Center/i })).toBeDefined();
    });

    it("displays World Bank treasury reserve cards and health status score", async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText("World Bank Treasury Reserves")).toBeDefined();
      });

      expect(screen.getByText("BHALYAM Economy Health & Operations")).toBeDefined();
      expect(screen.getByText("HEALTHY")).toBeDefined();
      expect(screen.getByText("Active Escrow Liability")).toBeDefined();
      expect(screen.getByText("Starter Grants Distributed")).toBeDefined();
    });

    it("renders settlement statistics (Settled, Refunded, Abandonment Forfeitures)", async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText("Settlement Performance & Integrity")).toBeDefined();
      });

      expect(screen.getByText("Total Settled")).toBeDefined();
      expect(screen.getByText("Total Refunded")).toBeDefined();
      expect(screen.getByText("Abandonment Forfeitures")).toBeDefined();
      expect(screen.getByText("Stale Commitments")).toBeDefined();
    });
  });

  describe("2. Match Settlement Monitor Module (Module 2)", () => {
    it("allows navigating to Settlements tab and renders settlement table", async () => {
      renderDashboard();

      const settlementsTab = screen.getByRole("tab", { name: /Settlements/i });
      fireEvent.click(settlementsTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by match ID/i)).toBeDefined();
      });

      expect(screen.getByText("Match ID & Room")).toBeDefined();
      expect(screen.getByText("Seat Config")).toBeDefined();
      expect(screen.getByText("Total Collected")).toBeDefined();
      expect(screen.getByText("Conservation")).toBeDefined();
    });

    it("filters settlements by status and searches by text", async () => {
      renderDashboard();

      fireEvent.click(screen.getByRole("tab", { name: /Settlements/i }));

      const searchInput = (await screen.findByPlaceholderText(/Search by match ID/i)) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "KD22TL" } });

      expect(searchInput.value).toBe("KD22TL");
    });
  });

  describe("3. Stale Settlement Monitor Module (Module 3)", () => {
    it("renders severity tier filter cards (>60m, >15m, >5m)", async () => {
      renderDashboard();

      const staleTab = screen.getByRole("tab", { name: /Stale Queue/i });
      fireEvent.click(staleTab);

      await waitFor(() => {
        expect(screen.getByText(/Critical \(>60m\)/i)).toBeDefined();
      });

      expect(screen.getByText(/Warning \(>15m\)/i)).toBeDefined();
      expect(screen.getByText(/Notice \(>5m\)/i)).toBeDefined();
      expect(screen.getByText("Zero Stale Commitments")).toBeDefined();
    });

    it("displays critical alert when stale commitments exceed 60 minutes", async () => {
      vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({
        settlements: [
          {
            matchId: "m_STALE_CRITICAL",
            roomCode: "STALE1",
            hostIdentityId: "host-stuck",
            seatCount: 4,
            humanSeatCount: 4,
            botSeatCount: 0,
            costPerSeat: "100",
            totalCollected: "400",
            totalWalletRewarded: "0",
            totalGuestEscrow: "0",
            totalBotCollection: "0",
            totalWorldBankCut: "0",
            totalRefunded: "0",
            refundReason: null,
            status: "COMMITTED",
            createdAt: Date.now() - 90 * 60_000, // 90 min old
            settledAt: null,
          },
        ],
      });

      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const staleTab = screen.getByRole("tab", { name: /Stale Queue/i });
      fireEvent.click(staleTab);

      await waitFor(() => {
        expect(screen.getByText("Critical Stale Commitments Detected")).toBeDefined();
      });

      expect(screen.getAllByText(/CRITICAL/i).length).toBeGreaterThan(0);
    });
  });

  describe("4. World Bank Dashboard Module (Module 4)", () => {
    it("renders Treasury Solvency Hero and 6 revenue & liability pillars", async () => {
      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const wbTab = screen.getByRole("tab", { name: /World Bank/i });
      fireEvent.click(wbTab);

      await waitFor(() => {
        expect(screen.getByText("BHALYAM World Bank Liquidity Reserve")).toBeDefined();
      });

      expect(screen.getByText("Base Fee Revenue")).toBeDefined();
      expect(screen.getByText("Bot Victory Prize Rake")).toBeDefined();
      expect(screen.getByText("Abandonment Forfeitures")).toBeDefined();
      expect(screen.getByText("Guest Escrow Liability")).toBeDefined();
      expect(screen.getByText("Vouchers Redeemed")).toBeDefined();
      expect(screen.getByText("Non-Fungible Treasury Balance Architecture")).toBeDefined();
    });
  });

  describe("5. Refund & Forfeiture Analytics Module (Module 5)", () => {
    it("renders settlement success rate, refund rate, and volume charts", async () => {
      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const analyticsTab = screen.getByRole("tab", { name: /Analytics/i });
      fireEvent.click(analyticsTab);

      await waitFor(() => {
        expect(screen.getByText("Settlement Success Rate")).toBeDefined();
      });

      expect(screen.getByText("Refund Rate")).toBeDefined();
      expect(screen.getByText("Forfeiture Rate")).toBeDefined();
      expect(screen.getByText("Settlement, Refund & Forfeiture Volume")).toBeDefined();
    });
  });

  describe("6. Player Economy Investigation Module (Module 6)", () => {
    it("is honest that identity lookup is not yet available, rather than showing fabricated wallet data", async () => {
      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const playerTab = screen.getByRole("tab", { name: /Player Lookup/i });
      fireEvent.click(playerTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter Player Identity ID/i)).toBeDefined();
      });

      // Before any search: explains what the tool will do once it's wired up.
      expect(screen.getByText("Player Lookup Not Yet Available")).toBeDefined();

      const searchInput = screen.getByPlaceholderText(/Enter Player Identity ID/i);
      fireEvent.change(searchInput, { target: { value: "user-alpha-1234" } });
      fireEvent.submit(searchInput.closest("form")!);

      // After a search: names the identity that was searched, still no
      // fabricated wallet/ledger data anywhere on the page.
      await waitFor(() => {
        expect(screen.getByText(/user-alpha-1234/)).toBeDefined();
      });
      expect(screen.queryByText("Current Balance")).toBeNull();
      expect(screen.queryByText("Coin Ledger Entries")).toBeNull();
    });
  });

  describe("7. Match Investigation Page & Drawer (Module 7)", () => {
    it("allows searching Match ID and renders conservation audit & timeline", async () => {
      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const matchTab = screen.getByRole("tab", { name: /Match Audit/i });
      fireEvent.click(matchTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter Match ID/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/Enter Match ID/i);
      fireEvent.change(searchInput, { target: { value: "m_TEST01_1001" } });
      fireEvent.submit(searchInput.closest("form")!);

      await waitFor(() => {
        expect(screen.getAllByText("100% CONSERVED").length).toBeGreaterThan(0);
      });

      expect(screen.getByText("Financial Distribution")).toBeDefined();
      expect(screen.getByText("Match Lifecycle Progression")).toBeDefined();
    });

    it("reports an unknown match ID as not found, never as a fabricated 'everything is fine' settlement", async () => {
      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const matchTab = screen.getByRole("tab", { name: /Match Audit/i });
      fireEvent.click(matchTab);

      const searchInput = await screen.findByPlaceholderText(/Enter Match ID/i);
      fireEvent.change(searchInput, { target: { value: "m_DOES_NOT_EXIST" } });
      fireEvent.submit(searchInput.closest("form")!);

      await waitFor(() => {
        expect(screen.getByText(/No settlement record found for match ID/)).toBeDefined();
      });

      expect(screen.queryByText("100% CONSERVED")).toBeNull();
      expect(screen.queryByText("Financial Distribution")).toBeNull();
    });
  });

  describe("8. Economy Health Center Module (Module 8)", () => {
    it("renders 5 automated health checks and operator intervention playbook", async () => {
      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const healthTab = screen.getByRole("tab", { name: /Health Center/i });
      fireEvent.click(healthTab);

      await waitFor(() => {
        expect(screen.getByText("Authoritative Economy Integrity Monitor")).toBeDefined();
      });

      expect(screen.getByText("Stale Commitment Queue")).toBeDefined();
      expect(screen.getByText("Mathematical Balance Conservation")).toBeDefined();
      expect(screen.getByText("Guest Escrow Treasury Solvency")).toBeDefined();
      expect(screen.getByText("Settlement Queue Serial Integrity")).toBeDefined();
      expect(screen.getByText("Cryptographic Bearer Token Isolation")).toBeDefined();
      expect(screen.getByText("Operational Guidance & Recommendations")).toBeDefined();

      // Only checks backed by a real, live signal (stale queue count,
      // escrow solvency from the real World Bank snapshot) may claim
      // HEALTHY. The three with no server-side aggregate wired up yet must
      // say so plainly, never a fabricated all-clear.
      expect(screen.getAllByText("NOT MONITORED").length).toBe(3);
      expect(screen.getAllByText("HEALTHY").length).toBeGreaterThanOrEqual(1);
    });
  });
});
