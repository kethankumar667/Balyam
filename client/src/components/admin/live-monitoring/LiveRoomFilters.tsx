import { Search, X, Filter } from "lucide-react";
import { useAdminLiveStore } from "../../../store/adminLiveStore";
import type { GameKind, RoomLifecycleState } from "@shared/types";

const AVAILABLE_GAMES: Array<{ key: GameKind | "all"; label: string }> = [
  { key: "all", label: "All Games" },
  { key: "ludo", label: "Ludo" },
  { key: "rummy", label: "Rummy" },
  { key: "uno", label: "UNO" },
  { key: "snl", label: "Snakes & Ladders" },
  { key: "handcricket", label: "Hand Cricket" },
  { key: "dotsboxes", label: "Dots & Boxes" },
  { key: "wordbuilding", label: "Word Building" },
  { key: "rps", label: "Rock Paper Scissors" },
  { key: "stargame", label: "Star Game" },
  { key: "bingo", label: "Bingo" },
  { key: "namesplaceanimal", label: "Name Place Animal" },
  { key: "tambola", label: "Tambola" },
  { key: "carrom", label: "Carrom" },
  { key: "chess", label: "Chess" },
  { key: "snake", label: "Snake" },
  { key: "blockblast", label: "Block Blast" },
  { key: "spacewar", label: "Space War" },
];

const AVAILABLE_STATES: Array<{ key: RoomLifecycleState | "all"; label: string }> = [
  { key: "all", label: "All Lifecycle States" },
  { key: "IN_PROGRESS", label: "Playing (In Progress)" },
  { key: "RECOVERING", label: "Recovering" },
  { key: "PAUSED", label: "Paused" },
  { key: "WAITING_FOR_PLAYERS", label: "Waiting for Players" },
  { key: "READY_CHECK", label: "Ready Check" },
  { key: "STARTING", label: "Starting" },
  { key: "CREATED", label: "Created" },
  { key: "COMPLETED", label: "Completed" },
  { key: "ABANDONED", label: "Abandoned" },
  { key: "CLOSED", label: "Closed" },
];

interface LiveRoomFiltersProps {
  totalRoomsCount: number;
  filteredRoomsCount: number;
}

export default function LiveRoomFilters({ totalRoomsCount, filteredRoomsCount }: LiveRoomFiltersProps) {
  const searchQuery = useAdminLiveStore((s) => s.filters.searchQuery);
  const gameFilter = useAdminLiveStore((s) => s.filters.gameFilter);
  const lifecycleFilter = useAdminLiveStore((s) => s.filters.lifecycleFilter);
  const setSearchQuery = useAdminLiveStore((s) => s.setSearchQuery);
  const setGameFilter = useAdminLiveStore((s) => s.setGameFilter);
  const setLifecycleFilter = useAdminLiveStore((s) => s.setLifecycleFilter);
  const resetFilters = useAdminLiveStore((s) => s.resetFilters);

  const hasActiveFilters = searchQuery.trim() !== "" || gameFilter !== "all" || lifecycleFilter !== "all";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--chrome-ink-soft)] pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by room code, host, or player..."
          aria-label="Search rooms"
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] placeholder-[var(--chrome-ink-soft)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] p-0.5 rounded cursor-pointer"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Game Filter */}
        <div className="relative">
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value as GameKind | "all")}
            aria-label="Filter by Game"
            className="px-3 py-2 pr-8 text-xs font-semibold rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 appearance-none cursor-pointer"
          >
            {AVAILABLE_GAMES.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--chrome-ink-soft)] pointer-events-none" aria-hidden="true" />
        </div>

        {/* Lifecycle State Filter */}
        <div className="relative">
          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value as RoomLifecycleState | "all")}
            aria-label="Filter by Lifecycle State"
            className="px-3 py-2 pr-8 text-xs font-semibold rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 appearance-none cursor-pointer"
          >
            {AVAILABLE_STATES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--chrome-ink-soft)] pointer-events-none" aria-hidden="true" />
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Reset all filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

        {/* Count indicator */}
        <div className="px-2.5 py-1 rounded-lg bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] text-xs font-bold border border-[var(--chrome-border)] ml-auto sm:ml-0">
          {filteredRoomsCount} of {totalRoomsCount} Rooms
        </div>
      </div>
    </div>
  );
}
