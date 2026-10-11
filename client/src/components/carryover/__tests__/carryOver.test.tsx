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
  carriedAmount: 800,
  carriedPaid: false,
  bonusPending: false,
  bonusAmount: 2000,
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

  it("says plainly that held coins are not in the wallet yet, and that the sign-up bonus is included", () => {
    useCarryOverStore.getState().setArrival({ amount: 800, vestingUntil: Date.now() + 86_400_000 });

    render(<CarryOverArrivalDialog />);

    expect(screen.getByRole("dialog", { name: /your coins came with you/i })).toBeInTheDocument();
    expect(screen.getByLabelText("800 coins")).toBeInTheDocument();
    expect(screen.getByText(/they'll be in your wallet by/i)).toBeInTheDocument();
    expect(screen.getByText(/guest coins plus a 2,000-coin sign-up bonus/i)).toBeInTheDocument();
    // Held coins are not a win: no rain.
    expect(screen.queryByTestId("coin-rain")).not.toBeInTheDocument();
  });

  it("closes from Got it", () => {
    useCarryOverStore.getState().setArrival({ amount: 800, vestingUntil: null });
    render(<CarryOverArrivalDialog />);

    fireEvent.click(screen.getByRole("button", { name: /got it/i }));

    expect(useCarryOverStore.getState().arrival).toBeNull();
  });
});

describe("CarryOverCard", () => {
  const fetchStatus = vi.fn().mockResolvedValue(undefined);

  const seed = (s: CarryOverStatus | null, member = true) => {
    useAuthStore.setState({ isMember: member } as never);
    useCarryOverStore.setState({ status: s, fetchStatus });
  };

  beforeEach(() => {
    fetchStatus.mockClear();
  });

  afterEach(() => {
    useCarryOverStore.getState().reset();
  });

  it("renders nothing when no guest was brought over", () => {
    seed(status({ carriedAmount: null }));

    const { container } = render(<CarryOverCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the top-up has landed", () => {
    seed(status({ carriedPaid: true }));

    const { container } = render(<CarryOverCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the member welcome already covered the guest's coins", () => {
    seed(status({ carriedAmount: 0, carriedPaid: true }));

    const { container } = render(<CarryOverCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the top-up in transit, and no separate bonus to unlock or claim", () => {
    seed(status());

    render(<CarryOverCard />);

    expect(screen.getByText(/coming from your guest account/i)).toBeInTheDocument();
    expect(screen.getByText(/guest coins plus the sign-up bonus reach your wallet within a day/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /claim/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/welcome bonus/i)).not.toBeInTheDocument();
  });

  it("asks the server for its status when a member opens it", () => {
    seed(status());

    render(<CarryOverCard />);

    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });
});
