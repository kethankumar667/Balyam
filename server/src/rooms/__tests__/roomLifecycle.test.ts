import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomManager } from "../RoomManager.js";
import { serverEventStore } from "../../events/ServerEventStore.js";

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

describe("Room Lifecycle State Machine", () => {
  let roomManager: RoomManager;
  let mockIo: ReturnType<typeof makeMockIo>;

  beforeEach(() => {
    serverEventStore.reset();
    mockIo = makeMockIo();
    roomManager = new RoomManager(mockIo.io);
  });

  it("transitions from CREATED/WAITING_FOR_PLAYERS to READY_CHECK and IN_PROGRESS", () => {
    mockIo.registerSocket("s_host");
    const { code, state: hostState } = roomManager.createRoom("s_host", "Alice", "rps");

    // Multiplayer room starts waiting for players
    expect(hostState.lifecycleState).toBe("WAITING_FOR_PLAYERS");

    mockIo.registerSocket("s_player2");
    const joinRes = roomManager.joinRoom("s_player2", "Bob", code);
    expect(joinRes.ok).toBe(true);

    // Host & player ready up
    roomManager.setReady("s_host", true);
    roomManager.setReady("s_player2", true);

    const readyState = roomManager.getRoomStateByCode(code);
    expect(readyState?.lifecycleState).toBe("READY_CHECK");

    // Start game
    roomManager.startGame("s_host");
    const playingState = roomManager.getRoomStateByCode(code);
    expect(playingState?.lifecycleState).toBe("IN_PROGRESS");
    expect(playingState?.phase).toBe("playing");

    // Check server timeline recorded events
    const timeline = serverEventStore.getTimeline(code);
    expect(timeline).not.toBeNull();
    expect(timeline?.events.some((e) => e.type === "ROOM_CREATED")).toBe(true);
    expect(timeline?.events.some((e) => e.type === "PLAYER_JOINED")).toBe(true);
    expect(timeline?.events.some((e) => e.type === "GAME_STARTED")).toBe(true);
  });

  it("tracks RECOVERING on player disconnect during active match", () => {
    mockIo.registerSocket("s_host");
    const { code } = roomManager.createRoom("s_host", "Alice", "rps");
    mockIo.registerSocket("s_p2");
    roomManager.joinRoom("s_p2", "Bob", code);
    roomManager.setReady("s_host", true);
    roomManager.setReady("s_p2", true);
    roomManager.startGame("s_host");

    // P2 disconnects mid-match
    roomManager.handleDisconnect("s_p2");

    const recoveringState = roomManager.getRoomStateByCode(code);
    expect(recoveringState?.lifecycleState).toBe("RECOVERING");

    // Operational stats reflect the recovering room
    const stats = roomManager.getOperationalStats();
    expect(stats.recoveringRooms).toBe(1);
    expect(stats.totalRooms).toBe(1);
  });
});
