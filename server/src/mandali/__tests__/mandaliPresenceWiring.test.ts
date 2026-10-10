import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Server } from "socket.io";
import type { Player } from "@shared/types.js";
import { RoomManager } from "../../rooms/RoomManager.js";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { createPresenceSources } from "../presenceSources.js";

/**
 * Presence against the real pieces it is read from: a real Socket.IO server's room
 * bookkeeping and a real RoomManager running a real game. The service tests in
 * mandaliPresence.test.ts prove the logic with stand-ins; this proves the stand-ins
 * match what the running server actually exposes.
 */

function roomManagerIo() {
  const fakeSocket = { join() {}, leave() {}, emit() {} };
  return { to: () => ({ emit: () => undefined }), sockets: { sockets: { get: () => fakeSocket } } } as never;
}

interface PeekRoom {
  players: Map<string, Player>;
}
const peek = (rooms: RoomManager, code: string): PeekRoom => (rooms as unknown as { rooms: Map<string, PeekRoom> }).rooms.get(code)!;
const seatOf = (rooms: RoomManager, code: string, name: string): Player =>
  [...peek(rooms, code).players.values()].find((p) => p.name === name)!;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("presence sources on the real server", () => {
  it("counts someone as connected while a socket sits in their personal room, and not after it leaves", () => {
    const io = new Server();
    const sources = createPresenceSources(io, { getActiveGamesByPlayer: () => new Map() });

    expect(sources.isConnected("acct_alice")).toBe(false);
    io.sockets.adapter.addAll("sock-1", new Set(["sock-1", "user:acct_alice"]));
    expect(sources.isConnected("acct_alice")).toBe(true);
    expect(sources.isConnected("acct_bob")).toBe(false);

    io.sockets.adapter.addAll("sock-2", new Set(["sock-2", "user:acct_alice"]));
    io.sockets.adapter.delAll("sock-1");
    expect(sources.isConnected("acct_alice")).toBe(true);
    io.sockets.adapter.delAll("sock-2");
    expect(sources.isConnected("acct_alice")).toBe(false);
  });
});

describe("RoomManager.getActiveGamesByPlayer", () => {
  function readyLudo() {
    const rooms = new RoomManager(roomManagerIo());
    const { code } = rooms.createRoom("sockA", "Alice", "ludo");
    rooms.joinRoom("sockB", "Bob", code);
    rooms.addBot("sockA");
    rooms.setReady("sockA", true);
    rooms.setReady("sockB", true);
    return { rooms, code };
  }

  it("lists nobody while the table is still a lobby", () => {
    const { rooms } = readyLudo();
    expect(rooms.getActiveGamesByPlayer().size).toBe(0);
  });

  it("lists every human seated in a game that is under way, with the game, and never a bot", () => {
    const { rooms, code } = readyLudo();
    rooms.startGame("sockA");

    const active = rooms.getActiveGamesByPlayer();
    const bot = [...peek(rooms, code).players.values()].find((p) => p.isBot)!;
    expect(active.get(seatOf(rooms, code, "Alice").id)).toBe("ludo");
    expect(active.get(seatOf(rooms, code, "Bob").id)).toBe("ludo");
    expect(active.has(bot.id)).toBe(false);
  });

  it("also answers to the verified account id, which is how a Mandali knows its members", () => {
    const { rooms, code } = readyLudo();
    seatOf(rooms, code, "Alice").identityId = "acct_alice";
    rooms.startGame("sockA");

    expect(rooms.getActiveGamesByPlayer().get("acct_alice")).toBe("ludo");
  });

  it("does not count a seat held open for someone who has dropped", () => {
    const { rooms, code } = readyLudo();
    rooms.startGame("sockA");
    const bob = seatOf(rooms, code, "Bob");
    bob.isConnected = false;

    expect(rooms.getActiveGamesByPlayer().has(bob.id)).toBe(false);
  });
});

describe("a member's dot, end to end", () => {
  it("goes online, then red when their game starts, then to an empty ring", async () => {
    const io = new Server();
    const rooms = new RoomManager(roomManagerIo());
    const emitted: Array<{ room: string; payload: any }> = [];
    const fake = { to: (room: string) => ({ emit: (_e: string, payload: unknown) => emitted.push({ room, payload }) }) };
    const service = new MandaliService(new MandaliRepository(), undefined as never, fake as never);
    service.setPresenceSources(createPresenceSources(io, rooms));

    const created = await service.createMandali("acct_alice", "Alice", "avatar_1", {
      name: "Wiring", handle: "wiring-test", description: "d", visibility: "PUBLIC",
    });
    if (!created.success || !created.mandali) throw new Error("test setup: createMandali failed");
    const mandaliId = created.mandali.id;
    const dot = async () => (await service.getMembers(mandaliId)).find((m) => m.playerId === "acct_alice")!;

    expect((await dot()).presence).toBe("offline");

    io.sockets.adapter.addAll("sock-1", new Set(["sock-1", "user:acct_alice"]));
    await service.refreshPresence(["acct_alice"]);
    expect((await dot()).presence).toBe("online");

    const { code } = rooms.createRoom("sockA", "Alice", "ludo");
    rooms.joinRoom("sockB", "Bob", code);
    rooms.addBot("sockA");
    seatOf(rooms, code, "Alice").identityId = "acct_alice";
    rooms.setReady("sockA", true);
    rooms.setReady("sockB", true);
    rooms.startGame("sockA");
    await service.refreshPresence(service.presenceWatchList());
    const playing = await dot();
    expect(playing.presence).toBe("in-game");
    expect(playing.activeGame).toBe("ludo");

    io.sockets.adapter.delAll("sock-1");
    seatOf(rooms, code, "Alice").isConnected = false;
    await service.refreshPresence(service.presenceWatchList());
    expect((await dot()).presence).toBe("offline");

    const told = emitted.filter((e) => e.room === `mandali:${mandaliId}`).map((e) => e.payload.member.presence);
    expect(told).toEqual(["online", "in-game", "offline"]);
  });
});
