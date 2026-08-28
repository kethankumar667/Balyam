import { useCallback, useEffect, useState } from "react";
import { Users, Gamepad2, Activity, UserCheck, RefreshCw, Radio, Bot, Trash2, TrendingUp } from "lucide-react";
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
import ChartCard from "../../../components/admin/chart-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import StatusBadge from "../../../components/admin/status-badge";
import SectionHeader from "../../../components/admin/section-header";
import EmptyState from "../../../components/admin/empty-state";
import { operationalFetch, OperationalAuthError } from "../../../lib/operationalApi";

/**
 * Dashboard DB Integration — Phase 1.
 *
 * ── Three independent data sources, three independent failure states ─────
 * KPIs/trend/recent-matches come from Supabase (`/api/admin/dashboard/summary`).
 * Live rooms and the derived Active Matches / Connected Players numbers come
 * from `RoomManager`, unchanged (`/api/operational/rooms`). Server health is
 * `/api/operational/health`, also unchanged. Each is fetched and rendered on
 * its own — a Supabase outage must not blank the live-rooms table, and a
 * rooms-endpoint hiccup must not blank the KPI cards. That independence is
 * what "partial dataset" means on this page: some sections real, one
 * unavailable, never zeros standing in for either.
 */

interface RoomSummary {
  code: string;
  game: string;
  lifecycleState: string;
  playerCount: number;
  humanCount: number;
  hasTakeover: boolean;
}

interface MatchTrendBucket {
  date: string;
  count: number;
}

interface MatchParticipant {
  playerId: string;
  displayName?: string | null;
  isWinner: boolean;
  isBot: boolean;
}

interface RecentMatch {
  id: string;
  roomCode: string;
  game: string;
  finishedAt: number;
  durationMs: number;
  winnerId?: string | null;
  participants: MatchParticipant[];
}

interface DashboardSummary {
  progression: { kind: "memory" | "supabase"; durable: boolean; reachable: boolean; detail: string };
  kpis: {
    totalRegisteredUsers: number;
    activeUsersLast24h: number;
    matchesCompletedToday: number;
  };
  matchTrend: MatchTrendBucket[];
  recentMatches: RecentMatch[];
}

interface HealthReport {
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  uptimeSec: number;
}

const LIFECYCLE_LABEL: Record<string, string> = {
  CREATED: "created",
  WAITING_FOR_PLAYERS: "waiting",
  READY_CHECK: "ready check",
  STARTING: "starting",
  IN_PROGRESS: "playing",
  RECOVERING: "recovering",
  PAUSED: "paused",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
  CLOSED: "closed",
};

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

/**
 * A 200 response is not the same claim as "this is a `DashboardSummary`". A
 * shape that doesn't hold `kpis`/`matchTrend`/`recentMatches` gets treated as
 * a failure rather than rendered with holes — `summary?.kpis.x` would throw
 * on a response missing `kpis` entirely, and the fallback for a throw inside
 * a render is a blank page, not an honest "unavailable" card.
 */
