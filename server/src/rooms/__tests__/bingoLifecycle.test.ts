import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import type {
  BingoPlayerState,
  ClientToServerEvents,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

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

describe("RoomManager — Bingo lifecycle", () => {
  it("initializes room, handles lock board, turn calling, and rematch", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "bingo");
    rooms.addBot("s0", "Bhai", "hard");
    rooms.setReady("s0", true);

    function latestRoomState(): RoomPublicState {
      const rows = emitted.filter((e) => e.room === code && e.event === "room:state");
      return rows[rows.length - 1].payload as RoomPublicState;
    }
    function latestGameStateFor(socketId: string): BingoPlayerState {
      const rows = emitted.filter((e) => e.socketId === socketId && e.event === "game:state");
      return rows[rows.length - 1].payload as BingoPlayerState;
    }

    rooms.startGame("s0");
    expect(latestRoomState().phase).toBe("playing");
    const state = latestGameStateFor("s0");
    expect(state.phase).toBe("arranging");
    expect(state.myBoard).toHaveLength(25);

    // Host locks board
    rooms.applyMove("s0", "lockBoard", {});
    const playingState = latestGameStateFor("s0");
    expect(playingState.phase).toBe("playing");
    expect(playingState.currentTurnPlayerId).toBeTruthy();
  });
});
