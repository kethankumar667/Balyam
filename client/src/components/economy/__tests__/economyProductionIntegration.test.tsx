import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  useEconomyMotion,
  useElementAnchor,
  EconomyMotionOrchestrator,
  SettlementView,
} from "../index";
import * as economyApi from "../../../lib/economyApi";

vi.mock("../../../lib/economyApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/economyApi")>();
  return {
    ...actual,
    getMatchSettlement: vi.fn(),
  };
});

describe("Economy Motion Production Integration Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  // ── 1. Real Authoritative Event Mapping ───────────────────────────────────

  describe("Authoritative Event Mapping & Non-Optimistic Execution", () => {
    function HostMatchHarness({ onHookReady }: { onHookReady: (h: ReturnType<typeof useEconomyMotion>) => void }) {
      const motion = useEconomyMotion();
      onHookReady(motion);
      return (
        <div>
          <div id="host-wallet-chip" data-testid="wallet">5,000</div>
          <div id="table-pot-target" data-testid="pot">Table</div>
          <EconomyMotionOrchestrator
            phase={motion.phase}
            commitment={motion.activeCommitment}
            settlement={motion.activeSettlement}
            refund={motion.activeRefund}
            escrow={motion.activeEscrow}
          />
        </div>
      );
    }

    it("displays neutral anticipation state without deducting coins or firing particle flight while awaiting authority", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<HostMatchHarness onHookReady={(h) => { motion = h; }} />);

      expect(motion.phase).toBe("idle");

      // Host clicks start match
      act(() => {
        motion.startAwaitingAuthority();
      });

      expect(motion.phase).toBe("awaiting_authority");
      // Screen reader announces authorization in progress
      expect(screen.getByRole("status").textContent).toContain("Authorizing match entry...");
      // Wallet text remains unchanged
      expect(screen.getByTestId("wallet").textContent).toBe("5,000");
    });

    it("triggers full commitment motion only upon authoritative server ACK with valid payload", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<HostMatchHarness onHookReady={(h) => { motion = h; }} />);

      act(() => {
        motion.startAwaitingAuthority();
      });

      // Server returns authoritative confirmation
      act(() => {
        motion.triggerCommitmentSequence({
          sequenceId: "server-match-commit-001",
          matchId: "match-auth-100",
          amountPerSeat: "100",
          totalPotAmount: "400",
          seats: [
            { seatId: "s1", seatNumber: 1, name: "Host", isHost: true, isSelf: true },
            { seatId: "s2", seatNumber: 2, name: "Player 2" },
          ],
        });
      });

      expect(motion.phase).toBe("commitment_confirmed");
      expect(screen.getByRole("status").textContent).toContain("Match entry of 100 coins confirmed.");

      // Advance through flights
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(motion.phase).toBe("coins_departing");

      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(motion.phase).toBe("pot_formed");
      expect(screen.getByRole("status").textContent).toContain("Prize pool formed with 400 coins.");
    });
  });

  // ── 2. Idempotency & Duplicate Suppression ────────────────────────────────

  describe("Idempotency, Reconnect & Rematch Isolation", () => {
    function LifecycleHarness({ onHookReady }: { onHookReady: (h: ReturnType<typeof useEconomyMotion>) => void }) {
      const motion = useEconomyMotion();
      onHookReady(motion);
      return <div data-testid="phase-view">{motion.phase}</div>;
    }

    it("suppresses duplicate socket delivery for already processed sequenceId", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<LifecycleHarness onHookReady={(h) => { motion = h; }} />);

      const payload = {
        sequenceId: "stable-tx-12345",
        matchId: "match-01",
        amountPerSeat: "100",
        totalPotAmount: "200",
        seats: [],
      };

      act(() => {
        motion.triggerCommitmentSequence(payload);
      });
      expect(motion.phase).toBe("commitment_confirmed");

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(motion.phase).toBe("complete");

      // Duplicate delivery over socket reconnect
      act(() => {
        motion.triggerCommitmentSequence(payload);
      });
      expect(motion.phase).toBe("complete"); // Suppressed!
    });

    it("allows a subsequent match or rematch with a distinct sequenceId", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<LifecycleHarness onHookReady={(h) => { motion = h; }} />);

      act(() => {
        motion.triggerCommitmentSequence({
          sequenceId: "match-round-1",
          matchId: "match-01",
          amountPerSeat: "100",
          totalPotAmount: "200",
          seats: [],
        });
      });

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(motion.phase).toBe("complete");

      // Rematch round 2 arrives with new sequenceId
      act(() => {
        motion.triggerCommitmentSequence({
          sequenceId: "match-round-2",
          matchId: "match-02",
          amountPerSeat: "100",
          totalPotAmount: "200",
          seats: [],
        });
      });
      expect(motion.phase).toBe("commitment_confirmed"); // Accepted!
    });
  });

  // ── 3. Coordinate Anchoring & Missing Fallbacks ───────────────────────────

  describe("useElementAnchor DOM Tracking", () => {
    function AnchorTestComponent({ id }: { id?: string }) {
      const point = useElementAnchor({ elementId: id });
      return (
        <div data-testid="coords">
          {point.x},{point.y}
        </div>
      );
    }

    it("returns viewport fallback gracefully when target DOM element is missing or unmounted", () => {
      render(<AnchorTestComponent id="non-existent-dom-id" />);
      const coords = screen.getByTestId("coords").textContent;
      expect(coords).toBeDefined();
      expect(coords?.split(",").length).toBe(2);
    });
  });

  // ── 4. Authoritative Settlement Integration ───────────────────────────────

  describe("SettlementView Production Motion Integration", () => {
    it("renders RefundSequence with calm sky styling on authoritative REFUNDED record", async () => {
      vi.mocked(economyApi.getMatchSettlement).mockResolvedValueOnce({
        settlement: {
          matchId: "match-refund-001",
          roomCode: "TEST01",
          hostIdentityId: "host-001",
          seatCount: 2,
          humanSeatCount: 2,
          botSeatCount: 0,
          costPerSeat: "100",
          status: "REFUNDED",
          totalCollected: "200",
          totalWalletRewarded: "0",
          totalGuestEscrow: "0",
          totalBotCollection: "0",
          totalWorldBankCut: "0",
          totalRefunded: "200",
          refundReason: "Opponent left table before round started.",
          createdAt: 1724716800000,
          settledAt: 1724716860000,
        },
      });

      render(<SettlementView matchId="match-refund-001" />);

      // Wait for async fetch
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Match Entry Refunded")).toBeDefined();
      expect(screen.getByText("Opponent left table before round started.")).toBeDefined();
      expect(screen.getByText("+200")).toBeDefined();
    });

    it("renders SettlementSequence with verified payouts on authoritative SETTLED record", async () => {
      vi.mocked(economyApi.getMatchSettlement).mockResolvedValueOnce({
        settlement: {
          matchId: "match-settle-001",
          roomCode: "TEST02",
          hostIdentityId: "host-002",
          seatCount: 4,
          humanSeatCount: 4,
          botSeatCount: 0,
          costPerSeat: "100",
          status: "SETTLED",
          totalCollected: "400",
          totalWalletRewarded: "360",
          totalGuestEscrow: "0",
          totalBotCollection: "0",
          totalWorldBankCut: "40",
          totalRefunded: "0",
          refundReason: null,
          createdAt: 1724716800000,
          settledAt: 1724717100000,
        },
      });

      render(<SettlementView matchId="match-settle-001" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Prize Distribution Complete")).toBeDefined();
      expect(screen.getByText("400 Coins")).toBeDefined();
      expect(screen.getByText("40 coins")).toBeDefined();
    });
  });
});
