import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomManager } from "../../rooms/RoomManager.js";
import { serverLifecycleRegistry } from "../LifecycleRegistry.js";
import { serverResourceTracker } from "../ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";
import { leakDetector } from "../LeakDetector.js";

function makeMockIo() {
  const sockets = new Map<string, any>();
  const roomsJoined = new Map<string, Set<string>>();

  const io: any = {
    sockets: {
      sockets,
    },
    to: vi.fn((room: string) => ({
      emit: vi.fn(),
    })),
    engine: {
      clientsCount: 0,
    },
  };

  const registerSocket = (id: string) => {
    const socket: any = {
      id,
      emit: vi.fn(),
      join: vi.fn((r: string) => {
        if (!roomsJoined.has(r)) roomsJoined.set(r, new Set());
        roomsJoined.get(r)!.add(id);
      }),
      leave: vi.fn((r: string) => {
        roomsJoined.get(r)?.delete(id);
      }),
    };
    sockets.set(id, socket);
    return socket;
  };

  return { io, registerSocket };
}

describe("Stress & Longevity Loops", () => {
  let roomManager: RoomManager;
  let mockIo: ReturnType<typeof makeMockIo>;

  beforeEach(() => {
    serverLifecycleRegistry.reset();
    serverResourceTracker.reset();
    serverEventStore.reset();
    mockIo = makeMockIo();
    roomManager = new RoomManager(mockIo.io);
  });

  it("completes 1,000 rapid room create/leave cycles with ZERO resource leakage", () => {
    for (let i = 0; i < 1_000; i++) {
      const sockId = `s_host_${i}`;
      mockIo.registerSocket(sockId);

      const { code } = roomManager.createRoom(sockId, `Host_${i}`, "rps");
      expect(code).toBeDefined();

      // Host leaves immediately -> triggers room teardown
      roomManager.leaveRoom(sockId);
    }

    // Verify room map is empty
    expect(roomManager.getRoomCount()).toBe(0);

    // Verify lifecycle registry is 100% clean
    const lifecycleStats = serverLifecycleRegistry.getStats();
    expect(lifecycleStats.totalRooms).toBe(0);
    expect(lifecycleStats.activeTimers).toBe(0);
    expect(lifecycleStats.activeIntervals).toBe(0);

    // Verify resource tracker has 0 dangling rooms
    expect(serverResourceTracker.getCountByType("room")).toBe(0);

    // Audit with leak detector
    const report = leakDetector.runDiagnostics(roomManager, mockIo.io);
    expect(report.healthy).toBe(true);
    expect(report.score).toBe(100);
  });

  it("handles 500 disconnect & recovery cycles without accumulating orphaned seats or timers", () => {
    mockIo.registerSocket("s_host");
    const { code } = roomManager.createRoom("s_host", "Alice", "rps");

    mockIo.registerSocket("s_p2");
    const joinRes = roomManager.joinRoom("s_p2", "Bob", code);
    expect(joinRes.ok).toBe(true);
    const p2Id = (joinRes as any).playerId;
    const seatToken = (joinRes as any).seatToken;

    roomManager.setReady("s_host", true);
    roomManager.setReady("s_p2", true);
    roomManager.startGame("s_host");

    // Perform 500 rapid disconnect and reclaim cycles
    for (let i = 0; i < 500; i++) {
      const currentSock = `s_p2_${i}`;
      mockIo.registerSocket(currentSock);

      // Disconnect
      roomManager.handleDisconnect(currentSock);

      // Reclaim with authentic seatToken
      const nextSock = `s_p2_${i + 1}`;
      mockIo.registerSocket(nextSock);
      const reclaimRes = roomManager.joinRoom(nextSock, "Bob", code, p2Id, seatToken);
      expect(reclaimRes.ok).toBe(true);
    }

    // After 500 cycles, the room still has exactly 2 players
    const state = roomManager.getRoomStateByCode(code);
    expect(state?.players.length).toBe(2);
    expect(state?.lifecycleState).toBe("IN_PROGRESS");

    // Clean up room
    roomManager.leaveRoom("s_host");
    const lastSock = `s_p2_500`;
    roomManager.leaveRoom(lastSock);

    expect(roomManager.getRoomCount()).toBe(0);
    expect(serverLifecycleRegistry.getStats().totalRooms).toBe(0);
  });
});
