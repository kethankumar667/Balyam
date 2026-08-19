import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";
import { operationalFetch, OperationalAuthError } from "../lib/operationalApi";

interface HealthData {
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  uptimeSec: number;
  checks: Array<{ name: string; status: string; message: string }>;
  activeAlerts: string[];
}

interface MetricsData {
  rooms: {
    active: number;
    createdTotal: number;
    closedTotal: number;
    abandonedTotal: number;
    byLifecycle: Record<string, number>;
  };
  recovery: {
    attemptsTotal: number;
    successTotal: number;
    failureTotal: number;
    successRate: number;
    avgDurationMs: number;
    reclaimSuccessTotal: number;
    reclaimFailureTotal: number;
  };
  realtime: {
    connectedSockets: number;
    reconnectTotal: number;
    reconnectSuccessRate: number;
  };
  memory: {
    current: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
    growthRateMbPerMin: number;
  };
}

interface PerfData {
  operations: Record<
    string,
    {
      snapshot: { p50: number; p95: number; p99: number; count: number };
      budget: { targetP95Ms: number; criticalP95Ms: number } | null;
      status: string;
    }
  >;
  totalViolations: number;
}

interface GameMetric {
  game: string;
  matchesStarted: number;
  matchesFinished: number;
  matchesAbandoned: number;
  completionRate: number;
  abandonRate: number;
  avgDurationSec: number;
  totalMoves: number;
}

