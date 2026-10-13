import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recoveryManager } from "../../core/recovery/RecoveryManager";
import { connectionStateManager } from "../../core/recovery/ConnectionStateManager";
import {
  getActiveSession,
  clearActiveSession,
  getRoomSession,
} from "../../core/recovery/recoveryStorage";
import { useRoomStore } from "../../store/roomStore";
import { act } from "@testing-library/react";

// Mock socket
const mockSocketEmit = vi.fn();
const mockSocketConnect = vi.fn();
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();

vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    emit: mockSocketEmit,
    connect: mockSocketConnect,
    connected: true,
    on: mockSocketOn,
    off: mockSocketOff,
    io: { on: vi.fn(), off: vi.fn() },
  }),
  useConnectionState: () => "CONNECTED",
}));

describe("BHALYAM — Client Multiplayer Game Flow & Recovery Certification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    clearActiveSession();
    connectionStateManager.reset();
    useRoomStore.setState({
      playerId: null,
      playerName: "Alice",
      avatarId: "A1",
      roomState: null,
    });
    recoveryManager.destroy();
  });

  afterEach(() => {
    recoveryManager.destroy();
    vi.useRealTimers();
  });

  describe("1. Recovery Session Persistence & Token Storage", () => {
    it("attaches active room and stores RecoverySession with seatToken in localStorage", () => {
      recoveryManager.init();

      recoveryManager.attachRoom("ROOM99", "p_alice_1", "seat_token_secure_99", "Alice", "A1");

      const session = getActiveSession();
      expect(session).toBeDefined();
      expect(session?.roomId).toBe("ROOM99");
      expect(session?.playerId).toBe("p_alice_1");
      expect(session?.seatToken).toBe("seat_token_secure_99");
      expect(session?.playerName).toBe("Alice");

      const roomSession = getRoomSession("ROOM99");
      expect(roomSession?.seatToken).toBe("seat_token_secure_99");
    });

    it("clears active session when explicitly detaching from room", () => {
      recoveryManager.init();
      recoveryManager.attachRoom("ROOM99", "p_alice_1", "seat_token_secure_99");

      expect(getActiveSession()).toBeDefined();

      recoveryManager.detachRoom();
      expect(getActiveSession()).toBeNull();
      expect(connectionStateManager.getState()).toBe("DISCONNECTED");
    });
  });

  describe("2. Authoritative Recovery Handshake on Network Loss & Reconnect", () => {
    it("delegates Retry to Room without emitting a join or declaring readiness", async () => {
      recoveryManager.init();
      recoveryManager.attachRoom("ROOM99", "p_alice_1", "seat_token_secure_99", "Alice", "A1", false);
      const retry = vi.fn().mockResolvedValue(true);
      recoveryManager.registerRoomRecovery("ROOM99", retry);

      const recoveryPromise = recoveryManager.attemptRecovery("ROOM99");

      await expect(recoveryPromise).resolves.toBe(true);
      expect(retry).toHaveBeenCalledOnce();
      expect(mockSocketEmit).not.toHaveBeenCalled();
      expect(connectionStateManager.getState()).toBe("RECOVERING");
      expect(useRoomStore.getState().roomState).toBeNull();
      expect(useRoomStore.getState().playerId).toBeNull();
    });

    it("returns the Room owner's failure without scheduling duplicate retries", async () => {
      recoveryManager.init();
      recoveryManager.attachRoom("ROOM99", "p_alice_1", "seat_token_secure_99");
      const retry = vi.fn(async () => {
        connectionStateManager.transition("FAILED", "Room not found");
        return false;
      });
      recoveryManager.registerRoomRecovery("ROOM99", retry);

      const recoveryPromise = recoveryManager.attemptRecovery("ROOM99");
      await expect(recoveryPromise).resolves.toBe(false);

      vi.advanceTimersByTime(20_000);
      expect(connectionStateManager.getState()).toBe("FAILED");
      expect(retry).toHaveBeenCalledOnce();
      expect(mockSocketEmit).not.toHaveBeenCalled();
    });
  });

  describe("3. Mobile Backgrounding, Tab Visibility & Page Lifecycle", () => {
    it("handles tab visibility changes and pagehide/pageshow events", () => {
      recoveryManager.init();
      recoveryManager.attachRoom("ROOM99", "p_alice_1", "seat_token_secure_99");

      // Tab hidden
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // App backgrounded
      act(() => {
        window.dispatchEvent(new Event("pagehide"));
      });

      // App foregrounded
      act(() => {
        window.dispatchEvent(new Event("pageshow"));
      });

      // Tab visible again
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(getActiveSession()?.roomId).toBe("ROOM99");
    });
  });

  describe("4. Idempotency & Action ID Generation", () => {
    it("generates monotonic, unique action IDs preventing collision under high-frequency submissions", () => {
      const id1 = recoveryManager.generateActionId("move");
      const id2 = recoveryManager.generateActionId("move");
      const id3 = recoveryManager.generateActionId("move");

      expect(id1).toMatch(/^move_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^move_\d+_[a-z0-9]+$/);
      expect(id3).toMatch(/^move_\d+_[a-z0-9]+$/);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
    });
  });

});
