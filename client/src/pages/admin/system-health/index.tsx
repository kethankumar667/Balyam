import { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  HardDrive,
  Plug,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
import StatusBadge from "../../../components/admin/status-badge";
import ChartCard from "../../../components/admin/chart-card";
import LoadingState from "../../../components/admin/loading-state";
import EmptyState from "../../../components/admin/empty-state";
import { operationalFetch, OperationalAuthError } from "../../../lib/operationalApi";

/**
 * Real infrastructure diagnostics.
 *
 * Every number on this page comes from the server's own observability layer,
 * which was already built and already exposed — it simply had no consumer:
 *   - `/api/operational/health`  → `HealthMonitor.evaluate()`: the real
 *     platform status plus its five real checks (latency_budgets,
 *     memory_growth, realtime_connectivity, recovery_resilience, stuck_rooms).
 *   - `/api/operational/metrics` → `TelemetryAggregator.getSnapshot()`, which
 *     carries `memory` (a live `MemoryMonitor` sample history), `performance`
 *     (real p50/p95/p99 histograms with budget verdicts), `realtime`, `rooms`
 *     and `recovery` in one payload.
 *
 * Anything the server does not actually measure is NOT rendered here rather
 * than filled with a plausible-looking constant — the page previously showed
 * a fixed "Event Loop Delay: 1.2 ms" and a table of invented per-route
 * latencies, neither of which had any source behind them.
 */

/* ── Server payload contracts (mirrors of the server-side types) ────────── */

type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  metrics?: Record<string, unknown>;
}

interface PlatformHealthReport {
  status: HealthStatus;
  timestamp: number;
  uptimeSec: number;
  checks: HealthCheckResult[];
  activeAlerts: string[];
}

interface MemorySample {
  timestamp: number;
  heapUsedMb: number;
  heapTotalMb: number;
  heapSizeLimitMb: number;
  rssMb: number;
}

interface HistogramSnapshot {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface OperationReport {
  snapshot: HistogramSnapshot;
  budget: { targetP95Ms: number; criticalP95Ms: number } | null;
  budgetBreached: boolean;
  status: "PASS" | "WARN" | "CRITICAL";
}

interface MetricsSnapshot {
  timestamp: number;
  uptimeSec: number;
  rooms: { active: number; byLifecycle: Record<string, number> };
  realtime: { connectedSockets: number; reconnectSuccessRate: number };
  memory: {
    current: MemorySample;
    deltaMb: number;
    growthRateMbPerMin: number;
    isLeakingSuspected: boolean;
    heapUsageRatio: number;
    growthTrend: { trend: string };
    samplesCount: number;
    history: MemorySample[];
  };
  performance: { operations: Record<string, OperationReport>; totalViolations: number };
}

/* ── Presentation helpers ───────────────────────────────────────────────── */

/** `latency_budgets` → `Latency Budgets`. Server check names are snake_case. */
function humanizeCheckName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Server statuses are upper-case; StatusBadge's vocabulary is lower-case. */
function badgeStatus(status: HealthStatus | "PASS" | "WARN" | "CRITICAL"): string {
  switch (status) {
    case "HEALTHY":
    case "PASS":
      return "healthy";
    case "WARNING":
    case "WARN":
      return "warning";
    default:
      return "critical";
  }
}

function healthIcon(status: HealthStatus | undefined) {
  if (status === "CRITICAL") return <XCircle className="w-5 h-5 text-rose-500" />;
  if (status === "WARNING") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMs(value: number): string {
  return `${Math.round(value)}ms`;
}

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

export default function AdminSystemHealthPage() {
  const [health, setHealth] = useState<PlatformHealthReport | null>(null);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      // `/health` returns HTTP 503 when the platform is CRITICAL — that is a
      // real, reportable state, not a failure to fetch, so both are requested
      // independently and a rejected health probe still leaves metrics usable.
      const [healthResult, metricsResult] = await Promise.allSettled([
        operationalFetch<PlatformHealthReport>("/api/operational/health"),
        operationalFetch<MetricsSnapshot>("/api/operational/metrics"),
      ]);

      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      if (metricsResult.status === "fulfilled") setMetrics(metricsResult.value);

      if (healthResult.status === "rejected" && metricsResult.status === "rejected") {
        setError(errorMessage(healthResult.reason));
      } else {
        setError(null);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const memory = metrics?.memory;
  const passingChecks = health?.checks.filter((c) => c.status === "HEALTHY").length ?? 0;
  const totalChecks = health?.checks.length ?? 0;

  const memoryChartData = (memory?.history ?? []).map((sample) => ({
    time: formatClock(sample.timestamp),
    heapUsed: Math.round(sample.heapUsedMb),
    rss: Math.round(sample.rssMb),
  }));

  const operations = Object.entries(metrics?.performance.operations ?? {});

  return (
    <AdminLayout>
      <PageHeader
        title="Infrastructure & Subsystem Diagnostics"
        description={
          metrics
            ? `Live server telemetry — process up ${formatUptime(metrics.uptimeSec)}, sampled ${formatClock(metrics.timestamp)}.`
            : "Live Node runtime memory, realtime connectivity, and measured operation latency."
        }
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "System Health" }]}
        actions={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Telemetry"}</span>
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          Telemetry unavailable: {error}
        </div>
      )}

