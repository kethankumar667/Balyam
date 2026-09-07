import { useCallback, useEffect, useState } from "react";
import { Trophy, Flame, RefreshCw, Search, Filter, Clock } from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import DataTable, { type Column } from "../../../components/admin/data-table";
import SearchBar from "../../../components/admin/search-bar";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import LoadingState from "../../../components/admin/loading-state";
import { operationalFetch, OperationalAuthError } from "../../../lib/operationalApi";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import type { LeaderboardEntry, LeaderboardMetric, LeaderboardTimeframe } from "@shared/ranking/PlayerRank";
import type { GameKind } from "@shared/types";

/**
 * Real competitive standings.
 *
 * Backed by `GET /api/ranking/leaderboard` (`RankingController` →
 * `LeaderboardService.getLeaderboard`), which already supported every filter
 * this page presents — metric, game, timeframe, search, limit, offset — and
 * simply had no consumer anywhere in the client. Filtering and searching are
 * therefore done SERVER-side against the real player set, not by filtering a
 * fixed array in the browser.
 *
 * The previous mock carried `prevRank` movement arrows, a `longestStreak`
 * column, a "Season 2" filter, an `isVerified` shield and an anti-cheat
 * attestation in the drawer. None of those have a real source behind them,
 * so they are gone rather than shown against invented values. What the server
 * genuinely knows — tier, level, rating, wins, matches, win rate, play time,
 * favourite game — is what renders.
 *
 * The endpoint is PUBLIC (see RankingController's own header); `operationalFetch`
 * is reused only for its base-URL and error handling, consistent with the rest
 * of the console.
 */

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  metric: LeaderboardMetric;
  timeframe: LeaderboardTimeframe;
}

const PAGE_SIZE = 25;

const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  rating: "Rating",
  wins: "Wins",
  winRate: "Win Rate",
  matchesPlayed: "Matches Played",
  level: "Level",
};

const TIMEFRAME_LABELS: Record<LeaderboardTimeframe, string> = {
  allTime: "All Time",
  monthly: "This Month",
  weekly: "This Week",
};

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for this API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

function formatPlayTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function gameLabel(game: string): string {
  return GAME_DISPLAY_NAMES[game as GameKind] ?? game;
}

