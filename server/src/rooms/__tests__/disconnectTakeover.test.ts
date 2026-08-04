import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import type {
  ChatMessage,
  ClientToServerEvents,
  Player,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * DISCONNECT TAKEOVER.
 *
 * A dropped player used to stall the whole table: every one of their turns
 * burned the full turn timer (30s in Rummy, `turnTimerSeconds` in Ludo) before
 * auto-resolving, for the entire 90s grace window. One flaky connection at a
 * four-player table meant most of the match was spent waiting on somebody who
 * wasn't there.
 *
 * The server now takes the seat over after a short blip window and plays it at
 * bot pace, then hands it straight back on reconnect. These tests pin the
 * three properties that make that safe rather than just fast:
 *
 *   1. a blip must NOT cost you your seat,
 *   2. a reconnect must reclaim it immediately, even mid-delay,
 *   3. a table with nobody watching must NOT play itself out.
 */

function makeIo(): {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  broadcasts: RoomPublicState[];
  chat: ChatMessage[];
} {
  const broadcasts: RoomPublicState[] = [];
  const chat: ChatMessage[] = [];
  const fakeSocket = { join() {}, leave() {}, emit() {} };
  const io = {
    to: () => ({
      emit: (event: string, payload: unknown) => {
        if (event === "chat:message") chat.push(payload as ChatMessage);
        else if (event === "room:state") broadcasts.push(payload as RoomPublicState);
      },
    }),
    sockets: { sockets: { get: () => fakeSocket } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, broadcasts, chat };
}

/** Two humans + one bot on a Ludo table, mid-game. */
function seatThree() {
  const { io, chat } = makeIo();
  const rooms = new RoomManager(io);
  const { code } = rooms.createRoom("sockA", "Alice", "ludo");
  rooms.joinRoom("sockB", "Bob", code);
  rooms.addBot("sockA");
  rooms.setReady("sockA", true);
  rooms.setReady("sockB", true);
  rooms.startGame("sockA");
  return { rooms, code, chat };
}

/** Reach into the manager's private room map — these are internal-state
 *  assertions by nature, and the alternative is asserting on broadcast
 *  payloads, which would not distinguish "not taken over" from "not sent". */
interface PeekRoom {
  players: Map<string, Player>;
  engine: {
    getPublicState(): {
      turnPlayerId: string;
      stats?: { rollCount?: Record<string, number> };
    };
  };
}
const peek = (rooms: RoomManager, code: string): PeekRoom =>
  (rooms as unknown as { rooms: Map<string, PeekRoom> }).rooms.get(code)!;

const playerOf = (rooms: RoomManager, code: string, name: string): Player =>
  [...peek(rooms, code).players.values()].find((p) => p.name === name)!;

const totalRolls = (rooms: RoomManager, code: string): number =>
  Object.values(peek(rooms, code).engine.getPublicState().stats?.rollCount ?? {})
    .reduce((a, b) => a + b, 0);

const rollsFor = (rooms: RoomManager, code: string, name: string): number =>
  peek(rooms, code).engine.getPublicState().stats?.rollCount?.[
    playerOf(rooms, code, name).id
  ] ?? 0;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RoomManager — disconnect takeover", () => {
  it("a brief blip does NOT hand the seat to the server", () => {
    const { rooms, code } = seatThree();
    const bob = playerOf(rooms, code, "Bob");

    rooms.handleDisconnect("sockB");
    expect(bob.isConnected).toBe(false);

    // Still inside the blip window — a page refresh or a tunnel lands here.
    vi.advanceTimersByTime(9_000);
    expect(bob.isAutoPlaying).not.toBe(true);

    rooms.joinRoom("sockB2", "Bob", code, bob.id);
    vi.advanceTimersByTime(60_000);
    expect(bob.isAutoPlaying).not.toBe(true);
    expect(bob.isConnected).toBe(true);
  });

  it("a real drop is taken over once the blip window passes, and announced", () => {
    const { rooms, code, chat } = seatThree();
    const bob = playerOf(rooms, code, "Bob");

    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(11_000);

    expect(bob.isAutoPlaying).toBe(true);
    expect(chat.some((m) => m.playerId === "system" && /Bob.*lost connection/i.test(m.text))).toBe(true);
  });

  it("reconnecting hands the seat straight back", () => {
    const { rooms, code, chat } = seatThree();
    const bob = playerOf(rooms, code, "Bob");

    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(11_000);
    expect(bob.isAutoPlaying).toBe(true);

    rooms.joinRoom("sockB2", "Bob", code, bob.id);
    expect(bob.isAutoPlaying).toBe(false);
    expect(chat.some((m) => m.playerId === "system" && /Bob is back/i.test(m.text))).toBe(true);
  });

  it("the taken-over seat is actually PLAYED, not merely flagged", () => {
    // The whole point of the feature, and the assertion has to be airtight
    // about WHY the seat moved. So we drop the player who currently HOLDS the
    // turn (Alice, seat 0) and check inside her own 20s Ludo turn timer:
    // nothing but the takeover could have produced a roll by then.
    //
    // An earlier version dropped Bob and waited 22s. That looked safe but
    // straddled Alice's 20s timeout — the roll it saw was often the ordinary
    // timer resolving her turn, not the takeover, and the test passed or
    // failed on where the bot's think-delay happened to land.
    const { rooms, code } = seatThree();
    expect(peek(rooms, code).engine.getPublicState().turnPlayerId).toBe(
      playerOf(rooms, code, "Alice").id,
    );

    rooms.handleDisconnect("sockA"); // Bob stays, so the table has a watcher
    const before = rollsFor(rooms, code, "Alice");

    vi.advanceTimersByTime(15_000); // past the 10s blip window, short of 20s

    expect(rollsFor(rooms, code, "Alice")).toBeGreaterThan(before);
  });

  it("a taken-over seat is never confused with a bot", () => {
    const { rooms, code } = seatThree();
    const bob = playerOf(rooms, code, "Bob");

    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(11_000);

    // The distinction matters for scoring, the roster and end-of-game
    // handling — only "who acts now" may treat them alike.
    expect(bob.isAutoPlaying).toBe(true);
    expect(bob.isBot).toBeFalsy();
  });

  it("a table with nobody connected does NOT play itself out", () => {
    // Rolls are counted rather than the turn cursor: a bot taking several
    // turns in a row (a six in Ludo grants another) would leave the cursor
    // unchanged and make a naive assertion pass for the wrong reason.
    // CONTROL — with a human present, the table keeps moving. Without this
    // the assertion below could pass simply because nothing was ever going
    // to happen in the window.
    {
      const { rooms, code } = seatThree();
      rooms.handleDisconnect("sockB");
      const before = totalRolls(rooms, code);
      vi.advanceTimersByTime(90_000);
      expect(totalRolls(rooms, code)).toBeGreaterThan(before);
    }

    // Both humans gone: the bot must not run the match on without them, or
    // they reconnect to a finished game they never saw.
    {
      const { rooms, code } = seatThree();
      rooms.handleDisconnect("sockA");
      rooms.handleDisconnect("sockB");
      vi.advanceTimersByTime(11_000);
      const before = totalRolls(rooms, code);
      vi.advanceTimersByTime(60_000);
      expect(totalRolls(rooms, code)).toBe(before);
    }
  });

  it("a table that emptied and refilled starts moving again", () => {
    // The dangerous interaction between the two halves of this feature:
    // `onTurnTimeout` bails while nobody is connected, and nothing re-arms it
    // — so without an explicit kick on reconnect, a room that everyone
    // briefly left stays frozen forever even once they are all back.
    const { rooms, code } = seatThree();

    rooms.handleDisconnect("sockA");
    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(40_000); // timers fire into the "nobody home" guard

    // Reconnect the player whose turn it ISN'T. Re-arming only for the
    // returning seat is not enough: the table is waiting on somebody else,
    // and that somebody has no live socket to nudge it.
    const turnHolder = peek(rooms, code).engine.getPublicState().turnPlayerId;
    const returning = ["Alice", "Bob"]
      .map((n) => playerOf(rooms, code, n))
      .find((p) => p.id !== turnHolder)!;
    rooms.joinRoom("sock_back", returning.name, code, returning.id);

    const before = totalRolls(rooms, code);
    vi.advanceTimersByTime(60_000);
    expect(totalRolls(rooms, code)).toBeGreaterThan(before);
  });

  it("someone who dropped in the LOBBY is covered as soon as the game starts", () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("sockA", "Alice", "ludo");
    rooms.joinRoom("sockB", "Bob", code);
    rooms.setReady("sockA", true);
    rooms.setReady("sockB", true);

    // Bob drops BEFORE the deal, so he never has a socket to lose in-game.
    rooms.handleDisconnect("sockB");
    rooms.startGame("sockA");
    vi.advanceTimersByTime(11_000);

    const bob = playerOf(rooms, code, "Bob");
    expect(bob.isAutoPlaying).toBe(true);
  });
});
