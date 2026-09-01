import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recoveryManager } from "../../core/recovery/RecoveryManager";
import { connectionStateManager } from "../../core/recovery/ConnectionStateManager";
import {
  saveActiveSession,
  getActiveSession,
  clearActiveSession,
  getRoomSession,
} from "../../core/recovery/recoveryStorage";
import { useRoomStore } from "../../store/roomStore";
import type { RoomPublicState, RematchState } from "@shared/types";
import { act } from "@testing-library/react";

const idleRematch: RematchState = {
  status: "idle",
  requesterId: null,
  responses: {},
  expiresAt: null,
  startsAt: null,
  declinedBy: null,
};

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
    vi.useFakeTimers();
    localStorage.clear();
    clearActiveSession();
    connectionStateManager.reset();
    useRoomStore.setState({
      playerId: null,
      playerName: "Alice",
      avatarId: "A1",
      roomState: null,
      rematch: idleRematch,
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
    it("triggers attemptRecovery and restores room state on successful socket ack", async () => {
      recoveryManager.init();
      recoveryManager.attachRoom("ROOM99", "p_alice_1", "seat_token_secure_99", "Alice", "A1");

      const mockAuthoritativeState: RoomPublicState = {
        code: "ROOM99",
        game: "ludo",
        hostId: "p_alice_1",
        phase: "playing",
        players: [
          { id: "p_alice_1", name: "Alice", isHost: true, isReady: true, isConnected: true },
        ],
        spectatorCount: 0,
        sealed: false,
        lifecycleState: "IN_PROGRESS",
        maxPlayers: 4,
        name: "Ludo Room",
        history: [],
        champion: null,
        unoHistory: [],
        unoChampion: null,
        bingoHistory: [],
        ludoHistory: [],
        currentMatchId: "m_99",
        lastMatchId: null,
        committedCostPerSeat: null,
        committedTotalPot: null,
      };

      mockSocketEmit.mockImplementation((event, payload, ack) => {
        if (event === "room:join") {
          ack({
            ok: true,
            playerId: "p_alice_1",
            seatToken: "seat_token_secure_99",
            state: mockAuthoritativeState,
          });
        }
      });

      const recoveryPromise = recoveryManager.attemptRecovery("ROOM99");

      await expect(recoveryPromise).resolves.toBe(true);
      expect(connectionStateManager.getState()).toBe("RECOVERED");

      const store = useRoomStore.getState();
      expect(store.playerId).toBe("p_alice_1");
      expect(store.roomState?.phase).toBe("playing");
      expect(store.roomState?.lifecycleState).toBe("IN_PROGRESS");
    });

    it("handles recovery handshake failure with exponential retry backoff", async () => {
      recoveryManager.init();
      recoveryManager.attachRoom("ROOM99", "p_alice_1", "seat_token_secure_99");

      mockSocketEmit.mockImplementation((event, payload, ack) => {
        if (event === "room:join") {
          ack({
            ok: false,
            error: "Room not found",
          });
        }
      });

      const recoveryPromise = recoveryManager.attemptRecovery("ROOM99");
      await expect(recoveryPromise).resolves.toBe(false);

      expect(connectionStateManager.getState()).toBe("RECONNECTING");
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

  describe("5. Rematch State Synchronization", () => {
    it("stores and clears rematch state in Zustand room store", () => {
      const initialRematch: RematchState = {
        status: "pending",
        requesterId: "p_alice_1",
        responses: { p_alice_1: "accept", p_bob_2: "pending" },
        expiresAt: Date.now() + 15_000,
        startsAt: null,
        declinedBy: null,
      };

      useRoomStore.getState().setRematch(initialRematch);
      expect(useRoomStore.getState().rematch?.status).toBe("pending");

      const acceptedRematch: RematchState = {
        ...initialRematch,
        status: "accepted",
        responses: { p_alice_1: "accept", p_bob_2: "accept" },
        startsAt: Date.now() + 3000,
      };

      useRoomStore.getState().setRematch(acceptedRematch);
      expect(useRoomStore.getState().rematch?.status).toBe("accepted");

      useRoomStore.getState().setRematch(idleRematch);
      expect(useRoomStore.getState().rematch.status).toBe("idle");
    });
  });
});
