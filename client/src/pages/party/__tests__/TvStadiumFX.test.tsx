import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { isGameInClimax, TvClimaxBanner } from "../TvClimaxBanner";
import { TvCommentaryTicker } from "../TvCommentaryTicker";
import { TvCrowdReactions } from "../TvCrowdReactions";
import type { Player, ReactionRecvPayload } from "@shared/types";

// Mock socket
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({
    on: mockSocketOn,
    off: mockSocketOff,
    emit: vi.fn(),
  }),
}));

describe("TV Stadium Intense FX & Climax Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isGameInClimax detection", () => {
    it("detects Climax in Ludo when a player has 3 or more tokens in home", () => {
      const stateWith3Home = {
        tokens: {
          p1: [
            { id: "red-0", color: "red", state: "home" },
            { id: "red-1", color: "red", state: "home" },
            { id: "red-2", color: "red", state: "home" },
            { id: "red-3", color: "red", state: "track", trackPos: 10 },
          ],
        },
      };
      expect(isGameInClimax("ludo", stateWith3Home)).toBe(true);

      const stateEarly = {
        tokens: {
          p1: [
            { id: "red-0", color: "red", state: "home" },
            { id: "red-1", color: "red", state: "track", trackPos: 20 },
            { id: "red-2", color: "red", state: "yard" },
            { id: "red-3", color: "red", state: "track", trackPos: 10 },
          ],
        },
      };
      expect(isGameInClimax("ludo", stateEarly)).toBe(false);
    });

    it("detects Climax in Snakes & Ladders when any position >= 90", () => {
      expect(isGameInClimax("snl", { positions: { p1: 45, p2: 92 } })).toBe(true);
      expect(isGameInClimax("snl", { positions: { p1: 45, p2: 88 } })).toBe(false);
    });

    it("detects Climax in UNO when any player has 1 card", () => {
      expect(isGameInClimax("uno", { cardCounts: { p1: 5, p2: 1 } })).toBe(true);
      expect(isGameInClimax("uno", { cardCounts: { p1: 5, p2: 3 } })).toBe(false);
    });

    it("detects Climax in Hand Cricket when innings 2 target is within 12 runs", () => {
      expect(
        isGameInClimax("handcricket", {
          currentInning: 2,
          target: 50,
          runs: 42,
          ballsRemaining: 10,
        })
      ).toBe(true);

      expect(
        isGameInClimax("handcricket", {
          currentInning: 1,
          target: 0,
          runs: 42,
        })
      ).toBe(false);
    });
  });

  describe("TvClimaxBanner component", () => {
    it("renders Sudden Death banner when in climax", () => {
      render(
        <TvClimaxBanner
          game="snl"
          gameState={{ positions: { p1: 95 } }}
        />
      );
      expect(screen.getByText(/CLIMAX • MATCH POINT/i)).toBeDefined();
    });

    it("renders nothing when not in climax", () => {
      const { container } = render(
        <TvClimaxBanner
          game="snl"
          gameState={{ positions: { p1: 30 } }}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("TvCommentaryTicker component", () => {
    const mockPlayers: Player[] = [
      { id: "p1", name: "Kethan", avatar: "hero", isHost: true, isReady: true, isConnected: true },
      { id: "p2", name: "Rahul", avatar: "wizard", isHost: false, isReady: true, isConnected: true },
    ];

    it("renders LIVE badge and player count ticker stat", () => {
      render(
        <TvCommentaryTicker
          game="handcricket"
          gameState={{ lastBallRuns: 6 }}
          players={mockPlayers}
          activePlayerName="Kethan"
        />
      );

      expect(screen.getByText("LIVE")).toBeDefined();
      expect(screen.getByText(/2 PLAYERS SEATED/i)).toBeDefined();
      expect(screen.getByText(/MAXIMUM! Huge SIX/i)).toBeDefined();
    });

    it("generates Ludo Lucky Six commentary when dice rolls 6", () => {
      render(
        <TvCommentaryTicker
          game="ludo"
          gameState={{ diceValue: 6 }}
          players={mockPlayers}
          activePlayerName="Rahul"
        />
      );

      expect(screen.getByText(/LUCKY SIX! Rahul rolls a 6!/i)).toBeDefined();
    });
  });

  describe("TvCrowdReactions component", () => {
    it("registers socket listener for room:reaction on mount and unregisters on unmount", () => {
      const { unmount } = render(
        <TvCrowdReactions players={[]} />
      );

      expect(mockSocketOn).toHaveBeenCalledWith("room:reaction", expect.any(Function));
      unmount();
      expect(mockSocketOff).toHaveBeenCalledWith("room:reaction", expect.any(Function));
    });

    it("renders incoming reactions and triggers throwable shake", () => {
      let reactionCallback: ((payload: ReactionRecvPayload) => void) | undefined;
      mockSocketOn.mockImplementation((event, cb) => {
        if (event === "room:reaction") reactionCallback = cb;
      });

      const onTriggerShake = vi.fn();
      render(
        <TvCrowdReactions
          players={[{ id: "p1", name: "Audience Member", isHost: false, isReady: true, isConnected: true }]}
          onTriggerShake={onTriggerShake}
        />
      );

      expect(reactionCallback).toBeDefined();

      act(() => {
        reactionCallback!({
          id: "r1",
          fromPlayerId: "p1",
          emoji: "🍅",
          ts: Date.now(),
        });
      });

      expect(screen.getByText("SPLAT!")).toBeDefined();
      expect(screen.getByText("from Audience Member")).toBeDefined();
      expect(onTriggerShake).toHaveBeenCalledWith("subtle");
    });
  });
});
