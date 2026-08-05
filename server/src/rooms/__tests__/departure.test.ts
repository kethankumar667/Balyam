import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import type {
  ClientToServerEvents,
  Player,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * MID-GAME DEPARTURES.
 *
 * Two paths remove a seat from a live table — a quit, and a socket that never
 * came back. Both used to end the same way: broadcast the new ROSTER and
 * stop, trusting whatever timer was already running to carry the game.
 *
 * It does not. That timer belongs to the turn the departing player was
 * taking. Once they are gone the engine advances the turn, and if it lands on
 * a bot or a taken-over seat nothing moves until the stale timer happens to
 * fire — up to a full turn later. Clients were not even sent the new GAME
 * state, so the board kept showing a player who had left.
 *
 * NOTE on what is asserted: `turnTimer` is deliberately NOT checked. It is
 * legitimately null whenever a bot owns the beat (the scheduler clears it on
 * purpose), and it is also still set from the previous turn even when the bug
 * is present — so it cannot tell the two apart in either direction.
 */

function makeIo() {
  const emits: { event: string; socketId: string }[] = [];
  const socketFor = (socketId: string) => ({
    join() {},
    leave() {},
    emit: (event: string) => emits.push({ event, socketId }),
  });
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: (id: string) => socketFor(id) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, emits };
}

interface PeekRoom {
  players: Map<string, Player>;
  takeoverTimers: Map<string, unknown>;
  cleanupTimers: Map<string, unknown>;
  idleStrikes: Map<string, number>;
  engine: {
    getPublicState(): { turnPlayerId: string; stats?: { rollCount?: Record<string, number> } };
  };
}
const peek = (r: RoomManager, code: string): PeekRoom =>
  (r as unknown as { rooms: Map<string, PeekRoom> }).rooms.get(code)!;

const rolls = (r: RoomManager, code: string): number =>
  Object.values(peek(r, code).engine.getPublicState().stats?.rollCount ?? {})
    .reduce((a, b) => a + b, 0);

const gameStates = (emits: { event: string }[]) =>
  emits.filter((e) => e.event === "game:state").length;

/** Two humans + a bot on a Ludo table (20s turn timer), mid-game. */
function seatThree() {
  const { io, emits } = makeIo();
  const rooms = new RoomManager(io);
  const { code } = rooms.createRoom("sA", "Alice", "ludo");
  rooms.joinRoom("sB", "Bob", code);
  rooms.addBot("sA");
  rooms.setReady("sA", true);
  rooms.setReady("sB", true);
  rooms.startGame("sA");
  const bobId = [...peek(rooms, code).players.values()].find((p) => p.name === "Bob")!.id;
  return { rooms, code, emits, bobId };
}

/** Advance until it is `playerId`'s turn, so a departure is guaranteed to
 *  hand the turn onward rather than leaving it where it was. */
function advanceToTurnOf(rooms: RoomManager, code: string, playerId: string): boolean {
  for (let i = 0; i < 400; i++) {
    if (peek(rooms, code).engine.getPublicState().turnPlayerId === playerId) return true;
    vi.advanceTimersByTime(500);
  }
  return false;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RoomManager — mid-game departure", () => {
  it("a QUIT pushes fresh game state and hands the turn on without stalling", () => {
    const { rooms, code, emits, bobId } = seatThree();
    // Leave on Bob's OWN turn: the turn must then move to somebody else, which
    // is exactly the case that used to sit idle.
    expect(advanceToTurnOf(rooms, code, bobId)).toBe(true);

    const statesBefore = gameStates(emits);
    const rollsBefore = rolls(rooms, code);
    rooms.leaveRoom("sB");

    // Without the push, the remaining boards go on showing a seat that no
    // longer exists until something else happens to broadcast.
    expect(gameStates(emits)).toBeGreaterThan(statesBefore);

    // And the table picks up well inside one 20s turn timer.
    vi.advanceTimersByTime(4_000);
    expect(rolls(rooms, code)).toBeGreaterThan(rollsBefore);
  });

  /**
   * The reap path is asserted STRUCTURALLY rather than on broadcasts. Its
   * game-state push already existed before `resumeTable`, and the seat is
   * being auto-played right up until the moment it is removed — so any
   * emission window around the 90s mark is full of ordinary auto-play traffic
   * and cannot isolate the reap. Claiming otherwise would be a test that
   * passes for the wrong reason; the QUIT case above is the one that actually
   * pins the fix.
   */
  it("a seat REAPED at 90s is removed cleanly and the room plays on", () => {
    const { rooms, code, bobId } = seatThree();
    expect(advanceToTurnOf(rooms, code, bobId)).toBe(true);

    rooms.handleDisconnect("sB");
    vi.advanceTimersByTime(91_000); // grace elapses; Bob's seat is removed

    const r = peek(rooms, code);
    expect(r.players.has(bobId)).toBe(false);
    // Alice is still here, so the room must survive rather than be abandoned.
    expect([...r.players.values()].some((p) => p.name === "Alice")).toBe(true);
    expect(r.engine.getPublicState().turnPlayerId).not.toBe(bobId);
  });

  it("a departed seat leaves no per-seat timers or counters behind", () => {
    const { rooms, code, bobId } = seatThree();
    const r = peek(rooms, code);

    rooms.handleDisconnect("sB");
    expect(r.takeoverTimers.has(bobId)).toBe(true);

    vi.advanceTimersByTime(91_000); // seat reaped
    // Scoped to the DEPARTED seat: strikes belonging to players still at the
    // table are supposed to survive.
    expect(r.takeoverTimers.has(bobId)).toBe(false);
    expect(r.idleStrikes.has(bobId)).toBe(false);
    expect(r.cleanupTimers.has(bobId)).toBe(false);
  });
});
