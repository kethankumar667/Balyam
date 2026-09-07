import { Router, type Request, type Response } from "express";
import { requireOperationalAuth } from "../security/operationalAuth.js";
import { logger } from "../lib/logger.js";
import type { EconomyService } from "../economy/EconomyService.js";
import type {
  CoinLedgerEntryRecord,
  SettlementEventRecord,
} from "../persistence/EconomyRepository.js";

/**
 * `/api/admin/audit` — the platform's real, already-written audit trail,
 * merged into one feed.
 *
 * ── The two sources, and why nothing else is in here ─────────────────────
 * 1. `settlement_events` (`EconomyService.listRecentSettlementEvents`) — every
 *    match settlement/refund/forfeiture state transition, already recorded
 *    with `initiatorKind`/`initiatorId` for exactly this purpose.
 * 2. `coin_ledger_entries` where `entry_type = 'ADMIN_ADJUSTMENT'`
 *    (`EconomyService.listLedgerEntriesByType`) — manual operator wallet
 *    top-ups, which already carry the operator's id (`sourceId`) and their
 *    typed-in reason (`description`) — see `admin_adjust_wallet` SQL.
 *
 * There is no third source. Feature-flag changes, moderation actions
 * (mutes/bans), and security/HMAC events have no backing table today — the
 * previous console page showed all of those as fabricated rows
 * (`MOCK_AUDIT_LOGS`); this endpoint deliberately does not invent them.
 * Same for `actorName`/`actorRole`/`ipAddress` per row: nothing upstream
 * records a human name or an IP against these writes, only an identity id
 * (a Supabase `userId`, or the literal `"ops-key"`) — so this reports that
 * id, not a guessed name.
 *
 * ── Merge strategy ─────────────────────────────────────────────────────
 * Both sources are fetched independently (each already newest-first) up to
 * `limit`, combined, re-sorted by timestamp, and sliced to `limit`. This is
 * not true cross-source cursor pagination — a page boundary can, in
 * principle, split a tied timestamp across two calls — but for an ops
 * console reading the most recent N events, that is a fully acceptable
 * trade against the real complexity of a merged keyset cursor over two
 * independent tables.
 */

export type AuditLogKind = "SETTLEMENT" | "WALLET_ADJUSTMENT";

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  kind: AuditLogKind;
  /** The real, raw enum value from the source row — `SettlementEventType` or `WalletLedgerEntryType`. Never a fabricated code. */
  actionCode: string;
  initiatorKind: string;
  initiatorId: string | null;
  /** A match id (settlement events) or a wallet/identity id (ledger entries). */
  resourceId: string;
  detail: string;
  payload: Record<string, unknown>;
}

function fromSettlementEvent(event: SettlementEventRecord): AuditLogEntry {
  return {
    id: `settlement-${event.id}`,
    timestamp: event.createdAt,
    kind: "SETTLEMENT",
    actionCode: event.eventType,
    initiatorKind: event.initiatorKind,
    initiatorId: event.initiatorId,
    resourceId: event.matchId,
    detail: event.reason ?? `${event.operation}: ${event.previousStatus ?? "—"} → ${event.currentStatus}`,
    payload: {
      sequenceNumber: event.sequenceNumber,
      operation: event.operation,
      previousStatus: event.previousStatus,
      currentStatus: event.currentStatus,
      applied: event.applied,
      isReplay: event.isReplay,
      raceLost: event.raceLost,
      idempotencyKey: event.idempotencyKey,
      ...event.payload,
    },
  };
}

function fromLedgerEntry(entry: CoinLedgerEntryRecord): AuditLogEntry {
  return {
    id: `ledger-${entry.id}`,
    timestamp: entry.createdAt,
    kind: "WALLET_ADJUSTMENT",
    actionCode: entry.entryType,
    initiatorKind: entry.sourceKind,
    initiatorId: entry.sourceId || null,
    resourceId: entry.walletId,
    detail: entry.description,
    payload: {
      amount: entry.amount,
      balanceBefore: entry.balanceBefore,
      balanceAfter: entry.balanceAfter,
      idempotencyKey: entry.idempotencyKey,
    },
  };
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function createAuditRouter(economyService: EconomyService): Router {
  const router = Router();

  router.use(requireOperationalAuth);

  router.use((_req: Request, res: Response, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/", async (req: Request, res: Response) => {
    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
    const rawKind = req.query.kind;
    if (!isNonNegativeInteger(rawLimit)) {
      res.status(400).json({ error: "InvalidRequest", message: "limit must be a non-negative integer." });
      return;
    }
    if (rawKind !== undefined && rawKind !== "SETTLEMENT" && rawKind !== "WALLET_ADJUSTMENT") {
      res.status(400).json({ error: "InvalidRequest", message: "kind must be SETTLEMENT or WALLET_ADJUSTMENT." });
      return;
    }
    const limit = Math.min(rawLimit || 50, 200);

    try {
      const wantSettlements = rawKind === undefined || rawKind === "SETTLEMENT";
      const wantAdjustments = rawKind === undefined || rawKind === "WALLET_ADJUSTMENT";

      const [settlementEvents, ledgerEntries] = await Promise.all([
        wantSettlements ? economyService.listRecentSettlementEvents({ limit }) : Promise.resolve([]),
        wantAdjustments ? economyService.listLedgerEntriesByType("ADMIN_ADJUSTMENT", { limit }) : Promise.resolve([]),
      ]);

      const entries = [...settlementEvents.map(fromSettlementEvent), ...ledgerEntries.map(fromLedgerEntry)]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      res.json({ entries });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error({ message: `Audit log query failed: ${detail}`, module: "ADMIN_AUDIT" });
      res.status(503).json({ error: "AuditDataUnavailable", message: detail });
    }
  });

  return router;
}
