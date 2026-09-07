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
 * A genuinely DISCONNECTED seat (2026-09-09) is capped too, via the sibling
 * `DISCONNECT_FORFEIT_TURN_CAP` / `disconnectSubMovesPlayed` — a SUB-move
 * count, not a strict turn count like `autoTurnsPlayed` above (see both
 * constants' own doc comments in RoomManager.ts for why: `autoTurnsPlayed`'s
 * `lastAutoTurnActor` heuristic only detects a turn boundary when a
 * DIFFERENT auto-driven seat interrupts, which never happens in a genuine
 * 2-human match — the disconnected seat is the only auto-driven actor in
 * the room for the whole episode). That cap is also never sufficient BY
 * ITSELF: it only fires once `GRACE_PERIOD_MS` (90s) of real elapsed time
 * has ALSO passed since the disconnect, because a genuine network drop can
 * easily outlast a handful of bot-paced sub-moves. An idle seat has no such
 * floor — it is CONNECTED, just not acting.
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
  autoTurnsPlayed: Map<string, number>;
  disconnectSubMovesPlayed: Map<string, number>;
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

  /**
   * RPS, not Ludo, for all three disconnect tests below — and Bob's own
   * choice is submitted for REAL every tick, unlike the idle test above.
   * That is load-bearing, not a style choice: `canApplyTimeoutMove` (see its
   * own doc comment in RoomManager.ts) deliberately refuses to auto-resolve
   * a CONNECTED survivor's turn by timeout while another participant has an
   * active disconnect-grace window — Bob is that survivor here, so unlike
   * the idle test's Bob (never in a disconnect-grace room at all, and so
   * free to auto-resolve normally), an un-driven Bob would simply never
   * pick, the round would never resolve, and Alice's own auto-play turn
   * count would freeze at 1 forever. A real per-round pick for Bob is
   * therefore the only way to exercise DISCONNECT_FORFEIT_TURN_CAP at all.
   */
  function driveDisconnectedRpsMatch(
    rooms: RoomManager,
    code: string,
    maxIterations: number,
    stop: () => boolean,
  ): void {
    for (let i = 0; i < maxIterations && !stop(); i++) {
      vi.advanceTimersByTime(250);
      // Harmless once Bob has already picked for the current round or the
      // match has ended — applyMove on a phase that doesn't accept it is a
      // normal no-op/rejection, not a throw.
      rooms.applyMove("sockB", "choose", { choice: "rock" });
    }
  }

  it("a disconnected seat is NOT force-quit purely by turn count — the GRACE_PERIOD_MS time floor still gates it", () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("sockA", "Alice", "rps");
    rooms.joinRoom("sockB", "Bob", code);
    rooms.setReady("sockA", true);
    rooms.setReady("sockB", true);
    rooms.startGame("sockA");

    rooms.handleDisconnect("sockA"); // Alice disconnects for real
    const alice = playerOf(rooms, code, "Alice");

    // Stop the instant the turn cap is first exceeded — bounded well under
    // 90s of simulated time (300 * 250ms = 75s) so this test's own premise
    // (turn cap reached, time floor not yet reached) is guaranteed to hold
    // if it stops at all.
    driveDisconnectedRpsMatch(rooms, code, 300, () => (peek(rooms, code).disconnectSubMovesPlayed.get(alice.id) ?? 0) > 5);

    const turnsSoFar = peek(rooms, code).disconnectSubMovesPlayed.get(alice.id) ?? 0;
    expect(turnsSoFar).toBeGreaterThan(5); // proves the turn cap alone was already satisfied here
    expect(alice.isAutoPlaying).toBe(true);
    expect(alice.autoPlayReason).toBe("disconnected");
    expect(alice.hasQuit).toBeFalsy(); // yet the time floor isn't met, so she must still be in play
  });

  it("a disconnected seat IS force-quit as a forfeit once both the turn cap and the GRACE_PERIOD_MS time floor are satisfied", () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("sockA", "Alice", "rps");
    rooms.joinRoom("sockB", "Bob", code);
    rooms.setReady("sockA", true);
    rooms.setReady("sockB", true);
    rooms.startGame("sockA");

    rooms.handleDisconnect("sockA"); // Alice disconnects for real
    const alice = playerOf(rooms, code, "Alice");

    // RPS is first-to-10-wins (TARGET in RpsEngine.ts) — with Bob genuinely
    // playing every round, that legitimately resolves in the same rough
    // number of rounds DISCONNECT_FORFEIT_TURN_CAP needs, but the 90s
    // GRACE_PERIOD_MS floor needs roughly 45-75 MORE rounds' worth of
    // simulated time on top (at Alice's ~1.2-2s bot pace) to also elapse —
    // by which point a real first-to-10 outcome has almost certainly
    // already happened first. That is not a bug: a genuinely, continuously
    // playing survivor SHOULD let the match resolve on real gameplay rather
    // than an artificial forfeit. To test the forfeit path itself in
    // isolation from that race, the time floor is satisfied directly here
    // (`awaySince` backdated on the live player object `playerOf` returns) —
    // proving the trigger fires correctly once both conditions genuinely
    // hold, without needing to out-wait an unrelated win condition.
    alice.awaySince = Date.now() - 91_000;

    driveDisconnectedRpsMatch(rooms, code, 400, () => alice.hasQuit || peek(rooms, code).phase === "finished");

    expect(alice.hasQuit).toBe(true);
    expect(alice.quitReason).toBe("auto_play_limit");
    expect(alice.isAutoPlaying).toBe(false);
    expect(peek(rooms, code).phase).toBe("finished");
    // RPS has no quitPlayer — a 2-seat forfeit is the same full-purge
    // removePlayer an expired grace window always used, just triggered by
    // the turn cap + time floor instead. Alice is gone, Bob is the sole
    // remaining (and therefore winning) seat.
    expect(peek(rooms, code).players.has(alice.id)).toBe(false);
    const bob = [...peek(rooms, code).players.values()].find((p) => p.name === "Bob");
    expect(bob).toBeDefined();
  });
});
