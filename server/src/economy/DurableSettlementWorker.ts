import { logger } from "../lib/logger.js";
import { metricsRegistry } from "../observability/MetricsRegistry.js";
import {
  EconomyServiceError,
  EconomyServiceInfrastructureError,
  type EconomyService,
  type SettleMatchEconomyRequest,
} from "./EconomyService.js";
import {
  EconomyRepositoryError,
  MatchAlreadyForfeitedError,
  MatchAlreadyRefundedError,
  MatchAlreadySettledError,
  type ForfeitureIntentPayload,
  type RefundIntentPayload,
  type SettlementIntentPayload,
  type TerminalIntentErrorCategory,
  type TerminalIntentRecord,
} from "../persistence/EconomyRepository.js";

/**
 * Blocker 06 — the durable replacement for `EconomySettlementQueue`
 * (`server/src/rooms/economySettlementQueue.ts`, still present and still
 * used for its OWN status-reporting shape by `index.ts`'s shutdown log —
 * this class does not delete that one; `RoomManager` is updated, in this
 * same change, to persist a durable intent through this worker BEFORE
 * anything is handed to a fire-and-forget in-memory chain, closing F-1's
 * actual gap: a queued-but-not-yet-executed settlement surviving a process
 * exit).
 *
 * ── The one thing this class must never do ────────────────────────────────
 * Guess. Every intent this worker ever processes was created by a caller
 * (`RoomManager`, via `enqueueSettlement`/`enqueueRefund`/`enqueueForfeiture`
 * below) that had ALREADY decided the outcome and already had the complete
 * payload needed to replay it — an authoritative ranked participant list
 * for a settlement, an authoritative reason for a refund or forfeiture.
 * This worker only ever replays what was recorded; it never inspects a
 * stale `COMMITTED` match and infers what should happen to it (see
 * `supabase/migrations/20260901000000_economy_terminal_intents.sql`'s own
 * header for why that approach was explicitly rejected).
 *
 * ── Why completion is a SEPARATE step from the economy call ───────────────
 * `settleMatchEconomy`/`refundMatchEntry`/`forfeitMatchEntry` are already
 * idempotent (Blocker 01/05/the original Economy V1 migration's own design)
 * — replaying any of them for a match that already reached that exact
 * terminal state is a safe, successful `applied:false` no-op, never an
 * error. That existing guarantee is what makes it safe for THIS worker to
 * mark an intent completed only AFTER the call resolves: if this process
 * dies between the call succeeding and `completeTerminalIntent` running,
 * whichever worker reclaims the expired lease calls the SAME economy
 * operation again, gets the authoritative `applied:false` result, and
 * completes the intent under its own worker id. No duplicate wallet,
 * ledger, voucher, or world-bank mutation — proven by the UNDERLYING
 * operation's own idempotency, not reimplemented here.
 */

export interface DurableSettlementWorkerOptions {
  /** Defaults to a random per-instance id — stable for this process's lifetime, never reused across restarts. */
  workerId?: string;
  /** How long a claim is held before another worker may reclaim it. */
  leaseSeconds?: number;
  /** Intents to process per sweep before yielding, bounding one sweep's database load. */
  batchSize?: number;
  /** How many times an INFRASTRUCTURE-classified failure is retried before the intent is marked permanently FAILED (never indefinite — Invariant 10). */
  maxInfrastructureRetries?: number;
  /** How long between periodic sweeps. Not a tight poll — see `start()`. */
  periodicSweepIntervalMs?: number;
  /** Injectable for deterministic tests — never a raw `Date.now()` call outside this indirection. */
  now?: () => number;
}

export interface WorkerStatusSnapshot {
  pending: number;
  processing: number;
  retryable: number;
  failed: number;
  completed: number;
  oldestPendingAgeMs: number | null;
  lastSweepAt: number | null;
  lastSweepDurationMs: number | null;
  lastSweepError: string | null;
}

const DEFAULT_LEASE_SECONDS = 30;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_INFRASTRUCTURE_RETRIES = 5;
const DEFAULT_PERIODIC_SWEEP_INTERVAL_MS = 5_000;
/** Exponential-ish backoff, capped — never a zero-delay retry loop. */
const RETRY_BACKOFF_MS = (attempt: number): number => Math.min(1_000 * 2 ** Math.max(attempt - 1, 0), 60_000);

