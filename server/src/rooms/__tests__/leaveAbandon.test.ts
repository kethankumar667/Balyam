import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import type {
  ClientToServerEvents,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/** Minimal Socket.IO stand-in (same shape as joinDedup.test.ts). */
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

/**
 * Regression: a bot must never be crowned winner because the last human left
 * (or timed out of) a match. Hand Cricket's engine.removePlayer() resolves a
 * departure to an opponent win, so for a solo human-vs-bot game that produced
 * "the bot is the winner" mid-match. The room must be abandoned instead.
 */
describe("RoomManager — last human leaving a vs-bot game abandons the room", () => {
  it("human leaves a Hand Cricket match vs a bot → room is gone, not a bot win", () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("hostSock", "Alice", "handcricket");
    rooms.addBot("hostSock"); // host (human) + 1 bot = full 2-player table
    rooms.setReady("hostSock", true);
    rooms.startGame("hostSock"); // engine now live, phase "playing"

    rooms.leaveRoom("hostSock"); // the ONLY human leaves mid-game

    // The room must have been abandoned — not left alive with a bot winner.
    const rejoin = rooms.joinRoom("someoneSock", "Zoe", code);
    expect(rejoin.ok).toBe(false);
    if (!rejoin.ok) expect(rejoin.error).toBe("Room not found");
  });

  it("with two humans, one leaving is a normal forfeit — room persists for the other", () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("hostSock", "Alice", "handcricket");
    const bob = rooms.joinRoom("bobSock", "Bob", code);
    expect(bob.ok).toBe(true);
    rooms.setReady("hostSock", true);
    rooms.setReady("bobSock", true);
    rooms.startGame("hostSock");

    rooms.leaveRoom("hostSock"); // one human leaves; the other remains

    const state = rooms.getRoomState("bobSock");
    expect(state).not.toBeNull();
    expect(state!.players).toHaveLength(1);
    expect(state!.players[0]!.name).toBe("Bob");
  });
});
