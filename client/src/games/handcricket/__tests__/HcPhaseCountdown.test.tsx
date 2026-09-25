import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HcState } from "@shared/types";
import { HcPhaseCountdown } from "../HcPhaseCountdown";

function state(phase: HcState["phase"], turnDeadline: number | null): HcState {
  return {
    kind: "handcricket",
    phase,
    playerOrder: ["p0", "p1"],
    options: {
      format: "t20",
      mode: "single",
      category: "international",
    },
    teamSelections: { p0: null, p1: null },
    tossCallerId: "p0",
    tossCall: null,
    tossPicks: { p0: null, p1: null },
    tossSum: null,
    tossWinnerId: null,
    innings1: null,
    innings2: null,
    pendingPicks: { p0: null, p1: null },
    winnerId: null,
    result: null,
    maxWickets: 10,
    inningsBreakUntil: null,
    inningsBreakReady: [],
    oversPerInnings: 10,
    startedAt: Date.now(),
    turnDeadline,
  };
}

describe("HcPhaseCountdown", () => {
  it("shows the XI confirmation label and live seconds", () => {
    render(<HcPhaseCountdown state={state("teamSelect", Date.now() + 20_000)} />);

    expect(screen.getByRole("timer", { name: /Confirm playing XI/i })).toBeDefined();
    expect(screen.getByText(/20s/)).toBeDefined();
  });

  it("uses the toss label for every toss phase", () => {
    render(<HcPhaseCountdown state={state("tossChoice", Date.now() + 10_000)} />);

    expect(screen.getByRole("timer", { name: /Toss decision/i })).toBeDefined();
  });
});