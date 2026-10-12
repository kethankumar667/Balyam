import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { claimMemberWelcome, getMemberWelcomeStatus } from "../../../lib/economyApi";
import { refreshCurrentWallet } from "../../../hooks/useEconomy";
import { useAuthStore } from "../../../store/authStore";
import { useRoomStore } from "../../../store/roomStore";
import WelcomeCelebration, { resetWelcomeCelebrationMemo } from "../WelcomeCelebration";

vi.mock("../../../lib/economyApi", () => ({
  getMemberWelcomeStatus: vi.fn(),
  claimMemberWelcome: vi.fn(),
}));
vi.mock("../../../hooks/useEconomy", () => ({ refreshCurrentWallet: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: vi.fn() } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: vi.fn() } }));

const mockStatus = vi.mocked(getMemberWelcomeStatus);
const mockClaim = vi.mocked(claimMemberWelcome);
const mockRefresh = vi.mocked(refreshCurrentWallet);

const OWED = { pending: true, amount: "5000" };
const PAID = { applied: true, wallet: {} as never };
const ALREADY = { applied: false, wallet: {} as never };

const welcomeDialog = () => screen.findByRole("dialog");
const claimButton = () => screen.getByRole("button", { name: /claim my 5,000 coins/i });

/**
 * The new member's welcome: a popup that greets them by name, and whose button is what pays the
 * welcome coins. The server holds the coins until then (`EconomyService.claimMemberWelcome`).
 */
describe("WelcomeCelebration", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    resetWelcomeCelebrationMemo();
    useAuthStore.setState({ isMember: true, userId: "u1" });
    useRoomStore.setState({ playerName: "John Doe" });
    mockStatus.mockResolvedValue(OWED);
    mockClaim.mockResolvedValue(PAID);
  });

  describe("who sees it", () => {
    it("shows nothing to a guest, and never asks the server", () => {
      useAuthStore.setState({ isMember: false, userId: null });

      const { container } = render(<WelcomeCelebration />);

      expect(container).toBeEmptyDOMElement();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it("shows nothing to a member who is not owed a welcome", async () => {
      mockStatus.mockResolvedValue({ pending: false, amount: "5000" });

      render(<WelcomeCelebration />);

      await waitFor(() => expect(mockStatus).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows nothing, and no error, when the server cannot say", async () => {
      mockStatus.mockRejectedValue(new Error("offline"));

      render(<WelcomeCelebration />);

      await waitFor(() => expect(mockStatus).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not ask the server again on the next page once the member is settled this visit", async () => {
      mockStatus.mockResolvedValue({ pending: false, amount: "5000" });
      const first = render(<WelcomeCelebration />);
      await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(1));
      first.unmount();

      // The layout re-mounts on every page.
      render(<WelcomeCelebration />);

      expect(mockStatus).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not bring the popup back on the next page after the member closed it", async () => {
      const first = render(<WelcomeCelebration />);
      await welcomeDialog();
      fireEvent.click(claimButton());
      fireEvent.click(await screen.findByRole("button", { name: /start playing/i }));
      first.unmount();

      render(<WelcomeCelebration />);

      expect(mockStatus).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows nothing for an owed amount of zero", async () => {
      mockStatus.mockResolvedValue({ pending: true, amount: "0" });

      render(<WelcomeCelebration />);

      await waitFor(() => expect(mockStatus).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("the greeting", () => {
    it("welcomes the member by name", async () => {
      render(<WelcomeCelebration />);

      expect(await screen.findByRole("dialog", { name: /welcome john doe to bhalyam/i })).toBeInTheDocument();
    });

    it("falls back to a friendly word when there is no name", async () => {
      useRoomStore.setState({ playerName: "" });

      render(<WelcomeCelebration />);

      expect(await screen.findByRole("dialog", { name: /welcome friend to bhalyam/i })).toBeInTheDocument();
    });

    it("shows the amount waiting, and has not paid it yet", async () => {
      render(<WelcomeCelebration />);
      await welcomeDialog();

      expect(screen.getByText("+5,000")).toBeInTheDocument();
      expect(claimButton()).toBeEnabled();
      expect(mockClaim).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(screen.queryByText(/in your wallet/i)).not.toBeInTheDocument();
    });

    it("rains confetti on arrival", async () => {
      render(<WelcomeCelebration />);
      await welcomeDialog();

      expect(screen.getByTestId("welcome-confetti")).toBeInTheDocument();
    });

    it("must be answered: Escape does not dismiss it", async () => {
      render(<WelcomeCelebration />);
      await welcomeDialog();

      fireEvent.keyDown(window, { key: "Escape" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("claiming", () => {
    it("pays the welcome when the button is pressed, once, and refreshes the wallet", async () => {
      render(<WelcomeCelebration />);
      await welcomeDialog();

      fireEvent.click(claimButton());

      expect(await screen.findByText(/in your wallet/i)).toBeInTheDocument();
      expect(mockClaim).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
      expect(screen.getByText("+5,000")).toBeInTheDocument();
    });

    it("pays once even when pressed twice quickly", async () => {
      render(<WelcomeCelebration />);
      await welcomeDialog();
      const button = claimButton();

      fireEvent.click(button);
      fireEvent.click(button);

      await screen.findByText(/in your wallet/i);
      expect(mockClaim).toHaveBeenCalledTimes(1);
    });

    it("rains coins and says what comes next: free coins in an hour, the streak tomorrow", async () => {
      render(<WelcomeCelebration />);
      await welcomeDialog();

      fireEvent.click(claimButton());

      expect(await screen.findByText(/free coins unlock in 1 hour/i)).toBeInTheDocument();
      expect(screen.getByText(/your daily streak starts tomorrow/i)).toBeInTheDocument();
      expect(screen.getByTestId("coin-rain")).toBeInTheDocument();
    });

    it("closes from 'Start playing' and does not come back", async () => {
      render(<WelcomeCelebration />);
      await welcomeDialog();
      fireEvent.click(claimButton());

      fireEvent.click(await screen.findByRole("button", { name: /start playing/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("never claims a second payment when the wallet was already welcomed", async () => {
      mockClaim.mockResolvedValue(ALREADY);
      render(<WelcomeCelebration />);
      await welcomeDialog();

      fireEvent.click(claimButton());

      expect(await screen.findByText(/already in your wallet/i)).toBeInTheDocument();
      expect(screen.queryByText("+5,000")).not.toBeInTheDocument();
      expect(screen.queryByTestId("coin-rain")).not.toBeInTheDocument();
    });
  });

  describe("when the server cannot pay", () => {
    it("says so, keeps the popup, and offers another try", async () => {
      mockClaim.mockRejectedValueOnce(new Error("503"));
      render(<WelcomeCelebration />);
      await welcomeDialog();

      fireEvent.click(claimButton());

      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't add your coins/i);
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      expect(screen.queryByText(/in your wallet/i)).not.toBeInTheDocument();
    });

    it("pays on the retry", async () => {
      mockClaim.mockRejectedValueOnce(new Error("503"));
      render(<WelcomeCelebration />);
      await welcomeDialog();
      fireEvent.click(claimButton());

      fireEvent.click(await screen.findByRole("button", { name: /try again/i }));

      expect(await screen.findByText(/in your wallet/i)).toBeInTheDocument();
      expect(mockClaim).toHaveBeenCalledTimes(2);
    });

    it("lets the member leave it for later, and asks again next visit", async () => {
      mockClaim.mockRejectedValueOnce(new Error("503"));
      render(<WelcomeCelebration />);
      await welcomeDialog();
      fireEvent.click(claimButton());

      fireEvent.click(await screen.findByRole("button", { name: /later/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
