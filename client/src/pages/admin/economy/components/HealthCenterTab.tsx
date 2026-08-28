import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  Landmark,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import SectionHeader from "../../../../components/admin/section-header";
import StatusBadge from "../../../../components/admin/status-badge";
import EconomyHealthBadge, { type EconomyHealthStatus } from "./EconomyHealthBadge";
import type { WorldBankSnapshot, MatchEconomySettlementRecord } from "../../../../lib/economyApi";

interface HealthCenterTabProps {
  worldBank: WorldBankSnapshot | null;
  staleSettlements: MatchEconomySettlementRecord[];
  onRefresh: () => void;
  onNavigateTab: (tabId: string) => void;
}

export function HealthCenterTab({
  worldBank,
  staleSettlements,
  onRefresh,
  onNavigateTab,
}: HealthCenterTabProps) {
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
    healthScore = Math.max(40, 100 - criticalStaleCount * 25);
  } else if (warningStaleCount > 0 || staleSettlements.length > 0) {
    healthStatus = "WARNING";
    healthScore = Math.max(75, 100 - staleSettlements.length * 5);
  }

  // Escrow solvency is the one other check with a real, live signal to
  // compute from — `worldBank.balance`/`activeEscrowBalance` are real
  // fields from the real `getWorldBankSnapshot()` response. BigInt, not
  // Number, for the same reason every other coin comparison in this
  // codebase is: these are arbitrary-precision decimal strings.
  const escrowSolvent =
    worldBank !== null ? BigInt(worldBank.balance) >= BigInt(worldBank.activeEscrowBalance) : null;

  type CheckStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "NOT_MONITORED";

  // Health checks. Only two have a real, live signal behind them today
  // (stale-commitment count, and escrow solvency — both computed from
  // actual API responses above). The other three would need server-side
  // aggregation this dashboard doesn't have yet; they are listed as
  // NOT_MONITORED rather than a fabricated "HEALTHY" — an operator needs
  // to know what genuinely isn't being watched, not see a false all-clear.
  const healthChecks: {
    id: string;
    name: string;
    description: string;
    status: CheckStatus;
    detail: string;
    action?: () => void;
    actionLabel?: string;
  }[] = [
    {
      id: "check-stale",
      name: "Stale Commitment Queue",
      description: "Asserts no match commitments are stuck in memory past the 60-minute critical threshold.",
      status: criticalStaleCount > 0 ? "CRITICAL" : staleSettlements.length > 0 ? "WARNING" : "HEALTHY",
      detail:
        staleSettlements.length === 0
          ? "0 stale commitments — all transactions settling within SLA."
          : `${staleSettlements.length} commitment(s) active (${criticalStaleCount} critical >60m).`,
      action: staleSettlements.length > 0 ? () => onNavigateTab("stale") : undefined,
      actionLabel: "Review Stale Queue",
    },
    {
      id: "check-escrow-solvency",
      name: "Guest Escrow Treasury Solvency",
      description: "Verifies that World Bank reserves exceed outstanding unredeemed guest voucher liabilities.",
      status: worldBank === null ? "NOT_MONITORED" : escrowSolvent ? "HEALTHY" : "CRITICAL",
      detail: worldBank
        ? escrowSolvent
          ? `Reserve (${worldBank.balance} 🪙) covers Escrow Liability (${worldBank.activeEscrowBalance} 🪙).`
          : `Reserve (${worldBank.balance} 🪙) is BELOW Escrow Liability (${worldBank.activeEscrowBalance} 🪙) — investigate immediately.`
        : "World Bank snapshot unavailable — cannot evaluate reserve coverage.",
    },
    {
      id: "check-conservation",
      name: "Mathematical Balance Conservation",
      description: "Verifies double-entry ledger balance conservation: Total Collected = Total Disbursed + World Bank Cut.",
      status: "NOT_MONITORED",
      detail: "No aggregate conservation endpoint is wired up yet — inspect individual matches in Match Audit for a real per-match conservation check.",
    },
    {
      id: "check-queue-concurrency",
      name: "Settlement Queue Serial Integrity",
      description: "Guarantees match completions, refunds, and forfeitures execute serially without race conditions.",
      status: "NOT_MONITORED",
      detail: "No client-observable signal for this exists yet — this is a server-internal invariant with no operational endpoint to report it.",
    },
    {
      id: "check-crypto-safety",
      name: "Cryptographic Bearer Token Isolation",
      description: "Validates SHA-256 voucher hashing and operational token privilege boundaries.",
      status: "NOT_MONITORED",
      detail: "No client-observable signal for this exists yet — this is a server-internal invariant with no operational endpoint to report it.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Health Status Hero Card */}
      <div className="p-6 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] block">
                Platform Diagnostic Center
              </span>
              <h3 className="text-lg font-black text-[var(--chrome-ink)]">
                Authoritative Economy Integrity Monitor
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <EconomyHealthBadge status={healthStatus} score={healthScore} showScore size="lg" />
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Run automated health diagnostics audit"
              className="h-10 px-3.5 rounded-xl bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Run Audit</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed pt-2 border-t border-[var(--chrome-hairline)]">
          The Economy Health Center actively monitors the stale-commitment queue and World Bank escrow solvency from live data. Balance conservation, settlement-queue concurrency, and cryptographic token hygiene have no server-side check wired up yet — see their status below.
        </p>
      </div>

      {/* 2. Automated Health Checklist */}
      <section className="space-y-3">
        <SectionHeader
          title="Automated Health Assertions"
          description="Real-time integrity checks against core protocol invariants"
        />

        <div className="space-y-3">
          {healthChecks.map((check) => (
            <div
              key={check.id}
              className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                {check.status === "HEALTHY" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                ) : check.status === "WARNING" ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                ) : check.status === "NOT_MONITORED" ? (
                  <Info className="w-5 h-5 text-[var(--chrome-ink-soft)] shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[var(--chrome-ink)] text-xs">{check.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        check.status === "HEALTHY"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : check.status === "WARNING"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : check.status === "NOT_MONITORED"
                          ? "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]"
                          : "bg-red-500/15 text-red-700 dark:text-red-400 animate-pulse"
                      }`}
                    >
                      {check.status === "NOT_MONITORED" ? "NOT MONITORED" : check.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--chrome-ink-soft)]">{check.description}</p>
                  <p className="text-[11px] font-mono font-medium text-[var(--chrome-ink)] pt-0.5 break-words">
                    {check.detail}
                  </p>
                </div>
              </div>

              {check.action && (
                <button
                  type="button"
                  onClick={check.action}
                  aria-label={`${check.actionLabel} for ${check.name}`}
                  className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer shrink-0 self-start sm:self-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {check.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. Operator Guidance & Intervention Playbook */}
      <section className="space-y-3">
        <SectionHeader
          title="Operational Guidance & Recommendations"
          description="Authoritative instructions for resolving detected anomalies"
        />

        <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-3 text-xs text-[var(--chrome-ink-soft)]">
          <div className="space-y-2">
            <h4 className="font-bold text-[var(--chrome-ink)]">Stale Commitment Resolution</h4>
            <p className="leading-relaxed">
              If commitments remain stuck past 15 minutes, inspect the match in the <strong>Stale Monitor</strong> tab. Verify whether the room underwent unexpected network teardown. The server automatically issues compensating refunds upon room invalidation.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--chrome-hairline)]">
            <h4 className="font-bold text-[var(--chrome-ink)]">Read-Only Safety Invariant</h4>
            <p className="leading-relaxed">
              Economy V1 maintains a strictly immutable double-entry ledger. Admin accounts have zero manual balance mutation or freeze override capabilities to prevent financial state corruption. All adjustments occur through server-authoritative match outcomes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HealthCenterTab;