export default function AdminLeaderboardsPage() {
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [metricFilter, setMetricFilter] = useState<LeaderboardMetric>("rating");
  const [timeframeFilter, setTimeframeFilter] = useState<LeaderboardTimeframe>("allTime");
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      try {
        const params = new URLSearchParams({
          metric: metricFilter,
          timeframe: timeframeFilter,
          limit: String(PAGE_SIZE),
        });
        if (gameFilter !== "all") params.set("game", gameFilter);
        if (search.trim()) params.set("search", search.trim());

        const result = await operationalFetch<LeaderboardResponse>(
          `/api/ranking/leaderboard?${params.toString()}`,
        );
        setData(result);
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        setData(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [metricFilter, timeframeFilter, gameFilter, search],
  );

  // Debounced so typing in the search box doesn't fire a request per keystroke;
  // filters re-query immediately through the same effect.
  useEffect(() => {
    const timer = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const entries = data?.entries ?? [];
  const top3 = entries.slice(0, 3);

  const columns: Column<LeaderboardEntry>[] = [
    {
      kind: "property",
      key: "rank",
      header: "Rank",
      align: "center",
      render: (row) => (
        <span
          className={`font-black text-sm font-mono ${
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
      ),
    },
    {
      kind: "property",
      key: "displayName",
      header: "Player",
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{row.avatar ?? "🎮"}</span>
          <div className="min-w-0">
            <span className="font-bold text-[var(--chrome-ink)] block truncate">{row.displayName}</span>
            <span className="text-[10px] font-mono text-[var(--chrome-ink-soft)]">
              {row.tier} • Lv {row.level}
            </span>
          </div>
        </div>
      ),
    },
    {
      kind: "property",
      key: "favoriteGame",
      header: "Favourite Game",
      render: (row) => (
        <span className="font-semibold text-[var(--chrome-ink-soft)]">
          {row.favoriteGame === "none" ? "—" : gameLabel(row.favoriteGame)}
        </span>
      ),
    },
    {
      kind: "property",
      key: "rating",
      header: "Rating",
      align: "right",
      render: (row) => (
        <span className="font-mono font-black text-amber-500 dark:text-amber-400 text-sm">
          {row.rating}
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
            {row.winRate}%
          </span>
          <div className="text-[10px] text-[var(--chrome-ink-soft)] font-mono">
            {row.wins}W / {Math.max(0, row.matchesPlayed - row.wins)}L
          </div>
        </div>
      ),
    },
    {
      kind: "property",
      key: "matchesPlayed",
      header: "Matches",
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs">
          <Flame className="w-3 h-3 text-amber-500" /> {row.matchesPlayed}
        </span>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      id: "metric",
      label: "Rank By",
      value: metricFilter,
      options: (Object.keys(METRIC_LABELS) as LeaderboardMetric[]).map((m) => ({
        label: METRIC_LABELS[m],
        value: m,
      })),
      onChange: (value) => setMetricFilter(value as LeaderboardMetric),
    },
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
    {
      id: "timeframe",
      label: "Timeframe",
      value: timeframeFilter,
      options: (Object.keys(TIMEFRAME_LABELS) as LeaderboardTimeframe[]).map((t) => ({
        label: TIMEFRAME_LABELS[t],
        value: t,
      })),
      onChange: (value) => setTimeframeFilter(value as LeaderboardTimeframe),
    },
  ];

  const isSearchActive = search.trim() !== "";
  const isFilterActive = gameFilter !== "all" || metricFilter !== "rating" || timeframeFilter !== "allTime";

  const resetFilters = () => {
    setGameFilter("all");
    setMetricFilter("rating");
    setTimeframeFilter("allTime");
  };

  const emptyTitle = error
    ? "Leaderboard unavailable"
    : isSearchActive
      ? "No ranked players found"
      : isFilterActive
        ? "No standings match selected filters"
        : "No leaderboard standings yet";

  const emptyDesc = error
    ? error
    : isSearchActive
      ? `No ranked players match "${search}". Try a different name.`
      : isFilterActive
        ? "No players meet the active game, metric and timeframe criteria."
        : "No competitive results have been recorded yet — standings appear once matches finish.";

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

  const podiumMeta = [
    { medal: "🥈", label: "Rank #2 Silver", order: "order-2 md:order-1" },
    { medal: "👑", label: "Rank #1 Champion", order: "order-1 md:order-2" },
    { medal: "🥉", label: "Rank #3 Bronze", order: "order-3" },
  ];
  // Podium renders 2nd, 1st, 3rd left-to-right on desktop.
  const podiumEntries = [top3[1], top3[0], top3[2]];

  return (
    <AdminLayout>
      <PageHeader
        title="Leaderboards & Competitive Standings"
        description={
          data
            ? `${data.total} ranked player(s) — ranked by ${METRIC_LABELS[data.metric]}, ${TIMEFRAME_LABELS[data.timeframe]}.`
            : "Global player rankings computed from real match results."
        }
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Leaderboards" }]}
        actions={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Standings"}</span>
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          Standings unavailable: {error}
        </div>
      )}

      {/* Podium — only rendered once there are real entries to put on it. */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {podiumEntries.map((entry, index) => {
            const meta = podiumMeta[index];
            if (!entry) return <div key={meta.label} className={meta.order} aria-hidden />;
            const isChampion = index === 1;
            return (
              <div
                key={entry.playerId}
                className={`${meta.order} ${
                  isChampion
                    ? "p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 via-[var(--chrome-panel)] to-[var(--chrome-panel)] border-2 border-amber-500/40 shadow-xs"
                    : "p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs"
                } flex flex-col items-center text-center relative overflow-hidden`}
              >
                {isChampion && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] uppercase shadow-xs">
                      Champion
                    </span>
                  </div>
                )}
                <div
                  className={`rounded-full flex items-center justify-center mb-2 ${
                    isChampion
                      ? "w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-400 border-2 border-amber-300 text-3xl shadow-xs text-zinc-950"
                      : "w-12 h-12 bg-[var(--chrome-control)] border-2 border-[var(--chrome-border)] text-2xl"
                  }`}
                >
                  {meta.medal}
                </div>
                <span
                  className={`uppercase font-extrabold ${
                    isChampion ? "text-xs text-amber-600 dark:text-amber-400" : "text-[11px] text-[var(--chrome-ink-soft)]"
                  }`}
                >
                  {meta.label}
                </span>
                <h3
                  className={`text-[var(--chrome-ink)] mt-0.5 ${
                    isChampion ? "font-black text-lg" : "font-extrabold text-base"
                  }`}
                >
                  {entry.displayName}
                </h3>
                <span className="text-xs text-[var(--chrome-ink-soft)]">
                  {entry.tier} • Level {entry.level}
                </span>
                <div
                  className={`mt-3 rounded-full font-mono text-xs ${
                    isChampion
                      ? "px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 font-black text-zinc-950 shadow-xs"
                      : "px-3 py-1 bg-[var(--chrome-control)] font-bold text-[var(--chrome-ink)] border border-[var(--chrome-border)]"
                  }`}
                >
                  {entry.rating} rating ({entry.winRate}% win rate)
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by player name..."
          ariaLabel="Search leaderboards"
        />
        <FilterBar filters={filters} onReset={resetFilters} />
      </div>

      {isLoading ? (
        <LoadingState variant="table" label="Loading leaderboard standings" />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          onRowClick={(row) => setSelectedPlayer(row)}
          getRowAriaLabel={(row) => `Open details for player ${row.displayName}`}
          emptyMessage={emptyTitle}
          emptyDescription={emptyDesc}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
        />
      )}

      <DetailDrawer
        isOpen={Boolean(selectedPlayer)}
        onClose={() => setSelectedPlayer(null)}
        title={selectedPlayer?.displayName ?? "Player Standings"}
        subtitle={selectedPlayer ? `Rank #${selectedPlayer.rank} • ${selectedPlayer.tier}` : undefined}
        badge={
          selectedPlayer && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono font-bold text-xs border border-amber-500/30">
              {selectedPlayer.rating} rating
            </span>
          )
        }
      >
        {selectedPlayer && (
          <div className="space-y-6">
            <InfoCard
              title="Career Record"
              fields={[
                { label: "Player ID", value: selectedPlayer.playerId },
                { label: "Tier", value: selectedPlayer.tier },
                { label: "Level", value: selectedPlayer.level },
                { label: "Matches Played", value: selectedPlayer.matchesPlayed },
                {
                  label: "Win / Loss Record",
                  value: `${selectedPlayer.wins}W - ${Math.max(0, selectedPlayer.matchesPlayed - selectedPlayer.wins)}L`,
                },
                { label: "Win Rate", value: `${selectedPlayer.winRate}%` },
                {
                  label: "Favourite Game",
                  value:
                    selectedPlayer.favoriteGame === "none" ? "—" : gameLabel(selectedPlayer.favoriteGame),
                },
              ]}
            />

            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Time Played
              </h4>
              <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
                {formatPlayTime(selectedPlayer.totalPlayTimeMinutes)} recorded across all completed matches.
              </p>
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
