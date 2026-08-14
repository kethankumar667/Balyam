import type { Player } from "@shared/types";
import SeatAvatar from "./profile/SeatAvatar";

export default function PlayerList({
  players,
  selfId,
  onTapPlayer,
}: {
  players: Player[];
  selfId: string | null;
  onTapPlayer?: (id: string) => void;
}) {
  return (
    <div className="bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1.5">
          <span aria-hidden>👥</span>
          <span>Players ({players.length})</span>
        </h3>
      </div>

      <ul
        className="space-y-1.5 overflow-y-auto pr-1 custom-scrollbar max-h-[14rem]"
      >
        {players.map((p) => (
          <li
            key={p.id}
            onClick={p.id !== selfId && onTapPlayer ? () => onTapPlayer(p.id) : undefined}
            role={p.id !== selfId && onTapPlayer ? "button" : undefined}
            tabIndex={p.id !== selfId && onTapPlayer ? 0 : undefined}
            className={`flex items-center gap-2.5 bg-[#FFF9EE] dark:bg-[#182234] border border-[#EEDBCA] dark:border-slate-700/60 rounded-xl px-3 py-1.5 transition ${
              p.id !== selfId && onTapPlayer ? "cursor-pointer hover:bg-[#FFF4E0] dark:hover:bg-[#1E2738] active:scale-[0.99]" : ""
            }`}
          >
            {/* Avatar with presence ring */}
            <span className="relative flex-shrink-0">
              <SeatAvatar avatar={p.avatar} name={p.name} className="w-7 h-7" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#FFF9EE] dark:ring-[#182234] ${
                  p.isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
                title={p.isConnected ? "Online" : "Reconnecting..."}
              />
            </span>

            {/* Name + details */}
            <div className="flex-1 min-w-0 flex items-center gap-1">
              <span className="truncate font-semibold text-xs sm:text-sm text-[#2B3550] dark:text-slate-100">
                {p.name}
              </span>
              {p.id === selfId && (
                <span className="text-[11px] text-[#8A6D4B] dark:text-slate-400">
                  (you)
                </span>
              )}
              {p.isHost && (
                <span className="text-amber-500 text-xs" title="Room Host">
                  👑
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5">
              {p.isAutoPlaying && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  title="Auto-playing"
                >
                  Auto
                </span>
              )}
              {p.isHost && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider bg-orange-500/10 text-[#EA5A1F] dark:text-orange-400 border border-[#EA5A1F]/30 rounded-full px-2 py-0.2">
                  Host
                </span>
              )}
              {p.isReady ? (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
              ) : (
                <span className="text-xs font-bold text-[#8A6D4B] dark:text-slate-500">
                  •••
                </span>
              )}
              {p.id !== selfId && onTapPlayer && (
                <button
                  type="button"
                  className="text-xs text-[#8A6D4B] hover:text-[#EA5A1F]"
                  title={`React at ${p.name}`}
                >
                  🎯
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1.5 text-[11px] text-[#8A6D4B] dark:text-slate-400 font-medium">
        <span aria-hidden>👥</span>
        <span>{players.length >= 6 ? "Table full · All ready!" : "Waiting for players..."}</span>
      </div>
    </div>
  );
}

