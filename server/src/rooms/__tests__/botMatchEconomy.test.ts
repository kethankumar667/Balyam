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

describe("Free Bot Matches Economy Rule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not deduct any coins when a signed-in member plays with 7 bots", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, HOST_MEMBER, "5000");

    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "ludo", "member", HOST_MEMBER);
    for (let i = 1; i <= 7; i++) {
      rooms.addBot("s_host", `Bot_${i}`);
    }

    rooms.setReady("s_host", true);

    await rooms.requestGameStart("s_host");

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("playing");
    // Free practice match: no economic commitment or matchId
    expect(room.currentMatchId).toBeNull();
    expect(room.committedCostPerSeat).toBeNull();
    expect(room.committedTotalPot).toBeNull();

    // Verify host wallet balance remains exactly 5000 (0 coins deducted)
    const hostWallet = await service.getWallet(HOST_MEMBER);
    expect(hostWallet.balance).toBe("5000");
  });

  it("allows a guest host to start a bot match freely without errors or wallet requirements", async () => {
    const { service } = freshEconomy();
    const { io, socketEmits } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_guest_host", "GuestAlice", "ludo", "guest", null);
    rooms.addBot("s_guest_host", "Robo");

    rooms.setReady("s_guest_host", true);

    await rooms.requestGameStart("s_guest_host");

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("playing");
    expect(room.currentMatchId).toBeNull();
    // No room:error emitted to guest
    const errorEmits = (socketEmits["s_guest_host"] || []).filter((e) => e.event === "room:error");
    expect(errorEmits).toEqual([]);
  });

  it("allows rematch against bots for free with 0 coin deductions", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, HOST_MEMBER, "5000");

    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_host", "Alice", "rps", "member", HOST_MEMBER);
    rooms.addBot("s_host", "Bot1");
    rooms.setReady("s_host", true);

    await rooms.requestGameStart("s_host");

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("playing");

    // Fast-forward to finished
    room.phase = "finished";
    room.rematch.status = "accepted";

    // Request rematch
    // @ts-expect-error private method call
    await rooms.requestRematchStart(room);

    expect(room.phase).toBe("playing");
    expect(room.currentMatchId).toBeNull();

    const hostWallet = await service.getWallet(HOST_MEMBER);
    expect(hostWallet.balance).toBe("5000");
  });

  it("returns zero-cost quote from quoteMatchCheckout for bot practice", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, HOST_MEMBER, "5000");

    const quote = await service.quoteMatchCheckout({
      hostIdentityId: HOST_MEMBER,
      seatCount: 8,
      humanSeatCount: 1,
      botSeatCount: 7,
    });

    expect(quote.costPerSeat).toBe("0");
    expect(quote.totalCommitment).toBe("0");
    expect(quote.hasSufficientFunds).toBe(true);
    expect(quote.shortfall).toBeNull();
    expect(quote.prizeDistribution).toEqual({
      firstPlace: "0",
      secondPlace: "0",
      thirdPlace: "0",
    });
  });
});
