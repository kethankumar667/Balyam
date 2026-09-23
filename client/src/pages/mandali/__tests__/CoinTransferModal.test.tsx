import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { MandaliMember } from "@shared/mandali/types.js";

const storeState = {
  transferCoins: vi.fn(),
  createCoinRequest: vi.fn(),
  isSubmitting: false,
  coinRequestCooldownEndsAt: null as number | null,
  fetchCoinRequestCooldown: vi.fn(async () => undefined),
};

vi.mock("../../../store/mandaliStore", () => ({
  useMandaliStore: () => storeState,
}));
vi.mock("../../../hooks/useEconomy", () => ({
  useWallet: () => ({ balance: "5000", refetch: vi.fn() }),
}));

import { CoinTransferModal } from "../CoinTransferModal";

const member = (playerId: string, displayName: string): MandaliMember => ({
  memberId: `m:${playerId}`, mandaliId: "m", playerId, displayName, avatar: "a1",
  role: "MEMBER", state: "ACTIVE", joinedAt: 0, presence: "online", contributionScore: 0,
});

const renderModal = (initialType: "SEND" | "REQUEST") =>
  render(
    <CoinTransferModal
      mandaliId="m"
      channelId="c1"
      members={[member("me", "Me"), member("other", "Other")]}
      currentUserId="me"
      initialType={initialType}
      onClose={() => undefined}
    />
  );

describe("CoinTransferModal", () => {
  beforeEach(() => {
    storeState.coinRequestCooldownEndsAt = null;
    storeState.fetchCoinRequestCooldown.mockClear();
  });
  afterEach(cleanup);

  it("offers only the fixed 100-coin amount — no presets, no custom entry", () => {
    renderModal("SEND");

    expect(screen.getByText("100 coins")).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByText("🪙 50")).toBeNull();
    expect(screen.getByRole("button", { name: "Send 100 Coins" })).toBeTruthy();
  });

  it("explains that coin requests are always 100 coins and allows a request when there is no cooldown", () => {
    renderModal("REQUEST");

    expect(screen.getByText(/Coin requests are always 100 coins/i)).toBeTruthy();
    expect(screen.getByText("Fixed Clan Request")).toBeTruthy();
    expect(screen.getByText(/once every 4 hours/i)).toBeTruthy();
    const submit = screen.getByRole("button", { name: "Request 100 Coins" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it("shows the remaining balance after sending coins in SEND mode", () => {
    renderModal("SEND");

    expect(screen.getByText("Fixed for every transfer")).toBeTruthy();
    expect(screen.getByText(/Balance after send:/i)).toBeTruthy();
    expect(screen.getByText("4,900 coins")).toBeTruthy();
  });

  it("shows the countdown and blocks the request while cooling down", () => {
    storeState.coinRequestCooldownEndsAt = Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000;
    renderModal("REQUEST");

    // Shown twice on purpose: in the notice, and on the disabled button.
    expect(screen.getByRole("status").textContent).toMatch(/You can request coins again in\s*2h 30m 0s/);
    const submit = screen.getByRole("button", { name: /Available in 2h 30m 0s/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("does not apply the request cooldown to sending coins", () => {
    storeState.coinRequestCooldownEndsAt = Date.now() + 60 * 60 * 1000;
    renderModal("SEND");

    const submit = screen.getByRole("button", { name: "Send 100 Coins" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    expect(screen.queryByText(/again in/i)).toBeNull();
  });

  it("asks the server for the current cooldown when it opens", () => {
    renderModal("REQUEST");

    expect(storeState.fetchCoinRequestCooldown).toHaveBeenCalled();
  });
});
