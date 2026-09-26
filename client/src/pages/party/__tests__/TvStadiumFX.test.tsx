import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { isGameInClimax, TvClimaxBanner } from "../TvClimaxBanner";
import { TvCommentaryTicker } from "../TvCommentaryTicker";
import { TvCrowdReactions } from "../TvCrowdReactions";
import { getTvJoinUrl } from "../TvLobbyView";
import { getLatestHandCricketBall } from "../tvState";
import { useTvScreenShake } from "../useTvScreenShake";
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
      expect(isGameInClimax("uno", { handSizes: { p1: 5, p2: 1 } })).toBe(true);
      expect(isGameInClimax("uno", { handSizes: { p1: 5, p2: 3 } })).toBe(false);
    });

    it("detects Climax in Hand Cricket when innings 2 target is within 12 runs", () => {
      expect(
        isGameInClimax("handcricket", {
          phase: "innings2",
          innings1: { runs: 49 },
          innings2: { runs: 42, balls: 10, overs: 10 },
        })
      ).toBe(true);

      expect(
        isGameInClimax("handcricket", {
          phase: "innings1",
          innings1: { runs: 42 },
          innings2: null,
        })
      ).toBe(false);
    });
  });

  it("builds the QR join URL from the routed room path", () => {
    expect(getTvJoinUrl("https://bhalyam.com", "TV1234")).toBe("https://bhalyam.com/room/TV1234");
  });

  it("reads the latest Hand Cricket ball from the server history shape", () => {
    expect(
      getLatestHandCricketBall({
        phase: "innings1",
        innings1: { history: [{ ballNumber: 4, runs: 6, wicket: false }] },
      })
    ).toEqual({ key: "innings1:4", runs: 6, isWicket: false });
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

    it("generates Snakes & Ladders commentary from the latest event kind", () => {
      render(
        <TvCommentaryTicker
          game="snl"
          gameState={{
            recentEvents: [{ kind: "snake", playerId: "p1", ts: 1 }],
          }}
          players={mockPlayers}
        />
      );

      expect(screen.getByText(/DISASTER! Slipped right down/i)).toBeDefined();
    });

    it("updates commentary when the latest Snakes & Ladders event changes", () => {
      const { rerender } = render(
        <TvCommentaryTicker
          game="snl"
          gameState={{ recentEvents: [{ kind: "snake", playerId: "p1", ts: 1 }] }}
          players={mockPlayers}
        />
      );

      rerender(
        <TvCommentaryTicker
          game="snl"
          gameState={{ recentEvents: [{ kind: "ladder", playerId: "p2", ts: 2 }] }}
          players={mockPlayers}
        />
      );

      expect(screen.getByText(/SKY HIGH! Climbing the ladder/i)).toBeDefined();
    });

    it("generates Ludo capture commentary without marquee thrashing", () => {
      const { rerender } = render(
        <TvCommentaryTicker
          game="ludo"
          gameState={{ lastAction: "kill", lastActionTs: 100 }}
          players={mockPlayers}
        />
      );

      expect(screen.getByText(/GOTCHA! Token hunted down/i)).toBeDefined();

      // Rerender with same capture event ts
      rerender(
        <TvCommentaryTicker
          game="ludo"
          gameState={{ lastAction: "kill", lastActionTs: 100 }}
          players={mockPlayers}
        />
      );
      expect(screen.getByText(/GOTCHA! Token hunted down/i)).toBeDefined();

      // Rerender with new capture event
      rerender(
        <TvCommentaryTicker
          game="ludo"
          gameState={{ lastAction: "kill", lastActionTs: 200 }}
          players={mockPlayers}
        />
      );
      expect(screen.getByText(/GOTCHA! Token hunted down/i)).toBeDefined();
    });

    it("generates UNO Wild Draw 4 and Skip commentary with card ID keys", () => {
      const { rerender } = render(
        <TvCommentaryTicker
          game="uno"
          gameState={{ topCard: { id: "c1", rank: "Wild+4", color: null } }}
          players={mockPlayers}
        />
      );

      expect(screen.getByText(/WILD DRAW FOUR! Complete chaos unleashed/i)).toBeDefined();

      rerender(
        <TvCommentaryTicker
          game="uno"
          gameState={{ topCard: { id: "c2", rank: "Skip", color: "R" } }}
          players={mockPlayers}
        />
      );

      expect(screen.getByText(/TURN SKIPPED! Denied!/i)).toBeDefined();
    });

    it("generates Rummy showdown declare commentary with round guards", () => {
      render(
        <TvCommentaryTicker
          game="rummy"
          gameState={{ phase: "declare", declaredBy: "p1", roundNumber: 1 }}
          players={mockPlayers}
        />
      );

      expect(screen.getByText(/SHOWDOWN DECLARED! Hands on the table/i)).toBeDefined();
    });
  });

  describe("useTvScreenShake hook", () => {
    it("triggers intense shake on UNO Wild+4 and subtle on Skip or +2", () => {
      const { result, rerender } = renderHook(
        ({ game, gameState }) => useTvScreenShake({ game, gameState }),
        {
          initialProps: {
            game: "uno" as const,
            gameState: { topCard: { id: "u1", rank: "Wild+4" } },
          },
        }
      );

      expect(result.current.shakeLevel).toBe("intense");

      // Rerender with same card: should not re-trigger
      act(() => {
        rerender({
          game: "uno" as const,
          gameState: { topCard: { id: "u1", rank: "Wild+4" } },
        });
      });

      // Advance to next card: Skip
      act(() => {
        rerender({
          game: "uno" as const,
          gameState: { topCard: { id: "u2", rank: "Skip" } },
        });
      });

      expect(result.current.shakeLevel).toBe("subtle");
    });

    it("triggers intense shake on RPS reveal", () => {
      const { result } = renderHook(() =>
        useTvScreenShake({
          game: "rps" as const,
          gameState: { phase: "reveal", lastRevealTs: 12345 },
        })
      );

      expect(result.current.shakeLevel).toBe("intense");
    });

    it("triggers intense shake on Rummy showdown declare", () => {
      const { result } = renderHook(() =>
        useTvScreenShake({
          game: "rummy" as const,
          gameState: { phase: "declare", declaredBy: "p1", roundNumber: 1 },
        })
      );

      expect(result.current.shakeLevel).toBe("intense");
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
