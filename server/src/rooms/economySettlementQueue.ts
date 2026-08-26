import { logger } from "../lib/logger.js";
import type { EconomyService, SettleMatchEconomyRequest } from "../economy/EconomyService.js";

/**
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
  failed: number;
  lastError: string | null;
  lastErrorAt: number | null;
}

export class EconomySettlementQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;
  private settled = 0;
  private refunded = 0;
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

  status(): EconomySettlementQueueStatus {
    return {
      pending: this.pending,
      settled: this.settled,
      refunded: this.refunded,
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
