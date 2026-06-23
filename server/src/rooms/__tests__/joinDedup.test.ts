import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import type {
  ClientToServerEvents,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * Minimal Socket.IO stand-in. The join path only touches
 * `io.sockets.sockets.get(id)?.{join,leave,emit}` and `io.to(code).emit(...)`,
 * so we stub exactly those and record every broadcast room:state payload to
 * inspect the resulting roster.
 */
function makeIo(): {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  broadcasts: RoomPublicState[];
} {
  const broadcasts: RoomPublicState[] = [];
  const fakeSocket = { join() {}, leave() {}, emit() {} };
  const io = {
    to: () => ({
      emit: (_event: string, payload: RoomPublicState) => {
        broadcasts.push(payload);
      },
    }),
    sockets: { sockets: { get: () => fakeSocket } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, broadcasts };
}

function lastRoster(broadcasts: RoomPublicState[]): RoomPublicState {
  const last = broadcasts[broadcasts.length - 1];
  if (!last) throw new Error("no room:state was broadcast");
  return last;
}

describe("RoomManager.joinRoom — duplicate-socket dedup", () => {
  it("a second join from the same socket reuses the seat instead of minting a ghost", () => {
    const { io, broadcasts } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("hostSock", "Alice", "ludo");

    // First-time join with no known playerId — server assigns one.
    const first = rooms.joinRoom("bobSock", "Bob", code);
    expect(first.ok).toBe(true);

    // The race we fixed: the same socket emits room:join again before the
    // first ack carries a playerId back to the client. Previously this minted
    // a brand-new player and orphaned the first one.
    const second = rooms.joinRoom("bobSock", "Bob", code);
    expect(second.ok).toBe(true);

    if (first.ok && second.ok) {
      expect(second.playerId).toBe(first.playerId);
    }

    // Host + exactly one Bob. No ghost seat.
    expect(lastRoster(broadcasts).players).toHaveLength(2);
  });

  it("distinct sockets still create distinct players", () => {
    const { io, broadcasts } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("hostSock", "Alice", "ludo");

    const bob = rooms.joinRoom("bobSock", "Bob", code);
    const carol = rooms.joinRoom("carolSock", "Carol", code);

    expect(bob.ok && carol.ok).toBe(true);
    if (bob.ok && carol.ok) {
      expect(bob.playerId).not.toBe(carol.playerId);
    }
    expect(lastRoster(broadcasts).players).toHaveLength(3);
  });
});
