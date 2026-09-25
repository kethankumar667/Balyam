import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { findAvatar } from "../../lib/avatars";

export interface TvTurnTimerProps {
  deadlineMs: number | null;
  totalSeconds?: number;
  playerName: string;
  playerAvatar?: string;
  playerColor?: string;
  actionText?: string;
}

export function TvTurnTimer({
  deadlineMs,
  totalSeconds = 30,
  playerName,
  playerAvatar,
  playerColor,
  actionText,
}: TvTurnTimerProps) {
  const [announcement, setAnnouncement] = useState("");
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (!deadlineMs) return totalSeconds;
    return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!deadlineMs) {
      setRemainingSec(totalSeconds);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSec(remaining);
    };

    update();
    const interval = window.setInterval(update, 250);
    return () => {
      window.clearInterval(interval);
    };
  }, [deadlineMs, totalSeconds]);

  useEffect(() => {
    if (remainingSec === 5 || remainingSec === 3 || remainingSec === 1) {
      setAnnouncement(`${remainingSec} seconds remaining for ${playerName}.`);
    }
  }, [playerName, remainingSec]);

  const isUrgent = remainingSec <= 5;
  const progressPercent = Math.min(100, Math.max(0, (remainingSec / totalSeconds) * 100));
  const avatarObj = playerAvatar ? findAvatar(playerAvatar) : null;

  return (
    <div
      className={`w-full max-w-4xl mx-auto flex items-center justify-between gap-6 px-6 py-3.5 rounded-2xl border transition-all duration-300 ${
        isUrgent
          ? "bg-rose-950/70 border-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse"
          : "bg-black/50 border-amber-900/40 shadow-xl"
      }`}
    >
      {/* Active Player Spotlight */}
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 flex-shrink-0 shadow-md"
          style={{ borderColor: playerColor || (isUrgent ? "#EF4444" : "#F59E0B") }}
        >
          {avatarObj?.src ? (
            <img src={avatarObj.src} alt={playerName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-stone-800 flex items-center justify-center font-black text-amber-200 text-lg">
              {playerName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Active Turn
            </span>
            {actionText && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {actionText}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-amber-100 truncate">
            {playerName}
          </h2>
        </div>
      </div>

      {/* Countdown Timer Display */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Progress Bar for Couch Visibility */}
        <div className="hidden sm:block w-48 h-3 bg-stone-800/80 rounded-full overflow-hidden border border-stone-700/50">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              isUrgent
                ? "bg-gradient-to-r from-rose-500 to-red-600"
                : "bg-gradient-to-r from-amber-400 to-orange-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Big Digital Seconds Counter */}
        <div
          aria-hidden="true"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-black text-2xl sm:text-3xl tabular-nums shadow-inner ${
            isUrgent
              ? "bg-rose-500/20 text-rose-300 border-rose-500/60"
              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
          }`}
        >
          <Clock className={`w-6 h-6 ${isUrgent ? "text-rose-400 animate-spin" : "text-amber-400"}`} />
          <span>{remainingSec}s</span>
        </div>
        <span className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </div>
  );
}
