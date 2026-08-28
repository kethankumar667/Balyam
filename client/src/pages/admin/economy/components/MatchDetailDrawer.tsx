import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  User,
  Bot,
  Landmark,
  FileText,
  RotateCcw,
  Sparkles,
  Layers,
} from "lucide-react";
import DetailDrawer from "../../../../components/admin/detail-drawer";
import StatusBadge from "../../../../components/admin/status-badge";
import InfoCard from "../../../../components/admin/info-card";
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

interface MatchDetailDrawerProps {
  matchId: string | null;
  initialSettlement?: MatchEconomySettlementRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MatchDetailDrawer({
  matchId,
  initialSettlement,
  isOpen,
  onClose,
}: MatchDetailDrawerProps) {
  const [settlement, setSettlement] = useState<MatchEconomySettlementRecord | null>(initialSettlement ?? null);
  const [reconciliation, setReconciliation] = useState<SettlementReconciliation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !matchId) {
      if (!initialSettlement) setSettlement(null);
      setReconciliation(null);
      setError(null);
      return;
    }

    let active = true;
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [settleRes, reconRes] = await Promise.all([
          getMatchSettlement(matchId).catch(() => null),
          reconcileMatchSettlement(matchId).catch(() => null),
        ]);

        if (!active) return;

        if (settleRes) {
          setSettlement(settleRes.settlement);
        } else if (initialSettlement) {
          setSettlement(initialSettlement);
        }

