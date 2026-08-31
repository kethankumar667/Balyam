import { UserX, ShieldAlert, Clock, CheckCircle2 } from "lucide-react";
import { useAdminLiveStore } from "../../../store/adminLiveStore";

function formatSeconds(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LiveRecoveryPanel() {
  const recovery = useAdminLiveStore((s) => s.recovery);
  const seats = recovery?.seats ?? [];

  return (
    <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[var(--chrome-hairline)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink)]">
              Recovery Sentinel
            </h2>
            <p className="text-[11px] text-[var(--chrome-ink-soft)]">
              Disconnected players in grace period
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          {seats.length} Active
        </span>
      </div>

      {/* Seats List or Empty Sentinel */}
      {seats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 text-[var(--chrome-ink-soft)]">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-xs font-bold text-[var(--chrome-ink)]">All Player Seats Connected</p>
          <p className="text-[11px] max-w-xs">
            Zero active player disconnects or pending grace periods on the server.
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-96 pr-1">
          {seats.map((seat) => {
            const progressPercent = seat.gracePeriodMs > 0
              ? Math.max(0, Math.min(100, Math.round((seat.remainingGraceMs / seat.gracePeriodMs) * 100)))
              : 0;

            return (
              <div
                key={`${seat.roomCode}-${seat.playerId}`}
                className="p-3.5 rounded-xl bg-[var(--chrome-control)]/70 border border-[var(--chrome-border)] space-y-2.5"
              >
                {/* Header: Name, Room, Game */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs text-[var(--chrome-ink)] block">
                      {seat.playerName}
                    </span>
                    <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono">
                      Room: #{seat.roomCode} ({seat.game})
                    </span>
                  </div>

                  {seat.isAutoPlaying ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      Auto-Play
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Holding Seat
                    </span>
                  )}
                </div>

                {/* Grace Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[var(--chrome-ink-soft)] font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Away: {Math.round(seat.awayDurationMs / 1000)}s</span>
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatSeconds(seat.remainingGraceMs)} left
                    </span>
                  </div>

                  <div className="w-full bg-[var(--chrome-panel)] h-1.5 rounded-full overflow-hidden border border-[var(--chrome-border)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progressPercent > 30 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Auto-play strikes and details */}
                {(seat.idleStrikes > 0 || seat.autoTurnsPlayed > 0) && (
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-[var(--chrome-ink-soft)] border-t border-[var(--chrome-hairline)]">
                    {seat.idleStrikes > 0 && <span>Idle strikes: {seat.idleStrikes}/2</span>}
                    {seat.autoTurnsPlayed > 0 && <span>Turns played: {seat.autoTurnsPlayed}</span>}
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
