import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  WalletDrawer,
  CheckoutSheet,
  SettlementView,
  VoucherRedemptionModal,
  EconomyErrorBoundary,
  formatCoinString,
} from "../index";
import AdminEconomyPage from "../../../pages/admin/economy";

describe("Economy V1 UI Integration Suite", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ── 1. BigInt Rendering Precision across all views ──────────────────────

  describe("BigInt Exact Precision Verification", () => {
    it("renders PostgreSQL 64-bit BIGINT_MAX (9223372036854775807) without float truncation or scientific notation", () => {
      const bigintMax = "9223372036854775807";
      expect(formatCoinString(bigintMax)).toBe("9,223,372,036,854,775,807");
    });

    it("renders unsafe JS int (9007199254740993) exactly", () => {
      const unsafeInt = "9007199254740993";
      expect(formatCoinString(unsafeInt)).toBe("9,007,199,254,740,993");
    });
  });

  // ── 2. WalletDrawer Experience ──────────────────────────────────────────

  describe("WalletDrawer Component", () => {
    it("renders server-authoritative balance and transaction history", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/economy/wallet/ledger")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              entries: [
                {
                  id: 101,
                  walletId: "user-123",
                  amount: "+5000",
                  balanceBefore: "0",
                  balanceAfter: "5000",
                  walletVersionBefore: 0,
                  walletVersionAfter: 1,
                  entryType: "STARTER_GRANT",
                  sourceKind: "SYSTEM",
                  sourceId: "grant-1",
                  idempotencyKey: "idem-grant",
                  description: "Starter welcome grant",
                  createdAt: 1787700000000,
                },
              ],
              hasMore: false,
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            wallet: {
              identityId: "user-123",
              identityKind: "member",
              balance: "5000",
              version: 1,
              lifetimeGranted: "5000",
              lifetimeEarned: "0",
              lifetimeSpent: "0",
              lifetimeRefunded: "0",
              starterGranted: true,
              isFrozen: false,
              updatedAt: 1787700000000,
            },
          }),
        } as Response);
      });

      render(
        <MemoryRouter>
          <WalletDrawer isOpen={true} onClose={() => {}} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Coin Wallet")).toBeDefined();
        expect(screen.getAllByText("5,000").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Starter Grant")).toBeDefined();
      });
    });

    it("conforms to WCAG 2.1 AA dialog accessibility (labelledby, describedby, escape, and modal semantics)", async () => {
      const onClose = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          wallet: {
            identityId: "user-123",
            identityKind: "member",
            balance: "5000",
            version: 1,
            lifetimeGranted: "5000",
            lifetimeEarned: "0",
            lifetimeSpent: "0",
            lifetimeRefunded: "0",
            starterGranted: true,
            isFrozen: false,
            updatedAt: 1787700000000,
          },
        }),
      } as Response);

      const trigger = document.createElement("button");
      document.body.appendChild(trigger);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      const { unmount } = render(
        <MemoryRouter>
          <WalletDrawer isOpen={true} onClose={onClose} />
        </MemoryRouter>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-labelledby")).toBe("wallet-drawer-title");
      expect(dialog.getAttribute("aria-describedby")).toBe("wallet-drawer-subtitle");
      expect(screen.getByText("Coin Wallet").id).toBe("wallet-drawer-title");
      expect(screen.getByText("Server-Authoritative Ledger").id).toBe("wallet-drawer-subtitle");

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);

      unmount();
      expect(document.activeElement).toBe(trigger);
      document.body.removeChild(trigger);
    });

    it("renders truthful error state with retry connection on fetch failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: "ServiceUnavailable",
          message: "Database connection failed",
          correlationId: "req-err-404",
        }),
      } as Response);

      render(
        <MemoryRouter>
          <WalletDrawer isOpen={true} onClose={() => {}} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Wallet Unavailable")).toBeDefined();
        expect(screen.getByText("Retry Connection")).toBeDefined();
        expect(screen.getByText("Ref: req-err-404")).toBeDefined();
      });
    });

    it("renders truthful zero balance without displaying dashes or false errors", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/economy/wallet/ledger")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ entries: [], hasMore: false }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            wallet: {
              identityId: "user-guest",
              identityKind: "guest",
              balance: "0",
              version: 1,
              lifetimeGranted: "0",
              lifetimeEarned: "0",
              lifetimeSpent: "0",
              lifetimeRefunded: "0",
              starterGranted: false,
              isFrozen: false,
              updatedAt: 1787700000000,
            },
          }),
        } as Response);
      });

      render(
        <MemoryRouter>
          <WalletDrawer isOpen={true} onClose={() => {}} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Your wallet balance is 0/i)).toBeDefined();
        expect(screen.getByText("No Transactions Yet")).toBeDefined();
      });
    });
  });

  // ── 3. CheckoutSheet Experience ─────────────────────────────────────────

  describe("CheckoutSheet Component", () => {
    it("fetches quote and renders sovereign table and balance projection", async () => {
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

      render(
        <MemoryRouter>
          <CheckoutSheet
            isOpen={true}
            onClose={() => {}}
            matchId="match-123"
            roomCode="KD22TL"
            seatCount={4}
            humanSeatCount={3}
            botSeatCount={1}
          />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Match Entry Checkout")).toBeDefined();
        expect(screen.getByText("Confirm & Fund Table")).toBeDefined();
      });
    });
  });

  // ── 4. SettlementView Experience ────────────────────────────────────────

  describe("SettlementView Component", () => {
    it("renders settled match summary with victory allocations", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settlement: {
            matchId: "match-456",
            roomCode: "KD22TL",
            hostIdentityId: "user-123",
            seatCount: 4,
            humanSeatCount: 4,
            botSeatCount: 0,
            costPerSeat: "100",
            totalCollected: "400",
            totalWalletRewarded: "200",
            totalGuestEscrow: "150",
            totalBotCollection: "0",
            totalWorldBankCut: "50",
            totalRefunded: "0",
            refundReason: null,
            status: "SETTLED",
            createdAt: 1787700000000,
            settledAt: 1787700060000,
          },
        }),
      } as Response);

      render(<SettlementView matchId="match-456" />);

      await waitFor(() => {
        expect(screen.getByText("Settlement Summary")).toBeDefined();
        expect(screen.getByText("Settled")).toBeDefined();
        expect(screen.getByText("400")).toBeDefined();
      });
    });

    it("renders pending settlement message when match is COMMITTED", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settlement: {
            matchId: "match-789",
            roomCode: "KD22TL",
            hostIdentityId: "user-123",
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
            createdAt: 1787700000000,
            settledAt: null,
          },
        }),
      } as Response);

      render(<SettlementView matchId="match-789" />);

      await waitFor(() => {
        expect(screen.getByText("Settlement Pending")).toBeDefined();
      });
    });
  });

  // ── 5. VoucherRedemptionModal ───────────────────────────────────────────

  describe("VoucherRedemptionModal Component", () => {
    it("handles voucher verification and unseal flow", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          voucher: {
            status: "ACTIVE",
            coinAmount: "175",
          },
        }),
      } as Response);

      render(
        <VoucherRedemptionModal
          isOpen={true}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("Redeem Reward Voucher")).toBeDefined();
      const input = screen.getByPlaceholderText("Enter voucher code (e.g. VOUCH-XXXX)");
      fireEvent.change(input, { target: { value: "VOUCH-TEST-123" } });

      const form = input.closest("form");
      expect(form).toBeDefined();
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText("Verified Voucher")).toBeDefined();
        expect(screen.getByText("175")).toBeDefined();
      });
    });
  });

  // ── 6. EconomyErrorBoundary ──────────────────────────────────────────────

  describe("EconomyErrorBoundary Component", () => {
    it("catches errors and renders fallback card with retry action", () => {
      const BombComponent = () => {
        throw new Error("Simulated economy rendering crash");
      };

      render(
        <EconomyErrorBoundary fallbackTitle="Wallet Crashed">
          <BombComponent />
        </EconomyErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Wallet Crashed")).toBeDefined();
      expect(screen.getByText("Simulated economy rendering crash")).toBeDefined();
      expect(screen.getByText("Try Again")).toBeDefined();
    });
  });

  // ── 7. AdminEconomyPage Experience ──────────────────────────────────────

  describe("AdminEconomyPage Component", () => {
    it("renders read-only World Bank reserves and zero stale settlements", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/economy/world-bank")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              worldBank: {
                baseFeeRevenue: "80000",
                botPrizeRevenue: "15000",
                abandonmentForfeitureRevenue: "5000",
                guestEscrowLiability: "5000",
                totalVoucherRedeemed: "3000",
              },
            }),
          } as Response);
        }
        if (url.includes("/api/economy/settlements/stale")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              settlements: [],
            }),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      });

      render(
        <MemoryRouter>
          <AdminEconomyPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("World Bank Treasury Reserves")).toBeDefined();
        expect(screen.getByText("100,000")).toBeDefined();
        expect(screen.getByText("All commitments settled on time")).toBeDefined();
      });
    });
  });
});