        if (reconRes) {
          setReconciliation(reconRes.reconciliation);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load match settlement details");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchDetails();
    return () => {
      active = false;
    };
  }, [isOpen, matchId, initialSettlement]);

  const handleCopyMatchId = () => {
    if (!matchId) return;
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    void navigator.clipboard.writeText(matchId);
    setCopiedId(true);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedId(false);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  const statusType =
    settlement?.status === "SETTLED"
      ? "healthy"
      : settlement?.status === "REFUNDED"
      ? "completed"
      : settlement?.status === "COMMITTED"
      ? "warning"
      : settlement?.status === "ABANDONMENT_FORFEITED"
      ? "critical"
      : "pending";

  const timelineItems: TimelineItem[] = [];
  if (settlement) {
    timelineItems.push({
      id: "t-1",
      title: "Match Entry Fee Committed",
      description: `Host ${settlement.hostIdentityId} committed ${settlement.totalCollected} 🪙 for ${settlement.seatCount} seats (${settlement.costPerSeat} 🪙/seat).`,
      timestamp: new Date(settlement.createdAt).toLocaleTimeString(),
      icon: <Clock className="w-2.5 h-2.5" aria-hidden="true" />,
      iconBg: "bg-amber-500 text-zinc-950",
    });

    if (settlement.status === "SETTLED") {
      timelineItems.push({
        id: "t-2",
        title: "Gameplay Completed & Settled",
        description: `Rewards distributed: ${settlement.totalWalletRewarded} 🪙 wallet credits, ${settlement.totalGuestEscrow} 🪙 guest escrow, ${settlement.totalWorldBankCut} 🪙 protocol cut.`,
        timestamp: settlement.settledAt ? new Date(settlement.settledAt).toLocaleTimeString() : "Settled",
        icon: <ShieldCheck className="w-2.5 h-2.5" aria-hidden="true" />,
        iconBg: "bg-emerald-500 text-zinc-950",
        statusBadge: <ConservationBadge isConserved={reconciliation?.isConserved ?? null} size="sm" />,
      });
    } else if (settlement.status === "REFUNDED") {
      timelineItems.push({
        id: "t-2",
        title: "Match Entry Refunded",
        description: settlement.refundReason
          ? `Compensating refund applied (${settlement.totalRefunded} 🪙): "${settlement.refundReason}"`
          : `Full entry pool of ${settlement.totalRefunded} 🪙 returned to host wallet.`,
        timestamp: settlement.settledAt ? new Date(settlement.settledAt).toLocaleTimeString() : "Refunded",
        icon: <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />,
        iconBg: "bg-blue-500 text-white",
      });
    } else if (settlement.status === "ABANDONMENT_FORFEITED") {
      timelineItems.push({
        id: "t-2",
        title: "Match Abandoned — Pool Forfeited",
        description: `All human players departed mid-match. Entire pool of ${settlement.totalCollected} 🪙 forfeited to World Bank Treasury.`,
        timestamp: settlement.settledAt ? new Date(settlement.settledAt).toLocaleTimeString() : "Forfeited",
        icon: <AlertCircle className="w-2.5 h-2.5" aria-hidden="true" />,
        iconBg: "bg-red-500 text-white",
      });
    } else {
      timelineItems.push({
        id: "t-2",
        title: "Match In-Progress / Awaiting Resolution",
        description: "Entry fee committed, match active or awaiting terminal outcome.",
        timestamp: "Active",
        icon: <Clock className="w-2.5 h-2.5" aria-hidden="true" />,
        iconBg: "bg-amber-400 text-zinc-950",
      });
    }
  }

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Match Investigation"
      subtitle={matchId ?? "—"}
      badge={settlement ? <StatusBadge status={statusType} label={settlement.status} size="sm" /> : undefined}
    >
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold">Investigation Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Match ID Quick Copy Card with Accessible Live Feedback */}
        {matchId && (
          <div className="p-3 rounded-xl bg-[var(--chrome-control)]/70 border border-[var(--chrome-border)] flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] block">
                Investigating Match Identifier
              </span>
              <span
                className="font-mono font-bold text-[var(--chrome-ink)] truncate block text-xs"
                title={matchId}
              >
                {matchId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyMatchId}
              aria-label="Copy Match ID to clipboard"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--chrome-border)] bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-ink)] font-bold text-xs transition cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                  <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--chrome-ink-soft)]" aria-hidden="true" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
            <span className="sr-only" aria-live="polite">
              {copiedId ? "Match ID copied to clipboard" : ""}
            </span>
          </div>
        )}

        {/* 1. Mathematical Conservation Status */}
        <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/80 border border-[var(--chrome-border)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--chrome-ink)]">
              Conservation Audit
            </span>
            <ConservationBadge
              isConserved={reconciliation ? reconciliation.isConserved : null}
              discrepancy={reconciliation?.discrepancy}
            />
          </div>
          <p className="text-xs text-[var(--chrome-ink-soft)]">
            {reconciliation?.detail ??
              (settlement
                ? "Reconciliation audit pending or unavailable for this match."
                : "Match commitment in-flight.")}
          </p>
        </div>

        {/* 2. Core Metadata Grid */}
        {settlement ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs min-w-0">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Room Code</span>
              <span className="font-mono font-bold text-sm text-[var(--chrome-ink)] truncate block" title={settlement.roomCode || "—"}>
                {settlement.roomCode || "—"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs min-w-0">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Seats</span>
              <span className="font-mono font-bold text-sm text-[var(--chrome-ink)] truncate block">
                {settlement.seatCount} ({settlement.humanSeatCount}H/{settlement.botSeatCount}B)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs min-w-0">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Cost Per Seat</span>
              <CoinAmount amount={settlement.costPerSeat} size="sm" className="font-bold" />
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs min-w-0">
              <span className="text-[10px] font-bold text-[var(--chrome-ink-soft)] uppercase block">Total Collected</span>
              <CoinAmount amount={settlement.totalCollected} size="sm" className="font-extrabold text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--chrome-control)]" />
            ))}
          </div>
        ) : null}

        {/* 3. Financial Breakdown Table */}
        {settlement && (
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--chrome-ink)] flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>Financial Outcome Breakdown</span>
            </h4>

            <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs divide-y divide-[var(--chrome-hairline)] overflow-hidden text-xs">
              <div className="p-3.5 flex items-center justify-between gap-2">
                <span className="text-[var(--chrome-ink-soft)]">Total Collected (Host Debit)</span>
                <CoinAmount amount={settlement.totalCollected} size="sm" className="font-bold text-[var(--chrome-ink)]" />
              </div>

              <div className="p-3.5 flex items-center justify-between gap-2">
                <span className="text-[var(--chrome-ink-soft)]">Wallet Rewarded (Player Prizes)</span>
                <CoinAmount amount={settlement.totalWalletRewarded} size="sm" className="font-bold text-emerald-700 dark:text-emerald-400" />
              </div>

              <div className="p-3.5 flex items-center justify-between gap-2">
                <span className="text-[var(--chrome-ink-soft)]">Guest Escrow Allocation</span>
                <CoinAmount amount={settlement.totalGuestEscrow} size="sm" className="font-bold text-purple-700 dark:text-purple-400" />
              </div>

              <div className="p-3.5 flex items-center justify-between gap-2">
                <span className="text-[var(--chrome-ink-soft)]">Bot Victory Prize Rake</span>
                <CoinAmount amount={settlement.totalBotCollection} size="sm" className="font-bold text-blue-700 dark:text-blue-400" />
              </div>

              <div className="p-3.5 flex items-center justify-between gap-2">
                <span className="text-[var(--chrome-ink-soft)]">Protocol Fee (World Bank Cut)</span>
                <CoinAmount amount={settlement.totalWorldBankCut} size="sm" className="font-bold text-amber-700 dark:text-amber-400" />
              </div>

              {settlement.status === "REFUNDED" && (
                <div className="p-3.5 flex items-center justify-between gap-2 bg-blue-500/5">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">Total Refunded to Host</span>
                  <CoinAmount amount={settlement.totalRefunded} size="sm" className="font-bold text-blue-700 dark:text-blue-300" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Host & Participant Information */}
        {settlement && (
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--chrome-ink)] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>Host Identity</span>
            </h4>

            <div className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5 min-w-0">
                <span
                  className="font-mono font-bold text-[var(--chrome-ink)] block break-all"
                  title={settlement.hostIdentityId}
                >
                  {settlement.hostIdentityId}
                </span>
                <span className="text-[11px] text-[var(--chrome-ink-soft)]">Economic Host & Debit Source</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 self-start sm:self-auto">
                HOST SEAT
              </span>
            </div>
          </div>
        )}

        {/* 5. Match Lifecycle Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--chrome-ink)] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Match Lifecycle Events</span>
          </h4>

          <ActivityTimeline items={timelineItems} />
        </div>
      </div>
    </DetailDrawer>
  );
}

export default MatchDetailDrawer;
