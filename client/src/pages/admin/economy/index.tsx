import React, { useState, useEffect, useCallback } from "react";
import {
  Landmark,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Clock,
  Search,
  User,
  Activity,
  BarChart3,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import { EconomyStatusBanner } from "../../../components/economy/EconomyStatusBanner";
import {
  getWorldBankSnapshot,
  getStaleSettlements,
  type WorldBankSnapshot,
  type MatchEconomySettlementRecord,
} from "../../../lib/economyApi";

// Modular Tabs
import OverviewTab from "./components/OverviewTab";
import SettlementMonitorTab from "./components/SettlementMonitorTab";
import StaleMonitorTab from "./components/StaleMonitorTab";
import WorldBankTab from "./components/WorldBankTab";
import RefundAnalyticsTab from "./components/RefundAnalyticsTab";
import PlayerInvestigationTab from "./components/PlayerInvestigationTab";
import MatchInvestigationTab from "./components/MatchInvestigationTab";
import HealthCenterTab from "./components/HealthCenterTab";
import MatchDetailDrawer from "./components/MatchDetailDrawer";

export type EconomyTabId =
  | "overview"
  | "settlements"
  | "stale"
  | "world-bank"
  | "analytics"
  | "player"
  | "match"
  | "health";

interface TabDefinition {
  id: EconomyTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

/**
 * BHALYAM Phase 5 — Economy Operations & Observability Console.
 *
 * Requirements:
 * 1. Economy Overview (KPI Cards, World Bank, Health score)
 * 2. Match Settlement Monitor (Table with search, sort, filter, pagination)
 * 3. Stale Settlement Monitor (>5m, >15m, >60m severity alerts)
 * 4. World Bank Dashboard (Base fee, Bot prize, Abandonment, Escrow, Redemptions)
 * 5. Refund & Forfeiture Analytics (Charts, rate metrics)
 * 6. Player Economy Investigation (Identity lookup, wallet balance, ledger entries)
 * 7. Match Investigation Page (Timeline UI, participants, conservation check)
 * 8. Economy Health Center (Badges HEALTHY/WARNING/CRITICAL, 5 operational checks)
 */
export default function AdminEconomyPage() {
  const [activeTab, setActiveTab] = useState<EconomyTabId>("overview");
  const [worldBank, setWorldBank] = useState<WorldBankSnapshot | null>(null);
  const [staleSettlements, setStaleSettlements] = useState<MatchEconomySettlementRecord[]>([]);
  const [recentSettlements, setRecentSettlements] = useState<MatchEconomySettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Match Investigation Drawer State
  const [inspectMatchId, setInspectMatchId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const fetchOperationalData = useCallback(async (isMounted: () => boolean = () => true) => {
    setIsLoading(true);
    setError(null);
    try {
      const [wbRes, staleRes] = await Promise.all([
        getWorldBankSnapshot(),
        getStaleSettlements(300_000), // > 5m threshold
      ]);

      if (!isMounted()) return;

      if (wbRes.worldBank) {
        setWorldBank(wbRes.worldBank);
      }

      const stale = staleRes.settlements || [];
      setStaleSettlements(stale);
      // There is no "list all settlements" endpoint yet — the stale queue
      // (still-COMMITTED entries past the threshold) is the only real,
      // server-backed settlement data this dashboard has access to. It is
      // NOT a general settlement history: a healthy economy will correctly
      // show this — and everything derived from it — as empty, which is
      // the honest state. Never substitute fabricated rows here; each
      // consuming tab already has a real "no data" empty state built in.
      setRecentSettlements(stale);
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : "Failed to load operational economy data");
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetchOperationalData(() => mounted);
    return () => {
      mounted = false;
    };
  }, [fetchOperationalData]);

  const handleOpenMatchDrawer = (matchId: string) => {
    setInspectMatchId(matchId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setInspectMatchId(null);
  };

  const navTabs: TabDefinition[] = [
    { id: "overview", label: "Overview", icon: Landmark },
    { id: "settlements", label: "Settlements", icon: ShieldCheck },
    {
      id: "stale",
      label: "Stale Queue",
      icon: Clock,
      badge: staleSettlements.length > 0 ? staleSettlements.length : undefined,
    },
    { id: "world-bank", label: "World Bank", icon: Landmark },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "player", label: "Player Lookup", icon: User },
    { id: "match", label: "Match Audit", icon: Search },
    { id: "health", label: "Health Center", icon: Activity },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let targetIndex = -1;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % navTabs.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + navTabs.length) % navTabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = navTabs.length - 1;
    }

    if (targetIndex >= 0) {
      const nextTab = navTabs[targetIndex];
      setActiveTab(nextTab.id);
      tabRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <AdminLayout onRefresh={() => fetchOperationalData()} isRefreshing={isLoading}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Economy & Treasury Console"
          description="Operational dashboard for monitoring World Bank reserves, match settlements, stale commitments, and ledger integrity."
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Landmark className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Economy V1 Active</span>
            </span>
          }
        />

        {error && (
          <EconomyStatusBanner
            status="failed"
            title="Operational Sync Notice"
            description={error}
            actionText="Retry Sync"
            onAction={() => fetchOperationalData()}
          />
        )}

        {/* Sub-Navigation Tabs with Roving TabIndex & Full Keyboard Semantics */}
        <div
          role="tablist"
          aria-label="Economy Dashboard Modules"
          aria-orientation="horizontal"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--chrome-border)] scrollbar-none"
        >
          {navTabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`economy-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`economy-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400 ${
                  isActive
                    ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] shadow-2xs border border-[var(--chrome-active-ink)]"
                    : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-[var(--chrome-active-ink)]" : "text-[var(--chrome-ink-soft)]"}`}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500 text-white"
                    aria-label={`${tab.badge} stale commitments pending`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Rendering with Accessible Tabpanel Container */}
        <div
          id={`economy-panel-${activeTab}`}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`economy-tab-${activeTab}`}
          className="pt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-xl"
        >
          {activeTab === "overview" && (
            <OverviewTab
              worldBank={worldBank}
              staleSettlements={staleSettlements}
              recentSettlements={recentSettlements}
              isLoading={isLoading}
              onSelectMatch={handleOpenMatchDrawer}
              onNavigateTab={(tabId) => setActiveTab(tabId as EconomyTabId)}
            />
          )}

          {activeTab === "settlements" && (
            <SettlementMonitorTab
              settlements={recentSettlements}
              isLoading={isLoading}
              onSelectMatch={handleOpenMatchDrawer}
            />
          )}

          {activeTab === "stale" && (
            <StaleMonitorTab
              staleSettlements={staleSettlements}
              isLoading={isLoading}
              onRefresh={() => fetchOperationalData()}
              onSelectMatch={handleOpenMatchDrawer}
            />
          )}

          {activeTab === "world-bank" && (
            <WorldBankTab worldBank={worldBank} isLoading={isLoading} />
          )}

          {activeTab === "analytics" && (
            <RefundAnalyticsTab
              settlements={recentSettlements}
              onSelectMatch={handleOpenMatchDrawer}
            />
          )}

          {activeTab === "player" && <PlayerInvestigationTab />}

          {activeTab === "match" && (
            <MatchInvestigationTab initialMatchId={inspectMatchId || ""} />
          )}

          {activeTab === "health" && (
            <HealthCenterTab
              worldBank={worldBank}
              staleSettlements={staleSettlements}
              onRefresh={() => fetchOperationalData()}
              onNavigateTab={(tabId) => setActiveTab(tabId as EconomyTabId)}
            />
          )}
        </div>

        {/* Slide-over Match Detail Drawer */}
        <MatchDetailDrawer
          matchId={inspectMatchId}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      </div>
    </AdminLayout>
  );
}
