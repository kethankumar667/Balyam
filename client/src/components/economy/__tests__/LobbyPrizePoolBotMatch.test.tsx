import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LobbyPrizePool } from "../LobbyPrizePool";
import type { MatchCheckoutQuote } from "../../../lib/economyApi";

function makeBotPracticeQuote(overrides: Partial<MatchCheckoutQuote> = {}): MatchCheckoutQuote {
  return {
    seatCount: 8,
    humanSeatCount: 1,
    botSeatCount: 7,
    costPerSeat: "0",
    totalCommitment: "0",
    prizeDistribution: { firstPlace: "0", secondPlace: "0", thirdPlace: "0" },
    worldBankContribution: "0",
    hostBalance: "5000",
    projectedBalance: "5000",
    hasSufficientFunds: true,
    shortfall: null,
    configurationVersion: 1,
    ...overrides,
  };
}

describe("LobbyPrizePool — Bot Practice Match (Free Economy Rule)", () => {
  it("renders Bot Practice Table and Free (0 Coins) with no coin charges for host + 7 bots", () => {
    render(
      <LobbyPrizePool
        seatCount={8}
        readyCount={8}
        allReady={true}
        quote={makeBotPracticeQuote()}
        isHost={true}
      />
    );

    expect(screen.getByText("Bot Practice Table")).toBeDefined();
    expect(screen.getByText("Free practice against AI bots · No coins charged")).toBeDefined();
    expect(screen.getByText("Free (0 Coins)")).toBeDefined();
    expect(screen.getByText("Free Play · 8/8 Ready")).toBeDefined();
    expect(
      screen.getByText("Playing with bots is free — no coins will be deducted from your wallet.")
    ).toBeDefined();
  });
});
