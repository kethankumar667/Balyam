import React, { useState } from "react";
import {
  Search,
  Gamepad2,
  Clock,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  User,
  Landmark,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import SectionHeader from "../../../../components/admin/section-header";
import StatusBadge from "../../../../components/admin/status-badge";
import ActivityTimeline, { type TimelineItem } from "../../../../components/admin/activity-timeline";
import { CoinAmount } from "../../../../components/economy/CoinAmount";
import ConservationBadge from "./ConservationBadge";
import {
  getMatchSettlement,
  reconcileMatchSettlement,
  type MatchEconomySettlementRecord,
  type SettlementReconciliation,
} from "../../../../lib/economyApi";
import { formatTimeAgo } from "../../../../lib/formatTimeAgo";

interface MatchInvestigationTabProps {
  initialMatchId?: string;
}

export function MatchInvestigationTab({ initialMatchId = "" }: MatchInvestigationTabProps) {
  const [searchMatchId, setSearchMatchId] = useState<string>(initialMatchId);
  const [settlement, setSettlement] = useState<MatchEconomySettlementRecord | null>(null);
  const [reconciliation, setReconciliation] = useState<SettlementReconciliation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = searchMatchId.trim();
    if (!cleanId) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSettlement(null);
    setReconciliation(null);

    try {
      const [settleRes, reconRes] = await Promise.all([
        getMatchSettlement(cleanId).catch(() => null),
        reconcileMatchSettlement(cleanId).catch(() => null),
      ]);

      if (settleRes?.settlement) {
        setSettlement(settleRes.settlement);
        setReconciliation(reconRes?.reconciliation ?? null);
      } else {
        // No fabricated placeholder: a match ID that doesn't resolve to a
        // real settlement is reported as not found, not papered over with
        // a synthetic "everything is fine" record — this tool exists for
        // incident investigation, where that would actively mask a real
        // problem instead of surfacing one.
        setError(`No settlement record found for match ID "${cleanId}".`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inspect match settlement");
    } finally {
      setIsLoading(false);
    }
  };

  const timelineItems: TimelineItem[] = [];
  if (settlement) {
    timelineItems.push({
      id: "t-1",
      title: "Match Entry Commitment",
      description: `Host ${settlement.hostIdentityId} committed ${settlement.totalCollected} 🪙 (${settlement.seatCount} seats @ ${settlement.costPerSeat} 🪙).`,
      timestamp: new Date(settlement.createdAt).toLocaleTimeString(),
      icon: <Clock className="w-2.5 h-2.5" />,
      iconBg: "bg-amber-500 text-zinc-950",
    });

    if (settlement.status === "SETTLED") {
      timelineItems.push({
        id: "t-2",
        title: "Gameplay Completed & Settled",
        description: `Rewards: ${settlement.totalWalletRewarded} 🪙 wallet credits, ${settlement.totalGuestEscrow} 🪙 guest escrow, ${settlement.totalWorldBankCut} 🪙 protocol cut.`,
        timestamp: settlement.settledAt ? new Date(settlement.settledAt).toLocaleTimeString() : "Settled",
        icon: <ShieldCheck className="w-2.5 h-2.5" />,
        iconBg: "bg-emerald-500 text-zinc-950",
        statusBadge: <ConservationBadge isConserved={reconciliation?.isConserved ?? true} size="sm" />,
      });
    } else if (settlement.status === "REFUNDED") {
      timelineItems.push({
        id: "t-2",
        title: "Match Entry Refunded",
        description: settlement.refundReason
          ? `Compensating refund applied (${settlement.totalRefunded} 🪙): "${settlement.refundReason}"`
          : `Full entry pool of ${settlement.totalRefunded} 🪙 returned to host wallet.`,
        timestamp: settlement.settledAt ? new Date(settlement.settledAt).toLocaleTimeString() : "Refunded",
        icon: <RotateCcw className="w-2.5 h-2.5" />,
        iconBg: "bg-blue-500 text-white",
      });
    } else if (settlement.status === "ABANDONMENT_FORFEITED") {
      timelineItems.push({
        id: "t-2",
        title: "Match Abandoned — Forfeited to World Bank",
        description: `All human players departed mid-match. Entire pool of ${settlement.totalCollected} 🪙 captured to platform treasury.`,
        timestamp: settlement.settledAt ? new Date(settlement.settledAt).toLocaleTimeString() : "Forfeited",
        icon: <AlertTriangle className="w-2.5 h-2.5" />,
        iconBg: "bg-red-500 text-white",
      });
    } else {
      timelineItems.push({
        id: "t-2",
        title: "Match In-Progress",
        description: "Entry fee committed, match active or awaiting terminal outcome.",
        timestamp: "Active",
        icon: <Clock className="w-2.5 h-2.5" />,
        iconBg: "bg-amber-400 text-zinc-950",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Match Search Bar */}
      <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-3">
        <SectionHeader
          title="Match Investigation & Forensic Reconciliation"
          description="Enter a Match ID to inspect seat configuration, monetary distributions, and mathematical conservation audit"
        />

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--chrome-ink-soft)] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchMatchId}
              onChange={(e) => setSearchMatchId(e.target.value)}
              placeholder="Enter Match ID (e.g. m_KD22TL_17877...)..."
              aria-label="Match ID"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-xs font-mono text-[var(--chrome-ink)] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchMatchId.trim()}
            className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-50 transition cursor-pointer shrink-0"
          >
            {isLoading ? "Inspecting..." : "Inspect Match"}
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* 2. Match Details & Forensic Panel */}
      {settlement && (
        <div className="space-y-6">
          {/* Conservation Banner */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-[var(--chrome-ink)]">
                  Match #{settlement.matchId}
                </span>
                <StatusBadge
                  status={
                    settlement.status === "SETTLED"
                      ? "healthy"
                      : settlement.status === "REFUNDED"
                      ? "completed"
                      : settlement.status === "COMMITTED"
                      ? "warning"
                      : "critical"
                  }
                  label={settlement.status}
                  size="sm"
                />
              </div>
              <p className="text-xs text-[var(--chrome-ink-soft)] font-mono">
                Room {settlement.roomCode || "—"} • Created {formatTimeAgo(settlement.createdAt)}
              </p>
            </div>

            <ConservationBadge
              isConserved={reconciliation ? reconciliation.isConserved : settlement.status === "SETTLED"}
              discrepancy={reconciliation?.discrepancy}
              size="lg"
            />
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Seat Setup</span>
              <span className="font-mono font-bold text-sm text-[var(--chrome-ink)] mt-0.5 block">
                {settlement.seatCount} Seats ({settlement.humanSeatCount}H / {settlement.botSeatCount}B)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Cost Per Seat</span>
              <CoinAmount amount={settlement.costPerSeat} size="sm" className="font-bold mt-0.5" />
            </div>

            <div className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Total Collected</span>
              <CoinAmount amount={settlement.totalCollected} size="sm" className="font-extrabold text-amber-600 dark:text-amber-400 mt-0.5" />
            </div>

            <div className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Host Identity</span>
              <span className="font-mono font-bold text-xs text-[var(--chrome-ink)] truncate block mt-0.5">
                {settlement.hostIdentityId?.slice(0, 14)}...
              </span>
            </div>
          </div>

          {/* Outcome Breakdown & Timeline Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Ledger Breakdown */}
            <div className="space-y-3">
              <SectionHeader
                title="Financial Distribution"
                description="Double-entry breakdown of where match entry funds were routed"
              />

              <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs divide-y divide-[var(--chrome-hairline)] overflow-hidden text-xs">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[var(--chrome-ink-soft)]">Total Debited from Host</span>
                  <CoinAmount amount={settlement.totalCollected} size="sm" className="font-bold text-[var(--chrome-ink)]" />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[var(--chrome-ink-soft)]">Wallet Credits (1st/2nd/3rd Prizes)</span>
                  <CoinAmount amount={settlement.totalWalletRewarded} size="sm" className="font-bold text-emerald-700 dark:text-emerald-400" />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[var(--chrome-ink-soft)]">Guest Escrow Allocation</span>
                  <CoinAmount amount={settlement.totalGuestEscrow} size="sm" className="font-bold text-purple-700 dark:text-purple-400" />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[var(--chrome-ink-soft)]">Bot Victory Prize Rake</span>
                  <CoinAmount amount={settlement.totalBotCollection} size="sm" className="font-bold text-blue-700 dark:text-blue-400" />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[var(--chrome-ink-soft)]">World Bank Protocol Cut</span>
                  <CoinAmount amount={settlement.totalWorldBankCut} size="sm" className="font-bold text-amber-700 dark:text-amber-400" />
                </div>

                {settlement.status === "REFUNDED" && (
                  <div className="p-3.5 flex items-center justify-between bg-blue-500/5">
                    <span className="font-bold text-blue-700 dark:text-blue-300">Total Refunded to Host</span>
                    <CoinAmount amount={settlement.totalRefunded} size="sm" className="font-bold text-blue-700 dark:text-blue-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="space-y-3">
              <SectionHeader
                title="Match Lifecycle Progression"
                description="Chronological state timeline from commitment to settlement"
              />

              <ActivityTimeline items={timelineItems} />
            </div>
          </div>
        </div>
      )}

      {/* Empty State before search */}
      {!settlement && !hasSearched && (
        <div className="p-12 text-center text-xs text-[var(--chrome-ink-soft)] bg-[var(--chrome-panel)] rounded-2xl border border-[var(--chrome-border)] space-y-2">
          <Gamepad2 className="w-8 h-8 text-[var(--chrome-ink-soft)] mx-auto opacity-50" />
          <h4 className="font-bold text-sm text-[var(--chrome-ink)]">Enter a Match ID to Investigate</h4>
          <p>
            Lookup any match record above to review seat counts, host debits, reward disbursements, and mathematical double-entry conservation proofs.
          </p>
        </div>
      )}
    </div>
  );
}

export default MatchInvestigationTab;
