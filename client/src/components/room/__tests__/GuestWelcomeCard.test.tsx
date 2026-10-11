import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const authState = { ready: true, isMember: false };
const getStatus = vi.fn();
const claim = vi.fn();
const refreshWallet = vi.fn();
const peek = vi.fn();

vi.mock("../../../store/authStore", () => ({
  useAuthStore: (select: (s: typeof authState) => unknown) => select(authState),
}));
vi.mock("../../../lib/playerIdentity", () => ({ peekPlayerCredential: () => peek() }));
vi.mock("../../../lib/economyApi", () => ({
  getGuestWelcomeStatus: () => getStatus(),
  claimGuestWelcome: () => claim(),
}));
vi.mock("../../../hooks/useEconomy", () => ({ refreshCurrentWallet: () => refreshWallet() }));

import GuestWelcomeCard from "../GuestWelcomeCard";

const renderCard = () =>
  render(
    <MemoryRouter>
      <GuestWelcomeCard />
    </MemoryRouter>,
  );

describe("GuestWelcomeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.ready = true;
    authState.isMember = false;
    peek.mockReturnValue({ playerId: "g1", token: "t", kind: "guest" });
    getStatus.mockResolvedValue({ pending: true, amount: "2000" });
    claim.mockResolvedValue({ applied: true, wallet: {} });
  });

  it("offers a guest who has played the choice to stay or sign in", async () => {
    renderCard();

    expect(await screen.findByText(/your first game was on us/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /stay as a guest/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /sign in to save my progress/i }).getAttribute("href")).toBe("/signup?from=room");
  });

  it("adds the coins once on Stay as a guest, refreshes the wallet and says so", async () => {
    renderCard();
    (await screen.findByRole("button", { name: /stay as a guest/i })).click();

    expect(await screen.findByText(/coins added/i)).toBeTruthy();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(refreshWallet).toHaveBeenCalledTimes(1);
  });

  it("keeps the offer and says what went wrong when adding the coins fails", async () => {
    claim.mockRejectedValue(new Error("offline"));
    renderCard();
    (await screen.findByRole("button", { name: /stay as a guest/i })).click();

    expect((await screen.findByRole("alert")).textContent).toMatch(/could not add your coins/i);
    expect(screen.getByRole("button", { name: /stay as a guest/i })).toBeTruthy();
  });

  it("shows nothing when no welcome is owed", async () => {
    getStatus.mockResolvedValue({ pending: false, amount: "2000" });
    const { container } = renderCard();

    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("asks nothing of a member, or of someone who has no identity yet", async () => {
    authState.isMember = true;
    const first = renderCard();
    expect(getStatus).not.toHaveBeenCalled();
    first.unmount();

    authState.isMember = false;
    peek.mockReturnValue(null);
    const second = renderCard();
    expect(getStatus).not.toHaveBeenCalled();
    expect(second.container.textContent).toBe("");
  });
});
