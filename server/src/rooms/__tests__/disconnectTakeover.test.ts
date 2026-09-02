import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import type { LudoEngine } from "../../games/ludo/LudoEngine.js";
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
  direct: ChatMessage[];
} {
  const broadcasts: RoomPublicState[] = [];
  const chat: ChatMessage[] = [];
  // Messages sent to ONE socket rather than the room. The welcome-back note
  // is deliberately private to the returning player, so a room-level capture
  // would never see it.
  const direct: ChatMessage[] = [];
  const fakeSocket = {
    join() {},
    leave() {},
    emit: (event: string, payload: unknown) => {
      if (event === "chat:message") direct.push(payload as ChatMessage);
    },
  };
  const io = {
    to: () => ({
      emit: (event: string, payload: unknown) => {
        if (event === "chat:message") chat.push(payload as ChatMessage);
        // DEEP COPY, deliberately. `toPublicState` hands out the live Player
        // objects, so storing the payload by reference records nothing — the
        // entries keep mutating with the server and every "what did the
        // clients see?" assertion silently becomes "what does the server
        // think now?". That is exactly how a takeover that was never
        // broadcast passed a test written to catch it.
        else if (event === "room:state") {
          broadcasts.push(JSON.parse(JSON.stringify(payload)) as RoomPublicState);
        }
      },
    }),
    sockets: { sockets: { get: () => fakeSocket } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, broadcasts, chat, direct };
}

/** Two humans + one bot on a Ludo table, mid-game. */
function seatThree() {
  const { io, chat, broadcasts, direct } = makeIo();
  const rooms = new RoomManager(io);
  const { code } = rooms.createRoom("sockA", "Alice", "ludo");
  rooms.joinRoom("sockB", "Bob", code);
  rooms.addBot("sockA");
  rooms.setReady("sockA", true);
  rooms.setReady("sockB", true);
  rooms.startGame("sockA");
  return { rooms, code, chat, broadcasts, direct };
}

/** The seat as the CLIENTS last saw it — deliberately not the server's own
 *  object. Every other assertion here reads internal state, which is exactly
 *  why a takeover that was never broadcast went unnoticed. */
const asBroadcast = (broadcasts: RoomPublicState[], name: string): Player | undefined =>
  broadcasts[broadcasts.length - 1]?.players?.find((p) => p.name === name);

/** Reach into the manager's private room map — these are internal-state
 *  assertions by nature, and the alternative is asserting on broadcast
 *  payloads, which would not distinguish "not taken over" from "not sent". */
interface PeekRoom {
  phase?: string;
  players: Map<string, Player>;
  idleStrikes: Map<string, number>;
  cleanupTimers: Map<string, NodeJS.Timeout>;
  engine: {
    getPublicState(): {
      phase?: string;
      turnPlayerId?: string;
      turnPhase?: string;
      scores?: Record<string, number>;
      history?: unknown[];
      stats?: { rollCount?: Record<string, number> };
      players?: Array<{ id: string; hasSelected?: boolean; hasSubmitted?: boolean; hasPassed?: boolean }>;
      allAnswers?: Record<string, unknown> | null;
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

    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));
    // Short window on purpose. Advancing a minute here would let the IDLE
    // takeover fire legitimately (nobody in this test ever plays), and the
    // assertion would be about the wrong feature.
    vi.advanceTimersByTime(5_000);
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

    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));
    expect(bob.isAutoPlaying).toBe(false);
    expect(chat.some((m) => m.playerId === "system" && /Bob is back/i.test(m.text))).toBe(true);
  });

  it("the returning player is told what was played for them", () => {
    // Everyone ELSE watched the takeover announcement and the Auto badge. The
    // one person with no idea was the player it happened to — chat is not
    // replayed on rejoin, so they landed on a board that had moved without
    // them and nothing on screen explained why.
    const { rooms, code, direct } = seatThree();
    const alice = playerOf(rooms, code, "Alice");

    rooms.handleDisconnect("sockA");
    vi.advanceTimersByTime(30_000); // taken over, and several turns played
    const played = rollsFor(rooms, code, "Alice");
    expect(played).toBeGreaterThan(0);

    direct.length = 0;
    rooms.joinRoom("sockA2", "Alice", code, alice.id, mintSeatToken(code, alice.id));

    expect(
      direct.some((m) => m.playerId === "system" && /Welcome back .* played for you/i.test(m.text)),
    ).toBe(true);
  });

  it("a clean blip gets NO welcome-back note — there is nothing to report", () => {
    const { rooms, code, direct } = seatThree();
    const bob = playerOf(rooms, code, "Bob");

    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(3_000); // back inside the blip window
    direct.length = 0;
    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));

    expect(direct.some((m) => /Welcome back/i.test(m.text))).toBe(false);
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
      rooms.applyMove("sockA", "roll", {});
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
    rooms.joinRoom("sock_back", returning.name, code, returning.id, mintSeatToken(code, returning.id));

    const before = totalRolls(rooms, code);
    vi.advanceTimersByTime(60_000);
    expect(totalRolls(rooms, code)).toBeGreaterThan(before);
  });

  /* ── Idle takeover ────────────────────────────────────────────────────
     A dropped socket is the obvious failure; the common one is someone still
     connected who has simply stopped playing. Their turns cost the table the
     full timer, every lap, and nothing about the disconnect path helps. */

  it("a connected player who lets consecutive turns lapse is taken over", () => {
    const { rooms, code } = seatThree();
    const alice = playerOf(rooms, code, "Alice");
    expect(peek(rooms, code).engine.getPublicState().turnPlayerId).toBe(alice.id);

    // One lapse is a distraction and must still cost only that turn.
    vi.advanceTimersByTime(21_000); // Ludo turn timer is 20s
    expect(alice.isAutoPlaying).not.toBe(true);

    // Round the table until it is her turn again, and let that one lapse
    // too. Small steps, stopping the instant she goes auto — a single large
    // advance risks running past AUTO_PLAY_TURN_CAP and quitting her before
    // this test's own assertion (that she IS taken over) gets to run.
    for (let i = 0; i < 400 && !alice.isAutoPlaying; i++) {
      vi.advanceTimersByTime(250);
    }
    expect(alice.isAutoPlaying).toBe(true);
    expect(alice.autoPlayReason).toBe("idle");
    expect(alice.isConnected).toBe(true); // still connected — that is the point
  });

  it("BOTH takeover kinds actually reach the clients", () => {
    // Regression: the idle path set the flag and announced it in chat but
    // never re-broadcast the roster, so the seat looked untouched on every
    // screen while its moves happened by themselves. The unit tests above all
    // read server-side state and sailed straight past it.
    {
      const { rooms, code, broadcasts } = seatThree();
      rooms.handleDisconnect("sockB");
      vi.advanceTimersByTime(11_000);
      expect(asBroadcast(broadcasts, "Bob")?.isAutoPlaying).toBe(true);
      expect(asBroadcast(broadcasts, "Bob")?.autoPlayReason).toBe("disconnected");
      void code;
    }
    {
      const { rooms, code, broadcasts } = seatThree();
      const idle = playerOf(rooms, code, "Alice");
      // Small steps, stopping the instant she goes auto — see the identical
      // reasoning a few tests up (AUTO_PLAY_TURN_CAP).
      for (let i = 0; i < 400 && !idle.isAutoPlaying; i++) {
        vi.advanceTimersByTime(250);
      }
      expect(idle.isAutoPlaying).toBe(true); // server agrees…
      expect(asBroadcast(broadcasts, "Alice")?.isAutoPlaying).toBe(true); // …and so do the clients
      expect(asBroadcast(broadcasts, "Alice")?.autoPlayReason).toBe("idle");
    }
  });

  it("making any move reclaims an idle seat instantly", () => {
    const { rooms, code, chat } = seatThree();
    const alice = playerOf(rooms, code, "Alice");

    // Small steps, stopping the instant she goes auto — see the identical
    // reasoning a few tests up (AUTO_PLAY_TURN_CAP).
    for (let i = 0; i < 400 && !alice.isAutoPlaying; i++) {
      vi.advanceTimersByTime(250);
    }
    expect(alice.isAutoPlaying).toBe(true);

    /**
     * No "I'm back" button to find — you just play. But the move has to be
     * one the engine will ACCEPT: a rejected move never reaches noteActivity,
     * and the test would be asserting on nothing.
     *
     * So wait for her turn AND the rolling phase. Holding the turn is not
     * enough — a Ludo turn is roll-then-move, and landing between the two
     * sub-moves of her own auto-play makes "roll" illegal. That is precisely
     * how this test flaked before.
     */
    let ready = false;
    for (let i = 0; i < 400; i++) {
      const st = peek(rooms, code).engine.getPublicState();
      if (st.turnPlayerId === alice.id && st.turnPhase === "rolling") {
        ready = true;
        break;
      }
      vi.advanceTimersByTime(250);
    }
    expect(ready).toBe(true);
    rooms.applyMove("sockA", "roll", undefined);

    expect(alice.isAutoPlaying).toBe(false);
    expect(alice.autoPlayReason).toBeUndefined();
    expect(chat.some((m) => m.playerId === "system" && /Alice is back/i.test(m.text))).toBe(true);
  });

  it("an idle seat is reclaimed WITHOUT needing a legal move", () => {
    /**
     * The reported bug, and the sharpest edge in this whole feature.
     *
     * A returning player has almost no way to prove it. On someone else's
     * turn the client will not even emit — the roll button is gated on
     * `canRoll` — so clicking the dice reaches nobody. And when their own
     * turn finally arrives the auto-player resolves it within a few hundred
     * milliseconds, which no human re-reading the board can beat. Requiring
     * an ACCEPTED move to clear the flag therefore left no reachable exit:
     * the seat stayed on autopilot for the rest of the match.
     *
     * Any sign of life has to be enough.
     */
    const { rooms, code, chat } = seatThree();
    const alice = playerOf(rooms, code, "Alice");

    // Advance in small steps and stop the INSTANT she goes auto — this test
    // is about the reclaim, not about how long she stays auto for. A single
    // large advance (the old 120_000ms) risks running past
    // AUTO_PLAY_TURN_CAP's own turn allowance and having her force-quit
    // before the reclaim this test exists to check ever gets a chance to
    // run — a different feature entirely.
    for (let i = 0; i < 400 && !alice.isAutoPlaying; i++) {
      vi.advanceTimersByTime(250);
    }
    expect(alice.isAutoPlaying).toBe(true);

    // Not a move — just proof somebody is at the keyboard. Deliberately NOT
    // waiting for her turn, because that is exactly the state she is stuck in.
    rooms.noteSocketActivity("sockA");

    expect(alice.isAutoPlaying).toBe(false);
    expect(alice.autoPlayReason).toBeUndefined();
    expect(chat.some((m) => /Alice is back/i.test(m.text))).toBe(true);
  });

  it("an out-of-turn move ATTEMPT also counts as being back", () => {
    // The engine rejects it, but a rejected move is still a person pressing
    // a button — and the old code returned early before noticing.
    const { rooms, code } = seatThree();
    const bob = playerOf(rooms, code, "Bob");

    // Same reasoning as the test above — stop advancing the instant he goes
    // auto, so AUTO_PLAY_TURN_CAP doesn't quit him before this test's own
    // reclaim assertion gets to run.
    for (let i = 0; i < 400 && !bob.isAutoPlaying; i++) {
      vi.advanceTimersByTime(250);
    }
    expect(bob.isAutoPlaying).toBe(true);

    rooms.noteSocketActivity("sockB");
    expect(bob.isAutoPlaying).toBe(false);
  });

  it("the two reasons are distinguished, because different things end them", () => {
    const { rooms, code } = seatThree();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(11_000);
    expect(bob.autoPlayReason).toBe("disconnected");
    // A disconnected seat must NOT be cleared by move activity — only a
    // reconnect does that; a move for a socket-less seat would mean something
    // else has gone wrong.
    rooms.applyMove("sockB", "roll", undefined);
    expect(bob.isAutoPlaying).toBe(true);
  });

  it("Bingo: a dropped player's board is locked for them, a present one's is not", async () => {
    /*
     * This replaces a test that could never pass. It assumed a 500ms
     * auto-caller draining all 75 numbers inside 70 seconds, but Bingo is
     * turn-based: players call numbers on their turn behind a 15s timer. The
     * round it was waiting for never happened, so BOTH its assertions were
     * meaningless — the "nobody is claimed for" half passed only because the
     * game had not started.
     *
     * Chasing that failure turned up the real defect it was masking: the
     * arranging phase had no deadline at all, so one player who never locked
     * their board held the table forever. That is covered below.
     */
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom(
      "s0", "Alice", "bingo",
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      { callIntervalMs: 500, stopOnFirstWin: true },
    );
    rooms.joinRoom("s1", "Bob", code);
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);
    rooms.startGame("s0");

    const engine = peek(rooms, code).engine as unknown as { pendingActors(): string[] };
    const alice = playerOf(rooms, code, "Alice").id;
    const bob = playerOf(rooms, code, "Bob").id;

    // Nobody has locked yet, so both seats are outstanding.
    expect(engine.pendingActors().sort()).toEqual([alice, bob].sort());

    rooms.handleDisconnect("s1");
    // Past the 10s takeover grace, inside the 45s arranging window.
    await vi.advanceTimersByTimeAsync(20_000);

    // Bob's seat was locked for him because he is gone...
    expect(engine.pendingActors()).not.toContain(bob);
    // ...and Alice's was not, because she is sitting right there.
    expect(engine.pendingActors()).toContain(alice);
  });

  it("Bingo: an unattended board is locked once the shared window expires", async () => {
    // The defect the broken test was hiding. Bingo seats eight, so one person
    // who opened the tab and wandered off used to block seven others with no
    // timeout, no takeover, and nothing on screen explaining the wait.
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom(
      "s0", "Alice", "bingo",
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      { callIntervalMs: 500, stopOnFirstWin: true },
    );
    rooms.joinRoom("s1", "Bob", code);
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);
    rooms.startGame("s0");

    const engine = peek(rooms, code).engine as unknown as {
      pendingActors(): string[];
      getPublicState(): { phase?: string };
    };

    // Both players present, neither locks. Nothing should force them early.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(engine.getPublicState().phase).toBe("arranging");

    // Past the 45s window the server locks whatever is left and starts.
    await vi.advanceTimersByTimeAsync(20_000);
    expect(engine.getPublicState().phase).toBe("playing");
    expect(engine.pendingActors()).not.toHaveLength(0);
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

  describe("Blocker 05 — disconnect grace vs idle auto-resolution race", () => {
    it("Test A: does not accumulate idle strikes or promote a surviving idle participant during another participant's disconnect-grace window", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "ludo");
      rooms.joinRoom("sockB", "Bob", code);
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const bob = playerOf(rooms, code, "Bob");

      // Alice disconnects during active match
      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Advance past takeover grace (10s) so Alice gets disconnect takeover
      vi.advanceTimersByTime(11_000);
      expect(alice.isAutoPlaying).toBe(true);
      expect(alice.autoPlayReason).toBe("disconnected");

      // Advance time through multiple turn timeouts for Bob (e.g. 5 timeouts = 155s)
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(31_000);
      }

      // Assert Bob did NOT accumulate any idle strikes during Alice's disconnect-grace window
      const room = peek(rooms, code);
      expect(room.idleStrikes.get(bob.id)).toBeUndefined();
      expect(bob.isConnected).toBe(true);
      expect(bob.isAutoPlaying).not.toBe(true);
      expect(bob.autoPlayReason).toBeUndefined();
    });

    it("Test B: requires a full fresh sequence of idle strikes after a disconnected participant reconnects", () => {
      // Ludo, with dice pinned to the repository's own established pattern
      // (see ludo/__tests__/reconnect.test.ts: `setRng(() => 0.99)`, always
      // a six). A FIXED rng value makes every bonus-turn chain the same
      // deterministic length on every run — the earlier failures (11/50
      // isolated) came from leaving Math.random() uncontrolled, which let
      // Alice's auto-played turns during grace consume a variable number of
      // sub-cycles and shift whose turn each fixed 31s advance landed on.
      //
      // Even with dice pinned, this is still a turn-based game — Bob's
      // OWN idle-strike opportunities only occur on cycles where it is
      // genuinely his turn, alternating with Alice's. So this test drives
      // forward on public state (turnPlayerId), never assuming a fixed
      // number of cycles lands on him.
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "ludo");
      const aliceToken = mintSeatToken(code, playerOf(rooms, code, "Alice").id);
      rooms.joinRoom("sockB", "Bob", code);
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const bob = playerOf(rooms, code, "Bob");
      const room = peek(rooms, code);
      (room.engine as unknown as LudoEngine).setRng(() => 0.99);

      // Alice disconnects during active match
      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Advance past takeover grace (10s)
      vi.advanceTimersByTime(11_000);
      expect(alice.isAutoPlaying).toBe(true);

      // Bob times out 3 times while Alice is disconnected. Turn parity does
      // not matter here: canApplyTimeoutMove(bob) is false for as long as
      // Alice's grace is active, regardless of whose turn it nominally is,
      // so his turn never resolves and never advances during this window.
      vi.advanceTimersByTime(31_000);
      vi.advanceTimersByTime(31_000);
      vi.advanceTimersByTime(31_000);

      // Verify no strikes accumulated during grace
      expect(room.idleStrikes.get(bob.id)).toBeUndefined();
      expect(bob.isAutoPlaying).not.toBe(true);

      // Alice reconnects within grace period
      const reclaim = rooms.joinRoom("sockA2", "Alice", code, alice.id, aliceToken);
      expect(reclaim.ok).toBe(true);
      expect(alice.isConnected).toBe(true);
      expect(alice.isAutoPlaying).toBe(false);

      // Grace is now clear, so both seats are ordinary idle players again:
      // whoever's turn it is auto-resolves on their own timeout, exactly
      // like any idle player with no disconnect involved. Drive forward
      // deterministically until public state confirms it is genuinely
      // Bob's turn before asserting anything about his strike count.
      const MAX_DRIVE_CYCLES = 12;
      const driveUntilBobsTurn = () => {
        let cycles = 0;
        while (room.engine.getPublicState().turnPlayerId !== bob.id) {
          vi.advanceTimersByTime(31_000);
          cycles += 1;
          if (cycles > MAX_DRIVE_CYCLES) {
            throw new Error("turn did not reach Bob within the expected number of cycles");
          }
        }
      };

      driveUntilBobsTurn();

      // Bob's first genuine post-reconnect timeout opportunity: strike 1,
      // not yet promoted. This same timeout also resolves his turn (he is
      // an ordinary eligible idle player now), advancing play onward.
      vi.advanceTimersByTime(31_000);
      expect(room.idleStrikes.get(bob.id)).toBe(1);
      expect(bob.isAutoPlaying).not.toBe(true);
      expect(bob.autoPlayReason).toBeUndefined();

      // Drive forward again until play genuinely returns to Bob before
      // triggering his second opportunity.
      driveUntilBobsTurn();

      // Bob's second genuine post-reconnect timeout: strike 2, promoted to
      // idle auto-play.
      vi.advanceTimersByTime(31_000);
      expect(room.idleStrikes.get(bob.id)).toBe(2);
      expect(bob.isAutoPlaying).toBe(true);
      expect(bob.autoPlayReason).toBe("idle");
    });

    it("Test C: suppresses timeout-generated automatic moves for a connected idle survivor during RPS disconnect grace", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "rps");
      rooms.joinRoom("sockB", "Bob", code);
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const bob = playerOf(rooms, code, "Bob");

      // Alice disconnects during active match
      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Advance past takeover grace (10s)
      vi.advanceTimersByTime(11_000);
      expect(alice.isAutoPlaying).toBe(true);

      // Advance 10 full 30s round timeouts (300s total)
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(31_000);
      }

      // Assert Bob received NO auto-moves and match is still active (0 rounds completed)
      const room = peek(rooms, code);
      expect(room.phase).toBe("playing");
      const scores = room.engine.getPublicState().scores;
      expect(scores?.[alice.id] ?? 0).toBe(0);
      expect(scores?.[bob.id] ?? 0).toBe(0);
      expect(bob.isConnected).toBe(true);
      expect(bob.isAutoPlaying).not.toBe(true);

      // Advance past 600s total (MATCH_GRACE_PERIOD_MS) -> Alice's grace expires -> Alice dropped -> Bob wins by walkover/forfeit
      vi.advanceTimersByTime(300_000);
      expect(room.phase).toBe("finished");
    });

    it("Test D: suppresses timeout-generated automatic moves for a connected idle guest during Ludo disconnect grace with a bot present", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "ludo");
      rooms.joinRoom("sockB", "Basil", code);
      rooms.addBot("sockA", "Botty");
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const basil = playerOf(rooms, code, "Basil");
      const bot = playerOf(rooms, code, "Botty");

      // Alice disconnects during active match
      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Advance past takeover grace (10s)
      vi.advanceTimersByTime(11_000);
      expect(alice.isAutoPlaying).toBe(true);

      // Advance multiple turns (e.g. 10 * 31s = 310s)
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(31_000);
      }

      // Assert Basil's seat was not auto-moved into an incidental victory
      const room = peek(rooms, code);
      expect(room.phase).toBe("playing");
      expect(basil.isConnected).toBe(true);
      expect(basil.isAutoPlaying).not.toBe(true);

      // Advance past 600s total -> Alice's grace expires -> Alice is dropped from the room
      vi.advanceTimersByTime(300_000);
      expect(room.players.has(alice.id)).toBe(false);
    });

    it("Test E: preserves explicitly submitted valid moves and state progression by an active connected survivor", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "rps");
      rooms.joinRoom("sockB", "Bob", code);
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const bob = playerOf(rooms, code, "Bob");

      // Alice disconnects during active match
      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Advance past takeover grace (10s) so Alice auto-plays
      vi.advanceTimersByTime(11_000);
      expect(alice.isAutoPlaying).toBe(true);

      // Bob explicitly submits a real valid move
      rooms.applyMove("sockB", "choose", { choice: "rock" });
      vi.advanceTimersByTime(2_000);

      // Verify that Bob is connected, not auto-playing, and his move was accepted
      expect(bob.isConnected).toBe(true);
      expect(bob.isAutoPlaying).not.toBe(true);
      const room = peek(rooms, code);
      const state = room.engine.getPublicState();
      expect((state.history ?? []).length).toBeGreaterThan(0);
    });

    it("Test F: Star Game — suppresses timeout-generated participant action for connected idle survivor during disconnect grace", async () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "stargame");
      rooms.joinRoom("sockB", "Bob", code);
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const bob = playerOf(rooms, code, "Bob");
      const room = peek(rooms, code);

      expect(room.engine.getPublicState().phase).toBe("themeSelect");

      // Alice disconnects during themeSelect
      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Advance past 30s themeSelect deadline (31s total)
      await vi.advanceTimersByTimeAsync(31_000);

      // Assert Bob did NOT receive a generated theme value and phase is still themeSelect
      const pubState = room.engine.getPublicState();
      expect(pubState.phase).toBe("themeSelect");
      const bobPub = pubState.players?.find((p) => p.id === bob.id);
      expect(bobPub?.hasSelected).toBe(false);
      expect(bob.isConnected).toBe(true);
      expect(bob.isAutoPlaying).not.toBe(true);

      // Advance another 30s — verify no 0ms timer explosion and phase remains themeSelect
      await vi.advanceTimersByTimeAsync(30_000);
      expect(room.engine.getPublicState().phase).toBe("themeSelect");

      // Advance to 600s -> Alice's grace expires -> Alice dropped -> game completes
      await vi.advanceTimersByTimeAsync(540_000);
      expect(room.phase).toBe("finished");
    });

    it("Test G: Star Game — normal deadline auto-action and post-reconnect behavior", async () => {
      // Control 1: No disconnect grace -> normal timeout auto-selects and advances
      {
        const { io } = makeIo();
        const rooms = new RoomManager(io);
        const { code } = rooms.createRoom("sockA", "Alice", "stargame");
        rooms.joinRoom("sockB", "Bob", code);
        rooms.setReady("sockA", true);
        rooms.setReady("sockB", true);
        rooms.startGame("sockA");

        const room = peek(rooms, code);
        expect(room.engine.getPublicState().phase).toBe("themeSelect");

        await vi.advanceTimersByTimeAsync(31_000);
        // Phase should advance to shuffle once all players receive values
        expect(room.engine.getPublicState().phase).not.toBe("themeSelect");
      }

      // Control 2: Disconnect -> protected during grace -> reconnect -> normal auto-select resumes
      {
        const { io } = makeIo();
        const rooms = new RoomManager(io);
        const { code } = rooms.createRoom("sockA", "Alice", "stargame");
        const alice = playerOf(rooms, code, "Alice");
        const aliceToken = mintSeatToken(code, alice.id);
        rooms.joinRoom("sockB", "Bob", code);
        rooms.setReady("sockA", true);
        rooms.setReady("sockB", true);
        rooms.startGame("sockA");

        const room = peek(rooms, code);
        rooms.handleDisconnect("sockA");

        // Protected during grace
        await vi.advanceTimersByTimeAsync(31_000);
        expect(room.engine.getPublicState().phase).toBe("themeSelect");

        // Alice reconnects
        const reclaim = rooms.joinRoom("sockA_re", "Alice", code, alice.id, aliceToken);
        expect(reclaim.ok).toBe(true);
        expect(playerOf(rooms, code, "Alice").isConnected).toBe(true);

        // Next deadline timeout now auto-selects and advances
        await vi.advanceTimersByTimeAsync(31_000);
        expect(room.engine.getPublicState().phase).not.toBe("themeSelect");
      }
    });

    it("Test H: Name Place Animal — suppresses blank auto-submission for connected idle survivor during disconnect grace", async () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "namesplaceanimal");
      rooms.joinRoom("sockB", "Bob", code);
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const bob = playerOf(rooms, code, "Bob");
      const room = peek(rooms, code);

      expect(room.engine.getPublicState().phase).toBe("playing");

      // Alice disconnects during playing phase
      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Advance past 30s round deadline (31s total)
      await vi.advanceTimersByTimeAsync(31_000);

      // Assert Bob did NOT receive a blank auto-submission and round has not transitioned to roundSummary
      const pubState = room.engine.getPublicState();
      expect(pubState.phase).toBe("playing");
      const bobPub = pubState.players?.find((p) => p.id === bob.id);
      expect(bobPub?.hasSubmitted).toBe(false);
      expect(bob.isConnected).toBe(true);
      expect(bob.isAutoPlaying).not.toBe(true);

      // Advance another 30s — verify no 0ms loop and phase remains playing
      await vi.advanceTimersByTimeAsync(30_000);
      expect(room.engine.getPublicState().phase).toBe("playing");

      // Advance to 600s -> Alice's grace expires -> Alice dropped -> game completes
      await vi.advanceTimersByTimeAsync(540_000);
      expect(room.phase).toBe("finished");
    });

    it("Test I: Name Place Animal — normal deadline auto-submission and post-reconnect behavior", async () => {
      // Control 1: No disconnect grace -> normal timeout auto-submits and transitions to roundSummary
      {
        const { io } = makeIo();
        const rooms = new RoomManager(io);
        const { code } = rooms.createRoom("sockA", "Alice", "namesplaceanimal");
        rooms.joinRoom("sockB", "Bob", code);
        rooms.setReady("sockA", true);
        rooms.setReady("sockB", true);
        rooms.startGame("sockA");

        const room = peek(rooms, code);
        expect(room.engine.getPublicState().phase).toBe("playing");

        await vi.advanceTimersByTimeAsync(31_000);
        expect(room.engine.getPublicState().phase).toBe("roundSummary");
      }

      // Control 2: Disconnect -> protected during grace -> reconnect -> normal auto-submission resumes
      {
        const { io } = makeIo();
        const rooms = new RoomManager(io);
        const { code } = rooms.createRoom("sockA", "Alice", "namesplaceanimal");
        const alice = playerOf(rooms, code, "Alice");
        const aliceToken = mintSeatToken(code, alice.id);
        rooms.joinRoom("sockB", "Bob", code);
        rooms.setReady("sockA", true);
        rooms.setReady("sockB", true);
        rooms.startGame("sockA");

        const room = peek(rooms, code);
        rooms.handleDisconnect("sockA");

        // Protected during grace
        await vi.advanceTimersByTimeAsync(31_000);
        expect(room.engine.getPublicState().phase).toBe("playing");

        // Alice reconnects
        const reclaim = rooms.joinRoom("sockA_re", "Alice", code, alice.id, aliceToken);
        expect(reclaim.ok).toBe(true);
        expect(playerOf(rooms, code, "Alice").isConnected).toBe(true);

        // Next deadline timeout now auto-submits and transitions to roundSummary
        await vi.advanceTimersByTimeAsync(31_000);
        expect(room.engine.getPublicState().phase).toBe("roundSummary");
      }
    });

    it("Test J: Name Place Animal — accepts real answer submission from survivor during disconnect grace", async () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const { code } = rooms.createRoom("sockA", "Alice", "namesplaceanimal");
      rooms.joinRoom("sockB", "Bob", code);
      rooms.setReady("sockA", true);
      rooms.setReady("sockB", true);
      rooms.startGame("sockA");

      const alice = playerOf(rooms, code, "Alice");
      const bob = playerOf(rooms, code, "Bob");
      const room = peek(rooms, code);

      rooms.handleDisconnect("sockA");
      expect(alice.isConnected).toBe(false);

      // Bob explicitly submits real answers
      rooms.applyMove("sockB", "submitAnswers", {
        name: "Alice",
        place: "America",
        animal: "Ant",
        thing: "Apple",
      });

      const pubState = room.engine.getPublicState();
      const bobPub = pubState.players?.find((p) => p.id === bob.id);
      expect(bobPub?.hasSubmitted).toBe(true);
      expect(bob.isConnected).toBe(true);
      expect(bob.isAutoPlaying).not.toBe(true);
    });
  });
});
