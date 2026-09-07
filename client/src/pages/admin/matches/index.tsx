import { useCallback, useEffect, useState } from "react";
import {
  Gamepad2,
  Users,
  CheckCircle2,
  PlugZap,
  Search,
  Filter,
  RefreshCw,
  Trophy,
  History,
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
import DataTable, { type Column } from "../../../components/admin/data-table";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import LoadingState from "../../../components/admin/loading-state";
import RoomTimelineDrawer from "../../../components/admin/RoomTimelineDrawer";
import { operationalFetch, OperationalAuthError } from "../../../lib/operationalApi";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import type { OperationalRoomSummary, OperationalPlayerSummary } from "@shared/operational";
import type { GameKind } from "@shared/types";

/**
 * Real match management.
 *
 * Two genuine sources, deliberately kept apart rather than merged into one
 * invented list:
 *   - LIVE  ← `GET /api/operational/rooms` (`OperationalRoomSummary`), which
 *     already carried richer truth than the old mock did — real seat status,
 *     disconnect-grace countdowns, auto-play takeover state, bot/human split.
 *   - COMPLETED ← `GET /api/admin/dashboard/summary`.`recentMatches`
 *     (`MatchSummaryRecord`) plus its `matchTrend` buckets for the chart.
 *
 * Removed rather than faked: per-seat ping and score, a turn counter, an
 * "avg mesh latency" KPI, desync/anomaly notes, and a "Force Terminate"
 * button — none of these have any server behind them. The seat panel now
 * shows what the server actually knows, which is more operationally useful
 * anyway: who is in disconnect grace, for how long, and whether the server
 * is auto-playing their seat.
 */

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
  kpis: { matchesCompletedToday: number };
  matchTrend: MatchTrendBucket[];
  recentMatches: RecentMatch[];
}

type ViewMode = "live" | "completed";

const LIVE_PHASES = ["all", "lobby", "playing", "finished"] as const;

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

