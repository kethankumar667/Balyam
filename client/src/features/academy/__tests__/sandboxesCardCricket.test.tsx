import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardMeldSandbox } from "../components/sandboxes/CardMeldSandbox";
import { CricketDuelSandbox } from "../components/sandboxes/CricketDuelSandbox";
import { UnoChallengeSandbox } from "../components/sandboxes/UnoChallengeSandbox";
import { SudokuScannerSandbox } from "../components/sandboxes/SudokuScannerSandbox";
import { DotsChainSandbox } from "../components/sandboxes/DotsChainSandbox";
import { WordChainSandbox } from "../components/sandboxes/WordChainSandbox";

vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: {
    getInstance: () => ({ subtle: vi.fn(), win: vi.fn() }),
  },
}));

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const BATTER_NUMBERS = [1, 2, 3, 4, 5, 6] as const;
const YORKER_OUT_MIN = 4;
const RANDOM_INSIDE_WICKET_BAND = 0.01;
const RANDOM_OUTSIDE_WICKET_BAND = 0.99;
const RANDOM_BETWEEN_30_AND_35_PERCENT = 0.32;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CardMeldSandbox", () => {
  const pureTab = () => screen.getByRole("button", { name: /^Pure Run/ });
  const impureTab = () => screen.getByRole("button", { name: /^Impure Run/ });
  const setTab = () => screen.getByRole("button", { name: /^Set/ });

  it("does not complete on the initial selection or by re-clicking it", () => {
    const onComplete = vi.fn();
    render(<CardMeldSandbox onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(pureTab());
    fireEvent.click(pureTab());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("completes once the learner tries a different option", () => {
    const onComplete = vi.fn();
    render(<CardMeldSandbox onComplete={onComplete} />);
    fireEvent.click(impureTab());
    expect(onComplete).toHaveBeenCalledTimes(1);
    fireEvent.click(setTab());
    fireEvent.click(pureTab());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("in compare mode requires both the pure and the impure run", () => {
    const onComplete = vi.fn();
    render(
      <CardMeldSandbox config={{ mode: "compare" }} onComplete={onComplete} />,
    );
    fireEvent.click(setTab());
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(impureTab());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("marks the active tab with aria-pressed and announces the verdict", () => {
    render(<CardMeldSandbox />);
    expect(pureTab().getAttribute("aria-pressed")).toBe("true");
    expect(impureTab().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(impureTab());
    expect(pureTab().getAttribute("aria-pressed")).toBe("false");
    expect(impureTab().getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toMatch(/Impure Sequence/);
  });

  it("keeps the joker label readable (no stone-500 on amber)", () => {
    const { container } = render(<CardMeldSandbox />);
    fireEvent.click(impureTab());
    const wild = Array.from(container.querySelectorAll("div")).find(
      (el) => el.children.length === 0 && el.textContent === "WILD",
    );
    expect(wild).toBeDefined();
    expect(wild?.className).not.toMatch(/text-stone-500/);
  });
});

describe("CricketDuelSandbox", () => {
  const batterNumber = () => screen.getByTestId("cricket-batter-number");
  const bowlerNumber = () => screen.getByTestId("cricket-bowler-number");
  const pick = (n: number) =>
    fireEvent.click(screen.getByRole("button", { name: `Show ${n}` }));
  const status = () => screen.getByRole("status").textContent ?? "";

  it("starts in the mode named by the slide config", () => {
    render(<CricketDuelSandbox config={{ mode: "yorker" }} />);
    const yorker = screen.getByRole("button", { name: /Mystery Yorker/ });
    const standard = screen.getByRole("button", { name: /Standard Ball/ });
    expect(yorker.getAttribute("aria-pressed")).toBe("true");
    expect(standard.getAttribute("aria-pressed")).toBe("false");
  });

  it.each(BATTER_NUMBERS)(
    "yorker mode shows numbers that agree with the outcome (batter %i)",
    (n) => {
      render(<CricketDuelSandbox config={{ mode: "yorker" }} />);
      pick(n);
      expect(batterNumber().textContent).toBe(String(n));
      const bowler = Number(bowlerNumber().textContent);
      if (n >= YORKER_OUT_MIN) {
        expect(bowler).toBe(n);
        expect(status()).toMatch(/CLEAN BOWLED/);
      } else {
        expect(bowler).not.toBe(n);
        expect(status()).not.toMatch(/BOWLED|OUT/);
        expect(status()).toMatch(/safe/i);
      }
    },
  );

  it.each([RANDOM_INSIDE_WICKET_BAND, RANDOM_OUTSIDE_WICKET_BAND])(
    "standard mode is out exactly when the shown numbers match (random %f)",
    (random) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      for (const n of BATTER_NUMBERS) {
        const { unmount } = render(<CricketDuelSandbox />);
        pick(n);
        const bowler = Number(bowlerNumber().textContent);
        const isOut = /WICKET/.test(status());
        expect(isOut).toBe(bowler === n);
        unmount();
      }
    },
  );

  it("uses the documented 30 percent wicket chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(RANDOM_BETWEEN_30_AND_35_PERCENT);
    render(<CricketDuelSandbox />);
    pick(3);
    expect(status()).not.toMatch(/WICKET/);
  });

  it("calls onComplete at most once", () => {
    vi.spyOn(Math, "random").mockReturnValue(RANDOM_INSIDE_WICKET_BAND);
    const onComplete = vi.fn();
    render(
      <React.StrictMode>
        <CricketDuelSandbox onComplete={onComplete} />
      </React.StrictMode>,
    );
    pick(2);
    pick(3);
    pick(4);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("marks the chosen number and mode buttons with aria-pressed", () => {
    render(<CricketDuelSandbox />);
    pick(4);
    expect(
      screen.getByRole("button", { name: "Show 4" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Show 5" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

describe("UnoChallengeSandbox", () => {
  it("completes once even when the learner tries every action", () => {
    const onComplete = vi.fn();
    render(
      <React.StrictMode>
        <UnoChallengeSandbox onComplete={onComplete} />
      </React.StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Challenge: They Had Red/ }));
    fireEvent.click(screen.getByRole("button", { name: /Shout UNO/ }));
    fireEvent.click(screen.getByRole("button", { name: /Accept Draw 4/ }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("announces the challenge result and keeps it visible after shouting UNO", () => {
    render(<UnoChallengeSandbox />);
    fireEvent.click(screen.getByRole("button", { name: /Challenge: They Had Red/ }));
    expect(screen.getByRole("status").textContent).toMatch(/CHALLENGE SUCCESSFUL/);
    fireEvent.click(screen.getByRole("button", { name: /Shout UNO/ }));
    expect(screen.getByRole("status").textContent).toMatch(/CHALLENGE SUCCESSFUL/);
  });

  it("reflects the shouted state with aria-pressed", () => {
    render(<UnoChallengeSandbox />);
    const shout = screen.getByRole("button", { name: /Shout UNO/ });
    expect(shout.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(shout);
    expect(
      screen.getByRole("button", { name: /UNO! Shouted/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

describe("SudokuScannerSandbox", () => {
  it("offers every digit 1-9 to match the '1-9' label", () => {
    render(<SudokuScannerSandbox />);
    expect(screen.getByText(/\(1.9\)/)).toBeDefined();
    for (const digit of DIGITS) {
      expect(screen.getByRole("button", { name: String(digit) })).toBeDefined();
    }
  });

  it("completes once for the correct naked single and says 'Demo complete'", () => {
    const onComplete = vi.fn();
    const { container } = render(
      <React.StrictMode>
        <SudokuScannerSandbox onComplete={onComplete} />
      </React.StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/already exists/);
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(container.textContent).toMatch(/Demo complete/i);
    expect(container.textContent).not.toMatch(/XP/);
  });
});

describe("DotsChainSandbox and WordChainSandbox", () => {
  it("dots chain completes once and reports the extra turn politely", () => {
    const onComplete = vi.fn();
    render(<DotsChainSandbox onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /Draw 4th closing line/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reset Demo/ }));
    fireEvent.click(screen.getByRole("button", { name: /Draw 4th closing line/ }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toMatch(/turn/i);
  });

  it("word chain completes once and reports the combo politely", () => {
    const onComplete = vi.fn();
    render(<WordChainSandbox onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /Place letter T/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reset Demo/ }));
    fireEvent.click(screen.getByRole("button", { name: /Place letter T/ }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toMatch(/CAT/);
  });
});
