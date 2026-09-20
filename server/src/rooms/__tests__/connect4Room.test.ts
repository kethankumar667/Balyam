import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { profileService } from "../../profile/ProfileService.js";
import { scorecardService } from "../../profile/ScorecardService.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import { CONNECT4_FIRST_TURN_GRACE_MS, scoreConnect4Win } from "../../games/connect4/Connect4Engine.js";
import { findFullBoardSequence } from "../../games/connect4/__tests__/connect4TestUtils.js";
import {
  CONNECT4_MAX_TURN_SECONDS,
  CONNECT4_MIN_TURN_SECONDS,
  DEFAULT_CONNECT4_OPTIONS,
  type ClientToServerEvents,
  type Connect4Options,
  type Connect4PublicState,
  type ServerToClientEvents,
} from "@shared/types.js";

/**
 * Room-level behaviour of Connect 4: everything the engine tests cannot see because it lives in
 * RoomManager — profile/XP and scorecard recording, option handling on the create-room path, the
 * turn timer and its timeout fallback, rematch seating, Pass & Play and bot seats.
 */

function makeIo() {
  return {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}

// socketId, name, game, then 17 per-game option slots (ludo ... ticTacToe), then connect4Options.
const OPTION_SLOTS_BEFORE_CONNECT4 = 17;
const CONNECT4_OPTIONS_ARG_INDEX = 3 + OPTION_SLOTS_BEFORE_CONNECT4;
const TICTACTOE_OPTIONS_ARG_INDEX = CONNECT4_OPTIONS_ARG_INDEX - 1;

type AnyRoom = { phase: string; engine: { getPublicState(): Connect4PublicState; isOver(): boolean }; players: Map<string, any>; turnTimer: unknown };
const peek = (rm: RoomManager, code: string): AnyRoom => (rm as unknown as { rooms: Map<string, AnyRoom> }).rooms.get(code)!;

function createC4(rm: RoomManager, opts: unknown, socket = "sA", name = "Alice") {
  const args: unknown[] = [socket, name, "connect4", ...Array(OPTION_SLOTS_BEFORE_CONNECT4).fill(undefined), opts];
  expect(args[CONNECT4_OPTIONS_ARG_INDEX]).toBe(opts);
  return rm.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

function startTwoPlayer(rm: RoomManager, opts: Partial<Connect4Options> | unknown = {}) {
  const created = createC4(rm, opts);
  const joined = rm.joinRoom("sB", "Bob", created.code);
  expect(joined.ok).toBe(true);
  rm.setReady("sA", true);
  rm.setReady("sB", true);
  rm.startGame("sA");
  const room = peek(rm, created.code);
  return { code: created.code, aliceId: created.playerId, bobId: (joined as { playerId: string }).playerId, room };
}

const state = (room: AnyRoom) => room.engine.getPublicState();

// Alice (sA, moves first) and Bob (sB) alternate. Each sequence is hand-checked.
const ALICE_WINS_IN_4 = [0, 0, 1, 1, 2, 2, 3]; // Alice: bottom row c0..c3 (her 4th disc)
const BOB_WINS = [5, 0, 6, 0, 5, 0, 6, 0]; // Bob: column 0, four high

async function play(rm: RoomManager, columns: readonly number[]) {
  for (let i = 0; i < columns.length; i++) {
    await rm.applyMove(i % 2 === 0 ? "sA" : "sB", "drop", { column: columns[i] });
  }
}

describe("Connect 4 through RoomManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("results", () => {
    it("records a DRAW as a draw (not a loss) for both players", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId, room } = startTwoPlayer(rm);
      await play(rm, findFullBoardSequence("draw")!);
      expect(room.phase).toBe("finished");
      for (const id of [aliceId, bobId]) {
        const stats = profileService.getStats(id);
        expect(stats.draws).toBe(1);
        expect(stats.losses).toBe(0);
      }
    });

    it("records a win and a loss with the normal XP", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId } = startTwoPlayer(rm);
      await play(rm, ALICE_WINS_IN_4);
      expect(profileService.getStats(aliceId).wins).toBe(1);
      expect(profileService.getStats(bobId).losses).toBe(1);
      expect(profileService.getProfile(aliceId)?.experiencePoints).toBe(50);
      expect(profileService.getProfile(bobId)?.experiencePoints).toBe(15);
    });

    it("scores a human-vs-human win by efficiency: four discs is the best possible score", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId } = startTwoPlayer(rm);
      await play(rm, ALICE_WINS_IN_4);
      const card = scorecardService.getScorecards(aliceId).games["connect4"]?.modes["classic"];
      expect(card?.bestScore).toBe(scoreConnect4Win(4));
      expect(card?.bestScore).toBe(18);
    });

    it("scores the second seat's win from ITS OWN disc count", async () => {
      const rm = new RoomManager(makeIo());
      const { bobId } = startTwoPlayer(rm);
      await play(rm, BOB_WINS);
      const card = scorecardService.getScorecards(bobId).games["connect4"]?.modes["classic"];
      expect(card?.bestScore).toBe(scoreConnect4Win(4));
    });

    it("does not touch the scorecard for a loss, a draw or a walkover — no phantom 'personal best'", async () => {
      const rm = new RoomManager(makeIo());
      const { bobId } = startTwoPlayer(rm);
      await play(rm, ALICE_WINS_IN_4);
      expect(scorecardService.getScorecards(bobId).games["connect4"]).toBeUndefined();

      const rm2 = new RoomManager(makeIo());
      const drawn = startTwoPlayer(rm2);
      await play(rm2, findFullBoardSequence("draw")!);
      expect(scorecardService.getScorecards(drawn.aliceId).games["connect4"]).toBeUndefined();
      expect(scorecardService.getScorecards(drawn.bobId).games["connect4"]).toBeUndefined();
    });

    it("gives the leaver's opponent the win when someone leaves mid-match, without minting a score", async () => {
      const rm = new RoomManager(makeIo());
      const { bobId, room } = startTwoPlayer(rm);
      await rm.applyMove("sA", "drop", { column: 3 });
      await rm.leaveRoom("sA");
      expect(room.phase).toBe("finished");
      expect(state(room).endReason).toBe("forfeit");
      expect(profileService.getStats(bobId).wins).toBe(1);
      expect(scorecardService.getScorecards(bobId).games["connect4"]).toBeUndefined();
    });

    it("mints no score when a BOT seat is at the table (bot games are practice)", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId, room } = startTwoPlayer(rm);
      room.players.get(bobId)!.isBot = true; // Bob is now a bot seat; timers are faked, so it never auto-plays
      await play(rm, ALICE_WINS_IN_4);
      expect(room.phase).toBe("finished");
      expect(scorecardService.getScorecards(aliceId).games["connect4"]).toBeUndefined();
    });
  });

  describe("untrusted options on the create-room path", () => {
    it("takes the room's options from ITS OWN slot, not a neighbour's (positional-argument guard)", () => {
      const rm = new RoomManager(makeIo());
      const args: unknown[] = ["sA", "Alice", "connect4", ...Array(OPTION_SLOTS_BEFORE_CONNECT4).fill(undefined)];
      args[TICTACTOE_OPTIONS_ARG_INDEX] = { turnTimerSeconds: 99, mode: "classic" }; // the slot just before
      args[CONNECT4_OPTIONS_ARG_INDEX] = { turnTimerSeconds: 44 };
      const created = rm.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
      rm.joinRoom("sB", "Bob", created.code);
      rm.setReady("sA", true);
      rm.setReady("sB", true);
      rm.startGame("sA");
      expect(state(peek(rm, created.code)).options.turnTimerSeconds).toBe(44);
    });

    it("uses the defaults when the client sends nothing", () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, undefined);
      expect(state(room).options).toEqual(DEFAULT_CONNECT4_OPTIONS);
    });

    it("enforces the timer floor so a 1 ms timer cannot make the table play itself", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: 0.001 });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(state(room).moveCount).toBe(0);
      expect(state(room).options.turnTimerSeconds).toBe(CONNECT4_MIN_TURN_SECONDS);
    });

    it("caps an overflow-sized timer instead of letting Node clamp it to 1 ms", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: 1e13 });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(state(room).moveCount).toBe(0);
      expect(state(room).options.turnTimerSeconds).toBe(CONNECT4_MAX_TURN_SECONDS);
    });

    it.each([0, -1, "off", null, Number.NaN])("cannot switch the clock off with %j: the default applies", (bad) => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: bad });
      expect(state(room).options.turnTimerSeconds).toBe(DEFAULT_CONNECT4_OPTIONS.turnTimerSeconds);
      expect(state(room).turnDeadline).not.toBeNull();
    });

    it("survives a non-object options payload and an unknown bot difficulty", () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, "member");
      expect(state(room).options).toEqual(DEFAULT_CONNECT4_OPTIONS);
      const rm2 = new RoomManager(makeIo());
      const second = startTwoPlayer(rm2, { botDifficulty: "impossible" });
      expect(state(second.room).options.botDifficulty).toBe(DEFAULT_CONNECT4_OPTIONS.botDifficulty);
    });
  });

  describe("turn clock", () => {
    it("first turn gets the start-ceremony grace; later turns get the plain window", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: 15 });
      expect((state(room).turnDeadline as number) - Date.now()).toBe(15_000 + CONNECT4_FIRST_TURN_GRACE_MS);
      await rm.applyMove("sA", "drop", { column: 3 });
      expect((state(room).turnDeadline as number) - Date.now()).toBe(15_000);
    });

    it("plays a modest fallback move for a player who lets the clock run out", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, room } = startTwoPlayer(rm, { turnTimerSeconds: 20 });
      await vi.advanceTimersByTimeAsync(20_000 + CONNECT4_FIRST_TURN_GRACE_MS + 1_000);
      const after = state(room);
      expect(after.moveCount).toBe(1);
      expect(after.lastMove).toMatchObject({ playerId: aliceId, col: 3 }); // the most central column
      expect(after.turnPlayerId).not.toBe(aliceId);
    });

    it("re-arms the clock when a timeout was withheld during the opponent's disconnect grace", async () => {
      const rm = new RoomManager(makeIo());
      const { code, bobId, room } = startTwoPlayer(rm, { turnTimerSeconds: 15 });
      const bobToken = mintSeatToken(code, bobId);
      rm.handleDisconnect("sB");
      await vi.advanceTimersByTimeAsync(25_000); // Alice's window (15 s + 4 s grace) lapses while Bob is away
      expect(state(room).moveCount).toBe(0); // withheld, by design

      // The clock must be live again, not sitting at zero with no timer behind it.
      expect((state(room).turnDeadline as number) - Date.now()).toBeGreaterThan(0);
      expect(room.turnTimer).not.toBeNull();

      expect(rm.joinRoom("sB2", "Bob", code, bobId, bobToken).ok).toBe(true);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(state(room).moveCount).toBeGreaterThan(0); // an idle player is eventually auto-played
    });
  });

  describe("rematch", () => {
    it("swaps who moves first (and gets red) and keeps the room's options", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId, room } = startTwoPlayer(rm, { turnTimerSeconds: 30 });
      expect(state(room).turnPlayerId).toBe(aliceId);
      await play(rm, ALICE_WINS_IN_4);

      rm.requestRematch("sA");
      rm.respondRematch("sB", "accept");
      await vi.advanceTimersByTimeAsync(10_000);

      expect(room.phase).toBe("playing");
      const second = state(room);
      expect(second.turnPlayerId).toBe(bobId);
      expect(second.playerDiscs[bobId]).toBe("R");
      expect(second.options.turnTimerSeconds).toBe(30); // options survive the rematch
      expect(second.moveCount).toBe(0);
      expect(second.grid.flat().every((cell) => cell === null)).toBe(true);
    });

    it("re-arms a fresh turn clock for the new match", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: 30 });
      await play(rm, ALICE_WINS_IN_4);
      rm.requestRematch("sA");
      rm.respondRematch("sB", "accept");
      await vi.advanceTimersByTimeAsync(10_000);
      const remaining = (state(room).turnDeadline as number) - Date.now();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30_000 + CONNECT4_FIRST_TURN_GRACE_MS);
    });
  });

  describe("Pass & Play", () => {
    it("lets the host seat a local player and play the local seat's turn", async () => {
      const rm = new RoomManager(makeIo());
      const created = createC4(rm, {});
      rm.addLocalPlayer("sA", "Local Bob");
      const room = peek(rm, created.code);
      expect(room.players.size).toBe(2);
      const localId = [...room.players.values()].find((p) => p.isLocal).id as string;

      rm.setReady("sA", true);
      rm.startGame("sA");
      expect(room.phase).toBe("playing");

      await rm.applyMove("sA", "drop", { column: 3 });
      await rm.applyMove("sA", "drop", { column: 4 }, localId);
      const now = state(room);
      expect(now.moveCount).toBe(2);
      expect(now.lastMove).toMatchObject({ playerId: localId, col: 4 });
    });

    it("does not mint a leaderboard score when one person plays both sides", async () => {
      const rm = new RoomManager(makeIo());
      const created = createC4(rm, {});
      rm.addLocalPlayer("sA", "Local Bob");
      const room = peek(rm, created.code);
      const localId = [...room.players.values()].find((p) => p.isLocal).id as string;
      rm.setReady("sA", true);
      rm.startGame("sA");

      // The host wins in four discs while the local seat never blocks.
      for (const [i, column] of ALICE_WINS_IN_4.entries()) {
        await rm.applyMove("sA", "drop", { column }, i % 2 === 1 ? localId : undefined);
      }
      expect(room.phase).toBe("finished");
      expect(scorecardService.getScorecards(created.playerId).games["connect4"]).toBeUndefined();
    });
  });

  describe("bot seats", () => {
    it("a bot answers the human's move on its own, using the room's difficulty", async () => {
      const rm = new RoomManager(makeIo());
      const created = createC4(rm, { botDifficulty: "pro" });
      rm.addBot("sA");
      rm.setReady("sA", true);
      rm.startGame("sA");
      const room = peek(rm, created.code);
      expect(state(room).options.botDifficulty).toBe("pro");

      await rm.applyMove("sA", "drop", { column: 3 });
      await vi.advanceTimersByTimeAsync(15_000);
      expect(state(room).moveCount).toBe(2);
      expect(state(room).turnPlayerId).toBe(created.playerId); // and it is the human's turn again
    });
  });
});
