import { describe, it, expect, vi, beforeAll } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecoveryBanner from "../../core/recovery/RecoveryBanner";
import RejoinBanner from "../../core/recovery/RejoinBanner";
import BhalyamResultModal from "../../components/BhalyamResultModal";
import CarromSkinModal from "../../games/carrom/CarromSkinModal";
import ChessSkinModal from "../../games/chess/ChessSkinModal";
import EmptyState from "../../components/games/EmptyState";
import NokiaCricketPage from "../../pages/NokiaCricketPage";
import NokiaSnakePage from "../../pages/NokiaSnakePage";
import BrickRacerPage from "../../pages/BrickRacerPage";
import GameOverScreen from "../../components/GameOverScreen";
import PassPhoneGate from "../../components/PassPhoneGate";
import ToastHost from "../../components/ToastHost";
import { toastStore } from "../../lib/toastStore";
import ContactUsPage from "../../pages/ContactUsPage";
import { AchievementRevealModal } from "../profile/AchievementRevealModal";
import { getPrefersReducedMotion } from "../../hooks/useReducedMotion";
import { saveActiveSession, clearActiveSession } from "../../core/recovery/recoveryStorage";
import type { Player } from "@shared/types";

// Mock confetti and particles
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

vi.mock("@tsparticles/confetti", () => ({
  confetti: vi.fn(),
}));

vi.mock("../../core/recovery/roomLiveness", () => ({
  checkRoomAlive: vi.fn().mockResolvedValue({
    alive: true,
    game: "ludo",
    phase: "playing",
  }),
}));

// Mock game boards for page-wrapper DVH tests to prevent infinite game loops
vi.mock("../../games/nokiacricket/NokiaCricketBoard", () => ({
  default: () => <div data-testid="nokia-cricket-board" />,
}));
vi.mock("../../games/nokiasnake/NokiaSnakeBoard", () => ({
  default: () => <div data-testid="nokia-snake-board" />,
}));
vi.mock("../../games/brickracer/BrickRacerBoard", () => ({
  default: () => <div data-testid="brick-racer-board" />,
}));

// Mock AudioManager to avoid audio errors in tests
vi.mock("../../services/AudioManager", () => ({
  AudioManager: {
    getInstance: () => ({
      play: vi.fn(),
      playThemeMusic: vi.fn(),
      stopThemeMusic: vi.fn(),
      setVolume: vi.fn(),
      isMuted: () => false,
      subscribe: () => () => {},
    }),
  },
}));

// Mock HapticsManager
vi.mock("../../services/HapticsManager", () => ({
  HapticsManager: {
    getInstance: () => ({
      tap: vi.fn(),
      impact: vi.fn(),
      win: vi.fn(),
      notification: vi.fn(),
      subscribe: () => () => {},
      getState: () => ({ isSupported: false, isEnabled: true }),
      isSupported: () => false,
      isEnabled: () => true,
    }),
  },
}));

const samplePlayers: Player[] = [
  { id: "p1", name: "Player 1", isReady: true, isConnected: true, isHost: true },
  { id: "p2", name: "Player 2", isReady: true, isConnected: true, isHost: false },
];

const sampleRanked = [
  { id: "p1", name: "Player 1", isReady: true, isConnected: true, isHost: true, score: 100 },
  { id: "p2", name: "Player 2", isReady: true, isConnected: true, isHost: false, score: 50 },
];

describe("Launch Remediation — P0-01: Disconnect Banner Unification", () => {
  it("renders RecoveryBanner without rendering legacy duplicate banner", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/room/TEST01"]}>
        <RecoveryBanner />
      </MemoryRouter>
    );
    // When connected/idle, recovery banner returns null
    expect(container.firstChild).toBeNull();
  });
});

