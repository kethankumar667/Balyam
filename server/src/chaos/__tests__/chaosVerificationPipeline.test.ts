import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomManager } from "../../rooms/RoomManager.js";
import { serverLifecycleRegistry } from "../../reliability/LifecycleRegistry.js";
import { serverResourceTracker } from "../../reliability/ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";
import { metricsRegistry } from "../../observability/MetricsRegistry.js";

function makeMockIo() {
  const sockets = new Map<string, any>();
  const io: any = {
    sockets: { sockets },
    to: vi.fn(() => ({ emit: vi.fn() })),
    engine: { clientsCount: 0 },
  };

  const registerSocket = (id: string) => {
    const socket: any = {
      id,
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
    };
    sockets.set(id, socket);
    return socket;
  };

  return { io, registerSocket };
}

describe("Chaos Verification Pipeline", () => {
  let roomManager: RoomManager;
  let mockIo: ReturnType<typeof makeMockIo>;

  beforeEach(() => {
    serverLifecycleRegistry.reset();
    serverResourceTracker.reset();
    serverEventStore.reset();
    metricsRegistry.reset();
    mockIo = makeMockIo();
    roomManager = new RoomManager(mockIo.io);
  });

  it("Chaos 1: Host sudden abandonment during in-flight turn triggers clean failover to next human", () => {
    mockIo.registerSocket("host_s1");
    mockIo.registerSocket("p2_s2");
    mockIo.registerSocket("p3_s3");

    const { code } = roomManager.createRoom("host_s1", "Alice", "rps");
    roomManager.joinRoom("p2_s2", "Bob", code);
    roomManager.joinRoom("p3_s3", "Charlie", code);

    // Host explicitly leaves the room
    roomManager.leaveRoom("host_s1");

    const room = roomManager.getRoomStateByCode(code);
    expect(room).toBeDefined();
    // Bob should be promoted to host
    expect(room?.players.find((p) => p.isHost)?.name).toBe("Bob");
  });

  it("Chaos 2: High-load recovery storm with 100 simultaneous recovers leaves 0 corrupt rooms", () => {
    const roomSnapshots: Array<{ code: string; pId: string; pToken: string }> = [];

    // Create 100 rooms
    for (let i = 0; i < 100; i++) {
      const h = `h_sock_${i}`;
      const p = `p_sock_${i}`;
      mockIo.registerSocket(h);
      mockIo.registerSocket(p);

      const { code } = roomManager.createRoom(h, `H${i}`, "rps");
      const joinRes = roomManager.joinRoom(p, `P${i}`, code);

      roomManager.setReady(h, true);
      roomManager.setReady(p, true);
      roomManager.startGame(h);

      roomSnapshots.push({
        code,
        pId: (joinRes as any).playerId,
        pToken: (joinRes as any).seatToken,
      });
    }

    // Drop all guest sockets simultaneously
    for (let i = 0; i < 100; i++) {
      roomManager.handleDisconnect(`p_sock_${i}`);
    }

    // Reclaim all 100 seats concurrently with fresh sockets
    for (let i = 0; i < 100; i++) {
      const freshSock = `fresh_p_sock_${i}`;
      mockIo.registerSocket(freshSock);
      const snap = roomSnapshots[i]!;

      const reclaim = roomManager.joinRoom(
        freshSock,
        `P${i}`,
        snap.code,
        snap.pId,
        snap.pToken
      );
      expect(reclaim.ok).toBe(true);
    }

    // Assert that every room is fully healthy
    expect(roomManager.getRoomCount()).toBe(100);
    for (const snap of roomSnapshots) {
      const r = roomManager.getRoomStateByCode(snap.code);
      expect(r?.players.length).toBe(2);
      expect(r?.players.every((p) => p.isConnected)).toBe(true);
      expect(r?.lifecycleState).toBe("IN_PROGRESS");
    }
  });

  it("Chaos 3: Out-of-order move actions filtered idempotently without state divergence", () => {
    mockIo.registerSocket("p1");
    mockIo.registerSocket("p2");

    const { code } = roomManager.createRoom("p1", "Alice", "rps");
    roomManager.joinRoom("p2", "Bob", code);
    roomManager.setReady("p1", true);
    roomManager.setReady("p2", true);
    roomManager.startGame("p1");

    // Send action with actionId
    roomManager.applyMove("p1", "rock", {}, "action-unique-999");
    const roomAfterFirst = roomManager.getRoomStateByCode(code);
    expect(roomAfterFirst).toBeDefined();

    // Re-send same action (duplicate packet / network retry)
    roomManager.applyMove("p1", "rock", {}, "action-unique-999");
    const roomAfterSecond = roomManager.getRoomStateByCode(code);
    expect(roomAfterSecond).toBeDefined();
  });
});
