import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/**
 * Proves the actual wiring of the new bot-reaction broadcast: validation,
 * the shared rate-limit bucket, and the `room:reaction` event shape a real
 * player's `sendReaction` produces — the part of this feature most likely to
 * have a bug (a reused rate-limit key colliding with a real player, an emoji
 * slipping past ALLOWED_REACTIONS, a payload shape the client doesn't
 * recognize). `getBotReactionEmoji`'s own per-engine decision logic is
 * covered separately by each flagship engine's own botReaction.test.ts.
 */
function makeFakeIO() {
  const emitted: Array<{ room?: string; event: string; payload: unknown }> = [];
  const io = {
    sockets: { sockets: new Map() },
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, emitted };
}

interface PeekRoom {
  code: string;
  players: Map<string, { id: string; isBot?: boolean }>;
}
function peekRoom(rooms: RoomManager, code: string): PeekRoom {
  return (rooms as unknown as { rooms: Map<string, PeekRoom> }).rooms.get(code)!;
}

describe("RoomManager.broadcastBotReaction", () => {
  it("emits room:reaction with the bot as fromPlayerId, matching a real player's event shape", () => {
    const { io, emitted } = makeFakeIO();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("s0", "Anand", "rummy");
    const room = peekRoom(rooms, code);

    (rooms as unknown as { broadcastBotReaction: (r: PeekRoom, id: string, emoji: string) => void })
      .broadcastBotReaction(room, "bot_1", "🍅");

    const reaction = emitted.find((e) => e.event === "room:reaction");
    expect(reaction).toBeDefined();
    const payload = reaction!.payload as { fromPlayerId: string; emoji: string; ts: number; id: string };
    expect(payload.fromPlayerId).toBe("bot_1");
    expect(payload.emoji).toBe("🍅");
    expect(typeof payload.ts).toBe("number");
    expect(typeof payload.id).toBe("string");
  });

  it("silently drops an emoji outside ALLOWED_REACTIONS, same as sendReaction does for a real player", () => {
    const { io, emitted } = makeFakeIO();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("s0", "Anand", "rummy");
    const room = peekRoom(rooms, code);

    (rooms as unknown as { broadcastBotReaction: (r: PeekRoom, id: string, emoji: string) => void })
      .broadcastBotReaction(room, "bot_1", "💣"); // not in ALLOWED_REACTIONS

    expect(emitted.find((e) => e.event === "room:reaction")).toBeUndefined();
  });

  it("shares the same 6-per-4s rate-limit bucket a real player's reactions use, keyed by the bot's id", () => {
    const { io, emitted } = makeFakeIO();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("s0", "Anand", "rummy");
    const room = peekRoom(rooms, code);
    const broadcast = (rooms as unknown as { broadcastBotReaction: (r: PeekRoom, id: string, emoji: string) => void })
      .broadcastBotReaction.bind(rooms);

    for (let i = 0; i < 8; i++) broadcast(room, "bot_1", "🍅");

    const count = emitted.filter((e) => e.event === "room:reaction").length;
    expect(count).toBe(6); // capped, exactly like a real player's spam guard
  });
});