      {health && health.activeAlerts.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider">
            {health.activeAlerts.length} active alert{health.activeAlerts.length === 1 ? "" : "s"}
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {health.activeAlerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <LoadingState variant="cards" label="Loading system health data" className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Overall Platform Health"
            value={health?.status ?? "UNAVAILABLE"}
            icon={healthIcon(health?.status)}
            subtitle={health ? `${passingChecks} of ${totalChecks} checks passing` : "Health probe unavailable"}
          />
          <StatCard
            title="Node Heap Used"
            value={memory ? `${Math.round(memory.current.heapUsedMb)} MB` : "—"}
            icon={<Cpu className="w-5 h-5 text-amber-500" />}
            subtitle={
              memory
                ? `${Math.round(memory.heapUsageRatio * 100)}% of ${Math.round(memory.current.heapSizeLimitMb)} MB limit`
                : "Metrics unavailable"
            }
          />
          <StatCard
            title="Process RSS Resident"
            value={memory ? `${Math.round(memory.current.rssMb)} MB` : "—"}
            icon={<HardDrive className="w-5 h-5 text-orange-500" />}
            subtitle={
              memory
                ? `Trend: ${memory.growthTrend.trend.replace(/_/g, " ").toLowerCase()} (${memory.growthRateMbPerMin >= 0 ? "+" : ""}${memory.growthRateMbPerMin} MB/min)`
                : "Metrics unavailable"
            }
          />
          <StatCard
            title="Connected Sockets"
            value={metrics ? String(metrics.realtime.connectedSockets) : "—"}
            icon={<Plug className="w-5 h-5 text-amber-500" />}
            subtitle={metrics ? `${metrics.rooms.active} active room(s)` : "Metrics unavailable"}
          />
        </div>
      )}

      {/* Real health checks — the server's own five subsystem probes */}
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
          Core Subsystem Checks
        </h3>

        {!isLoading && (!health || health.checks.length === 0) ? (
          <EmptyState
            title="No health checks reported"
            description="The health probe returned no subsystem checks. This usually means the operational API is unreachable."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {(health?.checks ?? []).map((check) => (
              <div
                key={check.name}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-[var(--chrome-ink)] text-xs truncate">
                      {humanizeCheckName(check.name)}
                    </h4>
                    <StatusBadge status={badgeStatus(check.status)} size="sm" />
                  </div>
                  <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed mb-4">
                    {check.message}
                  </p>
                </div>

                {check.metrics && Object.keys(check.metrics).length > 0 && (
                  <div className="pt-3 border-t border-[var(--chrome-hairline)] grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
                    {Object.entries(check.metrics).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-[var(--chrome-ink-soft)] truncate">{key}</span>
                        <strong className="text-[var(--chrome-ink)] shrink-0">{String(value)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title="Node.js Process Memory Footprint"
          subtitle={
            memory
              ? `Heap used vs RSS across ${memory.samplesCount} live sample(s)`
              : "Heap used vs RSS resident set size"
          }
        >
          {memoryChartData.length === 0 ? (
            <EmptyState
              title="No memory samples yet"
              description="The memory monitor has not captured a sample window yet. This fills in as the process runs."
            />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={memoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A17C4E" opacity={0.15} />
                <XAxis dataKey="time" stroke="#7A5E45" fontSize={11} />
                <YAxis stroke="#7A5E45" fontSize={11} unit="MB" />
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
                  dataKey="rss"
                  name="RSS Resident (MB)"
                  stroke="#E85D04"
                  fill="#E85D04"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="heapUsed"
                  name="Heap Used (MB)"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Measured operation latency — real histograms, not per-route guesses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-1">
              Measured Operation Latency
            </h3>
            <p className="text-xs text-[var(--chrome-ink-soft)] mb-4">
              Percentile histograms recorded by the server against its own performance budgets.
              {metrics ? ` ${metrics.performance.totalViolations} budget violation(s).` : ""}
            </p>

            {operations.length === 0 ? (
              <EmptyState
                title="No latency samples yet"
                description="These histograms populate once rooms are created, joined, and played on this server process."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[400px] sm:min-w-full">
                  <thead>
                    <tr className="border-b border-[var(--chrome-hairline)] text-[var(--chrome-ink-soft)] font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-2">Operation</th>
                      <th className="pb-2 text-center">n</th>
                      <th className="pb-2 text-center">p50</th>
                      <th className="pb-2 text-center">p95</th>
                      <th className="pb-2 text-center">p99</th>
                      <th className="pb-2 text-right">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--chrome-hairline)] font-mono">
                    {operations.map(([name, report]) => (
                      <tr key={name}>
                        <td className="py-2.5 font-bold text-[var(--chrome-ink)] font-sans">
                          {humanizeCheckName(name)}
                        </td>
                        <td className="py-2.5 text-center text-[var(--chrome-ink-soft)]">
                          {report.snapshot.count}
                        </td>
                        <td className="py-2.5 text-center text-[var(--chrome-ink)]">
                          {report.snapshot.count > 0 ? formatMs(report.snapshot.p50) : "—"}
                        </td>
                        <td className="py-2.5 text-center text-[var(--chrome-ink)]">
                          {report.snapshot.count > 0 ? formatMs(report.snapshot.p95) : "—"}
                        </td>
                        <td className="py-2.5 text-center text-[var(--chrome-ink)]">
                          {report.snapshot.count > 0 ? formatMs(report.snapshot.p99) : "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          <StatusBadge status={badgeStatus(report.status)} size="sm" label={report.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
