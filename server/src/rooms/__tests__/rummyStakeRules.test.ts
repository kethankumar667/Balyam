import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

function makeIo() {
  const socketEmits: { socketId: string; event: string; data?: unknown }[] = [];
  const io = {
    to: () => ({ emit: () => undefined }),
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
  return { io, socketEmits };
}

function peek(rooms: RoomManager, code: string) {
  return (rooms as unknown as { rooms: Map<string, { entryStakeCoins: number }> }).rooms.get(code)!;
}

/** `createRoom`'s parameter list is positional and long — see the note in setEntryStakeLobby.test.ts. */
function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  game: GameKind,
  hostKind: AccountKind,
  identityId: string | null,
  entryStakeCoins?: number,
) {
  const optionsCount = rooms.createRoom.length - 3 - 4;
  const args: unknown[] = [socketId, "Alice", game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId, entryStakeCoins);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

function freshRooms() {
  const service = new EconomyService(new InMemoryEconomyRepository(), { delay: async () => undefined });
  const { io, socketEmits } = makeIo();
  return { rooms: new RoomManager(io, service), socketEmits };
}

const MEMBER = "11111111-1111-1111-1111-111111111111";

/**
 * Rummy tables are priced by point rate (1 pt = 1/2/4/8/16 coins → 80…1280 per seat), so the
 * platform's 100–5000 stepped range is the WRONG rule for it — and Rummy's tiers are the wrong
 * rule for every other game.
 */
describe("RoomManager — Rummy entry stakes", () => {
  it("accepts every point-rate tier at creation", () => {
    for (const stake of [80, 160, 320, 640, 1280]) {
      const { rooms } = freshRooms();
      const host = createRoomAs(rooms, "s1", "rummy", "member", MEMBER, stake);
      expect(peek(rooms, host.code).entryStakeCoins).toBe(stake);
    }
  });

  it("defaults to the 1-point table (80), not the platform's 100, when nothing valid is asked for", () => {
    const { rooms } = freshRooms();
    expect(peek(rooms, createRoomAs(rooms, "s1", "rummy", "member", MEMBER).code).entryStakeCoins).toBe(80);
    const other = freshRooms().rooms;
    // 100 is a legal stake for other games but not a Rummy tier — it falls back, it does not throw.
    expect(peek(other, createRoomAs(other, "s1", "rummy", "member", MEMBER, 100).code).entryStakeCoins).toBe(80);
  });

  it("does not let Rummy's tiers leak into other games: Ludo still refuses 80 and still defaults to 100", () => {
    const { rooms } = freshRooms();
    expect(peek(rooms, createRoomAs(rooms, "s1", "ludo", "member", MEMBER, 80).code).entryStakeCoins).toBe(100);
    const other = freshRooms().rooms;
    expect(peek(other, createRoomAs(other, "s1", "ludo", "member", MEMBER, 200).code).entryStakeCoins).toBe(200);
  });

  it("a guest hosts Rummy at the 1-point table only", () => {
    const { rooms } = freshRooms();
    expect(peek(rooms, createRoomAs(rooms, "s1", "rummy", "guest", "guest_x").code).entryStakeCoins).toBe(80);
    expect(peek(rooms, createRoomAs(rooms, "s2", "rummy", "guest", "guest_y", 80).code).entryStakeCoins).toBe(80);
    expect(() => createRoomAs(rooms, "s3", "rummy", "guest", "guest_z", 160)).toThrow(/80-coin table/);
    // The old guest table is not a Rummy table any more.
    expect(() => createRoomAs(rooms, "s4", "rummy", "guest", "guest_w", 100)).toThrow(/80-coin table/);
  });

  it("a guest still hosts every other game at 100", () => {
    const { rooms } = freshRooms();
    expect(peek(rooms, createRoomAs(rooms, "s1", "ludo", "guest", "guest_x").code).entryStakeCoins).toBe(100);
  });

  it("lets the host change the rate in the lobby, and announces it as a point rate", () => {
    const { rooms } = freshRooms();
    const host = createRoomAs(rooms, "s1", "rummy", "member", MEMBER, 80);
    const result = rooms.setEntryStake("s1", 320);
    expect(result).toEqual({ ok: true, entryStakeCoins: 320 });
    expect(peek(rooms, host.code).entryStakeCoins).toBe(320);
  });

  it("refuses a lobby change to a stake that is not a Rummy tier — including the platform's own 100 and 500", () => {
    const { rooms, socketEmits } = freshRooms();
    const host = createRoomAs(rooms, "s1", "rummy", "member", MEMBER, 160);
    for (const bad of [100, 500, 0, 81, 1281]) {
      const result = rooms.setEntryStake("s1", bad);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/point rates/i);
    }
    expect(peek(rooms, host.code).entryStakeCoins).toBe(160);
    expect(socketEmits.some((e) => e.event === "room:error")).toBe(true);
  });

  it("a guest host cannot raise a Rummy table above the 1-point rate", () => {
    const { rooms } = freshRooms();
    createRoomAs(rooms, "s1", "rummy", "guest", "guest_x");
    const result = rooms.setEntryStake("s1", 160);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/80-coin table/);
  });

  it("other games keep their own lobby rule: Ludo refuses 80", () => {
    const { rooms } = freshRooms();
    createRoomAs(rooms, "s1", "ludo", "member", MEMBER, 100);
    expect(rooms.setEntryStake("s1", 80).ok).toBe(false);
    expect(rooms.setEntryStake("s1", 150).ok).toBe(true);
  });
});
