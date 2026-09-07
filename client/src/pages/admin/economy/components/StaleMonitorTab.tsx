import React, { useCallback, useEffect, useState } from "react";
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Landmark,
  ListChecks,
} from "lucide-react";
import SectionHeader from "../../../../components/admin/section-header";
import StatusBadge from "../../../../components/admin/status-badge";
import DataTable, { type Column } from "../../../../components/admin/data-table";
import { CoinAmount } from "../../../../components/economy/CoinAmount";
import StaleSeverityBadge from "./StaleSeverityBadge";
import TerminalIntentDrawer from "./TerminalIntentDrawer";
import {
  listTerminalIntents,
  type MatchEconomySettlementRecord,
  type TerminalIntentRecord,
  type TerminalIntentStatus,
} from "../../../../lib/economyApi";
import { formatTimeAgo } from "../../../../lib/formatTimeAgo";

const INTENT_STATUS_FILTERS: Array<TerminalIntentStatus | "ALL"> = [
  "ALL",
  "FAILED",
  "PROCESSING",
  "RETRYABLE",
  "PENDING",
  "COMPLETED",
];

/** `TerminalIntentStatus` -> the shared `StatusBadge` vocabulary. */
function intentBadgeStatus(status: TerminalIntentStatus): string {
  switch (status) {
    case "FAILED":
      return "failed";
    case "COMPLETED":
      return "completed";
    case "PROCESSING":
      return "active";
    case "RETRYABLE":
      return "warning";
    default:
      return "pending";
  }
}

interface StaleMonitorTabProps {
  staleSettlements: MatchEconomySettlementRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectMatch: (matchId: string) => void;
}