function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DashboardSummary>;
  return Boolean(v.kpis) && Array.isArray(v.matchTrend) && Array.isArray(v.recentMatches) && Boolean(v.progression);
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setSummaryLoading(true);
    setRoomsLoading(true);

    await Promise.all([
      operationalFetch<DashboardSummary>("/api/admin/dashboard/summary")
        .then((data) => {
          if (!isDashboardSummary(data)) {
            throw new Error("Server returned an unexpected response shape.");
          }
          setSummary(data);
          setSummaryError(null);
        })
        .catch((err) => {
          setSummary(null);
          setSummaryError(errorMessage(err));
        })
        .finally(() => setSummaryLoading(false)),

      operationalFetch<{ rooms: RoomSummary[] }>("/api/operational/rooms")
        .then((data) => {
          if (!Array.isArray(data?.rooms)) {
            throw new Error("Server returned an unexpected response shape.");
          }
          setRooms(data.rooms);
          setRoomsError(null);
        })
        .catch((err) => {
          setRooms(null);
          setRoomsError(errorMessage(err));
        })
        .finally(() => setRoomsLoading(false)),

      operationalFetch<HealthReport>("/api/operational/health")
        .then((data) => {
          setHealth(data);
          setHealthError(null);
        })
        .catch((err) => {
          setHealth(null);
          setHealthError(errorMessage(err));
        }),
    ]);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const showActionToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loading = summaryLoading || roomsLoading;

  // "Never replace failure with Healthy" — a health-fetch failure reads as
  // critical, not as the default. A genuinely healthy server has to say so.
  const systemStatus: "healthy" | "warning" | "critical" = healthError
    ? "critical"
    : health
    ? (health.status.toLowerCase() as "healthy" | "warning" | "critical")
    : "warning";

  // Real, derived from the same rooms fetch the Live Rooms table uses — not a
  // separate fabricated number.
  const activeMatchesCount = rooms?.filter((r) => r.lifecycleState === "IN_PROGRESS").length ?? null;
  const connectedPlayers = rooms?.reduce((sum, r) => sum + r.playerCount, 0) ?? undefined;

  const roomColumns: Column<RoomSummary>[] = [
    {
      kind: "property",
      key: "code",
      header: "Room Code",
      render: (row) => (
        <span className="font-mono font-bold text-amber-500 dark:text-amber-400">{row.code}</span>
      ),
    },
    {
      kind: "property",
      key: "game",
      header: "Game",
      render: (row) => <span className="font-semibold text-[var(--chrome-ink)]">{row.game}</span>,
    },
    {
      kind: "property",
      key: "playerCount",
      header: "Players",
      align: "center",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] text-xs font-bold border border-[var(--chrome-border)]">
          {row.humanCount}
          {row.playerCount !== row.humanCount ? ` (+${row.playerCount - row.humanCount} bot)` : ""}
        </span>
      ),
    },
    {
      kind: "property",
      key: "lifecycleState",
      header: "Phase",
      render: (row) => (
        <StatusBadge
          status={row.lifecycleState === "IN_PROGRESS" ? "active" : "pending"}
          label={LIFECYCLE_LABEL[row.lifecycleState] ?? row.lifecycleState.toLowerCase()}
          size="sm"
        />
      ),
    },
    {
      kind: "property",
      key: "hasTakeover",
      header: "Takeover",
      align: "right",
      render: (row) =>
        row.hasTakeover ? (
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Active</span>
        ) : (
          <span className="text-[11px] text-[var(--chrome-ink-soft)]">—</span>
        ),
    },
  ];

  const recentMatchColumns: Column<RecentMatch>[] = [
    {
      kind: "property",
      key: "roomCode",
      header: "Room Code",
      render: (row) => (
        <span className="font-mono font-bold text-amber-500 dark:text-amber-400">{row.roomCode}</span>
      ),
    },
    {
      kind: "property",
      key: "game",
      header: "Game",
      render: (row) => <span className="font-semibold text-[var(--chrome-ink)] capitalize">{row.game}</span>,
    },
    {
      kind: "property",
      key: "participants",
      header: "Winner",
      render: (row) => {
        const winner = row.participants.find((p) => p.isWinner);
        return (
          <span className="text-[var(--chrome-ink-soft)]">
            {winner?.displayName ?? (row.winnerId ? row.winnerId : "—")}
          </span>
        );
      },
    },
    {
      // Computed: RecentMatch has no `participantCount` field — this
      // renders `participants.length`. A property column with
      // `key: "participantCount"` would previously have silently rendered
      // blank forever (no such property exists); now it fails to compile.
      kind: "computed",
      key: "participantCount",
      header: "Players",
      align: "center",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] text-xs font-bold border border-[var(--chrome-border)]">
          {row.participants.length}
        </span>
      ),
    },
    {
      kind: "property",
      key: "durationMs",
      header: "Duration",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">{formatDuration(row.durationMs)}</span>
      ),
    },
    {
      kind: "property",
      key: "finishedAt",
      header: "Finished",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">
          {new Date(row.finishedAt).toLocaleString()}
        </span>
      ),
    },
  ];

  // Real, from the same rooms fetch — replaces what used to be a fabricated
  // "Catalog Popularity" bar chart with an identical-looking one backed by
  // the actual live room list.
  const liveRoomsByGame = (() => {
    if (!rooms) return [];
    const counts = new Map<string, number>();
    for (const r of rooms) counts.set(r.game, (counts.get(r.game) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, sessions]) => ({ name, sessions }))
      .sort((a, b) => b.sessions - a.sessions);
  })();

  return (
    <AdminLayout
      onRefresh={fetchAll}
      isRefreshing={loading}
      systemStatus={systemStatus}
      onlineSockets={connectedPlayers}
    >
      <PageHeader
        title="Command Center Overview"
        description="Realtime overview of active matches and durable platform metrics, backed by Supabase."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Telemetry</span>
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {summaryError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          Supabase-backed metrics are unavailable right now: {summaryError} The Live Rooms and Server Health
          sections below are unaffected — they do not depend on Supabase.
        </div>
      )}
      {!summaryError && summary && !summary.progression.durable && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
          Progression is running in memory, not Supabase ({summary.progression.detail}). The numbers below are
          real for this process, but will not survive a restart.
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Registered Users"
          value={summaryError ? "—" : summary?.kpis.totalRegisteredUsers ?? "—"}
          icon={<Users className="w-5 h-5" />}
          subtitle={summaryError ? "Unavailable" : "Real accounts, not guests"}
          loading={summaryLoading}
        />
        <StatCard
          title="Active Users (24h)"
          value={summaryError ? "—" : summary?.kpis.activeUsersLast24h ?? "—"}
          icon={<UserCheck className="w-5 h-5" />}
          subtitle={summaryError ? "Unavailable" : "Members and guests"}
          loading={summaryLoading}
        />
        <StatCard
          title="Matches Completed Today"
          value={summaryError ? "—" : summary?.kpis.matchesCompletedToday ?? "—"}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={summaryError ? "Unavailable" : "Since 00:00 UTC"}
          loading={summaryLoading}
        />
        <StatCard
          title="Active Matches"
          value={roomsError ? "—" : activeMatchesCount ?? "—"}
          icon={<Gamepad2 className="w-5 h-5" />}
          subtitle={roomsError ? "Unavailable" : "Rooms in progress right now"}
          loading={roomsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="lg:col-span-2">
          <ChartCard
            title="Completed Matches Trend"
            subtitle="Matches finished per day, trailing 7 days (UTC)"
            timeRanges={[]}
          >
            {summaryError ? (
              <EmptyState
                title="Trend unavailable"
                description={summaryError}
                icon={<TrendingUp className="w-6 h-6" />}
              />
            ) : summary && summary.matchTrend.every((b) => b.count === 0) ? (
              <EmptyState
                title="No completed matches yet"
                description="Once matches finish, this chart fills in day by day."
                icon={<TrendingUp className="w-6 h-6" />}
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={summary?.matchTrend ?? []}>
                  <defs>
                    <linearGradient id="colorMatchTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#A17C4E" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#7A5E45" fontSize={11} />
                  <YAxis stroke="#7A5E45" fontSize={11} allowDecimals={false} />
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
                    dataKey="count"
                    name="Completed Matches"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMatchTrend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div>
          <ChartCard title="Live Rooms by Game" subtitle="Right now, from active rooms" timeRanges={[]}>
            {roomsError ? (
              <EmptyState
                title="Unavailable"
                description={roomsError}
                icon={<Gamepad2 className="w-6 h-6" />}
              />
            ) : liveRoomsByGame.length === 0 ? (
              <EmptyState
                title="No active rooms"
                description="Nobody is currently in a match."
                icon={<Gamepad2 className="w-6 h-6" />}
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={liveRoomsByGame} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#A17C4E" opacity={0.15} />
                  <XAxis type="number" stroke="#7A5E45" fontSize={10} allowDecimals={false} />
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
            )}
          </ChartCard>
        </div>
      </div>

      {/* Quick Operations Row — unchanged: every button already discloses,
          at the moment it is clicked, that it performs no real action. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <button
          type="button"
          onClick={() => showActionToast("Local demonstration only — no broadcast was sent to any players.")}
          className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs text-left hover:border-amber-500/40 transition-colors cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xs font-bold text-[var(--chrome-ink)]">Broadcast</span>
        </button>
        <button
          type="button"
          onClick={() => showActionToast("Local demonstration only — no rooms were reclaimed on any server.")}
          className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs text-left hover:border-amber-500/40 transition-colors cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xs font-bold text-[var(--chrome-ink)]">Clean Rooms</span>
        </button>
        <button
          type="button"
          onClick={() => showActionToast("Local demonstration only — no bot workers were restarted.")}
          className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs text-left hover:border-amber-500/40 transition-colors cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xs font-bold text-[var(--chrome-ink)]">Restart Bots</span>
        </button>
        <button
          type="button"
          onClick={() => showActionToast("Local demonstration only — no audit report was generated.")}
          className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs text-left hover:border-amber-500/40 transition-colors cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-xs font-bold text-[var(--chrome-ink)]">Audit Run</span>
        </button>
      </div>

      {/* Live Rooms */}
      <div className="space-y-3 mb-6">
        <SectionHeader
          title="Live Rooms"
          badge={
            !roomsError && rooms ? (
              <span className="text-xs text-[var(--chrome-ink-soft)] font-medium">({rooms.length} active)</span>
            ) : undefined
          }
        />
        {roomsError ? (
          <EmptyState
            title="Live rooms unavailable"
            description={roomsError}
            icon={<Gamepad2 className="w-6 h-6" />}
          />
        ) : (
          <DataTable
            columns={roomColumns}
            data={rooms ?? []}
            loading={roomsLoading}
            emptyMessage="No active rooms"
            emptyDescription="There are currently no active multiplayer sessions running in the lounge."
            emptyIcon={<Gamepad2 className="w-6 h-6" />}
          />
        )}
      </div>

      {/* Recent Matches */}
      <div className="space-y-3">
        <SectionHeader title="Recent Matches" />
        {summaryError ? (
          <EmptyState
            title="Recent matches unavailable"
            description={summaryError}
            icon={<Activity className="w-6 h-6" />}
          />
        ) : (
          <DataTable
            columns={recentMatchColumns}
            data={summary?.recentMatches ?? []}
            loading={summaryLoading}
            emptyMessage="No matches recorded yet"
            emptyDescription="Finished matches will appear here as players complete them."
            emptyIcon={<Activity className="w-6 h-6" />}
          />
        )}
      </div>
    </AdminLayout>
  );
}
