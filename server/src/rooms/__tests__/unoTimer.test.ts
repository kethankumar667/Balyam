import { describe, it, expect, vi } from "vitest";
import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  UnoPlayerState,
} from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/**
 * Same fake Socket.IO harness as roundHistory.test.ts — enough surface for
 * RoomManager (`io.sockets.sockets.get(id)`, `io.to(room).emit(...)`,
 * `socket.join(...)`), capturing every emit so the test can read the latest
 * per-socket game state without reaching into RoomManager's private fields.
 */
function makeFakeIO() {
  const emitted: Array<{ socketId?: string; room?: string; event: string; payload: unknown }> = [];
  const sockets = new Map<string, { id: string; join: () => void; emit: (event: string, payload: unknown) => void }>();

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
 * Proves the Phase 2 RoomManager wiring — not just the engine in isolation:
 * scheduleTurnTimer's `instanceof UnoEngine` branch actually sets a real
 * setTimeout using the room's `unoOptions.turnTimerSeconds`, and
 * onTurnTimeout's branch actually forces a move via getTimeoutActor() +
 * applyAutoMove() when it fires. Neither of those RoomManager branches is
 * exercised by the pure-engine test suite in games/uno/__tests__.
 */
describe("RoomManager — UNO turn timer wiring", () => {
  it("schedules a deadline using room.unoOptions.turnTimerSeconds and force-advances the game when it lapses", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    addSocket("s1");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom(
      "s0",
      "Anand",
      "uno",
      undefined, // existingPlayerId
      undefined, // ludoOptions
      undefined, // snlOptions
      undefined, // rummyOptions
      undefined, // hcOptions
      undefined, // wordBuildingOptions
      undefined, // dotsBoxesOptions
      undefined, // starGameOptions
      { turnTimerSeconds: 1 } // unoOptions — 1s so the fake-timer advance below is tiny
    );
    rooms.joinRoom("s1", "Babji", code);
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);

    function latestGameStateFor(socketId: string): UnoPlayerState {
      const matches = emitted.filter((e) => e.event === "game:state" && e.socketId === socketId);
      const last = matches[matches.length - 1];
      if (!last) throw new Error("no game:state broadcast yet");
      return last.payload as UnoPlayerState;
    }

    vi.useFakeTimers();
    try {
      rooms.startGame("s0");

      const before = latestGameStateFor("s0");
      expect(before.phase).toBe("playing");
      // scheduleTurnTimer's UnoEngine branch must have set a real deadline
      // (this was the original dead-code gap — turnDeadline stayed null
      // forever because RoomManager never called setTurnDeadline for UNO).
      expect(before.turnDeadline).not.toBeNull();
      expect(before.turnDeadline!).toBeGreaterThan(Date.now());

      // scheduleTurnTimer floors every game's timer at 5s regardless of the
      // configured value (Math.max(5, seconds), same floor DotsBoxesEngine
      // uses) — a requested 1s becomes a real 5s timer.
      vi.advanceTimersByTime(5_100);

      const after = latestGameStateFor("s0");
      // onTurnTimeout's UnoEngine branch must have forced a move for
      // getTimeoutActor() — either a card was played/drawn (hand size or
      // discard changed) or the turn advanced. lastAction is the simplest
      // reliable signal that *something* was auto-applied.
      expect(after.lastAction).not.toBe(before.lastAction);
      // A fresh timer must have been scheduled for the resulting state too.
      expect(after.turnDeadline).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
