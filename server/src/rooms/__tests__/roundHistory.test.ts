import { describe, it, expect, vi } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, RoomPublicState, RummyPlayerState, ServerToClientEvents } from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/**
 * Minimal fake Socket.IO server — just enough surface for RoomManager
 * (`io.sockets.sockets.get(id)`, `io.to(room).emit(...)`, `socket.join(...)`).
 * Captures every emit so the test can read the latest room/game state
 * without reaching into RoomManager's private fields.
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

describe("RoomManager — Rummy round history + house champion (docs/rummy/roadmap.md B.1/B.3)", () => {
  it("records each finished round into room.history and leaves champion null in single mode", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    addSocket("s1");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "rummy", undefined, undefined, undefined, { mode: "single" });
    const join = rooms.joinRoom("s1", "Babji", code);
    expect(join.ok).toBe(true);
    rooms.setRoomName("s0", "Test Gang");
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);
    rooms.startGame("s0");

    function latestRoomState(): RoomPublicState {
      const matches = emitted.filter((e) => e.event === "room:state" && e.room === code);
      return matches[matches.length - 1].payload as RoomPublicState;
    }
    function latestGameStateFor(socketId: string): RummyPlayerState {
      const matches = emitted.filter((e) => e.event === "game:state" && e.socketId === socketId);
      return matches[matches.length - 1].payload as RummyPlayerState;
    }

    const turnPlayerId = latestGameStateFor("s0").turnPlayerId;
    const dropperSocket = turnPlayerId === latestRoomState().players[0].id ? "s0" : "s1";
    rooms.applyMove(dropperSocket, "drop", undefined);

    const after = latestRoomState();
    expect(after.history).toHaveLength(1);
    expect(after.history[0].roundNumber).toBe(1);
    expect(after.history[0].winnerId).not.toBeNull();
    expect(after.champion).toBeNull(); // single mode never crowns a champion
  });

  it("accumulates multi-round history and crowns a House Champion once a pool match ends, surviving a rematch", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    addSocket("s1");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "rummy", undefined, undefined, undefined, { mode: "pool101" });
    rooms.joinRoom("s1", "Babji", code);
    rooms.setRoomName("s0", "Test Gang");
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);
    rooms.startGame("s0");

    function latestRoomState(): RoomPublicState {
      const matches = emitted.filter((e) => e.event === "room:state" && e.room === code);
      return matches[matches.length - 1].payload as RoomPublicState;
    }
    function latestGameStateFor(socketId: string): RummyPlayerState {
      const matches = emitted.filter((e) => e.event === "game:state" && e.socketId === socketId);
      return matches[matches.length - 1].payload as RummyPlayerState;
    }

    let rounds = 0;
    for (; rounds < 20; rounds++) {
      const players = latestRoomState().players;
      const turnPlayerId = latestGameStateFor("s0").turnPlayerId;
      const dropperSocket = turnPlayerId === players[0].id ? "s0" : "s1";
      rooms.applyMove(dropperSocket, "drop", undefined);
      if (latestGameStateFor("s0").matchOver) break;
      rooms.applyMove("s0", "newRound", undefined);
    }

    const ended = latestRoomState();
    expect(ended.history.length).toBe(rounds + 1);
    expect(ended.champion).not.toBeNull();
    expect(ended.champion?.playerId).toBe(latestGameStateFor("s0").matchWinnerId);

    const historyBeforeRematch = ended.history.length;

    // Rematch — a fresh RummyEngine instance is created. Round 1 of the new
    // match must still get recorded, not skipped as "already seen round 1".
    // The restart fires off a real setTimeout (REMATCH_COUNTDOWN_MS); drive
    // it deterministically with fake timers instead of a real wall-clock wait.
    vi.useFakeTimers();
    try {
      rooms.requestRematch("s0");
      rooms.respondRematch("s0", "accept");
      rooms.respondRematch("s1", "accept");
      vi.advanceTimersByTime(5_000);

      const players = latestRoomState().players;
      const turnPlayerId = latestGameStateFor("s0").turnPlayerId;
      const dropperSocket = turnPlayerId === players[0].id ? "s0" : "s1";
      rooms.applyMove(dropperSocket, "drop", undefined);

      const afterRematchRound1 = latestRoomState();
      expect(afterRematchRound1.history.length).toBe(historyBeforeRematch + 1);
    } finally {
      vi.useRealTimers();
    }
  });
});
