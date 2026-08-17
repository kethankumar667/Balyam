import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import { SEALED_ROOM_ERROR } from "@shared/permissions.js";
import type {
  AccountKind,
  ClientToServerEvents,
  Player,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * GUEST TABLES ARE SEALED.
 *
 * The product rule is "a guest can play, a guest cannot gather"
 * (shared/permissions.ts). On the server that reduces to one property: a room
 * opened by a guest takes no new arrivals, ever — not players, not screens.
 *
 * These tests pin the two halves that are easy to get backwards. Sealing has
 * to stop STRANGERS while leaving the people already at the table alone, so
 * the interesting cases are not "is the door shut" but "is the door shut on
 * the wrong person" — the host reclaiming their own seat after a refresh, and
 * the Pass & Play seats that share the host's socket.
 */

interface Harness {
  rooms: RoomManager;
  broadcasts: RoomPublicState[];
}

function makeHarness(): Harness {
  const broadcasts: RoomPublicState[] = [];
  const io = {
    to: () => ({
      emit: (event: string, payload: unknown) => {
        if (event === "room:state") {
          broadcasts.push(JSON.parse(JSON.stringify(payload)) as RoomPublicState);
        }
      },
    }),
    sockets: {
      sockets: {
        get: () => ({ join() {}, leave() {}, emit() {} }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { rooms: new RoomManager(io), broadcasts };
}

const peek = (rooms: RoomManager, code: string) =>
  (rooms as unknown as {
    rooms: Map<string, { players: Map<string, Player>; sealed: boolean; hostId: string }>;
  }).rooms.get(code)!;

/**
 * `createRoom` takes nineteen game-option parameters plus an avatar before
 * `hostKind`, so reaching the last one means padding everything in front of
 * it. Derived from the function's own arity rather than counted by hand —
 * see the same hazard, and the same fix, in avatarSharing.test.ts.
 */
function hostAs(rooms: RoomManager, socket: string, name: string, kind: AccountKind) {
  const args: unknown[] = [socket, name, "ludo"];
  while (args.length < rooms.createRoom.length - 1) args.push(undefined);
  args.push(kind);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

describe("a guest's table is open", () => {
  it("accepts a second player via room code", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_guest", "Guest", "guest");

    const other = rooms.joinRoom("sock_other", "Friend", host.code);

    expect(other.ok).toBe(true);
    expect(peek(rooms, host.code).players.size).toBe(2);
    expect(peek(rooms, host.code).sealed).toBe(false);
  });

  it("accepts a spectator screen", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_guest", "Guest", "guest");

    const tv = rooms.spectateRoom("sock_tv", host.code);

    expect(tv.ok).toBe(true);
  });

  it("still lets the host reclaim their own seat after a refresh", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_guest", "Guest", "guest");

    // Same player, new socket, holding the token the create ack issued —
    // exactly what a page reload looks like to the server.
    const back = rooms.joinRoom(
      "sock_guest_reloaded",
      "Guest",
      host.code,
      host.playerId,
      mintSeatToken(host.code, host.playerId),
    );

    expect(back.ok).toBe(true);
    if (back.ok) expect(back.playerId).toBe(host.playerId);
  });

  it("still accepts Pass & Play seats, which never come through the door", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_guest", "Guest", "guest");

    rooms.addLocalPlayer("sock_guest", "Little Brother");

    expect(peek(rooms, host.code).players.size).toBe(2);
  });

  it("still accepts bots", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_guest", "Guest", "guest");

    rooms.addBot("sock_guest");

    expect(peek(rooms, host.code).players.size).toBe(2);
  });

  it("broadcasts open room state so share card is displayed", () => {
    const { rooms, broadcasts } = makeHarness();
    hostAs(rooms, "sock_guest", "Guest", "guest");

    expect(broadcasts.at(-1)?.sealed).toBe(false);
  });
});

describe("a member's table is open", () => {
  it("takes a second player", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_member", "Member", "member");

    const other = rooms.joinRoom("sock_other", "Friend", host.code);

    expect(other.ok).toBe(true);
    expect(peek(rooms, host.code).sealed).toBe(false);
  });

  it("stays open when the account kind is not stated at all", () => {
    // The compatible default — see createRoom. A caller that has not been
    // taught the field keeps the behaviour it had before the field existed.
    const { rooms } = makeHarness();
    const host = rooms.createRoom("sock_old_client", "Old Client", "ludo");

    expect(rooms.joinRoom("sock_other", "Friend", host.code).ok).toBe(true);
  });
});

describe("host migration", () => {
  it("hands the room to another player without sealing", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_member", "Member", "member");
    rooms.joinRoom("sock_guest", "Guest", host.code, undefined, undefined, undefined, "guest");
    const second = rooms.joinRoom(
      "sock_member2",
      "Member Two",
      host.code,
      undefined,
      undefined,
      undefined,
      "member",
    );
    if (!second.ok) throw new Error("fixture failed to seat the second member");

    rooms.leaveRoom("sock_member");

    const room = peek(rooms, host.code);
    expect(room.hostId).toBe(second.playerId);
    expect(room.sealed).toBe(false);
  });

  it("keeps room open when a guest inherits host", () => {
    const { rooms } = makeHarness();
    const host = hostAs(rooms, "sock_member", "Member", "member");
    const guest = rooms.joinRoom(
      "sock_guest",
      "Guest",
      host.code,
      undefined,
      undefined,
      undefined,
      "guest",
    );
    if (!guest.ok) throw new Error("fixture failed to seat the guest");

    rooms.leaveRoom("sock_member");

    const room = peek(rooms, host.code);
    expect(room.hostId).toBe(guest.playerId);
    expect(room.sealed).toBe(false);
    expect(rooms.joinRoom("sock_late", "Latecomer", host.code).ok).toBe(true);
  });
});
