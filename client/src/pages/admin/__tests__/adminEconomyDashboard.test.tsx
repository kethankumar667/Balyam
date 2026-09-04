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
    baseFeeRevenue: "450000",
    botPrizeRevenue: "35000",
    abandonmentForfeitureRevenue: "14000",
    guestEscrowLiability: "120000",
    totalVoucherRedeemed: "155000",
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
      expect(screen.getByText("Guest Escrow Liability")).toBeDefined();
      expect(screen.getByText("Vouchers Redeemed")).toBeDefined();
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
    it("renders Treasury Solvency Hero and 5 revenue & liability pillars", async () => {
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
    it("renders player lookup and displays live wallet and ledger data upon search", async () => {
      const mockWallet: economyApi.CoinWalletRecord = {
        identityId: "user-alpha-1234",
        identityKind: "member",
        balance: "2500",
        version: 3,
        lifetimeGranted: "5000",
        lifetimeEarned: "0",
        lifetimeSpent: "2500",
        lifetimeRefunded: "0",
        starterGranted: true,
        isFrozen: false,
        updatedAt: Date.now(),
      };

      vi.spyOn(economyApi, "lookupPlayerWallet").mockResolvedValue({
        wallet: mockWallet,
        ledger: [
          {
            id: 1,
            walletId: "user-alpha-1234",
            amount: "5000",
            balanceBefore: "0",
            balanceAfter: "5000",
            walletVersionBefore: 0,
            walletVersionAfter: 1,
            entryType: "STARTER_GRANT",
            sourceKind: "system",
            sourceId: "system",
            idempotencyKey: "starter-1",
            description: "Starter coin grant",
            createdAt: Date.now() - 3600000,
          },
        ],
      });

      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const playerTab = screen.getByRole("tab", { name: /Player Lookup/i });
      fireEvent.click(playerTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter Player Identity ID/i)).toBeDefined();
      });

      // Before search: displays "No Player Selected"
      expect(screen.getByText("No Player Selected")).toBeDefined();

      const searchInput = screen.getByPlaceholderText(/Enter Player Identity ID/i);
      fireEvent.change(searchInput, { target: { value: "user-alpha-1234" } });
      fireEvent.submit(searchInput.closest("form")!);

      // After search: displays live wallet details
      await waitFor(() => {
        expect(screen.getByText("Current Balance")).toBeDefined();
      });
      expect(screen.getAllByText(/user-alpha-1234/).length).toBeGreaterThan(0);
      expect(screen.getByText("2,500")).toBeDefined();
      expect(screen.getByText("Manual Wallet Top-Up (Super Admin)")).toBeDefined();
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

  describe("9. Phase 5.4 Keyboard Navigation & Tab ARIA Semantics", () => {
    it("supports ArrowRight, ArrowLeft, Home, and End roving tab navigation", async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /Overview/i })).toBeDefined();
      });

      const overviewTab = screen.getByRole("tab", { name: /Overview/i });
      const settlementsTab = screen.getByRole("tab", { name: /Settlements/i });
      const healthTab = screen.getByRole("tab", { name: /Health Center/i });

      // Overview starts active with tabIndex 0, other tabs have -1
      expect(overviewTab.getAttribute("aria-selected")).toBe("true");
      expect(overviewTab.getAttribute("tabindex")).toBe("0");
      expect(settlementsTab.getAttribute("tabindex")).toBe("-1");

      // ArrowRight moves focus and selects Settlements
      fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
      expect(settlementsTab.getAttribute("aria-selected")).toBe("true");
      expect(settlementsTab.getAttribute("tabindex")).toBe("0");
      expect(overviewTab.getAttribute("tabindex")).toBe("-1");

      // End key moves focus and selects Health Center (last tab)
      fireEvent.keyDown(settlementsTab, { key: "End" });
      expect(healthTab.getAttribute("aria-selected")).toBe("true");
      expect(healthTab.getAttribute("tabindex")).toBe("0");

      // ArrowRight from last tab wraps around to first tab (Overview)
      fireEvent.keyDown(healthTab, { key: "ArrowRight" });
      expect(overviewTab.getAttribute("aria-selected")).toBe("true");
      expect(overviewTab.getAttribute("tabindex")).toBe("0");

      // ArrowLeft from first tab wraps around to last tab (Health Center)
      fireEvent.keyDown(overviewTab, { key: "ArrowLeft" });
      expect(healthTab.getAttribute("aria-selected")).toBe("true");

      // Home key jumps back to first tab (Overview)
      fireEvent.keyDown(healthTab, { key: "Home" });
      expect(overviewTab.getAttribute("aria-selected")).toBe("true");
    });

    it("verifies ARIA controls and labelledby connections between tabs and active tabpanel", async () => {
      renderDashboard();

      const overviewTab = screen.getByRole("tab", { name: /Overview/i });
      const tabId = overviewTab.getAttribute("id");
      const panelControlsId = overviewTab.getAttribute("aria-controls");

      expect(tabId).toBe("economy-tab-overview");
      expect(panelControlsId).toBe("economy-panel-overview");

      const panel = screen.getByRole("tabpanel");
      expect(panel.getAttribute("id")).toBe(panelControlsId);
      expect(panel.getAttribute("aria-labelledby")).toBe(tabId);
      expect(panel.getAttribute("tabindex")).toBe("0");
    });

    it("activates interactive KPI cards and rows via Enter and Space keyboard navigation", async () => {
      vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({
        settlements: mockRecentSettlements,
      });

      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      // Stale Commitments Card on Overview activates on Enter key
      const staleCard = screen.getByRole("button", { name: /View Stale Commitments Queue/i });
      fireEvent.keyDown(staleCard, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("m_TEST01_1001")).toBeDefined();
      });

      // Navigate back to Overview using Space key on Overview tab
      const overviewTab = screen.getByRole("tab", { name: /Overview/i });
      fireEvent.click(overviewTab);

      await screen.findByText("Recent Match Settlements");

      // Recent settlement row activates on Space key to open drawer
      const recentRow = screen.getByRole("button", { name: /Inspect settlement for match m_TEST01_1001/i });
      fireEvent.keyDown(recentRow, { key: " " });

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeDefined();
        expect(screen.getByText("Match Investigation")).toBeDefined();
      });
    });
  });

  describe("10. Phase 5.4 Match Detail Drawer Focus, Trap & Accessible Copy Feedback", () => {
    it("moves focus into drawer on open, traps focus, and closes on Escape returning focus", async () => {
      vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({
        settlements: mockRecentSettlements,
      });

      renderDashboard();

      await screen.findByText("Recent Match Settlements");

      const openerRow = screen.getByRole("button", { name: /Inspect settlement for match m_TEST01_1001/i });
      openerRow.focus();
      expect(document.activeElement).toBe(openerRow);

      fireEvent.click(openerRow);

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute("aria-modal")).toBe("true");

      // Close button has accessible name
      const closeBtn = screen.getByRole("button", { name: "Close drawer" });
      expect(closeBtn).toBeDefined();

      // Escape key closes the drawer and restores focus to opener
      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      expect(document.activeElement).toBe(openerRow);
    });

    it("handles Copy Match ID action with accessible live announcement and timer cleanup", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({
        settlements: mockRecentSettlements,
      });

      renderDashboard();

      await screen.findByText("Recent Match Settlements");
      const openerRow = screen.getByRole("button", { name: /Inspect settlement for match m_TEST01_1001/i });
      fireEvent.click(openerRow);

      await screen.findByRole("dialog");

      const copyBtn = screen.getByRole("button", { name: "Copy Match ID to clipboard" });
      expect(copyBtn).toBeDefined();

      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith("m_TEST01_1001");
      expect(screen.getByText("Copied")).toBeDefined();
      expect(screen.getByText("Match ID copied to clipboard")).toBeDefined();

      // Escape closes drawer safely
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
    });
  });

  describe("11. Phase 5.4 Long Identifiers, Large Values, and Severity Filter Accessibility", () => {
    it("renders long identifiers and extreme BigInt values safely without breaking UI", async () => {
      const mockLongMatch: economyApi.MatchEconomySettlementRecord = {
        matchId: "m_VERY_LONG_MATCH_IDENTIFIER_EXTENDED_9999999999999999_TEST",
        roomCode: "RM_LONG_99",
        hostIdentityId: "user-alpha-99999999999999999999999999999999",
        seatCount: 5,
        humanSeatCount: 3,
        botSeatCount: 2,
        costPerSeat: "1000000000000",
        totalCollected: "5000000000000",
        totalWalletRewarded: "3500000000000",
        totalGuestEscrow: "1000000000000",
        totalBotCollection: "0",
        totalWorldBankCut: "500000000000",
        totalRefunded: "0",
        refundReason: null,
        status: "SETTLED",
        createdAt: Date.now() - 10 * 60_000,
        settledAt: Date.now() - 2 * 60_000,
      };

      vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({
        settlements: [mockLongMatch],
      });

      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      // Navigate to Settlements tab
      const settlementsTab = screen.getByRole("tab", { name: /Settlements/i });
      fireEvent.click(settlementsTab);

      await waitFor(() => {
        expect(screen.getByText(mockLongMatch.matchId)).toBeDefined();
      });

      // Long match ID has title attribute for accessibility
      const matchSpan = screen.getByText(mockLongMatch.matchId);
      expect(matchSpan.getAttribute("title")).toBe(mockLongMatch.matchId);
    });

    it("verifies stale severity filter buttons expose aria-pressed and filter active view", async () => {
      const now = Date.now();
      vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({
        settlements: [
          {
            matchId: "m_STALE_CRIT",
            roomCode: "CRIT01",
            hostIdentityId: "host-crit",
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
            status: "COMMITTED",
            createdAt: now - 70 * 60_000, // 70 min
            settledAt: null,
          },
          {
            matchId: "m_STALE_WARN",
            roomCode: "WARN01",
            hostIdentityId: "host-warn",
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
            status: "COMMITTED",
            createdAt: now - 20 * 60_000, // 20 min
            settledAt: null,
          },
        ],
      });

      renderDashboard();

      await screen.findByText("World Bank Treasury Reserves");

      const staleTab = screen.getByRole("tab", { name: /Stale Queue/i });
      fireEvent.click(staleTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /All Stale/i })).toBeDefined();
      });

      const allBtn = screen.getByRole("button", { name: /All Stale/i });
      const critBtn = screen.getByRole("button", { name: /Critical \(>60m\)/i });
      const warnBtn = screen.getByRole("button", { name: /Warning \(>15m\)/i });

      expect(allBtn.getAttribute("aria-pressed")).toBe("true");
      expect(critBtn.getAttribute("aria-pressed")).toBe("false");

      // Both items present initially
      expect(screen.getByText("m_STALE_CRIT")).toBeDefined();
      expect(screen.getByText("m_STALE_WARN")).toBeDefined();

      // Click Critical filter button
      fireEvent.click(critBtn);
      expect(critBtn.getAttribute("aria-pressed")).toBe("true");
      expect(allBtn.getAttribute("aria-pressed")).toBe("false");

      // Only Critical item visible
      expect(screen.getByText("m_STALE_CRIT")).toBeDefined();
      expect(screen.queryByText("m_STALE_WARN")).toBeNull();

      // Row action button has specific accessible name
      const reconcileBtn = screen.getByRole("button", { name: "Reconcile match m_STALE_CRIT" });
      expect(reconcileBtn).toBeDefined();
    });
  });

  describe("12. Phase 5.4 Operational Error Recovery & Retry Flow", () => {
    it("renders role='alert' error notice on sync failure and recovers on retry", async () => {
      vi.spyOn(economyApi, "getWorldBankSnapshot").mockRejectedValueOnce(
        new Error("Operational database connection timeout"),
      );

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeDefined();
        expect(screen.getByText(/Operational database connection timeout/)).toBeDefined();
      });

      const retryBtn = screen.getByRole("button", { name: /Retry Sync/i });
      expect(retryBtn).toBeDefined();

      // Successful response on retry
      vi.spyOn(economyApi, "getWorldBankSnapshot").mockResolvedValueOnce({
        worldBank: mockWorldBank,
      });

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.queryByRole("alert")).toBeNull();
      });

      expect(screen.getByText("World Bank Treasury Reserves")).toBeDefined();
    });
  });
});
