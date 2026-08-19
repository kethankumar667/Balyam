import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { recoveryManager } from "../RecoveryManager";
import { connectionStateManager } from "../ConnectionStateManager";
import { getActiveSession, saveActiveSession } from "../recoveryStorage";
import { eventBus } from "../../../lib/eventBus";
import type { AppSocket } from "../../../lib/socket";

function createMockSocket() {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  const ioHandlers: Record<string, ((...args: any[]) => void)[]> = {};

  return {
    on: (evt: string, fn: (...args: any[]) => void) => {
      handlers[evt] = handlers[evt] || [];
      handlers[evt].push(fn);
    },
    emit: vi.fn(),
    io: {
      on: (evt: string, fn: (...args: any[]) => void) => {
        ioHandlers[evt] = ioHandlers[evt] || [];
        ioHandlers[evt].push(fn);
      },
    },
    _trigger: (evt: string, ...args: any[]) => {
      handlers[evt]?.forEach((fn) => fn(...args));
    },
    _triggerIo: (evt: string, ...args: any[]) => {
      ioHandlers[evt]?.forEach((fn) => fn(...args));
    },
  } as unknown as AppSocket & { _trigger: (evt: string, ...args: any[]) => void; _triggerIo: (evt: string, ...args: any[]) => void };
}

describe("Realtime Recovery — RoomRecoveryManager", () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  const storeMap = new Map<string, string>();

  beforeEach(() => {
    storeMap.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => storeMap.set(k, String(v)),
      removeItem: (k: string) => storeMap.delete(k),
      clear: () => storeMap.clear(),
    });
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      localStorage,
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hidden: false,
    });
    recoveryManager.destroy();
    mockSocket = createMockSocket();
    recoveryManager.init(mockSocket);
  });

  afterEach(() => {
    recoveryManager.destroy();
    vi.unstubAllGlobals();
  });

  it("attaches an active room and persists recovery session", () => {
    recoveryManager.attachRoom("LUDO99", "player_123", "seat_token_abc", "Alice", "01.png");

    const session = getActiveSession();
    expect(session).toBeDefined();
    expect(session?.roomId).toBe("LUDO99");
    expect(session?.playerId).toBe("player_123");
    expect(session?.seatToken).toBe("seat_token_abc");
    expect(session?.playerName).toBe("Alice");
    expect(connectionStateManager.getState()).toBe("CONNECTED");
  });

  it("generates collision-resistant monotonic actionId for idempotency", () => {
    const act1 = recoveryManager.generateActionId("move");
    const act2 = recoveryManager.generateActionId("move");
    const act3 = recoveryManager.generateActionId("chat");

    expect(act1).toMatch(/^move_\d+_[a-z0-9]+$/);
    expect(act2).toMatch(/^move_\d+_[a-z0-9]+$/);
    expect(act3).toMatch(/^chat_\d+_[a-z0-9]+$/);
    expect(act1).not.toBe(act2);
  });

  it("performs authoritative recovery handshake on reconnect", async () => {
    recoveryManager.attachRoom("ROOM_1", "p1", "token1", "Player1");

    const emittedEvents: string[] = [];
    eventBus.subscribe("RECOVERY_STARTED", () => emittedEvents.push("STARTED"));
    eventBus.subscribe("RECOVERY_SUCCEEDED", () => emittedEvents.push("SUCCEEDED"));

    // Simulate mockSocket join response
    mockSocket.emit = vi.fn().mockImplementation((event, payload, ack) => {
      if (event === "room:join") {
        ack({
          ok: true,
          playerId: payload.playerId,
          seatToken: payload.seatToken,
          state: {
            code: "ROOM_1",
            game: "ludo",
            status: "playing",
            players: [{ id: "p1", name: "Player1", isHost: true }],
          },
        });
      }
    });

    const success = await recoveryManager.attemptRecovery("ROOM_1");

    expect(success).toBe(true);
    expect(connectionStateManager.getState()).toBe("RECOVERED");
    expect(emittedEvents).toEqual(["STARTED", "SUCCEEDED"]);
  });

  it("handles recovery rejection gracefully and publishes failure event", async () => {
    recoveryManager.attachRoom("ROOM_DEAD", "p1", "token1", "Player1");

    let failureError = "";
    eventBus.subscribe("RECOVERY_FAILED", (payload) => {
      failureError = payload.error;
    });

    mockSocket.emit = vi.fn().mockImplementation((event, _payload, ack) => {
      if (event === "room:join") {
        ack({
          ok: false,
          error: "Room not found",
        });
      }
    });

    const success = await recoveryManager.attemptRecovery("ROOM_DEAD");

    expect(success).toBe(false);
    expect(failureError).toBe("Room not found");
  });

  it("clears recovery state on explicit room detachment", () => {
    recoveryManager.attachRoom("ROOM_LEAVE", "p1", "token1");
    expect(getActiveSession()).not.toBeNull();

    recoveryManager.detachRoom();

    expect(getActiveSession()).toBeNull();
    expect(connectionStateManager.getState()).toBe("DISCONNECTED");
  });
});
