import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS, type FaucetClaimResult, type FaucetStatus } from "@shared/faucet";
import { useFaucetStore } from "../../../store/faucetStore";
import { FaucetClaimModal } from "../FaucetClaimModal";

const play = vi.fn();
const trigger = vi.fn();
vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: (...a: unknown[]) => play(...a) } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: (...a: unknown[]) => trigger(...a) } }));

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

const paid: FaucetClaimResult = {
  ok: true,
  amount: FAUCET_AMOUNT_COINS,
  nextClaimAt: SERVER_NOW + FAUCET_COOLDOWN_MS,
  paidNow: true,
  vestingUntil: null,
  serverNow: SERVER_NOW,
};

describe("FaucetClaimModal", () => {
  const claim = vi.fn<[], Promise<FaucetClaimResult | null>>();

  const open = (s: FaucetStatus, extra: Partial<ReturnType<typeof useFaucetStore.getState>> = {}) => {
    useFaucetStore.setState({ status: s, clockOffsetMs: s.serverNow - Date.now(), claim, isClaimModalOpen: true, ...extra });
    return render(<FaucetClaimModal />);
  };

  beforeEach(() => {
    claim.mockReset();
    play.mockClear();
    trigger.mockClear();
  });

  afterEach(() => {
    useFaucetStore.getState().reset();
  });

  it("renders nothing while closed", () => {
    useFaucetStore.setState({ status: status(), isClaimModalOpen: false });

    const { container } = render(<FaucetClaimModal />);

    expect(container).toBeEmptyDOMElement();
  });

  it("offers the claim with its amount and does not claim until the button is pressed", () => {
    open(status());

    expect(screen.getByRole("dialog", { name: /your free coins are ready/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim 100 coins/i })).toBeInTheDocument();
    expect(claim).not.toHaveBeenCalled();
  });

  it("celebrates a paid claim with the coin rain, the amount and a Done button", async () => {
    claim.mockResolvedValue(paid);
    open(status());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /claim 100 coins/i }));
    });

    expect(claim).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: /coins added/i })).toBeInTheDocument();
    expect(await screen.findByText("+100")).toBeInTheDocument();
    expect(screen.getByTestId("coin-rain")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^done$/i })).toBeInTheDocument();
    expect(trigger).toHaveBeenCalledWith("reward");
  });

  it("does not rain for a claim that was accepted but not paid yet", async () => {
    claim.mockResolvedValue({ ...paid, paidNow: false });
    open(status());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /claim 100 coins/i }));
    });

    expect(screen.getByRole("heading", { name: /^claimed$/i })).toBeInTheDocument();
    expect(screen.getByText(/on their way/i)).toBeInTheDocument();
    expect(screen.queryByTestId("coin-rain")).not.toBeInTheDocument();
  });

  it("says why a claim was refused, with no rain", async () => {
    claim.mockResolvedValue({ ok: false, code: "UNAVAILABLE", message: "Free coins are temporarily unavailable.", nextClaimAt: null, serverNow: SERVER_NOW });
    open(status(), { message: "Free coins are temporarily unavailable." });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /claim 100 coins/i }));
    });

    expect(screen.getByRole("heading", { name: /not this time/i })).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId("coin-rain")).not.toBeInTheDocument();
  });

  it("shows the wait instead of a claim button when opened too early", () => {
    open(status({ canClaim: false, nextClaimAt: SERVER_NOW + 2 * 3_600_000 }));

    expect(screen.getByRole("dialog", { name: /next free coins in/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /claim 100 coins/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^close$/i })).toBeInTheDocument();
  });

  it("closes from Not now without claiming", () => {
    open(status());

    fireEvent.click(screen.getByRole("button", { name: /not now/i }));

    expect(useFaucetStore.getState().isClaimModalOpen).toBe(false);
    expect(claim).not.toHaveBeenCalled();
  });

  it("starts fresh when reopened, not still celebrating", async () => {
    claim.mockResolvedValue(paid);
    open(status());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /claim 100 coins/i }));
    });
    act(() => useFaucetStore.getState().closeClaimModal());

    act(() => {
      useFaucetStore.setState({ status: status(), isClaimModalOpen: true });
    });

    expect(screen.getByRole("heading", { name: /your free coins are ready/i })).toBeInTheDocument();
  });
});
