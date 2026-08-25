import { useEffect, useState } from "react";
import {
  Users,
  Gamepad2,
  Activity,
  Cpu,
  RefreshCw,
  Coins,
  TrendingUp,
  Flame,
  Radio,
  Bot,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import ChartCard from "../../../components/admin/chart-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import StatusBadge from "../../../components/admin/status-badge";
import ActivityTimeline, { type TimelineItem } from "../../../components/admin/activity-timeline";
import SectionHeader from "../../../components/admin/section-header";
import MockDataBanner from "../../../components/admin/mock-data-banner";
import { operationalFetch } from "../../../lib/operationalApi";

interface LiveMatchRow extends Record<string, unknown> {
  code: string;
  game: string;
  host: string;
  playersCount: number;
  phase: string;
  uptime: string;
}

const TRAFFIC_DATA = [
  { time: "00:00", matches: 6, players: 24 },
  { time: "03:00", matches: 4, players: 16 },
  { time: "06:00", matches: 8, players: 38 },
  { time: "09:00", matches: 14, players: 78 },
  { time: "12:00", matches: 22, players: 120 },
  { time: "15:00", matches: 28, players: 164 },
  { time: "18:00", matches: 36, players: 210 },
  { time: "21:00", matches: 42, players: 260 },
  { time: "Now", matches: 18, players: 142 },
];

const GAME_DISTRIBUTION = [
  { name: "Ludo", sessions: 48, fill: "#3b82f6" },
  { name: "Word Building", sessions: 36, fill: "#8b5cf6" },
  { name: "Rummy", sessions: 32, fill: "#ec4899" },
  { name: "Dots & Boxes", sessions: 24, fill: "#10b981" },
  { name: "Snakes & Ladders", sessions: 20, fill: "#f59e0b" },
  { name: "UNO", sessions: 18, fill: "#ef4444" },
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<"healthy" | "warning" | "critical">("healthy");
  const [onlineSockets, setOnlineSockets] = useState(142);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await operationalFetch<{ status: string }>("/health");
      if (res && res.status === "HEALTHY") {
        setSystemStatus("healthy");
      }
    } catch {
      setSystemStatus("healthy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const showActionToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const stats = [
    {
      title: "Live Match Rooms",
      value: "18",
      icon: <Gamepad2 className="w-5 h-5" />,
      trend: { value: 14.2, direction: "up" as const, label: "vs last hr" },
    },
    {
      title: "Connected Players",
      value: `${onlineSockets}`,
      icon: <Users className="w-5 h-5" />,
      trend: { value: 8.5, direction: "up" as const, label: "vs peak" },
    },
    {
      title: "Socket Gateway SLA",
      value: "99.98%",
      icon: <Activity className="w-5 h-5" />,
      subtitle: "Zero frame drops",
    },
    {
      title: "Node Memory (Heap)",
      value: "142 MB",
      icon: <Cpu className="w-5 h-5" />,
      subtitle: "Limit: 512 MB",
    },
  ];

  const recentMatches: LiveMatchRow[] = [
    {
      code: "LU7890",
      game: "Ludo",
      host: "Rahul Sharma",
      playersCount: 4,
      phase: "playing",
      uptime: "12m 40s",
    },
    {
      code: "RM4521",
      game: "Rummy",
      host: "Priya Patel",
      playersCount: 6,
      phase: "playing",
      uptime: "08m 15s",
    },
    {
      code: "WB1092",
      game: "Word Building",
      host: "Kethan",
      playersCount: 2,
      phase: "playing",
      uptime: "04m 20s",
    },
    {
      code: "DB3311",
      game: "Dots & Boxes",
      host: "Sir Krishna",
      playersCount: 4,
      phase: "lobby",
      uptime: "01m 10s",
    },
    {
      code: "UN9902",
      game: "UNO",
      host: "Miss Lakshmi",
      playersCount: 5,
      phase: "playing",
      uptime: "19m 50s",
    },
  ];

  const columns: Column<LiveMatchRow>[] = [
    {
      key: "code",
      header: "Room Code",
      render: (row) => (
        <span className="font-mono font-bold text-amber-500 dark:text-amber-400">
          {row.code}
        </span>
      ),
    },
    {
      key: "game",
      header: "Game",
      render: (row) => <span className="font-semibold text-[var(--chrome-ink)]">{row.game}</span>,
    },
    {
      key: "host",
      header: "Host",
      render: (row) => <span className="text-[var(--chrome-ink-soft)]">{row.host}</span>,
    },
    {
      key: "playersCount",
      header: "Players",
      align: "center",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] text-xs font-bold border border-[var(--chrome-border)]">
          {row.playersCount}
        </span>
      ),
    },
    {
      key: "phase",
      header: "Phase",
      render: (row) => (
        <StatusBadge
          status={row.phase === "playing" ? "active" : "pending"}
          label={row.phase}
          size="sm"
        />
      ),
    },
    {
      key: "uptime",
      header: "Uptime",
      align: "right",
      render: (row) => <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">{row.uptime}</span>,
    },
  ];

  const recentTimeline: TimelineItem[] = [
    {
      id: "t-1",
      title: "New tournament room initialized",
      description: "Room #LU7890 created with 4 seats",
      timestamp: "2 mins ago",
      actor: { name: "System" },
    },
    {
      id: "t-2",
      title: "Emergency bot failover triggered",
      description: "Auto-substituted seat 3 in Room #RM4521",
      timestamp: "7 mins ago",
      iconBg: "bg-amber-500 text-zinc-950",
      actor: { name: "BotScheduler" },
    },
    {
      id: "t-3",
      title: "Admin configuration updated",
      description: "Rate limit threshold set to 120 req/min",
      timestamp: "22 mins ago",
      actor: { name: "SuperAdmin" },
    },
    {
      id: "t-4",
      title: "Word Building dictionary loaded",
      description: "250,000 words indexed with frequency scores",
      timestamp: "1 hr ago",
      actor: { name: "EngineWorker" },
    },
  ];

  return (
    <AdminLayout
      onRefresh={fetchDashboardData}
      isRefreshing={loading}
      systemStatus={systemStatus}
      onlineSockets={onlineSockets}
    >
      <PageHeader
        title="Command Center Overview"
        description="Realtime overview of active matches, socket cluster telemetry, platform revenue, and quick actions."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Telemetry</span>
            </button>
          </div>
        }
      />

      <MockDataBanner kind="mixed" />

      {toastMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            subtitle={stat.subtitle}
            loading={loading}
          />
        ))}
      </div>

      {/* Visual Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 24h Area Chart: Concurrency & Matches */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Realtime Player Concurrency (24h)"
            subtitle="Hourly active WebSocket sessions and game match concurrency"
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={TRAFFIC_DATA}>
                <defs>
                  <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E85D04" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E85D04" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#A17C4E" opacity={0.15} />
                <XAxis dataKey="time" stroke="#7A5E45" fontSize={11} />
                <YAxis stroke="#7A5E45" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#131926",
                    borderColor: "#66799A",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#F1F5F9",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="players"
                  name="Connected Players"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPlayers)"
                />
                <Area
                  type="monotone"
                  dataKey="matches"
                  name="Active Rooms"
                  stroke="#E85D04"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMatches)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Game Mode Distribution Bar Chart */}
        <div>
          <ChartCard
            title="Catalog Popularity"
            subtitle="Live room distribution by game title"
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={GAME_DISTRIBUTION} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#A17C4E" opacity={0.15} />
                <XAxis type="number" stroke="#7A5E45" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#7A5E45" fontSize={11} width={85} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#131926",
                    borderColor: "#66799A",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#F1F5F9",
                  }}
                />
                <Bar dataKey="sessions" radius={[0, 6, 6, 0]} fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Revenue & Economy + Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MetricCard
          title="Virtual Token Economy"
          mainValue="128,450"
          subtitle="Tokens Circulating"
          progressPct={72}
          progressColor="bg-amber-500"
          icon={<Coins className="w-4 h-4 text-amber-500" />}
          subMetrics={[
            { label: "24h Volume", value: "14,200", change: "+12%", changeType: "positive" },
            { label: "Store Spend", value: "8,950", change: "+5%", changeType: "positive" },
          ]}
        />

        <MetricCard
          title="Bot Automation Fleet"
          mainValue="26 / 32"
          subtitle="Bot Workers Scheduled"
          progressPct={81}
          progressColor="bg-amber-600"
          icon={<Bot className="w-4 h-4 text-amber-500" />}
          subMetrics={[
            { label: "Turn Fallbacks", value: "14", change: "0 errors", changeType: "neutral" },
            { label: "Avg AI Decision", value: "820ms", change: "-40ms", changeType: "positive" },
          ]}
        />

        {/* Quick Operations Box */}
        <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-1">
              Administrative Quick Actions
            </h3>
            <p className="text-[11px] text-[var(--chrome-ink-soft)] mb-3">
              One-click operational triggers for the in-memory engine.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => showActionToast("Local demonstration only — no broadcast was sent to any players.")}
              className="px-2.5 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-amber-500" />
              <span>Broadcast</span>
            </button>

            <button
              type="button"
              onClick={() => showActionToast("Local demonstration only — no rooms were reclaimed on any server.")}
              className="px-2.5 py-2 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold hover:bg-[var(--chrome-control-hi)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clean Rooms</span>
            </button>

            <button
              type="button"
              onClick={() => showActionToast("Local demonstration only — no bot workers were restarted.")}
              className="px-2.5 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-amber-500" />
              <span>Restart Bots</span>
            </button>

            <button
              type="button"
              onClick={() => showActionToast("Local demonstration only — no audit report was generated.")}
              className="px-2.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Audit Run</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Matches Table + Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <SectionHeader
            title="Live Match Rooms"
            badge={<span className="text-xs text-[var(--chrome-ink-soft)] font-medium">(5 of 18 active)</span>}
          />
          <DataTable columns={columns} data={recentMatches} loading={loading} />
        </div>

        <div className="space-y-3">
          <SectionHeader title="Realtime System Events" />
          <ActivityTimeline items={recentTimeline} />
        </div>
      </div>
    </AdminLayout>
  );
}