function classifyError(err: unknown): { code: string; category: TerminalIntentErrorCategory } {
  if (err instanceof EconomyServiceInfrastructureError) {
    return { code: err.code, category: "INFRASTRUCTURE" };
  }
  if (err instanceof EconomyRepositoryError && err.constructor.name === "EconomyInfrastructureError") {
    return { code: err.code, category: "INFRASTRUCTURE" };
  }
  if (err instanceof EconomyServiceError || err instanceof EconomyRepositoryError) {
    return { code: err.code, category: "BUSINESS" };
  }
  return { code: "UNKNOWN", category: "UNKNOWN" };
}

/** A conflicting terminal state — a DIFFERENT operation already won for this match — vs. an ordinary business rejection. Phase 8: "record a race-lost or permanent-conflict result... do not overwrite it," never retried either way. */
function isConflictingTerminalState(err: unknown): boolean {
  return (
    err instanceof MatchAlreadySettledError ||
    err instanceof MatchAlreadyRefundedError ||
    err instanceof MatchAlreadyForfeitedError
  );
}

export class DurableSettlementWorker {
  private readonly workerId: string;
  private readonly leaseSeconds: number;
  private readonly batchSize: number;
  private readonly maxInfrastructureRetries: number;
  private readonly periodicSweepIntervalMs: number;
  private readonly now: () => number;

  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  /** Non-overlapping sweeps — Phase 10's own requirement. */
  private sweeping = false;
  private stopped = false;
  private lastSweepAt: number | null = null;
  private lastSweepDurationMs: number | null = null;
  private lastSweepError: string | null = null;

  /**
   * Lightweight, purely in-process counters for this worker INSTANCE —
   * the synchronous equivalent of the old `EconomySettlementQueue.status()`
   * shape, for a `/health`-style endpoint that cannot `await` a database
   * round-trip. `status()` above is the richer, database-backed,
   * async view (Phase 11's admin surface); this is the cheap one.
   * Reset on process restart by construction — the authoritative,
   * durable counts always come from `listTerminalIntents`/`status()`,
   * never from this object alone.
   */
  private persistedCount = 0;
  private completedCount = 0;
  private replayedCount = 0;
  private retriedCount = 0;
  private failedCount = 0;
  private conflictingCount = 0;
  private lastFailureError: string | null = null;
  private lastFailureAt: number | null = null;

  /**
   * The race `drain()` must close: `enqueueX` is called fire-and-forget
   * from `RoomManager`'s synchronous `finalizeMatch`/`abandonRoom` (they
   * cannot `await` it — see those call sites' own comments), so by the
   * time a caller `await`s `drain()`, the CREATE-intent call for the
   * settlement that just happened may still be in flight. Without this
   * tracking, `drain()` could run its claim loop, find nothing yet
   * persisted, and return — exactly the flake this set exists to prevent.
   * `drain()` awaits every currently in-flight enqueue FIRST, so any
   * intent already on its way to being persisted is guaranteed durable
   * before the claim loop ever starts.
   */
  private readonly inFlightEnqueues = new Set<Promise<unknown>>();

  private trackInFlight<T>(promise: Promise<T>): Promise<T> {
    const tracked = promise.finally(() => {
      this.inFlightEnqueues.delete(tracked);
    });
    this.inFlightEnqueues.add(tracked);
    return tracked;
  }

