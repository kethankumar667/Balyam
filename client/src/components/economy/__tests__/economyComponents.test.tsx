import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CoinAmount,
  formatCoinString,
  CoinDelta,
  WalletBalanceChip,
  EconomyActionButton,
  EconomyStatusBanner,
  CheckoutLineItem,
  PrizeDistribution,
  WorldBankContribution,
  BalancePreview,
  CeremonialSeatRing,
  EconomySkeleton,
} from "../index";

describe("Economy V1 Presentational Components Suite", () => {
  // ── 1. CoinAmount & BigInt String Precision ─────────────────────────────

  describe("CoinAmount & formatCoinString", () => {
    it("formats standard integer strings with thousands commas using pure string formatting", () => {
      expect(formatCoinString("5000")).toBe("5,000");
      expect(formatCoinString("150")).toBe("150");
      expect(formatCoinString("0")).toBe("0");
      expect(formatCoinString("")).toBe("0");
      expect(formatCoinString("---")).toBe("---");
      expect(formatCoinString(null)).toBe("---");
      expect(formatCoinString(undefined)).toBe("---");
    });

    it("renders Number.MAX_SAFE_INTEGER + 1 without floating-point precision loss", () => {
      // 9007199254740993 in float loses precision to 9007199254740992
      const unsafeJsInt = "9007199254740993";
      expect(formatCoinString(unsafeJsInt)).toBe("9,007,199,254,740,993");

      render(<CoinAmount amount={unsafeJsInt} />);
      expect(screen.getByText("9,007,199,254,740,993")).toBeDefined();
    });

    it("renders PostgreSQL 64-bit BIGINT_MAX exactly without truncation", () => {
      const bigintMax = "9223372036854775807";
      expect(formatCoinString(bigintMax)).toBe("9,223,372,036,854,775,807");

      render(<CoinAmount amount={bigintMax} />);
      expect(screen.getByText("9,223,372,036,854,775,807")).toBeDefined();
    });

    it("handles negative amounts cleanly", () => {
      expect(formatCoinString("-400")).toBe("-400");
      expect(formatCoinString("-12500")).toBe("-12,500");

      render(<CoinAmount amount="-400" />);
      expect(screen.getByText("-400")).toBeDefined();
    });

    it("provides accessible aria-label on coin container", () => {
      render(<CoinAmount amount="2000" />);
      const el = screen.getByLabelText("2,000 coins");
      expect(el).toBeDefined();
    });
  });

  // ── 2. CoinDelta & Color-Blind Safety ────────────────────────────────────

  describe("CoinDelta", () => {
    it("renders explicit text badge alongside color (Color Independence)", () => {
      const { rerender } = render(<CoinDelta delta="+150" type="CREDIT" />);
      expect(screen.getByText("CREDIT")).toBeDefined();
      expect(screen.getByText("+150")).toBeDefined();
      expect(screen.getByLabelText("Credit of 150 coins")).toBeDefined();

      rerender(<CoinDelta delta="-500" type="DEBIT" />);
      expect(screen.getByText("DEBIT")).toBeDefined();
      expect(screen.getByText("-500")).toBeDefined();
      expect(screen.getByLabelText("Debit of 500 coins")).toBeDefined();

      rerender(<CoinDelta delta="150" type="ESCROW" />);
      expect(screen.getByText("ESCROW")).toBeDefined();
      expect(screen.getByLabelText("Escrow voucher of 150 coins")).toBeDefined();

      rerender(<CoinDelta delta="+500" type="REFUND" />);
      expect(screen.getByText("REFUND")).toBeDefined();
      expect(screen.getByLabelText("Refund of 500 coins")).toBeDefined();
    });
  });

  // ── 3. WalletBalanceChip ─────────────────────────────────────────────────

  describe("WalletBalanceChip", () => {
    it("renders balance string and responds to keyboard Enter and Space", () => {
      const onClick = vi.fn();
      render(<WalletBalanceChip balance="5000" onClick={onClick} isMember={true} />);

      const chip = screen.getByRole("button");
      expect(chip.getAttribute("tabindex")).toBe("0");
      expect(screen.getByText("5,000")).toBeDefined();
      expect(screen.getByText("VIP")).toBeDefined();

      fireEvent.keyDown(chip, { key: "Enter" });
      expect(onClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(chip, { key: " " });
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it("renders loading skeleton with aria-busy", () => {
      render(<WalletBalanceChip balance="0" isLoading={true} />);
      const skeleton = screen.getByLabelText("Loading coin balance");
      expect(skeleton).toBeDefined();
      expect(skeleton.querySelector("[aria-busy='true']")).not.toBeNull();
    });
  });

  // ── 4. EconomyActionButton (UI State Semantics) ──────────────────────────

  describe("EconomyActionButton", () => {
    it("handles click events and UI states (idle, disabled, loading, success, error)", () => {
      const onClick = vi.fn();
      const { rerender } = render(
        <EconomyActionButton state="idle" onClick={onClick}>
          Confirm Entry
        </EconomyActionButton>
      );

      const btn = screen.getByRole("button", { name: "Confirm Entry" });
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);

      // Disabled state
      rerender(
        <EconomyActionButton state="disabled" onClick={onClick}>
          Confirm Entry
        </EconomyActionButton>
      );
      expect(btn.hasAttribute("disabled")).toBe(true);
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);

      // Loading state with aria-busy
      rerender(
        <EconomyActionButton state="loading" onClick={onClick}>
          Starting...
        </EconomyActionButton>
      );
      expect(btn.getAttribute("aria-busy")).toBe("true");
      expect(btn.hasAttribute("disabled")).toBe(true);

      // Success state
      rerender(
        <EconomyActionButton state="success">
          Success ✓
        </EconomyActionButton>
      );
      expect(btn.hasAttribute("disabled")).toBe(true);
      expect(screen.getByText("Success ✓")).toBeDefined();

      // Error state
      rerender(
        <EconomyActionButton state="error" onClick={onClick}>
          Retry Payment
        </EconomyActionButton>
      );
      expect(btn.hasAttribute("disabled")).toBe(false);
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  // ── 5. EconomyStatusBanner ───────────────────────────────────────────────

  describe("EconomyStatusBanner", () => {
    it("renders with appropriate ARIA alert and status roles", () => {
      const { rerender } = render(
        <EconomyStatusBanner
          status="insufficient_funds"
          title="Insufficient Balance"
          description="You need 250 more coins."
        />
      );

      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Insufficient Balance")).toBeDefined();
      expect(screen.getByText("You need 250 more coins.")).toBeDefined();

      rerender(
        <EconomyStatusBanner
          status="pending"
          title="Settlement Pending"
          description="Distribution is being recorded."
        />
      );
      expect(screen.getByRole("status")).toBeDefined();
    });
  });

  // ── 6. CheckoutLineItem & PrizeDistribution ──────────────────────────────

  describe("CheckoutLineItem & PrizeDistribution", () => {
    it("renders itemized checkout calculations with string amounts", () => {
      render(
        <CheckoutLineItem
          label="Room Entry Seats"
          sublabel="4 Seats × 100 Coins"
          amount="400"
          isTotal={true}
        />
      );
      expect(screen.getByText("Room Entry Seats")).toBeDefined();
      expect(screen.getByText("4 Seats × 100 Coins")).toBeDefined();
      expect(screen.getByText("400")).toBeDefined();
    });

    it("renders 4-seat prize schedule with World Bank cut", () => {
      render(
        <PrizeDistribution
          seatCount={4}
          firstPlace="175"
          secondPlace="125"
          thirdPlace="50"
          worldBankCut="50"
        />
      );
      expect(screen.getByText("Prize Distribution (4 Seats)")).toBeDefined();
      expect(screen.getByText("175")).toBeDefined();
      expect(screen.getByText("125")).toBeDefined();
      expect(screen.getByLabelText("Third place prize: 50 coins")).toBeDefined();
      expect(screen.getByLabelText("World bank cut: 50 coins")).toBeDefined();
      expect(screen.getByText("World Bank Reserve")).toBeDefined();
    });
  });

  // ── 7. WorldBankContribution ─────────────────────────────────────────────

  describe("WorldBankContribution", () => {
    it("renders protocol reserve line item with string amount", () => {
      render(<WorldBankContribution amount="50" showDescription={true} />);
      expect(screen.getByText("BHALYAM World Bank Reserve")).toBeDefined();
      expect(screen.getByLabelText("World bank contribution: 50 coins")).toBeDefined();
      expect(screen.getByText(/funds multiplayer room infrastructure/i)).toBeDefined();
    });
  });

  // ── 8. BalancePreview & Shortfall ────────────────────────────────────────

  describe("BalancePreview", () => {
    it("renders projection strip with strings and highlights shortfall on insufficient balance", () => {
      const { rerender } = render(
        <BalancePreview
          currentBalance="5000"
          totalCommitment="400"
          projectedBalance="4600"
          hasSufficientFunds={true}
        />
      );
      expect(screen.getByText("5,000")).toBeDefined();
      expect(screen.getByText("400")).toBeDefined();
      expect(screen.getByText("4,600")).toBeDefined();

      rerender(
        <BalancePreview
          currentBalance="150"
          totalCommitment="400"
          projectedBalance="-250"
          hasSufficientFunds={false}
          shortfall="250"
        />
      );
      expect(screen.getByText("Shortfall: 250 coins needed to fund this match.")).toBeDefined();
    });
  });

  // ── 9. CeremonialSeatRing (Consumer-Supplied Presentational Ring) ─────────

  describe("CeremonialSeatRing", () => {
    it("renders configured human and bot seats with central prize pot purely from consumer props", () => {
      render(
        <CeremonialSeatRing
          seatCount={4}
          humanCount={3}
          botCount={1}
          totalPotAmount="400"
          costPerSeat="100"
        />
      );
      expect(screen.getByText("Prize Pot")).toBeDefined();
      expect(screen.getByText("400")).toBeDefined();
      expect(screen.getByText("4 × 100")).toBeDefined();
      expect(screen.getByText("Host Funded (3 Humans)")).toBeDefined();
      expect(screen.getByText("1 Bots")).toBeDefined();
    });
  });

  // ── 10. EconomySkeleton (Loading Placeholders) ───────────────────────────

  describe("EconomySkeleton", () => {
    it("renders wallet, checkout, prize, voucher, and coin loading skeletons with aria-busy", () => {
      const { rerender } = render(<EconomySkeleton variant="wallet" />);
      expect(screen.getByLabelText("Loading economy data")).toBeDefined();

      rerender(<EconomySkeleton variant="checkout" />);
      expect(screen.getByLabelText("Loading economy data")).toBeDefined();

      rerender(<EconomySkeleton variant="prize" />);
      expect(screen.getByLabelText("Loading economy data")).toBeDefined();

      rerender(<EconomySkeleton variant="voucher" />);
      expect(screen.getByLabelText("Loading economy data")).toBeDefined();

      rerender(<EconomySkeleton variant="coin" />);
      expect(screen.getByLabelText("Loading economy data")).toBeDefined();
    });
  });
});
