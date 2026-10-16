import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

/**
 * Snake and Space War never charge (`NO_ECONOMY_GAMES`). `requestGameStart` already skipped the stake commit for
 * them, but `startGame` — the post-commit step it hands over to — still refused any match with no committed stake
 * unless it was bot practice, so a lone human could never start either game while an `EconomyService` was configured
 * (the production setup). The player saw "its entry stake hasn't been set aside yet" for a game with no stake.
 */

const MEMBER = "aaaaaaaa-1111-2222-3333-444444444444";
const STAKE_ERROR =
  "We couldn't start this match because its entry stake hasn't been set aside yet. Please try Start Game again.";

function makeHarness() {
  const errors: string[] = [];
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: {
      sockets: {
        get: () => ({
          join() {},
          leave() {},
          emit: (event: string, message: string) => {
            if (event === "room:error") errors.push(message);
          },
        }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  const rooms = new RoomManager(io, new EconomyService(new InMemoryEconomyRepository()));
  return { rooms, errors };
}

function createSoloRoom(rooms: RoomManager, game: GameKind): Room {
  // createRoom's list is positional and long; only the leading three and the trailing hostKind/identity matter here.
  const optionsCount = rooms.createRoom.length - 3 - 4;
  const args: unknown[] = ["sock-1", "Solo", game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, "member", MEMBER);
  const created = rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
  const code = (created as unknown as { code: string }).code;
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
}

describe("starting a game that never charges coins", () => {
  it.each(["snake", "spacewar"] as const)("lets a lone human start %s with an economy service configured", async (game) => {
    const { rooms, errors } = makeHarness();
    const room = createSoloRoom(rooms, game);
    rooms.setReady("sock-1", true);

    await rooms.requestGameStart("sock-1");

    expect(errors).toEqual([]);
    expect(room.phase).toBe("playing");
  });

  it("still refuses to start a paid game that has no committed stake", () => {
    const { rooms, errors } = makeHarness();
    createSoloRoom(rooms, "rps");
    rooms.setReady("sock-1", true);

    rooms.startGame("sock-1");

    expect(errors).toEqual([STAKE_ERROR]);
  });
});
