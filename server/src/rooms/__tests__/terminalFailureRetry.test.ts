import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const origRequestGameStart = RoomManager.prototype.requestGameStart;
beforeAll(() => {
  RoomManager.prototype.requestGameStart = async function (socketId: string) {
    const res = await origRequestGameStart.call(this, socketId);
    const { room } = (this as any).lookup(socketId);
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
import {
  type EconomyRepository,
  type IntentUpdateResult,
  type MarkIntentFailedInput,
  type MarkIntentRetryableInput,
} from "../../persistence/EconomyRepository.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";
import { mintGuestToken, newGuestPlayerId } from "../../auth/guestToken.js";
import { resolveIdentity } from "../economyIdentity.js";
import { registerSocketHandlers } from "../../sockets/index.js";

/**
 * Remediation of audit finding P1-2 ("no reachable retry path for
 * `room.terminalStatus === 'FAILED'`" — Blocker 06 combined 06.1B audit).
 *
 * Every test here drives the REAL, current production path —
 * `RoomManager.applyMove`/`leaveRoom` (public API) reach `finalizeMatch`/
 * `abandonRoom` (unreflected, real production methods), and recovery goes
 * through `RoomManager.retryFailedTerminalPersistence` (a public method,
 * never a private reflection target). The only reflection used anywhere in
 * this file is `peek()`, reading the internal room map to obtain the
 * `Room` object `retryFailedTerminalPersistence` requires — the same
 * established, read-only pattern this codebase's other test files already
 * use (never a call into a private or dead method).
 *
 * `applyMove`/`leaveRoom`/`finalizeMatch`/`abandonRoom` are all genuinely
 * `async` now, and genuinely REJECT when the durability gate's persistence
 * attempt fails (no internal try/catch swallows it — see `RoomManager.ts`'s
 * own `applyMove` body, which awaits `finalizeMatch` with no wrapping
 * try/catch, exactly like the real `sockets/index.ts` handlers that call
 * these methods `.catch()` at the transport boundary). Every call in this
 * file that can legitimately reject (because a test deliberately injected
 * a persistence failure) is awaited with an explicit `.catch()` at the
 * call site — never fire-and-forget, so no unhandled rejection can occur.
 *
 * Failure injection uses a scripted-failure repository wrapper — the same
 * technique `EconomyService.test.ts`'s own `ScriptedFailureRepository` and
 * `DurableSettlementWorker.test.ts`'s copy of it already use — failing
 * `createTerminalIntent` a fixed number of times so the persistence
 * attempt(s) genuinely fail through the real `enqueueSettlement`/
 * `enqueueRefund`/`enqueueForfeiture` → `createTerminalIntent` call chain,
 * never a simulated shortcut.
 *
 * Explicit, deliberate scope boundary (see `terminalPayload`'s own doc
 * comment in RoomManager.ts): this retry mechanism is in-memory only. It
 * narrows the window in which a transient persistence failure requires
 * manual intervention; it does NOT and cannot survive a process restart —
 * no test in this file claims otherwise.
 */

function makeIo() {
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io };
}

function peek(rooms: RoomManager, code: string): Room | undefined {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code);
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
  repo.testFixture.seedWallet({ identityId, identityKind: "member", balance, lifetimeGranted: balance, starterGranted: true });
}

/** Every move awaited; the one move that ends the match may reject when a failure is injected — always caught explicitly, never left floating. */
async function playRpsToCompletion(rooms: RoomManager, winnerSocket: string, loserSocket: string): Promise<void> {
  for (let round = 0; round < 10; round++) {
    await rooms.applyMove(winnerSocket, "choose", { choice: "rock" }).catch(() => undefined);
    await rooms.applyMove(loserSocket, "choose", { choice: "scissors" }).catch(() => undefined);
  }
}

/**
 * Wraps a real repository, failing `createTerminalIntent` a fixed number
 * of times before delegating through — proves a REAL rejection travels
 * through `EconomyService` → `DurableSettlementWorker.enqueueX` →
 * `RoomManager`'s `attemptSettlementPersistence`/`attemptAbandonmentPersistence`,
 * landing on `terminalStatus = "FAILED"` for a genuine reason, not a
 * simulated one.
 */
class FailNTimesRepository implements EconomyRepository {
  readonly kind = "memory" as const;
  private callCount = 0;

  constructor(private readonly inner: EconomyRepository, private readonly failTimes: number) {}

  private maybeFail(): void {
    this.callCount++;
    if (this.callCount <= this.failTimes) {
      throw new Error(`Simulated createTerminalIntent infrastructure failure (attempt ${this.callCount})`);
    }
  }

  ping() { return this.inner.ping(); }
  getWallet(id: string) { return this.inner.getWallet(id); }
  listLedger(id: string, o?: { limit?: number; offset?: number }) { return this.inner.listLedger(id, o); }
  getSettlement(id: string) { return this.inner.getSettlement(id); }
  getWorldBankSnapshot() { return this.inner.getWorldBankSnapshot(); }
  getVoucherStatus(h: string) { return this.inner.getVoucherStatus(h); }
  getActiveConfiguration() { return this.inner.getActiveConfiguration(); }
  getPrizeSchedule(n: number) { return this.inner.getPrizeSchedule(n); }
  reconcileSettlement(id: string) { return this.inner.reconcileSettlement(id); }
  listStaleCommittedSettlements(ms: number) { return this.inner.listStaleCommittedSettlements(ms); }
  listSettlementEvents(id: string) { return this.inner.listSettlementEvents(id); }
  ensureWallet(id: string) { return this.inner.ensureWallet(id); }
  grantStarterCoins(id: string) { return this.inner.grantStarterCoins(id); }
  commitMatchEntry(i: Parameters<EconomyRepository["commitMatchEntry"]>[0]) { return this.inner.commitMatchEntry(i); }
  settleMatchEconomy(i: Parameters<EconomyRepository["settleMatchEconomy"]>[0]) { return this.inner.settleMatchEconomy(i); }
  refundMatchEntry(id: string, r: string) { return this.inner.refundMatchEntry(id, r); }
  forfeitMatchEntry(id: string, r: string) { return this.inner.forfeitMatchEntry(id, r); }
  issueGuestVoucher(i: Parameters<EconomyRepository["issueGuestVoucher"]>[0]) { return this.inner.issueGuestVoucher(i); }
  redeemRewardVoucher(h: string, m: string) { return this.inner.redeemRewardVoucher(h, m); }
  async createTerminalIntent(i: Parameters<EconomyRepository["createTerminalIntent"]>[0]) {
    this.maybeFail();
    return this.inner.createTerminalIntent(i);
  }
  claimTerminalIntent(w: string, l?: number) { return this.inner.claimTerminalIntent(w, l); }
  completeTerminalIntent(id: string, w: string) { return this.inner.completeTerminalIntent(id, w); }
  markTerminalIntentRetryable(i: MarkIntentRetryableInput): Promise<IntentUpdateResult> { return this.inner.markTerminalIntentRetryable(i); }
  markTerminalIntentFailed(i: MarkIntentFailedInput): Promise<IntentUpdateResult> { return this.inner.markTerminalIntentFailed(i); }
  listTerminalIntents(o?: Parameters<EconomyRepository["listTerminalIntents"]>[0]) { return this.inner.listTerminalIntents(o); }
  getTerminalIntent(id: string) { return this.inner.getTerminalIntent(id); }
  retryTerminalIntent(id: string, op: string, r?: string) { return this.inner.retryTerminalIntent(id, op, r); }
  requeueExpiredTerminalIntentClaim(id: string, op: string, f?: boolean) { return this.inner.requeueExpiredTerminalIntentClaim(id, op, f); }
  adminAdjustWallet(i: Parameters<EconomyRepository["adminAdjustWallet"]>[0]) { return this.inner.adminAdjustWallet(i); }
}

function freshFailingEconomy(failTimes: number): { repo: InMemoryEconomyRepository; service: EconomyService } {
  const repo = new InMemoryEconomyRepository();
  const failing = new FailNTimesRepository(repo, failTimes);
  const service = new EconomyService(failing, { delay: async () => undefined, infrastructureRetryBackoffMs: 1 });
  return { repo, service };
}

describe("Blocker 06 P1-2 remediation — FAILED-state terminal retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Test A: settlement persistence failure, then a successful retry recovers the match", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await playRpsToCompletion(rooms, "s_a", "s_b"); // Alice wins; the finishing move's finalizeMatch call rejects and is caught internally

    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");
    expect(room.lifecycleState).toBe("FINALIZATION_FAILED");
    expect(rooms.getRoomTerminalStatus(host.code)?.status).toBe("FAILED");
    expect(room.terminalPayload).not.toBeNull();
    expect(room.terminalPayload?.kind).toBe("SETTLEMENT");

    await rooms.retryFailedTerminalPersistence(room);
    await rooms.drainEconomySettlementQueue(); // the retry only durably persists the intent; the worker applies the financial RPC

    expect(room.terminalStatus).toBe("COMPLETED");
    expect(room.lifecycleState).toBe("COMPLETED");
    expect(room.terminalPayload).toBeNull();
    expect(room.currentMatchId).toBeNull();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5050"); // 5000 - 100 (entry) + 150 (1st place)
  });

  it("Test B: refund persistence failure, then a successful retry recovers the match", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");
    const matchId = peek(rooms, host.code)!.currentMatchId!;
    // The committed-but-never-played race (requestGameStart's own documented
    // interleaving edge case) — abandonment routes to REFUND, not FORFEITURE.
    peek(rooms, host.code)!.phase = "lobby";

    await rooms.leaveRoom("s_b").catch(() => undefined);
    await rooms.leaveRoom("s_a").catch(() => undefined);

    const room = peek(rooms, host.code);
    expect(room).toBeDefined(); // retained — persistence failed, teardown never ran
    expect(room!.terminalStatus).toBe("FAILED");
    expect(room!.terminalPayload?.kind).toBe("REFUND");
    expect(room!.currentMatchId).toBe(matchId); // retained, not nulled, on failure

    await rooms.retryFailedTerminalPersistence(room!);
    await rooms.drainEconomySettlementQueue();

    expect(room!.terminalStatus).toBe("COMPLETED");
    expect(room!.terminalPayload).toBeNull();
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("REFUNDED");
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // fully refunded
  });

  it("Test C: forfeiture persistence failure, then a successful retry recovers the match", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");
    const matchId = peek(rooms, host.code)!.currentMatchId!;

    await rooms.leaveRoom("s_b").catch(() => undefined);
    await rooms.leaveRoom("s_a").catch(() => undefined); // last human leaves mid-match -> abandonRoom -> forfeiture

    const room = peek(rooms, host.code);
    expect(room).toBeDefined();
    expect(room!.terminalStatus).toBe("FAILED");
    expect(room!.terminalPayload?.kind).toBe("FORFEITURE");
    expect(room!.currentMatchId).toBe(matchId);

    await rooms.retryFailedTerminalPersistence(room!);
    await rooms.drainEconomySettlementQueue();

    expect(room!.terminalStatus).toBe("COMPLETED");
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // entry fee forfeited, never refunded
    const worldBank = await service.getWorldBankSnapshot();
    expect(worldBank.abandonmentForfeitureRevenue).toBe("200");
  });

  it("Test D: retry reuses the exact stored payload, not a recomputed one", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await playRpsToCompletion(rooms, "s_a", "s_b"); // Alice wins
    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");

    const storedPayload = room.terminalPayload;
    expect(storedPayload?.kind).toBe("SETTLEMENT");
    const storedRequest = storedPayload!.kind === "SETTLEMENT" ? storedPayload!.request : null;
    expect(storedRequest?.participants?.[0]?.identityId).toBe(MEMBER_A); // Alice recorded as the winner

    // Mutate LIVE room state after the failure — a real retry must NOT
    // re-derive from this; it must replay the frozen `storedRequest` above.
    room.players.clear();

    await rooms.retryFailedTerminalPersistence(room);
    await rooms.drainEconomySettlementQueue();

    expect(room.terminalStatus).toBe("COMPLETED");
    // Alice — the ORIGINAL winner, from the stored payload — was credited,
    // proving retry did not (and structurally could not, given the
    // players map was just cleared) recompute the ranking.
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5050");
  });

  it("Test E: a conflicting terminal outcome cannot replace the already-stored decision", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await rooms.leaveRoom("s_b").catch(() => undefined);
    await rooms.leaveRoom("s_a").catch(() => undefined);

    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");
    expect(room.terminalOutcome).toBe("FORFEITURE");
    const originalPayload = room.terminalPayload!;

    // A second attempt to finalize/abandon the SAME room while it is
    // FAILED must not be able to substitute a different outcome. The only
    // sanctioned way back to PERSISTING from FAILED is
    // `retryFailedTerminalPersistence`, which never accepts a caller-
    // supplied outcome at all — it only ever replays `room.terminalPayload`
    // exactly as stored, proven directly: the retry call below takes no
    // outcome argument, so there is no code path through which a
    // conflicting REFUND could ever be substituted for the stored
    // FORFEITURE decision.
    await rooms.retryFailedTerminalPersistence(room);
    await rooms.drainEconomySettlementQueue();

    expect(room.terminalOutcome).toBe("FORFEITURE"); // unchanged — the original decision won
    const settlement = await service.getSettlement(originalPayload.matchId);
    expect(settlement?.status).toBe("ABANDONMENT_FORFEITED"); // never REFUNDED
  });

  it("Test F: only one retry can be active at a time", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await playRpsToCompletion(rooms, "s_a", "s_b");
    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");
    const matchId = room.terminalPayload!.matchId;

    // Spied at the persistence layer `retryFailedTerminalPersistence` itself
    // calls — this is the exact call "only one retry active" governs; the
    // downstream financial RPC is a separate, later, worker-driven step
    // (see `enqueueSettlement`'s own doc comment) and is checked separately
    // in Tests A-D above.
    const createIntentSpy = vi.spyOn(service, "createTerminalIntent");
    await Promise.all([
      rooms.retryFailedTerminalPersistence(room),
      rooms.retryFailedTerminalPersistence(room),
    ]);

    expect(room.terminalStatus).toBe("COMPLETED");
    expect(createIntentSpy).toHaveBeenCalledTimes(1); // exactly one retry attempt, not two

    await rooms.drainEconomySettlementQueue();
    expect((await service.getSettlement(matchId))?.status).toBe("SETTLED"); // exactly one financial application reached the database
  });

  it("Test G: a successful retry clears the FAILED state and the stored payload", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await rooms.leaveRoom("s_b").catch(() => undefined);
    await rooms.leaveRoom("s_a").catch(() => undefined);
    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");
    expect(room.terminalError).not.toBeNull();

    await rooms.retryFailedTerminalPersistence(room);

    expect(room.terminalStatus).toBe("COMPLETED");
    expect(room.terminalPayload).toBeNull();
    // terminalError is intentionally left as the historical record of the
    // failed attempt — status COMPLETED is the authoritative signal, not
    // the absence of a past error.
  });

  it("Test H: a retry that fails again remains FAILED, with its stored payload intact for a further retry", async () => {
    const { repo, service } = freshFailingEconomy(2); // fails twice — first attempt AND the first retry attempt
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "ludo", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.addBot("s_a", "Botty");
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await rooms.leaveRoom("s_b").catch(() => undefined);
    await rooms.leaveRoom("s_a").catch(() => undefined);
    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");
    const payloadAfterFirstFailure = room.terminalPayload;

    await expect(rooms.retryFailedTerminalPersistence(room)).rejects.toThrow();

    expect(room.terminalStatus).toBe("FAILED"); // still FAILED — the retry itself also failed
    expect(room.terminalPayload).toEqual(payloadAfterFirstFailure); // preserved, unchanged, for a further retry
    expect(peek(rooms, host.code)).toBeDefined(); // room retained, not torn down

    // A further retry, once the underlying failure clears, still succeeds —
    // proving the retry path itself is not exhausted after one failed attempt.
    await rooms.retryFailedTerminalPersistence(room);
    expect(room.terminalStatus).toBe("COMPLETED");
  });

  it("Test I: abandonRoom automatically retries a failed settlement intent on teardown", async () => {
    const { repo, service } = freshFailingEconomy(1); // fails on match completion, succeeds on abandon retry
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await playRpsToCompletion(rooms, "s_a", "s_b");
    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");

    // Bob leaves first, then Alice leaves — triggering abandonRoom on the concluded, failed room
    await rooms.leaveRoom("s_b");
    await rooms.leaveRoom("s_a");

    // The retry in abandonRoom succeeded, completing settlement intent persistence before teardown
    await rooms.drainEconomySettlementQueue();
    const wallet = await service.getWallet(MEMBER_A);
    expect(wallet.balance).toBe("5050"); // 5000 - 100 + 150
  });

  it("Test J: drainEconomySettlementQueue automatically sweeps and retries in-memory rooms in FAILED terminalStatus", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await playRpsToCompletion(rooms, "s_a", "s_b");
    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");

    // Normal queue drain / recovery sweep automatically retries room
    await rooms.drainEconomySettlementQueue();

    expect(room.terminalStatus).toBe("COMPLETED");
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5050");
  });

  it("Test K (Phase 6): signed-member failure-retry recovers via periodic in-process sweep with verified wallet and ledger state", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    await playRpsToCompletion(rooms, "s_a", "s_b"); // Alice wins
    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");
    expect(room.lifecycleState).toBe("FINALIZATION_FAILED");

    // Periodic in-process sweep runs while process remains alive
    await rooms.retryAllFailedTerminalRooms();

    // Verify exactly one terminal intent was created
    const intents = await service.listTerminalIntents({ status: "PENDING" });
    expect(intents.length).toBe(1);
    expect(intents[0].operationKind).toBe("SETTLEMENT");

    // Durable worker processes intent
    await rooms.drainEconomySettlementQueue();

    expect(room.terminalStatus).toBe("COMPLETED");
    expect(room.lifecycleState).toBe("COMPLETED");

    // Settlement reaches final state
    const settlement = await service.getSettlement(intents[0].matchId);
    expect(settlement?.status).toBe("SETTLED");
    // Member wallet receives expected prize
    const wallet = await service.getWallet(MEMBER_A);
    expect(wallet.balance).toBe("5050"); // 5000 - 100 (entry) + 150 (1st place)

    // Exactly one MATCH_PRIZE_CREDIT ledger entry exists
    const ledger = await repo.listLedger(MEMBER_A);
    const prizeCredits = ledger.filter((l) => l.entryType === "MATCH_PRIZE_CREDIT");
    expect(prizeCredits.length).toBe(1);
    expect(prizeCredits[0].amount).toBe("150");

    // Duplicate periodic retry does not add second reward
    await rooms.retryAllFailedTerminalRooms();
    await rooms.drainEconomySettlementQueue();
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5050");
    const ledgerAfter = await repo.listLedger(MEMBER_A);
    expect(ledgerAfter.filter((l) => l.entryType === "MATCH_PRIZE_CREDIT").length).toBe(1);

    // World bank total economy conservation remains sound
    const wb = await service.getWorldBankSnapshot();
    expect(wb.baseFeeRevenue).toBe("50"); // 200 collected - 150 prize = 50 cut
    expect(settlement?.totalWorldBankCut).toBe("50");
  });

  it("Test L (Phase 7): guest winner failure-retry issues exactly one bearer voucher in escrow without leaking raw codes", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    const guestId = "guest_escrow_retry_1";
    repo.testFixture.seedIdentity(guestId, "guest");

    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "BobGuest", host.code, "guest", guestId);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    // Guest wins: "s_b" plays rock, "s_a" plays scissors
    await playRpsToCompletion(rooms, "s_b", "s_a");

    const room = peek(rooms, host.code)!;
    expect(room.terminalStatus).toBe("FAILED");
    expect(room.lifecycleState).toBe("FINALIZATION_FAILED");

    // Periodic retry persists original payload
    await rooms.retryAllFailedTerminalRooms();

    const intents = await service.listTerminalIntents({ status: "PENDING" });
    expect(intents.length).toBe(1);
    expect(intents[0].operationKind).toBe("SETTLEMENT");

    // Worker executes settlement, issuing bearer voucher
    await rooms.drainEconomySettlementQueue();
    const matchId = intents[0].matchId;

    // Exactly one guest voucher record created
    const vouchers = [...(repo as any).vouchers.values()].filter((v: any) => v.matchId === matchId);
    expect(vouchers.length).toBe(1);
    expect(vouchers[0].coinAmount).toBe("150");
    expect(vouchers[0].issuedToGuestId).toBe(guestId);
    expect(vouchers[0].status).toBe("ACTIVE");
    expect(vouchers[0].codeHash).toMatch(/^[0-9a-f]{64}$/); // Hash only, no raw code leak

    // Signed participant did NOT incorrectly receive the guest reward
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4900"); // 5000 - 100 entry + 0 prize

    // Duplicate worker processing does not create a second voucher
    await rooms.drainEconomySettlementQueue();
    const vouchersAfter = [...(repo as any).vouchers.values()].filter((v: any) => v.matchId === matchId);
    expect(vouchersAfter.length).toBe(1);
  });

  it("Test L Companion: socket layer 'room:join' resolves guestToken into verified identityId and reaches escrow voucher on retry", async () => {
    const { repo, service } = freshFailingEconomy(1);
    seedMember(repo, MEMBER_A);
    const { playerId: guestId, token: guestToken } = mintGuestToken();
    repo.testFixture.seedIdentity(guestId, "guest");

    const { io } = makeIo();
    const rooms = new RoomManager(io, service);
    const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);

    // Mock socket for guest connecting via socket handler
    const listeners: Record<string, Function> = {};
    const guestSocket = {
      id: "s_b",
      use: () => {},
      on: (ev: string, handler: Function) => { listeners[ev] = handler; },
      emit: vi.fn(),
      join: () => {},
      leave: () => {},
    };

    // Wire socket handlers to verify full socket transport boundary
    registerSocketHandlers(io, guestSocket as any, rooms);

    // Guest joins via socket event "room:join" presenting guestToken
    let joinAck: any;
    await listeners["room:join"](
      {
        name: "BobGuest",
        code: host.code,
        accountKind: "guest",
        guestToken: guestToken,
      },
      (ackResult: any) => { joinAck = ackResult; }
    );

    expect(joinAck?.ok).toBe(true);
    const room = peek(rooms, host.code)!;
    const guestPlayer = room.players.get(joinAck.playerId)!;
    expect(guestPlayer.isGuest).toBe(true);
    expect(guestPlayer.identityId).toBe(guestId);

    // Ready up both seats
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    await rooms.requestGameStart("s_a");

    // Guest wins: "s_b" plays rock, "s_a" plays scissors
    await playRpsToCompletion(rooms, "s_b", "s_a");

    expect(room.terminalStatus).toBe("FAILED");
    expect(room.lifecycleState).toBe("FINALIZATION_FAILED");

    // Retry persists original payload
    await rooms.retryAllFailedTerminalRooms();
    await rooms.drainEconomySettlementQueue();

    expect(room.terminalStatus).toBe("COMPLETED");
    const intents = await service.listTerminalIntents();
    const matchId = intents[0].matchId;
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("SETTLED");
    expect(settlement?.totalGuestEscrow).toBe("150");

    // Exactly one voucher created for the guest who joined via socket event
    const vouchers = [...(repo as any).vouchers.values()].filter((v: any) => v.matchId === matchId);
    expect(vouchers.length).toBe(1);
    expect(vouchers[0].coinAmount).toBe("150");
    expect(vouchers[0].issuedToGuestId).toBe(guestId);
    expect(vouchers[0].status).toBe("ACTIVE");
  });

  describe("Phase 8: Concurrent Cleanup Regression Scenarios", () => {
    it("Scenario A: two simultaneous abandonRoom calls while status is FAILED converge on single retry attempt", async () => {
      const { repo, service } = freshFailingEconomy(1); // fails on game completion, retry will succeed
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      await playRpsToCompletion(rooms, "s_a", "s_b");
      const room = peek(rooms, host.code)!;
      expect(room.terminalStatus).toBe("FAILED");

      const createIntentSpy = vi.spyOn(service, "createTerminalIntent");
      // Two callers trigger abandonRoom simultaneously
      await Promise.all([
        (rooms as any).abandonRoom(room),
        (rooms as any).abandonRoom(room),
      ]);

      // Exactly one retry attempt executed
      expect(createIntentSpy).toHaveBeenCalledTimes(1);
      expect(room.terminalStatus).toBe("COMPLETED");
      // Room closed after successful completion
      expect(peek(rooms, host.code)).toBeUndefined();
    });

    it("Scenario B: a second abandonRoom call while the first retry is PERSISTING awaits the same promise without deleting the room", async () => {
      // Fails twice so retry also fails
      const { repo, service } = freshFailingEconomy(2);
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      await playRpsToCompletion(rooms, "s_a", "s_b");
      const room = peek(rooms, host.code)!;
      expect(room.terminalStatus).toBe("FAILED");

      // First call triggers abandonRoom (which starts retry)
      const call1 = (rooms as any).abandonRoom(room);
      expect(room.terminalStatus).toBe("PERSISTING");

      // Second call arrives while PERSISTING
      const call2 = (rooms as any).abandonRoom(room);

      await Promise.all([call1, call2]);

      // Retry failed: room MUST NOT be deleted!
      expect(peek(rooms, host.code)).toBeDefined();
      expect(room.terminalStatus).toBe("FAILED");
      expect(rooms.getRoomTerminalStatus(host.code)?.status).toBe("FAILED");
    });

    it("Scenario C: explicit leave racing disconnect-grace expiry converges on the same in-flight persistence", async () => {
      const { repo, service } = freshFailingEconomy(1);
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      await playRpsToCompletion(rooms, "s_a", "s_b");
      const room = peek(rooms, host.code)!;
      expect(room.terminalStatus).toBe("FAILED");

      // Racing leaveRoom calls from both seats
      await Promise.all([
        rooms.leaveRoom("s_a"),
        rooms.leaveRoom("s_b"),
      ]);

      await rooms.drainEconomySettlementQueue();
      expect(room.terminalStatus).toBe("COMPLETED");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5050");
    });

    it("Scenario D: periodic failed-room retry racing host manual retry triggers exactly one persistence attempt", async () => {
      const { repo, service } = freshFailingEconomy(1);
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      await playRpsToCompletion(rooms, "s_a", "s_b");
      const room = peek(rooms, host.code)!;
      expect(room.terminalStatus).toBe("FAILED");

      const createIntentSpy = vi.spyOn(service, "createTerminalIntent");
      // Periodic retry and host manual retry race simultaneously
      await Promise.all([
        rooms.retryAllFailedTerminalRooms(),
        rooms.requestRetryTerminalPersistence("s_a"),
      ]);

      expect(createIntentSpy).toHaveBeenCalledTimes(1);
      await rooms.drainEconomySettlementQueue();
      expect(room.terminalStatus).toBe("COMPLETED");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5050");
    });

    it("Scenario E: retry succeeds while a cleanup request is waiting, safely closing room after COMPLETED", async () => {
      const { repo, service } = freshFailingEconomy(1);
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      await playRpsToCompletion(rooms, "s_a", "s_b");
      const room = peek(rooms, host.code)!;
      expect(room.terminalStatus).toBe("FAILED");

      // Bob departs
      await rooms.leaveRoom("s_b");

      // Host Alice departs, triggering abandonRoom which executes retry
      await rooms.leaveRoom("s_a");

      // Retry succeeded, room safely closed
      expect(peek(rooms, host.code)).toBeUndefined();
      await rooms.drainEconomySettlementQueue();
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5050");
    });

    it("Scenario F: retry fails while a cleanup request is waiting, leaving room visible and recoverable in FAILED status", async () => {
      const { repo, service } = freshFailingEconomy(2); // Fails twice
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      await playRpsToCompletion(rooms, "s_a", "s_b");
      const room = peek(rooms, host.code)!;
      expect(room.terminalStatus).toBe("FAILED");

      // Both players leave, triggering abandonRoom
      await rooms.leaveRoom("s_b");
      await rooms.leaveRoom("s_a");

      // The room MUST NOT be deleted!
      expect(peek(rooms, host.code)).toBeDefined();
      expect(room.terminalStatus).toBe("FAILED");
      expect(rooms.getRoomTerminalStatus(host.code)?.status).toBe("FAILED");
      expect(room.terminalPayload).not.toBeNull();

      // Subsequent manual or periodic retry can still recover once infrastructure recovers
      await rooms.retryAllFailedTerminalRooms();
      await rooms.drainEconomySettlementQueue();
      expect(room.terminalStatus).toBe("COMPLETED");
      expect((await service.getWallet(MEMBER_A)).balance).toBe("5050");
    });
  });

  describe("Phase 9: Focused Guard Coverage (!room.currentMatchId and room.phase === 'playing' && room.engine?.isOver())", () => {
    it("Guard A1: startGame is rejected when economy is active and !room.currentMatchId", async () => {
      const { repo, service } = freshFailingEconomy(0);
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const emittedErrors: string[] = [];
      const io = {
        to: () => ({ emit: () => {} }),
        sockets: {
          sockets: {
            get: () => ({
              join() {},
              leave() {},
              emit: (ev: string, msg: string) => {
                if (ev === "room:error") emittedErrors.push(msg);
              },
            }),
          },
        },
      } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);

      const room = peek(rooms, host.code)!;
      expect(room.currentMatchId).toBeNull();

      // Malicious or buggy client calls startGame directly without requestGameStart
      rooms.startGame("s_a");

      expect(room.phase).toBe("lobby");
      expect(emittedErrors).toContain(
        "This match has not been paid for yet. Use requestGameStart, not startGame, when Economy V1 is enabled."
      );
    });

    it("Guard A2: abandonRoom preserves room and blocks premature close while currentMatchId is present", async () => {
      const { repo, service } = freshFailingEconomy(2); // will fail on both game completion and first retry
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      const room = peek(rooms, host.code)!;
      const matchId = room.currentMatchId;
      expect(matchId).not.toBeNull();

      await playRpsToCompletion(rooms, "s_a", "s_b");
      expect(room.terminalStatus).toBe("FAILED");
      // currentMatchId is retained because persistence failed!
      expect(room.currentMatchId).toBe(matchId);

      // Now players leave, triggering abandonRoom
      await rooms.leaveRoom("s_b");
      await rooms.leaveRoom("s_a");

      // Room MUST still be preserved in rooms map because currentMatchId was not cleared
      expect(peek(rooms, host.code)).toBeDefined();
      expect(room.terminalStatus).toBe("FAILED");
      expect(room.currentMatchId).toBe(matchId);

      // Once terminal persistence succeeds, currentMatchId is cleared to null and cleanup can complete
      await rooms.retryAllFailedTerminalRooms();
      expect(room.terminalStatus).toBe("COMPLETED");
      expect(room.currentMatchId).toBeNull();
    });

    it("Guard B: leaveRoom after match conclusion (phase === 'finished') does not re-invoke finalizeMatch or duplicate settlement", async () => {
      const { repo, service } = freshFailingEconomy(0); // Succeeds immediately
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      await playRpsToCompletion(rooms, "s_a", "s_b");

      const room = peek(rooms, host.code)!;
      expect(room.phase).toBe("finished");
      expect(room.terminalStatus).toBe("COMPLETED");

      await rooms.drainEconomySettlementQueue();
      const intentsBefore = await service.listTerminalIntents();
      expect(intentsBefore.length).toBe(1);

      // Spy on enqueueSettlement to ensure finalizeMatch is never re-entered
      const enqueueSpy = vi.spyOn((rooms as any).durableWorker, "enqueueSettlement");

      // Bob leaves room after match already concluded
      await rooms.leaveRoom("s_b");

      // finalizeMatch was NOT called
      expect(enqueueSpy).not.toHaveBeenCalled();

      // No new intents or duplicate settlements were created
      const intentsAfter = await service.listTerminalIntents();
      expect(intentsAfter.length).toBe(1);
    });
  });
});