function gameLabel(game: string): string {
  return GAME_DISPLAY_NAMES[game as GameKind] ?? game;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Live room phase → the StatusBadge vocabulary. */
function phaseBadge(room: OperationalRoomSummary): string {
  if (room.phase === "playing") return "active";
  if (room.phase === "lobby") return "pending";
  return "completed";
}

function seatBadge(status: OperationalPlayerSummary["seatStatus"]): string {
  switch (status) {
    case "active":
      return "active";
    case "disconnected_grace":
      return "warning";
    case "auto_playing":
      return "pending";
    case "quit":
      return "failed";
    default:
      return "inactive";
  }
}

export default function AdminMatchesPage() {
  const [view, setView] = useState<ViewMode>("live");
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");

  const [rooms, setRooms] = useState<OperationalRoomSummary[] | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<OperationalRoomSummary | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<RecentMatch | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineCode, setTimelineCode] = useState<string | undefined>(undefined);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const [roomsResult, summaryResult] = await Promise.allSettled([
        operationalFetch<{ rooms: OperationalRoomSummary[] }>("/api/operational/rooms"),
        operationalFetch<DashboardSummary>("/api/admin/dashboard/summary"),
      ]);

      if (roomsResult.status === "fulfilled") setRooms(roomsResult.value.rooms ?? []);
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);

      if (roomsResult.status === "rejected" && summaryResult.status === "rejected") {
        setError(errorMessage(roomsResult.reason));
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

  const allRooms = rooms ?? [];
  const recentMatches = summary?.recentMatches ?? [];

  const term = search.trim().toLowerCase();
  const filteredRooms = allRooms.filter((room) => {
    const matchesSearch =
      !term ||
      room.code.toLowerCase().includes(term) ||
      room.game.toLowerCase().includes(term) ||
      room.host.name.toLowerCase().includes(term);
    const matchesGame = gameFilter === "all" || room.game === gameFilter;
    const matchesPhase = phaseFilter === "all" || room.phase === phaseFilter;
    return matchesSearch && matchesGame && matchesPhase;
  });

  const filteredMatches = recentMatches.filter((match) => {
    const matchesSearch =
      !term ||
      match.roomCode.toLowerCase().includes(term) ||
      match.game.toLowerCase().includes(term);
    const matchesGame = gameFilter === "all" || match.game === gameFilter;
    return matchesSearch && matchesGame;
  });

  const playingCount = allRooms.filter((r) => r.phase === "playing").length;
  const lobbyCount = allRooms.filter((r) => r.phase === "lobby").length;
  const disconnectedSeats = allRooms.reduce((sum, r) => sum + r.disconnectedCount, 0);

  const liveColumns: Column<OperationalRoomSummary>[] = [
    {
      kind: "property",
      key: "code",
      header: "Room",
      render: (row) => (
        <span className="font-mono font-bold text-[var(--chrome-ink)]">{row.code}</span>
      ),
    },
    {
      kind: "property",
      key: "game",
      header: "Game",
      render: (row) => (
        <span className="font-semibold text-[var(--chrome-ink-soft)]">{gameLabel(row.game)}</span>
      ),
    },
    {
      kind: "property",
      key: "lifecycleState",
      header: "State",
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={phaseBadge(row)} label={row.phase} size="sm" />
          <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)]">
            {row.lifecycleState}
          </span>
        </div>
      ),
    },
    {
      kind: "property",
      key: "host",
      header: "Host",
      render: (row) => (
        <div className="min-w-0">
          <span className="text-xs font-bold text-[var(--chrome-ink)] block truncate">
            {row.host.name}
          </span>
          <span className="text-[10px] text-[var(--chrome-ink-soft)]">
            {row.host.isGuest ? "Guest" : "Member"}
            {row.host.isConnected ? "" : row.host.inGrace ? " • in grace" : " • disconnected"}
          </span>
        </div>
      ),
    },
    {
      kind: "property",
      key: "playerCount",
      header: "Seats",
      align: "center",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink)]">
          {row.humanCount}H
          {row.botCount > 0 ? ` + ${row.botCount}B` : ""}
          {row.disconnectedCount > 0 ? (
            <span className="text-rose-500 font-bold"> • {row.disconnectedCount} down</span>
          ) : null}
        </span>
      ),
    },
    {
      kind: "property",
      key: "matchDurationMs",
      header: "Elapsed",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">
          {row.matchStartedAt ? formatDuration(row.matchDurationMs) : "—"}
        </span>
      ),
    },
  ];

  const completedColumns: Column<RecentMatch>[] = [
    {
      kind: "property",
      key: "roomCode",
      header: "Room",
      render: (row) => (
        <span className="font-mono font-bold text-[var(--chrome-ink)]">{row.roomCode}</span>
      ),
    },
    {
      kind: "property",
      key: "game",
      header: "Game",
      render: (row) => (
        <span className="font-semibold text-[var(--chrome-ink-soft)]">{gameLabel(row.game)}</span>
      ),
    },
    {
      kind: "property",
      key: "participants",
      header: "Players",
      align: "center",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink)]">{row.participants.length}</span>
      ),
    },
    {
      kind: "property",
      key: "winnerId",
      header: "Winner",
      render: (row) => {
        const winner = row.participants.find((p) => p.isWinner);
        return (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
            {winner ? (
              <>
                <Trophy className="w-3 h-3" />
                {winner.displayName ?? winner.playerId}
              </>
            ) : (
              <span className="text-[var(--chrome-ink-soft)] font-normal">No winner recorded</span>
            )}
          </span>
        );
      },
    },
    {
      kind: "property",
      key: "durationMs",
      header: "Duration",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">
          {formatDuration(row.durationMs)}
        </span>
      ),
    },
    {
      kind: "property",
      key: "finishedAt",
      header: "Finished",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">
          {formatClock(row.finishedAt)}
        </span>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      id: "game",
      label: "Game",
      value: gameFilter,
      options: [
        { label: "All Games", value: "all" },
        ...(Object.keys(GAME_DISPLAY_NAMES) as GameKind[]).map((g) => ({
          label: GAME_DISPLAY_NAMES[g],
          value: g,
        })),
      ],
      onChange: setGameFilter,
    },
    ...(view === "live"
      ? [
          {
            id: "phase",
            label: "Phase",
            value: phaseFilter,
            options: LIVE_PHASES.map((p) => ({
              label: p === "all" ? "All Phases" : p.charAt(0).toUpperCase() + p.slice(1),
              value: p,
            })),
            onChange: setPhaseFilter,
          } satisfies FilterOption,
        ]
      : []),
  ];

  const isSearchActive = term !== "";
  const isFilterActive = gameFilter !== "all" || phaseFilter !== "all";
  const resetFilters = () => {
    setGameFilter("all");
    setPhaseFilter("all");
  };

  const emptyTitle = error
    ? "Match data unavailable"
    : isSearchActive
      ? "No matches found"
      : isFilterActive
        ? "No matches match selected filters"
        : view === "live"
          ? "No live rooms right now"
          : "No completed matches recorded yet";

  const emptyDesc = error
    ? error
    : isSearchActive
      ? `Nothing matches "${search}". Try a room code, host name, or game.`
      : isFilterActive
        ? "No rooms meet the active filter criteria."
        : view === "live"
          ? "No rooms are currently open on this server process."
          : "Completed matches appear here once players finish a game.";

  const emptyIcon = isSearchActive ? (
    <Search className="w-6 h-6" />
  ) : isFilterActive ? (
    <Filter className="w-6 h-6" />
  ) : (
    <Gamepad2 className="w-6 h-6" />
  );

  const emptyAction = isSearchActive ? (
    <button
      type="button"
      onClick={() => setSearch("")}
      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      Clear Search
    </button>
  ) : isFilterActive ? (
    <button
      type="button"
      onClick={resetFilters}
      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold hover:bg-[var(--chrome-control-hi)] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      Reset Filters
    </button>
  ) : undefined;

  const trendData = (summary?.matchTrend ?? []).map((bucket) => ({
    date: bucket.date.slice(5),
    count: bucket.count,
  }));

  return (
    <AdminLayout>
      <PageHeader
        title="Match Management"
        description="Live rooms from the in-memory RoomManager, and completed matches from the match record."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Matches" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTimelineCode(undefined);
                setTimelineOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Room Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          Match data unavailable: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Rooms In Play"
          value={rooms ? String(playingCount) : "—"}
          icon={<Gamepad2 className="w-5 h-5 text-amber-500" />}
          subtitle={rooms ? `${allRooms.length} room(s) open` : "Rooms unavailable"}
        />
        <StatCard
          title="Lobbies Waiting"
          value={rooms ? String(lobbyCount) : "—"}
          icon={<Users className="w-5 h-5 text-amber-500" />}
          subtitle="Awaiting match start"
        />
        <StatCard
          title="Completed Today"
          value={summary ? String(summary.kpis.matchesCompletedToday) : "—"}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          subtitle="Since 00:00 UTC"
        />
        <StatCard
          title="Seats In Disconnect Grace"
          value={rooms ? String(disconnectedSeats) : "—"}
          icon={<PlugZap className="w-5 h-5 text-orange-500" />}
          subtitle={disconnectedSeats > 0 ? "Awaiting reconnect" : "All seats connected"}
        />
      </div>

      <div className="mb-6">
        <ChartCard
          title="Daily Match Completions"
          subtitle="Completed matches per UTC day, from the match record"
        >
          {trendData.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--chrome-ink-soft)]">
              No completion history available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
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
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Live vs completed are different record types from different sources —
          switching view rather than blending them into one invented row shape. */}
      <div
        role="group"
        aria-label="Choose match view"
        className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] mb-4"
      >
        {(["live", "completed"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            aria-pressed={view === mode}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              view === mode
                ? "bg-amber-500 text-zinc-950 shadow-xs"
                : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
            }`}
          >
            {mode === "live" ? `Live Rooms (${allRooms.length})` : `Recently Completed (${recentMatches.length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by room code, host, or game..."
          ariaLabel="Search matches"
        />
        <FilterBar filters={filters} onReset={resetFilters} />
      </div>

      {isLoading ? (
        <LoadingState variant="table" label="Loading match data" />
      ) : view === "live" ? (
        <DataTable
          columns={liveColumns}
          data={filteredRooms}
          onRowClick={(row) => setSelectedRoom(row)}
          getRowAriaLabel={(row) => `Open details for room ${row.code}`}
          emptyMessage={emptyTitle}
          emptyDescription={emptyDesc}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
        />
      ) : (
        <DataTable
          columns={completedColumns}
          data={filteredMatches}
          onRowClick={(row) => setSelectedMatch(row)}
          getRowAriaLabel={(row) => `Open details for match ${row.roomCode}`}
          emptyMessage={emptyTitle}
          emptyDescription={emptyDesc}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
        />
      )}

      {/* Live room drawer — real seat state, including grace and takeover */}
      <DetailDrawer
        isOpen={Boolean(selectedRoom)}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom ? `Room ${selectedRoom.code} (${gameLabel(selectedRoom.game)})` : "Room"}
        subtitle={
          selectedRoom
            ? `Hosted by ${selectedRoom.host.name} • opened ${formatClock(selectedRoom.createdAt)}`
            : undefined
        }
        badge={
          selectedRoom && (
            <StatusBadge status={phaseBadge(selectedRoom)} label={selectedRoom.lifecycleState} size="sm" />
          )
        }
        footer={
          selectedRoom && (
            <button
              type="button"
              onClick={() => {
                setTimelineCode(selectedRoom.code);
                setTimelineOpen(true);
              }}
              className="w-full h-10 rounded-xl bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              View Full Event Timeline
            </button>
          )
        }
      >
        {selectedRoom && (
          <div className="space-y-6">
            <InfoCard
              title="Room State"
              fields={[
                { label: "Room Code", value: selectedRoom.code, isMono: true },
                { label: "Lifecycle", value: selectedRoom.lifecycleState, isMono: true },
                { label: "Phase", value: selectedRoom.phase },
                {
                  label: "Elapsed",
                  value: selectedRoom.matchStartedAt ? formatDuration(selectedRoom.matchDurationMs) : "Not started",
                },
                { label: "Humans / Bots", value: `${selectedRoom.humanCount} / ${selectedRoom.botCount}` },
                { label: "Spectators", value: selectedRoom.spectatorCount },
                { label: "Disconnected Seats", value: selectedRoom.disconnectedCount },
                { label: "Server Takeover Active", value: selectedRoom.hasTakeover ? "Yes" : "No" },
                { label: "Sealed", value: selectedRoom.sealed ? "Yes" : "No" },
              ]}
            />

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-3">
                Seats ({selectedRoom.players.length})
              </h4>
              <div className="space-y-2">
                {selectedRoom.players.map((seat, index) => (
                  <div
                    key={seat.id}
                    className="p-3 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/30 shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--chrome-ink)]">{seat.name}</span>
                          {seat.isHost && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 rounded">
                              HOST
                            </span>
                          )}
                          {seat.playerType === "bot" && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 rounded">
                              BOT
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--chrome-ink-soft)] font-mono block">
                          {seat.accountType}
                          {seat.isAutoPlaying
                            ? ` • auto-playing (${seat.autoPlayReason ?? "unknown"}), ${seat.autoTurnsPlayed}${seat.autoTurnCap ? `/${seat.autoTurnCap}` : ""} turns`
                            : ""}
                          {seat.remainingGraceMs != null
                            ? ` • ${Math.ceil(seat.remainingGraceMs / 1000)}s grace left`
                            : ""}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={seatBadge(seat.seatStatus)} label={seat.seatStatus} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Completed match drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        title={selectedMatch ? `Match ${selectedMatch.roomCode} (${gameLabel(selectedMatch.game)})` : "Match"}
        subtitle={selectedMatch ? `Finished ${new Date(selectedMatch.finishedAt).toLocaleString()}` : undefined}
      >
        {selectedMatch && (
          <div className="space-y-6">
            <InfoCard
              title="Match Record"
              fields={[
                { label: "Match ID", value: selectedMatch.id, isMono: true },
                { label: "Room Code", value: selectedMatch.roomCode, isMono: true },
                { label: "Duration", value: formatDuration(selectedMatch.durationMs) },
                { label: "Participants", value: selectedMatch.participants.length },
              ]}
            />

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-3">
                Participants ({selectedMatch.participants.length})
              </h4>
              <div className="space-y-2">
                {selectedMatch.participants.map((participant) => (
                  <div
                    key={participant.playerId}
                    className="p-3 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--chrome-ink)] block truncate">
                        {participant.displayName ?? participant.playerId}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)] truncate block">
                        {participant.playerId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {participant.isBot && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 rounded">
                          BOT
                        </span>
                      )}
                      {participant.isWinner && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 rounded inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> WINNER
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      <RoomTimelineDrawer
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        initialCode={timelineCode}
      />
    </AdminLayout>
  );
}
