import { useState } from "react";
import {
  TrendingUp,
  Users,
  Gamepad2,
  Coins,
  ArrowUpRight,
  PieChart as PieIcon,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import MetricCard from "../../../components/admin/metric-card";
import ChartCard from "../../../components/admin/chart-card";
import LoadingState from "../../../components/admin/loading-state";
import EmptyState from "../../../components/admin/empty-state";
import MockDataBanner from "../../../components/admin/mock-data-banner";

const USER_GROWTH_DATA = [
  { month: "Sep", dau: 420, mau: 1200 },
  { month: "Oct", dau: 650, mau: 1850 },
  { month: "Nov", dau: 890, mau: 2400 },
  { month: "Dec", dau: 1100, mau: 3100 },
  { month: "Jan", dau: 1280, mau: 3650 },
  { month: "Feb", dau: 1420, mau: 4120 },
];

const COMPLETION_RATE_DATA = [
  { day: "Mon", completed: 88, abandoned: 12 },
  { day: "Tue", completed: 91, abandoned: 9 },
  { day: "Wed", completed: 89, abandoned: 11 },
  { day: "Thu", completed: 94, abandoned: 6 },
  { day: "Fri", completed: 96, abandoned: 4 },
  { day: "Sat", completed: 95, abandoned: 5 },
  { day: "Sun", completed: 97, abandoned: 3 },
];

const GAME_PIE_DATA = [
  { name: "Ludo", value: 35, color: "#3b82f6" },
  { name: "Word Building", value: 25, color: "#8b5cf6" },
  { name: "Rummy", value: 20, color: "#ec4899" },
  { name: "Dots & Boxes", value: 12, color: "#10b981" },
  { name: "Others", value: 8, color: "#f59e0b" },
];

const RETENTION_COHORTS = [
  { cohort: "Feb 01 - Feb 07", users: 340, d1: "74%", d7: "52%", d14: "44%", d30: "38%" },
  { cohort: "Feb 08 - Feb 14", users: 410, d1: "78%", d7: "58%", d14: "49%", d30: "42%" },
  { cohort: "Feb 15 - Feb 21", users: 520, d1: "82%", d7: "64%", d14: "53%", d30: "—" },
  { cohort: "Feb 22 - Present", users: 290, d1: "85%", d7: "—", d14: "—", d30: "—" },
];

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(false);

  const handleTimeRangeChange = (range: string) => {
    setLoading(true);
    setTimeRange(range);
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Telemetry & Growth Analytics"
        description="Comprehensive analysis of player acquisition, match completion rates, game retention cohorts, and token economics."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Analytics" }]}
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)]">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleTimeRangeChange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  timeRange === r
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black shadow-xs"
                    : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      <MockDataBanner kind="mock" />

      {/* KPI Stats */}
      {loading ? (
        <LoadingState variant="cards" className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Daily Active Players (DAU)"
            value="1,420"
            icon={<Users className="w-5 h-5 text-amber-500" />}
            trend={{ value: 14.8, direction: "up", label: "vs last month" }}
          />
          <StatCard
            title="Monthly Active Players (MAU)"
            value="4,120"
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            trend={{ value: 22.4, direction: "up", label: "vs last quarter" }}
          />
          <StatCard
            title="Match Completion Ratio"
            value="93.8%"
            icon={<Gamepad2 className="w-5 h-5 text-orange-500" />}
            subtitle="Low abandonment rate"
          />
          <StatCard
            title="Average Session Length"
            value="24.5 mins"
            icon={<Coins className="w-5 h-5 text-amber-500" />}
            subtitle="3.2 matches / player"
          />
        </div>
      )}

      {/* Charts Grid Row 1 */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <LoadingState variant="chart" />
          <LoadingState variant="chart" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* User Growth Line Chart */}
          <ChartCard
            title="Player Growth Trajectory (DAU / MAU)"
            subtitle="Monthly active player cohort expansion"
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={USER_GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A17C4E" opacity={0.15} />
                <XAxis dataKey="month" stroke="#7A5E45" fontSize={11} />
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
                <Legend />
              <Line
                type="monotone"
                dataKey="dau"
                name="DAU (Daily Active)"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ r: 4, fill: "#F59E0B" }}
              />
              <Line
                type="monotone"
                dataKey="mau"
                name="MAU (Monthly Active)"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10B981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Match Completion vs Abandonment Area Chart */}
        <ChartCard
          title="Daily Match Completion %"
          subtitle="Finished matches vs early rage-quit/abandonment"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={COMPLETION_RATE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#A17C4E" opacity={0.15} />
              <XAxis dataKey="day" stroke="#7A5E45" fontSize={11} />
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
                dataKey="completed"
                name="Completed (%)"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="abandoned"
                name="Abandoned (%)"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    )}

      {/* Grid Row 2: Distribution Pie & Cohort Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Game Mode Pie Chart */}
        <div>
          <ChartCard
            title="Player Time Share"
            subtitle="Percentage of total play time"
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={GAME_PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {GAME_PIE_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#131926",
                    borderColor: "#66799A",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#F1F5F9",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--chrome-hairline)]">
              {GAME_PIE_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[var(--chrome-ink-soft)] truncate">{item.name}</span>
                  <span className="font-bold text-[var(--chrome-ink)] ml-auto font-mono">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Retention Cohort Table */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Player Retention Cohort Matrix
            </h3>
            <p className="text-xs text-[var(--chrome-ink-soft)] mt-0.5">
              Multiplayer return rate across 1, 7, 14, and 30 day intervals.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[440px] sm:min-w-full">
              <thead>
                <tr className="border-b border-[var(--chrome-hairline)] text-[var(--chrome-ink-soft)] font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Weekly Cohort</th>
                  <th className="pb-2.5">New Players</th>
                  <th className="pb-2.5 text-center">Day 1</th>
                  <th className="pb-2.5 text-center">Day 7</th>
                  <th className="pb-2.5 text-center">Day 14</th>
                  <th className="pb-2.5 text-center">Day 30</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--chrome-hairline)] font-mono">
                {RETENTION_COHORTS.map((c) => (
                  <tr key={c.cohort} className="hover:bg-[var(--chrome-control)]/60">
                    <td className="py-3 font-sans font-bold text-[var(--chrome-ink)]">
                      {c.cohort}
                    </td>
                    <td className="py-3 text-[var(--chrome-ink-soft)]">{c.users}</td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-bold border border-emerald-500/30">
                        {c.d1}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          c.d7 !== "—" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "text-[var(--chrome-ink-soft)]"
                        }`}
                      >
                        {c.d7}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          c.d14 !== "—" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" : "text-[var(--chrome-ink-soft)]"
                        }`}
                      >
                        {c.d14}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          c.d30 !== "—" ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30" : "text-[var(--chrome-ink-soft)]"
                        }`}
                      >
                        {c.d30}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
