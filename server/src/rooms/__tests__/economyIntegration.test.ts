import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

/**
 * BHALYAM Economy V1 Phase 7 — RoomManager integration, end to end.
 *
 * Every test here drives the REAL `RoomManager` (constructed with a REAL
 * `EconomyService` over a REAL `InMemoryEconomyRepository` — the same
 * repository the shared contract suite and Phase 5/6 verify against, never
 * a hand-rolled stub) through its actual public methods
 * (`createRoom`/`joinRoom`/`requestGameStart`/`applyMove`/`leaveRoom`/...),
 * exactly the way `sockets/index.ts` does. Nothing here calls
 * `EconomyRepository` directly, and nothing here reaches past
 * `EconomyService`'s own public surface.
 */

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

/** Reads RoomManager's internal room map — same technique avatarSharing.test.ts uses. */
function peek(rooms: RoomManager, code: string): Room {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
}

/** Arity-derived padding, same reasoning as avatarSharing.test.ts's hostWithAvatar — never hand-count the gap. */
function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  game: GameKind,
  hostKind: AccountKind,
  identityId: string | null,
) {
  const totalParams = rooms.createRoom.length; // socketId, name, game, ...options, avatar, hostKind, identityId
  const optionsCount = totalParams - 3 - 3; // 3 leading (socketId,name,game), 3 trailing (avatar,hostKind,identityId)
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId); // avatar, hostKind, identityId
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

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";
const MEMBER_C = "cccccccc-1111-2222-3333-444444444444";

function freshEconomy(): { repo: InMemoryEconomyRepository; service: EconomyService } {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  return { repo, service };
}

function seedMember(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedWallet({ identityId, identityKind: "member", balance, lifetimeGranted: balance, starterGranted: true });
}

/** RPS, forced outcome: the socket that always calls "rock" beats one that always calls "scissors", first to 10. */
function playRpsToCompletion(rooms: RoomManager, winnerSocket: string, loserSocket: string): void {
  for (let round = 0; round < 10; round++) {
    rooms.applyMove(winnerSocket, "choose", { choice: "rock" });
    rooms.applyMove(loserSocket, "choose", { choice: "scissors" });
  }
}

