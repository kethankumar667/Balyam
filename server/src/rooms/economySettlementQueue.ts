import { logger } from "../lib/logger.js";
import type { EconomyService, SettleMatchEconomyRequest } from "../economy/EconomyService.js";

/**
 * SUPERSEDED (Blocker 06 — Economy V1 certification audit finding F-1).
 *
 * `RoomManager` no longer constructs this class — see its own
 * `durableWorker` field and `../economy/DurableSettlementWorker.ts`. The
 * gap this class could never close on its own is exactly what F-1 named:
 * `tail` below is a process-local `Promise` chain, so a queued
 * settlement/refund/forfeiture disappears if the process exits before it
 * runs. `DurableSettlementWorker` persists the complete, authoritative
 * intent to a durable table BEFORE any asynchronous dispatch, and recovers
 * it after a crash/restart/deploy — the guarantee this file's own design
 * comment below explains why it never had.
 *
 * Left in the repository unmodified (not deleted) — a smaller, safer
 * change than removing a file some other reference might still exist for,
 * and there is no harm in an unconstructed class remaining on disk. Kept
 * for historical/comparison reference only; do not construct this class in
 * new code.
 *
 * Queued settlement and refund work, after the synchronous room-lifecycle
 * functions that trigger them have already returned.
 *
 * ── Why a queue, not an `await` inside `finalizeMatch`/`abandonRoom` ────
 * `docs/economy/roommanager-async-boundary-proposal.md` (§4, §6, approved
 * design, not relitigated here): both functions are synchronous, called
 * from bot-move completion, timeout code, and six other call sites — no
 * player-visible action is waiting on settlement/refund the way match
 * START waits on entry commitment (§2 of that proposal), so there is no
 * requirement forcing either function to become `async`. The room is
 * marked finished/closed in memory immediately; the financial side follows.
 *
 * ── Why this mirrors `persistence/ProgressionSync.ts`, not a new pattern ──
 * Same shape, same reasoning: a serial `.then()`-chained tail per queue (one
 * item at a time, in order — never two settlement calls for the same match
 * racing each other), errors caught and counted rather than thrown into the
 * caller, a `drain()` for graceful shutdown, and a `status()` for /health.
 * This codebase already solved "synchronous caller, asynchronous durable
 * work" once; reusing that shape here is "do not create a parallel
 * architecture" applied literally.
 *
 * ── Retry policy: exactly what §5 of the proposal specifies ──────────────
 * `EconomyService` already retries an infrastructure error once,
 * internally, per call (Phase 5's own retry policy) — this queue does NOT
 * add a second retry loop on top of that. A queued call that still fails
 * (a business rejection, or an infrastructure error that survived the
 * service's own retry) is logged loudly and counted; the settlement/refund
 * remains in whatever state the database already has it in — `COMMITTED`
 * for a failed settlement, exactly the state
 * `list_stale_committed_settlements` (economy-v1.md §9) exists to surface.
 * No second recovery mechanism is invented here.
 */

export interface EconomySettlementQueueStatus {
  pending: number;
  settled: number;
  refunded: number;
  forfeited: number;
  failed: number;
  lastError: string | null;
  lastErrorAt: number | null;
}

export class EconomySettlementQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;
  private settled = 0;
  private refunded = 0;
  private forfeited = 0;
  private failed = 0;
  private lastError: string | null = null;
  private lastErrorAt: number | null = null;

  constructor(private readonly economyService: EconomyService) {}

  private enqueue(label: string, matchId: string, work: () => Promise<unknown>): void {
    this.pending += 1;
    this.tail = this.tail
      .then(() => work())
      .then(() => undefined)
      .catch((err) => {
        this.failed += 1;
        this.lastError = `${label}(${matchId}): ${err instanceof Error ? err.message : String(err)}`;
        this.lastErrorAt = Date.now();
        logger.error({
          message:
            `Queued ${label} failed for match ${matchId}: ${this.lastError}. The settlement remains ` +
            "in its prior database state — see list_stale_committed_settlements for reconciliation.",
          module: "ECONOMY_ROOM",
          matchId,
        });
      })
      .finally(() => {
        this.pending -= 1;
      });
  }

  /**
   * Queue `settle_match_economy` for a finished match. `request.matchId`
   * doubles as the idempotency key (economy-v1.md §6a) — safe to queue even
   * if, in a pathological case, something else already queued the same
   * matchId, since the underlying RPC is idempotent by construction.
   */
  queueSettlement(request: SettleMatchEconomyRequest): void {
    this.enqueue("settleMatchEconomy", request.matchId, async () => {
      const result = await this.economyService.settleMatchEconomy(request);
      this.settled += 1;
      logger.info({
        message: `Match ${request.matchId} settled (applied=${result.applied}, vouchers issued=${result.issuedVouchers.length})`,
        module: "ECONOMY_ROOM",
        matchId: request.matchId,
      });
      return result;
    });
  }

  /** Queue `refund_match_entry` for a cancelled/abandoned match. */
  queueRefund(matchId: string, reason: string): void {
    this.enqueue("refundMatchEntry", matchId, async () => {
      const result = await this.economyService.refundMatchEntry(matchId, reason);
      this.refunded += 1;
      logger.info({
        message: `Match ${matchId} refunded (applied=${result.applied})`,
        module: "ECONOMY_ROOM",
        matchId,
      });
      return result;
    });
  }

  /**
   * Queue `forfeit_match_entry` for a committed, actually-playing match
   * abandoned by player fault (voluntary departure or disconnect-grace
   * expiry) with no eligible signed-in successor remaining — see
   * `RoomManager.abandonRoom`'s "Economic routing" doc comment for the
   * exact refund-vs-forfeiture split. `matchId` doubles as the idempotency
   * key, same as `queueRefund`/`queueSettlement`. Never carries an amount —
   * `forfeitMatchEntry` derives the forfeited total from the settlement's
   * own `total_collected` server-side.
   */
  queueForfeiture(matchId: string, reason: string): void {
    this.enqueue("forfeitMatchEntry", matchId, async () => {
      const result = await this.economyService.forfeitMatchEntry(matchId, reason);
      this.forfeited += 1;
      logger.info({
        message: `Match ${matchId} forfeited to World Bank (applied=${result.applied})`,
        module: "ECONOMY_ROOM",
        matchId,
      });
      return result;
    });
  }

  status(): EconomySettlementQueueStatus {
    return {
      pending: this.pending,
      settled: this.settled,
      refunded: this.refunded,
      forfeited: this.forfeited,
      failed: this.failed,
      lastError: this.lastError,
      lastErrorAt: this.lastErrorAt,
    };
  }

  /** Wait for every queued item — called on graceful shutdown and by tests, mirroring ProgressionSync.drain(). */
  async drain(): Promise<void> {
    let previous: Promise<void>;
    do {
      previous = this.tail;
      await previous.catch(() => undefined);
    } while (previous !== this.tail);
  }
}
