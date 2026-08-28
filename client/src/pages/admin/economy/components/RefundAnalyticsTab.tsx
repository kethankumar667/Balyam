import React, { useState, useMemo } from "react";
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
  Legend,
} from "recharts";
import {
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Layers,
  PieChart,
} from "lucide-react";
import ChartCard from "../../../../components/admin/chart-card";
import StatCard from "../../../../components/admin/stat-card";
import SectionHeader from "../../../../components/admin/section-header";
import StatusBadge from "../../../../components/admin/status-badge";
import { CoinAmount } from "../../../../components/economy/CoinAmount";
import type { MatchEconomySettlementRecord } from "../../../../lib/economyApi";
import { formatTimeAgo } from "../../../../lib/formatTimeAgo";

interface RefundAnalyticsTabProps {
  settlements: MatchEconomySettlementRecord[];
  onSelectMatch: (matchId: string) => void;
}

export function RefundAnalyticsTab({ settlements, onSelectMatch }: RefundAnalyticsTabProps) {
  const [timeframe, setTimeframe] = useState<"7d" | "14d" | "30d">("7d");

  // Generate 7-day trend chart data based on settlements
  const chartData = useMemo(() => {
    const days = timeframe === "7d" ? 7 : timeframe === "14d" ? 14 : 30;
    const now = new Date();
    const buckets: Array<{
      date: string;
      settled: number;
      refunded: number;
      forfeited: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

      // Match settlements for this day
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86_400_000;

      const dayMatches = settlements.filter(
        (s) => s.createdAt >= dayStart && s.createdAt < dayEnd,
      );

      const settled = dayMatches.filter((s) => s.status === "SETTLED").length;
      const refunded = dayMatches.filter((s) => s.status === "REFUNDED").length;
      const forfeited = dayMatches.filter((s) => s.status === "ABANDONMENT_FORFEITED").length;

      // Real counts only — a quiet day is zero, not a synthesized wave.
      // There is no "list all settlements" endpoint yet (see index.tsx),
      // so this chart is honestly sparse until one exists; that is a real
      // gap to close, not something to paper over with invented numbers.
      buckets.push({
        date: dateStr,
        settled,
        refunded,
        forfeited,
      });
    }

    return buckets;
  }, [settlements, timeframe]);

  // Aggregate metrics
  const totalSettled = settlements.filter((s) => s.status === "SETTLED").length;
  const totalRefunded = settlements.filter((s) => s.status === "REFUNDED").length;
  const totalForfeited = settlements.filter((s) => s.status === "ABANDONMENT_FORFEITED").length;
  const totalTerminal = totalSettled + totalRefunded + totalForfeited || 1;

  const refundRate = ((totalRefunded / totalTerminal) * 100).toFixed(1);
  const forfeitureRate = ((totalForfeited / totalTerminal) * 100).toFixed(1);
  const settlementRate = ((totalSettled / totalTerminal) * 100).toFixed(1);

  // Recent refund/forfeit exceptions
  const exceptionEvents = useMemo(() => {
    return settlements
      .filter((s) => s.status === "REFUNDED" || s.status === "ABANDONMENT_FORFEITED")
      .slice(0, 8);
  }, [settlements]);

  return (
    <div className="space-y-6">
      {/* 1. Rate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Settlement Success Rate"
          value={`${settlementRate}%`}
          subtitle="Matches successfully distributed to players"
          icon={<ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
        />

        <StatCard
          title="Refund Rate"
          value={`${refundRate}%`}
          subtitle="Compensating returns to host wallet"
          icon={<RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
        />

        <StatCard
          title="Forfeiture Rate"
          value={`${forfeitureRate}%`}
          subtitle="Mid-match abandonments captured to World Bank"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
        />
      </div>

      {/* 2. Visual Trend Chart */}
      <ChartCard
        title="Settlement, Refund & Forfeiture Volume"
        subtitle="Daily distribution of match economy terminal outcomes"
        headerAction={
          <div
            role="group"
            aria-label="Analytics timeframe range"
            className="flex items-center gap-1 bg-[var(--chrome-control)] p-1 rounded-xl border border-[var(--chrome-border)] text-xs font-bold text-[var(--chrome-ink)]"
          >
            <button
              type="button"
              onClick={() => setTimeframe("7d")}
              aria-pressed={timeframe === "7d"}
              aria-label="Last 7 days analytics timeframe"
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                timeframe === "7d" ? "bg-[var(--chrome-panel)] shadow-2xs text-[var(--chrome-ink)]" : "text-[var(--chrome-ink-soft)]"
              }`}
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("14d")}
              aria-pressed={timeframe === "14d"}
              aria-label="Last 14 days analytics timeframe"
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                timeframe === "14d" ? "bg-[var(--chrome-panel)] shadow-2xs text-[var(--chrome-ink)]" : "text-[var(--chrome-ink-soft)]"
              }`}
            >
              14D
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("30d")}
              aria-pressed={timeframe === "30d"}
              aria-label="Last 30 days analytics timeframe"
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                timeframe === "30d" ? "bg-[var(--chrome-panel)] shadow-2xs text-[var(--chrome-ink)]" : "text-[var(--chrome-ink-soft)]"
              }`}
            >
              30D
            </button>
          </div>
        }
      >
        <div className="h-72 w-full pt-4 min-w-0">
          <div className="sr-only">
            Trend chart displaying daily counts of settled, refunded, and forfeited match outcomes over {timeframe}.
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="settledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="refundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="forfeitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chrome-hairline)" opacity={0.6} />
              <XAxis dataKey="date" stroke="var(--chrome-ink-soft)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--chrome-ink-soft)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--chrome-panel)",
                  borderColor: "var(--chrome-border)",
                  borderRadius: "1rem",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Area
                type="monotone"
                dataKey="settled"
                name="Settled Matches"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#settledGrad)"
              />
              <Area
                type="monotone"
                dataKey="refunded"
                name="Refunded Matches"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#refundGrad)"
              />
              <Area
                type="monotone"
                dataKey="forfeited"
                name="Forfeited Matches"
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#forfeitGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 3. Recent Refund & Forfeiture Log */}
      <section className="space-y-3">
        <SectionHeader
          title="Recent Compensating Refunds & Forfeitures"
          description="Forensic trace of matches requiring compensating refund or abandonment capture"
        />

        <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs overflow-hidden divide-y divide-[var(--chrome-hairline)]">
          {exceptionEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--chrome-ink-soft)]">
              No recent refund or forfeiture exceptions recorded.
            </div>
          ) : (
            exceptionEvents.map((item) => (
              <div
                key={item.matchId}
                role="button"
                tabIndex={0}
                aria-label={`Inspect exception for match ${item.matchId}`}
                onClick={() => onSelectMatch(item.matchId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectMatch(item.matchId);
                  }
                }}
                className="p-4 flex items-center justify-between hover:bg-[var(--chrome-control)]/50 transition cursor-pointer text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono font-bold text-[var(--chrome-ink)] truncate max-w-[180px] sm:max-w-xs block"
                      title={item.matchId}
                    >
                      {item.matchId}
                    </span>
                    <StatusBadge
                      status={item.status === "REFUNDED" ? "completed" : "critical"}
                      label={item.status}
                      size="sm"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--chrome-ink-soft)] truncate">
                    {item.refundReason || (item.status === "REFUNDED" ? "Compensating refund applied" : "Match abandoned mid-game")}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <CoinAmount
                    amount={item.status === "REFUNDED" ? item.totalRefunded : item.totalCollected}
                    size="sm"
                    className="font-bold text-[var(--chrome-ink)] block"
                  />
                  <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono">
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default RefundAnalyticsTab;