  constructor(private readonly service: EconomyService, options: DurableSettlementWorkerOptions = {}) {
    this.workerId =
      options.workerId ?? `worker_${process.pid}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.leaseSeconds = options.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxInfrastructureRetries = options.maxInfrastructureRetries ?? DEFAULT_MAX_INFRASTRUCTURE_RETRIES;
    this.periodicSweepIntervalMs = options.periodicSweepIntervalMs ?? DEFAULT_PERIODIC_SWEEP_INTERVAL_MS;
    this.now = options.now ?? Date.now;
  }

  /* ═══════════════════════ enqueue (the RoomManager-facing API) ══════════
   * Persists the durable intent BEFORE returning — this is the whole point.
   * Callers that cannot `await` this (RoomManager's synchronous
   * `finalizeMatch`/`abandonRoom`) still get an observable failure: see
   * `RoomManager.ts`'s own call sites, which log loudly rather than
   * swallowing a rejected promise silently.
   */

  enqueueSettlement(request: SettleMatchEconomyRequest): Promise<TerminalIntentRecord> {
    return this.trackInFlight(this.doEnqueueSettlement(request));
  }

  private async doEnqueueSettlement(request: SettleMatchEconomyRequest): Promise<TerminalIntentRecord> {
    const payload: SettlementIntentPayload = {
      operationKind: "SETTLEMENT",
      matchId: request.matchId,
      isValidRanking: request.isValidRanking,
      participants: request.participants,
      refundReason: request.refundReason,
    };
    const outcome = await this.service.createTerminalIntent({
      matchId: request.matchId,
      operationKind: "SETTLEMENT",
      payload,
    });
    this.logConflictIfAny(outcome.conflict, request.matchId, "SETTLEMENT", outcome.intent.operationKind);
    this.persistedCount++;
    metricsRegistry.increment("economy.terminal_intent.persisted_total");
    metricsRegistry.increment("economy.terminal_intent.persisted.settlement_total");
    return outcome.intent;
  }

  enqueueRefund(matchId: string, reason: string): Promise<TerminalIntentRecord> {
    return this.trackInFlight(this.doEnqueueRefund(matchId, reason));
  }

  private async doEnqueueRefund(matchId: string, reason: string): Promise<TerminalIntentRecord> {
    const payload: RefundIntentPayload = { operationKind: "REFUND", matchId, reason };
    const outcome = await this.service.createTerminalIntent({ matchId, operationKind: "REFUND", payload });
    this.logConflictIfAny(outcome.conflict, matchId, "REFUND", outcome.intent.operationKind);
    this.persistedCount++;
    metricsRegistry.increment("economy.terminal_intent.persisted_total");
    metricsRegistry.increment("economy.terminal_intent.persisted.refund_total");
    return outcome.intent;
  }

  enqueueForfeiture(matchId: string, reason: string): Promise<TerminalIntentRecord> {
    return this.trackInFlight(this.doEnqueueForfeiture(matchId, reason));
  }

  private async doEnqueueForfeiture(matchId: string, reason: string): Promise<TerminalIntentRecord> {
    const payload: ForfeitureIntentPayload = { operationKind: "FORFEITURE", matchId, reason };
    const outcome = await this.service.createTerminalIntent({ matchId, operationKind: "FORFEITURE", payload });
    this.logConflictIfAny(outcome.conflict, matchId, "FORFEITURE", outcome.intent.operationKind);
    this.persistedCount++;
    metricsRegistry.increment("economy.terminal_intent.persisted_total");
    metricsRegistry.increment("economy.terminal_intent.persisted.forfeiture_total");
    return outcome.intent;
  }

  private logConflictIfAny(conflict: boolean, matchId: string, requested: string, recorded: string): void {
    if (!conflict) return;
    this.conflictingCount++;
    metricsRegistry.increment("economy.terminal_intent.conflicting_total");
    logger.error({
      message:
        `Terminal intent conflict for match ${matchId}: requested ${requested} but ${recorded} was already ` +
        "recorded for this match. The ALREADY-RECORDED intent remains authoritative and unmodified — this " +
        "requested operation was never persisted. This indicates two different lifecycle paths reached a " +
        "conflicting terminal decision for the same match and needs investigation.",
      module: "ECONOMY_DURABLE_WORKER",
      matchId,
    });
  }

  /* ═══════════════════════ claim + process one intent ═════════════════════ */

  /** Returns `true` if an intent was claimed and processed (successfully or not), `false` if nothing was eligible. */
  async processOnce(): Promise<boolean> {
    const claim = await this.service.claimTerminalIntent(this.workerId, this.leaseSeconds);
    if (!claim.claimed || !claim.intent) return false;
    metricsRegistry.increment("economy.terminal_intent.claimed_total");
    await this.processIntent(claim.intent);
    return true;
  }

  private async processIntent(intent: TerminalIntentRecord): Promise<void> {
    const startedAt = this.now();
    logger.info({
      message: `Processing terminal intent ${intent.id} (${intent.operationKind}) for match ${intent.matchId}, attempt ${intent.attemptCount}`,
      module: "ECONOMY_DURABLE_WORKER",
      matchId: intent.matchId,
    });
    try {
      const applied = await this.applyIntent(intent);
      await this.service.completeTerminalIntent(intent.id, this.workerId);
      this.completedCount++;
      metricsRegistry.increment("economy.terminal_intent.completed_total");
      metricsRegistry.recordHistogram("economy.terminal_intent.processing_duration_ms", this.now() - startedAt);
      if (!applied) {
        // A resolved, non-throwing `applied:false` is an authoritative
        // idempotent replay (this exact operation already happened) —
        // logged distinctly from a fresh application, never as an error.
        this.replayedCount++;
        metricsRegistry.increment("economy.terminal_intent.replayed_total");
        logger.info({
          message: `Terminal intent ${intent.id} replayed an already-applied ${intent.operationKind} for match ${intent.matchId} — no new mutation, intent completed`,
          module: "ECONOMY_DURABLE_WORKER",
          matchId: intent.matchId,
        });
      }
    } catch (err) {
      await this.handleFailure(intent, err);
    }
  }

  /** Returns the underlying operation's `applied` flag. Throws on any business or infrastructure failure — never swallowed here. */
  private async applyIntent(intent: TerminalIntentRecord): Promise<boolean> {
    switch (intent.payload.operationKind) {
      case "SETTLEMENT": {
        const result = await this.service.settleMatchEconomy({
          matchId: intent.payload.matchId,
          isValidRanking: intent.payload.isValidRanking,
          participants: intent.payload.participants,
          refundReason: intent.payload.refundReason,
        });
        return result.applied;
      }
      case "REFUND": {
        const result = await this.service.refundMatchEntry(intent.payload.matchId, intent.payload.reason);
        return result.applied;
      }
      case "FORFEITURE": {
        const result = await this.service.forfeitMatchEntry(intent.payload.matchId, intent.payload.reason);
        return result.applied;
      }
      default: {
        // A payload_version this worker does not recognize — refuse to
        // guess at a migrated shape (Phase 5's own requirement), fail
        // permanently rather than attempt a call with an unknown shape.
        const unknownKind: never = intent.payload;
        throw new EconomyServiceInfrastructureError(`Unrecognized terminal intent payload: ${JSON.stringify(unknownKind)}`);
      }
    }
  }

  private async handleFailure(intent: TerminalIntentRecord, err: unknown): Promise<void> {
    if (isConflictingTerminalState(err)) {
      // A DIFFERENT terminal operation already won for this match — never
      // retried, never silently discarded. Recorded as a permanent,
      // investigable conflict; the settlement itself is untouched (its own
      // idempotent guard already refused the second effect).
      this.conflictingCount++;
      this.failedCount++;
      metricsRegistry.increment("economy.terminal_intent.conflicting_total");
      const code = err instanceof Error ? err.name : "CONFLICTING_TERMINAL_STATE";
      this.lastFailureError = code;
      this.lastFailureAt = this.now();
      await this.service.markTerminalIntentFailed({
        intentId: intent.id,
        workerId: this.workerId,
        errorCode: code,
        errorCategory: "BUSINESS",
      });
      logger.error({
        message: `Terminal intent ${intent.id} (${intent.operationKind}) for match ${intent.matchId} lost to a conflicting terminal state: ${code}. Marked FAILED — investigate, do not blindly retry.`,
        module: "ECONOMY_DURABLE_WORKER",
        matchId: intent.matchId,
      });
      return;
    }

    const { code, category } = classifyError(err);
    if (category === "INFRASTRUCTURE" && intent.attemptCount < this.maxInfrastructureRetries) {
      this.retriedCount++;
      metricsRegistry.increment("economy.terminal_intent.retried_total");
      const nextAttemptAt = this.now() + RETRY_BACKOFF_MS(intent.attemptCount);
      await this.service.markTerminalIntentRetryable({
        intentId: intent.id,
        workerId: this.workerId,
        errorCode: code,
        errorCategory: category,
        nextAttemptAt,
      });
      logger.warn({
        message: `Terminal intent ${intent.id} (${intent.operationKind}) for match ${intent.matchId} hit an infrastructure error (${code}), attempt ${intent.attemptCount}/${this.maxInfrastructureRetries} — retryable, next attempt at ${new Date(nextAttemptAt).toISOString()}`,
        module: "ECONOMY_DURABLE_WORKER",
        matchId: intent.matchId,
      });
      return;
    }

    // Either a BUSINESS rejection (never retried — see EconomyService's own
    // identical policy) or an INFRASTRUCTURE failure that exhausted its
    // bounded retry budget (Invariant 10 — never retried indefinitely).
    this.failedCount++;
    this.lastFailureError = code;
    this.lastFailureAt = this.now();
    metricsRegistry.increment("economy.terminal_intent.permanently_failed_total");
    await this.service.markTerminalIntentFailed({
      intentId: intent.id,
      workerId: this.workerId,
      errorCode: code,
      errorCategory: category,
    });
    logger.error({
      message: `Terminal intent ${intent.id} (${intent.operationKind}) for match ${intent.matchId} permanently FAILED (${category}: ${code}) after ${intent.attemptCount} attempt(s) — operator review required.`,
      module: "ECONOMY_DURABLE_WORKER",
      matchId: intent.matchId,
    });
  }

  /* ═══════════════════════ sweeps ═══════════════════════════════════════ */

  /**
   * Processes up to `batchSize` eligible intents, then returns — never an
   * unbounded loop, so one sweep cannot monopolize the database. A single
   * poison intent (one that keeps failing) does not block the others: it
   * is claimed, fails, is marked RETRYABLE/FAILED (releasing its claim),
   * and the loop moves on to the next distinct intent `claimTerminalIntent`
   * finds — the same poison intent is only revisited once its own
   * `nextAttemptAt`/lease genuinely comes due again.
   */
  async runSweep(): Promise<{ processed: number; skipped: boolean }> {
    if (this.sweeping) return { processed: 0, skipped: true };
    this.sweeping = true;
    const startedAt = this.now();
    let processed = 0;
    try {
      for (let i = 0; i < this.batchSize; i++) {
        const didProcess = await this.processOnce();
        if (!didProcess) break;
        processed++;
      }
      this.lastSweepError = null;
      return { processed, skipped: false };
    } catch (err) {
      this.lastSweepError = err instanceof Error ? err.message : String(err);
      metricsRegistry.increment("economy.terminal_intent.sweep_failure_total");
      logger.error({
        message: `Recovery sweep failed after processing ${processed} intent(s): ${this.lastSweepError}`,
        module: "ECONOMY_DURABLE_WORKER",
      });
      return { processed, skipped: false };
    } finally {
      this.lastSweepAt = this.now();
      this.lastSweepDurationMs = this.now() - startedAt;
      metricsRegistry.recordHistogram("economy.terminal_intent.sweep_duration_ms", this.lastSweepDurationMs);
      this.sweeping = false;
    }
  }

  /**
   * Repeated sweeps until nothing is left to do — the startup recovery
   * entry point (Phase 10: "Discover PENDING, RETRYABLE-due, and expired
   * PROCESSING intents. Claim and process safely.") and the test /
   * graceful-shutdown drain primitive (Phase 8: "Support explicit drain
   * behavior"). Bounded by `maxSweeps` so a pathological, constantly-
   * regenerating backlog cannot hang a caller forever.
   *
   * ── The race this has to close, precisely ────────────────────────────
   * `enqueueX` is called fire-and-forget from `RoomManager`'s synchronous
   * methods, so `drain()` can legitimately be `await`ed by a caller at a
   * moment when the CREATE-intent call for the very settlement that
   * triggered this drain has not been INVOKED yet — not merely "still in
   * flight," genuinely not called yet (e.g. `queueCompensatingRefundForOrphanedCommit`,
   * reached only after several of ITS OWN await hops resolve following a
   * gated mock's `resolve()` — see `economyIntegration.test.ts`'s own
   * "orphaned commit-after-teardown race" tests, which call `drain()`
   * immediately after unblocking such a gate, with no timer advance in
   * between). `inFlightEnqueues` alone cannot catch this — there is
   * nothing in the set yet. Instead: after a sweep finds nothing, yield
   * the microtask queue (repeatedly, `await Promise.resolve()` — never a
   * real or fake timer, so this is unaffected by `vi.useFakeTimers()` and
   * involves no wall-clock wait at all) so any competing promise chain
   * that was ALREADY scheduled before this call gets its remaining hops
   * processed first, then check again whether new work appeared. Only
   * after `MICROTASK_YIELD_ROUNDS` consecutive empty checks does this
   * conclude there is genuinely nothing more coming.
   */
  async drain(maxSweeps = 1_000): Promise<void> {
    const MICROTASK_YIELD_ROUNDS = 25;
    for (let round = 0; round < maxSweeps; round++) {
      await Promise.allSettled([...this.inFlightEnqueues]);
      const { processed } = await this.runSweep();
      if (processed > 0) continue;

      let newWorkAppeared = false;
      for (let yieldAttempt = 0; yieldAttempt < MICROTASK_YIELD_ROUNDS; yieldAttempt++) {
        await Promise.resolve();
        if (this.inFlightEnqueues.size > 0) {
          newWorkAppeared = true;
          break;
        }
      }
      if (!newWorkAppeared) return;
    }
  }

  /** Starts periodic recovery. Idempotent — calling twice does not create a second timer. */
  start(): void {
    if (this.sweepTimer || this.stopped) return;
    this.sweepTimer = setInterval(() => {
      void this.runSweep();
    }, this.periodicSweepIntervalMs);
    this.sweepTimer.unref?.();
  }

  /** Stops periodic recovery. Leaves any durable work exactly as it is — nothing pending is deleted or altered. */
  stop(): void {
    this.stopped = true;
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  async status(): Promise<WorkerStatusSnapshot> {
    const [pending, processing, retryable, failed] = await Promise.all([
      this.service.listTerminalIntents({ status: "PENDING", limit: 200 }),
      this.service.listTerminalIntents({ status: "PROCESSING", limit: 200 }),
      this.service.listTerminalIntents({ status: "RETRYABLE", limit: 200 }),
      this.service.listTerminalIntents({ status: "FAILED", limit: 200 }),
    ]);
    const oldestPending = [...pending, ...retryable].reduce<number | null>((oldest, i) => {
      return oldest === null || i.createdAt < oldest ? i.createdAt : oldest;
    }, null);
    return {
      pending: pending.length,
      processing: processing.length,
      retryable: retryable.length,
      failed: failed.length,
      completed: -1, // unbounded — not enumerated here; see settlement_events / list_terminal_intents(status: COMPLETED) for a bounded operator query
      oldestPendingAgeMs: oldestPending === null ? null : this.now() - oldestPending,
      lastSweepAt: this.lastSweepAt,
      lastSweepDurationMs: this.lastSweepDurationMs,
      lastSweepError: this.lastSweepError,
    };
  }

  /**
   * The synchronous, in-process counterpart to `status()` — no database
   * round-trip, for a `/health`-style endpoint that cannot `await`. Mirrors
   * the shape the old `EconomySettlementQueue.status()` exposed (pending
   * count aside, which requires the async, database-backed `status()`
   * above — this worker's own in-memory pending notion would be
   * meaningless across a restart, unlike the durable counts).
   */
  counters(): {
    persisted: number;
    completed: number;
    replayed: number;
    retried: number;
    failed: number;
    conflicting: number;
    lastError: string | null;
    lastErrorAt: number | null;
  } {
    return {
      persisted: this.persistedCount,
      completed: this.completedCount,
      replayed: this.replayedCount,
      retried: this.retriedCount,
      failed: this.failedCount,
      conflicting: this.conflictingCount,
      lastError: this.lastFailureError,
      lastErrorAt: this.lastFailureAt,
    };
  }
}
