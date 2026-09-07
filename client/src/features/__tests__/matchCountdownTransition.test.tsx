import { describe, it, expect, vi } from "vitest";
import React, { useState } from "react";
import { render, screen, act } from "@testing-library/react";
import { isMatchStartTransition } from "../../lib/economyMotionTriggers";
import BhalyamMatchCountdown from "../../animations/app/BhalyamMatchCountdown";

vi.mock("../../hooks/useAudio", () => ({
  useAudio: () => ({ play: vi.fn(), stop: vi.fn() }),
}));

vi.mock("../../hooks/useHaptics", () => ({
  useHaptics: () => ({
    subtle: vi.fn(),
    turn: vi.fn(),
    win: vi.fn(),
  }),
}));

vi.mock("../../animations/particles/comicBursts", () => ({
  fireComicDustBurst: vi.fn(),
  fireStarSparkleBurst: vi.fn(),
}));

vi.mock("../../animations/camera/useTableCamera", () => ({
  useTableCamera: () => ({ punch: vi.fn() }),
}));

describe("Match Countdown Pre-Game Transition", () => {
  function MatchHarness({ initialPhase }: { initialPhase: "lobby" | "playing" }) {
    const [phase, setPhase] = useState<"lobby" | "playing">(initialPhase);
    const [prevRenderedPhase, setPrevRenderedPhase] = useState<string | undefined>(initialPhase);
    const [matchStartCeremonyActive, setMatchStartCeremonyActive] = useState(false);
    const [showMatchCountdown, setShowMatchCountdown] = useState(false);

    if (phase !== prevRenderedPhase) {
      setPrevRenderedPhase(phase);
      if (isMatchStartTransition(prevRenderedPhase, phase)) {
        setMatchStartCeremonyActive(true);
        setShowMatchCountdown(true);
      }
    }

    const isGameStartingCeremony = matchStartCeremonyActive || showMatchCountdown;

    return (
      <div>
        <button onClick={() => setPhase("playing")} data-testid="start-match-btn">
          Start Match
        </button>

        {/* Gated layout logic matching Room.tsx */}
        {phase === "lobby" || isGameStartingCeremony ? (
          <div data-testid="lobby-view">
            LOBBY_VIEW
          </div>
        ) : (
          <div data-testid="game-board-container">
            <div data-testid="handcricket-team-selection">
              HAND_CRICKET_TEAM_SELECTION_PAGE
            </div>
          </div>
        )}

        {showMatchCountdown && (
          <BhalyamMatchCountdown
            onComplete={() => {
              setShowMatchCountdown(false);
              setMatchStartCeremonyActive(false);
            }}
          />
        )}
      </div>
    );
  }

  it("does NOT mount the game board or team selection page during the 3, 2, 1 countdown", async () => {
    vi.useFakeTimers();

    render(<MatchHarness initialPhase="lobby" />);

    // Initially in lobby
    expect(screen.getByTestId("lobby-view")).toBeDefined();
    expect(screen.queryByTestId("game-board-container")).toBeNull();
    expect(screen.queryByTestId("handcricket-team-selection")).toBeNull();

    // Trigger match start (phase -> playing)
    act(() => {
      screen.getByTestId("start-match-btn").click();
    });

    // Countdown is now active (showing 3..2..1..)
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("Get Ready")).toBeDefined();

    // CRITICAL REQUIREMENT: Game-related pages (e.g. Hand Cricket team selection) must NOT be loaded yet!
    expect(screen.queryByTestId("game-board-container")).toBeNull();
    expect(screen.queryByTestId("handcricket-team-selection")).toBeNull();
    // Lobby view remains behind the countdown overlay
    expect(screen.getByTestId("lobby-view")).toBeDefined();

    // Advance timer mid-countdown (2000ms) — still within countdown
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId("game-board-container")).toBeNull();
    expect(screen.queryByTestId("handcricket-team-selection")).toBeNull();
    expect(screen.getByTestId("lobby-view")).toBeDefined();

    // Advance timer past countdown completion (3600ms total)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // NOW that countdown is complete: game board and team selection page load!
    expect(screen.queryByTestId("lobby-view")).toBeNull();
    expect(screen.getByTestId("game-board-container")).toBeDefined();
    expect(screen.getByTestId("handcricket-team-selection")).toBeDefined();

    vi.useRealTimers();
  });

  it("loads game board immediately on hard refresh or late join without replay of countdown", () => {
    render(<MatchHarness initialPhase="playing" />);

    expect(screen.getByTestId("game-board-container")).toBeDefined();
    expect(screen.getByTestId("handcricket-team-selection")).toBeDefined();
    expect(screen.queryByTestId("lobby-view")).toBeNull();
  });
});