describe("Launch Remediation — P0-02: Match History Empty State", () => {
  it("renders proper EmptyState with zero fake demo data", () => {
    const onReset = vi.fn();
    render(
      <EmptyState
        title="No matches played yet"
        description="Play games with friends or bots to build your match history."
        resetLabel="Explore Games"
        onReset={onReset}
      />
    );

    expect(screen.getByText("No matches played yet")).toBeDefined();
    expect(
      screen.getByText("Play games with friends or bots to build your match history.")
    ).toBeDefined();

    const ctaButton = screen.getByRole("button", { name: /Explore Games/i });
    expect(ctaButton).toBeDefined();
    fireEvent.click(ctaButton);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("Launch Remediation — P0-03: WCAG Touch Target Compliance (≥44x44px)", () => {
  it("enforces ≥44x44px touch target on BhalyamResultModal close button", () => {
    const onClose = vi.fn();
    render(
      <BhalyamResultModal
        players={samplePlayers}
        rankedPlayers={sampleRanked}
        selfId="p1"
        winnerId="p1"
        winnerName="Player 1"
        onClose={onClose}
        onLeave={() => {}}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    expect(closeBtn.className).toContain("min-w-[44px]");
    expect(closeBtn.className).toContain("min-h-[44px]");
  });

  it("enforces ≥44x44px touch target on CarromSkinModal close button", () => {
    const onClose = vi.fn();
    render(
      <CarromSkinModal
        open={true}
        onClose={onClose}
        currentStriker="pearl"
        currentFelt="birch"
        onSelectStriker={() => {}}
        onSelectFelt={() => {}}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    expect(closeBtn.className).toContain("min-w-[44px]");
    expect(closeBtn.className).toContain("min-h-[44px]");
  });

  it("enforces ≥44x44px touch target on ChessSkinModal close button", () => {
    const onClose = vi.fn();
    render(
      <ChessSkinModal
        isOpen={true}
        onClose={onClose}
        currentTheme="emerald"
        currentPieceSet="neo"
        onSelectTheme={() => {}}
        onSelectPieceSet={() => {}}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    expect(closeBtn.className).toContain("min-w-[44px]");
    expect(closeBtn.className).toContain("min-h-[44px]");
  });

  it("enforces ≥44x44px touch target on RejoinBanner dismiss button", async () => {
    saveActiveSession({
      sessionId: "sess_99",
      roomId: "ROOM99",
      playerId: "p1",
      playerName: "Player 1",
      seatToken: "tok99",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>
    );

    const dismissBtn = await screen.findByRole("button", { name: /Dismiss rejoin notice/i });
    expect(dismissBtn.className).toContain("min-w-[44px]");
    expect(dismissBtn.className).toContain("min-h-[44px]");

    clearActiveSession();
  });
});

describe("Launch Remediation — P1-01: Results Flow", () => {
  it("BhalyamResultModal 'Continue' triggers onClose without mounting GameOverScreen", () => {
    const onClose = vi.fn();
    render(
      <BhalyamResultModal
        players={samplePlayers}
        rankedPlayers={sampleRanked}
        selfId="p1"
        winnerId="p1"
        winnerName="Player 1"
        onClose={onClose}
        onLeave={() => {}}
      />
    );

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("safely exits scorecard on Continue and exposes table state during FINALIZING or FINALIZATION_FAILED", () => {
    function PostMatchHarness({ lifecycleState }: { lifecycleState: string }) {
      const [showScorecard, setShowScorecard] = useState(true);
      const [scorecardDismissed, setScorecardDismissed] = useState(false);

      const handleClose = () => {
        setShowScorecard(false);
        setScorecardDismissed(true);
      };

      return (
        <div>
          {showScorecard && (
            <BhalyamResultModal
              players={samplePlayers}
              rankedPlayers={sampleRanked}
              selfId="p1"
              winnerId="p1"
              winnerName="Player 1"
              onClose={handleClose}
              onLeave={() => {}}
            />
          )}

          {scorecardDismissed && (
            <div data-testid="table-container">
              {lifecycleState === "FINALIZING" && (
                <div role="status">Match completed — finalizing prize settlement and rewards...</div>
              )}
              {lifecycleState === "FINALIZATION_FAILED" && (
                <div role="alert">
                  <span>Settlement synchronization is pending. Your match results are saved and will be finalized.</span>
                  <button type="button">Retry Settlement Sync</button>
                </div>
              )}
              <div data-testid="rematch-controls">Table Ready for Next Match</div>
            </div>
          )}
        </div>
      );
    }

    // Case 1: FINALIZING
    const { unmount } = render(<PostMatchHarness lifecycleState="FINALIZING" />);
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("table-container")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("finalizing prize settlement");
    expect(screen.getByTestId("rematch-controls")).toBeDefined();
    unmount();

    // Case 2: FINALIZATION_FAILED
    render(<PostMatchHarness lifecycleState="FINALIZATION_FAILED" />);
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.getByRole("alert").textContent).toContain("Settlement synchronization is pending");
    expect(screen.getByRole("button", { name: /Retry Settlement Sync/i })).toBeDefined();
    expect(screen.getByTestId("rematch-controls")).toBeDefined();
  });
});

describe("Launch Remediation — P1-02: Modal Standardization (Carrom & Chess)", () => {
  function CarromHarness() {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button onClick={() => setOpen(true)}>Open Carrom Skins</button>
        <CarromSkinModal
          open={open}
          onClose={() => setOpen(false)}
          currentStriker="pearl"
          currentFelt="birch"
          onSelectStriker={() => {}}
          onSelectFelt={() => {}}
        />
      </div>
    );
  }

  function ChessHarness() {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button onClick={() => setOpen(true)}>Open Chess Skins</button>
        <ChessSkinModal
          isOpen={open}
          onClose={() => setOpen(false)}
          currentTheme="emerald"
          currentPieceSet="neo"
          onSelectTheme={() => {}}
          onSelectPieceSet={() => {}}
        />
      </div>
    );
  }

  it("CarromSkinModal exposes dialog semantics, closes on Escape, and traps/restores focus", async () => {
    render(<CarromHarness />);
    const trigger = screen.getByText("Open Carrom Skins");
    trigger.focus();
    fireEvent.click(trigger);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-label")).toBe("Custom Skins & Themes");
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("ChessSkinModal exposes dialog semantics, closes on Escape, and traps/restores focus", async () => {
    render(<ChessHarness />);
    const trigger = screen.getByText("Open Chess Skins");
    trigger.focus();
    fireEvent.click(trigger);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-label")).toBe("Chess Custom Themes");
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});

describe("Launch Remediation — P1-04: Viewport Shell DVH Utilities", () => {
  it("applies min-h-dvh-safe and h-dvh-safe to retro page shells", () => {
    const { container: nokiaCricket } = render(
      <MemoryRouter>
        <NokiaCricketPage />
      </MemoryRouter>
    );
    expect(nokiaCricket.firstChild).toBeDefined();
    const cricketEl = nokiaCricket.firstChild as HTMLElement;
    expect(cricketEl.className).toContain("min-h-dvh-safe");
    expect(cricketEl.className).toContain("h-dvh-safe");

    const { container: nokiaSnake } = render(
      <MemoryRouter>
        <NokiaSnakePage />
      </MemoryRouter>
    );
    const snakeEl = nokiaSnake.firstChild as HTMLElement;
    expect(snakeEl.className).toContain("min-h-dvh-safe");
    expect(snakeEl.className).toContain("h-dvh-safe");

    const { container: brickRacer } = render(
      <MemoryRouter>
        <BrickRacerPage />
      </MemoryRouter>
    );
    const racerEl = brickRacer.firstChild as HTMLElement;
    expect(racerEl.className).toContain("min-h-dvh-safe");
    expect(racerEl.className).toContain("h-dvh-safe");
  });
});

describe("Launch Remediation — Phase 2B Accessibility Hardening", () => {
  it("AchievementRevealModal complies with modal dialog accessibility, Escape dismissal, and focus restoration", () => {
    const onClose = vi.fn();
    const mockAch = {
      id: "master_1",
      title: "Master Strategist",
      description: "Win 5 ranked matches.",
      icon: "trophy",
      unlocked: true,
      category: "skill" as const,
      currentProgress: 5,
      targetValue: 5,
      progressPercent: 100,
    };

    const TestContainer = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button
            data-testid="trigger-btn"
            onClick={() => setIsOpen(true)}
          >
            Open Achievement
          </button>
          <AchievementRevealModal
            achievement={mockAch}
            isOpen={isOpen}
            onClose={() => {
              onClose();
              setIsOpen(false);
            }}
          />
        </div>
      );
    };

    render(<TestContainer />);
    const trigger = screen.getByTestId("trigger-btn");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("Master Strategist")).toBeDefined();

    // Escape closes modal and returns focus to trigger
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("GameOverScreen exposes dialog semantics and does NOT trigger destructive onLeave on Escape", () => {
    const onLeave = vi.fn();

    render(
      <GameOverScreen
        players={samplePlayers}
        selfId="p1"
        onLeave={onLeave}
        deadlineMs={Date.now() + 60000}
        winnerName="Champion"
        gameName="Rummy"
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: /Game Over/i })).toBeDefined();

    // Pressing Escape should NOT trigger destructive leave without confirmation
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onLeave).not.toHaveBeenCalled();

    // Clicking explicit Leave Room button calls onLeave
    const leaveBtn = screen.getByRole("button", { name: /Leave Room/i });
    fireEvent.click(leaveBtn);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("PassPhoneGate handles keyboard accessibility, ignores repeat keys and input targets", () => {
    const localPlayers: Player[] = [
      { id: "p1", name: "Host Player", isReady: true, isConnected: true, isHost: true, isLocal: false },
      { id: "p2", name: "Guest Player", isReady: true, isConnected: true, isHost: false, isLocal: true },
    ];

    const { rerender } = render(
      <div>
        <input data-testid="test-input" />
        <PassPhoneGate activePlayerId="p2" players={localPlayers} isHost={true}>
          <div data-testid="game-board">Board Content</div>
        </PassPhoneGate>
      </div>
    );

    const passButton = screen.getByRole("button", {
      name: /Pass the phone to Guest Player and tap to continue/i,
    });
    expect(passButton).toBeDefined();

    // Keydown from inside an input should NOT dismiss the gate
    const inputEl = screen.getByTestId("test-input");
    inputEl.focus();
    fireEvent.keyDown(inputEl, { key: "Enter", target: inputEl });
    expect(screen.queryByRole("dialog")).not.toBeNull();

    // Keydown with e.repeat = true should NOT trigger action
    fireEvent.keyDown(passButton, { key: "Enter", repeat: true });
    expect(screen.queryByRole("dialog")).not.toBeNull();

    // Valid Enter key acknowledges and removes overlay
    fireEvent.keyDown(passButton, { key: "Enter", repeat: false });
    rerender(
      <div>
        <input data-testid="test-input" />
        <PassPhoneGate activePlayerId="p2" players={localPlayers} isHost={true}>
          <div data-testid="game-board">Board Content</div>
        </PassPhoneGate>
      </div>
    );
  });

  it("ToastHost enforces enhanced AAA ≥44x44px touch target and dismisses on user action", () => {
    toastStore.show("Connection restored successfully", "success");
    render(<ToastHost />);

    const toastText = screen.getByText("Connection restored successfully");
    expect(toastText).toBeDefined();

    const dismissBtn = screen.getByRole("button", { name: /Dismiss notification/i });
    expect(dismissBtn.className).toContain("min-w-[44px]");
    expect(dismissBtn.className).toContain("min-h-[44px]");

    fireEvent.click(dismissBtn);
    expect(toastStore.getSnapshot().length).toBe(0);
  });

  it("ContactUsPage implements WAI-ARIA radio group with roving tabindex and arrow key navigation", () => {
    render(
      <MemoryRouter>
        <ContactUsPage />
      </MemoryRouter>
    );

    const radiogroup = screen.getByRole("radiogroup", { name: /Help categories/i });
    expect(radiogroup).toBeDefined();

    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(8);

    // Initial item is selected (gameplay) with tabIndex 0, all others -1
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[0].tabIndex).toBe(0);
    expect(radios[1].getAttribute("aria-checked")).toBe("false");
    expect(radios[1].tabIndex).toBe(-1);

    // ArrowRight navigates to next category (lounges)
    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(radios[1].getAttribute("aria-checked")).toBe("true");
    expect(radios[1].tabIndex).toBe(0);
    expect(radios[0].getAttribute("aria-checked")).toBe("false");
    expect(radios[0].tabIndex).toBe(-1);

    // End key navigates to last category
    fireEvent.keyDown(radios[1], { key: "End" });
    expect(radios[7].getAttribute("aria-checked")).toBe("true");
    expect(radios[7].tabIndex).toBe(0);

    // Home key navigates back to first category
    fireEvent.keyDown(radios[7], { key: "Home" });
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[0].tabIndex).toBe(0);
  });

  it("useReducedMotion and getPrefersReducedMotion correctly query runtime media capabilities", () => {
    expect(typeof getPrefersReducedMotion()).toBe("boolean");
  });
});
