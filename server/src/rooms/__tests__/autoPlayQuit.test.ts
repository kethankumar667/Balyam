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
 * AUTO-PLAY TURN CAP.
 *
 * An idle takeover (connected, just not acting) had no bound at all before
 * this — the server would play a present-but-unresponsive seat's turns for
 * the rest of the match. `AUTO_PLAY_TURN_CAP` (5) ends that: after 5 real
 * turns played on an idle seat's behalf, the seat is force-quit — removed
 * from active play, but (for engines that support it) still visible with
 * its game state intact, so the table has a real trace of who left and why.
 *
 * Deliberately does NOT cover a genuine socket disconnect — that keeps
 * using its own, separate, economically-aware MATCH_GRACE_PERIOD_MS path
 * (see `isIdleAutoDriven`'s own doc comment in RoomManager.ts for why).
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
        else if (event === "room:state") {
          broadcasts.push(JSON.parse(JSON.stringify(payload)) as RoomPublicState);
        }
      },
    }),
    sockets: { sockets: { get: () => fakeSocket } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, broadcasts, chat };
}

interface PeekRoom {
  phase: string;
  players: Map<string, Player>;
  engine: { getPublicState(): { phase?: string } } | null;
}
const peek = (rooms: RoomManager, code: string): PeekRoom =>
  (rooms as unknown as { rooms: Map<string, PeekRoom> }).rooms.get(code)!;

const playerOf = (rooms: RoomManager, code: string, name: string): Player =>
  [...peek(rooms, code).players.values()].find((p) => p.name === name)!;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RoomManager — auto-play turn cap force-quit", () => {
  it("an idle human is force-quit after AUTO_PLAY_TURN_CAP turns, and the match continues without them", () => {
    // Two humans + one bot, matching disconnectTakeover.test.ts's own
    // `seatThree()` setup exactly — that shape is the confirmed-working one
    // for driving idle-strike accumulation under fake timers. Neither Alice
    // nor Bob is ever actually driven; only Alice's outcome is asserted.
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("sockA", "Alice", "ludo");
    rooms.joinRoom("sockB", "Bob", code);
    rooms.addBot("sockA");
    rooms.setReady("sockA", true);
    rooms.setReady("sockB", true);
    rooms.startGame("sockA");

    const alice = playerOf(rooms, code, "Alice");
    // Nobody ever plays for Alice — small steps until she's force-quit, or
    // we give up. 800 * 250ms = 200s of simulated time, comfortably past
    // both the idle-strike promotion and 5 full turns at bot pace.
    for (let i = 0; i < 800 && !alice.hasQuit; i++) {
      vi.advanceTimersByTime(250);
    }

    expect(alice.hasQuit).toBe(true);
    expect(alice.quitReason).toBe("auto_play_limit");
    expect(alice.isAutoPlaying).toBe(false);
    // Ludo's quitPlayer is non-destructive — she stays a real, named seat.
    expect(peek(rooms, code).players.has(alice.id)).toBe(true);

    // The match itself is not stuck — it's still playing (bots keep the
    // game moving) or has already concluded naturally between just bots.
    const room = peek(rooms, code);
    expect(["playing", "finished"]).toContain(room.phase);
  });

  it("a genuinely DISCONNECTED seat is never force-quit by the turn cap — only the 10-minute grace path governs it", () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("sockA", "Alice", "ludo");
    rooms.joinRoom("sockB", "Bob", code);
    rooms.addBot("sockA");
    rooms.setReady("sockA", true);
    rooms.setReady("sockB", true);
    rooms.startGame("sockA");

    rooms.handleDisconnect("sockA"); // Alice disconnects for real
    const alice = playerOf(rooms, code, "Alice");

    // Well past the 10s takeover grace window and comfortably past what
    // would be 5 turns at bot pace if the cap applied here — it must not.
    vi.advanceTimersByTime(2 * 60_000);

    expect(alice.isAutoPlaying).toBe(true);
    expect(alice.autoPlayReason).toBe("disconnected");
    expect(alice.hasQuit).toBeFalsy();
  });
});
