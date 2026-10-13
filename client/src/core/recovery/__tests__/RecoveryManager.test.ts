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
    off: vi.fn(),
    io: {
      on: (evt: string, fn: (...args: any[]) => void) => {
        ioHandlers[evt] = ioHandlers[evt] || [];
        ioHandlers[evt].push(fn);
      },
      off: vi.fn(),
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

  it("delegates Retry to the mounted Room owner", async () => {
    recoveryManager.attachRoom("ROOM_1", "p1", "token1", "Player1");
    const retry = vi.fn(async () => true);
    recoveryManager.registerRoomRecovery("ROOM_1", retry);

    const success = await recoveryManager.attemptRecovery("ROOM_1");

    expect(success).toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("returns the owning Room rejection without a second join", async () => {
    recoveryManager.attachRoom("ROOM_DEAD", "p1", "token1", "Player1");
    recoveryManager.registerRoomRecovery("ROOM_DEAD", async () => false);

    const success = await recoveryManager.attemptRecovery("ROOM_DEAD");

    expect(success).toBe(false);
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("clears recovery state on explicit room detachment", () => {
    recoveryManager.attachRoom("ROOM_LEAVE", "p1", "token1");
    expect(getActiveSession()).not.toBeNull();

    recoveryManager.detachRoom();

    expect(getActiveSession()).toBeNull();
    expect(connectionStateManager.getState()).toBe("DISCONNECTED");
  });

  it("never emits a credentialless join when Retry has no mounted Room owner", () => {
    recoveryManager.attachRoom("ROOM_1", "p1", "token1", "Player1");

    void recoveryManager.attemptRecovery("ROOM_1");

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(connectionStateManager.getState()).toBe("FAILED");
  });

  it("removes browser and socket lifecycle listeners on destroy", () => {
    recoveryManager.destroy();

    expect(window.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
    expect(document.removeEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(mockSocket.io.off).toHaveBeenCalledWith("reconnect", expect.any(Function));
  });

  it("keeps a replacement owner registered when an obsolete owner cleans up", async () => {
    const disposeOld = recoveryManager.registerRoomRecovery("OLD123", async () => false);
    const retry = vi.fn(async () => true);
    const disposeNew = recoveryManager.registerRoomRecovery("NEW123", retry);
    disposeOld();
    expect(await recoveryManager.attemptRecovery("OLD123")).toBe(false);
    expect(retry).not.toHaveBeenCalled();
    expect(await recoveryManager.attemptRecovery("NEW123")).toBe(true);
    disposeNew();
    expect(await recoveryManager.attemptRecovery("NEW123")).toBe(false);
  });
});
