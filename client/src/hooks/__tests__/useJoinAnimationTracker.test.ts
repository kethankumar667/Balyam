import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useJoinAnimationTracker } from "../useJoinAnimationTracker";
import type { Player } from "@shared/types";
import { AudioManager } from "../../services/AudioManager";

// Mock AudioManager
vi.mock("../../services/AudioManager", () => {
  const playMock = vi.fn();
  return {
    AudioManager: {
      getInstance: () => ({
        play: playMock,
      }),
    },
  };
});

function makePlayer(id: string, name: string, isBot = false, isConnected = true): Player {
  return {
    id,
    name,
    isBot,
    isConnected,
    isHost: false,
    isReady: false,
  };
}

describe("useJoinAnimationTracker Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes existing players snapshot on first mount without emitting join events (idempotency)", () => {
    const initialPlayers = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
    ];

    const { result } = renderHook(() =>
      useJoinAnimationTracker(initialPlayers, { enabled: true }),
    );

    // Initial players must NOT trigger join events (page refresh / first load guarantee)
    expect(result.current.recentJoins).toEqual([]);
    expect(result.current.newPlayerIds.size).toBe(0);
  });

  it("emits human join event when a new human player joins after initial snapshot", () => {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");

    let currentPlayers = [p1, p2];
    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    expect(result.current.recentJoins.length).toBe(0);

    // New human player Charlie joins
    const p3 = makePlayer("p3", "Charlie", false);
    currentPlayers = [p1, p2, p3];

    act(() => {
      rerender({ players: currentPlayers });
    });

    expect(result.current.recentJoins.length).toBe(1);
    expect(result.current.recentJoins[0].playerId).toBe("p3");
    expect(result.current.recentJoins[0].name).toBe("Charlie");
    expect(result.current.recentJoins[0].isBot).toBe(false);
    expect(result.current.newPlayerIds.has("p3")).toBe(true);
  });

  it("emits bot join event with isBot: true when a bot is added", () => {
    const p1 = makePlayer("p1", "Alice");
    let currentPlayers = [p1];

    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    // Bot Sparky is added
    const bot1 = makePlayer("bot_1", "Sparky", true);
    currentPlayers = [p1, bot1];

    act(() => {
      rerender({ players: currentPlayers });
    });

    expect(result.current.recentJoins.length).toBe(1);
    expect(result.current.recentJoins[0].playerId).toBe("bot_1");
    expect(result.current.recentJoins[0].name).toBe("Sparky");
    expect(result.current.recentJoins[0].isBot).toBe(true);
    expect(result.current.newPlayerIds.has("bot_1")).toBe(true);
  });

  it("does not replay join events on presence toggles, reconnects, or recovery", () => {
    const p1 = makePlayer("p1", "Alice", false, true);
    const p2 = makePlayer("p2", "Bob", false, true);
    let currentPlayers = [p1, p2];

    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    // p2 goes away (reconnecting / recovery)
    const p2Away = makePlayer("p2", "Bob", false, false);
    currentPlayers = [p1, p2Away];

    act(() => {
      rerender({ players: currentPlayers });
    });
    expect(result.current.recentJoins.length).toBe(0);

    // p2 reconnects back
    const p2Back = makePlayer("p2", "Bob", false, true);
    currentPlayers = [p1, p2Back];

    act(() => {
      rerender({ players: currentPlayers });
    });

    // Reconnecting back must NEVER emit a new join event
    expect(result.current.recentJoins.length).toBe(0);
    expect(result.current.newPlayerIds.size).toBe(0);
  });

  it("does not replay join events on state resync with identical player list", () => {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");

    let currentPlayers = [p1, p2];
    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    // Add Dave
    const p3 = makePlayer("p3", "Dave");
    currentPlayers = [p1, p2, p3];

    act(() => {
      rerender({ players: currentPlayers });
    });

    expect(result.current.recentJoins.length).toBe(1);

    // Advance timers so toast dismisses
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.recentJoins.length).toBe(0);

    // Re-render with new array reference containing same players (state broadcast resync)
    act(() => {
      rerender({ players: [{ ...p1 }, { ...p2 }, { ...p3 }] });
    });

    // Zero replayed events
    expect(result.current.recentJoins.length).toBe(0);
  });

  it("auto-dismisses join banners after autoDismissMs", () => {
    const p1 = makePlayer("p1", "Alice");
    let currentPlayers = [p1];

    const { result, rerender } = renderHook(
      ({ players }) =>
        useJoinAnimationTracker(players, { enabled: true, autoDismissMs: 2000, newSeatDurationMs: 800 }),
      { initialProps: { players: currentPlayers } },
    );

    const p2 = makePlayer("p2", "Bob");
    act(() => {
      rerender({ players: [p1, p2] });
    });

    expect(result.current.recentJoins.length).toBe(1);
    expect(result.current.newPlayerIds.has("p2")).toBe(true);

    // After 800ms, newPlayerIds cleared
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(result.current.newPlayerIds.has("p2")).toBe(false);
    expect(result.current.recentJoins.length).toBe(1);

    // After 2000ms, recentJoins auto-dismissed
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(result.current.recentJoins.length).toBe(0);
  });

  it("allows manual dismissal of a join event via dismissJoin", () => {
    const p1 = makePlayer("p1", "Alice");
    let currentPlayers = [p1];

    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    const p2 = makePlayer("p2", "Bob");
    act(() => {
      rerender({ players: [p1, p2] });
    });

    expect(result.current.recentJoins.length).toBe(1);
    const joinId = result.current.recentJoins[0].id;

    act(() => {
      result.current.dismissJoin(joinId);
    });

    expect(result.current.recentJoins.length).toBe(0);
  });

  it("caps simultaneous join banners at 3 when a burst of joins arrives in one update", () => {
    const p1 = makePlayer("p1", "Alice");
    let currentPlayers = [p1];

    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    // 5 new players land in a single room-state broadcast
    const burst = [
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Charlie"),
      makePlayer("p4", "Dave"),
      makePlayer("p5", "Eve"),
      makePlayer("p6", "Frank"),
    ];
    currentPlayers = [p1, ...burst];

    act(() => {
      rerender({ players: currentPlayers });
    });

    // Never more than 3 banners visible at once, regardless of burst size
    expect(result.current.recentJoins.length).toBe(3);
    // Keeps the most recently joined players, drops the oldest from the burst
    expect(result.current.recentJoins.map((j) => j.playerId)).toEqual([
      "p4",
      "p5",
      "p6",
    ]);
  });

  it("silently updates seen IDs without emitting events when enabled is false", () => {
    const p1 = makePlayer("p1", "Alice");
    let currentPlayers = [p1];

    const { result, rerender } = renderHook(
      ({ players, enabled }) => useJoinAnimationTracker(players, { enabled }),
      { initialProps: { players: currentPlayers, enabled: false } },
    );

    // Player joins while not enabled (e.g., game in progress)
    const p2 = makePlayer("p2", "Bob");
    act(() => {
      rerender({ players: [p1, p2], enabled: false });
    });

    expect(result.current.recentJoins.length).toBe(0);

    // Enabling later does not trigger stale join event for p2
    act(() => {
      rerender({ players: [p1, p2], enabled: true });
    });
    expect(result.current.recentJoins.length).toBe(0);
  });

  it("resets tracking when the room identity changes, seeding the new room silently", () => {
    const roomAPlayers = [makePlayer("p1", "Alice"), makePlayer("p2", "Bob")];

    const { result, rerender } = renderHook(
      ({ players, roomCode }) =>
        useJoinAnimationTracker(players, { roomCode, enabled: true }),
      { initialProps: { players: roomAPlayers, roomCode: "ROOMA" } },
    );

    expect(result.current.recentJoins.length).toBe(0);

    // A genuine join in room A works as expected
    const p3 = makePlayer("p3", "Charlie");
    act(() => {
      rerender({ players: [...roomAPlayers, p3], roomCode: "ROOMA" });
    });
    expect(result.current.recentJoins.length).toBe(1);

    // Route changes to a different room while the hook stays mounted. Room
    // B's existing roster (which happens to reuse player ID "p1") must not
    // replay as a join, and any pending Room A banner must be gone.
    const roomBPlayers = [makePlayer("p1", "Alice"), makePlayer("p9", "Zoe")];
    act(() => {
      rerender({ players: roomBPlayers, roomCode: "ROOMB" });
    });
    expect(result.current.recentJoins.length).toBe(0);
    expect(result.current.newPlayerIds.size).toBe(0);

    // A genuine new join in room B fires exactly once
    const p10 = makePlayer("p10", "Yusuf");
    act(() => {
      rerender({ players: [...roomBPlayers, p10], roomCode: "ROOMB" });
    });
    expect(result.current.recentJoins.length).toBe(1);
    expect(result.current.recentJoins[0].playerId).toBe("p10");
  });

  it("emits at most one event per player ID when the roster contains duplicate entries", () => {
    const p1 = makePlayer("p1", "Alice");
    let currentPlayers = [p1];

    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    // Malformed broadcast: the same new player ID appears twice
    const p2 = makePlayer("p2", "Bob");
    currentPlayers = [p1, p2, { ...p2 }];

    act(() => {
      rerender({ players: currentPlayers });
    });

    expect(result.current.recentJoins.length).toBe(1);
    expect(result.current.recentJoins[0].playerId).toBe("p2");
  });

  it("does not erase a seen player ID when it is briefly omitted from an incomplete snapshot", () => {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");
    let currentPlayers = [p1, p2];

    const { result, rerender } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: currentPlayers } },
    );

    // p2 is briefly missing from one state frame (not a real departure)
    act(() => {
      rerender({ players: [p1] });
    });
    expect(result.current.recentJoins.length).toBe(0);

    // p2 reappears — must NOT replay as a new join
    act(() => {
      rerender({ players: [p1, p2] });
    });
    expect(result.current.recentJoins.length).toBe(0);
  });

  it("cleans up all pending timers on unmount without further state updates", () => {
    const p1 = makePlayer("p1", "Alice");
    const { result, rerender, unmount } = renderHook(
      ({ players }) => useJoinAnimationTracker(players, { enabled: true }),
      { initialProps: { players: [p1] } },
    );

    const p2 = makePlayer("p2", "Bob");
    act(() => {
      rerender({ players: [p1, p2] });
    });
    expect(result.current.recentJoins.length).toBe(1);

    const clearSpy = vi.spyOn(global, "clearTimeout");
    unmount();

    // Both the auto-dismiss timer and the new-seat-highlight timer are cleared
    expect(clearSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Advancing timers post-unmount must not throw or warn about updating
    // state on an unmounted component.
    expect(() => act(() => vi.advanceTimersByTime(5000))).not.toThrow();
    clearSpy.mockRestore();
  });

  it("invokes onJoin with every genuinely new player in a batch, uncapped", () => {
    const p1 = makePlayer("p1", "Alice");
    const onJoin = vi.fn();

    const { rerender } = renderHook(
      ({ players }) =>
        useJoinAnimationTracker(players, { enabled: true, onJoin }),
      { initialProps: { players: [p1] } },
    );

    const burst = [
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Charlie"),
      makePlayer("p4", "Dave"),
      makePlayer("p5", "Eve"),
    ];
    act(() => {
      rerender({ players: [p1, ...burst] });
    });

    expect(onJoin).toHaveBeenCalledTimes(1);
    // Uncapped — all 4 joiners are reported even though only 3 banners show
    expect(onJoin.mock.calls[0][0]).toHaveLength(4);
  });
});
