import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

function makeIo() {
  const roomEmits: { room: string; event: string; data?: unknown }[] = [];
  const socketEmits: { socketId: string; event: string; data?: unknown }[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => roomEmits.push({ room, event, data }),
    }),
    sockets: {
      sockets: {
        get: (id: string) => ({
          join() {},
          leave() {},
          emit: (event: string, data?: unknown) => socketEmits.push({ socketId: id, event, data }),
        }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, roomEmits, socketEmits };
}

function peek(rooms: RoomManager, code: string) {
  return (rooms as unknown as { rooms: Map<string, ReturnType<RoomManager["createRoom"]> extends never ? never : any> }).rooms.get(code);
}

function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  game: GameKind,
  hostKind: AccountKind,
  identityId: string | null,
  entryStakeCoins?: number,
) {
  const totalParams = rooms.createRoom.length;
  const optionsCount = totalParams - 3 - 4;
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId, entryStakeCoins);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

function joinRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  code: string,
  accountKind: AccountKind,
  identityId: string | null,
) {
  return rooms.joinRoom(socketId, name, code, undefined, undefined, undefined, accountKind, identityId);
}

function freshEconomy(): { repo: InMemoryEconomyRepository; service: EconomyService } {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  return { repo, service };
}

describe("RoomManager — setEntryStake (lobby bet adjustment)", () => {
  const MEMBER_HOST = "11111111-1111-1111-1111-111111111111";
  const MEMBER_GUEST = "22222222-2222-2222-2222-222222222222";

  it("allows host to change entry stake in lobby when no other human is ready", () => {
    const { repo, service } = freshEconomy();
    const { io, roomEmits } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "rps", "member", MEMBER_HOST, 100);
    expect(peek(rooms, host.code)!.entryStakeCoins).toBe(100);

    // Another player joins but is NOT ready
    joinRoomAs(rooms, "s_joiner", "Bob", host.code, "member", MEMBER_GUEST);

    // Host updates stake to 500
    const result = rooms.setEntryStake("s_host", 500);
    expect(result.ok).toBe(true);
    expect(result.entryStakeCoins).toBe(500);
    expect(peek(rooms, host.code)!.entryStakeCoins).toBe(500);

    // Verify broadcast of updated state
    const stateEmits = roomEmits.filter((e) => e.event === "room:state");
    expect(stateEmits.length).toBeGreaterThan(0);
    const lastState = stateEmits[stateEmits.length - 1].data as { entryStakeCoins: number };
    expect(lastState.entryStakeCoins).toBe(500);
  });

  it("blocks bet change when another human player is ready", () => {
    const { repo, service } = freshEconomy();
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "rps", "member", MEMBER_HOST, 100);
    joinRoomAs(rooms, "s_joiner", "Bob", host.code, "member", MEMBER_GUEST);

    // Other player readies up!
    rooms.setReady("s_joiner", true);

    // Host tries to change stake while Bob is ready
    const result = rooms.setEntryStake("s_host", 500);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Cannot change the bet after another player has readied up/i);
    expect(peek(rooms, host.code)!.entryStakeCoins).toBe(100);

    // When Bob unreadies, host can change stake again
    rooms.setReady("s_joiner", false);
    const retryResult = rooms.setEntryStake("s_host", 500);
    expect(retryResult.ok).toBe(true);
    expect(peek(rooms, host.code)!.entryStakeCoins).toBe(500);
  });

  it("unready state of host themselves does not block stake change, and resets host readiness", () => {
    const { repo, service } = freshEconomy();
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "rps", "member", MEMBER_HOST, 100);
    // Host marks ready
    rooms.setReady("s_host", true);

    // Host changes stake
    const result = rooms.setEntryStake("s_host", 200);
    expect(result.ok).toBe(true);
    // Host is automatically unreadied to re-confirm
    const hostPlayer = peek(rooms, host.code)!.players.get(host.playerId);
    expect(hostPlayer!.isReady).toBe(false);
  });

  it("rejects non-host attempts to change entry stake", () => {
    const { repo, service } = freshEconomy();
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "rps", "member", MEMBER_HOST, 100);
    joinRoomAs(rooms, "s_joiner", "Bob", host.code, "member", MEMBER_GUEST);

    const result = rooms.setEntryStake("s_joiner", 500);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Only the host can change the entry stake/i);
  });

  it("rejects guest host attempts to raise entry stake above 100", () => {
    const { repo, service } = freshEconomy();
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_guest", "Gary", "rps", "guest", "guest_id_123", 100);
    const result = rooms.setEntryStake("s_guest", 500);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Guest hosts can only host matches at the 100-coin table/i);
  });

  it("rejects invalid non-multiple or out of bounds stakes", () => {
    const { repo, service } = freshEconomy();
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "rps", "member", MEMBER_HOST, 100);

    expect(rooms.setEntryStake("s_host", 250).ok).toBe(false);
    expect(rooms.setEntryStake("s_host", 50).ok).toBe(false);
    expect(rooms.setEntryStake("s_host", 6000).ok).toBe(false);
  });
});
