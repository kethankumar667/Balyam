import { useState } from "react";
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
import StatusBadge from "../../../components/admin/status-badge";
import ChartCard from "../../../components/admin/chart-card";
import LoadingState from "../../../components/admin/loading-state";
import EmptyState from "../../../components/admin/empty-state";
import MockDataBanner from "../../../components/admin/mock-data-banner";

const MEMORY_CHART_DATA = [
  { time: "22:00", heapUsed: 124, heapTotal: 256, rss: 180 },
  { time: "22:05", heapUsed: 138, heapTotal: 256, rss: 195 },
  { time: "22:10", heapUsed: 142, heapTotal: 256, rss: 202 },
  { time: "22:15", heapUsed: 130, heapTotal: 256, rss: 190 },
  { time: "22:20", heapUsed: 148, heapTotal: 256, rss: 210 },
  { time: "Now", heapUsed: 142, heapTotal: 256, rss: 205 },
];

interface Subsystem {
  name: string;
  status: "healthy" | "warning" | "critical";
  latency: string;
  uptime: string;
  detail: string;
}

const SUBSYSTEMS: Subsystem[] = [
  {
    name: "Socket.IO Realtime Gateway",
    status: "healthy",
    latency: "12ms",
    uptime: "99.99%",
    detail: "142 active persistent WebSocket connections across single Node worker",
  },
  {
    name: "In-Memory RoomManager",
    status: "healthy",
    latency: "2ms",
    uptime: "100%",
    detail: "18 active matches, turn timer loop running at 1000ms tick interval",
  },
  {
    name: "WebRTC Signalling Mesh",
    status: "healthy",
    latency: "18ms",
    uptime: "99.95%",
    detail: "STUN server relay active with zero ICE negotiation dropped frames",
  },
  {
    name: "Supabase Authentication Bridge",
    status: "healthy",
    latency: "65ms",
    uptime: "99.90%",
    detail: "HMAC cryptographic seat token verification operational",
  },
  {
    name: "Bot Automation Scheduler",
    status: "healthy",
    latency: "5ms",
    uptime: "100%",
    detail: "26 bot seats running heuristic tree search without event loop lag",
  },
];

const API_ENDPOINTS = [
  { endpoint: "GET /health", p50: "4ms", p95: "12ms", p99: "24ms", errorRate: "0.00%" },
  { endpoint: "POST /room:create", p50: "14ms", p95: "28ms", p99: "45ms", errorRate: "0.01%" },
  { endpoint: "POST /room:join", p50: "12ms", p95: "22ms", p99: "38ms", errorRate: "0.00%" },
  { endpoint: "EVENT game:move", p50: "8ms", p95: "15ms", p99: "26ms", errorRate: "0.00%" },
  { endpoint: "EVENT webrtc:signal", p50: "6ms", p95: "11ms", p99: "18ms", errorRate: "0.00%" },
];

export default function AdminSystemHealthPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanAlert, setScanAlert] = useState<string | null>(null);

  const handleRunDiagnostics = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanAlert("Local demonstration only — this page shows fixed sample data and did not query any server.");
      setTimeout(() => setScanAlert(null), 4000);
    }, 1200);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Infrastructure & Subsystem Diagnostics"
        description="Monitor Node 20 runtime memory footprint, WebSocket latency SLAs, garbage collection ticks, and API telemetry."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "System Health" }]}
        actions={
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning Fleet..." : "Run Health Sweep"}</span>
          </button>
        }
      />

      <MockDataBanner kind="mock" />

      {scanAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {scanAlert}</span>
        </div>
      )}

      {/* KPI Stats */}
      {isScanning ? (
        <LoadingState variant="cards" className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Overall Platform Health"
            value="100% OPERATIONAL"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            subtitle="All 5 core engines online"
          />
          <StatCard
            title="Node Heap Allocated"
            value="142 MB"
            icon={<Cpu className="w-5 h-5 text-amber-500" />}
            subtitle="Total Heap: 256 MB"
          />
          <StatCard
            title="Process RSS Resident"
            value="205 MB"
            icon={<HardDrive className="w-5 h-5 text-orange-500" />}
            subtitle="Target < 512 MB"
          />
          <StatCard
            title="Event Loop Delay"
            value="1.2 ms"
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            subtitle="Zero thread starvation"
          />
        </div>
      )}

      {/* Subsystem Health Cards Grid */}
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
          Core Subsystems Fleet Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {SUBSYSTEMS.map((sub) => (
            <div
              key={sub.name}
              className="p-4 sm:p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-bold text-[var(--chrome-ink)] text-xs truncate">
                    {sub.name}
                  </h4>
                  <StatusBadge status={sub.status} size="sm" />
                </div>
                <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed mb-4">
                  {sub.detail}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--chrome-hairline)] flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--chrome-ink-soft)]">Latency: <strong className="text-emerald-500">{sub.latency}</strong></span>
                <span className="text-[var(--chrome-ink-soft)]">SLA: <strong className="text-[var(--chrome-ink)]">{sub.uptime}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Memory AreaChart + API Latency Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Heap Memory Chart */}
        <ChartCard
          title="Node.js Process Memory Footprint"
          subtitle="Heap Used vs RSS Resident Set Size over time"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={MEMORY_CHART_DATA}>
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
        </ChartCard>

        {/* API Endpoint Latency Matrix */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-1">
              Socket & REST Latency Distribution
            </h3>
            <p className="text-xs text-[var(--chrome-ink-soft)] mb-4">
              Percentile response metrics across high-throughput game routes.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[360px] sm:min-w-full">
                <thead>
                  <tr className="border-b border-[var(--chrome-hairline)] text-[var(--chrome-ink-soft)] font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Route</th>
                    <th className="pb-2 text-center">p50</th>
                    <th className="pb-2 text-center">p95</th>
                    <th className="pb-2 text-center">p99</th>
                    <th className="pb-2 text-right">Error Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--chrome-hairline)] font-mono">
                  {API_ENDPOINTS.map((ep) => (
                    <tr key={ep.endpoint}>
                      <td className="py-2.5 font-bold text-[var(--chrome-ink)] font-sans">
                        {ep.endpoint}
                      </td>
                      <td className="py-2.5 text-center text-emerald-500 font-bold">{ep.p50}</td>
                      <td className="py-2.5 text-center text-amber-500 font-bold">{ep.p95}</td>
                      <td className="py-2.5 text-center text-orange-500 font-bold">{ep.p99}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-bold">
                        {ep.errorRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
