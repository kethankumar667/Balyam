import { useState } from "react";
import {
  Gamepad2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Wifi,
  Trash2,
  RefreshCw,
  Zap,
  Search,
  Filter,
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
import ChartCard from "../../../components/admin/chart-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import StatusBadge from "../../../components/admin/status-badge";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import MockDataBanner from "../../../components/admin/mock-data-banner";

interface MatchItem extends Record<string, unknown> {
  id: string;
  code: string;
  game: string;
  hostName: string;
  playersCount: number;
  maxPlayers: number;
  status: "playing" | "lobby" | "finished" | "abandoned";
  duration: string;
  turnCount: number;
  startedAt: string;
  avgLatencyMs: number;
  seats: Array<{ seatIndex: number; name: string; score: number; isBot: boolean; ping: number }>;
}

const MOCK_MATCH_HISTORY_CHART = [
  { time: "18:00", active: 22, completed: 48 },
  { time: "19:00", active: 28, completed: 62 },
  { time: "20:00", active: 34, completed: 85 },
  { time: "21:00", active: 42, completed: 110 },
  { time: "22:00", active: 38, completed: 95 },
  { time: "Now", active: 18, completed: 44 },
];

const MOCK_MATCHES: MatchItem[] = [
  {
    id: "m-001",
    code: "LU7890",
    game: "Ludo",
    hostName: "Rahul Sharma",
    playersCount: 4,
    maxPlayers: 4,
    status: "playing",
    duration: "14m 20s",
    turnCount: 48,
    startedAt: "22:02:15",
    avgLatencyMs: 34,
    seats: [
      { seatIndex: 0, name: "Rahul Sharma", score: 3, isBot: false, ping: 28 },
      { seatIndex: 1, name: "Priya Patel", score: 2, isBot: false, ping: 32 },
      { seatIndex: 2, name: "Bot Champ", score: 1, isBot: true, ping: 5 },
      { seatIndex: 3, name: "Sir Krishna", score: 4, isBot: false, ping: 42 },
    ],
  },
  {
    id: "m-002",
    code: "RM4521",
    game: "Rummy",
    hostName: "Master Ravi",
    playersCount: 6,
    maxPlayers: 6,
    status: "playing",
    duration: "09m 45s",
    turnCount: 22,
    startedAt: "22:06:50",
    avgLatencyMs: 28,
    seats: [
      { seatIndex: 0, name: "Master Ravi", score: 0, isBot: false, ping: 24 },
      { seatIndex: 1, name: "Teacher Padma", score: 12, isBot: false, ping: 30 },
      { seatIndex: 2, name: "Bot Alpha", score: 45, isBot: true, ping: 5 },
      { seatIndex: 3, name: "Bot Beta", score: 80, isBot: true, ping: 5 },
      { seatIndex: 4, name: "Aditi Sen", score: 18, isBot: false, ping: 35 },
      { seatIndex: 5, name: "Kavita Rao", score: 24, isBot: false, ping: 26 },
    ],
  },
  {
    id: "m-003",
    code: "WB1092",
    game: "Word Building",
    hostName: "Kethan Kumar",
    playersCount: 2,
    maxPlayers: 4,
    status: "playing",
    duration: "05m 12s",
    turnCount: 16,
    startedAt: "22:11:23",
    avgLatencyMs: 19,
    seats: [
      { seatIndex: 0, name: "Kethan Kumar", score: 18, isBot: false, ping: 18 },
      { seatIndex: 1, name: "Miss Lakshmi", score: 15, isBot: false, ping: 21 },
    ],
  },
  {
    id: "m-004",
    code: "DB3311",
    game: "Dots & Boxes",
    hostName: "Arjun Das",
    playersCount: 3,
    maxPlayers: 4,
    status: "lobby",
    duration: "01m 40s",
    turnCount: 0,
    startedAt: "22:14:55",
    avgLatencyMs: 22,
    seats: [
      { seatIndex: 0, name: "Arjun Das", score: 0, isBot: false, ping: 20 },
      { seatIndex: 1, name: "Vikram Malhotra", score: 0, isBot: false, ping: 24 },
      { seatIndex: 2, name: "Sneha Reddy", score: 0, isBot: false, ping: 22 },
    ],
  },
  {
    id: "m-005",
    code: "UN9902",
    game: "UNO",
    hostName: "Tanmay Joshi",
    playersCount: 5,
    maxPlayers: 6,
    status: "playing",
    duration: "21m 10s",
    turnCount: 65,
    startedAt: "21:55:25",
    avgLatencyMs: 41,
    seats: [
      { seatIndex: 0, name: "Tanmay Joshi", score: 2, isBot: false, ping: 38 },
      { seatIndex: 1, name: "Swathi Pillai", score: 4, isBot: false, ping: 44 },
      { seatIndex: 2, name: "Deepak Choudhury", score: 1, isBot: false, ping: 40 },
      { seatIndex: 3, name: "Meera Nair", score: 3, isBot: false, ping: 39 },
      { seatIndex: 4, name: "Bot Charlie", score: 5, isBot: true, ping: 5 },
    ],
  },
  {
    id: "m-006",
    code: "SL2201",
    game: "Snakes & Ladders",
    hostName: "Harish Gupta",
    playersCount: 4,
    maxPlayers: 4,
    status: "finished",
    duration: "16m 30s",
    turnCount: 52,
    startedAt: "21:40:00",
    avgLatencyMs: 30,
    seats: [
      { seatIndex: 0, name: "Harish Gupta", score: 100, isBot: false, ping: 28 },
      { seatIndex: 1, name: "Divya Balan", score: 84, isBot: false, ping: 31 },
      { seatIndex: 2, name: "Suresh Menon", score: 62, isBot: false, ping: 33 },
      { seatIndex: 3, name: "Rohan Kapoor", score: 45, isBot: false, ping: 29 },
    ],
  },
];

export default function AdminMatchesPage() {
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [matchesList, setMatchesList] = useState<MatchItem[]>(MOCK_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);

  const filteredMatches = matchesList.filter((m) => {
    const matchesSearch =
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.game.toLowerCase().includes(search.toLowerCase()) ||
      m.hostName.toLowerCase().includes(search.toLowerCase());
    const matchesGame = gameFilter === "all" || m.game === gameFilter;
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesGame && matchesStatus;
  });

  const handleTerminateMatch = (match: MatchItem) => {
    setMatchesList((prev) =>
      prev.map((m) => (m.id === match.id ? { ...m, status: "abandoned" } : m))
    );
    setSelectedMatch(null);
    setAlertNotice(
      `Preview updated locally — Match #${match.code} would be force-terminated. No changes were sent to the server.`,
    );
    setTimeout(() => setAlertNotice(null), 3000);
  };

  const columns: Column<MatchItem>[] = [
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
      header: "Game Title",
      render: (row) => <span className="font-bold text-[var(--chrome-ink)]">{row.game}</span>,
    },
    {
      key: "hostName",
      header: "Room Host",
      render: (row) => <span className="text-[var(--chrome-ink-soft)]">{row.hostName}</span>,
    },
    {
      key: "playersCount",
      header: "Occupancy",
      align: "center",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] font-mono text-xs font-bold border border-[var(--chrome-border)]">
          {row.playersCount} / {row.maxPlayers}
        </span>
      ),
    },
    {
      key: "status",
      header: "Match Status",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "playing"
              ? "active"
              : row.status === "lobby"
              ? "pending"
              : row.status === "finished"
              ? "completed"
              : "critical"
          }
          label={row.status}
          size="sm"
        />
      ),
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      render: (row) => <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">{row.duration}</span>,
    },
    {
      key: "avgLatencyMs",
      header: "Mesh Ping",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
          {row.avgLatencyMs} ms
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
        { label: "Ludo", value: "Ludo" },
        { label: "Rummy", value: "Rummy" },
        { label: "Word Building", value: "Word Building" },
        { label: "Dots & Boxes", value: "Dots & Boxes" },
        { label: "UNO", value: "UNO" },
        { label: "Snakes & Ladders", value: "Snakes & Ladders" },
      ],
      onChange: setGameFilter,
    },
    {
      id: "status",
      label: "Status",
      value: statusFilter,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Playing", value: "playing" },
        { label: "Lobby", value: "lobby" },
        { label: "Finished", value: "finished" },
        { label: "Abandoned", value: "abandoned" },
      ],
      onChange: setStatusFilter,
    },
  ];

  const isSearchActive = search.trim() !== "";
  const isFilterActive = gameFilter !== "all" || statusFilter !== "all";

  const emptyTitle = matchesList.length === 0
    ? "No match rooms recorded"
    : isSearchActive
    ? "No matching rooms found"
    : isFilterActive
    ? "No matches meet selected filters"
    : "No matches found";

  const emptyDesc = matchesList.length === 0
    ? "There are currently no active or recent multiplayer game rooms in the engine."
    : isSearchActive
    ? `No matches match "${search}". Try searching with a different room code, host, or game.`
    : isFilterActive
    ? "No rooms meet the active game and status filter criteria."
    : "There are currently no items matching your criteria.";

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
      className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
    >
      Clear Search
    </button>
  ) : isFilterActive ? (
    <button
      type="button"
      onClick={() => {
        setGameFilter("all");
        setStatusFilter("all");
      }}
      className="px-3.5 py-1.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold hover:bg-[var(--chrome-control-hi)] transition-colors cursor-pointer"
    >
      Reset Filters
    </button>
  ) : undefined;

  return (
    <AdminLayout>
      <PageHeader
        title="Live Match Management"
        description="Monitor active multiplayer sessions, inspect in-memory seat states, and arbitrate game engine state machines."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Matches" }]}
      />

      <MockDataBanner kind="mock" />

      {alertNotice && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {alertNotice}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Active Match Rooms"
          value="18"
          icon={<Gamepad2 className="w-5 h-5 text-amber-500" />}
          subtitle="In-memory RoomManager"
        />
        <StatCard
          title="Lobby Gatherings"
          value="4"
          icon={<Users className="w-5 h-5 text-amber-500" />}
          subtitle="Awaiting match start"
        />
        <StatCard
          title="Completed Today"
          value="444"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          trend={{ value: 18.4, direction: "up", label: "vs yesterday" }}
        />
        <StatCard
          title="Avg Latency (Mesh)"
          value="26 ms"
          icon={<Wifi className="w-5 h-5 text-orange-500" />}
          subtitle="STUN relay verified"
        />
      </div>

      {/* Chart: Match Throughput */}
      <div className="mb-6">
        <ChartCard
          title="Hourly Match Completion Throughput"
          subtitle="Finished vs active match volume over the last 6 hours"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_MATCH_HISTORY_CHART}>
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
                dataKey="completed"
                name="Completed Matches"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="active"
                name="Active Concurrency"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by room code, host, or game title..."
        />
        <FilterBar
          filters={filters}
          onReset={() => {
            setGameFilter("all");
            setStatusFilter("all");
          }}
        />
      </div>

      {/* Matches Data Table */}
      <DataTable
        columns={columns}
        data={filteredMatches}
        onRowClick={(row) => setSelectedMatch(row)}
        emptyMessage={emptyTitle}
        emptyDescription={emptyDesc}
        emptyIcon={emptyIcon}
        emptyAction={emptyAction}
      />

      {/* Match Details Slide-Over Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        title={`Room #${selectedMatch?.code} (${selectedMatch?.game})`}
        subtitle={`Hosted by ${selectedMatch?.hostName} • Started at ${selectedMatch?.startedAt}`}
        badge={
          selectedMatch && (
            <StatusBadge
              status={selectedMatch.status === "playing" ? "active" : "pending"}
              label={selectedMatch.status}
              size="sm"
            />
          )
        }
        footer={
          selectedMatch && selectedMatch.status === "playing" && (
            <button
              type="button"
              onClick={() => handleTerminateMatch(selectedMatch)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Force Terminate Match</span>
            </button>
          )
        }
      >
        {selectedMatch && (
          <div className="space-y-6">
            <InfoCard
              title="Game Engine Telemetry"
              fields={[
                { label: "Room ID", value: selectedMatch.id, isMono: true },
                { label: "Turn Counter", value: `${selectedMatch.turnCount} turns` },
                { label: "Elapsed Time", value: selectedMatch.duration },
                { label: "Average Ping", value: `${selectedMatch.avgLatencyMs} ms`, isMono: true },
              ]}
            />

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] mb-3">
                Occupied Seat Allocation ({selectedMatch.seats.length} Seats)
              </h4>
              <div className="space-y-2">
                {selectedMatch.seats.map((seat) => (
                  <div
                    key={seat.seatIndex}
                    className="p-3 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/30">
                        #{seat.seatIndex + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--chrome-ink)]">
                            {seat.name}
                          </span>
                          {seat.isBot && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-1.5 rounded">
                              AI BOT
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--chrome-ink-soft)] font-mono">
                          Ping: {seat.ping}ms
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-500 dark:text-amber-400 font-mono">
                        {seat.score} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
