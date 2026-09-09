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
  const optionsCount = totalParams - 3 - 4; // 3 leading (socketId,name,game), 4 trailing (avatar,hostKind,identityId,entryStakeCoins)
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

  /**
   * Product decision, 2026-09-09: a bot is scoped to the match it was
   * added for, not a standing opponent. Before this, a bot added for one
   * match stayed seated straight through a real match ending into the
   * post-match rematch-negotiation view — visually indistinguishable from
   * a real player still "Waiting" to ready up for a round it was never
   * actually part of. This drives the real `finalizeMatch` path (unlike
   * the test above, which forces `phase`/`rematch.status` directly and so
   * never exercises the purge), and confirms the host has to re-add a bot
   * — the ordinary Add Bot control, now also enabled in this window — to
   * get one back for the next match.
   */
  it("clears bot seats once a real match concludes, and lets the host re-add one for the next match", async () => {
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
    expect([...room.players.values()].some((p) => p.isBot)).toBe(true);

    // Drive the match to a real finish via the engine, not a forced phase
    // flip, so `finalizeMatch`'s own purge actually runs.
    const originalRandom = Math.random;
    Math.random = () => 0.8; // bot auto-throw is scissors; host always plays rock
    try {
      for (let round = 0; round < 10 && room.phase === "playing"; round++) {
        rooms.applyMove("s_host", "choose", { choice: "rock" });
        vi.advanceTimersByTime(2100);
      }
    } finally {
      Math.random = originalRandom;
    }
    expect(room.phase).toBe("finished");

    // The bot is gone — not sitting there mid-"Waiting" for a round it was
    // never committed to.
    expect(room.players.size).toBe(1);
    expect([...room.players.values()].some((p) => p.isBot)).toBe(false);

    // Alone now, a bare rematch request is refused (below RPS's minimum) —
    // re-adding a bot, now allowed during this "finished" window, is the
    // intended path back to a free practice rematch.
    rooms.requestRematch("s_host");
    expect(room.rematch.status).toBe("idle");

    rooms.addBot("s_host", "Bot2");
    expect(room.players.size).toBe(2);
    rooms.requestRematch("s_host");
    await vi.advanceTimersByTimeAsync(3000);
    expect(room.phase).toBe("playing");
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
