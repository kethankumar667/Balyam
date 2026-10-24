import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CoachHint } from "@shared/types";
import CoachHintButton, { type CoachState } from "../CoachHintButton";

/**
 * The hint panel is the only place a player sees the coach's working. The headline has to read on its own,
 * and the reasoning (numbers, alternatives, what opponents were seen to take) has to be there but folded away,
 * so a player who only wants the move is not made to read a table.
 */

afterEach(() => {
  cleanup();
});

const stateWith = (hint: CoachHint): CoachState => ({
  hint,
  highlight: new Set(hint.highlight),
  loading: false,
  error: null,
  request: vi.fn(),
  dismiss: vi.fn(),
});

const richHint: CoachHint = {
  kind: "discard",
  headline: "Discard the K♠",
  detail: "It leaves you 1 card from showing with 2 points exposed.",
  highlight: ["k1"],
  analysis: {
    status: "Both sequences are in: build sets and close the gaps.",
    facts: [
      { label: "Cards from showing", value: "1" },
      { label: "Chance a draw helps", value: "18%" },
    ],
    options: [
      { label: "Discard K♠", detail: "1 card from showing.", best: true },
      { label: "Discard 2♣", detail: "1 card from showing, 12 points exposed." },
    ],
    reads: ["Bob took Q♠ from the open pile, so cards next to those help them: do not feed them."],
  },
};

describe("CoachHintButton", () => {
  it("shows the headline and the one-line reason without opening the working", () => {
    render(<CoachHintButton coach={stateWith(richHint)} />);

    expect(screen.getByText("Discard the K♠")).toBeTruthy();
    expect(screen.getByText(richHint.detail)).toBeTruthy();
    expect((screen.getByText("Why this move").closest("details") as HTMLDetailsElement).open).toBe(false);
  });

  it("puts the facts, the alternatives and the opponent read behind 'Why this move'", () => {
    render(<CoachHintButton coach={stateWith(richHint)} />);

    fireEvent.click(screen.getByText("Why this move"));

    expect((screen.getByText("Why this move").closest("details") as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByText("Cards from showing")).toBeTruthy();
    expect(screen.getByText("18%")).toBeTruthy();
    expect(screen.getByText("Discard 2♣")).toBeTruthy();
    expect(screen.getByText(/Bob took Q♠/)).toBeTruthy();
  });

  it("tells a screen reader which option is recommended", () => {
    render(<CoachHintButton coach={stateWith(richHint)} />);

    expect(screen.getByText("(recommended)")).toBeTruthy();
  });

  it("still renders a hint that carries no working, as other games' hints do", () => {
    const plain: CoachHint = { kind: "build", headline: "Try a longer word", detail: "A longer word scores more here.", highlight: [] };

    render(<CoachHintButton coach={stateWith(plain)} />);

    expect(screen.getByText("Try a longer word")).toBeTruthy();
    expect(screen.queryByText("Why this move")).toBeNull();
  });

  it("has an icon for a drop recommendation", () => {
    const drop: CoachHint = { kind: "drop", headline: "Drop this round", detail: "Playing on is expected to cost more than 20.", highlight: [] };

    render(<CoachHintButton coach={stateWith(drop)} />);

    expect(screen.getByText("Drop this round")).toBeTruthy();
    expect(screen.getByText("🚪")).toBeTruthy();
  });
});
