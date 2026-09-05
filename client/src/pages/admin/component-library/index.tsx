import { useState } from "react";
import {
  Users,
  Gamepad2,
  Trophy,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Database,
  Layers,
  Sparkles,
  RotateCcw,
  Plus,
  ArrowRight,
  Shield,
  Clock,
  Activity,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import MetricCard from "../../../components/admin/metric-card";
import StatusBadge, { type StatusType } from "../../../components/admin/status-badge";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DataTable, { type Column } from "../../../components/admin/data-table";
import EmptyState from "../../../components/admin/empty-state";
import LoadingState from "../../../components/admin/loading-state";
import DetailDrawer from "../../../components/admin/detail-drawer";
import ChartCard from "../../../components/admin/chart-card";
import MockDataBanner from "../../../components/admin/mock-data-banner";
import InfoCard from "../../../components/admin/info-card";
import {
  CoinAmount,
  CoinDelta,
  WalletBalanceChip,
  EconomyActionButton,
  type EconomyActionButtonState,
  EconomyStatusBanner,
  CheckoutLineItem,
  PrizeDistribution,
  WorldBankContribution,
  BalancePreview,
  CeremonialSeatRing,
  EconomySkeleton,
  DEMO_WALLET_GUEST,
  DEMO_WALLET_MEMBER,
  DEMO_WALLET_LOW_BALANCE,
  DEMO_WALLET_BIGINT_MAX,
  DEMO_WALLET_UNSAFE_JS_INT,
  DEMO_SCHEDULE_2SEAT,
  DEMO_SCHEDULE_4SEAT,
  DEMO_SCHEDULE_5SEAT,
  DEMO_CHECKOUT_AFFORDABLE,
  DEMO_CHECKOUT_INSUFFICIENT,
  DEMO_DELTAS,
} from "../../../components/economy";

// Component categories for showcase navigation
const SHOWCASE_COMPONENTS = [
  { id: "economy-v1", name: "Economy V1", count: "11 Components" },
  { id: "stat-card", name: "StatCard", count: "5 States" },
  { id: "metric-card", name: "MetricCard", count: "5 States" },
  { id: "status-badge", name: "StatusBadge", count: "5 States" },
  { id: "search-bar", name: "SearchBar", count: "5 States" },
  { id: "filter-bar", name: "FilterBar", count: "5 States" },
  { id: "data-table", name: "DataTable", count: "5 States" },
  { id: "empty-state", name: "EmptyState", count: "5 States" },
  { id: "loading-state", name: "LoadingState", count: "5 States" },
  { id: "detail-drawer", name: "DetailDrawer", count: "5 States" },
  { id: "chart-card", name: "ChartCard", count: "5 States" },
  { id: "page-header", name: "PageHeader", count: "5 States" },
  { id: "mock-data-banner", name: "MockDataBanner", count: "5 States" },
];

const MOCK_CHART_POINTS = [
  { time: "00:00", value: 120 },
  { time: "04:00", value: 90 },
  { time: "08:00", value: 240 },
  { time: "12:00", value: 450 },
  { time: "16:00", value: 380 },
  { time: "20:00", value: 520 },
  { time: "Now", value: 490 },
];

interface SampleRow {
  id: string;
  name: string;
  game: string;
  role: string;
  status: StatusType;
  elo: number;
}

const SAMPLE_ROWS: SampleRow[] = [
  { id: "u-1", name: "Kethan Kumar", game: "Ludo", role: "SuperAdmin", status: "active", elo: 2480 },
  { id: "u-2", name: "Ananya Sharma", game: "Word Building", role: "Admin", status: "active", elo: 2150 },
  { id: "u-3", name: "Rahul Verma", game: "RPS", role: "Member", status: "warning", elo: 1890 },
  { id: "u-4", name: "Meera Nair", game: "Snakes & Ladders", role: "Guest", status: "inactive", elo: 1420 },
];

export default function AdminComponentLibraryPage() {
  const [activeComponentId, setActiveComponentId] = useState<string>("stat-card");

  // State controls for interactive preview demonstrations
  const [interactiveSearch, setInteractiveSearch] = useState("");
  const [activeFilterGame, setActiveFilterGame] = useState("all");
  const [activeFilterStatus, setActiveFilterStatus] = useState("all");
  const [activeDrawer, setActiveDrawer] = useState<"default" | "loading" | "empty" | "error" | "xl" | null>(null);
  const [chartRange, setChartRange] = useState("24h");
  const [tablePage, setTablePage] = useState(1);
  const [economyButtonState, setEconomyButtonState] = useState<EconomyActionButtonState>("idle");
  const [demoSeatCount, setDemoSeatCount] = useState<number>(4);

  const sampleColumns: Column<SampleRow>[] = [
    {
      kind: "property",
      key: "name",
      header: "User / Handle",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold text-xs flex items-center justify-center">
            {row.name.charAt(0)}
          </div>
          <span className="font-bold text-[var(--chrome-ink)]">{row.name}</span>
        </div>
      ),
    },
    { kind: "property", key: "game", header: "Favorite Game" },
    {
      kind: "property",
      key: "role",
      header: "Role",
      render: (row) => (
        <span className="text-xs font-mono font-bold uppercase text-[var(--chrome-ink-soft)]">
          {row.role}
        </span>
      ),
    },
    {
      kind: "property",
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      kind: "property",
      key: "elo",
      header: "ELO Rating",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
          {row.elo}
        </span>
      ),
    },
  ];

  const sampleFilters: FilterOption[] = [
    {
      id: "game",
      label: "Game Tile",
      value: activeFilterGame,
      options: [
        { label: "All Games", value: "all" },
        { label: "Ludo", value: "ludo" },
        { label: "Word Building", value: "wordbuilding" },
        { label: "RPS", value: "rps" },
      ],
      onChange: setActiveFilterGame,
    },
    {
      id: "status",
      label: "User Status",
      value: activeFilterStatus,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Active", value: "active" },
        { label: "Warning", value: "warning" },
        { label: "Inactive", value: "inactive" },
      ],
      onChange: setActiveFilterStatus,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Admin Component Showcase"
        description="Internal design systems gallery and UI test harness. Demonstrates all 12 core admin components across Default, Loading, Empty, Error, and Variant states without backend dependencies."
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3 h-3" /> Dev & QA Harness
          </span>
        }
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Developer Tools" },
          { label: "Component Library" },
        ]}
      />

      <MockDataBanner kind="mock" />

      {/* Component Navigation Carousel / Pill Grid */}
      <div className="mb-8 p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--chrome-hairline)] px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" /> Core Component Catalog ({SHOWCASE_COMPONENTS.length})
          </span>
          <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">5 States Tested per Item</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {SHOWCASE_COMPONENTS.map((item) => {
            const isActive = activeComponentId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveComponentId(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-xs scale-[1.02]"
                    : "bg-[var(--chrome-control)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)]"
                }`}
              >
                <span>{item.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                  isActive ? "bg-zinc-950/20 text-zinc-950" : "bg-[var(--chrome-panel)] text-[var(--chrome-ink-soft)]"
                }`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ECONOMY V1 COMPONENT SUITE SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "economy-v1" || activeComponentId === "all") && (
        <section id="economy-v1" className="mb-12 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-3">
            <div>
              <h2 className="text-lg font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                BHALYAM Economy V1 — Isolated Presentational Suite
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Contract-isolated presentational components, bigint-safe decimal string rendering, and Sovereign Table visualizers.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              SYNTHETIC DATA ONLY
            </span>
          </div>

          {/* Mandatory Disclosure Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/40 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm tracking-wide">
              <span className="text-amber-600 dark:text-amber-400 font-mono font-black">[SYNTHETIC DEMO]</span>
              <span>ECONOMY UI DEMONSTRATION — SYNTHETIC DATA — NOT CONNECTED TO LIVE ECONOMY</span>
            </div>
            <p className="text-xs opacity-90 mt-1">
              All balances, transactions, and seat commitments rendered below use typed mock fixtures. Zero real coins, API requests, or database state are invoked.
            </p>
          </div>

          {/* 1. CoinAmount Showcase */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
              <h3 className="text-sm font-bold text-[var(--chrome-ink)]">1. CoinAmount (BigInt-Safe Numerical Formatting)</h3>
              <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">CoinAmountProps</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">size="sm"</span>
                <CoinAmount amount="150" size="sm" />
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">size="md" (Guest)</span>
                <CoinAmount amount={DEMO_WALLET_GUEST.balance} size="md" />
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">size="lg" (Member)</span>
                <CoinAmount amount={DEMO_WALLET_MEMBER.balance} size="lg" />
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">size="xl"</span>
                <CoinAmount amount="12500" size="xl" />
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">size="hero"</span>
                <CoinAmount amount="250000" size="hero" />
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Unknown / Empty</span>
                <CoinAmount amount="---" size="md" />
              </div>
            </div>

            {/* Extreme BigInt Overflow Tests */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Precision Test (Values &gt; Number.MAX_SAFE_INTEGER &amp; PostgreSQL BIGINT_MAX)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col p-2 rounded-lg bg-black/5 dark:bg-white/5">
                  <span className="text-[10px] text-[var(--chrome-ink-soft)] mb-0.5">MAX_SAFE_INTEGER + 1 (9007199254740993)</span>
                  <CoinAmount amount={DEMO_WALLET_UNSAFE_JS_INT.balance} size="md" />
                </div>
                <div className="flex flex-col p-2 rounded-lg bg-black/5 dark:bg-white/5">
                  <span className="text-[10px] text-[var(--chrome-ink-soft)] mb-0.5">PostgreSQL BIGINT_MAX (9223372036854775807)</span>
                  <CoinAmount amount={DEMO_WALLET_BIGINT_MAX.balance} size="md" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. CoinDelta Showcase */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
              <h3 className="text-sm font-bold text-[var(--chrome-ink)]">2. CoinDelta (Color-Blind-Safe Directional Badges)</h3>
              <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">CoinDeltaProps</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {DEMO_DELTAS.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                  <CoinDelta delta={item.delta} type={item.type} size="md" />
                  <span className="text-xs text-[var(--chrome-ink-soft)]">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. WalletBalanceChip Showcase */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
              <h3 className="text-sm font-bold text-[var(--chrome-ink)]">3. WalletBalanceChip (Header Navigation Anchor)</h3>
              <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">WalletBalanceChipProps</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Member (Synced)</span>
                <WalletBalanceChip balance={DEMO_WALLET_MEMBER.balance} isMember={true} syncStatus="synced" onClick={() => {}} />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Guest Lounge Pass</span>
                <WalletBalanceChip balance={DEMO_WALLET_GUEST.balance} isMember={false} syncStatus="synced" onClick={() => {}} />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Syncing State</span>
                <WalletBalanceChip balance={DEMO_WALLET_MEMBER.balance} syncStatus="syncing" onClick={() => {}} />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Offline / Cached</span>
                <WalletBalanceChip balance={DEMO_WALLET_LOW_BALANCE.balance} syncStatus="offline" onClick={() => {}} />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Loading Skeleton</span>
                <WalletBalanceChip balance="0" isLoading={true} />
              </div>
            </div>
          </div>

          {/* 4. EconomyActionButton Showcase */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
              <h3 className="text-sm font-bold text-[var(--chrome-ink)]">4. EconomyActionButton (Tactile Action Controls)</h3>
              <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">EconomyActionButtonProps</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <EconomyActionButton variant="primary" size="md" state="idle">
                Primary Action (Gold)
              </EconomyActionButton>
              <EconomyActionButton variant="secondary" size="md" state="idle">
                Secondary Action
              </EconomyActionButton>
              <EconomyActionButton variant="ghost" size="md" state="idle">
                Ghost Action
              </EconomyActionButton>
              <EconomyActionButton variant="danger" size="md" state="idle">
                Danger Action
              </EconomyActionButton>
              <EconomyActionButton variant="primary" size="md" state="disabled">
                Disabled State
              </EconomyActionButton>
              <EconomyActionButton variant="danger" size="md" state="error">
                Error State
              </EconomyActionButton>
              {/* Interactive State Simulator */}
              <EconomyActionButton
                variant="primary"
                size="md"
                state={economyButtonState}
                onClick={() => {
                  setEconomyButtonState("loading");
                  setTimeout(() => {
                    setEconomyButtonState("success");
                    setTimeout(() => setEconomyButtonState("idle"), 2000);
                  }, 1200);
                }}
              >
                {economyButtonState === "success"
                  ? "Success ✓"
                  : economyButtonState === "loading"
                  ? "Processing..."
                  : "Test State Flow"}
              </EconomyActionButton>
            </div>
          </div>

          {/* 5. EconomyStatusBanner Showcase */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
              <h3 className="text-sm font-bold text-[var(--chrome-ink)]">5. EconomyStatusBanner (Contextual Alerts)</h3>
              <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">EconomyStatusBannerProps</span>
            </div>
            <div className="space-y-3">
              <EconomyStatusBanner
                status="pending"
                title="Settlement Pending"
                description="Match KD22TL completed. Coin distribution is being recorded by the World Bank Treasury."
              />
              <EconomyStatusBanner
                status="insufficient_funds"
                title="Insufficient Balance"
                description="Required commitment is 400 coins, but your wallet balance is 150 coins. Reduce seat count or switch to practice mode."
                actionText="Adjust Seats"
                onAction={() => {}}
              />
              <EconomyStatusBanner
                status="refunded"
                title="Match Commitment Restored"
                description="400 coins refunded to your wallet. Reason: All human players departed room before conclusion."
              />
              <EconomyStatusBanner
                status="failed"
                title="Transaction Failed"
                description="Unable to authorize match commitment. Please check connection and try again."
                actionText="Retry"
                onAction={() => {}}
              />
            </div>
          </div>

          {/* 6. CheckoutLineItem & BalancePreview Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
                <h3 className="text-sm font-bold text-[var(--chrome-ink)]">6. Checkout Line Items</h3>
                <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">CheckoutLineItemProps</span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                <CheckoutLineItem label="Room Entry Seats" sublabel="4 Configured Seats × 100 Coins" amount="400" />
                <CheckoutLineItem label="Host Sponsorship" sublabel="Invitees play for free" amount="0" />
                <CheckoutLineItem label="Total Host Commitment" amount="400" isTotal={true} isDeduction={true} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
                <h3 className="text-sm font-bold text-[var(--chrome-ink)]">7. Balance Preview Strip</h3>
                <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">BalancePreviewProps</span>
              </div>
              <BalancePreview
                currentBalance={DEMO_CHECKOUT_AFFORDABLE.currentBalance}
                totalCommitment={DEMO_CHECKOUT_AFFORDABLE.totalCost}
                projectedBalance={DEMO_CHECKOUT_AFFORDABLE.projectedBalance}
                hasSufficientFunds={true}
              />
              <BalancePreview
                currentBalance={DEMO_CHECKOUT_INSUFFICIENT.currentBalance}
                totalCommitment={DEMO_CHECKOUT_INSUFFICIENT.totalCost}
                projectedBalance={DEMO_CHECKOUT_INSUFFICIENT.projectedBalance}
                hasSufficientFunds={false}
                shortfall={DEMO_CHECKOUT_INSUFFICIENT.shortfall}
              />
            </div>
          </div>

          {/* 8. PrizeDistribution & WorldBankContribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
                <h3 className="text-sm font-bold text-[var(--chrome-ink)]">8. Prize Distribution Schedules</h3>
                <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">PrizeDistributionProps</span>
              </div>
              <PrizeDistribution
                seatCount={4}
                firstPlace={DEMO_SCHEDULE_4SEAT.firstPlace}
                secondPlace={DEMO_SCHEDULE_4SEAT.secondPlace}
                thirdPlace={DEMO_SCHEDULE_4SEAT.thirdPlace}
                worldBankCut={DEMO_SCHEDULE_4SEAT.worldBankCut}
              />
              <PrizeDistribution
                seatCount={2}
                firstPlace={DEMO_SCHEDULE_2SEAT.firstPlace}
                worldBankCut={DEMO_SCHEDULE_2SEAT.worldBankCut}
              />
            </div>

            <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
                <h3 className="text-sm font-bold text-[var(--chrome-ink)]">9. World Bank Reserve Disclosure</h3>
                <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">WorldBankContributionProps</span>
              </div>
              <WorldBankContribution amount="50" showDescription={true} />
              <WorldBankContribution amount="100" showDescription={false} />
            </div>
          </div>

          {/* 10. CeremonialSeatRing (The Sovereign Table) */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--chrome-ink)]">10. CeremonialSeatRing (The Sovereign Table)</h3>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  Circular match allocation ring visualizing human/bot seat occupancy around the central prize pot.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--chrome-ink-soft)]">Seats:</span>
                {[2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDemoSeatCount(s)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      demoSeatCount === s
                        ? "bg-amber-500 text-white border-amber-400"
                        : "bg-black/5 dark:bg-white/5 text-[var(--chrome-ink)] border-transparent"
                    }`}
                  >
                    {s} Seats
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              <CeremonialSeatRing
                seatCount={demoSeatCount}
                humanCount={Math.max(1, demoSeatCount - 1)}
                botCount={1}
                totalPotAmount={String(demoSeatCount * 100)}
                costPerSeat="100"
              />

              <div className="space-y-3 p-4 rounded-2xl bg-black/5 dark:bg-white/5 text-xs text-[var(--chrome-ink-soft)]">
                <h4 className="font-bold text-[var(--chrome-ink)] text-sm">Ceremony Design Invariants:</h4>
                <ul className="space-y-2 list-disc pl-4 leading-relaxed">
                  <li><strong>Host Framing:</strong> Seat 1 is distinguished as the funding Table Host.</li>
                  <li><strong>Bot Inclusion:</strong> Bots occupy explicit seat nodes and contribute to total pot calculation.</li>
                  <li><strong>Pot Centrality:</strong> Total match pool ({demoSeatCount * 100} Coins) sits at the geometric center of gravity.</li>
                  <li><strong>Reduced Motion:</strong> Radial orbit path and seat nodes illuminate smoothly without continuous rotational blur.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 11. EconomySkeleton (Loading Placeholders) */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-control)]/40 border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--chrome-border)]/50 pb-2">
              <h3 className="text-sm font-bold text-[var(--chrome-ink)]">11. EconomySkeleton (Loading Placeholders)</h3>
              <span className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">EconomySkeletonProps</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Wallet Skeleton</span>
                <EconomySkeleton variant="wallet" />
              </div>
              <div className="space-y-2 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Coin Skeleton</span>
                <EconomySkeleton variant="coin" />
              </div>
              <div className="space-y-2 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Voucher Skeleton</span>
                <EconomySkeleton variant="voucher" />
              </div>
              <div className="space-y-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 md:col-span-2">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Checkout Skeleton</span>
                <EconomySkeleton variant="checkout" />
              </div>
              <div className="space-y-2 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Prize Skeleton</span>
                <EconomySkeleton variant="prize" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. STAT CARD SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "stat-card" || activeComponentId === "all") && (
        <section id="stat-card" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                1. StatCard
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                KPI metric card for dashboard stats, summary figures, and performance comparisons.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">StatCardProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State
              </span>
              <StatCard
                title="Active Users"
                value="4,820"
                subtitle="Current online sessions"
                icon={<Users className="w-5 h-5 text-amber-500" />}
              />
            </div>

            {/* 1.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading State
              </span>
              <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] animate-pulse space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 bg-[var(--chrome-control)] rounded" />
                  <div className="h-8 w-8 bg-[var(--chrome-control)] rounded-xl" />
                </div>
                <div className="h-8 w-28 bg-[var(--chrome-control)] rounded" />
                <div className="h-2.5 w-36 bg-[var(--chrome-control)] rounded" />
              </div>
            </div>

            {/* 1.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Empty State
              </span>
              <StatCard
                title="Archived Tournaments"
                value="--"
                subtitle="No past records in current season"
                icon={<Trophy className="w-5 h-5 text-[var(--chrome-ink-soft)]" />}
              />
            </div>

            {/* 1.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State
              </span>
              <StatCard
                title="Cluster Latency Sync"
                value="ERR_TIMEOUT"
                subtitle="Telemetry polling disconnected"
                icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
                className="border-rose-500/40 bg-rose-500/5"
              />
            </div>

            {/* 1.5 Variant States: Up/Down/Neutral Trends */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Variant States (Positive, Negative & Neutral Trends)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  title="Weekly Growth"
                  value="+18.4%"
                  subtitle="vs last 7 days"
                  trend={{ value: 18.4, direction: "up", label: "vs last week" }}
                />
                <StatCard
                  title="Bounce Rate"
                  value="4.2%"
                  subtitle="vs last 7 days"
                  trend={{ value: 3.1, direction: "down", label: "lower is better" }}
                />
                <StatCard
                  title="Engine Core Uptime"
                  value="99.98%"
                  subtitle="SLA SLA compliance"
                  trend={{ value: 0, direction: "neutral", label: "steady" }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC CARD SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "metric-card" || activeComponentId === "all") && (
        <section id="metric-card" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                2. MetricCard
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Progress gauge card for capacity, storage, memory, and multi-factor resource telemetry.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">MetricCardProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 2.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State
              </span>
              <MetricCard
                title="Node Memory Pool"
                mainValue="64%"
                subtitle="162 MB of 256 MB Allocated"
                progressPct={64}
                subMetrics={[
                  { label: "Heap Used", value: "142 MB", change: "+4%", changeType: "positive" },
                  { label: "RSS Overhead", value: "190 MB", change: "-2%", changeType: "neutral" },
                ]}
              />
            </div>

            {/* 2.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading State
              </span>
              <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] animate-pulse space-y-4 shadow-2xs">
                <div className="h-4 w-32 bg-[var(--chrome-control)] rounded" />
                <div className="h-8 w-24 bg-[var(--chrome-control)] rounded" />
                <div className="h-2 w-full bg-[var(--chrome-control)] rounded-full" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="h-10 bg-[var(--chrome-control)] rounded-xl" />
                  <div className="h-10 bg-[var(--chrome-control)] rounded-xl" />
                </div>
              </div>
            </div>

            {/* 2.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Empty State
              </span>
              <MetricCard
                title="Cold Storage Quota"
                mainValue="0%"
                subtitle="No archival logs currently stored"
                progressPct={0}
                subMetrics={[
                  { label: "Used Space", value: "0 GB" },
                  { label: "Total Quota", value: "100 GB" },
                ]}
              />
            </div>

            {/* 2.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State (Critical OOM Threshold)
              </span>
              <MetricCard
                title="Event Loop Lag"
                mainValue="96%"
                subtitle="CRITICAL: Event loop starvation detected"
                progressPct={96}
                className="border-rose-500/40 bg-rose-500/5"
                subMetrics={[
                  { label: "Lag Duration", value: "184ms", change: "+120ms", changeType: "negative" },
                  { label: "Health State", value: "Critical", changeType: "negative" },
                ]}
              />
            </div>

            {/* 2.5 Variant States */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Variant States (Multi-tier Utilization Progress)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard
                  title="Mesh WebRTC Audio Relays"
                  mainValue="28%"
                  subtitle="Low utilization — Optimal headroom"
                  progressPct={28}
                  subMetrics={[
                    { label: "Active Mesh Peers", value: "48" },
                    { label: "Packet Loss", value: "0.01%" },
                  ]}
                />
                <MetricCard
                  title="Redis Session Cache"
                  mainValue="82%"
                  subtitle="Approaching advisory threshold"
                  progressPct={82}
                  subMetrics={[
                    { label: "Keys Cached", value: "24,500" },
                    { label: "Eviction Rate", value: "0 / sec" },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. STATUS BADGE SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "status-badge" || activeComponentId === "all") && (
        <section id="status-badge" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                3. StatusBadge
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Semantic state indicator badge for server health, user accounts, and match statuses.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">StatusBadgeProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 3.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                1. Default State
              </span>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="active" />
                <StatusBadge status="healthy" />
                <StatusBadge status="online" />
              </div>
            </div>

            {/* 3.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                2. Loading State
              </span>
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 bg-[var(--chrome-control)] rounded-full animate-pulse border border-[var(--chrome-border)]" />
                <div className="h-6 w-24 bg-[var(--chrome-control)] rounded-full animate-pulse border border-[var(--chrome-border)]" />
              </div>
            </div>

            {/* 3.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                3. Empty State (Unassigned)
              </span>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="archived" label="Unassigned" />
                <StatusBadge status="inactive" label="None" />
              </div>
            </div>

            {/* 3.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                4. Error & Critical States
              </span>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="critical" label="Critical Outage" />
                <StatusBadge status="failed" label="HMAC Failure" />
              </div>
            </div>

            {/* 3.5 Variant States: All Statuses & Sizes */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-3 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                5. Variant States (All 11 Status Tokens & Sizes sm, md, lg)
              </span>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)] w-10">sm:</span>
                  <StatusBadge status="active" size="sm" />
                  <StatusBadge status="healthy" size="sm" />
                  <StatusBadge status="warning" size="sm" />
                  <StatusBadge status="critical" size="sm" />
                  <StatusBadge status="pending" size="sm" />
                  <StatusBadge status="completed" size="sm" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)] w-10">md:</span>
                  <StatusBadge status="online" size="md" />
                  <StatusBadge status="offline" size="md" />
                  <StatusBadge status="failed" size="md" />
                  <StatusBadge status="archived" size="md" />
                  <StatusBadge status="inactive" size="md" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)] w-10">lg:</span>
                  <StatusBadge status="healthy" size="lg" label="Fleet Healthy" />
                  <StatusBadge status="warning" size="lg" label="Degraded SLA" />
                  <StatusBadge status="critical" size="lg" label="Emergency Action" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SEARCH BAR SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "search-bar" || activeComponentId === "all") && (
        <section id="search-bar" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                4. SearchBar
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Debounced input control with clear trigger, keyboard shortcuts, and responsive layout.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">SearchBarProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 4.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State (With Search Query)
              </span>
              <SearchBar
                value="Kethan"
                onChange={() => {}}
                placeholder="Search players by name, email, or handle..."
              />
            </div>

            {/* 4.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading + Disabled State (Syncing Query)
              </span>
              <SearchBar
                value="Syncing..."
                onChange={() => {}}
                loading
                disabled
                placeholder="Searching database records..."
              />
            </div>

            {/* 4.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Empty State (Blank Input)
              </span>
              <SearchBar
                value=""
                onChange={() => {}}
                placeholder="Search across all in-memory multiplayer rooms..."
              />
            </div>

            {/* 4.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State (Invalid Regex/Query)
              </span>
              <div className="space-y-1">
                <SearchBar
                  value="[invalid+regex("
                  onChange={() => {}}
                  className="border-rose-500 ring-1 ring-rose-500"
                />
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  Invalid search pattern syntax. Use standard alphanumeric queries.
                </p>
              </div>
            </div>

            {/* 4.5 Variant / Interactive Sandbox */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Variant States & Interactive Testing Sandbox
              </span>
              <div className="space-y-2">
                <SearchBar
                  value={interactiveSearch}
                  onChange={setInteractiveSearch}
                  placeholder="Type here to test interactive search input and clear button..."
                />
                <div className="text-xs text-[var(--chrome-ink-soft)] font-mono flex items-center justify-between">
                  <span>Current query: <strong className="text-[var(--chrome-ink)]">"{interactiveSearch}"</strong></span>
                  <span>Characters: {interactiveSearch.length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. FILTER BAR SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "filter-bar" || activeComponentId === "all") && (
        <section id="filter-bar" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                5. FilterBar
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Multi-factor selector bar with active filter pill counters and one-click reset.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">FilterBarProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State (With Active Filter)
              </span>
              <FilterBar
                filters={[
                  {
                    id: "game",
                    label: "Game",
                    value: "ludo",
                    options: [
                      { label: "All Games", value: "all" },
                      { label: "Ludo", value: "ludo" },
                    ],
                    onChange: () => {},
                  },
                ]}
                onReset={() => {}}
              />
            </div>

            {/* 5.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading State
              </span>
              <div className="flex items-center gap-2 animate-pulse">
                <div className="h-9 w-32 bg-[var(--chrome-control)] rounded-xl border border-[var(--chrome-border)]" />
                <div className="h-9 w-32 bg-[var(--chrome-control)] rounded-xl border border-[var(--chrome-border)]" />
              </div>
            </div>

            {/* 5.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Empty State (No Active Filters)
              </span>
              <FilterBar
                filters={[
                  {
                    id: "game",
                    label: "Game",
                    value: "all",
                    options: [{ label: "All Games", value: "all" }],
                    onChange: () => {},
                  },
                  {
                    id: "role",
                    label: "Role",
                    value: "all",
                    options: [{ label: "All Roles", value: "all" }],
                    onChange: () => {},
                  },
                ]}
              />
            </div>

            {/* 5.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State (Filter Mismatch Warning)
              </span>
              <div className="space-y-1.5">
                <FilterBar
                  filters={[
                    {
                      id: "scope",
                      label: "Invalid Dimension",
                      value: "error",
                      options: [{ label: "Dimension Error", value: "error" }],
                      onChange: () => {},
                    },
                  ]}
                  className="border-rose-500/40"
                />
                <span className="text-[11px] text-rose-600 dark:text-rose-400">
                  Selected filter option is no longer available in active cluster partition.
                </span>
              </div>
            </div>

            {/* 5.5 Variant State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Variant States (Multi-Dropdown Interactive Filter Harness)
              </span>
              <FilterBar
                filters={sampleFilters}
                onReset={() => {
                  setActiveFilterGame("all");
                  setActiveFilterStatus("all");
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. DATA TABLE SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "data-table" || activeComponentId === "all") && (
        <section id="data-table" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                6. DataTable
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Authoritative tabular grid with column alignment, pagination, and empty/loading states.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">DataTableProps&lt;T&gt;</span>
          </div>

          <div className="space-y-6">
            {/* 6.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  1. Default State (With Records & Row Click)
                </span>
                <span className="text-xs text-[var(--chrome-ink-soft)]">Click a row to trigger detail view</span>
              </div>
              <DataTable
                columns={sampleColumns}
                data={SAMPLE_ROWS}
                onRowClick={(row) => setActiveDrawer("default")}
                pagination={{
                  currentPage: tablePage,
                  totalPages: 3,
                  pageSize: 4,
                  totalItems: 12,
                  onPageChange: setTablePage,
                }}
              />
            </div>

            {/* 6.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading State (Integrated Skeleton Table)
              </span>
              <DataTable
                columns={sampleColumns}
                data={[]}
                loading={true}
              />
            </div>

            {/* 6.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Empty State (Zero Records Match)
              </span>
              <DataTable
                columns={sampleColumns}
                data={[]}
                emptyMessage="No matching players found"
                emptyDescription="No player accounts currently match the applied filter criteria."
                emptyAction={
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Reset Query
                  </button>
                }
              />
            </div>

            {/* 6.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State (Database Fetch Failure)
              </span>
              <DataTable
                columns={sampleColumns}
                data={[]}
                emptyMessage="Query Execution Failed"
                emptyDescription="The server encountered a timeout while executing the player pagination query."
                emptyIcon={<AlertTriangle className="w-6 h-6 text-rose-500" />}
                emptyAction={
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-xs cursor-pointer"
                  >
                    Retry Query
                  </button>
                }
              />
            </div>

            {/* 6.5 Variant State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Variant State (Single Column Compact Summary Table)
              </span>
              <DataTable
                columns={[
                  { kind: "property", key: "name", header: "Player" },
                  { kind: "property", key: "elo", header: "ELO Standings", align: "right" },
                ]}
                data={SAMPLE_ROWS.slice(0, 2)}
              />
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. EMPTY STATE SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "empty-state" || activeComponentId === "all") && (
        <section id="empty-state" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                7. EmptyState
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Centered placeholder presentation for blank datasets, search misses, and zero states.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">EmptyStateProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 7.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State
              </span>
              <EmptyState />
            </div>

            {/* 7.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading Skeleton Placeholder
              </span>
              <div className="p-10 text-center rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] animate-pulse flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--chrome-control)]" />
                <div className="h-4 w-36 bg-[var(--chrome-control)] rounded" />
                <div className="h-3 w-48 bg-[var(--chrome-control)] rounded" />
              </div>
            </div>

            {/* 7.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Search Miss with Clear Action
              </span>
              <EmptyState
                title="No matching rooms found"
                description='No active multiplayer rooms match query "ROOM_XYZ".'
                icon={<Search className="w-6 h-6 text-amber-500" />}
                action={
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold"
                  >
                    Clear Search
                  </button>
                }
              />
            </div>

            {/* 7.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State (Network Disconnection)
              </span>
              <EmptyState
                title="Telemetry Gateway Unreachable"
                description="Failed to pull live socket stream from server worker."
                icon={<AlertTriangle className="w-6 h-6 text-rose-500" />}
                action={
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold"
                  >
                    Retry Connection
                  </button>
                }
              />
            </div>

            {/* 7.5 Variant States */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Variant State (New User Onboarding CTA)
              </span>
              <EmptyState
                title="No Custom Feature Flags Created"
                description="Roll out experimental features to select player cohorts with canary toggles."
                icon={<Zap className="w-6 h-6 text-amber-500" />}
                action={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-xs shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Create First Flag
                  </button>
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. LOADING STATE SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "loading-state" || activeComponentId === "all") && (
        <section id="loading-state" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                8. LoadingState
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Configurable skeleton placeholder variants for tables, stat cards, and analytical charts.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">LoadingStateProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 8.1 Default State (Table Skeleton) */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State (variant="table", rows=3)
              </span>
              <LoadingState variant="table" rows={3} />
            </div>

            {/* 8.2 Variant: Cards Skeleton */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Variant State (variant="cards")
              </span>
              <LoadingState variant="cards" />
            </div>

            {/* 8.3 Variant: Chart Skeleton */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Variant State (variant="chart")
              </span>
              <LoadingState variant="chart" />
            </div>

            {/* 8.4 Minimal Row Skeleton */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                4. Empty/Minimal Variant (rows=1)
              </span>
              <LoadingState variant="table" rows={1} />
            </div>

            {/* 8.5 Error Timeout Representation */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                5. Error State (Loading Stalled with Fallback Banner)
              </span>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between">
                  <span>⚠️ Telemetry loading is taking longer than expected.</span>
                  <button type="button" className="underline cursor-pointer">Cancel Request</button>
                </div>
                <LoadingState variant="table" rows={2} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. DETAIL DRAWER SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "detail-drawer" || activeComponentId === "all") && (
        <section id="detail-drawer" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                9. DetailDrawer
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Slide-over inspection drawer for deep record inspection, JSON telemetry, and admin moderation.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">DetailDrawerProps</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 9.1 Default Drawer Trigger */}
            <button
              type="button"
              onClick={() => setActiveDrawer("default")}
              className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] hover:border-amber-500/50 text-left transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                1. Default State
              </span>
              <span className="font-bold text-xs text-[var(--chrome-ink)] group-hover:text-amber-500 flex items-center justify-between">
                Open User Profile <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* 9.2 Loading Drawer Trigger */}
            <button
              type="button"
              onClick={() => setActiveDrawer("loading")}
              className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] hover:border-amber-500/50 text-left transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                2. Loading State
              </span>
              <span className="font-bold text-xs text-[var(--chrome-ink)] group-hover:text-amber-500 flex items-center justify-between">
                Open Loading Drawer <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* 9.3 Empty Drawer Trigger */}
            <button
              type="button"
              onClick={() => setActiveDrawer("empty")}
              className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] hover:border-amber-500/50 text-left transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                3. Empty State
              </span>
              <span className="font-bold text-xs text-[var(--chrome-ink)] group-hover:text-amber-500 flex items-center justify-between">
                Open Empty Drawer <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* 9.4 Error Drawer Trigger */}
            <button
              type="button"
              onClick={() => setActiveDrawer("error")}
              className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] hover:border-amber-500/50 text-left transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                4. Error State
              </span>
              <span className="font-bold text-xs text-[var(--chrome-ink)] group-hover:text-amber-500 flex items-center justify-between">
                Open Error Alert Drawer <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* 9.5 XL Width Variant */}
            <button
              type="button"
              onClick={() => setActiveDrawer("xl")}
              className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] hover:border-amber-500/50 text-left transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                5. XL Width Variant
              </span>
              <span className="font-bold text-xs text-[var(--chrome-ink)] group-hover:text-amber-500 flex items-center justify-between">
                Open XL Telemetry Drawer <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>

          {/* Actual DetailDrawer instances for showcase testing */}
          <DetailDrawer
            isOpen={activeDrawer === "default"}
            onClose={() => setActiveDrawer(null)}
            title="Kethan Kumar"
            subtitle="kethan@example.com • ID: usr-9921"
            badge={<StatusBadge status="active" size="sm" />}
            footer={
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs shadow-xs cursor-pointer"
                >
                  Save Changes (Preview)
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              <InfoCard
                title="Account Security & Access"
                fields={[
                  { label: "Role", value: "SUPERADMIN" },
                  { label: "2FA Status", value: "ENABLED" },
                  { label: "HMAC Token", value: "hmac_sha256_valid", isMono: true },
                  { label: "Last Login", value: "Just now" },
                ]}
              />
            </div>
          </DetailDrawer>

          <DetailDrawer
            isOpen={activeDrawer === "loading"}
            onClose={() => setActiveDrawer(null)}
            title="Fetching Telemetry Record..."
            subtitle="Querying in-memory room manager cluster"
          >
            <div className="space-y-4 animate-pulse">
              <div className="h-28 bg-[var(--chrome-control)] rounded-2xl" />
              <div className="h-40 bg-[var(--chrome-control)] rounded-2xl" />
            </div>
          </DetailDrawer>

          <DetailDrawer
            isOpen={activeDrawer === "empty"}
            onClose={() => setActiveDrawer(null)}
            title="Room #LU9981 Telemetry"
            subtitle="snakes_and_ladders • Inactive"
          >
            <EmptyState
              title="No Replay Frames Recorded"
              description="This room was closed before the first dice roll was made."
            />
          </DetailDrawer>

          <DetailDrawer
            isOpen={activeDrawer === "error"}
            onClose={() => setActiveDrawer(null)}
            title="HMAC Security Incident"
            subtitle="AUTH.HMAC_FAIL • Event #EV-4819"
            badge={<StatusBadge status="critical" size="sm" />}
          >
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 space-y-2">
              <h4 className="font-bold text-xs">Cryptographic Verification Mismatch</h4>
              <p className="text-xs leading-relaxed">
                Seat token signature rejected. Socket handshake aborted by server security layer.
              </p>
            </div>
          </DetailDrawer>

          <DetailDrawer
            isOpen={activeDrawer === "xl"}
            onClose={() => setActiveDrawer(null)}
            title="Cluster Raw Telemetry Stream"
            subtitle="WebSocket Event Log Inspector"
            width="xl"
          >
            <pre className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] font-mono text-xs text-[var(--chrome-ink)] overflow-x-auto">
              {JSON.stringify(
                {
                  event: "ROOM_STATE_SYNC",
                  roomCode: "LU7890",
                  gameKind: "ludo",
                  players: [
                    { id: "p1", seat: 0, color: "red", score: 120 },
                    { id: "p2", seat: 1, color: "green", score: 85 },
                  ],
                  turnTimeoutMs: 30000,
                  activeSeat: 0,
                  timestamp: Date.now(),
                },
                null,
                2
              )}
            </pre>
          </DetailDrawer>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. CHART CARD SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "chart-card" || activeComponentId === "all") && (
        <section id="chart-card" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                10. ChartCard
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Responsive visual telemetry card with timeframe toggle buttons and chart slots.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">ChartCardProps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 10.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State (With Area Chart & Time Switcher)
              </span>
              <ChartCard
                title="Player Concurrency"
                subtitle="Live persistent socket connections"
                timeRanges={[
                  { label: "1H", value: "1h" },
                  { label: "6H", value: "6h" },
                  { label: "24H", value: "24h" },
                ]}
                selectedRange={chartRange}
                onRangeChange={setChartRange}
              >
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_CHART_POINTS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="showcaseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chrome-border)" />
                      <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--chrome-ink-soft)" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--chrome-ink-soft)" }} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--chrome-panel)", borderColor: "var(--chrome-border)", borderRadius: "0.75rem" }} />
                      <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#showcaseGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* 10.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading State (Shimmer Skeleton)
              </span>
              <ChartCard
                title="Ingesting Telemetry Streams..."
                subtitle="Aggregating metric timeseries"
              >
                <div className="h-48 w-full bg-[var(--chrome-control)]/50 rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-xs text-[var(--chrome-ink-soft)] font-medium">
                    Loading chart visualizer...
                  </span>
                </div>
              </ChartCard>
            </div>

            {/* 10.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Empty State (Zero Data Points)
              </span>
              <ChartCard
                title="Historical Replays"
                subtitle="Session timeseries dataset"
              >
                <EmptyState
                  title="No Data Points Recorded"
                  description="No game matches were played during this historical window."
                />
              </ChartCard>
            </div>

            {/* 10.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State (Telemetry Aggregation Error)
              </span>
              <ChartCard
                title="Cluster Network I/O"
                subtitle="STUN/TURN Bandwidth Monitor"
                className="border-rose-500/40"
              >
                <div className="p-6 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">Timeseries Aggregation Failed</h4>
                  <p className="text-[11px] text-[var(--chrome-ink-soft)]">Data pipeline buffer overflowed.</p>
                </div>
              </ChartCard>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          11. PAGE HEADER SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "page-header" || activeComponentId === "all") && (
        <section id="page-header" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                11. PageHeader
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Top-of-page contextual banner with breadcrumbs, descriptions, badges, and action bars.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">PageHeaderProps</span>
          </div>

          <div className="space-y-4">
            {/* 11.1 Default State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State (With Actions & Breadcrumbs)
              </span>
              <PageHeader
                title="User Accounts & Moderation"
                description="Manage player credentials, investigate behavioral reports, and manage moderator capabilities."
                breadcrumbs={[
                  { label: "Admin", href: "/admin" },
                  { label: "Users" },
                ]}
                actions={
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-xs shadow-xs"
                  >
                    Export Users (CSV)
                  </button>
                }
              />
            </div>

            {/* 11.2 Loading State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Loading State (Shimmer Skeleton)
              </span>
              <div className="space-y-3 pb-5 border-b border-[var(--chrome-border)] animate-pulse">
                <div className="h-3 w-32 bg-[var(--chrome-control)] rounded" />
                <div className="h-7 w-64 bg-[var(--chrome-control)] rounded" />
                <div className="h-3.5 w-96 bg-[var(--chrome-control)] rounded" />
              </div>
            </div>

            {/* 11.3 Empty State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Minimal State (Title Only)
              </span>
              <PageHeader title="Platform Logs" />
            </div>

            {/* 11.4 Error State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error State (Security Lockdown Banner)
              </span>
              <PageHeader
                title="Emergency Security Incident"
                description="Cluster is operating in read-only mitigation mode due to anomalous traffic."
                badge={<StatusBadge status="critical" label="Lockdown Active" />}
                className="border-rose-500/40"
              />
            </div>

            {/* 11.5 Variant State */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Variant State (Multi-Badge & Multi-Action Header)
              </span>
              <PageHeader
                title="BHALYAM Production Fleet"
                description="Realtime operational command center for WebSocket mesh nodes."
                badge={
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status="healthy" label="99.99% SLA" />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-black">
                      v2.4.0-prod
                    </span>
                  </div>
                }
                breadcrumbs={[
                  { label: "Admin", href: "/admin" },
                  { label: "Infrastructure" },
                  { label: "Fleet Health" },
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold"
                    >
                      Audit Report
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs shadow-xs"
                    >
                      Sync Nodes
                    </button>
                  </div>
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          12. MOCK DATA BANNER SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      {(activeComponentId === "mock-data-banner" || activeComponentId === "all") && (
        <section id="mock-data-banner" className="mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] pb-2">
            <div>
              <h2 className="text-base font-black text-[var(--chrome-ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                12. MockDataBanner
              </h2>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                Mandatory operational data disclosure banner (ADMIN-DATA-001) for mock and partially live views.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500">MockDataBannerProps</span>
          </div>

          <div className="space-y-4">
            {/* 12.1 Default State (kind="mock") */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Default State (kind="mock" — Pure Local Demonstration)
              </span>
              <MockDataBanner kind="mock" />
            </div>

            {/* 12.2 Variant: kind="mixed" */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Mixed Variant (kind="mixed" — Dashboard Live Server + Mock Tiles)
              </span>
              <MockDataBanner kind="mixed" />
            </div>

            {/* 12.3 Loading Skeleton */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                3. Loading State (Shimmer Skeleton)
              </span>
              <div className="p-4 rounded-xl bg-[var(--chrome-control)]/50 border border-[var(--chrome-border)] animate-pulse space-y-2">
                <div className="h-3 w-40 bg-[var(--chrome-control)] rounded" />
                <div className="h-2.5 w-full bg-[var(--chrome-control)] rounded" />
              </div>
            </div>

            {/* 12.4 Error Alert Variant */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                4. Error & Custom Styling Variant
              </span>
              <MockDataBanner
                kind="mock"
                className="border-rose-500/40 bg-rose-500/10"
              />
            </div>

            {/* 12.5 Compact Layout Variant */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/30 border border-[var(--chrome-border)] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                5. Compact Inline Disclosure Variant
              </span>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
                <span>⚡ Interactive Design System Preview — Local Tab Scope Only</span>
                <span className="font-mono text-[10px]">PREVIEW_MODE</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
