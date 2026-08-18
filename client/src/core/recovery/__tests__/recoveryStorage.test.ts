import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveActiveSession,
  getActiveSession,
  getRoomSession,
  updateSessionSequence,
  clearActiveSession,
  clearRoomSession,
  type RecoverySession,
} from "../recoveryStorage";

describe("Realtime Recovery — Session Persistence Layer", () => {
  const storeMap = new Map<string, string>();

  beforeEach(() => {
    storeMap.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => storeMap.set(k, String(v)),
      removeItem: (k: string) => storeMap.delete(k),
      clear: () => storeMap.clear(),
    });
    vi.stubGlobal("window", { localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and retrieves the active recovery session", () => {
    const session: RecoverySession = {
      sessionId: "sess_123",
      playerId: "player_abc",
      roomId: "LUDO99",
      playerName: "Alice",
      seatToken: "token_xyz",
      createdAt: 1000,
      updatedAt: 1000,
    };

    saveActiveSession(session);

    const retrieved = getActiveSession();
    expect(retrieved).toBeDefined();
    expect(retrieved?.roomId).toBe("LUDO99");
    expect(retrieved?.playerId).toBe("player_abc");
    expect(retrieved?.seatToken).toBe("token_xyz");
  });

  it("retrieves room-specific session regardless of case", () => {
    const session: RecoverySession = {
      sessionId: "sess_456",
      playerId: "player_def",
      roomId: "RUMMY1",
      playerName: "Bob",
      createdAt: 2000,
      updatedAt: 2000,
    };

    saveActiveSession(session);

    const sessionLower = getRoomSession("rummy1");
    const sessionUpper = getRoomSession("RUMMY1");

    expect(sessionLower?.playerId).toBe("player_def");
    expect(sessionUpper?.playerId).toBe("player_def");
  });

  it("updates sequence number safely on live sessions", () => {
    const session: RecoverySession = {
      sessionId: "sess_seq",
      playerId: "p1",
      roomId: "CHESS2",
      playerName: "Vishy",
      createdAt: 1000,
      updatedAt: 1000,
    };

    saveActiveSession(session);
    updateSessionSequence("CHESS2", 42);

    const updated = getRoomSession("CHESS2");
    expect(updated?.lastKnownSequence).toBe(42);
  });

  it("clears active session and room entries cleanly", () => {
    const session: RecoverySession = {
      sessionId: "sess_clear",
      playerId: "p1",
      roomId: "UNO123",
      playerName: "Charlie",
      createdAt: 1000,
      updatedAt: 1000,
    };

    saveActiveSession(session);
    expect(getActiveSession()).not.toBeNull();

    clearActiveSession();
    expect(getActiveSession()).toBeNull();
    expect(getRoomSession("UNO123")).toBeNull();
  });

  it("clears targeted room session without affecting other rooms", () => {
    saveActiveSession({
      sessionId: "s1",
      playerId: "p1",
      roomId: "ROOM_A",
      playerName: "P1",
      createdAt: 1000,
      updatedAt: 1000,
    });
    saveActiveSession({
      sessionId: "s2",
      playerId: "p2",
      roomId: "ROOM_B",
      playerName: "P2",
      createdAt: 1000,
      updatedAt: 1000,
    });

    clearRoomSession("ROOM_A");
    expect(getRoomSession("ROOM_A")).toBeNull();
    expect(getRoomSession("ROOM_B")).not.toBeNull();
  });
});
