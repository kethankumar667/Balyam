import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, GameKind, ServerToClientEvents, AccountKind } from "@shared/types.js";
import { RoomManager, type Room } from "../RoomManager.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";

const origRequestGameStart = RoomManager.prototype.requestGameStart;
beforeAll(() => {
  RoomManager.prototype.requestGameStart = async function (socketId: string) {
    const res = await origRequestGameStart.call(this, socketId);
    const { room } = this.lookup(socketId);
    if (room?.activeStartAttempt && room.activeStartAttempt.status === "COLLECTING_PREFLIGHT") {
      const attempt = room.activeStartAttempt;
      for (const [sId, pId] of room.socketToPlayer.entries()) {
        if (attempt.requiredHumanPlayerIds.has(pId)) {
          await this.acknowledgeStart(sId, {
            startAttemptId: attempt.id,
            roomRevision: attempt.roomRevision,
            visible: true,
            orientationSatisfied: true,
          });
        }
      }
    }
    return res;
  };
});
afterAll(() => {
  RoomManager.prototype.requestGameStart = origRequestGameStart;
});

function makeIo() {
  const emittedToRoom: Record<string, { event: string; payload: unknown }[]> = {};
  const socketEmits: Record<string, { event: string; payload: unknown }[]> = {};

  const io = {
    to: (roomCode: string) => ({
      emit: (event: string, payload: unknown) => {
        if (!emittedToRoom[roomCode]) emittedToRoom[roomCode] = [];
        emittedToRoom[roomCode].push({ event, payload });
      },
    }),
    sockets: {
      sockets: {
        get: (socketId: string) => ({
          join: () => {},
          leave: () => {},
          emit: (event: string, payload: unknown) => {
            if (!socketEmits[socketId]) socketEmits[socketId] = [];
            socketEmits[socketId].push({ event, payload });
          },
        }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, emittedToRoom, socketEmits };
}

function peek(rooms: RoomManager, code: string): Room {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
}

function freshEconomy() {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, {
    infrastructureRetryBackoffMs: 1,
  });
  return { repo, service };
}

const HOST_MEMBER = "host-member-uuid-1111";
const GUEST_ID = "guest_participant_test_1";

function seedMember(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedIdentity(identityId, "member");
  repo.testFixture.seedWallet({
    identityId,
    identityKind: "member",
    balance,
    lifetimeGranted: balance,
    starterGranted: true,
  });
}

function seedGuest(repo: InMemoryEconomyRepository, identityId: string, balance = "2000"): void {
  repo.testFixture.seedIdentity(identityId, "guest");
  repo.testFixture.seedWallet({
    identityId,
    identityKind: "guest",
    balance,
    lifetimeGranted: balance,
    starterGranted: true,
  });
}

function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  game: GameKind,
  hostKind: AccountKind,
  identityId: string | null,
) {
  const totalParams = rooms.createRoom.length;
  const optionsCount = totalParams - 3 - 3;
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId);
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

describe("Per-Player Coin Deduction (Guest and Human Seat Staking)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("deducts 100 coins from host and 100 coins from guest in 2-player Hand Cricket", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, HOST_MEMBER, "5000");
    seedGuest(repo, GUEST_ID, "2000");

    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "handcricket", "member", HOST_MEMBER);
    joinRoomAs(rooms, "s_guest", "BobGuest", host.code, "guest", GUEST_ID);

    rooms.setReady("s_host", true);
    rooms.setReady("s_guest", true);

    await rooms.requestGameStart("s_host");

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("playing");
    expect(room.currentMatchId).not.toBeNull();

    // Verify balances after commit: Host paid 100, Guest paid 100
    const hostWallet = await service.getWallet(HOST_MEMBER);
    const guestWallet = await service.getWallet(GUEST_ID);

    expect(hostWallet.balance).toBe("4900"); // 5000 - 100
    expect(guestWallet.balance).toBe("1900"); // 2000 - 100

    // Verify total pot collected is 200
    expect(room.committedTotalPot).toBe("200");
    const settlement = await service.getSettlement(room.currentMatchId!);
    expect(settlement?.totalCollected).toBe("200");
    expect(settlement?.participantDebits).toEqual([
      { identityId: HOST_MEMBER, identityKind: "member", amountCoins: "100" },
      { identityId: GUEST_ID, identityKind: "guest", amountCoins: "100" },
    ]);
  });

  it("bots are not billed to host: in Host + Guest + 1 Bot match, host pays 100 (self only) and guest pays 100", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, HOST_MEMBER, "5000");
    seedGuest(repo, GUEST_ID, "2000");

    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "ludo", "member", HOST_MEMBER);
    joinRoomAs(rooms, "s_guest", "BobGuest", host.code, "guest", GUEST_ID);
    rooms.addBot("s_host", "Robo");

    rooms.setReady("s_host", true);
    rooms.setReady("s_guest", true);

    await rooms.requestGameStart("s_host");

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("playing");

    const hostWallet = await service.getWallet(HOST_MEMBER);
    const guestWallet = await service.getWallet(GUEST_ID);

    expect(hostWallet.balance).toBe("4900"); // 5000 - 100 (1 self; bot is free)
    expect(guestWallet.balance).toBe("1900"); // 2000 - 100
    expect(room.committedTotalPot).toBe("200"); // 2 human seats * 100
  });

  it("blocks game start and notifies host with player name when guest has insufficient coins", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, HOST_MEMBER, "5000");
    seedGuest(repo, GUEST_ID, "50"); // insufficient! (< 100)

    const { io, socketEmits } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "handcricket", "member", HOST_MEMBER);
    joinRoomAs(rooms, "s_guest", "BobGuest", host.code, "guest", GUEST_ID);

    rooms.setReady("s_host", true);
    rooms.setReady("s_guest", true);

    await rooms.requestGameStart("s_host");

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("lobby"); // Did not start!

    // Balances are untouched
    expect((await service.getWallet(HOST_MEMBER)).balance).toBe("5000");
    expect((await service.getWallet(GUEST_ID)).balance).toBe("50");

    // Check emitted error to host
    const hostErrors = socketEmits["s_host"]?.filter((e: any) => e.event === "room:error");
    expect(hostErrors).toBeDefined();
    expect(hostErrors?.length).toBeGreaterThan(0);
    expect(hostErrors?.[0].payload).toBe("BobGuest does not have enough coins to start this match.");
  });

  it("refunds each participant their exact debited amount on match refund", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, HOST_MEMBER, "5000");
    seedGuest(repo, GUEST_ID, "2000");

    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "handcricket", "member", HOST_MEMBER);
    joinRoomAs(rooms, "s_guest", "BobGuest", host.code, "guest", GUEST_ID);

    rooms.setReady("s_host", true);
    rooms.setReady("s_guest", true);

    await rooms.requestGameStart("s_host");
    const matchId = peek(rooms, host.code).currentMatchId!;

    // Explicit refund
    await service.refundMatchEntry(matchId, "Test match cancelled");

    // Both wallets should be fully restored to pre-match balances
    expect((await service.getWallet(HOST_MEMBER)).balance).toBe("5000");
    expect((await service.getWallet(GUEST_ID)).balance).toBe("2000");
  });
});