export default function AdminDashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [perf, setPerf] = useState<PerfData | null>(null);
  const [games, setGames] = useState<GameMetric[]>([]);
  const [timelineCode, setTimelineCode] = useState("");
  const [timelineData, setTimelineData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  /** True once the server stopped accepting this session's credential. */
  const [authLost, setAuthLost] = useState(false);

  /**
   * Every call now carries a credential (see lib/operationalApi.ts). These
   * endpoints used to answer a bare `fetch()` because the server was
   * fail-open; a 401 was not a state this screen could reach, and so it had no
   * way to render one.
   */
  const fetchDashboardData = async () => {
    try {
      const [hRes, mRes, pRes, gRes] = await Promise.all([
        operationalFetch<HealthData>("/api/operational/health"),
        operationalFetch<MetricsData>("/api/operational/metrics"),
        operationalFetch<PerfData>("/api/operational/performance"),
        operationalFetch<{ games: GameMetric[] }>("/api/operational/games"),
      ]);

      setHealth(hRes);
      setMetrics(mRes);
      setPerf(pRes);
      setGames(gRes.games || []);
      setAuthLost(false);
      setLastRefreshed(new Date());
      setIsLoading(false);
    } catch (err) {
      // A credential that expires or is revoked mid-session must stop the
      // polling loop, not spin against a wall every five seconds.
      if (err instanceof OperationalAuthError) {
        setAuthLost(true);
        setAutoRefresh(false);
      } else {
        console.error("Failed to fetch operational data:", err);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const inspectTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineCode.trim()) return;
    try {
      const data = await operationalFetch<unknown>(
        `/api/operational/timeline/${timelineCode.trim().toUpperCase()}`,
      );
      setTimelineData(data);
    } catch (err) {
      if (err instanceof OperationalAuthError) {
        setAuthLost(true);
        setAutoRefresh(false);
        setTimelineData(null);
        return;
      }
      setTimelineData({ error: `Room ${timelineCode} timeline not found` });
    }
  };

  const getStatusColor = (status?: string) => {
    if (status === "CRITICAL") return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    if (status === "WARNING" || status === "WARN") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <BhalyamLogo size={40} decorative />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              BHALYAM Operations Command
              {health && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-mono font-semibold ${getStatusColor(
                    health.status
                  )}`}
                >
                  {health.status}
                </span>
              )}
            </h1>
            <p className="text-xs text-zinc-400">
              Live Realtime Telemetry, Health Diagnostics & Observability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition ${
              autoRefresh
                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            {autoRefresh ? "⚡ Live (5s)" : "⏸ Paused"}
          </button>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition font-medium"
          >
            Refresh Now
          </button>
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
          >
            Lounge Home
          </Link>
        </div>
      </header>

      {/*
        The server stopped accepting this session's credential — expired token,
        rotated key, or an id taken off the admin list. Said plainly, with the
        polling loop already stopped, rather than letting the panels quietly
        freeze on their last good values.
      */}
      {authLost && (
        <div
          role="alert"
          className="max-w-7xl mx-auto mb-8 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          <span className="font-bold">Authorization lost.</span> The server refused this
          session's operational credential. Reload to sign in again or re-enter the
          operational key.
        </div>
      )}

      {isLoading ? (
        <div className="max-w-7xl mx-auto py-20 text-center text-zinc-500">
          <span className="inline-block w-4 h-4 rounded-full bg-amber-500 animate-ping mr-2" />
          Connecting to operational telemetry pipeline…
        </div>
      ) : (
        <main className="max-w-7xl mx-auto space-y-8">
          {/* Active Alerts */}
          {health?.activeAlerts && health.activeAlerts.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-300">
              <span className="text-xl">⚠️</span>
              <div>
                <h2 className="font-semibold text-sm">Active System Alerts</h2>
                <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                  {health.activeAlerts.map((alert, i) => (
                    <li key={i}>{alert}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
              <span className="text-xs text-zinc-500 font-medium">Active Rooms</span>
              <div className="text-2xl sm:text-3xl font-bold mt-1 text-zinc-100 font-mono">
                {metrics?.rooms.active ?? 0}
              </div>
              <span className="text-[11px] text-zinc-500">
                Created: {metrics?.rooms.createdTotal ?? 0}
              </span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
              <span className="text-xs text-zinc-500 font-medium">Recovery Success Rate</span>
              <div className="text-2xl sm:text-3xl font-bold mt-1 text-emerald-400 font-mono">
                {metrics?.recovery.successRate ?? 100}%
              </div>
              <span className="text-[11px] text-zinc-500">
                {metrics?.recovery.successTotal ?? 0} / {metrics?.recovery.attemptsTotal ?? 0} recovered
              </span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
              <span className="text-xs text-zinc-500 font-medium">Connected Sockets</span>
              <div className="text-2xl sm:text-3xl font-bold mt-1 text-sky-400 font-mono">
                {metrics?.realtime.connectedSockets ?? 0}
              </div>
              <span className="text-[11px] text-zinc-500">
                Reconnect rate: {metrics?.realtime.reconnectSuccessRate ?? 100}%
              </span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
              <span className="text-xs text-zinc-500 font-medium">Heap Memory</span>
              <div className="text-2xl sm:text-3xl font-bold mt-1 text-amber-400 font-mono">
                {metrics?.memory.current.heapUsedMb ?? 0} <span className="text-sm font-normal text-zinc-500">MB</span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Total: {metrics?.memory.current.heapTotalMb ?? 0} MB
              </span>
            </div>
          </div>

          {/* Performance SLA Budgets */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center justify-between">
              <span>Realtime Operation Latencies & SLA Budgets</span>
              <span className="text-xs text-zinc-500 font-normal">Target: p95 percentile</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {perf?.operations &&
                Object.entries(perf.operations).map(([op, info]) => (
                  <div
                    key={op}
                    className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-3 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-zinc-300">{op}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${getStatusColor(
                          info.status
                        )}`}
                      >
                        {info.status}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-zinc-100">
                        {info.snapshot.p95} <span className="text-xs font-normal text-zinc-500">ms</span>
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        (p50: {info.snapshot.p50}ms, p99: {info.snapshot.p99}ms)
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-2">
                      Budget Target: &lt;={info.budget?.targetP95Ms ?? 50}ms
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Per-Game Telemetry Table */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 overflow-hidden">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">
              Game Activity & Completion Telemetry
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="pb-3 font-medium">Game</th>
                    <th className="pb-3 font-medium">Started</th>
                    <th className="pb-3 font-medium">Finished</th>
                    <th className="pb-3 font-medium">Abandoned</th>
                    <th className="pb-3 font-medium">Completion %</th>
                    <th className="pb-3 font-medium">Abandon %</th>
                    <th className="pb-3 font-medium">Avg Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-300 font-mono">
                  {games.map((g) => (
                    <tr key={g.game} className="hover:bg-zinc-800/30 transition">
                      <td className="py-2.5 font-sans font-medium text-zinc-200 capitalize">
                        {g.game}
                      </td>
                      <td className="py-2.5">{g.matchesStarted}</td>
                      <td className="py-2.5">{g.matchesFinished}</td>
                      <td className="py-2.5">{g.matchesAbandoned}</td>
                      <td className="py-2.5 text-emerald-400">{g.completionRate}%</td>
                      <td className="py-2.5 text-zinc-400">{g.abandonRate}%</td>
                      <td className="py-2.5">{g.avgDurationSec}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline Inspector */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Room Event Timeline Inspector
            </h2>
            <form onSubmit={inspectTimeline} className="flex gap-2 max-w-md mb-4">
              <input
                type="text"
                placeholder="6-character room code (e.g. 4MN2H4)"
                value={timelineCode}
                onChange={(e) => setTimelineCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500 flex-1 uppercase"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-lg text-xs transition"
              >
                Inspect
              </button>
            </form>

            {timelineData && (
              <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-64">
                {JSON.stringify(timelineData, null, 2)}
              </pre>
            )}
          </div>
        </main>
      )}

      <footer className="max-w-7xl mx-auto text-center text-xs text-zinc-600 mt-12 border-t border-zinc-900 pt-6">
        Last updated: {lastRefreshed.toLocaleTimeString()} | BHALYAM SRE Observability Platform
      </footer>
    </div>
  );
}
