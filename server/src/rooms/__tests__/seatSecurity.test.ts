import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import type {
  ClientToServerEvents,
  Player,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * SEAT OWNERSHIP.
 *
 * The attack these tests exist to prevent, in the order an attacker performs
 * it:
 *
 *   1. Get the room code. It is on a QR poster and in the group chat.
 *   2. Read the players' ids — `toPublicState` broadcasts the whole `Player`
 *      record to every seat and every spectator, so this is free.
 *   3. `room:join` with somebody else's id.
 *
 * Step 3 used to work. The server seated you, emitted `getStateFor(theirId)`
 * — their hand, in Rummy or UNO — and accepted your moves as theirs.
 *
 * A seat is now proved with a token issued only to the socket that took it.
 */

interface Harness {
  rooms: RoomManager;
  /** Everything emitted to one specific socket, in order. */
  privateEmits: Map<string, { event: string; payload: unknown }[]>;
  broadcasts: RoomPublicState[];
}

function makeHarness(): Harness {
  const privateEmits = new Map<string, { event: string; payload: unknown }[]>();
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
        get: (id: string) => ({
          join() {},
          leave() {},
          emit: (event: string, payload: unknown) => {
            const list = privateEmits.get(id) ?? [];
            list.push({ event, payload });
            privateEmits.set(id, list);
          },
        }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { rooms: new RoomManager(io), privateEmits, broadcasts };
}

const peek = (rooms: RoomManager, code: string) =>
  (rooms as unknown as {
    rooms: Map<string, { players: Map<string, Player>; socketToPlayer: Map<string, string> }>;
  }).rooms.get(code)!;

/** Alice hosts, Bob joins, mid-lobby. Rummy, so seats hold private hands. */
function twoSeats() {
  const h = makeHarness();
  const alice = h.rooms.createRoom("sock_alice", "Alice", "rummy");
  const bob = h.rooms.joinRoom("sock_bob", "Bob", alice.code);
  if (!bob.ok) throw new Error("fixture failed to seat Bob");
  return { ...h, code: alice.code, alice, bob };
}

describe("seat ownership", () => {
  it("refuses a seat claimed with a public id and no token", () => {
    const { rooms, code, alice } = twoSeats();

    // Everything the attacker has: the room code and Alice's id, both public.
    const attack = rooms.joinRoom("sock_attacker", "Mallory", code, alice.playerId);

    expect(attack.ok).toBe(true); // seated, but...
    if (attack.ok) expect(attack.playerId).not.toBe(alice.playerId); // ...not as Alice
    // Alice's seat is still wired to Alice's socket.
    expect(peek(rooms, code).socketToPlayer.get("sock_alice")).toBe(alice.playerId);
    expect(peek(rooms, code).socketToPlayer.get("sock_attacker")).not.toBe(alice.playerId);
  });

  it("does not leak the victim's private state to the attacker", () => {
    const { rooms, code, alice, privateEmits } = twoSeats();
    rooms.setReady("sock_alice", true);
    rooms.setReady("sock_bob", true);
    rooms.startGame("sock_alice");

    privateEmits.delete("sock_attacker");
    rooms.joinRoom("sock_attacker", "Mallory", code, alice.playerId);

    // The reclaim path is the only one that emits a seat-specific `game:state`
    // on join. Reaching it at all would have handed over Alice's hand.
    const leaked = (privateEmits.get("sock_attacker") ?? []).filter((e) => e.event === "game:state");
    expect(leaked).toEqual([]);
  });

  it("refuses a token minted for a different room", () => {
    const { rooms, code, alice } = twoSeats();
    // Mallory hosts her own room, so she holds a perfectly valid token —
    // for the wrong room.
    const other = rooms.createRoom("sock_mallory", "Mallory", "rummy");
    const attack = rooms.joinRoom(
      "sock_attacker",
      "Mallory",
      code,
      alice.playerId,
      other.seatToken,
    );
    if (attack.ok) expect(attack.playerId).not.toBe(alice.playerId);
  });

  it("refuses a token minted for a different seat in the same room", () => {
    const { rooms, code, alice, bob } = twoSeats();
    if (!bob.ok) throw new Error("unreachable");
    const attack = rooms.joinRoom("sock_attacker", "Bob", code, alice.playerId, bob.seatToken);
    if (attack.ok) expect(attack.playerId).not.toBe(alice.playerId);
  });

  it("still lets the rightful owner reclaim their seat", () => {
    const { rooms, code, alice } = twoSeats();
    rooms.handleDisconnect("sock_alice");

    const back = rooms.joinRoom("sock_alice_2", "Alice", code, alice.playerId, alice.seatToken);

    expect(back.ok).toBe(true);
    if (back.ok) expect(back.playerId).toBe(alice.playerId);
    expect(peek(rooms, code).socketToPlayer.get("sock_alice_2")).toBe(alice.playerId);
    expect(peek(rooms, code).players.get(alice.playerId)?.isConnected).toBe(true);
  });

  it("issues a token that keeps working across repeated reclaims", () => {
    // A flaky phone reconnects many times in one match; the credential must
    // not be single-use.
    const { rooms, code, alice } = twoSeats();
    for (let i = 0; i < 5; i++) {
      rooms.handleDisconnect(i === 0 ? "sock_alice" : `sock_alice_${i}`);
      const back = rooms.joinRoom(`sock_alice_${i + 1}`, "Alice", code, alice.playerId, alice.seatToken);
      expect(back.ok).toBe(true);
      if (back.ok) expect(back.playerId).toBe(alice.playerId);
    }
  });

  it("never puts the token in a broadcast", () => {
    const { broadcasts, alice, bob } = twoSeats();
    if (!bob.ok) throw new Error("unreachable");
    expect(broadcasts.length).toBeGreaterThan(0);
    const wire = JSON.stringify(broadcasts);
    expect(wire).not.toContain(alice.seatToken);
    expect(wire).not.toContain(bob.seatToken);
    // The id, by contrast, is expected to be there — it addresses reactions
    // and targeted sounds. That is exactly why it cannot also be the key.
    expect(wire).toContain(alice.playerId);
  });

  it("mints ids server-side, so no caller can seat itself as `system`", () => {
    // `system` is the reserved author of table announcements. The payload
    // field that allowed this is gone, so the type system is the real guard;
    // this pins the minted shape behind it.
    const { rooms } = twoSeats();
    const fresh = rooms.createRoom("sock_new", "Someone", "ludo");
    expect(fresh.playerId).toMatch(/^p_\d+_[a-z0-9]+$/);
    expect(fresh.playerId).not.toBe("system");
  });

  it("gives an attacker no way to tell a real id from a made-up one", () => {
    // Both fall through to the ordinary new-seat path, so a probe cannot be
    // used to enumerate who is in the room.
    const { rooms, code, alice } = twoSeats();
    const realId = rooms.joinRoom("sock_probe_a", "Probe", code, alice.playerId, "wrong-token");
    const fakeId = rooms.joinRoom("sock_probe_b", "Probe", code, "p_0_zzzzzz", "wrong-token");
    expect(realId.ok).toBe(fakeId.ok);
    if (realId.ok && fakeId.ok) {
      expect(realId.playerId).not.toBe(alice.playerId);
      expect(fakeId.playerId).not.toBe(alice.playerId);
    }
  });
});
