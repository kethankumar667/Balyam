import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  RoomPublicState,
  ServerToClientEvents,
  UnoCard,
  UnoColor,
  UnoPlayerState,
} from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/**
 * Same fake Socket.IO harness as roundHistory.test.ts (Rummy) and
 * unoTimer.test.ts — enough surface for RoomManager, capturing every emit
 * so the test can read the latest room/game state without reaching into
 * RoomManager's private fields.
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

/** Standard UNO play-validity rule (mirrors client/src/games/uno/helpers/
 *  validation.ts's canPlayCard — reimplemented locally rather than
 *  cross-imported since that helper lives in the client package). */
function canPlay(card: UnoCard, topCard: UnoCard, currentColor: UnoColor | null): boolean {
  if (card.rank === "Wild" || card.rank === "Wild+4") return true;
  if (topCard.rank === "Wild" || topCard.rank === "Wild+4") return card.color === currentColor;
  return card.color === topCard.color || card.rank === topCard.rank;
}

/**
 * Drives a real UNO game to `phase: "finished"` through legitimate
 * `applyMove` calls only — no engine-internals rigging. Mirrors a simple
 * client: play any legal card, else draw once and pass if the drawn card
 * still isn't playable (the server has no public "did I already draw
 * this turn" field — `UnoPlayerState` deliberately leaves that to the
 * CLIENT to track locally, same as `useUnoBoard.ts`'s own `drewThisTurn`
 * local state — so this driver tracks it the same way: per turnPlayerId).
 */
function playUntilFinished(
  rooms: RoomManager,
  latestRoomState: () => RoomPublicState,
  latestGameStateFor: (socketId: string) => UnoPlayerState,
  socketOf: Record<string, string>,
  maxMoves: number,
): number {
  let moves = 0;
  let drewThisTurnFor: string | null = null;
  while (latestRoomState().phase !== "finished" && moves < maxMoves) {
    moves++;
    const turnId = latestGameStateFor("s0").turnPlayerId;
    const socket = socketOf[turnId]!;
    const mine = latestGameStateFor(socket);

    if (mine.pendingChallenge) {
      rooms.applyMove(socketOf[mine.pendingChallenge.challengerId]!, "acceptDraw", undefined);
      drewThisTurnFor = null;
      continue;
    }
    if (drewThisTurnFor !== turnId) {
      const playable = mine.myHand.find((c) => canPlay(c, mine.topCard, mine.currentColor));
      if (playable) {
        const needsColor = playable.rank === "Wild" || playable.rank === "Wild+4";
        rooms.applyMove(socket, "play", { cardId: playable.id, color: needsColor ? "R" : undefined });
        drewThisTurnFor = null;
        continue;
      }
      rooms.applyMove(socket, "draw", undefined);
      drewThisTurnFor = turnId;
      continue;
    }
    // Already drew this turn — try the freshly drawn card, else pass.
    const playable = mine.myHand.find((c) => canPlay(c, mine.topCard, mine.currentColor));
    if (playable) {
      const needsColor = playable.rank === "Wild" || playable.rank === "Wild+4";
      rooms.applyMove(socket, "play", { cardId: playable.id, color: needsColor ? "R" : undefined });
    } else {
      rooms.applyMove(socket, "pass", undefined);
    }
    drewThisTurnFor = null;
  }
  return moves;
}

describe("RoomManager — UNO round history + house champion", () => {
  it("records a finished single round into room.unoHistory and leaves unoChampion null with no target score", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    addSocket("s1");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom(
      "s0", "Anand", "uno",
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      {}, // unoOptions — default, targetScore left unset (single round)
    );
    rooms.joinRoom("s1", "Babji", code);
    rooms.setRoomName("s0", "Test Table");
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);
    rooms.startGame("s0");

    function latestRoomState(): RoomPublicState {
      const matches = emitted.filter((e) => e.event === "room:state" && e.room === code);
      return matches[matches.length - 1]!.payload as RoomPublicState;
    }
    function latestGameStateFor(socketId: string): UnoPlayerState {
      const matches = emitted.filter((e) => e.event === "game:state" && e.socketId === socketId);
      return matches[matches.length - 1]!.payload as UnoPlayerState;
    }

    const players = latestRoomState().players;
    const socketOf: Record<string, string> = {
      [players[0]!.id]: "s0",
      [players[1]!.id]: "s1",
    };

    const moves = playUntilFinished(rooms, latestRoomState, latestGameStateFor, socketOf, 500);
    expect(moves).toBeLessThan(500); // sanity: the round actually finished, not stalled

    const ended = latestRoomState();
    expect(ended.phase).toBe("finished");
    expect(ended.unoHistory).toHaveLength(1);
    expect(ended.unoHistory[0]!.roundNumber).toBe(1);
    expect(ended.unoHistory[0]!.winnerId).not.toBe("");
    expect(ended.unoChampion).toBeNull(); // no target score — single round never crowns a champion
  });

  it("accumulates unoHistory across multiple rounds and crowns a champion once the target score is reached", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    addSocket("s1");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom(
      "s0", "Anand", "uno",
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      { targetScore: 300 }, // high enough to virtually guarantee 2+ rounds
    );
    rooms.joinRoom("s1", "Babji", code);
    rooms.setRoomName("s0", "Test Table Two");
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);
    rooms.startGame("s0");

    function latestRoomState(): RoomPublicState {
      const matches = emitted.filter((e) => e.event === "room:state" && e.room === code);
      return matches[matches.length - 1]!.payload as RoomPublicState;
    }
    function latestGameStateFor(socketId: string): UnoPlayerState {
      const matches = emitted.filter((e) => e.event === "game:state" && e.socketId === socketId);
      return matches[matches.length - 1]!.payload as UnoPlayerState;
    }

    const players = latestRoomState().players;
    const socketOf: Record<string, string> = {
      [players[0]!.id]: "s0",
      [players[1]!.id]: "s1",
    };

    const moves = playUntilFinished(rooms, latestRoomState, latestGameStateFor, socketOf, 4000);
    expect(moves).toBeLessThan(4000);

    const ended = latestRoomState();
    expect(ended.phase).toBe("finished");
    expect(ended.unoHistory.length).toBeGreaterThanOrEqual(1);
    // Round numbers recorded sequentially, no gaps or duplicates.
    const roundNumbers = ended.unoHistory.map((r) => r.roundNumber);
    expect(roundNumbers).toEqual([...roundNumbers].sort((a, b) => a - b));
    expect(new Set(roundNumbers).size).toBe(roundNumbers.length);
    expect(ended.unoChampion).not.toBeNull();
    expect(ended.unoChampion?.finalScore).toBeGreaterThanOrEqual(300);
  });
});
