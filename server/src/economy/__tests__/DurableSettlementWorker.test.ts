import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import {
  type EconomyRepository,
  type IntentUpdateResult,
  type MarkIntentFailedInput,
  type MarkIntentRetryableInput,
} from "../../persistence/EconomyRepository.js";
import { EconomyService, type SettleMatchEconomyRequest } from "../EconomyService.js";
import { DurableSettlementWorker } from "../DurableSettlementWorker.js";

/**
 * Blocker 06 — durable terminal-intent recovery.
 *
 * Every test here drives a REAL `InMemoryEconomyRepository` through the
 * REAL `EconomyService` and `DurableSettlementWorker` — no mocked
 * repository behavior for the CORE claim/lease/replay/mutual-exclusivity
 * logic (only Tests K/L inject a controlled failure, via a small local
 * wrapper repository, the same technique `EconomyService.test.ts`'s own
 * `ScriptedFailureRepository` uses).
 *
 * ── What this suite proves, and what it explicitly does not ─────────────
 * "Application recreation sharing one repository" (Test A) proves the
 * RECOVERY LOGIC — claim/lease/replay — is correct. It does NOT prove a
 * real OS process crash is survived: `InMemoryEconomyRepository`'s own
 * header says plainly "everything here dies with the process." Genuine
 * process-restart durability can only be proven against real Postgres —
 * see the Blocker 06 implementation report's "Real-PostgreSQL results"
 * section for the exact, honest boundary of what was and was not
 * runtime-verified.
 */

function freshRepo(): InMemoryEconomyRepository {
  return new InMemoryEconomyRepository();
}

function freshService(repo: EconomyRepository, now?: () => number): EconomyService {
  return new EconomyService(repo, { delay: async () => undefined, now });
}

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";

function seedHost(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedWallet({ identityId, identityKind: "member", balance, lifetimeGranted: balance, starterGranted: true });
}

async function commitTwoSeatMatch(service: EconomyService, matchId: string, hostIdentityId: string): Promise<void> {
  await service.commitMatchEntry({
    matchId,
    roomCode: "ROOM1",
    hostIdentityId,
    seatCount: 2,
    humanSeatCount: 2,
    botSeatCount: 0,
    isSolo: false,
  });
}

function settlementRequest(matchId: string, winner: string, loser: string): SettleMatchEconomyRequest {
  return {
    matchId,
    isValidRanking: true,
    participants: [
      { identityId: winner, identityKind: "member", placement: 1 },
      { identityId: loser, identityKind: "member", placement: 2 },
    ],
  };
}

/** Wraps a real repository, failing ONE named method a fixed number of times before delegating through — the same technique `EconomyService.test.ts`'s `ScriptedFailureRepository` uses, scoped down to just what these tests need. */
class ScriptedFailureRepository implements EconomyRepository {
  readonly kind = "memory" as const;
  private callCount = 0;

  constructor(
    private readonly inner: EconomyRepository,
    private readonly method: keyof EconomyRepository,
    private readonly failTimes: number,
    private readonly makeError: () => Error,
  ) {}

