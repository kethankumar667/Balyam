import { Users as UsersLucideIcon, Gamepad2 } from "lucide-react";
import { useTheme } from "../../lib/useTheme";

export function PlayYourWaySection({
  onPlayFriends,
  onPlayBots,
}: {
  onPlayFriends: () => void;
  onPlayBots: () => void;
}) {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="mb-5 sm:mb-6">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#7B2F0E] dark:text-amber-400">
          ✦ PLAY YOUR WAY ✦
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Play with Friends */}
        <button
          type="button"
          onClick={onPlayFriends}
          className={`p-4 rounded-2xl sm:rounded-3xl border text-left flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition active:scale-[0.99] cursor-pointer group min-h-[48px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131926] motion-reduce:hover:transform-none ${
            isDark
              ? "bg-[#131926] border-white/10 hover:border-amber-500/40"
              : "bg-[#FFFDF7] border-[#ECD9BA] hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform motion-reduce:transform-none">
              <UsersLucideIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-[15px] font-black tracking-tight ${isDark ? "text-white" : "text-[#1D2C4A]"}`}>
                Play with Friends
              </h3>
              <p className="text-xs font-medium text-[#6B5E52] dark:text-zinc-400 mt-0.5 truncate">
                Join or host a multiplayer lounge table
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0 font-mono">
            Join Room →
          </span>
        </button>

        {/* 2. Play with Bots */}
        <button
          type="button"
          onClick={onPlayBots}
          className={`p-4 rounded-2xl sm:rounded-3xl border text-left flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition active:scale-[0.99] cursor-pointer group min-h-[48px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131926] motion-reduce:hover:transform-none ${
            isDark
              ? "bg-[#131926] border-white/10 hover:border-emerald-500/40"
              : "bg-[#FFFDF7] border-[#ECD9BA] hover:border-emerald-500/50"
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform motion-reduce:transform-none">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-[15px] font-black tracking-tight ${isDark ? "text-white" : "text-[#1D2C4A]"}`}>
                Play with Bots
              </h3>
              <p className="text-xs font-medium text-[#6B5E52] dark:text-zinc-400 mt-0.5 truncate">
                Solo instant play against smart AI
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
            Choose Game →
          </span>
        </button>
      </div>
    </section>
  );
}
