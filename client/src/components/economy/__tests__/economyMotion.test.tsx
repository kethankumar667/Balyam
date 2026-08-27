import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  useEconomyMotion,
  PrizePot,
  SeatFundingPulse,
  GameStartSequence,
  SettlementSequence,
  RefundSequence,
  EscrowSequence,
  CoinTransferLayer,
  EconomyMotionOrchestrator,
  CoinFlight,
} from "../index";

describe("Economy Motion System Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  // ── 1. PrizePot Presentational Component ───────────────────────────────────

  describe("PrizePot component", () => {
    it("renders formatted BigInt string amount with accessible status label", () => {
      render(<PrizePot amount="400" label="Match Prize Pool" />);
      expect(screen.getByRole("status")).toBeDefined();
      expect(screen.getByText("400")).toBeDefined();
      expect(screen.getByText("Match Prize Pool")).toBeDefined();
    });

    it("renders safe large BigInt value without string distortion", () => {
      render(<PrizePot amount="900719925474099300" />);
      expect(screen.getByText("900,719,925,474,099,300")).toBeDefined();
    });

    it("displays committed badge when isCommitted is true", () => {
      render(<PrizePot amount="400" isCommitted={true} />);
      expect(screen.getByText("Pot Committed")).toBeDefined();
    });
  });

  // ── 2. SeatFundingPulse Component ──────────────────────────────────────────

  describe("SeatFundingPulse component", () => {
    it("renders child content and does not show delta when unfunded", () => {
      render(
        <SeatFundingPulse seatNumber={1} name="Alice" amount="100" isFunded={false}>
          <div data-testid="avatar">Avatar</div>
        </SeatFundingPulse>,
      );
      expect(screen.getByTestId("avatar")).toBeDefined();
      expect(screen.queryByText("-100")).toBeNull();
    });

    it("displays exact negative delta when funded for match entry", () => {
      render(
        <SeatFundingPulse seatNumber={1} name="Alice" amount="100" isFunded={true}>
          <div data-testid="avatar">Avatar</div>
        </SeatFundingPulse>,
      );
      expect(screen.getByText("-100")).toBeDefined();
      expect(screen.getByLabelText("Alice: -100 coins")).toBeDefined();
    });

    it("displays exact positive delta when marked as winner", () => {
      render(
        <SeatFundingPulse seatNumber={1} name="Alice" amount="360" isFunded={true} isWinner={true}>
          <div data-testid="avatar">Avatar</div>
        </SeatFundingPulse>,
      );
      expect(screen.getByText("+360")).toBeDefined();
      expect(screen.getByLabelText("Alice: +360 coins")).toBeDefined();
    });
  });

  // ── 3. Chapter 2: GameStartSequence ────────────────────────────────────────

  describe("GameStartSequence component", () => {
    it("renders countdown, game title, pot amount, and invokes onComplete after interval", () => {
      const onComplete = vi.fn();
      render(
        <GameStartSequence
          gameTitle="Hand Cricket"
          totalPotAmount="400"
          onComplete={onComplete}
        />,
      );

      expect(screen.getByText("Hand Cricket")).toBeDefined();
      expect(screen.getByText("Pot: 400 Coins")).toBeDefined();

      // Fast forward through countdown (3 -> 2 -> 1 -> 0 -> complete)
      act(() => {
        vi.advanceTimersByTime(2600);
      });

      expect(onComplete).toHaveBeenCalled();
    });
  });

  // ── 4. Chapter 3: SettlementSequence ───────────────────────────────────────

  describe("SettlementSequence component", () => {
    it("renders verified winner payouts and credit deltas", () => {
      const onComplete = vi.fn();
      render(
        <SettlementSequence
          payload={{
            sequenceId: "seq-1",
            matchId: "m-1",
            totalPotAmount: "400",
            winners: [
              { playerId: "p1", name: "Raju", payoutAmount: "360", isSelf: true },
            ],
            worldBankFeeAmount: "40",
          }}
          onComplete={onComplete}
        />,
      );

      expect(screen.getByText("Prize Distribution Complete")).toBeDefined();
      expect(screen.getByText("400 Coins")).toBeDefined();
      expect(screen.getByText("Raju (You)")).toBeDefined();
      expect(screen.getByText("+360")).toBeDefined();
      expect(screen.getByText("40 coins")).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onComplete).toHaveBeenCalled();
    });
  });

  // ── 5. Chapter 4: RefundSequence ───────────────────────────────────────────

  describe("RefundSequence component", () => {
    it("renders refund badge, sanitized reason, and restores wallet balance", () => {
      const onComplete = vi.fn();
      render(
        <RefundSequence
          payload={{
            sequenceId: "seq-2",
            matchId: "m-2",
            refundAmount: "100",
            reason: "Opponent disconnected prior to match start.",
          }}
          onComplete={onComplete}
        />,
      );

      expect(screen.getByText("Match Entry Refunded")).toBeDefined();
      expect(screen.getByText("Opponent disconnected prior to match start.")).toBeDefined();
      expect(screen.getByText("+100")).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(onComplete).toHaveBeenCalled();
    });
  });

  // ── 6. Chapter 5: EscrowSequence ───────────────────────────────────────────

  describe("EscrowSequence component", () => {
    it("renders guest escrow voucher amount without sending coins to wallet", () => {
      const onClaim = vi.fn();
      render(
        <EscrowSequence
          payload={{
            sequenceId: "seq-3",
            matchId: "m-3",
            voucherAmount: "360",
            voucherCode: "BH-ESCROW-001",
          }}
          onClaimVoucher={onClaim}
        />,
      );

      expect(screen.getByText("Winnings Secured in Escrow")).toBeDefined();
      expect(screen.getByText("360")).toBeDefined();
      expect(screen.getByText("Create Account to Claim Coins")).toBeDefined();
    });
  });

  // ── 7. useEconomyMotion State Machine ──────────────────────────────────────

  describe("useEconomyMotion hook", () => {
    function TestMotionComponent({ onHookReady }: { onHookReady: (hook: ReturnType<typeof useEconomyMotion>) => void }) {
      const hook = useEconomyMotion();
      onHookReady(hook);
      return <div data-testid="phase">{hook.phase}</div>;
    }

    it("starts in idle phase and stays awaiting_authority without deducting coins while pending", () => {
      let hookRef!: ReturnType<typeof useEconomyMotion>;
      render(<TestMotionComponent onHookReady={(h) => { hookRef = h; }} />);

      expect(hookRef.phase).toBe("idle");

      act(() => {
        hookRef.startAwaitingAuthority();
      });
      expect(hookRef.phase).toBe("awaiting_authority");
      expect(hookRef.activeCommitment).toBeNull();
    });

    it("advances through commitment sequence only on authoritative confirmation", () => {
      let hookRef!: ReturnType<typeof useEconomyMotion>;
      render(<TestMotionComponent onHookReady={(h) => { hookRef = h; }} />);

      act(() => {
        hookRef.triggerCommitmentSequence({
          sequenceId: "seq-commit-1",
          matchId: "match-1",
          amountPerSeat: "100",
          totalPotAmount: "400",
          seats: [{ seatId: "s1", seatNumber: 1, name: "Alice", isHost: true, isSelf: true }],
        });
      });

      expect(hookRef.phase).toBe("commitment_confirmed");

      // Advance to coins departing
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(hookRef.phase).toBe("coins_departing");

      // Advance to seats funded
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(hookRef.phase).toBe("seats_funded");

      // Advance to pot formed
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(hookRef.phase).toBe("pot_formed");

      // Advance to game starting
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(hookRef.phase).toBe("game_starting");

      // Advance to complete
      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(hookRef.phase).toBe("complete");
    });

    it("suppresses duplicate sequence triggers via idempotency key", () => {
      let hookRef!: ReturnType<typeof useEconomyMotion>;
      render(<TestMotionComponent onHookReady={(h) => { hookRef = h; }} />);

      const payload = {
        sequenceId: "seq-idempotent-1",
        matchId: "match-1",
        amountPerSeat: "100",
        totalPotAmount: "400",
        seats: [],
      };

      act(() => {
        hookRef.triggerCommitmentSequence(payload);
      });
      expect(hookRef.phase).toBe("commitment_confirmed");

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(hookRef.phase).toBe("complete");

      // Re-triggering identical sequence should be suppressed
      act(() => {
        hookRef.triggerCommitmentSequence(payload);
      });
      expect(hookRef.phase).toBe("complete"); // Did not reset to commitment_confirmed
    });

    it("handles failure cancellation gracefully and resets to idle", () => {
      let hookRef!: ReturnType<typeof useEconomyMotion>;
      render(<TestMotionComponent onHookReady={(h) => { hookRef = h; }} />);

      act(() => {
        hookRef.startAwaitingAuthority();
      });
      expect(hookRef.phase).toBe("awaiting_authority");

      act(() => {
        hookRef.cancelMotion("Insufficient balance");
      });
      expect(hookRef.phase).toBe("failed");
      expect(hookRef.errorMessage).toBe("Insufficient balance");

      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(hookRef.phase).toBe("idle");
    });
  });

  // ── 8. EconomyMotionOrchestrator Accessibility ─────────────────────────────

  describe("EconomyMotionOrchestrator Component", () => {
    it("renders screen-reader live announcement for current economy phase", () => {
      render(
        <EconomyMotionOrchestrator
          phase="commitment_confirmed"
          commitment={{
            sequenceId: "seq-ann-1",
            matchId: "m-1",
            amountPerSeat: "100",
            totalPotAmount: "400",
            seats: [],
          }}
        />,
      );

      const statusEl = screen.getByRole("status");
      expect(statusEl.textContent).toContain("Match entry of 100 coins confirmed.");
    });
  });
});
