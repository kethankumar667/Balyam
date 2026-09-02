import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRoomStore } from "../roomStore";
import type { RoomPublicState } from "@shared/types";

describe("RoomStore Characterization Suite", () => {
  const storeMap = new Map<string, string>();

  beforeEach(() => {
    storeMap.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => storeMap.set(k, String(v)),
      removeItem: (k: string) => storeMap.delete(k),
      clear: () => storeMap.clear(),
    });
    vi.stubGlobal("window", {});
    useRoomStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manages player identity and local storage synchronization", () => {
    const store = useRoomStore.getState();
    store.setPlayerName("Kethan");
    store.setAvatarId("avatar-3.png");
    store.setPlayerId("p_12345");

    expect(useRoomStore.getState().playerName).toBe("Kethan");
    expect(useRoomStore.getState().avatarId).toBe("avatar-3.png");
    expect(useRoomStore.getState().playerId).toBe("p_12345");
    expect(storeMap.get("mpg.playerName")).toBe("Kethan");
    expect(storeMap.get("mpg.avatar")).toBe("avatar-3.png");
    expect(storeMap.get("mpg.playerId")).toBe("p_12345");
  });

  it("stores and retrieves seat credentials across rooms", () => {
    const store = useRoomStore.getState();
    store.rememberSeat("ABC123", "p_111", "token_aaa");
    store.rememberSeat("XYZ789", "p_222", "token_bbb");

    expect(store.seatFor("ABC123")).toEqual({ playerId: "p_111", seatToken: "token_aaa" });
    expect(store.seatFor("XYZ789")).toEqual({ playerId: "p_222", seatToken: "token_bbb" });
    expect(store.seatFor("NONEXISTENT")).toBeNull();

    // Verify stored JSON
    const stored = JSON.parse(storeMap.get("mpg.seats") || "{}");
    expect(stored.ABC123).toEqual({ playerId: "p_111", seatToken: "token_aaa" });
    expect(stored.XYZ789).toEqual({ playerId: "p_222", seatToken: "token_bbb" });
  });

  it("forgets a seat credential on demand (dead-room cleanup)", () => {
    const store = useRoomStore.getState();
    store.rememberSeat("ABC123", "p_111", "token_aaa");
    store.rememberSeat("XYZ789", "p_222", "token_bbb");

    store.forgetSeat("abc123"); // case-insensitive like seatFor()

    expect(store.seatFor("ABC123")).toBeNull();
    expect(store.seatFor("XYZ789")).not.toBeNull();
    const stored = JSON.parse(storeMap.get("mpg.seats") || "{}");
    expect(stored.ABC123).toBeUndefined();
    expect(stored.XYZ789).toBeDefined();

    // Forgetting an unknown code is a no-op, not an error.
    expect(() => store.forgetSeat("NOPE00")).not.toThrow();
  });

  it("caps remembered seats to MAX_REMEMBERED_SEATS (12)", () => {
    const store = useRoomStore.getState();
    for (let i = 0; i < 15; i++) {
      store.rememberSeat(`ROOM_${i}`, `player_${i}`, `token_${i}`);
    }

    const seats = useRoomStore.getState().seats;
    const keys = Object.keys(seats);
    expect(keys.length).toBeLessThanOrEqual(12);
    // Oldest entries (ROOM_0, ROOM_1, ROOM_2) pruned, newest kept
    expect(keys).toContain("ROOM_14");
    expect(keys).toContain("ROOM_13");
    expect(keys).not.toContain("ROOM_0");
  });

  it("updates and resets room state cleanly while preserving player credentials", () => {
    const store = useRoomStore.getState();
    store.setPlayerName("Alice");
    store.rememberSeat("TEST01", "p_alice", "tok_alice");

    const mockRoomState: RoomPublicState = {
      code: "TEST01",
      name: "Alice's Room",
      game: "ludo",
      phase: "lobby",
      hostId: "p_alice",
      sealed: false,
      players: [
        { id: "p_alice", name: "Alice", isHost: true, isReady: true, isConnected: true },
      ],
      history: [],
      champion: null,
      unoHistory: [],
      unoChampion: null,
      bingoHistory: [],
      ludoHistory: [],
      maxPlayers: 4,
    };

    store.setRoomState(mockRoomState);
    store.setGameState({ turn: "red", diceRolled: false });
    store.addMessage({
      id: "m1",
      playerId: "p_alice",
      playerName: "Alice",
      text: "Hello room!",
      ts: Date.now(),
    });
    store.setError("Temporary error");

    expect(useRoomStore.getState().roomState?.code).toBe("TEST01");
    expect(useRoomStore.getState().gameState).toBeDefined();
    expect(useRoomStore.getState().messages).toHaveLength(1);
    expect(useRoomStore.getState().lastError).toBe("Temporary error");

    // Reset room state
    useRoomStore.getState().reset();

    const resetState = useRoomStore.getState();
    expect(resetState.roomState).toBeNull();
    expect(resetState.gameState).toBeNull();
    expect(resetState.messages).toEqual([]);
    expect(resetState.lastError).toBeNull();
    // Player identity and seats preserved
    expect(resetState.playerName).toBe("Alice");
    expect(resetState.seatFor("TEST01")).toEqual({ playerId: "p_alice", seatToken: "tok_alice" });
  });

  it("records last gangs for Rummy nostalgia and bounds to 3 entries", () => {
    const store = useRoomStore.getState();
    store.recordLastGang("Gang 1", ["Alice", "Bob"]);
    store.recordLastGang("Gang 2", ["Alice", "Charlie"]);
    store.recordLastGang("Gang 3", ["Alice", "Dave"]);
    store.recordLastGang("Gang 4", ["Alice", "Eve"]);

    const gangs = useRoomStore.getState().lastGangs;
    expect(gangs).toHaveLength(3);
    expect(gangs[0]?.roomName).toBe("Gang 4");
    expect(gangs[1]?.roomName).toBe("Gang 3");
    expect(gangs[2]?.roomName).toBe("Gang 2");
  });
});
