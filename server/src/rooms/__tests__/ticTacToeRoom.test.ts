import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { profileService } from "../../profile/ProfileService.js";
import { scorecardService } from "../../profile/ScorecardService.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import { TICTACTOE_FIRST_TURN_GRACE_MS } from "../../games/tictactoe/TicTacToeEngine.js";
import {
  TICTACTOE_MIN_TURN_SECONDS,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type TicTacToeOptions,
} from "@shared/types.js";

/**
 * Room-level behaviour of Tic Tac Toe: everything the engine tests cannot see
 * because it lives in RoomManager — profile/XP recording, option handling on
 * the create-room path, the turn timer, rematch seating and Pass & Play.
 */

function makeIo() {
  return {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}

const OPTIONS_ARG_INDEX = 19; // socketId, name, game, then 16 per-game option slots

function createTtt(rm: RoomManager, opts: unknown, socket = "sA", name = "Alice") {
  const args: unknown[] = [socket, name, "tictactoe", ...Array(16).fill(undefined), opts];
  expect(args[OPTIONS_ARG_INDEX]).toBe(opts);
  return rm.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

function startTwoPlayer(rm: RoomManager, opts: Partial<TicTacToeOptions> | unknown) {
  const created = createTtt(rm, opts);
  const joined = rm.joinRoom("sB", "Bob", created.code);
  expect(joined.ok).toBe(true);
  rm.setReady("sA", true);
  rm.setReady("sB", true);
  rm.startGame("sA");
  const room = (rm as unknown as { rooms: Map<string, any> }).rooms.get(created.code)!;
  return { code: created.code, aliceId: created.playerId, bobId: (joined as { playerId: string }).playerId, room };
}

const DRAW: [string, number][] = [
  ["sA", 0], ["sB", 1], ["sA", 2], ["sB", 4], ["sA", 3], ["sB", 5], ["sA", 7], ["sB", 6], ["sA", 8],
];
const ALICE_WINS_IN_3: [string, number][] = [["sA", 0], ["sB", 3], ["sA", 1], ["sB", 4], ["sA", 2]];

async function play(rm: RoomManager, moves: [string, number][]) {
  for (const [s, c] of moves) await rm.applyMove(s, "place", { cellIndex: c });
}

describe("Tic Tac Toe through RoomManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("results", () => {
    it("records a classic DRAW as a draw (not a loss) for both players", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId, room } = startTwoPlayer(rm, { mode: "classic", turnTimerSeconds: 0 });
      await play(rm, DRAW);
      expect(room.phase).toBe("finished");
      for (const id of [aliceId, bobId]) {
        const stats = profileService.getStats(id);
        expect(stats.draws).toBe(1);
        expect(stats.losses).toBe(0);
        expect(profileService.getProfile(id)?.experiencePoints).toBe(25);
      }
    });

    it("records a win and a loss with the normal XP", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId } = startTwoPlayer(rm, { mode: "quantum", turnTimerSeconds: 0 });
      await play(rm, ALICE_WINS_IN_3);
      expect(profileService.getStats(aliceId).wins).toBe(1);
      expect(profileService.getStats(bobId).losses).toBe(1);
      expect(profileService.getProfile(aliceId)?.experiencePoints).toBe(50);
      expect(profileService.getProfile(bobId)?.experiencePoints).toBe(15);
    });

    it("scores a win by efficiency: a 3-move win is the best possible score", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId } = startTwoPlayer(rm, { mode: "quantum", turnTimerSeconds: 0 });
      await play(rm, ALICE_WINS_IN_3);
      const card = scorecardService.getScorecards(aliceId).games["tictactoe"]?.modes["quantum"];
      expect(card?.bestScore).toBe(8);
    });

    it("does not touch the scorecard for a loss or a draw — no phantom 'personal best'", async () => {
      const rm = new RoomManager(makeIo());
      const { bobId } = startTwoPlayer(rm, { mode: "quantum", turnTimerSeconds: 0 });
      await play(rm, ALICE_WINS_IN_3);
      expect(scorecardService.getScorecards(bobId).games["tictactoe"]).toBeUndefined();
      expect(scorecardService.getScorecards(bobId).totalPersonalBestsBeaten).toBe(0);

      const rm2 = new RoomManager(makeIo());
      const drawn = startTwoPlayer(rm2, { mode: "classic", turnTimerSeconds: 0 });
      await play(rm2, DRAW);
      expect(scorecardService.getScorecards(drawn.aliceId).games["tictactoe"]).toBeUndefined();
    });

    it("gives the leaver's opponent the win when someone leaves mid-match", async () => {
      const rm = new RoomManager(makeIo());
      const { bobId, room } = startTwoPlayer(rm, { turnTimerSeconds: 0 });
      await rm.leaveRoom("sA");
      expect(room.phase).toBe("finished");
      expect(profileService.getStats(bobId).wins).toBe(1);
      // A walkover is not an efficiency result: it must not mint a scorecard entry.
      expect(scorecardService.getScorecards(bobId).games["tictactoe"]).toBeUndefined();
    });
  });

  describe("untrusted options on the create-room path", () => {
    it("replaces an unknown mode so a full board can never dead-lock", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { mode: "bogus", turnTimerSeconds: 0 });
      expect(["quantum", "classic"]).toContain(room.engine.getPublicState().options.mode);
    });

    it("enforces the timer floor so a 1 ms timer cannot make the table play itself", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { mode: "classic", turnTimerSeconds: 0.001 });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(room.engine.getPublicState().moveCount).toBe(0);
      expect(room.engine.getPublicState().options.turnTimerSeconds).toBe(TICTACTOE_MIN_TURN_SECONDS);
    });

    it("caps an overflow-sized timer instead of letting Node clamp it to 1 ms", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { mode: "classic", turnTimerSeconds: 1e13 });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(room.engine.getPublicState().moveCount).toBe(0);
      expect(room.engine.getPublicState().options.turnTimerSeconds).toBeLessThanOrEqual(120);
    });

    it("survives a non-object options payload", () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, "member");
      expect(room.engine.getPublicState().options.mode).toBe("quantum");
    });
  });

  describe("turn clock", () => {
    it("first turn gets the start-ceremony grace; later turns get the plain window", async () => {
      const rm = new RoomManager(makeIo());
      const { room } = startTwoPlayer(rm, { mode: "classic", turnTimerSeconds: 15 });
      const first = room.engine.getPublicState().turnDeadline - Date.now();
      expect(first).toBe(15_000 + TICTACTOE_FIRST_TURN_GRACE_MS);
      await rm.applyMove("sA", "place", { cellIndex: 4 });
      expect(room.engine.getPublicState().turnDeadline - Date.now()).toBe(15_000);
    });

    it("re-arms the clock when a timeout was withheld during the opponent's disconnect grace", async () => {
      const rm = new RoomManager(makeIo());
      const { code, bobId, room } = startTwoPlayer(rm, { mode: "classic", turnTimerSeconds: 15 });
      const bobToken = mintSeatToken(code, bobId);
      rm.handleDisconnect("sB");
      await vi.advanceTimersByTimeAsync(25_000); // X's window (15 s + 4 s grace) lapses while Bob is away
      expect(room.engine.getPublicState().moveCount).toBe(0); // withheld, by design

      // The clock must be live again, not sitting at zero with no timer behind it.
      expect(room.engine.getPublicState().turnDeadline - Date.now()).toBeGreaterThan(0);
      expect(room.turnTimer).not.toBeNull();

      expect(rm.joinRoom("sB2", "Bob", code, bobId, bobToken).ok).toBe(true);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(room.engine.getPublicState().moveCount).toBeGreaterThan(0); // an idle X is eventually auto-played
    });
  });

  describe("rematch", () => {
    it("swaps who moves first so the host does not always get X", async () => {
      const rm = new RoomManager(makeIo());
      const { aliceId, bobId, room } = startTwoPlayer(rm, { mode: "quantum", turnTimerSeconds: 0 });
      expect(room.engine.getPublicState().turnPlayerId).toBe(aliceId);
      await play(rm, ALICE_WINS_IN_3);

      rm.requestRematch("sA");
      rm.respondRematch("sB", "accept");
      await vi.advanceTimersByTimeAsync(10_000);

      expect(room.phase).toBe("playing");
      const second = room.engine.getPublicState();
      expect(second.turnPlayerId).toBe(bobId);
      expect(second.playerMarks[bobId]).toBe("X");
    });
  });

  describe("Pass & Play", () => {
    it("lets the host seat a local player and play the local seat's turn", async () => {
      const rm = new RoomManager(makeIo());
      const created = createTtt(rm, { mode: "classic", turnTimerSeconds: 0 });
      rm.addLocalPlayer("sA", "Local Bob");
      const room = (rm as unknown as { rooms: Map<string, any> }).rooms.get(created.code)!;
      expect(room.players.size).toBe(2);
      const localId = [...room.players.values()].find((p: any) => p.isLocal).id as string;

      rm.setReady("sA", true);
      rm.startGame("sA");
      expect(room.phase).toBe("playing");

      await rm.applyMove("sA", "place", { cellIndex: 4 });
      await rm.applyMove("sA", "place", { cellIndex: 0 }, localId);
      const state = room.engine.getPublicState();
      expect(state.moveCount).toBe(2);
      expect(state.grid[0]?.playerId).toBe(localId);
    });

    it("does not mint a leaderboard score when one person plays both sides", async () => {
      const rm = new RoomManager(makeIo());
      const created = createTtt(rm, { mode: "quantum", turnTimerSeconds: 0 });
      rm.addLocalPlayer("sA", "Local Bob");
      const room = (rm as unknown as { rooms: Map<string, any> }).rooms.get(created.code)!;
      const localId = [...room.players.values()].find((p: any) => p.isLocal).id as string;
      rm.setReady("sA", true);
      rm.startGame("sA");

      // Host (X) wins in three marks against a local seat that never blocks.
      await rm.applyMove("sA", "place", { cellIndex: 0 });
      await rm.applyMove("sA", "place", { cellIndex: 3 }, localId);
      await rm.applyMove("sA", "place", { cellIndex: 1 });
      await rm.applyMove("sA", "place", { cellIndex: 4 }, localId);
      await rm.applyMove("sA", "place", { cellIndex: 2 });

      expect(room.phase).toBe("finished");
      expect(scorecardService.getScorecards(created.playerId).games["tictactoe"]).toBeUndefined();
    });
  });
});
