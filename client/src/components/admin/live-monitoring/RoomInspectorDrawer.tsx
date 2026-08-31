import { useEffect, useRef, useState, useId } from "react";
import {
  X,
  User,
  Bot,
  Clock,
  Zap,
  Activity,
  AlertTriangle,
  Users,
  Gamepad2,
  Lock,
} from "lucide-react";
import { useAdminLiveStore } from "../../../store/adminLiveStore";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import type { OperationalPlayerSummary } from "@shared/types";

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatSeconds(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatClockTime(timestamp: number | null): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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

const LIFECYCLE_LABEL_MAP: Record<string, { label: string; bg: string; text: string }> = {
  IN_PROGRESS: { label: "Playing", bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-500" },
  RECOVERING: { label: "Recovering", bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-500" },
  PAUSED: { label: "Paused", bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-500" },
  WAITING_FOR_PLAYERS: { label: "Waiting", bg: "bg-slate-500/15 border-slate-500/30", text: "text-slate-400" },
  READY_CHECK: { label: "Ready Check", bg: "bg-sky-500/15 border-sky-500/30", text: "text-sky-400" },
  STARTING: { label: "Starting", bg: "bg-indigo-500/15 border-indigo-500/30", text: "text-indigo-400" },
  CREATED: { label: "Created", bg: "bg-slate-500/15 border-slate-500/30", text: "text-slate-400" },
  COMPLETED: { label: "Completed", bg: "bg-purple-500/15 border-purple-500/30", text: "text-purple-400" },
  ABANDONED: { label: "Abandoned", bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-500" },
  CLOSED: { label: "Closed", bg: "bg-slate-500/15 border-slate-500/30", text: "text-slate-400" },
};

export default function RoomInspectorDrawer() {
  const selectedRoomCode = useAdminLiveStore((s) => s.selectedRoomCode);
  const closeInspector = useAdminLiveStore((s) => s.closeInspector);
  const rooms = useAdminLiveStore((s) => s.rooms);
  const platform = useAdminLiveStore((s) => s.platform);

  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // Derive room directly from store's current rooms array (live reactive, zero stale copies)
  const room = rooms.find((r) => r.code === selectedRoomCode);

  const isOpen = Boolean(selectedRoomCode);
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Standard shared focus trap with focus restoration and Escape key handling
  const { containerRef: panelRef } = useFocusTrap<HTMLDivElement>({
    open: isOpen,
    onClose: closeInspector,
    initialFocusRef: closeBtnRef,
  });

  // Shared 1000ms clock tick for live countdowns
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const lifecycleMeta = room
    ? LIFECYCLE_LABEL_MAP[room.lifecycleState] ?? {
        label: room.lifecycleState,
        bg: "bg-slate-500/15 border-slate-500/30",
        text: "text-slate-400",
      }
    : null;

  // Active recoveries inside this specific room calculated authoritatively from currentTime:
  const activeRoomRecoveries =
    room?.players.filter((p) => {
      if (p.isConnected) return false;
      const remainingGraceMs = p.awayUntil === null ? 0 : Math.max(0, p.awayUntil - currentTime);
      return remainingGraceMs > 0;
    }) ?? [];

  const rejoinEligibleRoomRecoveries =
    room?.players.filter((p) => {
      if (p.isConnected) return false;
      const remainingGraceMs = p.awayUntil === null ? 0 : Math.max(0, p.awayUntil - currentTime);
      return remainingGraceMs > 0 && p.isEligibleForRejoin;
    }) ?? [];

  const longestRoomRecoveryMs = activeRoomRecoveries.reduce((max, p) => {
    const elapsed = p.awaySince ? Math.max(0, currentTime - p.awaySince) : 0;
    return Math.max(max, elapsed);
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeInspector();
        }
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div
        ref={panelRef}
        className="w-full max-w-2xl h-full bg-[var(--chrome-panel)] border-l border-[var(--chrome-border)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-control)]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id={titleId}
                  tabIndex={-1}
                  className="text-sm font-black text-[var(--chrome-ink)] outline-hidden font-mono"
                >
                  Room #{selectedRoomCode}
                </h2>
                {room && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${lifecycleMeta?.bg} ${lifecycleMeta?.text}`}
                  >
                    {lifecycleMeta?.label}
                  </span>
                )}
                {room?.sealed && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                    <Lock className="w-3 h-3" />
                    <span>Sealed</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--chrome-ink-soft)] capitalize">
                {room ? `${room.game} · Phase: ${room.phase}` : "Room Diagnostics"}
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeInspector}
            className="p-2 rounded-xl text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            aria-label="Close room inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!room ? (
            <div className="p-8 text-center space-y-3 bg-[var(--chrome-control)]/40 rounded-2xl border border-[var(--chrome-border)]">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
              <h3 className="text-sm font-bold text-[var(--chrome-ink)]">Room Closed or Concluded</h3>
              <p className="text-xs text-[var(--chrome-ink-soft)] max-w-sm mx-auto">
                Room #{selectedRoomCode} is no longer active in memory on the server.
              </p>
              <button
                type="button"
                onClick={closeInspector}
                className="mt-2 px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          ) : (
            <>
              {/* SECTION 1: ROOM & MATCH TIMELINES */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Room Timelines & State</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                  <div>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] font-semibold block">
                      Created At
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--chrome-ink)] block">
                      {formatClockTime(room.createdAt)}
                    </span>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block">
                      {formatAge(room.createdAt)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] font-semibold block">
                      Match Started
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--chrome-ink)] block">
                      {room.matchStartedAt ? formatClockTime(room.matchStartedAt) : "—"}
                    </span>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block">
                      {room.matchStartedAt ? formatAge(room.matchStartedAt) : "Not started"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] font-semibold block">
                      Room Lifecycle
                    </span>
                    <span className="text-xs font-bold text-[var(--chrome-ink)] block uppercase">
                      {room.lifecycleState}
                    </span>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block">
                      Phase: {room.phase}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] font-semibold block">
                      Active Duration
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--chrome-ink)] block">
                      {formatDuration(room.matchDurationMs)}
                    </span>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block">
                      {room.phase === "playing" ? "In match" : "Room lifetime"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: HOST INFORMATION */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Host Information</span>
                </h3>

                <div className="p-3.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)] flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--chrome-ink)]">
                        {room.host.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                        Host
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--chrome-panel)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]">
                        {room.host.isGuest ? "Guest Account" : "Member Account"}
                      </span>
                    </div>
                  </div>

                  <div>
                    {room.host.isConnected ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Connected
                      </span>
                    ) : room.host.inGrace ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        In Grace Period
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: ROOM SEAT STATISTICS */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Room Seat Statistics</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block font-semibold">Total Players</span>
                    <span className="text-base font-extrabold text-[var(--chrome-ink)]">{room.playerCount}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block font-semibold">Humans / Bots</span>
                    <span className="text-base font-extrabold text-[var(--chrome-ink)]">
                      {room.humanCount} / {room.botCount}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block font-semibold">Connected / Disconnected</span>
                    <span className="text-base font-extrabold text-[var(--chrome-ink)]">
                      {room.playerCount - room.disconnectedCount} / {room.disconnectedCount}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block font-semibold">Active Recoveries</span>
                    <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                      {activeRoomRecoveries.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PLAYER SEATS MATRIX */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Player Seats Diagnostics ({room.players.length})</span>
                  </span>
                </h3>

                <div className="space-y-2.5">
                  {room.players.map((player: OperationalPlayerSummary) => {
                    const remainingGraceMs = player.awayUntil ? Math.max(0, player.awayUntil - currentTime) : null;
                    const elapsedAwayMs = player.awaySince ? Math.max(0, currentTime - player.awaySince) : null;

                    return (
                      <div
                        key={player.id}
                        className="p-3 rounded-xl bg-[var(--chrome-control)]/70 border border-[var(--chrome-border)] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-[var(--chrome-ink)]">
                                {player.name}
                              </span>
                              {player.isHost && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                  Host
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--chrome-panel)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]">
                                {player.playerType === "bot" ? "AI Bot" : player.accountType}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {player.isConnected ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Connected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                Disconnected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Telemetry metadata */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] p-2 rounded-lg bg-[var(--chrome-panel)]/80 border border-[var(--chrome-border)]">
                          <div>
                            <span className="text-[var(--chrome-ink-soft)] block font-semibold">Seat Status</span>
                            <span className="font-bold text-[var(--chrome-ink)] capitalize">
                              {player.seatStatus.replace("_", " ")}
                            </span>
                          </div>

                          <div>
                            <span className="text-[var(--chrome-ink-soft)] block font-semibold">Rejoin Eligible</span>
                            <span className="font-bold text-[var(--chrome-ink)]">
                              {player.isEligibleForRejoin ? "Yes" : "No"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[var(--chrome-ink-soft)] block font-semibold">Remaining Grace</span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              {remainingGraceMs !== null ? formatSeconds(remainingGraceMs) : "—"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[var(--chrome-ink-soft)] block font-semibold">Auto Turns / Cap</span>
                            <span className="font-mono font-bold text-[var(--chrome-ink)]">
                              {player.autoTurnsPlayed} / {player.autoTurnCap !== null && player.autoTurnCap !== undefined ? player.autoTurnCap : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 5: MATCH DIAGNOSTICS & ENGINE SUMMARY */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Match Diagnostics</span>
                </h3>

                <div className="p-3.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--chrome-ink-soft)]">Current Turn Player:</span>
                    <span className="font-bold text-[var(--chrome-ink)]">
                      {room.diagnostics?.currentTurnPlayerName ?? "Not available"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--chrome-ink-soft)]">Match Status:</span>
                    <span className="font-bold text-[var(--chrome-ink)]">
                      {room.diagnostics?.matchStatus ?? "Not available"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--chrome-ink-soft)]">Match Duration:</span>
                    <span className="font-mono font-bold text-[var(--chrome-ink)]">
                      {formatDuration(room.diagnostics?.matchDurationMs ?? room.matchDurationMs)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 6: ROOM RECOVERY DIAGNOSTICS */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Recovery Diagnostics (Room Scope)</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block font-semibold">Active in Room</span>
                    <span className="text-sm font-bold text-[var(--chrome-ink)]">{activeRoomRecoveries.length}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block font-semibold">Rejoin Eligible</span>
                    <span className="text-sm font-bold text-sky-500">
                      {rejoinEligibleRoomRecoveries.length}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)]">
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] block font-semibold">Longest Active</span>
                    <span className="text-sm font-mono font-bold text-[var(--chrome-ink)]">
                      {formatSeconds(longestRoomRecoveryMs)}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--chrome-ink-soft)] italic pt-1">
                  Platform-wide recovery success rate:{" "}
                  <span className="font-bold">
                    {platform?.recoverySuccessRate !== null && platform?.recoverySuccessRate !== undefined
                      ? `${platform.recoverySuccessRate}%`
                      : "N/A"}
                  </span>{" "}
                  (since server process start).
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
