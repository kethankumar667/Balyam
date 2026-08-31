import { useState, useEffect, useMemo } from "react";
import {
  UserX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowUpDown,
  Bot,
  Zap,
  Activity,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useAdminLiveStore } from "../../../store/adminLiveStore";
import {
  deriveRecoveryStatus,
  type DisconnectedSeatSummary,
  type GameKind,
  type RecoveryStatus,
} from "@shared/types";

function formatSeconds(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatClockTime(timestamp: number): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const STATUS_PRIORITY: Record<RecoveryStatus, number> = {
  EXPIRED: 0,
  EXPIRING_SOON: 1,
  NEAR_EXPIRY: 2,
  AUTO_PLAYING: 3,
  REJOIN_ELIGIBLE: 4,
};

export default function RecoverySentinel() {
  const recovery = useAdminLiveStore((s) => s.recovery);
  const platform = useAdminLiveStore((s) => s.platform);
  const inspectRoom = useAdminLiveStore((s) => s.inspectRoom);
  const filters = useAdminLiveStore((s) => s.recoveryFilters);
  const setRecoverySearchQuery = useAdminLiveStore((s) => s.setRecoverySearchQuery);
  const setRecoveryGameFilter = useAdminLiveStore((s) => s.setRecoveryGameFilter);
  const setRecoveryStatusFilter = useAdminLiveStore((s) => s.setRecoveryStatusFilter);
  const setRecoveryHostOnly = useAdminLiveStore((s) => s.setRecoveryHostOnly);
  const setRecoveryAutoPlayOnly = useAdminLiveStore((s) => s.setRecoveryAutoPlayOnly);
  const setRecoverySorting = useAdminLiveStore((s) => s.setRecoverySorting);
  const resetRecoveryFilters = useAdminLiveStore((s) => s.resetRecoveryFilters);

  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // Shared clock tick for all visible countdown components (1 interval for all cards)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rawSeats = recovery?.seats ?? [];

  // KPI Calculations
  const activeCount = rawSeats.length;
  const rejoinEligibleCount = rawSeats.filter((s) => {
    const rem = Math.max(0, s.awayUntil - currentTime);
    return rem > 0;
  }).length;

  const recoverySuccessRate = platform?.recoverySuccessRate ?? null;
  const recoveryExpiryRate =
    recoverySuccessRate !== null ? Math.max(0, 100 - recoverySuccessRate) : null;

  const totalRemainingGrace = rawSeats.reduce((acc, s) => {
    const rem = Math.max(0, s.awayUntil - currentTime);
    return acc + rem;
  }, 0);
  const avgRemainingGraceMs = activeCount > 0 ? Math.round(totalRemainingGrace / activeCount) : 0;

  const longestAwayDurationMs = rawSeats.reduce((max, s) => {
    const elapsed = Math.max(0, currentTime - s.awaySince);
    return Math.max(max, elapsed);
  }, 0);

  // Filter & Sort
  const processedSeats = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();

    return rawSeats
      .filter((seat) => {
        const rem = Math.max(0, seat.awayUntil - currentTime);
        const isEligible = rem > 0;
        const status = deriveRecoveryStatus({
          remainingGraceMs: rem,
          isAutoPlaying: seat.isAutoPlaying,
          isEligibleForRejoin: isEligible,
        });

        if (filters.gameFilter !== "all" && seat.game !== filters.gameFilter) return false;
        if (filters.statusFilter !== "all" && status !== filters.statusFilter) return false;
        if (filters.hostOnly && !seat.isHost) return false;
        if (filters.autoPlayOnly && !seat.isAutoPlaying) return false;

        if (q) {
          const matchName = seat.playerName.toLowerCase().includes(q);
          const matchRoom = seat.roomCode.toLowerCase().includes(q);
          const matchGame = seat.game.toLowerCase().includes(q);
          return matchName || matchRoom || matchGame;
        }

        return true;
      })
      .sort((a, b) => {
        const remA = Math.max(0, a.awayUntil - currentTime);
        const remB = Math.max(0, b.awayUntil - currentTime);
        const elapsedA = Math.max(0, currentTime - a.awaySince);
        const elapsedB = Math.max(0, currentTime - b.awaySince);

        const statusA = deriveRecoveryStatus({
          remainingGraceMs: remA,
          isAutoPlaying: a.isAutoPlaying,
          isEligibleForRejoin: remA > 0,
        });
        const statusB = deriveRecoveryStatus({
          remainingGraceMs: remB,
          isAutoPlaying: b.isAutoPlaying,
          isEligibleForRejoin: remB > 0,
        });

        let diff = 0;
        switch (filters.sortBy) {
          case "urgency":
            // Lowest status priority number first (EXPIRED, EXPIRING_SOON, etc.), then least remaining grace
            diff = STATUS_PRIORITY[statusA] - STATUS_PRIORITY[statusB];
            if (diff === 0) diff = remA - remB;
            break;
          case "grace":
            diff = remA - remB;
            break;
          case "disconnectDuration":
            diff = elapsedB - elapsedA;
            break;
          case "roomCode":
            diff = a.roomCode.localeCompare(b.roomCode);
            break;
          default:
            diff = remA - remB;
        }

        return filters.sortDirection === "asc" ? diff : -diff;
      });
  }, [rawSeats, filters, currentTime]);

  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.gameFilter !== "all" ||
    filters.statusFilter !== "all" ||
    filters.hostOnly ||
    filters.autoPlayOnly;

  return (
    <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] p-4 sm:p-5 shadow-xs flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--chrome-hairline)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink)]">
              Advanced Recovery Sentinel
            </h2>
            <p className="text-[11px] text-[var(--chrome-ink-soft)]">
              Authoritative player recovery & grace telemetry
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          {activeCount} Active
        </span>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
          <span className="text-[10px] font-semibold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
            Active Recoveries
          </span>
          <span className="text-sm sm:text-base font-extrabold text-[var(--chrome-ink)]">
            {activeCount}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
              Success Rate
            </span>
          </div>
          <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            {recoverySuccessRate !== null ? `${recoverySuccessRate}%` : "N/A"}
          </span>
          <span className="text-[9px] text-[var(--chrome-ink-soft)] block">Since server start</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
          <span className="text-[10px] font-semibold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
            Expiry Rate
          </span>
          <span className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400">
            {recoveryExpiryRate !== null ? `${recoveryExpiryRate}%` : "N/A"}
          </span>
          <span className="text-[9px] text-[var(--chrome-ink-soft)] block">Since server start</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
          <span className="text-[10px] font-semibold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
            Avg Remaining
          </span>
          <span className="text-sm sm:text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {formatSeconds(avgRemainingGraceMs)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
          <span className="text-[10px] font-semibold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
            Longest Active
          </span>
          <span className="text-sm sm:text-base font-extrabold font-mono text-[var(--chrome-ink)]">
            {formatSeconds(longestAwayDurationMs)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
          <span className="text-[10px] font-semibold text-[var(--chrome-ink-soft)] uppercase tracking-wider block">
            Rejoin Eligible
          </span>
          <span className="text-sm sm:text-base font-extrabold text-sky-600 dark:text-sky-400">
            {rejoinEligibleCount}
          </span>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--chrome-ink-soft)]" />
            <input
              type="text"
              placeholder="Search player, room code..."
              value={filters.searchQuery}
              onChange={(e) => setRecoverySearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] placeholder-[var(--chrome-ink-soft)] focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              aria-label="Search recovery seats"
            />
          </div>

          {/* Game filter */}
          <select
            value={filters.gameFilter}
            onChange={(e) => setRecoveryGameFilter(e.target.value as GameKind | "all")}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-hidden"
            aria-label="Filter recoveries by game"
          >
            <option value="all">All Games</option>
            <option value="rummy">Rummy</option>
            <option value="ludo">Ludo</option>
            <option value="uno">UNO</option>
            <option value="snl">Snakes & Ladders</option>
            <option value="handcricket">Hand Cricket</option>
            <option value="rps">RPS</option>
            <option value="wordbuilding">Word Building</option>
            <option value="dotsboxes">Dots & Boxes</option>
            <option value="bingo">Bingo</option>
            <option value="chess">Chess</option>
            <option value="stargame">Star Game</option>
          </select>

          {/* Status filter */}
          <select
            value={filters.statusFilter}
            onChange={(e) => setRecoveryStatusFilter(e.target.value as RecoveryStatus | "all")}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-hidden"
            aria-label="Filter recoveries by status"
          >
            <option value="all">All Statuses</option>
            <option value="REJOIN_ELIGIBLE">Rejoin Eligible</option>
            <option value="AUTO_PLAYING">Auto-Playing</option>
            <option value="NEAR_EXPIRY">Near Expiry (&lt;30s)</option>
            <option value="EXPIRING_SOON">Expiring Soon (&lt;15s)</option>
            <option value="EXPIRED">Expired</option>
          </select>

          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setRecoverySorting(
                e.target.value as "urgency" | "grace" | "disconnectDuration" | "roomCode"
              )
            }
            className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-hidden"
            aria-label="Sort recoveries"
          >
            <option value="urgency">Sort by Urgency</option>
            <option value="grace">Least Grace Remaining</option>
            <option value="disconnectDuration">Longest Disconnected</option>
            <option value="roomCode">Room Code</option>
          </select>

          {/* Sort Direction Toggle */}
          <button
            type="button"
            onClick={() => setRecoverySorting(filters.sortBy)}
            className="p-1.5 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-panel)] transition-colors"
            title={`Toggle sort order (Current: ${filters.sortDirection.toUpperCase()})`}
            aria-label="Toggle sort direction"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toggles Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            aria-pressed={filters.hostOnly}
            onClick={() => setRecoveryHostOnly(!filters.hostOnly)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
              filters.hostOnly
                ? "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300 font-bold"
                : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]"
            }`}
          >
            Hosts Only
          </button>

          <button
            type="button"
            aria-pressed={filters.autoPlayOnly}
            onClick={() => setRecoveryAutoPlayOnly(!filters.autoPlayOnly)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
              filters.autoPlayOnly
                ? "bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-300 font-bold"
                : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]"
            }`}
          >
            Auto-Play Active
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetRecoveryFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Recovery Cards Container */}
      {rawSeats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2 text-[var(--chrome-ink-soft)] bg-[var(--chrome-control)]/40 rounded-xl border border-[var(--chrome-border)]">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-xs font-bold text-[var(--chrome-ink)]">All Player Seats Connected</p>
          <p className="text-[11px] max-w-xs">
            Zero active player disconnects or pending grace periods on the server.
          </p>
        </div>
      ) : processedSeats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 text-[var(--chrome-ink-soft)] bg-[var(--chrome-control)]/40 rounded-xl border border-[var(--chrome-border)]">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <p className="text-xs font-bold text-[var(--chrome-ink)]">No Matching Recoveries</p>
          <p className="text-[11px] max-w-xs">
            No active recoveries match your current search and filter settings.
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
          {processedSeats.map((seat) => {
            const remainingMs = Math.max(0, seat.awayUntil - currentTime);
            const elapsedMs = Math.max(0, currentTime - seat.awaySince);
            const gracePeriodMs = Math.max(1, seat.awayUntil - seat.awaySince);
            const progressPercent = Math.max(
              0,
              Math.min(100, Math.round((remainingMs / gracePeriodMs) * 100))
            );
            const isEligible = remainingMs > 0;
            const status = deriveRecoveryStatus({
              remainingGraceMs: remainingMs,
              isAutoPlaying: seat.isAutoPlaying,
              isEligibleForRejoin: isEligible,
            });

            // Urgency Visual Priorities
            const isCritical = remainingMs < 15000 && remainingMs > 0;
            const isExpired = remainingMs <= 0;
            const isWarning = remainingMs >= 15000 && remainingMs < 30000;
            const isHealthy = remainingMs >= 30000;

            const cardBorderClass = isExpired
              ? "border-slate-700/60 bg-[var(--chrome-control)]/40"
              : isCritical
              ? "border-rose-500/60 bg-rose-500/5 shadow-xs shadow-rose-500/10"
              : isWarning
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-[var(--chrome-border)] bg-[var(--chrome-control)]/70";

            return (
              <div
                key={`${seat.roomCode}-${seat.playerId}`}
                className={`p-3.5 rounded-xl border space-y-3 transition-all ${cardBorderClass}`}
              >
                {/* Card Top: Player Info & Status Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-[var(--chrome-ink)]">
                        {seat.playerName}
                      </span>
                      {seat.isHost && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                          Host
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--chrome-panel)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]">
                        {seat.isGuest ? "Guest" : "Member"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => inspectRoom(seat.roomCode)}
                      className="text-[11px] text-[var(--chrome-ink-soft)] hover:text-amber-500 font-mono inline-flex items-center gap-1 mt-0.5"
                      title="Inspect Room"
                    >
                      <span>Room: #{seat.roomCode}</span>
                      <span className="capitalize">({seat.game})</span>
                      <ChevronRight className="w-3 h-3 text-[var(--chrome-ink-soft)]" />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-col items-end gap-1">
                    {status === "EXPIRED" && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">
                        Expired
                      </span>
                    )}
                    {status === "EXPIRING_SOON" && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 animate-pulse">
                        Expiring Soon
                      </span>
                    )}
                    {status === "NEAR_EXPIRY" && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                        Near Expiry
                      </span>
                    )}
                    {status === "AUTO_PLAYING" && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        Auto Playing
                      </span>
                    )}
                    {status === "REJOIN_ELIGIBLE" && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Rejoin Eligible
                      </span>
                    )}
                  </div>
                </div>

                {/* Authoritative Recovery Timeline */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] p-2 rounded-lg bg-[var(--chrome-panel)]/80 border border-[var(--chrome-border)]">
                  <div>
                    <span className="text-[var(--chrome-ink-soft)] block font-semibold">Disconnected</span>
                    <span className="font-mono text-[var(--chrome-ink)] font-bold">
                      {formatClockTime(seat.awaySince)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--chrome-ink-soft)] block font-semibold">Grace Expires</span>
                    <span className="font-mono text-[var(--chrome-ink)] font-bold">
                      {formatClockTime(seat.awayUntil)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--chrome-ink-soft)] block font-semibold">Elapsed</span>
                    <span className="font-mono text-[var(--chrome-ink)] font-bold">
                      {formatSeconds(elapsedMs)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--chrome-ink-soft)] block font-semibold">Remaining</span>
                    <span
                      className={`font-mono font-extrabold ${
                        isCritical
                          ? "text-rose-600 dark:text-rose-400"
                          : isWarning
                          ? "text-amber-600 dark:text-amber-400"
                          : isHealthy
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {formatSeconds(remainingMs)}
                    </span>
                  </div>
                </div>

                {/* Grace Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-[var(--chrome-panel)] h-2 rounded-full overflow-hidden border border-[var(--chrome-border)]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progressPercent > 50
                          ? "bg-emerald-500"
                          : progressPercent > 20
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Auto-Play & Idle Strikes telemetry */}
                {(seat.isAutoPlaying || seat.idleStrikes > 0 || seat.autoTurnsPlayed > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-[var(--chrome-ink-soft)] border-t border-[var(--chrome-hairline)]">
                    <div className="flex items-center gap-2">
                      {seat.isAutoPlaying && (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                          <Zap className="w-3 h-3" />
                          <span>
                            Auto-Play ({seat.autoPlayReason ?? "active"})
                          </span>
                        </span>
                      )}
                      {seat.idleStrikes > 0 && (
                        <span>Idle Strikes: {seat.idleStrikes}/2</span>
                      )}
                    </div>

                    <div className="font-mono">
                      <span>Turns: {seat.autoTurnsPlayed} / {seat.autoTurnCap}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
