import { describe, it, expect, vi } from "vitest";
import type { Server } from "socket.io";
import type {
  BingoPlayerState,
  ClientToServerEvents,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/**
 * Same fake Socket.IO harness as roundHistory.test.ts / unoTimer.test.ts —
 * enough surface for RoomManager, capturing every emit so the test can
 * read the latest room/game state without reaching into RoomManager's
 * private fields.
 */
function makeFakeIO() {
  const emitted: Array<{ socketId?: string; room?: string; event: string; payload: unknown }> = [];
  const sockets = new Map<
    string,
    { id: string; join: () => void; emit: (event: string, payload: unknown) => void }
  >();

  function addSocket(id: string) {
    sockets.set(id, {
      id,
      join: () => {},
      emit: (event: string, payload: unknown) => emitted.push({ socketId: id, event, payload }),
    });
  }

  const io = {
    sockets: { sockets },
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, addSocket, emitted };
}

/**
 * Proves the RoomManager wiring end to end — not just BingoEngine in
 * isolation: scheduleTurnTimer's `instanceof BingoEngine` branch actually
 * calls numbers on `room.bingoOptions.callIntervalMs`, the generic bot
 * scheduler picks up a bot's claim once its board completes a pattern, a
 * finished round lands in `room.bingoHistory`, and a rematch deals a fresh
 * round. None of that is exercised by the pure-engine suite in
 * games/bingo/__tests__.
 */
describe("RoomManager — Bingo lifecycle", () => {
  it(
    "auto-calls numbers, lets a bot auto-claim, records history, and rematches into a fresh round",
    async () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom(
      "s0",
      "Anand",
      "bingo",
      undefined, // existingPlayerId
      undefined, // ludoOptions
      undefined, // snlOptions
      undefined, // rummyOptions
      undefined, // hcOptions
      undefined, // wordBuildingOptions
      undefined, // dotsBoxesOptions
      undefined, // starGameOptions
      undefined, // unoOptions
      { callIntervalMs: 10, stopOnFirstWin: true } // bingoOptions — tiny interval, fast test
    );
    rooms.addBot("s0", "Bhai", "hard"); // near-instant claim once a pattern completes
    rooms.setReady("s0", true);

    function latestRoomState(): RoomPublicState {
      const rows = emitted.filter((e) => e.room === code && e.event === "room:state");
      return rows[rows.length - 1].payload as RoomPublicState;
    }
    function latestGameStateFor(socketId: string): BingoPlayerState {
      const rows = emitted.filter((e) => e.socketId === socketId && e.event === "game:state");
      return rows[rows.length - 1].payload as BingoPlayerState;
    }

    vi.useFakeTimers();
    try {
      rooms.startGame("s0");
      expect(latestRoomState().phase).toBe("playing");
      expect(latestGameStateFor("s0").myBoard).toHaveLength(25);
      expect(latestGameStateFor("s0").calledNumbers).toHaveLength(0);

      // Worst case needs all 75 numbers called for a guaranteed full house;
      // budget generously past that (75 calls * 10ms + bot-think delays).
      let finished = false;
      for (let i = 0; i < 500 && !finished; i++) {
        await vi.advanceTimersByTimeAsync(50);
        finished = latestRoomState().phase === "finished";
      }
      expect(finished).toBe(true);

      const roundOneState = latestGameStateFor("s0");
      expect(roundOneState.winners.length).toBeGreaterThan(0);
      expect(roundOneState.winners[0].playerId).toBeTruthy();
      expect(roundOneState.calledNumbers.length).toBeGreaterThan(0);
      expect(roundOneState.calledNumbers.length).toBeLessThanOrEqual(75);

      const roomAfterRound1 = latestRoomState();
      expect(roomAfterRound1.bingoHistory).toHaveLength(1);
      expect(roomAfterRound1.bingoHistory[0].winners.length).toBeGreaterThan(0);
      expect(roomAfterRound1.bingoHistory[0].calledCount).toBe(roundOneState.calledNumbers.length);

      // Rematch: host requests, the bot auto-accepts (2-player room), the
      // countdown elapses, and a fresh round deals in-place.
      rooms.requestRematch("s0");
      await vi.advanceTimersByTimeAsync(3_500); // REMATCH_COUNTDOWN_MS + margin
      expect(latestRoomState().phase).toBe("playing");
      const roundTwoState = latestGameStateFor("s0");
      expect(roundTwoState.winners).toHaveLength(0);
      // Each rematch creates a brand-new engine instance (RoomManager.
      // startRematch's `createEngine(room.game)`, same convention as every
      // other game) — round numbering restarts at 1 rather than
      // continuing a running count across rematches.
      expect(roundTwoState.roundNumber).toBe(1);
      expect(roundTwoState.calledNumbers.length).toBeGreaterThanOrEqual(0);
      expect(roundTwoState.calledNumbers.length).toBeLessThanOrEqual(75);
      // A fresh engine deals a fresh board - proves round 2 isn't just
      // round 1's finished state echoing back.
      const boardsDiffer =
        roundOneState.myBoard.map((c) => c.value).join(",") !==
        roundTwoState.myBoard.map((c) => c.value).join(",");
      expect(boardsDiffer).toBe(true);
    } finally {
      vi.useRealTimers();
    }
    },
    { timeout: 20_000 },
  );
});
