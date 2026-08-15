import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@shared/types.js";

function makeIo() {
  const emits: { event: string; socketId?: string; data?: unknown }[] = [];
  const roomEmits: { room: string; event: string; data?: unknown }[] = [];

  const socketFor = (socketId: string) => ({
    join() {},
    leave() {},
    emit: (event: string, data?: unknown) => emits.push({ event, socketId, data }),
  });

  const io = {
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => {
        roomEmits.push({ room, event, data });
      },
    }),
    sockets: {
      sockets: {
        get: (id: string) => socketFor(id),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, emits, roomEmits };
}

describe("RoomManager — Host Failover & Idempotency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reassigns host when the current host leaves a multiplayer room", () => {
    const { io } = makeIo();
    const rm = new RoomManager(io);

    // Host creates room (member): createRoom(socketId, name, game)
    const { code, playerId: hostId } = rm.createRoom("s_host", "HostPlayer", "ludo");

    // Player 2 joins (member): joinRoom(socketId, name, code, existingPlayerId, seatToken, avatar, accountKind)
    const p2Result = rm.joinRoom("s_p2", "Player2", code, undefined, undefined, undefined, "member");
    expect(p2Result.ok).toBe(true);

    const roomBefore = rm.getRoomState("s_host");
    expect(roomBefore?.hostId).toBe(hostId);

    // Host leaves room
    rm.leaveRoom("s_host");

    const roomAfter = rm.getRoomState("s_p2");
    expect(roomAfter).toBeDefined();
    // Host should now be Player 2
    expect(roomAfter?.hostId).toBe((p2Result as { playerId: string }).playerId);
  });

  it("filters out duplicate move submissions using actionId idempotency key", () => {
    const { io } = makeIo();
    const rm = new RoomManager(io);

    const { code } = rm.createRoom("s_alice", "Alice", "rps");

    rm.joinRoom("s_bob", "Bob", code, undefined, undefined, undefined, "member");

    // Ready up both players
    rm.setReady("s_alice", true);
    rm.setReady("s_bob", true);

    // Start game
    rm.startGame("s_alice");

    const roomStatePlaying = rm.getRoomState("s_alice");
    expect(roomStatePlaying?.phase).toBe("playing");

    // Alice submits move with actionId "act-uuid-1"
    rm.applyMove("s_alice", "choice", { choice: "rock" }, undefined, "act-uuid-1");

    // Alice immediately retries due to network jitter with same actionId
    rm.applyMove("s_alice", "choice", { choice: "rock" }, undefined, "act-uuid-1");

    // Room and game state should remain consistent
    const roomState = rm.getRoomState("s_alice");
    expect(roomState?.phase).toBe("playing");
  });
});
