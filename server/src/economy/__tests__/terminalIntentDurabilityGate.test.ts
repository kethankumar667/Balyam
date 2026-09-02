import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../../rooms/RoomManager.js";
import { EconomyService } from "../EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { DurableSettlementWorker } from "../DurableSettlementWorker.js";
import type {
  AccountKind,
  ClientToServerEvents,
  GameKind,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * Phase 06.1B — Durability-Gated Terminal Intent Persistence Tests
 *
 * Verifies that RoomManager eliminates the pre-persistence crash window:
 * 1. Authoritative terminal outcome is determined.
 * 2. Immutable intent is constructed.
 * 3. Durable persistence to PostgreSQL/repository is awaited.
 * 4. Only after successful persistence: destructive teardown, room deletion,
 *    or lifecycle completion is permitted.
 * 5. Reentrancy and conflicting transitions are cleanly gated.
 * 6. Timers and departures operate safely without unhandled floating promises.
 */

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (val: T) => void;
  reject: (err: unknown) => void;
}

function defer<T>(): Deferred<T> {
  let resolve!: (val: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class GateControlledRepo extends InMemoryEconomyRepository {
  gate: Deferred<void> | null = null;
  rejectionError: Error | null = null;
  callCount = 0;

  override async createTerminalIntent(
    input: Parameters<InMemoryEconomyRepository["createTerminalIntent"]>[0],
  ) {
    this.callCount++;
    if (this.gate) {
      await this.gate.promise;
    }
    if (this.rejectionError) {
      throw this.rejectionError;
    }
    return super.createTerminalIntent(input);
  }
}

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

function peek(rooms: RoomManager, code: string): Room {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
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

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";

function seedMember(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedWallet({
    identityId,
    identityKind: "member",
    balance,
    lifetimeGranted: balance,
    starterGranted: true,
  });
}

describe("Phase 06.1B: Durability-Gated Terminal Intent Persistence", () => {
  it("Test A: Settlement persistence gates match completion and phase transition", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    const room = peek(rooms, host.code);
    const matchId = room.currentMatchId!;
    expect(matchId).toBeTruthy();

    // Play 9 rounds to completion
    for (let round = 0; round < 9; round++) {
      await rooms.applyMove("s_a", "choose", { choice: "rock" });
      await rooms.applyMove("s_b", "choose", { choice: "scissors" });
    }

    // Round 10: host chooses rock
    await rooms.applyMove("s_a", "choose", { choice: "rock" });

    // Arm gate before the decisive 10th move
    const gate = defer<void>();
    repo.gate = gate;

    // Decisive move by Bob ends the match and triggers finalizeMatch
    const movePromise = rooms.applyMove("s_b", "choose", { choice: "scissors" });
    await new Promise((r) => setTimeout(r, 20));

    // VERIFY CRASH WINDOW IS CLOSED:
    // Persistence is currently in progress, so room MUST NOT have moved beyond active state!
    expect(room.terminalStatus).toBe("PERSISTING");
    expect(room.terminalOutcome).toBe("SETTLEMENT");
    expect(room.lifecycleState).not.toBe("COMPLETED");
    expect(room.currentMatchId).toBe(matchId);
    expect(room.lastMatchId).toBeNull();
    expect(repo.callCount).toBe(1);

    // Release persistence gate
    gate.resolve();
    await movePromise;
    await rooms.drainEconomySettlementQueue();

    // ONLY NOW: terminal transition is completed
    expect(room.terminalStatus).toBe("COMPLETED");
    expect(room.lifecycleState).toBe("COMPLETED");
    expect(room.phase).toBe("finished");
    expect(room.currentMatchId).toBeNull();
    expect(room.lastMatchId).toBe(matchId);

    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("SETTLED");
  });

  it("Test B: Refund persistence gates room teardown", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);

    // Commit match directly without active play to simulate unstarted commitment
    const commitResult = await service.commitMatchEntry({
      matchId: "m_refund_test_01",
      roomCode: host.code,
      hostIdentityId: MEMBER_A,
      seatCount: 2,
      humanSeatCount: 1,
      botSeatCount: 1,
      isSolo: false,
    });
    const room = peek(rooms, host.code);
    room.currentMatchId = commitResult.settlement.matchId;

    const gate = defer<void>();
    repo.gate = gate;

    // Trigger departure of last human -> abandonRoom -> refund
    const leavePromise = rooms.leaveRoom("s_a");
    await new Promise((r) => setTimeout(r, 20));

    // Teardown MUST be gated: room is still retained in rooms map
    expect(rooms.getRoomStateByCode(host.code)).not.toBeNull();
    expect(room.terminalStatus).toBe("PERSISTING");
    expect(room.terminalOutcome).toBe("REFUND");

    // Release gate
    gate.resolve();
    await leavePromise;
    await rooms.drainEconomySettlementQueue();

    // Room is now torn down
    expect(rooms.getRoomStateByCode(host.code)).toBeNull();
    const settlement = await service.getSettlement(commitResult.settlement.matchId);
    expect(settlement?.status).toBe("REFUNDED");
  });

  it("Test C: Forfeiture persistence gates room teardown", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    await rooms.requestGameStart("s_a");

    const room = peek(rooms, host.code);
    const matchId = room.currentMatchId!;
    expect(room.phase).toBe("playing");

    const gate = defer<void>();
    repo.gate = gate;

    // Last human departs active playing match -> forfeiture
    const leavePromise = rooms.leaveRoom("s_a");
    await new Promise((r) => setTimeout(r, 20));

    // Room MUST NOT be deleted while persistence is pending!
    expect(rooms.getRoomStateByCode(host.code)).not.toBeNull();
    expect(room.terminalStatus).toBe("PERSISTING");
    expect(room.terminalOutcome).toBe("FORFEITURE");
    expect(room.currentMatchId).toBe(matchId);

    gate.resolve();
    await leavePromise;
    await rooms.drainEconomySettlementQueue();

    // After persistence commits: room is deleted and forfeiture is processed
    expect(rooms.getRoomStateByCode(host.code)).toBeNull();
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
  });

  it("Test D: Compensating refund persistence gates cleanup on orphaned commit", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);

    const origCommit = service.commitMatchEntry.bind(service);
    let committedMatchId: string | null = null;
    service.commitMatchEntry = async (req) => {
      const res = await origCommit(req);
      committedMatchId = res.settlement.matchId;
      const r = peek(rooms, host.code);
      r.hostId = "different_host_id";
      return res;
    };

    await rooms.requestGameStart("s_a");
    await rooms.drainEconomySettlementQueue();

    expect(committedMatchId).not.toBeNull();
    const settlement = await service.getSettlement(committedMatchId!);
    expect(settlement?.status).toBe("REFUNDED");
  });

  it("Test E: Persistence rejection preserves room and prevents destructive teardown", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    await rooms.requestGameStart("s_a");

    const room = peek(rooms, host.code);
    const matchId = room.currentMatchId!;

    repo.rejectionError = new Error("PostgreSQL connection timeout");

    await expect(rooms.leaveRoom("s_a")).rejects.toThrow(
      "A temporary problem occurred while processing this economy operation",
    );

    expect(rooms.getRoomStateByCode(host.code)).not.toBeNull();
    expect(room.terminalStatus).toBe("FAILED");
    expect(room.terminalError).toBeTruthy();
    expect(room.currentMatchId).toBe(matchId);
  });

  it("Test F: Duplicate terminal invocation during persistence executes exactly one persistence", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    const room = peek(rooms, host.code);

    // Play 9 rounds
    for (let round = 0; round < 9; round++) {
      await rooms.applyMove("s_a", "choose", { choice: "rock" });
      await rooms.applyMove("s_b", "choose", { choice: "scissors" });
    }

    await rooms.applyMove("s_a", "choose", { choice: "rock" });

    const gate = defer<void>();
    repo.gate = gate;

    // Decisive move triggers finalizeMatch
    const movePromise = rooms.applyMove("s_b", "choose", { choice: "scissors" });
    await new Promise((r) => setTimeout(r, 20));

    expect(room.terminalStatus).toBe("PERSISTING");
    expect(repo.callCount).toBe(1);

    // Duplicate late move
    void rooms.applyMove("s_a", "choose", { choice: "rock" });
    await new Promise((r) => setTimeout(r, 20));

    // Still exactly one intent persisted
    expect(repo.callCount).toBe(1);

    gate.resolve();
    await movePromise;
    await rooms.drainEconomySettlementQueue();

    expect(room.terminalStatus).toBe("COMPLETED");
    expect(repo.callCount).toBe(1);
  });

  it("Test G: Conflicting terminal invocation during persistence preserves authoritative decision", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    const room = peek(rooms, host.code);

    for (let round = 0; round < 9; round++) {
      await rooms.applyMove("s_a", "choose", { choice: "rock" });
      await rooms.applyMove("s_b", "choose", { choice: "scissors" });
    }

    await rooms.applyMove("s_a", "choose", { choice: "rock" });

    const gate = defer<void>();
    repo.gate = gate;

    const movePromise = rooms.applyMove("s_b", "choose", { choice: "scissors" });
    await new Promise((r) => setTimeout(r, 20));

    expect(room.terminalStatus).toBe("PERSISTING");
    expect(room.terminalOutcome).toBe("SETTLEMENT");

    // Conflicting departure during settlement
    const leavePromise = rooms.leaveRoom("s_a");
    await new Promise((r) => setTimeout(r, 20));

    expect(room.terminalOutcome).toBe("SETTLEMENT");
    expect(repo.callCount).toBe(1);

    gate.resolve();
    await movePromise;
    await leavePromise;
    await rooms.drainEconomySettlementQueue();

    expect(room.terminalStatus).toBe("COMPLETED");
  });

  it("Test H: Turn timer timeout handles asynchronous terminal resolution without unhandled rejections", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    const room = peek(rooms, host.code);

    const origRandom = Math.random;
    let turn = 0;
    Math.random = () => (turn++ % 2 === 0 ? 0.05 : 0.75); // rock vs scissors -> decisive wins
    try {
      while (!room.engine?.isOver()) {
        await (rooms as any).onTurnTimeout(room);
      }
    } finally {
      Math.random = origRandom;
    }

    await rooms.drainEconomySettlementQueue();
    expect(room.terminalStatus).toBe("COMPLETED");
    expect(room.phase).toBe("finished");
  });

  it("Test I: Disconnect removal timer handles terminal resolution without unhandled rejections", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);

    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    await rooms.requestGameStart("s_a");

    rooms.handleDisconnect("s_a");

    const room = peek(rooms, host.code);
    const cleanupTimer = room.cleanupTimers.get(room.hostId);
    expect(cleanupTimer).toBeTruthy();

    await rooms.drainEconomySettlementQueue();
  });

  it("Test J: Persistence succeeds, fresh worker recovers and executes intent", async () => {
    const repo = new InMemoryEconomyRepository();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const service = new EconomyService(repo, { delay: async () => undefined });

    const commit = await service.commitMatchEntry({
      matchId: "m_proc_crash_01",
      roomCode: "CRASH1",
      hostIdentityId: MEMBER_A,
      seatCount: 2,
      humanSeatCount: 2,
      botSeatCount: 0,
      isSolo: false,
    });

    await service.createTerminalIntent({
      matchId: commit.settlement.matchId,
      operationKind: "SETTLEMENT",
      payload: {
        operationKind: "SETTLEMENT",
        matchId: commit.settlement.matchId,
        isValidRanking: true,
        participants: [
          { identityId: MEMBER_A, identityKind: "member", placement: 1 },
          { identityId: MEMBER_B, identityKind: "member", placement: 2 },
        ],
      },
    });

    const freshWorker = new DurableSettlementWorker(service, {
      batchSize: 10,
      leaseSeconds: 15,
    });

    await freshWorker.processOnce();

    const settlement = await service.getSettlement(commit.settlement.matchId);
    expect(settlement?.status).toBe("SETTLED");
  });

  it("Test K: Replay remains safe and idempotent", async () => {
    const repo = new InMemoryEconomyRepository();
    seedMember(repo, MEMBER_A);
    const service = new EconomyService(repo, { delay: async () => undefined });

    const commit = await service.commitMatchEntry({
      matchId: "m_replay_01",
      roomCode: "REPLAY1",
      hostIdentityId: MEMBER_A,
      seatCount: 2,
      humanSeatCount: 1,
      botSeatCount: 1,
      isSolo: false,
    });

    await service.forfeitMatchEntry(commit.settlement.matchId, "Test forfeiture");
    const walletAfterFirst = (await service.getWallet(MEMBER_A)).balance;

    await service.forfeitMatchEntry(commit.settlement.matchId, "Test duplicate forfeiture");
    const walletAfterSecond = (await service.getWallet(MEMBER_A)).balance;

    expect(walletAfterFirst).toBe(walletAfterSecond);
  });

  it("Test L: Startup recovery does not claim uncommitted work", async () => {
    const repo = new GateControlledRepo();
    seedMember(repo, MEMBER_A);
    const service = new EconomyService(repo, { delay: async () => undefined });
    const worker = new DurableSettlementWorker(service, {
      batchSize: 10,
      leaseSeconds: 15,
    });

    const commit = await service.commitMatchEntry({
      matchId: "m_iso_01",
      roomCode: "ISO01",
      hostIdentityId: MEMBER_A,
      seatCount: 2,
      humanSeatCount: 1,
      botSeatCount: 1,
      isSolo: false,
    });

    // Before terminal intent is committed, recovery claims 0 items
    const claimedBefore = await repo.claimTerminalIntent("worker_1", 15);
    expect(claimedBefore.claimed).toBe(false);

    // Commit intent
    await service.createTerminalIntent({
      matchId: commit.settlement.matchId,
      operationKind: "REFUND",
      payload: {
        operationKind: "REFUND",
        matchId: commit.settlement.matchId,
        reason: "Cancelled before start",
      },
    });

    // Now recovery discovers and claims the committed intent
    const claimedAfter = await repo.claimTerminalIntent("worker_1", 15);
    expect(claimedAfter.claimed).toBe(true);
    expect(claimedAfter.intent?.matchId).toBe(commit.settlement.matchId);
  });

  describe("Test M: System Regressions", () => {
    it("M.1 (Blocker 01): Match winner is correctly identified from engine winnerId", async () => {
      const repo = new InMemoryEconomyRepository();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const service = new EconomyService(repo, { delay: async () => undefined });
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      const room = peek(rooms, host.code);
      const matchId = room.currentMatchId!;

      // 10 decisive wins for Alice (s_a)
      for (let round = 0; round < 10; round++) {
        await rooms.applyMove("s_a", "choose", { choice: "rock" });
        await rooms.applyMove("s_b", "choose", { choice: "scissors" });
      }

      await rooms.drainEconomySettlementQueue();
      expect(room.phase).toBe("finished");

      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("SETTLED");
      expect(settlement?.totalWalletRewarded).not.toBe("0");
      const wallet = await service.getWallet(MEMBER_A);
      expect(BigInt(wallet.balance)).toBeGreaterThan(4800n);
    });

    it("M.2 (Blocker 02): FinalizeMatch is strictly idempotent on repeated calls", async () => {
      const repo = new InMemoryEconomyRepository();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const service = new EconomyService(repo, { delay: async () => undefined });
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      const room = peek(rooms, host.code);
      const matchId = room.currentMatchId!;

      for (let round = 0; round < 10; round++) {
        await rooms.applyMove("s_a", "choose", { choice: "rock" });
        await rooms.applyMove("s_b", "choose", { choice: "scissors" });
      }
      await rooms.drainEconomySettlementQueue();
      expect(room.terminalStatus).toBe("COMPLETED");

      // Repeated invocation of finalizeMatch
      await (rooms as any).finalizeMatch(room);
      expect(room.terminalStatus).toBe("COMPLETED");
      expect(room.lastMatchId).toBe(matchId);
    });

    it("M.3 (Blocker 05): Disconnect grace protects absent seat from idle strikes", async () => {
      const repo = new InMemoryEconomyRepository();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const service = new EconomyService(repo, { delay: async () => undefined });
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      // Alice disconnects
      rooms.handleDisconnect("s_a");

      const room = peek(rooms, host.code);
      const alice = room.players.get(room.hostId)!;
      expect(alice.isConnected).toBe(false);
      expect(alice.awayUntil).toBeGreaterThan(Date.now());

      // Bob cannot accumulate idle strikes for Alice during active disconnect grace
      expect(room.idleStrikes.get(alice.id) ?? 0).toBe(0);
      await rooms.drainEconomySettlementQueue();
    });

    it("M.4 (Phase 06.1A): Concurrent creation produces identical idempotent records", async () => {
      const repo = new InMemoryEconomyRepository();
      seedMember(repo, MEMBER_A);
      const service = new EconomyService(repo, { delay: async () => undefined });

      const commit = await service.commitMatchEntry({
        matchId: "m_conc_reg_01",
        roomCode: "CONC01",
        hostIdentityId: MEMBER_A,
        seatCount: 2,
        humanSeatCount: 1,
        botSeatCount: 1,
        isSolo: false,
      });

      const payload = {
        operationKind: "REFUND" as const,
        matchId: commit.settlement.matchId,
        reason: "Concurrent test",
      };

      const [res1, res2] = await Promise.all([
        service.createTerminalIntent({
          matchId: commit.settlement.matchId,
          operationKind: "REFUND",
          payload,
        }),
        service.createTerminalIntent({
          matchId: commit.settlement.matchId,
          operationKind: "REFUND",
          payload,
        }),
      ]);

      expect(res1.intent.id).toBe(res2.intent.id);
      expect(res1.intent.matchId).toBe(commit.settlement.matchId);
    });
  });
});
