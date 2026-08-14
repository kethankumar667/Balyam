import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import { AVATAR_FILES } from "@shared/avatars.js";
import type {
  ClientToServerEvents,
  Player,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * AVATARS AT THE TABLE.
 *
 * Two things are being checked here, and only one of them is a feature.
 *
 * The feature: an avatar picked on one device reaches every other player, so
 * the table shows faces instead of initials.
 *
 * The security property: that value is a string one player hands the server,
 * which the server then broadcasts and every other browser renders as
 * `<img src={"/Avatars/" + it}>`. Unvalidated, it is an injection point into
 * everyone else's page — `../../` climbs out of the folder, and a value that
 * resolves off-site would hand a stranger's server the IP address of every
 * person in the room. The server therefore accepts only names on the shared
 * manifest and silently drops everything else.
 *
 * The dropping is what these tests mostly exercise, because that is the part
 * that fails quietly if it regresses: a bad avatar does not throw, it just
 * ends up in the broadcast.
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
  (rooms as unknown as { rooms: Map<string, { players: Map<string, Player> }> }).rooms.get(code)!;

const seatOf = (rooms: RoomManager, code: string, id: string) =>
  peek(rooms, code).players.get(id)!;

const REAL = AVATAR_FILES[0];
const ALSO_REAL = AVATAR_FILES[1];

/**
 * `createRoom` takes eighteen game-option parameters between `game` and
 * `avatar`, so calling it with an avatar means padding the gap. Counting the
 * padding by hand got it wrong the first time this file was written — which is
 * precisely the hazard the comment on that signature describes — so the count
 * is derived from the function's own arity instead of typed out.
 */
function hostWithAvatar(rooms: RoomManager, socket: string, name: string, avatar: unknown) {
  const gap = rooms.createRoom.length - 4; // socketId, name, game, …gap…, avatar
  const args: unknown[] = [socket, name, "rummy"];
  for (let i = 0; i < gap; i++) args.push(undefined);
  args.push(avatar);
  // Assembled as an array and cast once, rather than spread inline: a runtime
  // length cannot be expressed as a tuple, so an inline spread makes the
  // compiler line `avatar` up against the first option parameter and reject it.
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

describe("avatar reaches the table", () => {
  it("stores the host's avatar when it is one we ship", () => {
    const { rooms } = makeHarness();
    const alice = hostWithAvatar(rooms, "sock_alice", "Alice", REAL);
    expect(seatOf(rooms, alice.code, alice.playerId).avatar).toBe(REAL);
  });

  it("stores a joiner's avatar and broadcasts it to the room", () => {
    const { rooms, broadcasts } = makeHarness();
    const alice = rooms.createRoom("sock_alice", "Alice", "rummy");
    const bob = rooms.joinRoom("sock_bob", "Bob", alice.code, undefined, undefined, REAL);
    expect(bob.ok).toBe(true);

    // The point of the feature: it is in the state OTHER players receive,
    // not merely in the joiner's own record.
    const last = broadcasts[broadcasts.length - 1];
    const bobSeat = last.players.find((p) => p.name === "Bob");
    expect(bobSeat?.avatar).toBe(REAL);
  });

  it("leaves the field absent when no avatar was chosen", () => {
    const { rooms } = makeHarness();
    const alice = rooms.createRoom("sock_alice", "Alice", "rummy");
    // Absent, not empty-string: the client renders an initial on falsy, and a
    // "" that survived would be indistinguishable from a choice in the data.
    expect(seatOf(rooms, alice.code, alice.playerId).avatar).toBeUndefined();
  });
});

describe("avatar is validated, not trusted", () => {
  const HOSTILE = [
    ["path traversal", "../../../../etc/passwd"],
    ["traversal to another public asset", "../bhalyam-dark-hero.png"],
    ["absolute off-site URL", "https://evil.example/track.gif"],
    ["protocol-relative URL", "//evil.example/track.gif"],
    ["data URI", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
    ["query string appended to a real name", `${AVATAR_FILES[0]}?beacon=1`],
    ["unknown filename", "not-a-real-avatar.jpg"],
    ["empty string", ""],
  ] as const;

  for (const [label, value] of HOSTILE) {
    it(`drops ${label} on join`, () => {
      const { rooms, broadcasts } = makeHarness();
      const alice = rooms.createRoom("sock_alice", "Alice", "rummy");
      const bob = rooms.joinRoom("sock_bob", "Bob", alice.code, undefined, undefined, value);
      expect(bob.ok).toBe(true);
      if (!bob.ok) return;

      expect(seatOf(rooms, alice.code, bob.playerId).avatar).toBeUndefined();
      // And it never reached anyone else either.
      const last = broadcasts[broadcasts.length - 1];
      expect(last.players.find((p) => p.name === "Bob")?.avatar).toBeUndefined();
    });
  }

  it("drops a hostile value on create too", () => {
    const { rooms } = makeHarness();
    const alice = hostWithAvatar(rooms, "sock_alice", "Alice", "../../../secret.png");
    expect(seatOf(rooms, alice.code, alice.playerId).avatar).toBeUndefined();
  });

  it("rejects a non-string without throwing", () => {
    const { rooms } = makeHarness();
    const alice = rooms.createRoom("sock_alice", "Alice", "rummy");
    // A hand-rolled socket payload is not obliged to respect the type.
    const bob = rooms.joinRoom(
      "sock_bob", "Bob", alice.code, undefined, undefined,
      { toString: () => AVATAR_FILES[0] } as unknown as string
    );
    expect(bob.ok).toBe(true);
    if (bob.ok) expect(seatOf(rooms, alice.code, bob.playerId).avatar).toBeUndefined();
  });
});

describe("avatar across a reconnect", () => {
  it("survives a seat reclaim that does not mention it", () => {
    const { rooms } = makeHarness();
    const alice = rooms.createRoom("sock_alice", "Alice", "rummy");
    const bob = rooms.joinRoom("sock_bob", "Bob", alice.code, undefined, undefined, REAL);
    if (!bob.ok) throw new Error("fixture");

    rooms.handleDisconnect("sock_bob");
    const back = rooms.joinRoom(
      "sock_bob2", "Bob", alice.code, bob.playerId,
      mintSeatToken(alice.code, bob.playerId)
    );
    expect(back.ok).toBe(true);
    // An older client that never sends the field must not blank the face the
    // rest of the table has been looking at all game.
    expect(seatOf(rooms, alice.code, bob.playerId).avatar).toBe(REAL);
  });

  it("accepts a changed avatar on reclaim", () => {
    const { rooms } = makeHarness();
    const alice = rooms.createRoom("sock_alice", "Alice", "rummy");
    const bob = rooms.joinRoom("sock_bob", "Bob", alice.code, undefined, undefined, REAL);
    if (!bob.ok) throw new Error("fixture");

    rooms.handleDisconnect("sock_bob");
    rooms.joinRoom(
      "sock_bob2", "Bob", alice.code, bob.playerId,
      mintSeatToken(alice.code, bob.playerId), ALSO_REAL
    );
    expect(seatOf(rooms, alice.code, bob.playerId).avatar).toBe(ALSO_REAL);
  });

  it("does not let a hostile value in through the reclaim path", () => {
    const { rooms } = makeHarness();
    const alice = rooms.createRoom("sock_alice", "Alice", "rummy");
    const bob = rooms.joinRoom("sock_bob", "Bob", alice.code, undefined, undefined, REAL);
    if (!bob.ok) throw new Error("fixture");

    rooms.handleDisconnect("sock_bob");
    rooms.joinRoom(
      "sock_bob2", "Bob", alice.code, bob.playerId,
      mintSeatToken(alice.code, bob.playerId), "../../../../etc/passwd"
    );
    // Rejected, and the previous good value is left standing.
    expect(seatOf(rooms, alice.code, bob.playerId).avatar).toBe(REAL);
  });
});
