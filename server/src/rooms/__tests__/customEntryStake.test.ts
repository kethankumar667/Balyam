import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

/**
 * Custom per-room entry stake (2026-09-08) — end to end through the REAL
 * `RoomManager` (constructed with a REAL `EconomyService` over a REAL
 * `InMemoryEconomyRepository`), same discipline as `economyIntegration.test.ts`.
 *
 * A real multi-human match doesn't commit on `requestGameStart` alone — it
 * opens a `COLLECTING_PREFLIGHT` window that waits for every required human
 * to call `acknowledgeStart`. This monkey-patch (copied from
 * `economyIntegration.test.ts`) auto-acknowledges on behalf of every
 * required human so `requestGameStart` behaves like a single atomic call
 * for test purposes.
 */
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
  const optionsCount = totalParams - 3 - 4; // 3 leading (socketId,name,game), 4 trailing (avatar,hostKind,identityId,entryStakeCoins)
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

function seedMember(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedWallet({ identityId, identityKind: "member", balance, lifetimeGranted: balance, starterGranted: true });
}

function playRpsToCompletion(rooms: RoomManager, winnerSocket: string, loserSocket: string): void {
  for (let round = 0; round < 10; round++) {
    rooms.applyMove(winnerSocket, "choose", { choice: "rock" });
    rooms.applyMove(loserSocket, "choose", { choice: "scissors" });
  }
}

async function drainRoomEconomy(rooms: RoomManager): Promise<void> {
  await rooms.drainEconomySettlementQueue();
}

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";

describe("custom entry stake", () => {
  it("a member's chosen stake propagates end to end: debit, settlement, and percentage-split payout", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A, 500);
    expect(peek(rooms, host.code)!.entryStakeCoins).toBe(500);

    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    expect(peek(rooms, host.code)!.committedCostPerSeat).toBe("500");
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4500"); // 5000 - 500
    expect((await service.getWallet(MEMBER_B)).balance).toBe("4500"); // 5000 - 500

    playRpsToCompletion(rooms, "s_a", "s_b"); // Alice wins
    await drainRoomEconomy(rooms);

    // 2 seats @ 500 = 1000 total. 1 winner: 20% world bank (200), 100% of the 800 winner pool to Alice.
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5300"); // 4500 + 800
    const worldBank = await service.getWorldBankSnapshot();
    expect(worldBank.baseFeeRevenue).toBe("200");
  });

  it("a guest's createRoom request above 100 coins is rejected outright, not silently clamped", async () => {
    const { repo, service } = freshEconomy();
    repo.testFixture.seedIdentity("guest_stake_reject_test", "guest");
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    expect(() => createRoomAs(rooms, "s_guest", "Gary", "rps", "guest", "guest_stake_reject_test", 500)).toThrow(
      /Guests can only host matches at the 100-coin table/,
    );
  });

  it("a guest's createRoom request at exactly 100 coins succeeds", async () => {
    const { repo, service } = freshEconomy();
    repo.testFixture.seedIdentity("guest_stake_100_test", "guest");
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_guest", "Gary", "rps", "guest", "guest_stake_100_test", 100);
    expect(peek(rooms, host.code)!.entryStakeCoins).toBe(100);
  });

  it("a member's malformed/out-of-bounds stake request clamps to the platform default rather than failing room creation", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    // Not a valid step (neither multiple of 50 below 1000 nor 100 above) — clamps rather than throws.
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A, 275);
    expect(peek(rooms, host.code)!.entryStakeCoins).toBe(100);
  });

  it("a guest can join and be correctly debited in a member's higher-stake room", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    const guestId = "guest_join_high_stake_test";
    repo.testFixture.seedIdentity(guestId, "guest");
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A, 1000);
    joinRoomAs(rooms, "s_b", "Gary", host.code, "guest", guestId);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    expect((await service.getWallet(MEMBER_A)).balance).toBe("4000"); // 5000 - 1000
  });

  it("host migration to a guest on a non-100 room blocks match start", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    const guestId1 = "guest_migration_block_test_1";
    const guestId2 = "guest_migration_block_test_2";
    repo.testFixture.seedIdentity(guestId1, "guest");
    repo.testFixture.seedIdentity(guestId2, "guest");
    const { io, socketEmits } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A, 500);
    joinRoomAs(rooms, "s_b", "Gary", host.code, "guest", guestId1);
    joinRoomAs(rooms, "s_c", "Gina", host.code, "guest", guestId2);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    rooms.setReady("s_c", true);

    // Host leaves pre-commitment; `reassignHost` prefers a non-guest
    // successor, but only guests remain here, so the first remaining guest
    // (Gary) is promoted — leaving 2 players (Gary + Gina), enough to clear
    // the "at least 2 players" gate and actually exercise the guest-host
    // stake re-check rather than being rejected for an unrelated reason.
    rooms.leaveRoom("s_a");
    const room = peek(rooms, host.code);
    expect(room!.hostId).toBeDefined();
    expect(room!.players.get(room!.hostId)!.isGuest).toBe(true);
    expect(room!.entryStakeCoins).toBe(500);

    await rooms.requestGameStart("s_b");
    const errorEmit = socketEmits.find((e) => e.event === "room:error");
    expect(errorEmit).toBeDefined();
    expect(String(errorEmit?.data)).toMatch(/100-coin table/);
  });

  it("a mixed bot + multi-human paid room at a custom stake bills the host for every seat, including bots", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A, 300);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    // 3 seats (2 humans + 1 bot) @ 300 = 900 total. Bob pays his own 300;
    // Alice absorbs her own seat + the bot's = 600.
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4400"); // 5000 - 600
    expect((await service.getWallet(MEMBER_B)).balance).toBe("4700"); // 5000 - 300
    expect(peek(rooms, host.code)!.committedTotalPot).toBe("900");
  });

  it("quoteMatchCheckout reflects a custom stake before any room is created", async () => {
    const { repo, service } = freshEconomy();
    repo.testFixture.seedWallet({ identityId: MEMBER_A, identityKind: "member", balance: "10000", lifetimeGranted: "10000", starterGranted: true });

    const quote = await service.quoteMatchCheckout({
      hostIdentityId: MEMBER_A,
      seatCount: 4,
      humanSeatCount: 4,
      botSeatCount: 0,
      entryStakeCoins: 300,
    });

    expect(quote.costPerSeat).toBe("300");
    expect(quote.totalCommitment).toBe("1200");
    // 4 seats -> 3 winners, 20% world bank (240), 80% winner pool (960) split 50/30/20.
    expect(quote.prizeDistribution).toEqual({ firstPlace: "480", secondPlace: "288", thirdPlace: "192" });
    expect(quote.worldBankContribution).toBe("240");
  });
});
