import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, Player, RoomPublicState, ServerToClientEvents } from "@shared/types.js";
import { pickAvatarForName } from "@shared/avatars.js";
import { RoomManager } from "../RoomManager.js";

/** Same fake Socket.IO harness as unoTimer.test.ts / starBotDelay.test.ts. */
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
 * Proves bots get a face instead of falling back to the initials-circle
 * forever (Player.avatar stayed undefined for every bot in every game until
 * this fix — see pickAvatarForName's doc comment for why "matching the
 * name" means stable, not thematically curated).
 */
describe("RoomManager — bot avatars", () => {
  it("addBot assigns a stable avatar deterministically derived from the bot's name", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "rummy");
    rooms.addBot("s0", "Sachin");

    const latestState = [...emitted]
      .reverse()
      .find((e) => e.event === "room:state" && e.room === code)?.payload as RoomPublicState;
    const bot = latestState.players.find((p) => p.isBot) as Player;

    expect(bot.avatar).toBe(pickAvatarForName("Sachin"));
    expect(bot.avatar).toBeTruthy();
  });

  it("the same bot name always gets the same avatar across separate rooms", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    addSocket("s1");
    const rooms = new RoomManager(io);

    const room1 = rooms.createRoom("s0", "Anand", "rummy");
    rooms.addBot("s0", "Kohli");
    const room2 = rooms.createRoom("s1", "Babji", "handcricket");
    rooms.addBot("s1", "Kohli");

    const botIn = (code: string) =>
      ([...emitted].reverse().find((e) => e.event === "room:state" && e.room === code)?.payload as RoomPublicState)
        .players.find((p) => p.isBot) as Player;

    expect(botIn(room1.code).avatar).toBe(botIn(room2.code).avatar);
  });

  it("renameBot re-derives the avatar from the new name", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "uno");
    rooms.addBot("s0", "Jugadu");
    const latest = () =>
      [...emitted].reverse().find((e) => e.event === "room:state" && e.room === code)?.payload as RoomPublicState;
    const botId = (latest().players.find((p) => p.isBot) as Player).id;

    rooms.renameBot("s0", botId, "Sultan");

    const renamed = latest().players.find((p) => p.id === botId) as Player;
    expect(renamed.name).toBe("Sultan");
    expect(renamed.avatar).toBe(pickAvatarForName("Sultan"));
  });
});