describe("Economy V1 Phase 7 — RoomManager integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("normal match lifecycle", () => {
    it("commits on start, settles on finish: winner credited, host debited, World Bank collects the cut", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);

      await rooms.requestGameStart("s_a");

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("playing");
      expect(room.currentMatchId).not.toBeNull();
      const aliceAfterCommit = await service.getWallet(MEMBER_A);
      expect(aliceAfterCommit.balance).toBe("4800"); // 5000 - 200 (2-seat commitment)

      playRpsToCompletion(rooms, "s_a", "s_b");
      await drainRoomEconomy(rooms);

      expect(peek(rooms, host.code).currentMatchId).toBeNull();
      const alice = await service.getWallet(MEMBER_A);
      const worldBank = await service.getWorldBankSnapshot();
      expect(alice.balance).toBe("4950"); // 4800 + 150 (1st place prize)
      expect(worldBank.baseFeeRevenue).toBe("50"); // the 2-seat world bank cut
    });
  });

  describe("cancelled / refund lifecycle", () => {
    it("host cancellation via abandonment refunds the full commitment", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4800");

      rooms.leaveRoom("s_a"); // last human leaves mid-match -> abandonRoom
      await drainRoomEconomy(rooms);

      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // fully refunded
    });

    it("duplicate refund attempt: a second abandonment of an already-refunded match is a safe no-op", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      const room = peek(rooms, host.code);
      const matchId = room.currentMatchId!;

      rooms.leaveRoom("s_a");
      await drainRoomEconomy(rooms);
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");

      // Directly replay the same refund the queue already issued — the
      // service/repository idempotency key (`match-refund:<matchId>`) makes
      // this safe regardless of what triggered it a second time.
      const replay = await service.refundMatchEntry(matchId, "duplicate attempt");
      expect(replay.applied).toBe(false);
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // unchanged
    });

    it("failed startup (insufficient funds) never starts the match, never leaves a partial commitment", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A, "50"); // less than the 200 commitment
      const { io, socketEmits } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);

      await rooms.requestGameStart("s_a");

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("lobby"); // never started
      expect(room.currentMatchId).toBeNull();
      expect(room.lifecycleState).toBe("READY_CHECK"); // rolled back, not stuck in STARTING
      expect((await service.getWallet(MEMBER_A)).balance).toBe("50"); // untouched
      expect(socketEmits.some((e) => e.event === "room:error" && String(e.data).includes("coins"))).toBe(true);
    });
  });

  describe("replay lifecycle", () => {
    it("commit replay: firing requestGameStart twice for the same room commits exactly once", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);

      // Both requests race in-flight — economyCommitPending guards the second.
      await Promise.all([rooms.requestGameStart("s_a"), rooms.requestGameStart("s_a")]);

      expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // debited exactly once
    });
  });

  describe("disconnect lifecycle", () => {
    it("a mid-match disconnect and reconnect does not disturb the committed match or its eventual settlement", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      const bobJoin = joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      if (!bobJoin.ok) throw new Error("Bob failed to join");
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId;

      rooms.handleDisconnect("s_b");
      expect(peek(rooms, host.code).currentMatchId).toBe(matchId); // untouched by disconnect alone
      expect(peek(rooms, host.code).lifecycleState).toBe("RECOVERING");

      // Reclaiming the seat (the REAL reconnect path — the original
      // playerId plus the seat token issued at Bob's original join) also
      // leaves the commitment completely untouched.
      const reclaim = rooms.joinRoom("s_b2", "Bob", host.code, bobJoin.playerId, bobJoin.seatToken, undefined, "member", MEMBER_B);
      expect(reclaim.ok).toBe(true);
      expect(peek(rooms, host.code).currentMatchId).toBe(matchId);

      // Match completion after reconnect: play it out normally now that
      // Bob is back on a live socket, and confirm settlement still fires
      // correctly.
      playRpsToCompletion(rooms, "s_a", "s_b2");
      await drainRoomEconomy(rooms);
      expect(peek(rooms, host.code).currentMatchId).toBeNull();
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4950");
    });
  });

  describe("host migration lifecycle", () => {
    it("an existing commitment stays authoritative through a host reassignment: no second commit, no double debit, no forced refund", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B, "1000");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const commitSpy = vi.spyOn(service, "commitMatchEntry");
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // Alice funded THIS match

      // Alice (host) is dropped mid-match after her grace window expires.
      // For a 2-seat game, a departure is ALSO a walkover — RPS's own
      // `removePlayer` ends the match immediately (see `economyPlacements.ts`'s
      // "2 seats" case) — so reassignment and settlement land in the SAME
      // tick here. The claim this test proves is narrower and exact:
      // reassignment itself never triggers a second `commitMatchEntry`, and
      // the ONE existing commitment settles correctly (Bob, the survivor
      // and new host, wins by forfeit) rather than being force-refunded.
      rooms.handleDisconnect("s_a");
      vi.advanceTimersByTime(11 * 60_000); // past MATCH_GRACE_PERIOD_MS -> reassignHost + finalizeMatch fire
      await drainRoomEconomy(rooms);

      const roomAfterFailover = peek(rooms, host.code);
      expect(roomAfterFailover.hostId).not.toBe(host.playerId); // Bob is now host
      expect(commitSpy).toHaveBeenCalledTimes(1); // never a second commit from reassignment
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // debited once, never refunded
      expect((await service.getWallet(MEMBER_B)).balance).toBe("1150"); // 1000 + 150 forfeit win

      // A later rematch charges the NEW host (Bob), never Alice again — a
      // reassigned host funds only a NEW match's entry going forward. Bob
      // is alone in the room at this point (Alice was dropped, and
      // `addBot` refuses once `room.phase` is "finished" — bots can only
      // be added in the lobby), so this rematch is necessarily solo — that
      // doesn't weaken the claim: it's still a FRESH commitment, charged
      // to the CURRENT host, independent of the original match.
      rooms.requestRematch("s_b"); // sole human requester auto-accepts -> settles and arms REMATCH_COUNTDOWN_MS immediately
      await vi.advanceTimersByTimeAsync(3_000);
      expect(commitSpy).toHaveBeenCalledTimes(2);
      expect((await service.getWallet(MEMBER_B)).balance).toBe("1050"); // 1150 - 100 (1-seat solo commitment)
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // untouched by the rematch
    });
  });

  describe("bot victory lifecycle", () => {
    it("a bot never receives a wallet or voucher; its winnings go to World Bank bot_prize_revenue", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");

      // Force the BOT to win every round: Alice always "rock", bot always "paper".
      const originalRandom = Math.random;
      Math.random = () => 0.4; // bot auto-throw resolves to "paper" (VALID_CHOICES[1])
      try {
        for (let round = 0; round < 10; round++) {
          rooms.applyMove("s_a", "choose", { choice: "rock" });
          vi.advanceTimersByTime(2100);
        }
      } finally {
        Math.random = originalRandom;
      }
      await drainRoomEconomy(rooms);

      const worldBank = await service.getWorldBankSnapshot();
      expect(worldBank.botPrizeRevenue).toBe("150"); // the bot's 1st-place prize, diverted
      const alice = await service.getWallet(MEMBER_A);
      expect(alice.balance).toBe("4800"); // debited 200, never credited — the bot won, not Alice
    });
  });

  describe("voucher issuance and redemption lifecycle", () => {
    /**
     * Guest identity resolution is a known, documented gap (see
     * economyPlacements.ts's file header and the Phase 7 completion
     * report) — no guest-token channel exists through the socket layer
     * today. This test proves the VOUCHER MECHANISM itself (the part
     * fully built and correct) by seating a "guest" seat with a directly-
     * supplied identityId, exactly as a future socket-layer fix would
     * hand RoomManager one. It does not claim this is reachable via a
     * real socket connection today.
     */
    it("a guest winner receives an escrowed voucher, never a wallet credit; a member can then redeem it", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const guestIdentityId = "guest_integration_test";
      repo.testFixture.seedIdentity(guestIdentityId, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_guest", "Casey", host.code, "guest", guestIdentityId);
      rooms.setReady("s_a", true);
      rooms.setReady("s_guest", true);
      await rooms.requestGameStart("s_a");

      // Guest (s_guest, "rock") beats Alice (s_a, "scissors") — the GUEST wins.
      playRpsToCompletion(rooms, "s_guest", "s_a");
      await drainRoomEconomy(rooms);

      const worldBank = await service.getWorldBankSnapshot();
      expect(worldBank.guestEscrowLiability).toBe("150");
      // No repository method exists to enumerate vouchers by guest — this
      // integration proves issuance via the World Bank escrow liability
      // moving by exactly the prize amount, matching Phase 5's own test
      // strategy for "a guest winner gets a voucher, never a wallet credit."

      // Redemption after settlement: a real, separate member claims the
      // voucher RoomManager's own settlement queue just issued. RoomManager
      // itself never touches redemption (that's the player-facing API,
      // Phase 6 — no redeem call site exists in RoomManager by design); a
      // spy on the SAME `service.settleMatchEconomy` the queue calls is
      // what captures the raw code, proving it's the queue's own result,
      // not a separately-constructed one.
      seedMember(repo, MEMBER_C, "1000"); // enough to fund the 2-seat commitment below
      const settleSpy = vi.spyOn(service, "settleMatchEconomy");

      const secondGuest = "guest_integration_test_2";
      repo.testFixture.seedIdentity(secondGuest, "guest");
      const hostB = createRoomAs(rooms, "s_c", "Deepa", "rps", "member", MEMBER_C);
      joinRoomAs(rooms, "s_guest2", "Eli", hostB.code, "guest", secondGuest);
      rooms.setReady("s_c", true);
      rooms.setReady("s_guest2", true);
      await rooms.requestGameStart("s_c");
      playRpsToCompletion(rooms, "s_guest2", "s_c");
      await drainRoomEconomy(rooms);

      const settleResult = await settleSpy.mock.results[0]!.value;
      const issuedRawCode: string = settleResult.issuedVouchers[0].rawCode;
      expect(typeof issuedRawCode).toBe("string");

      const redemption = await service.redeemVoucher(issuedRawCode, MEMBER_C);
      expect(redemption.applied).toBe(true);
      expect(redemption.voucher.status).toBe("REDEEMED");
      expect((await service.getWallet(MEMBER_C)).balance).toBe("950"); // 1000 - 200 (commitment) + 150 (redemption)
    });
  });

  describe("settlement replay protection", () => {
    it("EconomyService.settleMatchEconomy replayed with the same matchId is applied:false, never a second credit", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId!;

      playRpsToCompletion(rooms, "s_a", "s_b");
      await drainRoomEconomy(rooms);
      const aliceAfterFirstSettle = (await service.getWallet(MEMBER_A)).balance;

      const replay = await service.settleMatchEconomy({
        matchId,
        isValidRanking: true,
        participants: [
          { identityId: MEMBER_A, identityKind: "member", placement: 1 },
          { identityId: MEMBER_B, identityKind: "member", placement: 2 },
        ],
      });
      expect(replay.applied).toBe(false);
      expect((await service.getWallet(MEMBER_A)).balance).toBe(aliceAfterFirstSettle); // unchanged
    });
  });

  describe("start-game bypass attempts", () => {
    it("calling startGame directly, skipping requestGameStart, is refused when economy is configured — no free match", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io, socketEmits } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);

      rooms.startGame("s_a"); // the bypass attempt — no commit was ever made

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("lobby"); // never actually started
      expect(socketEmits.some((e) => e.event === "room:error")).toBe(true);
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // untouched — no bypassed debit
    });

    it("legitimately reaches IN_PROGRESS only via requestGameStart's post-commit call to startGame", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      expect(peek(rooms, host.code).phase).toBe("playing");
    });
  });

  describe("finalizeMatch — single audited settlement path", () => {
    it("a forfeit-by-leaving (leaveRoom's own finalizeMatch call site) still settles correctly with the departed loser included", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      rooms.leaveRoom("s_b"); // Bob forfeits — a 1v1 walkover to Alice, finalizeMatch fires from leaveRoom
      await drainRoomEconomy(rooms);

      expect(peek(rooms, host.code).currentMatchId).toBeNull();
      const alice = await service.getWallet(MEMBER_A);
      expect(alice.balance).toBe("4950"); // 4800 + 150 — the forfeit win settled correctly, not refunded
    });
  });

  describe("Phase 4 — guest socket identity resolves through to settlement", () => {
    it("a guest with a resolved identityId (a valid guest token) settles as a real participant and receives a voucher, not a forced refund", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      repo.testFixture.seedIdentity("guest_phase4_g1", "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      // The identityId here is exactly what Phase 4's `resolveIdentity` now
      // produces for a guest presenting a VALID, verified guest token — not a
      // client-supplied claim (RoomManager itself never verifies tokens; that
      // happens upstream in `sockets/index.ts` before this identityId is
      // ever handed to `joinRoom`, mirroring `createRoomAs`/`joinRoomAs`'s
      // existing arity-safe pattern for members).
      joinRoomAs(rooms, "s_g", "GuestPlayer", host.code, "guest", "guest_phase4_g1");
      rooms.setReady("s_a", true);
      rooms.setReady("s_g", true);

      await rooms.requestGameStart("s_a"); // Alice, a member, hosts — guests still cannot host (see below)
      const matchId = peek(rooms, host.code).currentMatchId;
      expect(matchId).not.toBeNull();

      playRpsToCompletion(rooms, "s_g", "s_a"); // the GUEST wins — proves guest wallet/voucher wiring, not just host accounting
      await drainRoomEconomy(rooms);

      expect(peek(rooms, host.code).currentMatchId).toBeNull(); // cleared once settlement is queued+processed

      const alice = await service.getWallet(MEMBER_A);
      expect(alice.balance).toBe("4800"); // 5000 - 200 committed, NOT refunded — proves isValidRanking was true, not forced false

      const settlement = await service.getSettlement(matchId!);
      expect(settlement?.status).toBe("SETTLED"); // not REFUNDED — a resolved guest identity let this settle for real
      expect(settlement?.totalGuestEscrow).toBe("150"); // 1st-place prize, paid into escrow (a guest never gets a wallet credit)
      expect(settlement?.totalWalletRewarded).toBe("0"); // the winner is a guest, so no member wallet was credited
    });

    it("preserves the standing rule that guests cannot HOST even once their identity resolves", async () => {
      const { repo, service } = freshEconomy();
      repo.testFixture.seedIdentity("guest_phase4_host_attempt", "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      // A guest with a REAL, Phase-4-resolved identityId — the exact case
      // that could have silently reopened guest hosting if `requestGameStart`
      // still gated purely on `!player.identityId`.
      const host = createRoomAs(rooms, "s_g", "GuestHost", "rps", "guest", "guest_phase4_host_attempt");
      rooms.addBot("s_g", "Botty");
      rooms.setReady("s_g", true);

      await rooms.requestGameStart("s_g");

      const room = peek(rooms, host.code);
      expect(room.currentMatchId).toBeNull(); // never committed
      expect(room.phase).not.toBe("playing");
      void service;
    });
  });
});

/** Waits for RoomManager's internal settlement/refund queue to finish. */
async function drainRoomEconomy(rooms: RoomManager): Promise<void> {
  await rooms.drainEconomySettlementQueue();
}
