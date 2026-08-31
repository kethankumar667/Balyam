import { useState, useEffect, useMemo, useRef } from "react";
import { Copy, Check, Clock, Bot, Users, Play, ArrowUpDown, Eye } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import StatusBadge from "../status-badge";
import EmptyState from "../empty-state";
import { useAdminLiveStore } from "../../../store/adminLiveStore";
import { useViewport } from "../../../lib/useViewport";
import type { OperationalRoomSummary } from "@shared/types";

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatAge(timestamp: number): string {
  if (!timestamp) return "—";
  const elapsedSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSec < 60) return `${elapsedSec}s ago`;
  const m = Math.floor(elapsedSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

const LIFECYCLE_STATUS_MAP: Record<
  string,
  { label: string; badgeStatus: "active" | "pending" | "danger" | "warning" }
> = {
  IN_PROGRESS: { label: "Playing", badgeStatus: "active" },
  RECOVERING: { label: "Recovering", badgeStatus: "danger" },
  PAUSED: { label: "Paused", badgeStatus: "warning" },
  WAITING_FOR_PLAYERS: { label: "Waiting", badgeStatus: "pending" },
  READY_CHECK: { label: "Ready Check", badgeStatus: "pending" },
  STARTING: { label: "Starting", badgeStatus: "pending" },
  CREATED: { label: "Created", badgeStatus: "pending" },
  COMPLETED: { label: "Completed", badgeStatus: "pending" },
  ABANDONED: { label: "Abandoned", badgeStatus: "danger" },
  CLOSED: { label: "Closed", badgeStatus: "danger" },
};

export default function LiveRoomMatrix() {
  const viewport = useViewport();
  const rooms = useAdminLiveStore((s) => s.rooms);
  const isLoading = useAdminLiveStore((s) => s.isLoading && s.rooms.length === 0);
  const filters = useAdminLiveStore((s) => s.filters);
  const setSorting = useAdminLiveStore((s) => s.setSorting);
  const inspectRoom = useAdminLiveStore((s) => s.inspectRoom);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Live timer tick every second for duration calculations
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => (t + 1) % 1000), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      /* clipboard write fail fallback */
    }
  };

  // Filter and sort rooms
  const processedRooms = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    const gameFilter = filters.gameFilter;
    const lifecycleFilter = filters.lifecycleFilter;

    return rooms
      .filter((r) => {
        if (gameFilter !== "all" && r.game !== gameFilter) return false;
        if (lifecycleFilter !== "all" && r.lifecycleState !== lifecycleFilter) return false;
        if (query) {
          const matchCode = r.code.toLowerCase().includes(query);
          const matchHost = r.host.name.toLowerCase().includes(query);
          const matchGame = r.game.toLowerCase().includes(query);
          return matchCode || matchHost || matchGame;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        switch (filters.sortBy) {
          case "code":
            diff = a.code.localeCompare(b.code);
            break;
          case "game":
            diff = a.game.localeCompare(b.game);
            break;
          case "age":
            diff = b.createdAt - a.createdAt;
            break;
          case "duration":
            diff = (b.matchDurationMs || 0) - (a.matchDurationMs || 0);
            break;
          case "players":
            diff = b.playerCount - a.playerCount;
            break;
          case "lifecycleState":
            diff = a.lifecycleState.localeCompare(b.lifecycleState);
            break;
          default:
            diff = b.createdAt - a.createdAt;
        }
        return filters.sortDirection === "asc" ? diff : -diff;
      });
  }, [rooms, filters]);

  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  // `initialRect` matches the `max-h-[640px]` scroll container below. Without
  // it the virtualizer's own default (`{ width: 0, height: 0 }`) is what it
  // computes against until its ResizeObserver's first callback lands — a
  // real, if usually brief, window where a 0-height viewport makes it treat
  // every row as "visible" and render the whole (possibly 1,000-room) list
  // unbounded. Giving it the real starting size synchronously closes that
  // window instead of only masking it in tests.
  const desktopVirtualizer = useVirtualizer({
    count: processedRooms.length,
    getScrollElement: () => desktopContainerRef.current,
    estimateSize: () => 52,
    overscan: 10,
    initialRect: { width: 900, height: 640 },
  });

  const mobileVirtualizer = useVirtualizer({
    count: processedRooms.length,
    getScrollElement: () => mobileContainerRef.current,
    estimateSize: () => 140,
    overscan: 5,
    initialRect: { width: 480, height: 640 },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] p-6 space-y-3">
        <div className="h-6 w-48 bg-[var(--chrome-control)] rounded-md animate-pulse" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-[var(--chrome-control)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (processedRooms.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] p-8">
        <EmptyState
          title={rooms.length === 0 ? "No active rooms" : "No Matching Rooms Found"}
          description={
            rooms.length === 0
              ? "There are currently no active multiplayer rooms running on this server process."
              : "Try adjusting or resetting your search and filter parameters."
          }
          icon={<Users className="w-6 h-6" />}
        />
      </div>
    );
  }

  const virtualDesktopRows = desktopVirtualizer.getVirtualItems();
  const isVirtualDesktopActive = virtualDesktopRows.length > 0;
  const desktopPaddingTop = isVirtualDesktopActive ? virtualDesktopRows[0]!.start : 0;
  const desktopPaddingBottom = isVirtualDesktopActive
    ? desktopVirtualizer.getTotalSize() - virtualDesktopRows[virtualDesktopRows.length - 1]!.end
    : 0;

  const virtualMobileRows = mobileVirtualizer.getVirtualItems();
  const isVirtualMobileActive = virtualMobileRows.length > 0;

  const ariaSortFor = (column: typeof filters.sortBy): "ascending" | "descending" | "none" => {
    if (filters.sortBy !== column) return "none";
    return filters.sortDirection === "asc" ? "ascending" : "descending";
  };

  return (
    <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] overflow-hidden shadow-xs">
      {viewport === "desktop" ? (
        /* Desktop Table View (>= 768px) with Virtualization */
        <div ref={desktopContainerRef} className="overflow-x-auto overflow-y-auto max-h-[640px]">
          <table className="w-full text-left border-collapse" role="table" aria-label="Live Multiplayer Rooms Table">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[11px] font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                <th scope="col" className="py-3 px-4" aria-sort={ariaSortFor("code")}>
                  <button
                    type="button"
                    onClick={() => setSorting("code")}
                    className="inline-flex items-center gap-1 hover:text-[var(--chrome-ink)] cursor-pointer"
                  >
                    <span>Room Code</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th scope="col" className="py-3 px-4" aria-sort={ariaSortFor("game")}>
                  <button
                    type="button"
                    onClick={() => setSorting("game")}
                    className="inline-flex items-center gap-1 hover:text-[var(--chrome-ink)] cursor-pointer"
                  >
                    <span>Game</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th scope="col" className="py-3 px-4" aria-sort={ariaSortFor("lifecycleState")}>
                  <button
                    type="button"
                    onClick={() => setSorting("lifecycleState")}
                    className="inline-flex items-center gap-1 hover:text-[var(--chrome-ink)] cursor-pointer"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th scope="col" className="py-3 px-4">Host</th>
                <th scope="col" className="py-3 px-4 text-center" aria-sort={ariaSortFor("players")}>
                  <button
                    type="button"
                    onClick={() => setSorting("players")}
                    className="inline-flex items-center gap-1 hover:text-[var(--chrome-ink)] cursor-pointer"
                  >
                    <span>Humans</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th scope="col" className="py-3 px-4 text-center">Bots</th>
                <th scope="col" className="py-3 px-4" aria-sort={ariaSortFor("age")}>
                  <button
                    type="button"
                    onClick={() => setSorting("age")}
                    className="inline-flex items-center gap-1 hover:text-[var(--chrome-ink)] cursor-pointer"
                  >
                    <span>Room Age</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th scope="col" className="py-3 px-4 text-right" aria-sort={ariaSortFor("duration")}>
                  <button
                    type="button"
                    onClick={() => setSorting("duration")}
                    className="inline-flex items-center gap-1 hover:text-[var(--chrome-ink)] ml-auto cursor-pointer"
                  >
                    <span>Duration</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--chrome-hairline)] text-xs">
              {desktopPaddingTop > 0 && (
                <tr>
                  <td colSpan={9} style={{ height: `${desktopPaddingTop}px` }} />
                </tr>
              )}
              {(isVirtualDesktopActive ? virtualDesktopRows.map((vr) => processedRooms[vr.index]!) : processedRooms).map((room) => {
                const statusConfig = LIFECYCLE_STATUS_MAP[room.lifecycleState] ?? {
                  label: room.lifecycleState.toLowerCase(),
                  badgeStatus: "pending",
                };
                const isMatchRunning =
                  room.phase === "playing" ||
                  room.lifecycleState === "IN_PROGRESS" ||
                  room.lifecycleState === "RECOVERING" ||
                  room.lifecycleState === "PAUSED";
                const currentDuration =
                  room.matchStartedAt && isMatchRunning ? Date.now() - room.matchStartedAt : room.matchDurationMs;

                return (
                  <tr
                    key={room.code}
                    className="hover:bg-[var(--chrome-control)]/50 transition-colors group"
                  >
                    {/* Room Code */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(room.code)}
                          title="Click to copy room code"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-black text-xs border border-amber-500/30 transition-all cursor-pointer"
                        >
                          <span>{room.code}</span>
                          {copiedCode === room.code ? (
                            <Check className="w-3 h-3 text-emerald-500 animate-in zoom-in-50" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                        {room.spectatorCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            {room.spectatorCount} TV
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Game */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-[var(--chrome-ink)] capitalize">
                        {room.game}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge
                          status={statusConfig.badgeStatus}
                          label={statusConfig.label}
                          size="sm"
                        />
                        {room.hasTakeover && (
                          <span className="text-[10px] font-extrabold px-1 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Takeover
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Host */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[var(--chrome-ink)] truncate max-w-[120px]">
                          {room.host?.name ?? "Host"}
                        </span>
                        {room.host?.isGuest ? (
                          <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
                            Guest
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Member
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Human Players */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] font-bold text-xs border border-[var(--chrome-border)]">
                        <Users className="w-3 h-3 text-[var(--chrome-ink-soft)]" />
                        <span>{room.humanCount}</span>
                        {room.disconnectedCount > 0 && (
                          <span className="text-rose-500 text-[10px]" title={`${room.disconnectedCount} disconnected`}>
                            ({room.disconnectedCount} away)
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Bots */}
                    <td className="py-3 px-4 text-center">
                      {room.botCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                          <Bot className="w-3 h-3" />
                          <span>{room.botCount}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--chrome-ink-soft)]">—</span>
                      )}
                    </td>

                    {/* Room Age */}
                    <td className="py-3 px-4 text-[var(--chrome-ink-soft)] font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatAge(room.createdAt)}</span>
                      </span>
                    </td>

                    {/* Match Duration */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[var(--chrome-ink)]">
                      {isMatchRunning ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Play className="w-3 h-3 fill-current" />
                          <span>{formatDuration(currentDuration)}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--chrome-ink-soft)] font-normal">—</span>
                      )}
                    </td>

                    {/* Action: Inspect */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => inspectRoom(room.code)}
                        aria-label={`Inspect room ${room.code}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--chrome-control)] hover:bg-amber-500/15 text-[var(--chrome-ink-soft)] hover:text-amber-600 dark:hover:text-amber-400 font-semibold text-xs border border-[var(--chrome-border)] hover:border-amber-500/30 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {desktopPaddingBottom > 0 && (
                <tr>
                  <td colSpan={9} style={{ height: `${desktopPaddingBottom}px` }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mobile Card Stack View (< 768px) with Virtualization */
        <div ref={mobileContainerRef} className="overflow-y-auto max-h-[640px] relative">
          <div
            role="list"
            aria-label="Live multiplayer rooms"
            style={{
              height: isVirtualMobileActive ? `${mobileVirtualizer.getTotalSize()}px` : "auto",
              width: "100%",
              position: "relative",
            }}
          >
            {(isVirtualMobileActive ? virtualMobileRows.map((vr) => ({ room: processedRooms[vr.index]!, start: vr.start })) : processedRooms.map((room) => ({ room, start: null }))).map(({ room, start }) => {
              if (!room) return null;
              const statusConfig = LIFECYCLE_STATUS_MAP[room.lifecycleState] ?? {
                label: room.lifecycleState.toLowerCase(),
                badgeStatus: "pending",
              };
              const isMatchRunning =
                room.phase === "playing" ||
                room.lifecycleState === "IN_PROGRESS" ||
                room.lifecycleState === "RECOVERING" ||
                room.lifecycleState === "PAUSED";
              const currentDuration =
                room.matchStartedAt && isMatchRunning ? Date.now() - room.matchStartedAt : room.matchDurationMs;

              return (
                <div
                  key={room.code}
                  role="listitem"
                  aria-label={`Room ${room.code}, ${room.game}, ${statusConfig.label}`}
                  style={
                    start !== null
                      ? {
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${start}px)`,
                        }
                      : undefined
                  }
                  className="p-4 space-y-3 border-b border-[var(--chrome-hairline)]"
                >
                  {/* Header row: Code, Game, Status & Inspect */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(room.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-black text-xs border border-amber-500/30 cursor-pointer"
                      >
                        <span>{room.code}</span>
                        {copiedCode === room.code ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <span className="font-bold text-xs text-[var(--chrome-ink)] capitalize">{room.game}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={statusConfig.badgeStatus} label={statusConfig.label} size="sm" />
                      <button
                        type="button"
                        onClick={() => inspectRoom(room.code)}
                        aria-label={`Inspect room ${room.code}`}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>

                  {/* Detail row: Host, Players, Bots */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-[var(--chrome-ink-soft)] uppercase font-bold block">Host</span>
                      <span className="font-semibold text-[var(--chrome-ink)]">{room.host?.name ?? "Host"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--chrome-ink-soft)] uppercase font-bold block">Roster</span>
                      <span className="font-bold text-[var(--chrome-ink)]">
                        {room.humanCount} Human{room.humanCount !== 1 ? "s" : ""}{" "}
                        {room.botCount > 0 ? `+ ${room.botCount} AI` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Footer row: Age & Duration */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--chrome-hairline)] text-[var(--chrome-ink-soft)] font-medium">
                    <span>Created {formatAge(room.createdAt)}</span>
                    {isMatchRunning && (
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Active {formatDuration(currentDuration)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
