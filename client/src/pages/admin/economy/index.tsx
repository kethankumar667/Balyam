import React, { useState, useEffect, useCallback } from "react";
import {
  Landmark,
  ShieldCheck,
  RefreshCw,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Layers,
  Sparkles,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import SectionHeader from "../../../components/admin/section-header";
import StatusBadge from "../../../components/admin/status-badge";
import { CoinAmount } from "../../../components/economy/CoinAmount";
import { EconomySkeleton } from "../../../components/economy/EconomySkeleton";
import { EconomyStatusBanner } from "../../../components/economy/EconomyStatusBanner";
import {
  getWorldBankSnapshot,
  getStaleSettlements,
  reconcileMatchSettlement,
  getMatchSettlement,
  type WorldBankSnapshot,
  type MatchEconomySettlementRecord,
  type SettlementReconciliation,
} from "../../../lib/economyApi";
import { formatTimeAgo } from "../../../lib/formatTimeAgo";

/**
 * BHALYAM Admin Economy Control & Audit Center.
 *
 * Requirements:
 * - Read-only operational views (World Bank Treasury, Stale Settlements, Settlement Reconciliation).
 * - Zero mutation controls or manual balance override buttons.
 * - BigInt-safe string formatting throughout.
 */
export default function AdminEconomyPage() {
  const [worldBank, setWorldBank] = useState<WorldBankSnapshot | null>(null);
  const [staleSettlements, setStaleSettlements] = useState<MatchEconomySettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement Search & Reconcile Audit
  const [searchMatchId, setSearchMatchId] = useState<string>("");
  const [inspectSettlement, setInspectSettlement] = useState<MatchEconomySettlementRecord | null>(null);
  const [inspectReconciliation, setInspectReconciliation] = useState<SettlementReconciliation | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const fetchOperationalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wbRes, staleRes] = await Promise.all([
        getWorldBankSnapshot().catch(() => ({ worldBank: null })),
        getStaleSettlements().catch(() => ({ settlements: [] })),
      ]);
      setWorldBank(wbRes.worldBank);
      setStaleSettlements(staleRes.settlements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operational economy data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOperationalData();
  }, [fetchOperationalData]);

  const handleInspectMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = searchMatchId.trim();
    if (!cleanId) return;

    setInspectLoading(true);
    setInspectError(null);
    setInspectSettlement(null);
    setInspectReconciliation(null);

    try {
      const [settleRes, reconRes] = await Promise.all([
        getMatchSettlement(cleanId).catch(() => null),
        reconcileMatchSettlement(cleanId).catch(() => null),
      ]);

      if (!settleRes && !reconRes) {
        setInspectError(`No settlement found for match ID: ${cleanId}`);
      } else {
        if (settleRes) setInspectSettlement(settleRes.settlement);
        if (reconRes) setInspectReconciliation(reconRes.reconciliation);
      }
    } catch (err) {
      setInspectError("Failed to inspect match settlement.");
    } finally {
      setInspectLoading(false);
    }
  };

  return (
    <AdminLayout onRefresh={fetchOperationalData} isRefreshing={isLoading}>
      <div className="space-y-6">
        <PageHeader
          title="Economy & Treasury"
          description="Read-only operational view of BHALYAM World Bank reserves, stale settlements, and ledger conservation."
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Landmark className="w-3.5 h-3.5" />
              <span>Treasury Active</span>
            </span>
          }
        />

        {error && (
          <EconomyStatusBanner
            status="failed"
            title="Operational Data Hiccup"
            description={error}
            actionText="Retry"
            onAction={fetchOperationalData}
          />
        )}

        {/* 1. World Bank KPIs */}
        <section className="space-y-3">
          <SectionHeader
            title="World Bank Treasury Reserves"
            description="Central liquidity pool and protocol treasury metrics"
          />

          {isLoading && !worldBank ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <EconomySkeleton variant="generic" className="h-28" count={4} />
            </div>
          ) : worldBank ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#131824] border border-amber-600/20 shadow-xs space-y-1">
                <span className="text-xs font-bold text-ink-lo dark:text-text-lo uppercase tracking-wider">
                  Treasury Balance
                </span>
                <CoinAmount amount={worldBank.balance} size="xl" className="font-extrabold text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] text-ink-lo dark:text-text-lo block">Current Protocol Reserve</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#131824] border border-black/5 dark:border-white/5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-ink-lo dark:text-text-lo uppercase tracking-wider">
                  Lifetime Collected
                </span>
                <CoinAmount amount={worldBank.lifetimeCollected} size="lg" className="font-bold text-emerald-700 dark:text-emerald-400" />
                <span className="text-[11px] text-ink-lo dark:text-text-lo block">Match Entry House Cuts</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#131824] border border-black/5 dark:border-white/5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-ink-lo dark:text-text-lo uppercase tracking-wider">
                  Active Escrow
                </span>
                <CoinAmount amount={worldBank.activeEscrowBalance} size="lg" className="font-bold text-purple-700 dark:text-purple-400" />
                <span className="text-[11px] text-ink-lo dark:text-text-lo block">{worldBank.activeVoucherCount} Unclaimed Vouchers</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#131824] border border-black/5 dark:border-white/5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-ink-lo dark:text-text-lo uppercase tracking-wider">
                  Lifetime Grants
                </span>
                <CoinAmount amount={worldBank.lifetimeGrants} size="lg" className="font-bold text-indigo-700 dark:text-indigo-400" />
                <span className="text-[11px] text-ink-lo dark:text-text-lo block">Starter Grant Allocations</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 text-center text-xs text-ink-lo">
              World Bank snapshot unavailable.
            </div>
          )}
        </section>

        {/* 2. Settlement Inspector & Conservation Audit */}
        <section className="space-y-3">
          <SectionHeader
            title="Settlement Inspector & Reconciliation"
            description="Search and verify mathematical conservation for any match settlement"
          />

          <div className="p-5 rounded-2xl bg-white dark:bg-[#131824] border border-black/5 dark:border-white/5 shadow-xs space-y-4">
            <form onSubmit={handleInspectMatch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-ink-lo dark:text-text-lo absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchMatchId}
                  onChange={(e) => setSearchMatchId(e.target.value)}
                  placeholder="Enter Match ID (e.g. match_17877...)"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/20 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={inspectLoading || !searchMatchId.trim()}
                className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs disabled:opacity-50 transition cursor-pointer"
              >
                {inspectLoading ? "Inspecting..." : "Inspect"}
              </button>
            </form>

            {inspectError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {inspectError}
              </div>
            )}

            {inspectSettlement && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Match #{inspectSettlement.matchId}</span>
                  <StatusBadge status={inspectSettlement.status === "SETTLED" ? "success" : "pending"} label={inspectSettlement.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-ink-lo block text-[10px]">Collected</span>
                    <CoinAmount amount={inspectSettlement.totalCollected} size="sm" />
                  </div>
                  <div>
                    <span className="text-ink-lo block text-[10px]">Prizes Rewarded</span>
                    <CoinAmount amount={inspectSettlement.totalWalletRewarded} size="sm" />
                  </div>
                  <div>
                    <span className="text-ink-lo block text-[10px]">Guest Escrow</span>
                    <CoinAmount amount={inspectSettlement.totalGuestEscrow} size="sm" />
                  </div>
                  <div>
                    <span className="text-ink-lo block text-[10px]">World Bank Fee</span>
                    <CoinAmount amount={inspectSettlement.totalWorldBankCut} size="sm" />
                  </div>
                </div>

                {inspectReconciliation && (
                  <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {inspectReconciliation.isConserved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-bold">
                        Conservation Audit: {inspectReconciliation.isConserved ? "PASSED (100% Conserved)" : "DISCREPANCY DETECTED"}
                      </span>
                    </div>
                    <span className="font-mono text-ink-lo">{inspectReconciliation.detail}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 3. Stale Settlements Audit */}
        <section className="space-y-3">
          <SectionHeader
            title="Stale Committed Settlements"
            description="Matches that reached COMMITTED state over 1 hour ago without terminal settlement"
          />

          <div className="rounded-2xl bg-white dark:bg-[#131824] border border-black/5 dark:border-white/5 shadow-xs overflow-hidden">
            {staleSettlements.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-ink-hi dark:text-text-hi">Zero Stale Settlements</h4>
                <p className="text-xs text-ink-lo dark:text-text-lo">
                  All committed match entries have been settled or refunded on time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {staleSettlements.map((stale) => (
                  <div key={stale.matchId} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold block">{stale.matchId}</span>
                      <span className="text-[10px] text-ink-lo">Created {formatTimeAgo(stale.createdAt)}</span>
                    </div>
                    <CoinAmount amount={stale.totalCollected} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
