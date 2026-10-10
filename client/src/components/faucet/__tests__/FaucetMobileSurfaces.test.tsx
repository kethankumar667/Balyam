import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS, type FaucetStatus } from "@shared/faucet";
import { useFaucetStore } from "../../../store/faucetStore";
import { FaucetClaimRow } from "../FaucetClaimRow";
import { FaucetReadyDot } from "../FaucetReadyDot";

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

describe("faucet surfaces for a phone", () => {
  const claim = vi.fn().mockResolvedValue(null);
  const fetchStatus = vi.fn().mockResolvedValue(undefined);

  /** Times are on the SERVER's clock; the store anchors the device to it. */
  const seed = (s: FaucetStatus | null) =>
    useFaucetStore.setState({ status: s, clockOffsetMs: s ? s.serverNow - Date.now() : 0, fetchStatus, claim });

  beforeEach(() => {
    claim.mockClear();
    fetchStatus.mockClear();
  });

  afterEach(() => {
    useFaucetStore.getState().reset();
  });

  describe("FaucetClaimRow", () => {
    it("renders nothing for a player who has no faucet", () => {
      seed(status({ eligible: false, canClaim: false }));

      const { container } = render(<FaucetClaimRow />);

      expect(container).toBeEmptyDOMElement();
    });

    it("offers the claim with its amount and opens the claim dialog when pressed", () => {
      seed(status());
      render(<FaucetClaimRow />);

      fireEvent.click(screen.getByRole("button", { name: /claim 100/i }));

      expect(useFaucetStore.getState().isClaimModalOpen).toBe(true);
      expect(claim).not.toHaveBeenCalled();
      expect(screen.getByText(/100 coins every 4 hours/i)).toBeInTheDocument();
    });

    it("shows the wait and does not claim while waiting", () => {
      seed(status({ canClaim: false, nextClaimAt: SERVER_NOW + 3 * 3_600_000 }));
      render(<FaucetClaimRow />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText(/next in 3:00:0\d/i)).toBeInTheDocument();
      fireEvent.click(button);
      expect(claim).not.toHaveBeenCalled();
    });

    it("asks the server for its own status when nothing has loaded it yet", () => {
      seed(null);

      render(<FaucetClaimRow />);

      expect(fetchStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe("FaucetReadyDot", () => {
    it("shows when a claim is ready", () => {
      seed(status());

      const { container } = render(<FaucetReadyDot />);

      expect(container.firstChild).not.toBeNull();
    });

    it("is gone while the player waits", () => {
      seed(status({ canClaim: false, nextClaimAt: SERVER_NOW + 60_000 }));

      const { container } = render(<FaucetReadyDot />);

      expect(container).toBeEmptyDOMElement();
    });

    it("is gone for a player who has no faucet", () => {
      seed(status({ eligible: false, canClaim: false }));

      const { container } = render(<FaucetReadyDot />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
