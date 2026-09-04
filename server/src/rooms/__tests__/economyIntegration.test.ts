import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { MatchAlreadyForfeitedError } from "../../persistence/EconomyRepository.js";
import { metricsCollector } from "../../observability/MetricsCollector.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

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

/**
 * Plays a 2-seat RPS match to a forced win for the seat on `winnerSocketId`
 * — `Math.random` pinned so the bot/opponent's auto-throw always loses to
 * "rock", same pattern as the existing "bot victory lifecycle" suite.
 * Returns once `finalizeMatch` has already run (phase="finished",
 * lifecycleState="COMPLETED", currentMatchId already cleared) — verified
 * directly by each caller, not assumed.
 */
function playToNaturalCompletion(rooms: RoomManager, winnerSocketId: string): void {
  const originalRandom = Math.random;
  Math.random = () => 0.8;
  try {
    for (let round = 0; round < 10; round++) {
      rooms.applyMove(winnerSocketId, "choose", { choice: "rock" });
      vi.advanceTimersByTime(2100);
    }
  } finally {
    Math.random = originalRandom;
  }
}

/** A promise the caller can resolve/reject from outside its own executor — the deterministic interleaving primitive for the orphaned-commit race tests below. */
function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (err: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Wraps `service.commitMatchEntry` so the REAL commit (a real wallet debit,
 * through the real `InMemoryEconomyRepository`) still happens immediately,
 * but the CALLER's `await` does not observe it resolving until the test
 * explicitly releases `gate`. `committed` resolves the instant the real
 * debit has happened — the test's own deterministic synchronization point
 * for "the race window is open now," with no sleep of any kind.
 */
function gateCommitMatchEntry(service: EconomyService) {
  const gate = createDeferred<void>();
  let signalCommitted!: () => void;
  const committed = new Promise<void>((resolve) => {
    signalCommitted = resolve;
  });
  const original = service.commitMatchEntry.bind(service);
  const spy = vi.spyOn(service, "commitMatchEntry").mockImplementation(async (request) => {
    const result = await original(request);
    signalCommitted();
    await gate.promise;
    return result;
  });
  return { gate, committed, spy };
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
      expect(aliceAfterCommit.balance).toBe("4900"); // 5000 - 100 (per-seat commitment)
      const bobAfterCommit = await service.getWallet(MEMBER_B);
      expect(bobAfterCommit.balance).toBe("4900"); // 5000 - 100 (per-seat commitment)

      playRpsToCompletion(rooms, "s_a", "s_b");
      await drainRoomEconomy(rooms);

      expect(peek(rooms, host.code).currentMatchId).toBeNull();
      const alice = await service.getWallet(MEMBER_A);
      const worldBank = await service.getWorldBankSnapshot();
      expect(alice.balance).toBe("5060"); // 4900 + 160 (1st place prize)
      expect(worldBank.baseFeeRevenue).toBe("40"); // the 2-seat world bank cut
    });
  });

  describe("cancelled / refund lifecycle", () => {
    it("solo signed-in host abandoning a bot-filled active match incurs no forfeiture (free practice table)", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      expect(peek(rooms, host.code).currentMatchId).toBeNull();
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");

      rooms.leaveRoom("s_a"); // leaves mid-match -> no forfeiture because it was a free bot practice match
      await drainRoomEconomy(rooms);

      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // untouched — free practice match
      const worldBank = await service.getWorldBankSnapshot();
      expect(worldBank.abandonmentForfeitureRevenue).toBe("0");
    });

    it("multiplayer signed-in participants abandoning an active match forfeits the pool — never refunded (Example 3)", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const guestB = "guest_ex3_b";
      repo.testFixture.seedIdentity(guestB, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Casey", host.code, "guest", guestB);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId!;
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900");

      rooms.leaveRoom("s_a"); // host leaves with no eligible signed-in successor -> abandonRoom -> forfeiture, not refund
      await drainRoomEconomy(rooms);

      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // NEVER refunded — player fault after commitment
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
      expect(settlement?.totalForfeited).toBe("200");
      expect(settlement?.totalRefunded).toBe("0");
      const worldBank = await service.getWorldBankSnapshot();
      expect(worldBank.abandonmentForfeitureRevenue).toBe("200"); // the FULL committed pool, to World Bank
    });

    it("duplicate forfeiture attempt: a second abandonment of an already-forfeited match is a safe no-op", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const guestB = "guest_dup_b";
      repo.testFixture.seedIdentity(guestB, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Casey", host.code, "guest", guestB);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const room = peek(rooms, host.code);
      const matchId = room.currentMatchId!;

      rooms.leaveRoom("s_a");
      await drainRoomEconomy(rooms);
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // never refunded
      const worldBankAfterFirst = await service.getWorldBankSnapshot();
      expect(worldBankAfterFirst.abandonmentForfeitureRevenue).toBe("200");

      // Directly replay the same forfeiture the queue already issued — the
      // service/repository idempotency key (`match-forfeit:<matchId>`) makes
      // this safe regardless of what triggered it a second time.
      const replay = await service.forfeitMatchEntry(matchId, "duplicate attempt");
      expect(replay.applied).toBe(false);
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // unchanged
      const worldBankAfterReplay = await service.getWorldBankSnapshot();
      expect(worldBankAfterReplay.abandonmentForfeitureRevenue).toBe("200"); // unchanged — no double-credit

      // A refund attempt against the same, now-forfeited match must fail
      // loudly, never silently double-move the same pool.
      await expect(service.refundMatchEntry(matchId, "late refund attempt")).rejects.toBeInstanceOf(MatchAlreadyForfeitedError);
    });

    it("failed startup (insufficient funds) never starts the match, never leaves a partial commitment", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A, "50"); // less than the 100 per-seat commitment
      seedMember(repo, MEMBER_B);
      const { io, socketEmits } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);

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
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);

      // Both requests race in-flight — economyCommitPending guards the second.
      await Promise.all([rooms.requestGameStart("s_a"), rooms.requestGameStart("s_a")]);

      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // debited exactly once
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
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5060");
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
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // Alice committed her seat (100)

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
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // debited once, never refunded
      expect((await service.getWallet(MEMBER_B)).balance).toBe("1060"); // 1000 - 100 commitment + 160 forfeit win

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
      expect((await service.getWallet(MEMBER_B)).balance).toBe("960"); // 1060 - 100 (1-seat solo commitment)
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // untouched by the rematch
    }, 30_000);
  });

  describe("host succession — economic eligibility gate (guest/bot succession exploit fix)", () => {
    it("active host leaves with a connected signed-in successor: successor becomes host, is not charged, match continues, economic owner unchanged (Example 1)", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B, "1000");
      const guestId = "guest_example1_c";
      repo.testFixture.seedIdentity(guestId, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
      const bobJoin = joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      joinRoomAs(rooms, "s_c", "Casey", host.code, "guest", guestId);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      rooms.setReady("s_c", true);
      await rooms.requestGameStart("s_a");

      const matchId = peek(rooms, host.code).currentMatchId!;
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // 5000 - 100 (Alice only; bot is free)
      const bobBalanceBeforeFailover = (await service.getWallet(MEMBER_B)).balance;

      rooms.leaveRoom("s_a"); // host leaves; Bob (signed-in), Casey (guest), and a bot remain
      await drainRoomEconomy(rooms);

      const room = peek(rooms, host.code);
      expect(room.hostId).toBe(bobJoin.ok ? bobJoin.playerId : null); // Bob, not Casey, inherits host
      expect(room.currentMatchId).toBe(matchId); // match continues — not abandoned
      expect((await service.getWallet(MEMBER_B)).balance).toBe(bobBalanceBeforeFailover); // successor NOT charged
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("COMMITTED"); // still committed, not forfeited/refunded
      expect(settlement?.hostIdentityId).toBe(MEMBER_A); // economic ownership untouched by host migration
    });

    it("active host leaves with only guests and a bot remaining: no guest inherits host, the match forfeits — not a refund (Example 2)", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const guestC = "guest_example2_c";
      const guestD = "guest_example2_d";
      repo.testFixture.seedIdentity(guestC, "guest");
      repo.testFixture.seedIdentity(guestD, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
      const caseyJoin = joinRoomAs(rooms, "s_c", "Casey", host.code, "guest", guestC);
      joinRoomAs(rooms, "s_d", "Deepa", host.code, "guest", guestD);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      rooms.setReady("s_c", true);
      rooms.setReady("s_d", true);
      await rooms.requestGameStart("s_a");

      const matchId = peek(rooms, host.code).currentMatchId!;
      const roomRef = peek(rooms, host.code);
      const originalHostId = roomRef.hostId;
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // 5000 - 100 (Alice only; bot is free)

      rooms.leaveRoom("s_a");
      await drainRoomEconomy(rooms);

      expect(roomRef.currentMatchId).toBeNull();
      // Guest cannot inherit an economically active match: hostId was never
      // reassigned to Casey (it stays whatever it was at the moment of
      // abandonment — abandonRoom tears the room down instead of promoting
      // an ineligible seat).
      expect(roomRef.hostId).not.toBe(caseyJoin.ok ? caseyJoin.playerId : "unreachable");
      expect(roomRef.hostId).toBe(originalHostId);

      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
      expect(settlement?.totalForfeited).toBe("300"); // 3 human seats @ 100, bot is free
      expect(settlement?.totalRefunded).toBe("0");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // never refunded
      const worldBank = await service.getWorldBankSnapshot();
      expect(worldBank.abandonmentForfeitureRevenue).toBe("300");
      expect(worldBank.guestEscrowLiability).toBe("0"); // no guest voucher ever created
      expect(worldBank.botPrizeRevenue).toBe("0"); // no bot winnings ever created
    });

    it("active host leaves with an away-but-eligible signed-in successor: still preferred over a connected guest (existing away-successor policy preserved)", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B, "1000");
      const guestC = "guest_example5_c";
      repo.testFixture.seedIdentity(guestC, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
      const bobJoin = joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      joinRoomAs(rooms, "s_c", "Casey", host.code, "guest", guestC);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      rooms.setReady("s_c", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId!;

      rooms.handleDisconnect("s_b"); // Bob goes away — grace timer armed, seat NOT yet reaped
      rooms.leaveRoom("s_a"); // Alice (host) voluntarily leaves while Bob is still mid-grace

      const room = peek(rooms, host.code);
      expect(room.hostId).toBe(bobJoin.ok ? bobJoin.playerId : null); // away-but-eligible Bob, not connected guest Casey
      expect(room.currentMatchId).toBe(matchId); // match continues
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("COMMITTED");
      expect(settlement?.hostIdentityId).toBe(MEMBER_A);
    });

    it("disconnect-grace expiry with no eligible signed-in successor remaining forfeits — no refund, no guest voucher, no bot prize (Example 6)", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const guestB = "guest_example6_b";
      repo.testFixture.seedIdentity(guestB, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Basil", host.code, "guest", guestB);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId!;
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // 5000 - 100 (Alice only; bot is free)

      rooms.handleDisconnect("s_a"); // Alice (host) disconnects
      vi.advanceTimersByTime(11 * 60_000); // past MATCH_GRACE_PERIOD_MS -> grace-expiry timer fires
      await drainRoomEconomy(rooms);

      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
      expect(settlement?.totalForfeited).toBe("200");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // never refunded
      const worldBank = await service.getWorldBankSnapshot();
      expect(worldBank.abandonmentForfeitureRevenue).toBe("200");
      expect(worldBank.guestEscrowLiability).toBe("0");
      expect(worldBank.botPrizeRevenue).toBe("0");
    });

    it("chain: after a signed-in successor takes over, that successor later leaving with no further eligible successor forfeits too — the ORIGINAL economic owner stays the same throughout", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B, "1000");
      const guestC = "guest_chain_c";
      repo.testFixture.seedIdentity(guestC, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
      const bobJoin = joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      joinRoomAs(rooms, "s_c", "Casey", host.code, "guest", guestC);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      rooms.setReady("s_c", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId!;

      rooms.leaveRoom("s_a"); // Alice leaves -> Bob becomes host
      const roomRef = peek(rooms, host.code);
      expect(roomRef.hostId).toBe(bobJoin.ok ? bobJoin.playerId : null);
      expect(roomRef.currentMatchId).toBe(matchId); // still committed, continuing

      rooms.leaveRoom("s_b"); // Bob (the new host) ALSO leaves -> only Casey (guest) remains -> forfeits
      await drainRoomEconomy(rooms);

      expect(roomRef.currentMatchId).toBeNull();
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
      expect(settlement?.hostIdentityId).toBe(MEMBER_A); // ORIGINAL economic owner — never changes across handoffs
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // 5000 - 100, never refunded
      expect((await service.getWallet(MEMBER_B)).balance).toBe("900"); // 1000 - 100 commitment, never refunded
    });

    it("a local pass-and-play seat cannot inherit an economically active match — forfeits rather than continuing under a phantom host", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
      rooms.addLocalPlayer("s_a", "Buddy"); // pass-and-play seat: no socket, no identityId
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId!;
      expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // 2 seats @ 100

      rooms.leaveRoom("s_a"); // Alice leaves; only the local seat remains — not a valid successor
      await drainRoomEconomy(rooms);

      expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // never refunded
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
    });
  });

  describe("completed-match teardown — no reclassification as abandonment (regression)", () => {
    it("completed GUEST-vs-bot match: guest leaving afterward queues no refund, no forfeiture, no second settlement", async () => {
      const { repo, service } = freshEconomy();
      const guestHostId = "guest_completed_regression";
      repo.testFixture.seedWallet({ identityId: guestHostId, identityKind: "guest", balance: "2000", lifetimeGranted: "2000", starterGranted: true });
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "GuestHost", "rps", "guest", guestHostId);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      expect(peek(rooms, host.code).currentMatchId).toBeNull();

      playToNaturalCompletion(rooms, "s_a");
      await drainRoomEconomy(rooms);
      const roomRef = peek(rooms, host.code);
      expect(roomRef.phase).toBe("finished");
      expect(roomRef.lifecycleState).toBe("COMPLETED");
      expect(roomRef.currentMatchId).toBeNull();

      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");
      const settleSpy = vi.spyOn(service, "settleMatchEconomy");
      const abandonedMetricSpy = vi.spyOn(metricsCollector, "onRoomAbandoned");

      rooms.leaveRoom("s_a"); // the guest (final human) leaves the already-completed room
      await drainRoomEconomy(rooms);

      expect(refundSpy).not.toHaveBeenCalled();
      expect(forfeitSpy).not.toHaveBeenCalled();
      expect(settleSpy).not.toHaveBeenCalled(); // no second economic outcome of any kind
      expect(abandonedMetricSpy).not.toHaveBeenCalled(); // never counted as an abandonment
      expect(roomRef.lifecycleState).toBe("CLOSED"); // COMPLETED -> CLOSED directly, never ABANDONED
      expect((await service.getWallet(guestHostId)).balance).toBe("2000"); // untouched — free practice match
    });

    it("completed SIGNED-IN MEMBER-vs-bot match: host leaving afterward queues no refund, no forfeiture", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      expect(peek(rooms, host.code).currentMatchId).toBeNull();

      playToNaturalCompletion(rooms, "s_a");
      await drainRoomEconomy(rooms);
      const balanceAfterCompletion = (await service.getWallet(MEMBER_A)).balance;
      expect(balanceAfterCompletion).toBe("5000"); // untouched — free practice match

      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

      rooms.leaveRoom("s_a");
      await drainRoomEconomy(rooms);

      expect(refundSpy).not.toHaveBeenCalled();
      expect(forfeitSpy).not.toHaveBeenCalled();
      expect((await service.getWallet(MEMBER_A)).balance).toBe(balanceAfterCompletion); // exact balance, untouched
    });

    it("completed SUPER_ADMIN-vs-bot match: host leaving afterward queues no refund, no forfeiture", async () => {
      const { repo, service } = freshEconomy();
      const superAdminId = "aaaaaaaa-9999-8888-7777-666666666666";
      seedMember(repo, superAdminId);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "RootAdmin", "rps", "super_admin", superAdminId);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      expect(peek(rooms, host.code).currentMatchId).toBeNull();

      playToNaturalCompletion(rooms, "s_a");
      await drainRoomEconomy(rooms);
      const balanceAfterCompletion = (await service.getWallet(superAdminId)).balance;
      expect(balanceAfterCompletion).toBe("5000");

      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

      rooms.leaveRoom("s_a");
      await drainRoomEconomy(rooms);

      expect(refundSpy).not.toHaveBeenCalled();
      expect(forfeitSpy).not.toHaveBeenCalled();
      expect((await service.getWallet(superAdminId)).balance).toBe(balanceAfterCompletion);
    });

    it("completed MULTIPLAYER match (two signed-in members, no bots): all humans leaving afterward queues no refund, no forfeiture", async () => {
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

      playRpsToCompletion(rooms, "s_a", "s_b"); // Alice wins outright, no departure involved
      await drainRoomEconomy(rooms);
      expect((await service.getSettlement(matchId))?.status).toBe("SETTLED");

      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");
      const roomRef = peek(rooms, host.code);

      rooms.leaveRoom("s_b"); // first human leaves — the other (Alice) still remains, hasHumanPlayer stays true
      expect(roomRef.lifecycleState).toBe("COMPLETED"); // untouched by a departure that isn't the last human
      rooms.leaveRoom("s_a"); // Alice, the LAST human, leaves the already-completed room
      await drainRoomEconomy(rooms);

      expect(refundSpy).not.toHaveBeenCalled();
      expect(forfeitSpy).not.toHaveBeenCalled();
      expect(roomRef.lifecycleState).toBe("CLOSED");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5060"); // untouched final prize
    });

    it("duplicate post-completion leave is idempotent: the second leaveRoom call for an already-torn-down room is a safe no-op", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      playToNaturalCompletion(rooms, "s_a");
      await drainRoomEconomy(rooms);

      rooms.leaveRoom("s_a"); // tears the completed room down
      await drainRoomEconomy(rooms);
      const balanceAfterFirstLeave = (await service.getWallet(MEMBER_A)).balance;

      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

      expect(() => rooms.leaveRoom("s_a")).not.toThrow(); // socketToRoom mapping is already gone — must no-op cleanly
      await drainRoomEconomy(rooms);

      expect(refundSpy).not.toHaveBeenCalled();
      expect(forfeitSpy).not.toHaveBeenCalled();
      expect((await service.getWallet(MEMBER_A)).balance).toBe(balanceAfterFirstLeave);
    });

    it("disconnect-expiry after completion does not abandon or refund — grace timer fires on an already-finished room", async () => {
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
      const roomRef = peek(rooms, host.code);
      expect(roomRef.lifecycleState).toBe("COMPLETED");

      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");
      const abandonedMetricSpy = vi.spyOn(metricsCollector, "onRoomAbandoned");

      rooms.handleDisconnect("s_a"); // Alice closes the tab instead of clicking "leave"
      vi.advanceTimersByTime(11 * 60_000); // past MATCH_GRACE_PERIOD_MS -> grace-expiry timer fires
      await drainRoomEconomy(rooms);

      expect(refundSpy).not.toHaveBeenCalled();
      expect(forfeitSpy).not.toHaveBeenCalled();
      expect(abandonedMetricSpy).not.toHaveBeenCalled();
      expect(roomRef.lifecycleState).toBe("COMPLETED"); // Bob still in room
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("SETTLED");
      expect(settlement?.totalRefunded).toBe("0");
      expect(settlement?.totalForfeited).toBe("0");
    });

    it("lifecycle never transitions COMPLETED -> ABANDONED: post-completion teardown goes straight to CLOSED", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      playToNaturalCompletion(rooms, "s_a");
      await drainRoomEconomy(rooms);
      const roomRef = peek(rooms, host.code);
      expect(roomRef.lifecycleState).toBe("COMPLETED");

      const abandonedMetricSpy = vi.spyOn(metricsCollector, "onRoomAbandoned");
      rooms.leaveRoom("s_a");

      // If the buggy path had fired, onRoomAbandoned would have been called
      // (it is called ONLY from abandonRoom's genuine-abandonment branch,
      // never from closeConcludedRoom) — this is the precise signal that
      // the room never passed through ABANDONED on its way to CLOSED.
      expect(abandonedMetricSpy).not.toHaveBeenCalled();
      expect(roomRef.lifecycleState).toBe("CLOSED");
    });

    it("room cleanup still fully completes after the final player leaves a completed match: timers cleared, room removed from the map", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      playToNaturalCompletion(rooms, "s_a");
      await drainRoomEconomy(rooms);
      const roomRef = peek(rooms, host.code);

      rooms.leaveRoom("s_a");
      await drainRoomEconomy(rooms);

      expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(false);
      expect(roomRef.cleanupTimers.size).toBe(0);
      expect(roomRef.takeoverTimers.size).toBe(0);
    });

    it("commit-succeeded-but-never-playing departure preserves the existing refund behavior (Required Outcome #4, unaffected by the completed-match guard)", async () => {
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
      const roomRef = peek(rooms, host.code);
      expect(roomRef.phase).toBe("playing");

      // Deterministically construct the documented interleaving race
      // (`requestGameStart`'s own doc comment): commit succeeded
      // (`currentMatchId` stays set), but the match never actually reached
      // active play — simulated directly rather than raced, so this test
      // exercises the DECISION logic (`isMatchAlreadyConcluded` must be
      // false; `wasPlaying` must be false; `currentMatchId` must still
      // route to refund) without depending on exact microtask timing.
      roomRef.phase = "lobby";

      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

      rooms.leaveRoom("s_a");
      rooms.leaveRoom("s_b");
      await drainRoomEconomy(rooms);

      expect(refundSpy).toHaveBeenCalledTimes(1); // the committed-but-never-played case DOES still refund
      expect(forfeitSpy).not.toHaveBeenCalled();
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // fully refunded
      expect((await service.getWallet(MEMBER_B)).balance).toBe("5000");
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("REFUNDED");
    });
  });

  describe("bot victory lifecycle", () => {
    it("in a free bot practice match, a bot victory costs 0 coins and diverts 0 coins", async () => {
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
      expect(worldBank.botPrizeRevenue).toBe("0"); // no coins diverted in free practice
      const alice = await service.getWallet(MEMBER_A);
      expect(alice.balance).toBe("5000"); // 0 coins debited — free practice against bot
    });
  });

  describe("voucher issuance and redemption lifecycle", () => {
    /**
     * Guest-token socket resolution exists via `server/src/sockets/index.ts`
     * (using `resolveIdentity()` and `verifyGuestToken()` from `economyIdentity.ts`).
     * This specific test bypasses the socket layer by seating a guest seat
     * with a directly-supplied `guestIdentityId` into `RoomManager.joinRoom()`.
     * This test focuses on the settlement engine and voucher issuance/redemption
     * lifecycle itself. Complementary socket identity verification and guest
     * token resolution tests live in `server/src/rooms/__tests__/terminalFailureRetry.test.ts`
     * and `server/src/auth/__tests__/guestIdentityProvisioning.test.ts`.
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
      expect(worldBank.guestEscrowLiability).toBe("160");
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
      expect((await service.getWallet(MEMBER_C)).balance).toBe("1060"); // 1000 - 100 (commitment) + 160 (redemption)
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
      seedMember(repo, MEMBER_B);
      const { io, socketEmits } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);

      rooms.startGame("s_a"); // the bypass attempt — no commit was ever made

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("lobby"); // never actually started
      expect(socketEmits.some((e) => e.event === "room:error")).toBe(true);
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // untouched — no bypassed debit
    });

    it("legitimately reaches IN_PROGRESS only via requestGameStart's post-commit call to startGame", async () => {
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
      expect(alice.balance).toBe("5060"); // 4900 + 150 — the forfeit win settled correctly, not refunded
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
      expect(alice.balance).toBe("4900"); // 5000 - 100 committed, NOT refunded — proves isValidRanking was true, not forced false

      const settlement = await service.getSettlement(matchId!);
      expect(settlement?.status).toBe("SETTLED"); // not REFUNDED — a resolved guest identity let this settle for real
      expect(settlement?.totalGuestEscrow).toBe("160"); // 1st-place prize, paid into escrow (a guest never gets a wallet credit)
      expect(settlement?.totalWalletRewarded).toBe("0"); // the winner is a guest, so no member wallet was credited
    });

    it("allows a guest host with 1 bot to start a free practice match with 0 coins deducted", async () => {
      const { repo, service } = freshEconomy();
      repo.testFixture.seedIdentity("guest_bot_host_1", "guest");
      repo.testFixture.seedWallet({
        identityId: "guest_bot_host_1",
        identityKind: "guest",
        balance: "2000",
        lifetimeGranted: "2000",
        starterGranted: true,
      });
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_g", "GuestHost", "rps", "guest", "guest_bot_host_1");
      rooms.addBot("s_g", "Botty");
      rooms.setReady("s_g", true);

      await rooms.requestGameStart("s_g");

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("playing");
      expect(room.currentMatchId).toBeNull();

      const wallet = await service.getWallet("guest_bot_host_1");
      expect(wallet.balance).toBe("2000"); // 0 coins deducted — free practice table
    });

    it("allows a guest host with maximum supported bots (e.g. Ludo 4 seats) to start a free practice match with 0 coins deducted", async () => {
      const { repo, service } = freshEconomy();
      repo.testFixture.seedIdentity("guest_ludo_host", "guest");
      repo.testFixture.seedWallet({
        identityId: "guest_ludo_host",
        identityKind: "guest",
        balance: "2000",
        lifetimeGranted: "2000",
        starterGranted: true,
      });
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_g", "GuestHost", "ludo", "guest", "guest_ludo_host");
      rooms.addBot("s_g", "Bot 1");
      rooms.addBot("s_g", "Bot 2");
      rooms.addBot("s_g", "Bot 3");
      rooms.setReady("s_g", true);

      await rooms.requestGameStart("s_g");

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("playing");
      expect(room.currentMatchId).toBeNull();

      const wallet = await service.getWallet("guest_ludo_host");
      expect(wallet.balance).toBe("2000"); // 0 coins deducted — free practice against bots
    });

    it("allows a guest host to start a free rematch against bots with 0 coins deducted", async () => {
      const { repo, service } = freshEconomy();
      repo.testFixture.seedIdentity("guest_rematch_host", "guest");
      repo.testFixture.seedWallet({
        identityId: "guest_rematch_host",
        identityKind: "guest",
        balance: "2000",
        lifetimeGranted: "2000",
        starterGranted: true,
      });
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_g", "GuestHost", "rps", "guest", "guest_rematch_host");
      rooms.addBot("s_g", "Botty");
      rooms.setReady("s_g", true);

      await rooms.requestGameStart("s_g");
      expect(peek(rooms, host.code).phase).toBe("playing");

      // Play match to completion: Guest "rock" beats bot "scissors"
      const originalRandom = Math.random;
      Math.random = () => 0.8; // bot auto-throw is scissors
      try {
        for (let round = 0; round < 10; round++) {
          rooms.applyMove("s_g", "choose", { choice: "rock" });
          vi.advanceTimersByTime(2100);
        }
      } finally {
        Math.random = originalRandom;
      }
      await drainRoomEconomy(rooms);
      expect(peek(rooms, host.code).phase).toBe("finished");

      // Now request rematch — sole human requester with bots auto-accepts and transitions to playing
      rooms.requestRematch("s_g");
      await vi.advanceTimersByTimeAsync(3000);

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("playing");
      expect(room.currentMatchId).toBeNull();

      const wallet = await service.getWallet("guest_rematch_host");
      expect(wallet.balance).toBe("2000"); // 0 coins deducted across matches
    });

    it("rejects a guest attempting to host a match when another real human player is present", async () => {
      const { repo, service } = freshEconomy();
      repo.testFixture.seedIdentity("guest_human_host", "guest");
      repo.testFixture.seedIdentity("guest_human_joiner", "guest");
      const { io, socketEmits } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_g1", "GuestHost", "rps", "guest", "guest_human_host");
      joinRoomAs(rooms, "s_g2", "GuestOther", host.code, "guest", "guest_human_joiner");
      rooms.setReady("s_g1", true);
      rooms.setReady("s_g2", true);

      await rooms.requestGameStart("s_g1");

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("lobby");
      expect(room.currentMatchId).toBeNull();
      expect(socketEmits.some((e) => e.event === "room:error" && String(e.data).includes("Only a signed-in account can host"))).toBe(true);
    });

    it("rejects match start if the host has no resolved identityId (missing or unprovisioned) in paid match", async () => {
      const { repo, service } = freshEconomy();
      const { io, socketEmits } = makeIo();
      const rooms = new RoomManager(io, service);

      // Host with null identityId in a 2-human match
      const host = createRoomAs(rooms, "s_anon", "Anonymous", "rps", "guest", null);
      joinRoomAs(rooms, "s_g2", "GuestOther", host.code, "guest", "guest_other");
      rooms.setReady("s_anon", true);
      rooms.setReady("s_g2", true);

      await rooms.requestGameStart("s_anon");

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("lobby");
      expect(room.currentMatchId).toBeNull();
      expect(socketEmits.some((e) => e.event === "room:error")).toBe(true);
    });

    it("exposes currentMatchId in RoomPublicState broadcast upon game start", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io, roomEmits } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);

      // In lobby, public state has currentMatchId: null
      const lobbyBroadcast = roomEmits.find((e) => e.event === "room:state")?.data as { currentMatchId?: string | null };
      expect(lobbyBroadcast.currentMatchId).toBeNull();

      await rooms.requestGameStart("s_a");

      // In playing phase, public state broadcasts currentMatchId string
      const room = peek(rooms, host.code);
      expect(room.currentMatchId).toMatch(/^m_/);

      const roomStateEmits = roomEmits.filter((e) => e.event === "room:state");
      const lastBroadcast = roomStateEmits[roomStateEmits.length - 1].data as { currentMatchId?: string | null };
      expect(lastBroadcast.currentMatchId).toBe(room.currentMatchId);
    });
  });

  describe("lastMatchId — the terminal-match-id contract fix", () => {
    it("playing -> finished: the SAME broadcast that reports the match finished already carries the completed match id, with currentMatchId already null", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io, roomEmits } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      const committedMatchId = peek(rooms, host.code).currentMatchId!;
      expect(committedMatchId).toMatch(/^m_/);

      playRpsToCompletion(rooms, "s_a", "s_b");
      await drainRoomEconomy(rooms);

      // The bug this closes: reading currentMatchId from the "finished"
      // broadcast used to always find it already null, with no way back to
      // the match that just concluded. lastMatchId is the fix.
      const roomStateEmits = roomEmits.filter((e) => e.event === "room:state");
      const finishedBroadcast = roomStateEmits[roomStateEmits.length - 1].data as {
        phase: string;
        currentMatchId: string | null;
        lastMatchId: string | null;
      };
      expect(finishedBroadcast.phase).toBe("finished");
      expect(finishedBroadcast.currentMatchId).toBeNull();
      expect(finishedBroadcast.lastMatchId).toBe(committedMatchId);

      // And the settlement it points to is genuinely fetchable — proves
      // "currentMatchId can be cleared while settlement remains accessible".
      const settlement = await service.getSettlement(finishedBroadcast.lastMatchId!);
      expect(settlement?.status).toBe("SETTLED");
    });

    it("abandonment: the room object carries the forfeited match's terminal id up until the room is deleted (no live broadcast recipient exists by the time abandonment fires — see the fix's own report)", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const guestB = "guest_last_match_b";
      repo.testFixture.seedIdentity(guestB, "guest");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Casey", host.code, "guest", guestB);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      // Captured by reference BEFORE the host leaves — abandonRoom
      // deletes the room from RoomManager's own map, but does not destroy
      // this object; its fields are still readable after deletion.
      const roomRef = peek(rooms, host.code);
      const committedMatchId = roomRef.currentMatchId!;

      rooms.leaveRoom("s_a"); // host leaves with only guest remaining -> abandonRoom -> forfeiture
      await drainRoomEconomy(rooms);

      expect(roomRef.currentMatchId).toBeNull();
      expect(roomRef.lastMatchId).toBe(committedMatchId);

      const settlement = await service.getSettlement(committedMatchId);
      expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
      expect(settlement?.totalForfeited).toBe("200");
      expect(settlement?.totalRefunded).toBe("0");
    });

    it("rematch: commits a NEW matchId and resets lastMatchId — a stale terminal id from the previous match never leaks into the new one's broadcasts", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io, roomEmits } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const firstMatchId = peek(rooms, host.code).currentMatchId!;

      rooms.leaveRoom("s_a");
      rooms.leaveRoom("s_b");
      await drainRoomEconomy(rooms);

      // A fresh room for the "second match in the same room" case, since
      // the solo-forfeit path above destroys the room. Re-seat the same
      // identity to prove the SEQUENCE of matches, not just one commit.
      seedMember(repo, MEMBER_C, "5000");
      const { io: io2, roomEmits: roomEmits2 } = makeIo();
      const rooms2 = new RoomManager(io2, service);
      const host2 = createRoomAs(rooms2, "s_c", "Carol", "rps", "member", MEMBER_B);
      joinRoomAs(rooms2, "s_d", "Dan", host2.code, "member", MEMBER_C);
      rooms2.setReady("s_c", true);
      rooms2.setReady("s_d", true);
      await rooms2.requestGameStart("s_c");
      const secondMatchId = peek(rooms2, host2.code).currentMatchId!;

      expect(secondMatchId).not.toBe(firstMatchId);

      const broadcast = roomEmits2.filter((e) => e.event === "room:state").pop()!.data as {
        currentMatchId: string | null;
        lastMatchId: string | null;
      };
      expect(broadcast.currentMatchId).toBe(secondMatchId);
      expect(broadcast.lastMatchId).toBeNull(); // no stale terminal id from an unrelated room/match

      void roomEmits; // unused in this test beyond the first room's setup
    });

    it("a genuine same-room rematch resets lastMatchId back to null the moment the new match commits, even though the previous match's terminal id was just populated", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io, roomEmits } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const firstMatchId = peek(rooms, host.code).currentMatchId!;

      playRpsToCompletion(rooms, "s_a", "s_b");
      await drainRoomEconomy(rooms);
      expect(peek(rooms, host.code).lastMatchId).toBe(firstMatchId);

      // Both accept a rematch — same room, same code, real "finished -> playing".
      rooms.requestRematch("s_a");
      rooms.respondRematch("s_b", "accept");
      await vi.advanceTimersByTimeAsync(3000);

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("playing");
      expect(room.currentMatchId).not.toBeNull();
      expect(room.currentMatchId).not.toBe(firstMatchId); // a genuinely new commit
      expect(room.lastMatchId).toBeNull(); // the old terminal id is now stale and must not leak forward

      const lastBroadcast = roomEmits.filter((e) => e.event === "room:state").pop()!.data as {
        currentMatchId: string | null;
        lastMatchId: string | null;
      };
      expect(lastBroadcast.currentMatchId).toBe(room.currentMatchId);
      expect(lastBroadcast.lastMatchId).toBeNull();
    });

    it("reconnect during the terminal (finished) state recovers the same match id — a seat reclaim never touches lastMatchId", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      const bobJoin = joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      playRpsToCompletion(rooms, "s_a", "s_b");
      await drainRoomEconomy(rooms);
      const terminalMatchId = peek(rooms, host.code).lastMatchId;
      expect(terminalMatchId).not.toBeNull();

      // Bob reconnects with a NEW socket, reclaiming his original seat via
      // playerId + seatToken — the real reconnect path (RecoveryManager /
      // Room.tsx's own rejoin), not a brand-new join.
      expect(bobJoin.ok).toBe(true);
      const reclaimed = bobJoin.ok
        ? rooms.joinRoom("s_b_new", "Bob", host.code, bobJoin.playerId, bobJoin.seatToken, undefined, "member", MEMBER_B)
        : null;
      expect(reclaimed?.ok).toBe(true);

      expect(peek(rooms, host.code).lastMatchId).toBe(terminalMatchId);
    });

    it("commitment broadcast: committedCostPerSeat/committedTotalPot are the REAL authoritative amounts from the commit result, present exactly while currentMatchId is set", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io, roomEmits } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      const room = peek(rooms, host.code);
      expect(room.committedCostPerSeat).toBe("100"); // matches the 200-total / 2-seat commitment this suite pins elsewhere
      expect(room.committedTotalPot).toBe("200");

      const lastBroadcast = roomEmits.filter((e) => e.event === "room:state").pop()!.data as {
        committedCostPerSeat: string | null;
        committedTotalPot: string | null;
      };
      expect(lastBroadcast.committedCostPerSeat).toBe("100");
      expect(lastBroadcast.committedTotalPot).toBe("200");

      playRpsToCompletion(rooms, "s_a", "s_b");
      await drainRoomEconomy(rooms);

      // Cleared alongside currentMatchId once settlement is queued.
      const finished = peek(rooms, host.code);
      expect(finished.committedCostPerSeat).toBeNull();
      expect(finished.committedTotalPot).toBeNull();
    });
  });
});

describe("orphaned commit-after-teardown race (P0 economy-integrity fix)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("initial commit: final human leaves while commitMatchEntry is pending -> room torn down, commit resolves after -> exactly one compensating refund, no orphaned debit", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");
    const settleSpy = vi.spyOn(service, "settleMatchEconomy");

    const startPromise = rooms.requestGameStart("s_a");
    await committed; // the REAL debit has genuinely happened now — deterministic, no sleep

    expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // real debit confirmed
    expect((await service.getWallet(MEMBER_B)).balance).toBe("4900");
    expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(true); // room still present, mid-flight

    rooms.leaveRoom("s_a");
    rooms.leaveRoom("s_b"); // all humans leave WHILE the commit is still pending
    expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(false); // torn down immediately, before the commit resolved

    gate.resolve(); // release the suspended continuation
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).toHaveBeenCalledWith(matchId, expect.any(String));
    expect(forfeitSpy).not.toHaveBeenCalled(); // never reached active play — must never forfeit
    expect(settleSpy).not.toHaveBeenCalled();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // fully refunded — no stuck debit
    expect((await service.getWallet(MEMBER_B)).balance).toBe("5000");
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("REFUNDED");
    expect(settlement?.totalRefunded).toBe("200");
    const ledger = await service.getLedger(MEMBER_A);
    expect(ledger.filter((e) => e.entryType === "MATCH_REFUND")).toHaveLength(1); // exactly one refund ledger row, not zero, not two
  });

  it("rematch commit: final human leaves while a rematch's commitMatchEntry is pending -> room torn down, commit resolves after -> exactly one compensating refund", async () => {
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
    playRpsToCompletion(rooms, "s_a", "s_b");
    await drainRoomEconomy(rooms);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5060"); // first match settled normally

    rooms.requestRematch("s_a");
    rooms.respondRematch("s_b", "accept");

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

    vi.advanceTimersByTime(3000); // fires the countdown -> requestRematchStart -> gated commitMatchEntry begins
    await committed; // the REAL rematch debit has genuinely happened now

    expect((await service.getWallet(MEMBER_A)).balance).toBe("4960"); // 5060 - 100 (rematch entry)
    expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(true);

    rooms.leaveRoom("s_a");
    rooms.leaveRoom("s_b"); // all humans leave WHILE the rematch commit is pending
    expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(false);

    gate.resolve();
    await drainRoomEconomy(rooms); // drains AFTER the gate — the queued refund lands once the continuation runs

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).toHaveBeenCalledWith(matchId, expect.any(String));
    expect(forfeitSpy).not.toHaveBeenCalled();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5060"); // rematch debit fully reversed, first match's prize untouched
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("REFUNDED");
  });

  it("disconnect-grace expiry occurs while the initial commit is pending -> same compensating refund, no orphaned debit", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

    const startPromise = rooms.requestGameStart("s_a");
    await committed;

    rooms.handleDisconnect("s_a");
    rooms.handleDisconnect("s_b");
    vi.advanceTimersByTime(11 * 60_000); // past MATCH_GRACE_PERIOD_MS -> grace-expiry timer fires -> abandonRoom
    expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(false);

    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(forfeitSpy).not.toHaveBeenCalled();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
    expect((await service.getWallet(MEMBER_B)).balance).toBe("5000");
    expect((await service.getSettlement(matchId))?.status).toBe("REFUNDED");
  });

  it("commit FAILS after the room was already invalidated: no compensating economy operation is created (nothing was ever committed)", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A, "50"); // below the 100 commitment -> commitMatchEntry will reject
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const gate = createDeferred<void>();
    let signalAttempted!: () => void;
    const attempted = new Promise<void>((resolve) => { signalAttempted = resolve; });
    const original = service.commitMatchEntry.bind(service);
    vi.spyOn(service, "commitMatchEntry").mockImplementation(async (request) => {
      signalAttempted();
      await gate.promise;
      return original(request); // rejects for real once released — insufficient funds
    });
    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");
    const settleSpy = vi.spyOn(service, "settleMatchEconomy");

    const startPromise = rooms.requestGameStart("s_a");
    await attempted;

    rooms.leaveRoom("s_a");
    rooms.leaveRoom("s_b"); // room torn down before the (doomed) commit even resolves
    expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(false);

    gate.resolve();
    await startPromise; // rejects internally; requestGameStart's own catch handles it, never throws out
    await drainRoomEconomy(rooms);

    expect(refundSpy).not.toHaveBeenCalled(); // nothing was ever committed — no compensating action needed or taken
    expect(forfeitSpy).not.toHaveBeenCalled();
    expect(settleSpy).not.toHaveBeenCalled();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("50"); // completely untouched
  });

  it("duplicate teardown and late resolution remain idempotent: a second leave/disconnect after the room is already gone changes nothing", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");

    const startPromise = rooms.requestGameStart("s_a");
    await committed;
    rooms.leaveRoom("s_a");
    rooms.leaveRoom("s_b");
    expect(() => rooms.leaveRoom("s_a")).not.toThrow(); // duplicate leave on the same, now-unmapped socket
    expect(() => rooms.handleDisconnect("s_a")).not.toThrow(); // duplicate disconnect, same socket

    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    expect(refundSpy).toHaveBeenCalledTimes(1); // still exactly once, despite the duplicate teardown calls
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
    expect((await service.getWallet(MEMBER_B)).balance).toBe("5000");
  });

  it("late resolution cannot mutate a REPLACEMENT room that reused the same room code", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B, "1000");
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");

    const startPromise = rooms.requestGameStart("s_a");
    await committed;

    rooms.leaveRoom("s_a");
    rooms.leaveRoom("s_b"); // the ORIGINAL room is torn down and deleted from the map
    const internalRooms = (rooms as unknown as { rooms: Map<string, Room> }).rooms;
    expect(internalRooms.has(host.code)).toBe(false);

    // A brand-new, UNRELATED room happens to reuse the exact same code —
    // simulated directly (room codes are otherwise randomly generated) to
    // deterministically prove the late-resolving commit cannot touch it.
    seedMember(repo, MEMBER_C, "1000");
    const replacementHost = createRoomAs(rooms, "s_c", "Carol", "rps", "member", MEMBER_C);
    const replacementRoom = internalRooms.get(replacementHost.code)!;
    expect(replacementRoom.currentMatchId).toBeNull(); // Carol's fresh lobby room — nothing committed for it yet
    internalRooms.delete(replacementHost.code);
    internalRooms.set(host.code, replacementRoom); // now "reusing" the original room's code

    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1); // the orphaned commit still got refunded, not silently dropped
    expect((await service.getSettlement(matchId))?.status).toBe("REFUNDED");
    // The replacement room, now sitting under the reused code, must be
    // completely untouched by the late-resolving continuation — never
    // contaminated with Alice's orphaned matchId.
    expect(replacementRoom.currentMatchId).toBeNull();
    expect((await service.getWallet(MEMBER_C)).balance).toBe("1000"); // Carol's wallet, entirely undisturbed
  });

  it("successful, unaffected initial start still enters active play normally (no false-positive rejection)", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    await rooms.requestGameStart("s_a");

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("playing");
    expect(room.currentMatchId).not.toBeNull();
    expect(refundSpy).not.toHaveBeenCalled();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4900");
    expect((await service.getWallet(MEMBER_B)).balance).toBe("4900");
  });

  it("successful, unaffected rematch still enters active play normally (no false-positive rejection)", async () => {
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
    playRpsToCompletion(rooms, "s_a", "s_b");
    await drainRoomEconomy(rooms);

    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    rooms.requestRematch("s_a");
    rooms.respondRematch("s_b", "accept");
    await vi.advanceTimersByTimeAsync(3000);

    const room = peek(rooms, host.code);
    expect(room.phase).toBe("playing");
    expect(room.currentMatchId).not.toBeNull();
    expect(refundSpy).not.toHaveBeenCalled();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4960"); // 5050 - 100 rematch entry
  });

  it("refund-versus-teardown race cannot produce duplicate terminal operations: exactly one terminal settlement status survives", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const startPromise = rooms.requestGameStart("s_a");
    await committed;
    rooms.leaveRoom("s_a");
    rooms.leaveRoom("s_b");
    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    const settlement = await service.getSettlement(matchId);
    // Exactly one terminal status — never left COMMITTED, never
    // simultaneously touched by a second economic operation.
    expect(settlement?.status).toBe("REFUNDED");
    expect(settlement?.totalRefunded).toBe(settlement?.totalCollected);
    expect(settlement?.totalForfeited).toBe("0");

    // Idempotent replay of the SAME refund must be a safe no-op — proving
    // no double-credit even if something else ever retried it.
    const replay = await service.refundMatchEntry(matchId, "replay probe");
    expect(replay.applied).toBe(false);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
  });

  it("no committed settlement remains stale after the race completes: listStaleCommittedSettlements is empty", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed } = gateCommitMatchEntry(service);
    const startPromise = rooms.requestGameStart("s_a");
    await committed;
    rooms.leaveRoom("s_a");
    rooms.leaveRoom("s_b");
    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    // Fake timers freeze `Date.now()` — advance it for real before checking
    // "older than," so a settlement genuinely stuck at COMMITTED would be
    // caught (createdAt < cutoff only becomes true once time has actually
    // moved past the moment of commit; `olderThanMs: 0` against a frozen
    // clock would otherwise compare createdAt to itself and prove nothing).
    vi.advanceTimersByTime(5_000);
    const stale = await repo.listStaleCommittedSettlements(0);
    expect(stale).toHaveLength(0);
  });

  it("rematch commit: disconnect-grace expiry occurs while a rematch's commitMatchEntry is pending -> exactly one compensating refund", async () => {
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
    playRpsToCompletion(rooms, "s_a", "s_b");
    await drainRoomEconomy(rooms);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5060");

    rooms.requestRematch("s_a");
    rooms.respondRematch("s_b", "accept");

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

    vi.advanceTimersByTime(3000); // fires the countdown -> requestRematchStart
    await committed;

    expect((await service.getWallet(MEMBER_A)).balance).toBe("4960");

    rooms.handleDisconnect("s_a");
    rooms.handleDisconnect("s_b");
    vi.advanceTimersByTime(11 * 60_000); // disconnect grace expires -> room abandoned
    expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(false);

    gate.resolve();
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(forfeitSpy).not.toHaveBeenCalled();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5060");
    expect((await service.getSettlement(matchId))?.status).toBe("REFUNDED");
  });

  it("host departure with remaining human successor while commit is pending -> host changed, commit refunded, game not started with mismatched host", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B, "1000");
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");

    const startPromise = rooms.requestGameStart("s_a");
    await committed;

    // Alice leaves while commit is pending. Bob is remaining human, so room is NOT deleted, but host is reassigned to Bob
    rooms.leaveRoom("s_a");
    const liveRoom = peek(rooms, host.code);
    expect(liveRoom.hostId).not.toBe("s_a"); // host reassigned

    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1); // Alice's debit refunded
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
    expect((await service.getWallet(MEMBER_B)).balance).toBe("1000"); // Bob untouched
    expect(liveRoom.phase).not.toBe("playing"); // Game did not start under invalidated commit
    expect(liveRoom.currentMatchId).toBeNull();
  });

  it("superseded start-operation token is rejected and refunded if pendingCommitOperationId was altered", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");

    const startPromise = rooms.requestGameStart("s_a");
    await committed;

    // Simulate an operation ID mismatch (e.g. superseded by another operation)
    const liveRoom = peek(rooms, host.code);
    liveRoom.pendingCommitOperationId = "op_superseded_token";

    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
    expect((await service.getSettlement(matchId))?.status).toBe("REFUNDED");
    expect(liveRoom.currentMatchId).toBeNull();
  });

  it("roster change while commit is pending -> commit refunded, game does not start with mismatched seat count", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B, "1000");
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rummy", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");

    const startPromise = rooms.requestGameStart("s_a");
    await committed;

    // Bob leaves while commit is pending (3 players -> 2 players)
    rooms.leaveRoom("s_b");
    const liveRoom = peek(rooms, host.code);
    expect(liveRoom.players.size).toBe(2);

    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
    expect(liveRoom.phase).toBe("lobby");
    expect(liveRoom.currentMatchId).toBeNull();
  });

  it("same-size roster swap (human leaves, bot fills the seat) during pending commit -> commit refunded, game does not start with a different participant than was billed", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B, "1000");
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const { gate, committed, spy: commitSpy } = gateCommitMatchEntry(service);
    const refundSpy = vi.spyOn(service, "refundMatchEntry");

    const startPromise = rooms.requestGameStart("s_a");
    await committed;

    // Bob (a real, committed human) leaves; a bot fills the vacated seat.
    // Roster SIZE returns to what it was at commit time, and the bot is
    // ready by default — a count+readiness-only check cannot distinguish
    // this from "nothing changed", even though the match was priced for
    // 2 humans (humanSeatCount=2, botSeatCount=0) and would now start as
    // 1 human + 1 bot.
    rooms.leaveRoom("s_b");
    rooms.addBot("s_a", "Botty");
    const liveRoom = peek(rooms, host.code);
    expect(liveRoom.players.size).toBe(2);
    expect(Array.from(liveRoom.players.values()).every((p) => p.isReady)).toBe(true);

    gate.resolve();
    await startPromise;
    await drainRoomEconomy(rooms);

    const matchId = (commitSpy.mock.calls[0][0] as { matchId: string }).matchId;
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
    expect(liveRoom.phase).not.toBe("playing");
    expect(liveRoom.currentMatchId).toBeNull();
    expect((await service.getSettlement(matchId))?.status).toBe("REFUNDED");
  });

  it("requestRematchStart reentrancy: two overlapping triggers on the same accepted rematch reach commitMatchEntry at most once", async () => {
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
    playRpsToCompletion(rooms, "s_a", "s_b");
    await drainRoomEconomy(rooms);

    const liveRoom = peek(rooms, host.code);
    rooms.requestRematch("s_a");
    rooms.respondRematch("s_b", "accept");
    expect(liveRoom.rematch.status).toBe("accepted");

    const commitSpy = vi.spyOn(service, "commitMatchEntry");
    const rm = rooms as unknown as { requestRematchStart(room: Room): Promise<void> };

    // Two overlapping triggers on the SAME accepted rematch, neither
    // awaited before the second fires — exactly the window the reentrancy
    // guard exists to close. Before the fix, both reached
    // `commitMatchEntry` (two real wallet debits for one rematch).
    const p1 = rm.requestRematchStart(liveRoom);
    const p2 = rm.requestRematchStart(liveRoom);
    await Promise.all([p1, p2]);
    await drainRoomEconomy(rooms);

    expect(commitSpy).toHaveBeenCalledTimes(1);
  });
});

describe("P0 seat-capacity contract (2026-08-28 production incident regression)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reproduces the exact incident: Indian Rummy, host + 5 bots (6/6), all ready, Start Game — free bot practice match, zero coin debit", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rummy", "member", MEMBER_A);
    for (let i = 0; i < 5; i++) rooms.addBot("s_a", `Bot${i}`);
    rooms.setReady("s_a", true);

    const liveRoom = peek(rooms, host.code);
    expect(liveRoom.players.size).toBe(6);
    expect(Array.from(liveRoom.players.values()).every((p) => p.isReady)).toBe(true);

    const commitSpy = vi.spyOn(service, "commitMatchEntry");
    const refundSpy = vi.spyOn(service, "refundMatchEntry");
    const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

    await rooms.requestGameStart("s_a");

    // Free practice match against bots: 0 coins charged, commitMatchEntry skipped
    expect(commitSpy).not.toHaveBeenCalled();

    // The game successfully starts with 6 seats (host + 5 bots)
    expect(liveRoom.phase).toBe("playing");
    expect(liveRoom.lifecycleState).toBe("IN_PROGRESS");
    expect(liveRoom.currentMatchId).toBeNull();

    // 0 coins debited from host
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");

    await drainRoomEconomy(rooms);
    expect(refundSpy).not.toHaveBeenCalled();
    expect(forfeitSpy).not.toHaveBeenCalled();
  });

  it("checkout (quoteMatchCheckout) and commitment (commitMatchEntry) reject for seat count exceeding capacity (13 seats) — both reject, identically, before debit", async () => {
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);

    await expect(
      service.quoteMatchCheckout({ hostIdentityId: MEMBER_A, seatCount: 13, humanSeatCount: 1, botSeatCount: 12 }),
    ).rejects.toMatchObject({ code: "INVALID_SEAT_CONFIGURATION" });

    await expect(
      service.commitMatchEntry({
        matchId: "m_checkout_parity_test", roomCode: "PARITY", hostIdentityId: MEMBER_A,
        seatCount: 13, humanSeatCount: 1, botSeatCount: 12, isSolo: false,
      }),
    ).rejects.toMatchObject({ code: "INVALID_SEAT_CONFIGURATION" });

    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");
  });

  it("six REAL human participants (no bots) in Rummy now succeeds under expanded capacity: checkout succeeds, commit succeeds, and game starts", async () => {
    const { repo, service } = freshEconomy();
    const memberIds = [
      MEMBER_A, MEMBER_B, MEMBER_C,
      "dddddddd-1111-2222-3333-444444444444",
      "eeeeeeee-1111-2222-3333-444444444444",
      "ffffffff-1111-2222-3333-444444444444",
    ];
    for (const id of memberIds) seedMember(repo, id);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_1", "P1", "rummy", "member", memberIds[0]);
    for (let i = 1; i < 6; i++) joinRoomAs(rooms, `s_${i + 1}`, `P${i + 1}`, host.code, "member", memberIds[i]);
    for (let i = 0; i < 6; i++) rooms.setReady(`s_${i + 1}`, true);

    const liveRoom = peek(rooms, host.code);
    expect(liveRoom.players.size).toBe(6);

    const commitSpy = vi.spyOn(service, "commitMatchEntry");
    await rooms.requestGameStart("s_1");

    expect(commitSpy).toHaveBeenCalledWith(expect.objectContaining({ seatCount: 6, humanSeatCount: 6, botSeatCount: 0 }));
    expect(liveRoom.phase).toBe("playing");
    expect(liveRoom.currentMatchId).not.toBeNull();
  });

  it("a supported 5-seat match is completely unaffected by this fix: checkout succeeds, commit succeeds exactly once, the game starts, and participants are debited correctly", async () => {
    const { repo, service } = freshEconomy();
    const memberIds = [
      MEMBER_A, MEMBER_B, MEMBER_C,
      "dddddddd-1111-2222-3333-444444444444",
      "eeeeeeee-1111-2222-3333-444444444444",
    ];
    for (const id of memberIds) seedMember(repo, id);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_1", "P1", "rummy", "member", memberIds[0]);
    for (let i = 1; i < 5; i++) joinRoomAs(rooms, `s_${i + 1}`, `P${i + 1}`, host.code, "member", memberIds[i]);
    for (let i = 0; i < 5; i++) rooms.setReady(`s_${i + 1}`, true);

    const liveRoom = peek(rooms, host.code);
    expect(liveRoom.players.size).toBe(5);

    const quote = await service.quoteMatchCheckout({ hostIdentityId: MEMBER_A, seatCount: 5, humanSeatCount: 5, botSeatCount: 0 });
    expect(quote.hasSufficientFunds).toBe(true);

    const commitSpy = vi.spyOn(service, "commitMatchEntry");
    await rooms.requestGameStart("s_1");

    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(liveRoom.phase).toBe("playing");
    expect(liveRoom.currentMatchId).not.toBeNull();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // 5000 - 100
  });
});

/** Waits for RoomManager's internal settlement/refund queue to finish. */
async function drainRoomEconomy(rooms: RoomManager): Promise<void> {
  await rooms.drainEconomySettlementQueue();
}
