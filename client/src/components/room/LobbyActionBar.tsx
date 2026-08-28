export default function LobbyActionBar({
  isHost,
  isReady,
  canStart,
  startGameDisabledReason,
  readyCount,
  totalCount,
  commitmentCoins,
  onToggleReady,
  onStartGame,
  variant = "desktop-panel",
}: {
  isHost: boolean;
  isReady: boolean;
  canStart: boolean;
  startGameDisabledReason: string | null;
  readyCount: number;
  totalCount: number;
  /**
   * The authoritative, server-quoted total commitment for this table — the
   * SAME quote `LobbyPrizePool` displays. `undefined`/`null` means no
   * authoritative figure is available yet (still loading, or an
   * unsupported seat count); the button then shows a plain "Start Game"
   * with no invented amount, never a locally computed guess.
   */
  commitmentCoins?: string | null;
  onToggleReady: () => void;
  onStartGame: () => void;
  variant?: "sticky-mobile" | "desktop-panel";
}) {
  const readyRatioText = `${readyCount} of ${totalCount} ready`;
  const hasCost = commitmentCoins !== undefined && commitmentCoins !== null;
  const startLabel = hasCost ? `Start Game (🪙 ${commitmentCoins})` : "Start Game";

  if (variant === "sticky-mobile") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-[#0F1420]/95 backdrop-blur-md border-t border-[#EEDBCA] dark:border-slate-800 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
        <div className="max-w-md mx-auto space-y-2">
          {/* Readiness text & reason banner */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-extrabold text-[#2B3550] dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {readyRatioText}
            </span>

            {isHost && !canStart && (
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 truncate max-w-[180px]">
                {startGameDisabledReason}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleReady}
              className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                isReady
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 ring-2 ring-amber-400/30"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-900/20 ring-2 ring-emerald-500/30"
              }`}
            >
              <span className="text-base">{isReady ? "✓" : "⚡"}</span>
              <span>{isReady ? "Ready (Cancel)" : "I'm Ready"}</span>
            </button>

            {isHost && (
              <button
                type="button"
                onClick={onStartGame}
                disabled={!canStart}
                aria-disabled={!canStart}
                aria-label={canStart ? startLabel : "Start Game disabled"}
                className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${
                  canStart
                    ? "bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-orange-900/30 cursor-pointer ring-2 ring-orange-500/30 animate-pulse"
                    : "bg-[#EFE4D2] dark:bg-slate-800 text-[#8C7A67] dark:text-slate-500 cursor-not-allowed border border-[#E1CFB1] dark:border-slate-700"
                }`}
              >
                <span className="text-xs">▶</span>
                <span>{startLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop panel variant
  return (
    <div className="bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header with Readiness meter */}
      <div className="flex items-center justify-between pb-1 border-b border-[#EEDBCA]/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">🏁</span>
          <h2 className="text-xs uppercase tracking-wider text-[#5C4328] dark:text-slate-300 font-extrabold">
            Table Status
          </h2>
        </div>

        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          {readyRatioText}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onToggleReady}
          className={`w-full min-h-[48px] px-6 py-3 rounded-2xl font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
            isReady
              ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 ring-4 ring-amber-400/20"
              : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-900/20 ring-4 ring-emerald-500/20"
          }`}
        >
          <span className="text-base">{isReady ? "✓" : "⚡"}</span>
          <span>{isReady ? "Ready (Cancel)" : "I'm Ready"}</span>
        </button>

        {isHost && (
          <button
            type="button"
            onClick={onStartGame}
            disabled={!canStart}
            aria-disabled={!canStart}
            aria-label={canStart ? startLabel : "Start Game disabled"}
            className={`w-full min-h-[48px] px-6 py-3 rounded-2xl font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
              canStart
                ? "bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-orange-900/30 cursor-pointer ring-4 ring-orange-500/20 animate-pulse"
                : "bg-[#EFE4D2] dark:bg-slate-800 text-[#8C7A67] dark:text-slate-500 cursor-not-allowed border border-[#E1CFB1] dark:border-slate-700"
            }`}
          >
            <span className="text-xs">▶</span>
            <span>{startLabel}</span>
          </button>
        )}
      </div>

      {isHost && !canStart && (
        <p className="text-[11px] text-[#8A6D4B] dark:text-slate-400 font-medium text-center bg-[#FFF4E0]/50 dark:bg-slate-800/40 border border-[#EEDBCA]/60 dark:border-slate-700/60 rounded-xl p-2">
          {startGameDisabledReason}
        </p>
      )}
    </div>
  );
}
