import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { profileService } from "../../profile/ProfileService.js";
import { scorecardService } from "../../profile/ScorecardService.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import { VAMANA_FIRST_TURN_GRACE_MS, scoreVamanaWin } from "../../games/vamanaguntalu/VamanaEngine.js";
import { chooseFallbackPit } from "../../games/vamanaguntalu/vamanaAi.js";
import { findGame } from "../../games/vamanaguntalu/__tests__/vamanaTestUtils.js";
import {
  DEFAULT_VAMANA_OPTIONS,
  VAMANA_MAX_TURN_SECONDS,
  VAMANA_MIN_TURN_SECONDS,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type VamanaOptions,
  type VamanaPublicState,
} from "@shared/types.js";

/**
 * Room-level behaviour of Vamana Guntalu: everything the engine tests cannot see because it lives in
 * RoomManager — profile/XP and scorecard recording, option handling on the create-room path, the turn
 * timer and its timeout fallback, Pass & Play and bot seats.
 */

function makeIo() {
  return {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}

// socketId, name, game, then 18 per-game option slots (ludo ... connect4), then vamanaOptions.
const OPTION_SLOTS_BEFORE_VAMANA = 18;
const VAMANA_OPTIONS_ARG_INDEX = 3 + OPTION_SLOTS_BEFORE_VAMANA;
const CONNECT4_OPTIONS_ARG_INDEX = VAMANA_OPTIONS_ARG_INDEX - 1;

type AnyRoom = { phase: string; engine: { getPublicState(): VamanaPublicState; isOver(): boolean }; players: Map<string, any>; turnTimer: unknown };
const peek = (rm: RoomManager, code: string): AnyRoom => (rm as unknown as { rooms: Map<string, AnyRoom> }).rooms.get(code)!;

function createVamana(rm: RoomManager, opts: unknown, socket = "sA", name = "Alice") {
  const args: unknown[] = [socket, name, "vamanaguntalu", ...Array(OPTION_SLOTS_BEFORE_VAMANA).fill(undefined), opts];
  expect(args[VAMANA_OPTIONS_ARG_INDEX]).toBe(opts);
  const identityId = randomUUID();
  args[rm.createRoom.length - 3] = "member";
  args[rm.createRoom.length - 2] = identityId;
  return { ...rm.createRoom(...(args as Parameters<RoomManager["createRoom"]>)), identityId };
}

function startTwoPlayer(rm: RoomManager, opts: Partial<VamanaOptions> | unknown = {}) {
  const created = createVamana(rm, opts);
  const bobIdentityId = randomUUID();
  const joined = rm.joinRoom("sB", "Bob", created.code, undefined, undefined, undefined, "member", bobIdentityId);
  expect(joined.ok).toBe(true);
  rm.setReady("sA", true);
  rm.setReady("sB", true);
  rm.startGame("sA");
  const room = peek(rm, created.code);
  return { code: created.code, aliceId: created.playerId, bobId: (joined as { playerId: string }).playerId, aliceIdentityId: created.identityId, bobIdentityId, room };
}

const state = (room: AnyRoom) => room.engine.getPublicState();

const FIRST_WINS = findGame("first");
const SECOND_WINS = findGame("second");
const DRAW = findGame("draw");

async function play(rm: RoomManager, pits: readonly number[]) {
  for (let i = 0; i < pits.length; i++) {
    // A match that ends in milliseconds is (rightly) worth no XP; let it have lasted.
    if (i === pits.length - 1) vi.setSystemTime(Date.now() + 5 * 60_000);
    await rm.applyMove(i % 2 === 0 ? "sA" : "sB", "sow", { pit: pits[i] });
  }
}

describe("Vamana Guntalu through RoomManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("results", () => {
    it("records a DRAW as a draw (not a loss) for both players", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceIdentityId, bobIdentityId, room } = startTwoPlayer(rm);
      await play(rm, DRAW);
      expect(room.phase).toBe("finished");
      expect(state(room).isDraw).toBe(true);
      for (const id of [aliceIdentityId, bobIdentityId]) {
        const stats = profileService.getStats(id);
        expect(stats.draws).toBe(1);
        expect(stats.losses).toBe(0);
      }
    });

    it("records a win and a loss with the normal XP", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId, aliceIdentityId, bobIdentityId } = startTwoPlayer(rm);
      await play(rm, FIRST_WINS);
      expect(profileService.getStats(aliceIdentityId).wins).toBe(1);
      expect(profileService.getStats(bobIdentityId).losses).toBe(1);
      expect(profileService.getProfile(aliceIdentityId)?.experiencePoints).toBe(50);
      expect(profileService.getProfile(bobIdentityId)?.experiencePoints).toBe(15);
      expect(profileService.getStats(aliceId).totalMatches).toBe(0);
      expect(profileService.getStats(bobId).totalMatches).toBe(0);
    });

    it("scores a human-vs-human win by the seeds the winner finished with", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, aliceIdentityId, room } = startTwoPlayer(rm);
      await play(rm, FIRST_WINS);
      const seeds = state(room).captured[aliceId];
      const card = scorecardService.getScorecards(aliceIdentityId).games["vamanaguntalu"]?.modes["classic"];
      expect(card?.bestScore).toBe(scoreVamanaWin(seeds));
      expect(seeds).toBeGreaterThanOrEqual(36);
      expect(seeds).toBeLessThanOrEqual(70);
    });

    it("scores the second seat's win from ITS OWN seeds", async () => {
      const rm = new RoomManager(makeIo());
      const { bobId, bobIdentityId, room } = startTwoPlayer(rm);
      await play(rm, SECOND_WINS);
      const card = scorecardService.getScorecards(bobIdentityId).games["vamanaguntalu"]?.modes["classic"];
      expect(card?.bestScore).toBe(scoreVamanaWin(state(room).captured[bobId]));
    });

    it("does not touch the scorecard for a loss, a draw or a walkover — no phantom 'personal best'", async () => {
      const rm = new RoomManager(makeIo());
      const { bobIdentityId } = startTwoPlayer(rm);
      await play(rm, FIRST_WINS);
      expect(scorecardService.getScorecards(bobIdentityId).games["vamanaguntalu"]).toBeUndefined();

      const rm2 = new RoomManager(makeIo());
      const drawn = startTwoPlayer(rm2);
      await play(rm2, DRAW);
      expect(scorecardService.getScorecards(drawn.aliceIdentityId).games["vamanaguntalu"]).toBeUndefined();
      expect(scorecardService.getScorecards(drawn.bobIdentityId).games["vamanaguntalu"]).toBeUndefined();
    });

    it("gives the leaver's opponent the win when someone leaves mid-match, without minting a score", async () => {
      const rm = new RoomManager(makeIo());
      const { bobIdentityId, room } = startTwoPlayer(rm);
      await rm.applyMove("sA", "sow", { pit: 3 });
      await rm.leaveRoom("sA");
      expect(room.phase).toBe("finished");
      expect(state(room).endReason).toBe("forfeit");
      expect(profileService.getStats(bobIdentityId).wins).toBe(1);
      expect(scorecardService.getScorecards(bobIdentityId).games["vamanaguntalu"]).toBeUndefined();
    });

    it("mints no score when a BOT seat is at the table (bot games are practice)", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceIdentityId, bobId, room } = startTwoPlayer(rm);
      room.players.get(bobId)!.isBot = true; // Bob is now a bot seat; timers are faked, so it never auto-plays
      await play(rm, FIRST_WINS);
      expect(room.phase).toBe("finished");
      expect(scorecardService.getScorecards(aliceIdentityId).games["vamanaguntalu"]).toBeUndefined();
    });
  });

  describe("untrusted options on the create-room path", () => {
    it("takes the room's options from ITS OWN slot, not a neighbour's (positional-argument guard)", () => {
      const rm = new RoomManager(makeIo());
      const args: unknown[] = ["sA", "Alice", "vamanaguntalu", ...Array(OPTION_SLOTS_BEFORE_VAMANA).fill(undefined)];
      args[CONNECT4_OPTIONS_ARG_INDEX] = { turnTimerSeconds: 99, botDifficulty: "pro" }; // the slot just before
      args[VAMANA_OPTIONS_ARG_INDEX] = { turnTimerSeconds: 44 };
      const created = rm.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
      rm.joinRoom("sB", "Bob", created.code);
      rm.setReady("sA", true);
      rm.setReady("sB", true);
      rm.startGame("sA");
      const options = state(peek(rm, created.code)).options;
      expect(options.turnTimerSeconds).toBe(44);
      expect(options.botDifficulty).toBe(DEFAULT_VAMANA_OPTIONS.botDifficulty);
    });

    it("uses the defaults when the client sends nothing", () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, undefined);
      expect(state(room).options).toEqual(DEFAULT_VAMANA_OPTIONS);
    });

    it("enforces the timer floor so a 1 ms timer cannot make the table play itself", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: 0.001 });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(state(room).moveCount).toBe(0);
      expect(state(room).options.turnTimerSeconds).toBe(VAMANA_MIN_TURN_SECONDS);
    });

    it("caps an overflow-sized timer instead of letting Node clamp it to 1 ms", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: 1e13 });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(state(room).moveCount).toBe(0);
      expect(state(room).options.turnTimerSeconds).toBe(VAMANA_MAX_TURN_SECONDS);
    });

    it.each([0, -1, "off", null, Number.NaN])("cannot switch the clock off with %j: the default applies", (bad) => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: bad });
      expect(state(room).options.turnTimerSeconds).toBe(DEFAULT_VAMANA_OPTIONS.turnTimerSeconds);
      expect(state(room).turnDeadline).not.toBeNull();
    });

    it("survives a non-object options payload and an unknown bot difficulty", () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, "member");
      expect(state(room).options).toEqual(DEFAULT_VAMANA_OPTIONS);
      const rm2 = new RoomManager(makeIo());
      const second = startTwoPlayer(rm2, { botDifficulty: "impossible" });
      expect(state(second.room).options.botDifficulty).toBe(DEFAULT_VAMANA_OPTIONS.botDifficulty);
    });
  });

  describe("turn clock", () => {
    it("first turn gets the start-ceremony grace; later turns get the plain window", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { turnTimerSeconds: 15 });
      expect((state(room).turnDeadline as number) - Date.now()).toBe(15_000 + VAMANA_FIRST_TURN_GRACE_MS);
      await rm.applyMove("sA", "sow", { pit: 3 });
      expect((state(room).turnDeadline as number) - Date.now()).toBe(15_000);
    });

    it("plays a modest fallback move for a player who lets the clock run out", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, room } = startTwoPlayer(rm, { turnTimerSeconds: 20 });
      const expectedPit = chooseFallbackPit(state(room).pits, 0);
      await vi.advanceTimersByTimeAsync(20_000 + VAMANA_FIRST_TURN_GRACE_MS + 1_000);
      const after = state(room);
      expect(after.moveCount).toBe(1);
      expect(after.lastMove?.playerId).toBe(aliceId);
      expect(after.lastMove?.lifts[0].pit).toBe(expectedPit);
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

  describe("Pass & Play", () => {
    it("lets the host seat a local player and play the local seat's turn", async () => {
      const rm = new RoomManager(makeIo());
      const created = createVamana(rm, {});
      rm.addLocalPlayer("sA", "Local Bob");
      const room = peek(rm, created.code);
      expect(room.players.size).toBe(2);
      const localId = [...room.players.values()].find((p) => p.isLocal).id as string;

      rm.setReady("sA", true);
      rm.startGame("sA");
      expect(room.phase).toBe("playing");

      await rm.applyMove("sA", "sow", { pit: 3 });
      await rm.applyMove("sA", "sow", { pit: 9 }, localId);
      const now = state(room);
      expect(now.moveCount).toBe(2);
      expect(now.lastMove?.playerId).toBe(localId);
      expect(now.lastMove?.lifts[0].pit).toBe(9);
    });

    it("does not mint a leaderboard score when one person plays both sides", async () => {
      const rm = new RoomManager(makeIo());
      const created = createVamana(rm, {});
      rm.addLocalPlayer("sA", "Local Bob");
      const room = peek(rm, created.code);
      const localId = [...room.players.values()].find((p) => p.isLocal).id as string;
      rm.setReady("sA", true);
      rm.startGame("sA");

      for (const [i, pit] of FIRST_WINS.entries()) {
        await rm.applyMove("sA", "sow", { pit }, i % 2 === 1 ? localId : undefined);
      }
      expect(room.phase).toBe("finished");
      expect(scorecardService.getScorecards(created.identityId).games["vamanaguntalu"]).toBeUndefined();
    });
  });

  describe("bot seats", () => {
    it("a bot answers the human's move on its own, using the room's difficulty", async () => {
      const rm = new RoomManager(makeIo());
      const created = createVamana(rm, { botDifficulty: "pro" });
      rm.addBot("sA");
      rm.setReady("sA", true);
      rm.startGame("sA");
      const room = peek(rm, created.code);
      expect(state(room).options.botDifficulty).toBe("pro");

      await rm.applyMove("sA", "sow", { pit: 3 });
      await vi.advanceTimersByTimeAsync(15_000);
      expect(state(room).moveCount).toBe(2);
      expect(state(room).turnPlayerId).toBe(created.playerId); // and it is the human's turn again
    });
  });
});
