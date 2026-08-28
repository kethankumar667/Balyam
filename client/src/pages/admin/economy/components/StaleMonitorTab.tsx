import React, { useState } from "react";
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
} from "lucide-react";
import SectionHeader from "../../../../components/admin/section-header";
import StatusBadge from "../../../../components/admin/status-badge";
import DataTable, { type Column } from "../../../../components/admin/data-table";
import { CoinAmount } from "../../../../components/economy/CoinAmount";
import StaleSeverityBadge from "./StaleSeverityBadge";
import type { MatchEconomySettlementRecord } from "../../../../lib/economyApi";
import { formatTimeAgo } from "../../../../lib/formatTimeAgo";

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
      key: "matchId",
      header: "Match ID & Room",
      render: (item) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-xs text-[var(--chrome-ink)] block">
            {item.matchId}
          </span>
          <span className="text-[11px] text-[var(--chrome-ink-soft)] font-mono">
            Room {item.roomCode || "—"} • Host: {item.hostIdentityId?.slice(0, 14)}...
          </span>
        </div>
      ),
    },
    {
      key: "severity",
      header: "Stale Severity",
      render: (item) => <StaleSeverityBadge ageMs={now - item.createdAt} />,
    },
    {
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
      key: "actions",
      header: "Action",
      align: "right",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectMatch(item.matchId);
          }}
          className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer inline-flex items-center gap-1"
        >
          <span>Reconcile</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Header if Critical Stale Commitments exist */}
      {count60m > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
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
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
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
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            selectedSeverity === "60m"
              ? "bg-red-500/15 border-red-500 shadow-2xs text-red-700 dark:text-red-300"
              : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Critical (&gt;60m)</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
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
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            selectedSeverity === "15m"
              ? "bg-amber-500/15 border-amber-500 shadow-2xs text-amber-800 dark:text-amber-300"
              : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Warning (&gt;15m)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
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
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            selectedSeverity === "5m"
              ? "bg-yellow-500/15 border-yellow-500 shadow-2xs text-yellow-800 dark:text-yellow-300"
              : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase">Notice (&gt;5m)</span>
            <Clock className="w-4 h-4 text-yellow-500" />
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
        emptyIcon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
        onRowClick={(item) => onSelectMatch(item.matchId)}
        getRowAriaLabel={(item) =>
          `Inspect stale settlement for match ${item.matchId}`
        }
      />
    </div>
  );
}

export default StaleMonitorTab;