  private maybeFail(method: keyof EconomyRepository): void {
    if (method !== this.method) return;
    this.callCount++;
    if (this.callCount <= this.failTimes) throw this.makeError();
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
  async settleMatchEconomy(i: Parameters<EconomyRepository["settleMatchEconomy"]>[0]) {
    this.maybeFail("settleMatchEconomy");
    return this.inner.settleMatchEconomy(i);
  }
  refundMatchEntry(id: string, r: string) { return this.inner.refundMatchEntry(id, r); }
  forfeitMatchEntry(id: string, r: string) { return this.inner.forfeitMatchEntry(id, r); }
  issueGuestVoucher(i: Parameters<EconomyRepository["issueGuestVoucher"]>[0]) { return this.inner.issueGuestVoucher(i); }
  redeemRewardVoucher(h: string, m: string) { return this.inner.redeemRewardVoucher(h, m); }
  createTerminalIntent(i: Parameters<EconomyRepository["createTerminalIntent"]>[0]) { return this.inner.createTerminalIntent(i); }
  claimTerminalIntent(w: string, l?: number) { return this.inner.claimTerminalIntent(w, l); }
  completeTerminalIntent(id: string, w: string) { return this.inner.completeTerminalIntent(id, w); }
  markTerminalIntentRetryable(i: MarkIntentRetryableInput): Promise<IntentUpdateResult> { return this.inner.markTerminalIntentRetryable(i); }
  markTerminalIntentFailed(i: MarkIntentFailedInput): Promise<IntentUpdateResult> { return this.inner.markTerminalIntentFailed(i); }
  listTerminalIntents(o?: Parameters<EconomyRepository["listTerminalIntents"]>[0]) { return this.inner.listTerminalIntents(o); }
  getTerminalIntent(id: string) { return this.inner.getTerminalIntent(id); }
  retryTerminalIntent(id: string, op: string, r?: string) { return this.inner.retryTerminalIntent(id, op, r); }
  requeueExpiredTerminalIntentClaim(id: string, op: string, f?: boolean) { return this.inner.requeueExpiredTerminalIntentClaim(id, op, f); }
}

describe("Blocker 06 — DurableSettlementWorker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Test A/B: a durable intent survives application recreation (process-boundary simulation) and is recovered by a fresh worker", async () => {
    const repo = freshRepo(); // the ONE persistent store shared across two independently constructed compositions
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_recreate_1";

    // "Process A": persists the intent, then never processes it — simulating an exit between enqueue and claim.
    const serviceA = freshService(repo);
    await commitTwoSeatMatch(serviceA, matchId, MEMBER_A);
    const workerA = new DurableSettlementWorker(serviceA);
    const intent = await workerA.enqueueSettlement(settlementRequest(matchId, MEMBER_A, MEMBER_B));
    expect(intent.status).toBe("PENDING");
    // workerA is simply discarded here — never started, never drained.

    // "Process B": an entirely new EconomyService + DurableSettlementWorker, sharing only the repository.
    const serviceB = freshService(repo);
    const workerB = new DurableSettlementWorker(serviceB);
    await workerB.drain();

    const settlement = await serviceB.getSettlement(matchId);
    expect(settlement?.status).toBe("SETTLED");
    const recovered = await serviceB.getTerminalIntent(intent.id);
    expect(recovered?.status).toBe("COMPLETED");
    expect((await serviceB.getWallet(MEMBER_A)).balance).toBe("4950"); // 5000 - 200 (entry) + 150 (1st place)
  });

