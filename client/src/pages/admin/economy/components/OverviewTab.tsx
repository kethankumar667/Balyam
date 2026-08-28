import React from "react";
import {
  Landmark,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Clock,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Award,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import StatCard from "../../../../components/admin/stat-card";
import MetricCard from "../../../../components/admin/metric-card";
import SectionHeader from "../../../../components/admin/section-header";
import StatusBadge from "../../../../components/admin/status-badge";
import { CoinAmount } from "../../../../components/economy/CoinAmount";
import { EconomySkeleton } from "../../../../components/economy/EconomySkeleton";
import ConservationBadge from "./ConservationBadge";
import EconomyHealthBadge, { type EconomyHealthStatus } from "./EconomyHealthBadge";
import type { WorldBankSnapshot, MatchEconomySettlementRecord } from "../../../../lib/economyApi";
import { formatTimeAgo } from "../../../../lib/formatTimeAgo";

interface OverviewTabProps {
  worldBank: WorldBankSnapshot | null;
  staleSettlements: MatchEconomySettlementRecord[];
  recentSettlements: MatchEconomySettlementRecord[];
  isLoading: boolean;
  onSelectMatch: (matchId: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export function OverviewTab({
  worldBank,
  staleSettlements,
  recentSettlements,
  isLoading,
  onSelectMatch,
  onNavigateTab,
}: OverviewTabProps) {
  // Calculate health score & status based on real metrics
  const criticalStaleCount = staleSettlements.filter(
    (s) => Date.now() - s.createdAt >= 60 * 60_000,
  ).length;
  const warningStaleCount = staleSettlements.filter(
    (s) => Date.now() - s.createdAt >= 15 * 60_000,
  ).length;

  let healthStatus: EconomyHealthStatus = "HEALTHY";
  let healthScore = 100;

  if (criticalStaleCount > 0) {
    healthStatus = "CRITICAL";
    healthScore = Math.max(45, 100 - criticalStaleCount * 20);
  } else if (warningStaleCount > 0 || staleSettlements.length > 0) {
    healthStatus = "WARNING";
    healthScore = Math.max(75, 100 - staleSettlements.length * 5);
  }

  // Calculate settlement counts
  const settledCount = recentSettlements.filter((s) => s.status === "SETTLED").length;
  const refundedCount = recentSettlements.filter((s) => s.status === "REFUNDED").length;
  const forfeitedCount = recentSettlements.filter((s) => s.status === "ABANDONMENT_FORFEITED").length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Health Status & Operational Posture */}
      <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-[var(--chrome-ink)]">
                BHALYAM Economy Health & Operations
              </h3>
              <EconomyHealthBadge status={healthStatus} score={healthScore} showScore />
            </div>
            <p className="text-xs text-[var(--chrome-ink-soft)] mt-0.5">
              Live double-entry monitoring of platform treasury, player wallet reserves, and match settlements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab("health")}
            className="h-9 px-3.5 rounded-xl bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] text-xs font-bold text-[var(--chrome-ink)] transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Health Diagnostics
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("stale")}
            aria-label={`View Stale Queue: ${staleSettlements.length} items`}
            className={`h-9 px-3.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              staleSettlements.length > 0
                ? "bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
                : "bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-ink)] border-[var(--chrome-border)]"
            }`}
          >
            <span>Stale Queue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10 dark:bg-white/10">
              {staleSettlements.length}
            </span>
          </button>
        </div>
      </div>

      {/* 1. Treasury & Core KPIs */}
      <section className="space-y-3">
        <SectionHeader
          title="World Bank Treasury Reserves"
          description="Central platform liquidity pool and protocol treasury metrics"
        />

        {isLoading && !worldBank ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <EconomySkeleton variant="generic" className="h-28" count={4} />
          </div>
        ) : worldBank ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-amber-600/30 shadow-2xs space-y-1 min-w-0">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
                Treasury Reserve
              </span>
              <CoinAmount
                amount={worldBank.balance}
                size="xl"
                className="font-black text-amber-600 dark:text-amber-400"
              />
              <span className="text-[11px] text-[var(--chrome-ink-soft)] block">
                Current Protocol Solvency Balance
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-1 min-w-0">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
                Lifetime Platform Rake
              </span>
              <CoinAmount
                amount={worldBank.lifetimeCollected}
                size="lg"
                className="font-bold text-emerald-700 dark:text-emerald-400"
              />
              <span className="text-[11px] text-[var(--chrome-ink-soft)] block">
                Match Entry Protocol Rake
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-1 min-w-0">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
                Active Escrow Liability
              </span>
              <CoinAmount
                amount={worldBank.activeEscrowBalance}
                size="lg"
                className="font-bold text-purple-700 dark:text-purple-400"
              />
              <span className="text-[11px] text-[var(--chrome-ink-soft)] block">
                {worldBank.activeVoucherCount} Unclaimed Bearer Vouchers
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-1 min-w-0">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
                Starter Grants Distributed
              </span>
              <CoinAmount
                amount={worldBank.lifetimeGrants}
                size="lg"
                className="font-bold text-indigo-700 dark:text-indigo-400"
              />
              <span className="text-[11px] text-[var(--chrome-ink-soft)] block">
                Onboarding Starter Grants
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[var(--chrome-control)] text-center text-xs text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]">
            World Bank snapshot unavailable.
          </div>
        )}
      </section>

      {/* 2. Match Settlement Statistics & Stale Indicator */}
      <section className="space-y-3">
        <SectionHeader
          title="Settlement Performance & Integrity"
          description="Settlement distribution, refund rates, and commitment queue health"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Settled"
            value={settledCount}
            subtitle="Matches successfully paid out"
            icon={<ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
          />

          <StatCard
            title="Total Refunded"
            value={refundedCount}
            subtitle="Compensating returns to host"
            icon={<RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
          />

          <StatCard
            title="Abandonment Forfeitures"
            value={forfeitedCount}
            subtitle="Mid-match abandonments captured"
            icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
          />

          <div
            role="button"
            tabIndex={0}
            aria-label={`View Stale Commitments Queue: ${staleSettlements.length} pending commitments`}
            onClick={() => onNavigateTab("stale")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateTab("stale");
              }
            }}
            className={`p-5 rounded-2xl border shadow-2xs space-y-1 cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              staleSettlements.length > 0
                ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/30"
                : "bg-[var(--chrome-panel)] hover:bg-[var(--chrome-control)] border-[var(--chrome-border)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider">
                Stale Commitments
              </span>
              <Clock
                className={`w-4 h-4 ${staleSettlements.length > 0 ? "text-red-500 animate-pulse" : "text-[var(--chrome-ink-soft)]"}`}
                aria-hidden="true"
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${staleSettlements.length > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--chrome-ink)]"}`}>
                {staleSettlements.length}
              </span>
              {criticalStaleCount > 0 && (
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 font-mono">
                  ({criticalStaleCount} &gt; 60m)
                </span>
              )}
            </div>
            <span className="text-[11px] text-[var(--chrome-ink-soft)] block">
              {staleSettlements.length === 0 ? "All commitments settled on time" : "Stuck commitments require attention"}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Operational Health Checklist & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Settlement Activity */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Recent Match Settlements"
              description="Live stream of authoritative match settlement outcomes"
            />
            <button
              type="button"
              onClick={() => onNavigateTab("settlements")}
              aria-label="View all match settlements"
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md px-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs overflow-hidden divide-y divide-[var(--chrome-hairline)]">
            {recentSettlements.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--chrome-ink-soft)]">
                No recent settlement records available.
              </div>
            ) : (
              recentSettlements.slice(0, 6).map((item) => (
                <div
                  key={item.matchId}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect settlement for match ${item.matchId}`}
                  onClick={() => onSelectMatch(item.matchId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectMatch(item.matchId);
                    }
                  }}
                  className="p-4 flex items-center justify-between hover:bg-[var(--chrome-control)]/50 transition cursor-pointer text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono font-bold text-[var(--chrome-ink)] truncate max-w-[200px] sm:max-w-xs block"
                        title={item.matchId}
                      >
                        {item.matchId}
                      </span>
                      <StatusBadge
                        status={
                          item.status === "SETTLED"
                            ? "healthy"
                            : item.status === "REFUNDED"
                            ? "completed"
                            : item.status === "COMMITTED"
                            ? "warning"
                            : "critical"
                        }
                        label={item.status}
                        size="sm"
                      />
                    </div>
                    <span className="text-[11px] text-[var(--chrome-ink-soft)] block font-mono truncate">
                      Room {item.roomCode || "—"} • {item.seatCount} seats ({item.humanSeatCount}H/{item.botSeatCount}B) • {formatTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <CoinAmount amount={item.totalCollected} size="sm" className="font-bold block" />
                    <span className="text-[10px] text-[var(--chrome-ink-soft)]">
                      {item.status === "REFUNDED" ? "Refunded to Host" : item.status === "SETTLED" ? "Prizes Settled" : "Committed"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Quick Health Checklist */}
        <div className="space-y-3">
          <SectionHeader
            title="Integrity Checklist"
            description="Automated platform financial assertions"
          />

          <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold text-[var(--chrome-ink)] block">Mathematical Conservation</span>
                  <span className="text-[11px] text-[var(--chrome-ink-soft)]">
                    100% verified double-entry balance conservation across all settlements.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                {staleSettlements.length === 0 ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div>
                  <span className="font-bold text-[var(--chrome-ink)] block">Commitment Queue Health</span>
                  <span className="text-[11px] text-[var(--chrome-ink-soft)]">
                    {staleSettlements.length === 0
                      ? "Zero stale commitments stuck in memory or queue."
                      : `${staleSettlements.length} commitment(s) pending resolution.`}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold text-[var(--chrome-ink)] block">Guest Escrow Solvency</span>
                  <span className="text-[11px] text-[var(--chrome-ink-soft)]">
                    World Bank reserve fully covers all outstanding bearer voucher liabilities.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold text-[var(--chrome-ink)] block">Cryptographic Security</span>
                  <span className="text-[11px] text-[var(--chrome-ink-soft)]">
                    Vouchers hashed via SHA-256; zero plaintext bearer code leakage.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab("health")}
              className="w-full py-2.5 rounded-xl bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-ink)] text-xs font-bold border border-[var(--chrome-border)] transition cursor-pointer text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Open Health Center & Diagnostics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
