import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import MatchPayoutBanner, { PAYOUT_BANNER_VISIBLE_MS } from "../MatchPayoutBanner";

describe("MatchPayoutBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tells the winner how many coins they won and where they went", () => {
    render(<MatchPayoutBanner payout={{ matchId: "m_1", kind: "prize", amount: "1600" }} onDismiss={() => {}} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("You won");
    expect(status.textContent).toContain("1,600");
    expect(status.textContent).toContain("Added to your wallet");
  });

  it("says a refund is a refund, not a win", () => {
    render(<MatchPayoutBanner payout={{ matchId: "m_1", kind: "refund", amount: "100" }} onDismiss={() => {}} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Entry fee refunded");
    expect(status.textContent).not.toContain("You won");
  });

  it("dismisses on tap", () => {
    const onDismiss = vi.fn();
    render(<MatchPayoutBanner payout={{ matchId: "m_1", kind: "prize", amount: "160" }} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss payout notice" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clears itself after the visible window", () => {
    const onDismiss = vi.fn();
    render(<MatchPayoutBanner payout={{ matchId: "m_1", kind: "prize", amount: "160" }} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(PAYOUT_BANNER_VISIBLE_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
