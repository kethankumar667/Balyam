import { describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import type { RecordScoreResult } from "@shared/profile/Scorecard.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";
import { createRoomAs, joinRoomAs, peek } from "./roomTestKit.js";

/** A socket server that remembers what each socket was sent, so a test can see who was told what. */
function capturingIo() {
  const sent: Array<{ socketId: string; event: string; payload: unknown }> = [];
  const io = {
    to: () => ({ emit: () => undefined }),
    sockets: {
      sockets: {
        get: (socketId: string) => ({
          join() {},
          leave() {},
          emit: (event: string, payload: unknown) => sent.push({ socketId, event, payload }),
        }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  const newBest = () => sent.filter((entry) => entry.event === "scorecard:newBest");
  return { io, newBest };
}

const result = {
  game: "rummy",
  isNewPersonalBest: true,
  deltaFromPrevious: 12,
  previousBest: 80,
  totalPersonalBestsBeaten: 3,
  scorecard: { modeId: "pool101", modeDisplayName: "Pool 101", bestScore: 92, scoringDirection: "HIGHER_IS_BETTER" },
} as unknown as RecordScoreResult;

async function twoMembers() {
  const { io, newBest } = capturingIo();
  const rooms = new RoomManager(io);
  const host = createRoomAs(rooms, "sock-host", "Host", "rps", "member", "id-host");
  await joinRoomAs(rooms, "sock-join", "Joiner", host.code, "member", "id-joiner");
  return { rooms, code: host.code, newBest };
}

describe("telling a player their match beat their record", () => {
  it("sends it to that player's own socket and to nobody else at the table", async () => {
    const { rooms, code, newBest } = await twoMembers();

    rooms.announceNewRecord(code, "id-host", result);

    expect(newBest()).toEqual([{ socketId: "sock-host", event: "scorecard:newBest", payload: result }]);
  });

  it("reaches the other player when it is their record", async () => {
    const { rooms, code, newBest } = await twoMembers();

    rooms.announceNewRecord(code, "id-joiner", result);

    expect(newBest().map((entry) => entry.socketId)).toEqual(["sock-join"]);
  });

  it("finds a guest by their seat id, since a guest has no account id", () => {
    const { io, newBest } = capturingIo();
    const rooms = new RoomManager(io);
    const host = createRoomAs(rooms, "sock-guest", "Guesty", "rps", "guest", null);
    const seat = [...peek(rooms, host.code).players.values()].find((player) => player.name === "Guesty")!;

    rooms.announceNewRecord(host.code, seat.id, result);

    expect(newBest().map((entry) => entry.socketId)).toEqual(["sock-guest"]);
  });

  it("sends nothing for a room that has closed, or a player who is not at the table", async () => {
    const { rooms, code, newBest } = await twoMembers();

    expect(() => rooms.announceNewRecord("NOROOM", "id-host", result)).not.toThrow();
    rooms.announceNewRecord(code, "someone-else", result);

    expect(newBest()).toHaveLength(0);
  });
});
