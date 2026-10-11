import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { getGameLimits } from "../../games/registry.js";
import { guestDisplayName } from "@shared/guestIdentity.js";
import { NAME_NOT_ALLOWED_ERROR, NAME_TAKEN_ERROR } from "@shared/playerName.js";
import type {
  AccountKind,
  ClientToServerEvents,
  Player,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * The server is the authority on names. These pin what a guest may and may not be called at a table
 * someone else opened, and that the pre-join probe says what a join would say.
 */

function makeRooms(): RoomManager {
  const io = {
    to: () => ({ emit() {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit() {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return new RoomManager(io);
}

type PeekedRoom = { players: Map<string, Player>; sealed: boolean; phase: string };
const peek = (rooms: RoomManager, code: string) =>
  (rooms as unknown as { rooms: Map<string, PeekedRoom> }).rooms.get(code)!;

/** Same arity-derived padding as guestSealedRoom.test.ts: lands `kind` in `hostKind`'s slot. */
function hostAs(rooms: RoomManager, socket: string, name: string, kind: AccountKind) {
  const args: unknown[] = [socket, name, "ludo"];
  while (args.length < rooms.createRoom.length - 2) args.push(undefined);
  args.push(kind);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

function join(
  rooms: RoomManager,
  socket: string,
  name: string,
  code: string,
  kind: AccountKind,
  identityId?: string,
) {
  return rooms.joinRoom(socket, name, code, undefined, undefined, undefined, kind, identityId);
}

const GUEST_A = "guest_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const GUEST_B = "guest_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const FULL_WIDTH_RAVI = String.fromCodePoint(0xff32, 0xff41, 0xff56, 0xff49);

describe("a guest joining a table", () => {
  it("is seated under the name they chose", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");

    const result = join(rooms, "sock_a", "Ravi", host.code, "guest", GUEST_A);

    expect(result.ok).toBe(true);
    const names = [...peek(rooms, host.code).players.values()].map((p) => p.name);
    expect(names).toContain("Ravi");
  });

  it("cannot take a name already worn at the table, whatever the case or look-alike letters", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "Ravi", "member");

    for (const attempt of ["Ravi", "rAVI", FULL_WIDTH_RAVI]) {
      const result = join(rooms, `sock_${attempt.length}`, attempt, host.code, "guest", GUEST_A);
      expect(result, attempt).toEqual({ ok: false, error: NAME_TAKEN_ERROR });
    }
    expect(peek(rooms, host.code).players.size).toBe(1);
  });

  it("cannot take a title of authority", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");

    const result = join(rooms, "sock_a", "Admin", host.code, "guest", GUEST_A);

    expect(result).toEqual({ ok: false, error: NAME_NOT_ALLOWED_ERROR });
  });

  it("cannot wear another guest's automatic name, but can keep their own", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");

    const borrowed = join(rooms, "sock_a", guestDisplayName(GUEST_B), host.code, "guest", GUEST_A);
    const own = join(rooms, "sock_a2", guestDisplayName(GUEST_A), host.code, "guest", GUEST_A);

    expect(borrowed).toEqual({ ok: false, error: NAME_NOT_ALLOWED_ERROR });
    expect(own.ok).toBe(true);
  });

  it("falls back to their own automatic name when they send none", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");

    const result = join(rooms, "sock_a", "   ", host.code, "guest", GUEST_A);

    expect(result.ok).toBe(true);
    const names = [...peek(rooms, host.code).players.values()].map((p) => p.name);
    expect(names).toContain(guestDisplayName(GUEST_A));
  });

  it("is told to pick another name, and can then join, after a refusal", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "Ravi", "member");

    const refused = join(rooms, "sock_a", "Ravi", host.code, "guest", GUEST_A);
    const retried = join(rooms, "sock_a", "Ravi K", host.code, "guest", GUEST_A);

    expect(refused.ok).toBe(false);
    expect(retried.ok).toBe(true);
  });
});

describe("names for everyone else", () => {
  it("are cleaned of invisible characters and markup on join", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");
    const messy = `<i>Ra${String.fromCodePoint(0x200b)}vi</i>`;

    join(rooms, "sock_m", messy, host.code, "member");

    const names = [...peek(rooms, host.code).players.values()].map((p) => p.name);
    expect(names).toContain("iRavi/i");
  });

  it("are never refused for an account — a namesake member simply joins", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "Ravi", "member");

    const result = join(rooms, "sock_m", "Ravi", host.code, "member");

    expect(result.ok).toBe(true);
  });

  it("are cleaned for the host as well", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", `  Ho${String.fromCodePoint(0x202e)}st  `, "member");

    expect([...peek(rooms, host.code).players.values()][0].name).toBe("Host");
  });
});

describe("probeRoom", () => {
  it("says not_found for a code that does not exist", () => {
    const rooms = makeRooms();

    expect(rooms.probeRoom("ZZZZZZ")).toBe("not_found");
  });

  it("says open for a lobby with a free seat, whatever the case of the code", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");

    expect(rooms.probeRoom(host.code)).toBe("open");
    expect(rooms.probeRoom(` ${host.code.toLowerCase()} `)).toBe("open");
  });

  it("says full once every seat is taken", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");
    const { max } = getGameLimits("ludo");
    for (let i = 1; i < max; i += 1) join(rooms, `sock_${i}`, `Player${i}`, host.code, "member");

    expect(rooms.probeRoom(host.code)).toBe("full");
  });

  it("says started once the match is under way", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");
    peek(rooms, host.code).phase = "playing";

    expect(rooms.probeRoom(host.code)).toBe("started");
  });

  it("says sealed for a sealed table, before it says anything about seats", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");
    peek(rooms, host.code).sealed = true;

    expect(rooms.probeRoom(host.code)).toBe("sealed");
  });

  it("agrees with what a join would answer, and creates nothing", () => {
    const rooms = makeRooms();
    const host = hostAs(rooms, "sock_host", "HostKumar", "member");
    peek(rooms, host.code).phase = "playing";
    const before = peek(rooms, host.code).players.size;

    expect(rooms.probeRoom(host.code)).toBe("started");
    expect(join(rooms, "sock_a", "Ravi", host.code, "guest", GUEST_A)).toEqual({
      ok: false,
      error: "Game already in progress",
    });
    expect(peek(rooms, host.code).players.size).toBe(before);
  });
});
