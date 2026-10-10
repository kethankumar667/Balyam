import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS, type FaucetStatus } from "@shared/faucet";
import { useFaucetStore } from "../../../store/faucetStore";
import { FaucetChip } from "../FaucetChip";

vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: vi.fn() } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: vi.fn() } }));

const SERVER_NOW = 1_800_000_000_000;

const status = (over: Partial<FaucetStatus> = {}): FaucetStatus => ({
  eligible: true,
  amount: FAUCET_AMOUNT_COINS,
  cooldownMs: FAUCET_COOLDOWN_MS,
  nextClaimAt: null,
  serverNow: SERVER_NOW,
  canClaim: true,
  ...over,
});

describe("FaucetChip", () => {
  const claim = vi.fn().mockResolvedValue(null);

  /**
   * The chip asks the server on mount; these tests drive it from the store instead.
   * Every time here is on the SERVER's clock: the store anchors the device to it.
   */
  const seed = (s: FaucetStatus, extra: Partial<ReturnType<typeof useFaucetStore.getState>> = {}) =>
    useFaucetStore.setState({ status: s, clockOffsetMs: s.serverNow - Date.now(), fetchStatus: vi.fn().mockResolvedValue(undefined), claim, ...extra });

  beforeEach(() => {
    claim.mockClear();
  });

  afterEach(() => {
    useFaucetStore.getState().reset();
  });

  it("renders nothing for a player who is not eligible", () => {
    seed(status({ eligible: false, canClaim: false }));

    const { container } = render(<FaucetChip />);

    expect(container).toBeEmptyDOMElement();
  });

  it("offers the claim when it is ready", () => {
    seed(status());

    render(<FaucetChip />);

    const button = screen.getByRole("button", { name: /claim 100 free coins/i });
    expect(button).toHaveTextContent("Free +100");
    expect(button).toHaveAttribute("aria-disabled", "false");
  });

  it("opens the claim dialog when pressed, and claims only from inside it", () => {
    seed(status());
    render(<FaucetChip />);

    fireEvent.click(screen.getByRole("button", { name: /claim 100 free coins/i }));

    expect(claim).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^claim 100 coins$/i }));
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it("shows the countdown, and pressing it does nothing", () => {
    seed(status({ canClaim: false, nextClaimAt: SERVER_NOW + 3 * 3_600_000 + 5 * 60_000 }));

    render(<FaucetChip />);

    const button = screen.getByRole("button", { name: /next free coins in 3:0[45]:\d\d/i });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(claim).not.toHaveBeenCalled();
  });

  it("counts down as time passes", () => {
    vi.useFakeTimers();
    try {
      seed(status({ canClaim: false, nextClaimAt: SERVER_NOW + 65_000 }));
      render(<FaucetChip />);
      expect(screen.getByRole("button")).toHaveTextContent("01:05");

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(screen.getByRole("button")).toHaveTextContent("01:00");
    } finally {
      vi.useRealTimers();
    }
  });

  it("becomes ready again by itself when the wait ends", () => {
    vi.useFakeTimers();
    try {
      seed(status({ canClaim: false, nextClaimAt: SERVER_NOW + 2_000 }));
      render(<FaucetChip />);

      act(() => {
        vi.advanceTimersByTime(3_000);
      });

      expect(screen.getByRole("button")).toHaveTextContent("Free +100");
    } finally {
      vi.useRealTimers();
    }
  });

  it("confirms a payment with the amount and announces it", () => {
    seed(status({ canClaim: false, nextClaimAt: SERVER_NOW + FAUCET_COOLDOWN_MS }), { justClaimed: 100 });

    render(<FaucetChip />);

    expect(screen.getByRole("button")).toHaveTextContent("+100");
    expect(screen.getByRole("status")).toHaveTextContent("100 coins added to your wallet");
  });
});
