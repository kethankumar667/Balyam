import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { WelcomeNeedsGameError } from "../../persistence/EconomyRepository.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";

// A start waits for every human's preflight acknowledgement; answer it for them, as the other room-economy tests do.
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

/**
 * The invited-friend scenario through the real RoomManager: with the first-game rule on, a new guest's
 * wallet holds exactly one seat, the match entry takes it, and only after that match is the welcome
 * available, once. The SQL behind it is proven by `npm run verify:guestfirstgame`.
 */
const HOST = "guest_host_000000000000000000000000";
const FRIEND = "guest_friend_00000000000000000000000";

const io = {
  to: () => ({ emit: () => undefined }),
  sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit() {} }) } },
} as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

function economyWithFirstGameRule() {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  repo.testFixture.seedConfiguration(
    {
      id: "active",
      version: 1,
      guestStarterCoins: "2000",
      guestFirstGameCoins: "100",
      memberStarterCoins: "5000",
      seatCostCoins: "100",
      isActive: true,
    },
    repo.testFixture.snapshot().prizeSchedules,
  );
  repo.testFixture.seedIdentity(HOST, "guest");
  repo.testFixture.seedIdentity(FRIEND, "guest");
  return { repo, service };
}

function createRoomAs(rooms: RoomManager, socketId: string, identityId: string) {
  const optionsCount = rooms.createRoom.length - 3 - 4;
  const args: unknown[] = [socketId, "Host", "rps"];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, "member", identityId);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

describe("guest first game, through a real room", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("charges the first game to the 100-coin wallet, then offers the welcome once", async () => {
    const { service } = economyWithFirstGameRule();
    const rooms = new RoomManager(io, service);
    expect((await service.getWallet(HOST)).balance).toBe("100");
    expect((await service.getWallet(FRIEND)).balance).toBe("100");

    const host = createRoomAs(rooms, "s_host", HOST);
    rooms.joinRoom("s_friend", "Friend", host.code, undefined, undefined, undefined, "guest", FRIEND);
    rooms.setReady("s_host", true);
    rooms.setReady("s_friend", true);
    await rooms.requestGameStart("s_host");

    // Both seats were paid from the sponsored 100; nothing is owed to the friend yet.
    expect((await service.getWallet(FRIEND)).balance).toBe("0");
    expect((await service.getWallet(FRIEND)).lifetimeSpent).toBe("100");
    expect(await service.getGuestWelcomeStatus(FRIEND)).toEqual({ pending: true, amount: "2000" });

    const first = await service.claimGuestWelcome(FRIEND);
    expect(first.applied).toBe(true);
    expect(first.wallet.balance).toBe("2000");
    expect((await service.claimGuestWelcome(FRIEND)).applied).toBe(false);
    expect((await service.getWallet(FRIEND)).balance).toBe("2000");
  });

  it("gives nothing to someone who has not played", async () => {
    const { service } = economyWithFirstGameRule();
    await service.getWallet(FRIEND);

    await expect(service.claimGuestWelcome(FRIEND)).rejects.toBeInstanceOf(WelcomeNeedsGameError);
    expect((await service.getWallet(FRIEND)).balance).toBe("100");
  });
});