  it("Test C: a claim's lease expires and a second worker reclaims it — no duplicate application", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_lease_expiry";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);

    // workerDead "claims" the intent (simulating a worker that then crashes
    // before ever calling settleMatchEconomy) by claiming directly through
    // the service, bypassing processIntent entirely.
    await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload: { operationKind: "SETTLEMENT", matchId, isValidRanking: true, participants: settlementRequest(matchId, MEMBER_A, MEMBER_B).participants },
    });
    const claim = await service.claimTerminalIntent("dead_worker", 30);
    expect(claim.claimed).toBe(true);
    expect(claim.intent?.status).toBe("PROCESSING");

    // Time passes well beyond the 30s lease — the dead worker never
    // completes it. `InMemoryEconomyRepository`'s own lease-expiry check
    // reads real `Date.now()`, which only fake timers (not an injected
    // `now` option elsewhere) can move — advancing the fake clock is the
    // correct, non-arbitrary way to simulate this deterministically.
    await vi.advanceTimersByTimeAsync(60_000);

    const workerB = new DurableSettlementWorker(service);
    await workerB.drain();

    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("SETTLED");
    const final = await service.getTerminalIntent(claim.intent!.id);
    expect(final?.status).toBe("COMPLETED");
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4950"); // exactly one application, not two
  });

  it("Test D: operation succeeds but completion acknowledgement never happens — replay produces no duplicate mutation", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_ack_failure";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);
    await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_A, MEMBER_B));

    // Manually replicate "the RPC succeeded but the process died before
    // completeTerminalIntent ran": claim, apply directly via the service
    // (the same call processIntent would make), but never call
    // completeTerminalIntent — leaving the intent stuck PROCESSING.
    const claim = await service.claimTerminalIntent("worker_X", 30);
    expect(claim.claimed).toBe(true);
    const applyResult = await service.settleMatchEconomy(settlementRequest(matchId, MEMBER_A, MEMBER_B));
    expect(applyResult.applied).toBe(true);
    const balanceAfterRealApplication = (await service.getWallet(MEMBER_A)).balance;
    expect(balanceAfterRealApplication).toBe("4950");
    // Intent is still PROCESSING — completeTerminalIntent was never called.

    // A fresh worker, once the lease is force-expired by advancing the
    // fake clock `Date.now()` actually reads, reclaims and replays.
    await vi.advanceTimersByTimeAsync(60_000);
    const workerB = new DurableSettlementWorker(service);
    await workerB.drain();

    expect((await service.getWallet(MEMBER_A)).balance).toBe(balanceAfterRealApplication); // UNCHANGED — no duplicate credit
    const final = await service.getTerminalIntent(claim.intent!.id);
    expect(final?.status).toBe("COMPLETED");
  });

  it("Test E: two concurrent claim attempts for the same pending intent — exactly one succeeds", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_concurrent_claim";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);
    await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_A, MEMBER_B));

    const [claim1, claim2] = await Promise.all([
      service.claimTerminalIntent("worker_1", 30),
      service.claimTerminalIntent("worker_2", 30),
    ]);
    const claimedCount = [claim1, claim2].filter((c) => c.claimed).length;
    expect(claimedCount).toBe(1);
  });

  it("Test F: duplicate enqueue with the identical operation kind is a safe idempotent response — one durable intent", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_dup_same_kind";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);

    const first = await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_A, MEMBER_B));
    const second = await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_A, MEMBER_B));
    expect(first.id).toBe(second.id);
    const all = await service.listTerminalIntents({});
    expect(all.filter((i) => i.matchId === matchId)).toHaveLength(1);
  });

  it("Test G: duplicate enqueue with a CONFLICTING operation kind is rejected deterministically — the authoritative intent is never mutated", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    const matchId = "match_dup_conflict";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);

    const settlementIntent = await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_A, "bot_seat_2"));
    expect(settlementIntent.operationKind).toBe("SETTLEMENT");

    const refundOutcome = await service.createTerminalIntent({
      matchId,
      operationKind: "REFUND",
      payload: { operationKind: "REFUND", matchId, reason: "conflicting request" },
    });
    expect(refundOutcome.created).toBe(false);
    expect(refundOutcome.conflict).toBe(true);
    expect(refundOutcome.intent.operationKind).toBe("SETTLEMENT"); // unchanged — the original wins
    expect(refundOutcome.intent.id).toBe(settlementIntent.id);

    const all = await service.listTerminalIntents({});
    expect(all.filter((i) => i.matchId === matchId)).toHaveLength(1); // never a second row
  });

  it("Test H: settlement payload replay preserves the authoritative ranking exactly, without any room/RoomManager state", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_settlement_replay";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);
    const intent = await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_B, MEMBER_A)); // Bob wins this time
    expect(intent.payload).toEqual({
      operationKind: "SETTLEMENT",
      matchId,
      isValidRanking: true,
      participants: [
        { identityId: MEMBER_B, identityKind: "member", placement: 1 },
        { identityId: MEMBER_A, identityKind: "member", placement: 2 },
      ],
      refundReason: undefined,
    });
    await worker.drain();
    expect((await service.getWallet(MEMBER_B)).balance).toBe("5150"); // Bob, not Alice, was credited
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // Alice only ever debited the entry cost
  });

  it("Test I: refund payload replay preserves the authoritative reason", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    const matchId = "match_refund_replay";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);
    const reason = "Room abandoned mid-match — all human players departed";
    const intent = await worker.enqueueRefund(matchId, reason);
    expect(intent.payload).toEqual({ operationKind: "REFUND", matchId, reason });
    await worker.drain();
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("REFUNDED");
    expect(settlement?.refundReason).toBe(reason);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // fully refunded
  });

  it("Test J: forfeiture payload replay preserves the authoritative reason and the correct financial destination", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    const matchId = "match_forfeiture_replay";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);
    const reason = "Room abandoned mid-match after commitment — no eligible signed-in successor remained";
    const intent = await worker.enqueueForfeiture(matchId, reason);
    expect(intent.payload).toEqual({ operationKind: "FORFEITURE", matchId, reason });
    await worker.drain();
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
    expect(settlement?.forfeitureReason).toBe(reason);
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4800"); // never refunded
    const worldBank = await service.getWorldBankSnapshot();
    expect(worldBank.abandonmentForfeitureRevenue).toBe("200"); // the full committed pool, to World Bank
  });

  it("Test K: a retryable infrastructure failure is bounded, with observable retry metadata, and eventually succeeds", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_retryable_infra";
    let now = 5_000_000;
    const failing = new ScriptedFailureRepository(repo, "settleMatchEconomy", 2, () => {
      const err = new Error("simulated transient infrastructure failure");
      err.name = "SimulatedInfraFailure";
      return err;
    });
    const service = new EconomyService(failing, { delay: async () => undefined, now: () => now, infrastructureRetryBackoffMs: 1 });
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service, { now: () => now, maxInfrastructureRetries: 5 });
    await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_A, MEMBER_B));

    // First processing attempt: EconomyService's own withRetry absorbs ONE
    // failure internally; the SECOND scripted failure surfaces to the
    // worker as EconomyServiceInfrastructureError.
    const claimed1 = await worker.processOnce();
    expect(claimed1).toBe(true);
    let intent = (await service.listTerminalIntents({ status: "RETRYABLE" }))[0];
    expect(intent).toBeDefined();
    expect(intent.lastErrorCategory).toBe("INFRASTRUCTURE");
    expect(intent.attemptCount).toBe(1);
    expect(intent.nextAttemptAt).toBeGreaterThan(now);

    now = intent.nextAttemptAt + 1;
    await worker.drain();
    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("SETTLED"); // recovered once the scripted failures were exhausted
    const finalIntent = await service.getTerminalIntent(intent.id);
    expect(finalIntent?.status).toBe("COMPLETED");
  });

  it("Test L: a permanent business failure is never retried and reaches FAILED directly", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    const matchId = "match_permanent_business_failure";
    const service = freshService(repo);
    // Deliberately never committed — settleMatchEconomy will reject with
    // MatchNotCommittedError, a genuine business rejection, never retried.
    const worker = new DurableSettlementWorker(service);
    await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload: { operationKind: "SETTLEMENT", matchId, isValidRanking: true, participants: [{ identityId: MEMBER_A, identityKind: "member", placement: 1 }] },
    });
    await worker.drain();
    const intents = await service.listTerminalIntents({ status: "FAILED" });
    expect(intents).toHaveLength(1);
    expect(intents[0].lastErrorCategory).toBe("BUSINESS");
    expect(intents[0].attemptCount).toBe(1); // never retried
  });

  it("Test M: one poison intent does not block a healthy, unrelated intent from processing", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const healthyMatchId = "match_healthy";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, healthyMatchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service);

    // The poison intent: a match that was never committed, so its
    // settlement RPC always rejects with a permanent business error.
    await service.createTerminalIntent({
      matchId: "match_poison_never_committed",
      operationKind: "REFUND",
      payload: { operationKind: "REFUND", matchId: "match_poison_never_committed", reason: "poison" },
    });
    await worker.enqueueSettlement(settlementRequest(healthyMatchId, MEMBER_A, MEMBER_B));

    await worker.drain();

    const poisonIntent = (await service.listTerminalIntents({ status: "FAILED" }))[0];
    expect(poisonIntent?.matchId).toBe("match_poison_never_committed");
    const healthySettlement = await service.getSettlement(healthyMatchId);
    expect(healthySettlement?.status).toBe("SETTLED"); // unaffected by the poison intent's failure
  });

  it("Test N: startup recovery (drain) discovers and processes pending work created before the worker ever started", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_startup_sweep";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    // Intent persisted directly via the service — simulating work left
    // behind by a PRIOR process, discovered only once this worker starts.
    await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload: { operationKind: "SETTLEMENT", matchId, isValidRanking: true, participants: settlementRequest(matchId, MEMBER_A, MEMBER_B).participants },
    });

    const worker = new DurableSettlementWorker(service);
    await worker.drain(); // the startup-recovery entry point (see index.ts's own call site)

    const settlement = await service.getSettlement(matchId);
    expect(settlement?.status).toBe("SETTLED");
  });

  it("Test O: periodic sweep (start/stop) discovers work created after the worker already started", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const matchId = "match_periodic_sweep";
    const service = freshService(repo);
    await commitTwoSeatMatch(service, matchId, MEMBER_A);
    const worker = new DurableSettlementWorker(service, { periodicSweepIntervalMs: 5_000 });

    worker.start();
    try {
      await worker.enqueueSettlement(settlementRequest(matchId, MEMBER_A, MEMBER_B));
      expect((await service.getSettlement(matchId))?.status).toBe("COMMITTED"); // not yet processed — no sweep has fired

      await vi.advanceTimersByTimeAsync(5_100); // fires the periodic sweep
      expect((await service.getSettlement(matchId))?.status).toBe("SETTLED");
    } finally {
      worker.stop();
    }
  });

  it("Test P: administrative retry moves a FAILED intent back to PENDING and is audited; retrying a non-FAILED intent is rejected", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    const matchId = "match_admin_retry";
    const service = freshService(repo);
    // Never committed — the settlement attempt below will permanently fail.
    await service.createTerminalIntent({
      matchId,
      operationKind: "REFUND",
      payload: { operationKind: "REFUND", matchId, reason: "will fail — no commitment exists" },
    });
    const worker = new DurableSettlementWorker(service);
    await worker.drain();
    let intent = (await service.listTerminalIntents({ status: "FAILED" }))[0];
    expect(intent).toBeDefined();

    // Retrying a PENDING/COMPLETED intent is rejected — only FAILED is eligible.
    const bogus = await service.createTerminalIntent({
      matchId: "match_admin_retry_pending",
      operationKind: "REFUND",
      payload: { operationKind: "REFUND", matchId: "match_admin_retry_pending", reason: "still pending" },
    });
    await expect(service.retryTerminalIntent(bogus.intent.id, "operator_1")).rejects.toThrow();

    const retried = await service.retryTerminalIntent(intent.id, "operator_1", "manual investigation complete, retrying");
    expect(retried.updated).toBe(true);
    expect(retried.intent.status).toBe("PENDING");

    await expect(service.retryTerminalIntent(intent.id, "")).rejects.toThrow(); // empty operatorId — unaudited retry refused
  });

  it("Test R: exact financial reconciliation across settlement, refund, and forfeiture — one terminal outcome, no duplicate application after replay", async () => {
    const repo = freshRepo();
    seedHost(repo, MEMBER_A);
    seedHost(repo, MEMBER_B);
    const service = freshService(repo);
    const worker = new DurableSettlementWorker(service);

    // Settlement
    const settleMatchId = "match_recon_settle";
    await commitTwoSeatMatch(service, settleMatchId, MEMBER_A);
    await worker.enqueueSettlement(settlementRequest(settleMatchId, MEMBER_A, MEMBER_B));
    await worker.drain();
    // Replay: the worker's own completeTerminalIntent already ran; directly
    // replay the underlying RPC too, proving IT stays idempotent under this
    // new dispatch layer, exactly as before Blocker 06.
    const replaySettle = await service.settleMatchEconomy(settlementRequest(settleMatchId, MEMBER_A, MEMBER_B));
    expect(replaySettle.applied).toBe(false);
    const settleResult = await service.getSettlement(settleMatchId);
    expect(settleResult?.status).toBe("SETTLED");
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4950"); // 5000 - 200 (entry) + 150 (1st place)

    // Refund
    const refundMatchId = "match_recon_refund";
    await commitTwoSeatMatch(service, refundMatchId, MEMBER_A);
    await worker.enqueueRefund(refundMatchId, "test refund");
    await worker.drain();
    const refundResult = await service.getSettlement(refundMatchId);
    expect(refundResult?.status).toBe("REFUNDED");
    expect((await service.getWallet(MEMBER_A)).balance).toBe("4950"); // debited 200 then fully refunded — net unchanged

    // Forfeiture
    const forfeitMatchId = "match_recon_forfeit";
    await commitTwoSeatMatch(service, forfeitMatchId, MEMBER_A);
    await worker.enqueueForfeiture(forfeitMatchId, "test forfeiture");
    await worker.drain();
    const forfeitResult = await service.getSettlement(forfeitMatchId);
    expect(forfeitResult?.status).toBe("ABANDONMENT_FORFEITED");

    const worldBank = await service.getWorldBankSnapshot();
    expect(worldBank.abandonmentForfeitureRevenue).toBe("200");

    // All three intents individually reached COMPLETED exactly once, mutually exclusively.
    const completed = await service.listTerminalIntents({ status: "COMPLETED" });
    expect(completed.map((i) => i.matchId).sort()).toEqual([forfeitMatchId, refundMatchId, settleMatchId].sort());
  });
});
