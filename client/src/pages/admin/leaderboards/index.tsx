import { useState } from "react";
import {
  Trophy,
  Crown,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Award,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import MockDataBanner from "../../../components/admin/mock-data-banner";

interface LeaderboardPlayer {
  rank: number;
  prevRank: number;
  id: string;
  name: string;
  avatar: string;
  game: string;
  eloRating: number;
  wins: number;
  losses: number;
  winRate: string;
  longestStreak: number;
  season: string;
  isVerified: boolean;
}

const MOCK_LEADERBOARD: LeaderboardPlayer[] = [
  {
    rank: 1,
    prevRank: 1,
    id: "p-01",
    name: "Kethan Kumar",
    avatar: "👑",
    game: "Word Building",
    eloRating: 3250,
    wins: 284,
    losses: 22,
    winRate: "92.8%",
    longestStreak: 28,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 2,
    prevRank: 3,
    id: "p-02",
    name: "Swathi Pillai",
    avatar: "🥈",
    game: "Word Building",
    eloRating: 3040,
    wins: 218,
    losses: 39,
    winRate: "84.8%",
    longestStreak: 16,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 3,
    prevRank: 2,
    id: "p-03",
    name: "Meera Nair",
    avatar: "🥉",
    game: "Ludo",
    eloRating: 2890,
    wins: 197,
    losses: 45,
    winRate: "81.4%",
    longestStreak: 12,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 4,
    prevRank: 4,
    id: "p-04",
    name: "Rahul Verma",
    avatar: "⚡",
    game: "Ludo",
    eloRating: 2450,
    wins: 142,
    losses: 61,
    winRate: "69.9%",
    longestStreak: 8,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 4,
    prevRank: 8,
    id: "p-05",
    name: "Sir Krishna (Tied #4)",
    avatar: "🎯",
    game: "Ludo",
    eloRating: 2450,
    wins: 140,
    losses: 59,
    winRate: "70.3%",
    longestStreak: 9,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 6,
    prevRank: 2,
    id: "p-06",
    name: "Miss Lakshmi (Slump)",
    avatar: "📉",
    game: "UNO",
    eloRating: 2180,
    wins: 110,
    losses: 84,
    winRate: "56.7%",
    longestStreak: 4,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 7,
    prevRank: 5,
    id: "p-07",
    name: "Tanmay Joshi",
    avatar: "🔥",
    game: "Rummy",
    eloRating: 1990,
    wins: 81,
    losses: 66,
    winRate: "55.1%",
    longestStreak: 6,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 8,
    prevRank: 9,
    id: "p-08",
    name: "Divya Balan",
    avatar: "🌟",
    game: "Word Building",
    eloRating: 1860,
    wins: 78,
    losses: 44,
    winRate: "63.9%",
    longestStreak: 5,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 9,
    prevRank: 7,
    id: "p-09",
    name: "Arjun Das",
    avatar: "🚀",
    game: "Dots & Boxes",
    eloRating: 1720,
    wins: 85,
    losses: 52,
    winRate: "62.0%",
    longestStreak: 7,
    season: "Season 2",
    isVerified: true,
  },
  {
    rank: 10,
    prevRank: 10,
    id: "p-10",
    name: "Guest_9921 (Provisional 🔰)",
    avatar: "🌱",
    game: "RPS",
    eloRating: 1200,
    wins: 3,
    losses: 1,
    winRate: "75.0%",
    longestStreak: 3,
    season: "Season 2",
    isVerified: false,
  },
];

export default function AdminLeaderboardsPage() {
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardPlayer | null>(null);
  const [refreshAlert, setRefreshAlert] = useState<string | null>(null);

  const filteredPlayers = MOCK_LEADERBOARD.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesGame = gameFilter === "all" || p.game === gameFilter;
    const matchesSeason = seasonFilter === "all" || p.season === seasonFilter;
    return matchesSearch && matchesGame && matchesSeason;
  });

  const top3 = MOCK_LEADERBOARD.slice(0, 3);

  const handleRecalculateElo = () => {
    setRefreshAlert("Local demonstration only — no recalculation was queued on any server.");
    setTimeout(() => setRefreshAlert(null), 3000);
  };

  const columns: Column<LeaderboardPlayer>[] = [
    {
      kind: "property",
      key: "rank",
      header: "Rank",
      align: "center",
      render: (row) => {
        const diff = row.prevRank - row.rank;
        return (
          <div className="flex items-center justify-center gap-1.5 font-mono">
            <span
              className={`font-black text-sm w-6 text-center ${
                row.rank === 1
                  ? "text-amber-500"
                  : row.rank === 2
                  ? "text-slate-400"
                  : row.rank === 3
                  ? "text-amber-700"
                  : "text-slate-700 dark:text-zinc-300"
              }`}
            >
              #{row.rank}
            </span>
            {diff > 0 ? (
              <span className="text-[11px] font-bold text-emerald-500 flex items-center">
                <TrendingUp className="w-3 h-3" /> +{diff}
              </span>
            ) : diff < 0 ? (
              <span className="text-[11px] font-bold text-rose-500 flex items-center">
                <TrendingDown className="w-3 h-3" /> {diff}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center">
                <Minus className="w-3 h-3" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      kind: "property",
      key: "name",
      header: "Player Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="text-xl">{row.avatar}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--chrome-ink)]">{row.name}</span>
            {row.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
          </div>
        </div>
      ),
    },
    {
      kind: "property",
      key: "game",
      header: "Game Title",
      render: (row) => <span className="font-semibold text-[var(--chrome-ink-soft)]">{row.game}</span>,
    },
    {
      kind: "property",
      key: "eloRating",
      header: "ELO Rating",
      align: "right",
      render: (row) => (
        <span className="font-mono font-black text-amber-500 dark:text-amber-400 text-sm">
          {row.eloRating}
        </span>
      ),
    },
    {
      kind: "property",
      key: "winRate",
      header: "Win Rate",
      align: "right",
      render: (row) => (
        <div className="text-right">
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
            {row.winRate}
          </span>
          <div className="text-[10px] text-[var(--chrome-ink-soft)] font-mono">
            {row.wins}W / {row.losses}L
          </div>
        </div>
      ),
    },
    {
      kind: "property",
      key: "longestStreak",
      header: "Win Streak",
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs">
          <Flame className="w-3 h-3 text-amber-500" /> {row.longestStreak}
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
        { label: "Word Building", value: "Word Building" },
        { label: "Ludo", value: "Ludo" },
        { label: "Rummy", value: "Rummy" },
        { label: "UNO", value: "UNO" },
        { label: "Dots & Boxes", value: "Dots & Boxes" },
      ],
      onChange: setGameFilter,
    },
    {
      id: "season",
      label: "Season",
      value: seasonFilter,
      options: [
        { label: "All Seasons", value: "all" },
        { label: "Season 2 (Active)", value: "Season 2" },
        { label: "Season 1 (Archived)", value: "Season 1" },
      ],
      onChange: setSeasonFilter,
    },
  ];

  const isSearchActive = search.trim() !== "";
  const isFilterActive = gameFilter !== "all" || seasonFilter !== "all";

  const emptyTitle = MOCK_LEADERBOARD.length === 0
    ? "No leaderboard standings available"
    : isSearchActive
    ? "No ranked players found"
    : isFilterActive
    ? "No standings match selected filters"
    : "No records found";

  const emptyDesc = MOCK_LEADERBOARD.length === 0
    ? "There are currently no competitive match results or ELO calculations on record."
    : isSearchActive
    ? `No ranked players match "${search}". Try searching by a different name or game.`
    : isFilterActive
    ? "No players meet the active game and season filter criteria."
    : "There are currently no items matching your criteria.";

  const emptyIcon = isSearchActive ? (
    <Search className="w-6 h-6" />
  ) : isFilterActive ? (
    <Filter className="w-6 h-6" />
  ) : (
    <Trophy className="w-6 h-6" />
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
        setSeasonFilter("all");
      }}
      className="px-3.5 py-1.5 rounded-xl bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] text-xs font-bold hover:bg-[var(--chrome-control-hi)] transition-colors cursor-pointer"
    >
      Reset Filters
    </button>
  ) : undefined;

  return (
    <AdminLayout>
      <PageHeader
        title="Leaderboards & ELO Standings"
        description="Global player rankings, competitive ELO calculations, and tournament victory analytics."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Leaderboards" }]}
        actions={
          <button
            type="button"
            onClick={handleRecalculateElo}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate ELO</span>
          </button>
        }
      />

      <MockDataBanner kind="mock" />

      {refreshAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {refreshAlert}</span>
        </div>
      )}

      {/* Top 3 Champions Podium Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {/* 2nd Place Silver */}
        <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col items-center text-center relative overflow-hidden order-2 md:order-1">
          <div className="w-12 h-12 rounded-full bg-[var(--chrome-control)] border-2 border-[var(--chrome-border)] flex items-center justify-center text-2xl mb-2">
            🥈
          </div>
          <span className="text-[11px] uppercase font-bold text-[var(--chrome-ink-soft)]">Rank #2 Silver</span>
          <h3 className="font-extrabold text-[var(--chrome-ink)] text-base mt-0.5">
            {top3[1]?.name}
          </h3>
          <span className="text-xs text-[var(--chrome-ink-soft)]">{top3[1]?.game}</span>
          <div className="mt-3 px-3 py-1 rounded-full bg-[var(--chrome-control)] font-mono font-bold text-[var(--chrome-ink)] text-xs border border-[var(--chrome-border)]">
            {top3[1]?.eloRating} ELO ({top3[1]?.winRate} Win Rate)
          </div>
        </div>

        {/* 1st Place Gold Champion */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 via-[var(--chrome-panel)] to-[var(--chrome-panel)] border-2 border-amber-500/40 shadow-xs flex flex-col items-center text-center relative overflow-hidden order-1 md:order-2">
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] uppercase shadow-xs">
              Champion
            </span>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 border-2 border-amber-300 flex items-center justify-center text-3xl mb-2 shadow-xs text-zinc-950">
            👑
          </div>
          <span className="text-xs uppercase font-extrabold text-amber-600 dark:text-amber-400">Rank #1 Champion</span>
          <h3 className="font-black text-[var(--chrome-ink)] text-lg mt-0.5">
            {top3[0]?.name}
          </h3>
          <span className="text-xs text-[var(--chrome-ink-soft)]">{top3[0]?.game} Division</span>
          <div className="mt-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 font-mono font-black text-zinc-950 text-xs shadow-xs">
            {top3[0]?.eloRating} ELO ({top3[0]?.winRate} Win Rate)
          </div>
        </div>

        {/* 3rd Place Bronze */}
        <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col items-center text-center relative overflow-hidden order-3">
          <div className="w-12 h-12 rounded-full bg-[var(--chrome-control)] border-2 border-[var(--chrome-border)] flex items-center justify-center text-2xl mb-2">
            🥉
          </div>
          <span className="text-[11px] uppercase font-bold text-[var(--chrome-ink-soft)]">Rank #3 Bronze</span>
          <h3 className="font-extrabold text-[var(--chrome-ink)] text-base mt-0.5">
            {top3[2]?.name}
          </h3>
          <span className="text-xs text-[var(--chrome-ink-soft)]">{top3[2]?.game}</span>
          <div className="mt-3 px-3 py-1 rounded-full bg-[var(--chrome-control)] font-mono font-bold text-[var(--chrome-ink)] text-xs border border-[var(--chrome-border)]">
            {top3[2]?.eloRating} ELO ({top3[2]?.winRate} Win Rate)
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by player name or game..."
          ariaLabel="Search leaderboards"
        />
        <FilterBar
          filters={filters}
          onReset={() => {
            setGameFilter("all");
            setSeasonFilter("all");
          }}
        />
      </div>

      {/* Leaderboard Table */}
      <DataTable
        columns={columns}
        data={filteredPlayers}
        onRowClick={(row) => setSelectedPlayer(row)}
        getRowAriaLabel={(row) => `Open details for player ${row.name}`}
        emptyMessage={emptyTitle}
        emptyDescription={emptyDesc}
        emptyIcon={emptyIcon}
        emptyAction={emptyAction}
      />

      {/* Player Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedPlayer)}
        onClose={() => setSelectedPlayer(null)}
        title={selectedPlayer?.name ?? "Player Standings"}
        subtitle={`Rank #${selectedPlayer?.rank} • ${selectedPlayer?.game} Master`}
        badge={
          selectedPlayer && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono font-bold text-xs border border-amber-500/30">
              {selectedPlayer.eloRating} ELO
            </span>
          )
        }
      >
        {selectedPlayer && (
          <div className="space-y-6">
            <InfoCard
              title="Career Ranking Breakdown"
              fields={[
                { label: "Season Division", value: selectedPlayer.season },
                { label: "Total Matches", value: selectedPlayer.wins + selectedPlayer.losses },
                { label: "Win / Loss Record", value: `${selectedPlayer.wins}W - ${selectedPlayer.losses}L` },
                { label: "Longest Winning Streak", value: `${selectedPlayer.longestStreak} matches in a row` },
              ]}
            />

            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                Anti-Cheat Verification Badge
              </h4>
              <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
                ✓ Passed all turn timing heuristic checks and HMAC seat verification logs. Zero suspicious move speed flags.
              </p>
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
