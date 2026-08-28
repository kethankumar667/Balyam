import { describe, it, expect } from "vitest";
import { deriveLobbyEconomyPreview, deriveLobbyLockPhase } from "../lobbyEconomy";
import type { MatchCheckoutQuote } from "../economyApi";

function makeQuote(overrides: Partial<MatchCheckoutQuote> = {}): MatchCheckoutQuote {
  return {
    seatCount: 4,
    humanSeatCount: 3,
    botSeatCount: 1,
    costPerSeat: "100",
    totalCommitment: "400",
    prizeDistribution: { firstPlace: "175", secondPlace: "125", thirdPlace: "50" },
    worldBankContribution: "50",
    hostBalance: "5000",
    projectedBalance: "4600",
    hasSufficientFunds: true,
    shortfall: null,
    configurationVersion: 1,
    ...overrides,
  };
}

describe("deriveLobbyEconomyPreview — no fabrication, server quote is the only source", () => {
  it("passes through the authoritative quote verbatim when one is available", () => {
    const quote = makeQuote();
    const preview = deriveLobbyEconomyPreview(quote, false);

    expect(preview.status).toBe("available");
    expect(preview.costPerSeat).toBe("100");
    expect(preview.totalPot).toBe("400");
    expect(preview.firstPlace).toBe("175");
    expect(preview.secondPlace).toBe("125");
    expect(preview.thirdPlace).toBe("50");
    expect(preview.worldBankCut).toBe("50");
  });

  it("never invents a total when the quote's own totalCommitment changes — it only reflects what the server sent", () => {
    // Regression guard for the original defect: this must NOT recompute
    // seatCount * 100 or any other local formula. A quote with a
    // deliberately "unusual" totalCommitment (not seatCount * 100) proves
    // the function has no hardcoded arithmetic of its own.
    const quote = makeQuote({ seatCount: 4, totalCommitment: "999" });
    const preview = deriveLobbyEconomyPreview(quote, false);
    expect(preview.totalPot).toBe("999");
  });

  it("reports loading (not a guessed value) while a quote is in flight", () => {
    const preview = deriveLobbyEconomyPreview(null, true);
    expect(preview.status).toBe("loading");
    expect(preview.totalPot).toBeNull();
    expect(preview.firstPlace).toBeNull();
  });

  it("reports unavailable — never a fabricated schedule — when no quote exists for this seat count", () => {
    // This is the exact shape quoteMatchCheckout's UnsupportedSeatCountError
    // produces client-side: no quote, not loading.
    const preview = deriveLobbyEconomyPreview(null, false);
    expect(preview.status).toBe("unavailable");
    expect(preview.costPerSeat).toBeNull();
    expect(preview.totalPot).toBeNull();
    expect(preview.firstPlace).toBeNull();
    expect(preview.secondPlace).toBeNull();
    expect(preview.thirdPlace).toBeNull();
    expect(preview.worldBankCut).toBeNull();
  });

  it("reports unavailable for a seat count beyond the approved 1-5 schedule range, exactly like any other missing quote", () => {
    // There is deliberately no seatCount parameter on this function at all
    // — it cannot special-case "seats > 5" because it has no seat-count
    // branching logic of any kind left. A 6+ seat table simply never gets
    // a quote from the server, and this renders that as "unavailable" the
    // same way it would for any other missing quote.
    const preview = deriveLobbyEconomyPreview(null, false);
    expect(preview.status).toBe("unavailable");
  });
});

describe("deriveLobbyLockPhase — locked requires confirmed success, not a click", () => {
  it("is idle when nothing has happened yet", () => {
    expect(deriveLobbyLockPhase(false, "WAITING_FOR_PLAYERS")).toBe("idle");
    expect(deriveLobbyLockPhase(false, "READY_CHECK")).toBe("idle");
    expect(deriveLobbyLockPhase(false, undefined)).toBe("idle");
    expect(deriveLobbyLockPhase(false, null)).toBe("idle");
  });

  it("is securing (pending) while a commit is in flight but NOT yet confirmed", () => {
    expect(deriveLobbyLockPhase(false, "STARTING")).toBe("securing");
  });

  it("is locked ONLY once the server has confirmed the commit — currentMatchId populated", () => {
    expect(deriveLobbyLockPhase(true, "STARTING")).toBe("locked");
  });

  it("stays locked even if lifecycleState has already moved past STARTING, as long as currentMatchId is still set", () => {
    // Mirrors the real sequence: commit succeeds, currentMatchId is set,
    // then startGame() moves lifecycleState on to IN_PROGRESS/other states
    // while the match plays. The lock indicator must not flicker off.
    expect(deriveLobbyLockPhase(true, "IN_PROGRESS")).toBe("locked");
  });

  it("never reports locked from lifecycleState alone, with no confirmed match id — the original defect", () => {
    // This is the exact scenario the audit failed: lifecycleState is
    // "STARTING" the instant Start Game is clicked, before commitMatchEntry
    // has resolved. hasConfirmedMatchId is false at that moment.
    const phase = deriveLobbyLockPhase(false, "STARTING");
    expect(phase).not.toBe("locked");
    expect(phase).toBe("securing");
  });
});
