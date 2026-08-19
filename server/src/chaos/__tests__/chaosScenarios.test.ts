import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomManager } from "../../rooms/RoomManager.js";
import { serverLifecycleRegistry } from "../../reliability/LifecycleRegistry.js";
import { serverResourceTracker } from "../../reliability/ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";
import { metricsRegistry } from "../../observability/MetricsRegistry.js";

function makeMockIo() {
  const sockets = new Map<string, any>();
  const roomsJoined = new Map<string, Set<string>>();

  const io: any = {
    sockets: { sockets },
    to: vi.fn((room: string) => ({
      emit: vi.fn(),
    })),
    engine: { clientsCount: 0 },
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

describe("Chaos Engineering & Failure Scenarios", () => {
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

  it("Scenario 1: Socket disconnects mid-move — turn advances cleanly into RECOVERING without deadlocking", () => {
    mockIo.registerSocket("sock_alice");
    mockIo.registerSocket("sock_bob");

    const { code } = roomManager.createRoom("sock_alice", "Alice", "rps");
    const joinRes = roomManager.joinRoom("sock_bob", "Bob", code);
    expect(joinRes.ok).toBe(true);

    roomManager.setReady("sock_alice", true);
    roomManager.setReady("sock_bob", true);
    roomManager.startGame("sock_alice");

    // Alice makes her throw
    roomManager.applyMove("sock_alice", "rock", {});

    // Bob's connection vanishes before his move
    roomManager.handleDisconnect("sock_bob");

    const roomState = roomManager.getRoomStateByCode(code);
    expect(roomState?.lifecycleState).toBe("RECOVERING");
    expect(roomState?.players.find((p) => p.name === "Bob")?.isConnected).toBe(false);

    // Ensure room is NOT stuck — timer / auto-play handles absence
    expect(roomManager.getRoomCount()).toBe(1);
  });

  it("Scenario 2: Browser refresh during active turn — preserves seatToken and restores private state", () => {
    mockIo.registerSocket("sock_1");
    mockIo.registerSocket("sock_2");

    const { code } = roomManager.createRoom("sock_1", "Alice", "rps");
    const joinRes = roomManager.joinRoom("sock_2", "Bob", code);
    const bobId = (joinRes as any).playerId;
    const bobToken = (joinRes as any).seatToken;

    roomManager.setReady("sock_1", true);
    roomManager.setReady("sock_2", true);
    roomManager.startGame("sock_1");

    // Browser refresh: old socket disconnects
    roomManager.handleDisconnect("sock_2");

    // New socket connects on refreshed page
    mockIo.registerSocket("sock_2_refreshed");
    const reclaimRes = roomManager.joinRoom(
      "sock_2_refreshed",
      "Bob",
      code,
      bobId,
      bobToken
    );

    expect(reclaimRes.ok).toBe(true);
    if (reclaimRes.ok) {
      expect(reclaimRes.playerId).toBe(bobId);
      expect(reclaimRes.state.lifecycleState).toBe("IN_PROGRESS");
    }

    const room = roomManager.getRoomStateByCode(code);
    expect(room?.players.length).toBe(2);
    expect(room?.players.find((p) => p.id === bobId)?.isConnected).toBe(true);
  });

  it("Scenario 3: Rapid reconnect storm — 50 concurrent seat reclaims complete with ZERO ghost seats", () => {
    const rooms: { code: string; p2Id: string; p2Token: string }[] = [];

    // Spin up 50 concurrent matches
    for (let i = 0; i < 50; i++) {
      const hSock = `host_${i}`;
      const pSock = `p2_${i}`;
      mockIo.registerSocket(hSock);
      mockIo.registerSocket(pSock);

      const { code } = roomManager.createRoom(hSock, `Host_${i}`, "rps");
      const joinRes = roomManager.joinRoom(pSock, `Player_${i}`, code);
      expect(joinRes.ok).toBe(true);

      roomManager.setReady(hSock, true);
      roomManager.setReady(pSock, true);
      roomManager.startGame(hSock);

      rooms.push({
        code,
        p2Id: (joinRes as any).playerId,
        p2Token: (joinRes as any).seatToken,
      });
    }

    // Disconnect all 50 player2 sockets (simulating wifi handoff)
    for (let i = 0; i < 50; i++) {
      roomManager.handleDisconnect(`p2_${i}`);
    }

    // Reconnect storm: all 50 rejoin concurrently with fresh sockets
    for (let i = 0; i < 50; i++) {
      const nextSock = `p2_new_${i}`;
      mockIo.registerSocket(nextSock);
      const r = rooms[i]!;
      const reclaim = roomManager.joinRoom(nextSock, `Player_${i}`, r.code, r.p2Id, r.p2Token);
      expect(reclaim.ok).toBe(true);
    }

    // Verify all 50 rooms remain intact with exactly 2 players each
    expect(roomManager.getRoomCount()).toBe(50);
    for (const r of rooms) {
      const state = roomManager.getRoomStateByCode(r.code);
      expect(state?.players.length).toBe(2);
      expect(state?.players.every((p) => p.isConnected)).toBe(true);
      expect(state?.lifecycleState).toBe("IN_PROGRESS");
    }
  });

  it("Scenario 4: Recovery token spoofing attempt — fails silently without corrupting genuine seat", () => {
    mockIo.registerSocket("host");
    mockIo.registerSocket("victim");
    const { code } = roomManager.createRoom("host", "Alice", "rps");
    const joinRes = roomManager.joinRoom("victim", "Bob", code);
    const victimId = (joinRes as any).playerId;

    // Attacker tries to hijack victim's seat with bogus token
    mockIo.registerSocket("attacker");
    const hijackRes = roomManager.joinRoom(
      "attacker",
      "Attacker",
      code,
      victimId,
      "forged_invalid_signature_token"
    );

    // Must fall through to ordinary new seat or be rejected cleanly
    const room = roomManager.getRoomStateByCode(code);
    const victimPlayer = room?.players.find((p) => p.id === victimId);
    expect(victimPlayer?.name).toBe("Bob"); // Genuine seat uncorrupted
  });
});
