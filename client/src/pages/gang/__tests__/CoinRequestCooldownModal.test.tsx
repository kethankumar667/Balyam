import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CoinRequestCooldownModal } from "../CoinRequestCooldownModal";

describe("CoinRequestCooldownModal", () => {
  afterEach(cleanup);

  it("renders cooldown countdown and explanatory copy when under cooling period", () => {
    const onClose = vi.fn();
    // 2 hours, 30 minutes in the future
    const endsAt = Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000;

    render(
      <CoinRequestCooldownModal
        cooldownEndsAt={endsAt}
        onClose={onClose}
      />
    );

    expect(screen.getByText("Coin Request Cooldown")).toBeTruthy();
    expect(screen.getByText(/You already requested coins/i)).toBeTruthy();
    expect(screen.getByText(/You need to wait for another/i)).toBeTruthy();
    expect(screen.getAllByText(/2h 30m 0s/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/4-Hour Clan Interval/i)).toBeTruthy();
    expect(screen.getByText(/Coin requests are fixed at 100 coins once every 4 hours/i)).toBeTruthy();

    const gotItBtn = screen.getByRole("button", { name: "Got it" });
    expect(gotItBtn).toBeTruthy();
    fireEvent.click(gotItBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when pressing the Escape key", () => {
    const onClose = vi.fn();
    const endsAt = Date.now() + 3600 * 1000;

    render(
      <CoinRequestCooldownModal
        cooldownEndsAt={endsAt}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows eligibility and a direct request button when cooldown has ended", () => {
    const onClose = vi.fn();
    const onRequestCoins = vi.fn();

    render(
      <CoinRequestCooldownModal
        cooldownEndsAt={null}
        onClose={onClose}
        onRequestCoins={onRequestCoins}
      />
    );

    expect(screen.getByText("Cooldown Ended!")).toBeTruthy();
    expect(screen.getByText(/Your cooldown has ended! You are now eligible to request 100 coins/i)).toBeTruthy();

    const requestBtn = screen.getByRole("button", { name: /Request 100 Coins Now/i });
    expect(requestBtn).toBeTruthy();

    fireEvent.click(requestBtn);
    expect(onRequestCoins).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
