import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LobbyPrizePool } from "../LobbyPrizePool";
import type { MatchCheckoutQuote } from "../../../lib/economyApi";

function makeQuote(overrides: Partial<MatchCheckoutQuote> = {}): MatchCheckoutQuote {
  return {
    seatCount: 2,
    humanSeatCount: 2,
    botSeatCount: 0,
    costPerSeat: "100",
    totalCommitment: "200",
    prizeDistribution: { firstPlace: "150", secondPlace: "0", thirdPlace: "0" },
    worldBankContribution: "50",
    hostBalance: "5000",
    projectedBalance: "4800",
    hasSufficientFunds: true,
    shortfall: null,
    configurationVersion: 1,
    ...overrides,
  };
}

describe("LobbyPrizePool Component (Phase 7F)", () => {
  it("renders the authoritative server quote for 2 seats — never a locally computed value", () => {
    render(<LobbyPrizePool seatCount={2} readyCount={1} allReady={false} quote={makeQuote()} />);

    expect(screen.getByText(/MATCH PRIZE POOL/i)).toBeDefined();
    expect(screen.getByText("200")).toBeDefined();
    expect(screen.getByText("1/2 Ready")).toBeDefined();
    expect(screen.getByLabelText("First place prize: 150 coins")).toBeDefined();
  });

  it("updates to whatever the NEW quote says when seat count changes — proves it never recomputes locally", () => {
    const { rerender } = render(
      <LobbyPrizePool seatCount={2} readyCount={1} allReady={false} quote={makeQuote()} />,
    );
    expect(screen.getByText("200")).toBeDefined();

    rerender(
      <LobbyPrizePool
        seatCount={4}
        readyCount={3}
        allReady={false}
        quote={makeQuote({
          seatCount: 4,
          totalCommitment: "400",
          prizeDistribution: { firstPlace: "175", secondPlace: "125", thirdPlace: "50" },
          worldBankContribution: "50",
        })}
      />,
    );
    expect(screen.getByText("400")).toBeDefined();
    expect(screen.getByText("3/4 Ready")).toBeDefined();
    expect(screen.getByLabelText("First place prize: 175 coins")).toBeDefined();
    expect(screen.getByLabelText("Second place prize: 125 coins")).toBeDefined();
    expect(screen.getByLabelText("Third place prize: 50 coins")).toBeDefined();
    expect(screen.getByLabelText("Platform reserve cut: 50 coins")).toBeDefined();
  });

  it("displays ALL READY state when all players are ready", () => {
    render(<LobbyPrizePool seatCount={3} readyCount={3} allReady={true} quote={makeQuote({ seatCount: 3 })} />);

    expect(screen.getByText(/ALL READY/i)).toBeDefined();
    expect(screen.getByText("All players ready for launch")).toBeDefined();
  });

  it("shows UNAVAILABLE — never a fabricated number — when no quote exists (e.g. unsupported seat count)", () => {
    render(<LobbyPrizePool seatCount={7} readyCount={2} allReady={false} quote={null} isQuoteLoading={false} />);

    expect(screen.getAllByText(/UNAVAILABLE/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/No approved payout schedule/i)).toBeDefined();
    expect(screen.queryByLabelText(/First place prize/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Toggle prize schedule breakdown/i })).toBeNull();
  });

  it("shows a loading state, not a stale or invented number, while the quote is in flight", () => {
    render(<LobbyPrizePool seatCount={2} readyCount={0} allReady={false} quote={null} isQuoteLoading={true} />);

    expect(screen.queryByText(/UNAVAILABLE/i)).toBeNull();
    expect(screen.queryByText("200")).toBeNull();
  });

  it("shows SECURING TABLE (pending), not LOCKED, while a commit is in flight but not yet confirmed", () => {
    render(
      <LobbyPrizePool seatCount={4} readyCount={4} allReady={true} quote={makeQuote({ seatCount: 4, totalCommitment: "400" })} lockPhase="securing" />,
    );

    expect(screen.getAllByText(/Securing Table/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Confirming table commitment/i)).toBeDefined();
    expect(screen.queryByText(/Locked In Play/i)).toBeNull();
    expect(screen.queryByText("Authoritative table stakes secured")).toBeNull();
  });

  it("displays LOCKED IN PLAY only once lockPhase is explicitly 'locked' (caller-confirmed success)", () => {
    render(
      <LobbyPrizePool seatCount={4} readyCount={4} allReady={true} quote={makeQuote({ seatCount: 4, totalCommitment: "400" })} lockPhase="locked" />,
    );

    expect(screen.getByText(/Locked In Play/i)).toBeDefined();
    expect(screen.getByText("Authoritative table stakes secured")).toBeDefined();
  });

  it("renders host sponsorship note using the quote's own totalCommitment when isHost is true", () => {
    render(
      <LobbyPrizePool seatCount={4} readyCount={2} allReady={false} isHost={true} quote={makeQuote({ seatCount: 4, totalCommitment: "400" })} />,
    );

    expect(screen.getByText(/Host sponsors table commitment/i)).toBeDefined();
    expect(screen.getByText("🪙 400")).toBeDefined();
  });

  it("toggles payout details breakdown when Payouts button is clicked", () => {
    render(<LobbyPrizePool seatCount={4} readyCount={2} allReady={false} quote={makeQuote({ seatCount: 4, totalCommitment: "400" })} />);

    const payoutsBtn = screen.getByRole("button", { name: /Toggle prize schedule breakdown/i });
    expect(payoutsBtn).toBeDefined();

    fireEvent.click(payoutsBtn);
    expect(payoutsBtn.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(payoutsBtn);
    expect(payoutsBtn.getAttribute("aria-expanded")).toBe("false");
  });

  it("provides screen reader polite live region announcements for every state, including securing and unavailable", () => {
    const { container, rerender } = render(
      <LobbyPrizePool seatCount={2} readyCount={1} allReady={false} quote={makeQuote()} />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toContain("Table prize pool is currently 200 coins for 2 seats. 1 of 2 players ready.");

    rerender(<LobbyPrizePool seatCount={4} readyCount={4} allReady={true} quote={makeQuote({ seatCount: 4, totalCommitment: "400" })} />);
    expect(liveRegion?.textContent).toContain("All 4 players are ready. Projected match prize pool is 400 coins.");

    rerender(
      <LobbyPrizePool seatCount={4} readyCount={4} allReady={true} quote={makeQuote({ seatCount: 4, totalCommitment: "400" })} lockPhase="securing" />,
    );
    expect(liveRegion?.textContent).toContain("Securing table commitment");

    rerender(
      <LobbyPrizePool seatCount={4} readyCount={4} allReady={true} quote={makeQuote({ seatCount: 4, totalCommitment: "400" })} lockPhase="locked" />,
    );
    expect(liveRegion?.textContent).toContain("Match prize pool locked at 400 coins. Starting game.");

    rerender(<LobbyPrizePool seatCount={7} readyCount={0} allReady={false} quote={null} isQuoteLoading={false} />);
    expect(liveRegion?.textContent).toContain("unavailable");
  });
});
