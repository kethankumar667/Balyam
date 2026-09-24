import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/**
 * The two read-only questions a shared-room card asks of the real RoomManager:
 * "how full is this room?" and "is this person seated in it?". The card must
 * never learn who else is inside, so nothing here returns other players.
 */
function makeRooms() {
  const sockets = new Map<string, { id: string; join: () => void; emit: () => void }>();
  sockets.set("s0", { id: "s0", join: () => {}, emit: () => {} });
  const io = {
    sockets: { sockets },
    to: () => ({ emit: () => {} }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return new RoomManager(io);
}

describe("RoomManager.getRoomSummary", () => {
  it("describes a fresh lobby: game, phase, seats taken and available, and the host's name", () => {
    const rooms = makeRooms();
    const { code } = rooms.createRoom("s0", "Anand", "ludo");

    const summary = rooms.getRoomSummary(code);

    expect(summary).toMatchObject({ code, game: "ludo", phase: "lobby", players: 1, sealed: false, hostName: "Anand" });
    expect(summary!.maxPlayers).toBeGreaterThanOrEqual(2);
  });

  it("counts seats as they fill", () => {
    const rooms = makeRooms();
    const { code } = rooms.createRoom("s0", "Anand", "ludo");
    rooms.addBot("s0", "Bot1");

    expect(rooms.getRoomSummary(code)!.players).toBe(2);
  });

  it("is case-insensitive about the code, and null for a room that does not exist", () => {
    const rooms = makeRooms();
    const { code } = rooms.createRoom("s0", "Anand", "ludo");

    expect(rooms.getRoomSummary(code.toLowerCase())).not.toBeNull();
    expect(rooms.getRoomSummary("NOSUCH")).toBeNull();
  });

  it("does not expose who is inside", () => {
    const rooms = makeRooms();
    const { code } = rooms.createRoom("s0", "Anand", "ludo");

    expect(JSON.stringify(rooms.getRoomSummary(code))).not.toMatch(/identity|playerId|socket/i);
  });
});

describe("RoomManager.isIdentityInRoom", () => {
  it("is true only for a signed-in identity that holds a seat in that room", () => {
    const rooms = makeRooms();
    const { code } = rooms.createRoom("s0", "Anand", "ludo");
    const room = (rooms as unknown as { rooms: Map<string, { players: Map<string, { identityId?: string | null }>; hostId: string }> }).rooms.get(code)!;
    room.players.get(room.hostId)!.identityId = "member_anand";

    expect(rooms.isIdentityInRoom(code, "member_anand")).toBe(true);
    expect(rooms.isIdentityInRoom(code, "member_someone_else")).toBe(false);
    expect(rooms.isIdentityInRoom("NOSUCH", "member_anand")).toBe(false);
  });
});