export function StaleMonitorTab({
  staleSettlements,
  isLoading,
  onRefresh,
  onSelectMatch,
}: StaleMonitorTabProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<"ALL" | "60m" | "15m" | "5m">("ALL");

  const [intents, setIntents] = useState<TerminalIntentRecord[]>([]);
  const [intentsLoading, setIntentsLoading] = useState(true);
  const [intentsError, setIntentsError] = useState<string | null>(null);
  const [intentStatusFilter, setIntentStatusFilter] = useState<TerminalIntentStatus | "ALL">("FAILED");
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);

  const loadIntents = useCallback(async () => {
    setIntentsLoading(true);
    setIntentsError(null);
    try {
      const res = await listTerminalIntents(intentStatusFilter === "ALL" ? undefined : intentStatusFilter);
      setIntents(res.intents);
    } catch (err) {
      setIntentsError(err instanceof Error ? err.message : "Failed to load terminal intents.");
    } finally {
      setIntentsLoading(false);
    }
  }, [intentStatusFilter]);

  useEffect(() => {
    void loadIntents();
  }, [loadIntents]);

  const now = Date.now();

  const count60m = staleSettlements.filter((s) => now - s.createdAt >= 60 * 60_000).length;
  const count15m = staleSettlements.filter(
    (s) => now - s.createdAt >= 15 * 60_000 && now - s.createdAt < 60 * 60_000,
  ).length;
  const count5m = staleSettlements.filter(
    (s) => now - s.createdAt >= 5 * 60_000 && now - s.createdAt < 15 * 60_000,
  ).length;

  const filteredData = staleSettlements.filter((s) => {
    const age = now - s.createdAt;
    if (selectedSeverity === "60m") return age >= 60 * 60_000;
    if (selectedSeverity === "15m") return age >= 15 * 60_000 && age < 60 * 60_000;
    if (selectedSeverity === "5m") return age >= 5 * 60_000 && age < 15 * 60_000;
    return true;
  });

  const columns: Column<MatchEconomySettlementRecord>[] = [
    {
      kind: "property",
      key: "matchId",
      header: "Match ID & Room",
      render: (item) => (
        <div className="space-y-0.5 min-w-0">
          <span
            className="font-mono font-bold text-xs text-[var(--chrome-ink)] block truncate max-w-[180px] sm:max-w-xs"
            title={item.matchId}
          >
            {item.matchId}
          </span>
          <span className="text-[11px] text-[var(--chrome-ink-soft)] font-mono block truncate">
            Room {item.roomCode || "—"} • Host: {item.hostIdentityId?.slice(0, 14)}...
          </span>
        </div>
      ),
    },
    {
      // Computed: "severity" is not a real field — it's derived from age.
      kind: "computed",
      key: "severity",
      header: "Stale Severity",
      render: (item) => <StaleSeverityBadge ageMs={now - item.createdAt} />,
    },
    {
      // Computed: "age" is not a real field — derived from createdAt vs now.
      kind: "computed",
      key: "age",
      header: "Committed Age",
      render: (item) => (
        <div className="text-xs font-mono">
          <span className="text-[var(--chrome-ink)] font-bold block">{formatTimeAgo(item.createdAt)}</span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)]">
            {new Date(item.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      // Computed: combines totalCollected, seatCount, costPerSeat; no
      // single "amount" field exists on the row.
      kind: "computed",
      key: "amount",
      header: "Committed Amount",
      align: "right",
      render: (item) => (
        <div className="text-right">
          <CoinAmount amount={item.totalCollected} size="sm" className="font-bold text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono block">
            {item.seatCount} seats @ {item.costPerSeat} 🪙
          </span>
        </div>
      ),
    },
    {
      // Computed: classic synthetic action-button column — no backing field.
      kind: "computed",
      key: "actions",
      header: "Action",
      align: "right",
      render: (item) => (
        <button
          type="button"
          aria-label={`Reconcile match ${item.matchId}`}
          title={`Reconcile match ${item.matchId}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectMatch(item.matchId);
          }}
          className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span>Reconcile</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </button>
      ),
    },
  ];

  const intentColumns: Column<TerminalIntentRecord>[] = [
    {
      kind: "property",
      key: "matchId",
      header: "Match ID & Operation",
      render: (item) => (
        <div className="space-y-0.5 min-w-0">
          <span
            className="font-mono font-bold text-xs text-[var(--chrome-ink)] block truncate max-w-[180px] sm:max-w-xs"
            title={item.matchId}
          >
            {item.matchId}
          </span>
          <span className="text-[11px] text-[var(--chrome-ink-soft)] block">{item.operationKind}</span>
        </div>
      ),
    },
    {
      kind: "property",
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={intentBadgeStatus(item.status)} label={item.status} size="sm" />,
    },
    {
      kind: "property",
      key: "attemptCount",
      header: "Attempts",
      align: "center",
      render: (item) => <span className="font-mono text-xs text-[var(--chrome-ink)]">{item.attemptCount}</span>,
    },
    {
      kind: "property",
      key: "lastErrorCode",
      header: "Last Error",
      render: (item) => (
        <span className="font-mono text-[11px] text-[var(--chrome-ink-soft)] truncate block max-w-[220px]">
          {item.lastErrorCode ?? "—"}
        </span>
      ),
    },
    {
      kind: "property",
      key: "updatedAt",
      header: "Updated",
      align: "right",
      render: (item) => (
        <span className="text-xs font-mono text-[var(--chrome-ink-soft)]">{formatTimeAgo(item.updatedAt)}</span>
      ),
    },
    {
      kind: "computed",
      key: "actions",
      header: "Action",
      align: "right",
      render: (item) => (
        <button
          type="button"
          aria-label={`Manage terminal intent for match ${item.matchId}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedIntentId(item.id);
          }}
          className="h-8 px-3 rounded-lg bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] font-bold text-xs transition cursor-pointer inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span>Manage</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Header if Critical Stale Commitments exist */}
      {count60m > 0 && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 flex items-start gap-3 shadow-2xs"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="font-extrabold text-sm">Critical Stale Commitments Detected</h4>
            <p className="text-xs mt-0.5">
              {count60m} match commitment(s) have been stuck in `COMMITTED` for over 1 hour without reaching terminal settlement or refund. Inspect these records below to verify compensating refund execution.
            </p>
          </div>
        </div>
      )}

      {/* Severity Filter Cards */}
      <div role="group" aria-label="Filter by stale severity" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setSelectedSeverity("ALL")}
          aria-pressed={selectedSeverity === "ALL"}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            selectedSeverity === "ALL"
              ? "bg-[var(--chrome-active-bg)] border-[var(--chrome-active-ink)] shadow-2xs"
              : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
          }`}
        >
          <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase block">All Stale</span>
          <span className="text-2xl font-black font-mono text-[var(--chrome-ink)] mt-1 block">
            {staleSettlements.length}
          </span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)]">Total pending commitments</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSeverity("60m")}
          aria-pressed={selectedSeverity === "60m"}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            selectedSeverity === "60m"
              ? "bg-red-500/15 border-red-500 shadow-2xs text-red-700 dark:text-red-300"
              : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Critical (&gt;60m)</span>
            <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
          </div>
          <span className="text-2xl font-black font-mono text-red-700 dark:text-red-400 mt-1 block">
            {count60m}
          </span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)]">Immediate review required</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSeverity("15m")}
          aria-pressed={selectedSeverity === "15m"}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            selectedSeverity === "15m"
              ? "bg-amber-500/15 border-amber-500 shadow-2xs text-amber-800 dark:text-amber-300"
              : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Warning (&gt;15m)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
          </div>
          <span className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1 block">
            {count15m}
          </span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)]">Elevated match duration</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSeverity("5m")}
          aria-pressed={selectedSeverity === "5m"}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            selectedSeverity === "5m"
              ? "bg-yellow-500/15 border-yellow-500 shadow-2xs text-yellow-800 dark:text-yellow-300"
              : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase">Notice (&gt;5m)</span>
            <Clock className="w-4 h-4 text-yellow-500" aria-hidden="true" />
          </div>
          <span className="text-2xl font-black font-mono text-yellow-800 dark:text-yellow-300 mt-1 block">
            {count5m}
          </span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)]">Active gameplay monitoring</span>
        </button>
      </div>

      {/* Stale Settlements Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={isLoading}
        emptyMessage="Zero Stale Commitments"
        emptyDescription="All committed match entries have reached terminal settlement, refund, or forfeiture within SLA."
        emptyIcon={<CheckCircle2 className="w-8 h-8 text-emerald-500" aria-hidden="true" />}
        onRowClick={(item) => onSelectMatch(item.matchId)}
        getRowAriaLabel={(item) =>
          `Inspect stale settlement for match ${item.matchId}`
        }
      />

      {/* Terminal Intent Queue (Blocker 06) — the durable async job queue that
          actually performs settlement/refund/forfeiture writes. A stale
          COMMITTED settlement above is usually caused by one of these being
          FAILED or stuck PROCESSING; this is where an operator can act on it. */}
      <div className="space-y-4 pt-2">
        <SectionHeader
          badge={<ListChecks className="w-4 h-4 text-[var(--chrome-ink-soft)]" aria-hidden="true" />}
          title="Terminal Intent Queue"
          description="The durable job queue behind every settlement, refund, and forfeiture write. Retry a FAILED intent or reclaim a stuck PROCESSING one."
          actions={
            <button
              type="button"
              onClick={() => void loadIntents()}
              disabled={intentsLoading}
              className="h-8 px-3 rounded-lg bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${intentsLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          }
        />

        <div role="group" aria-label="Filter terminal intents by status" className="flex flex-wrap gap-1.5">
          {INTENT_STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setIntentStatusFilter(status)}
              aria-pressed={intentStatusFilter === status}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition cursor-pointer border ${
                intentStatusFilter === status
                  ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] border-[var(--chrome-active-ink)]"
                  : "bg-[var(--chrome-panel)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] border-[var(--chrome-border)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {intentsError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
            {intentsError}
          </div>
        )}

        <DataTable
          columns={intentColumns}
          data={intents}
          loading={intentsLoading}
          emptyMessage="No matching terminal intents"
          emptyDescription="No durable terminal intents currently have this status."
          emptyIcon={<CheckCircle2 className="w-8 h-8 text-emerald-500" aria-hidden="true" />}
          onRowClick={(item) => setSelectedIntentId(item.id)}
          getRowAriaLabel={(item) => `Open terminal intent details for match ${item.matchId}`}
        />
      </div>

      <TerminalIntentDrawer
        intentId={selectedIntentId}
        isOpen={selectedIntentId !== null}
        onClose={() => setSelectedIntentId(null)}
        onChanged={() => void loadIntents()}
      />
    </div>
  );
}

export default StaleMonitorTab;
