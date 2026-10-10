import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { CarryOverStatus } from "@shared/carryover";
import { useCarryOverStore } from "../../../store/carryOverStore";
import { useAuthStore } from "../../../store/authStore";
import { CarryOverArrivalDialog } from "../CarryOverArrivalDialog";
import { CarryOverCard } from "../CarryOverCard";

vi.mock("../../../hooks/useEconomy", () => ({ refreshCurrentWallet: vi.fn() }));

const status = (over: Partial<CarryOverStatus> = {}): CarryOverStatus => ({
  carriedAmount: 3000,
  carriedPaid: false,
  bonusPending: true,
  bonusAmount: 5000,
  bonusUnlocked: false,
  bonusPaid: false,
  ...over,
});

describe("CarryOverArrivalDialog", () => {
  afterEach(() => useCarryOverStore.getState().reset());

  it("renders nothing until a guest's coins have come over", () => {
    const { container } = render(<CarryOverArrivalDialog />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says plainly that held coins are not in the wallet yet, and what the bonus needs", () => {
    useCarryOverStore.getState().setArrival({ amount: 3000, vestingUntil: Date.now() + 86_400_000 });

    render(<CarryOverArrivalDialog />);

    expect(screen.getByRole("dialog", { name: /your coins came with you/i })).toBeInTheDocument();
    expect(screen.getByLabelText("3000 coins")).toBeInTheDocument();
    expect(screen.getByText(/they'll be in your wallet by/i)).toBeInTheDocument();
    expect(screen.getByText(/5,000-coin welcome bonus/i)).toBeInTheDocument();
    // Held coins are not a win: no rain.
    expect(screen.queryByTestId("coin-rain")).not.toBeInTheDocument();
  });

  it("closes from Got it", () => {
    useCarryOverStore.getState().setArrival({ amount: 3000, vestingUntil: null });
    render(<CarryOverArrivalDialog />);

    fireEvent.click(screen.getByRole("button", { name: /got it/i }));

    expect(useCarryOverStore.getState().arrival).toBeNull();
  });
});

describe("CarryOverCard", () => {
  const fetchStatus = vi.fn().mockResolvedValue(undefined);
  const claimBonus = vi.fn().mockResolvedValue(null);

  const seed = (s: CarryOverStatus | null, member = true) => {
    useAuthStore.setState({ isMember: member } as never);
    useCarryOverStore.setState({ status: s, fetchStatus, claimBonus });
  };

  beforeEach(() => {
    fetchStatus.mockClear();
    claimBonus.mockClear();
  });

  afterEach(() => {
    useCarryOverStore.getState().reset();
  });

  it("renders nothing when no guest was brought over", () => {
    seed(status({ carriedAmount: null, bonusPending: false }));

    const { container } = render(<CarryOverCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once everything has landed", () => {
    seed(status({ carriedPaid: true, bonusPending: false, bonusPaid: true }));

    const { container } = render(<CarryOverCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows coins in transit and a locked bonus", () => {
    seed(status());

    render(<CarryOverCard />);

    expect(screen.getByText(/coming from your guest account/i)).toBeInTheDocument();
    expect(screen.getByText(/finish a match with friends to unlock 5,000 coins/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /claim/i })).not.toBeInTheDocument();
  });

  it("offers the claim once the bonus is unlocked, and claims on press", () => {
    seed(status({ carriedPaid: true, bonusUnlocked: true }));

    render(<CarryOverCard />);
    fireEvent.click(screen.getByRole("button", { name: /^claim$/i }));

    expect(claimBonus).toHaveBeenCalledTimes(1);
  });

  it("asks the server for its status when a member opens it", () => {
    seed(status());

    render(<CarryOverCard />);

    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });
});
