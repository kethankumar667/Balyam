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
  commitmentCoins?: string | null;
  onToggleReady: () => void;
  onStartGame: () => void;
  variant?: "sticky-mobile" | "desktop-panel";
}) {
  const readyRatioText = `${readyCount} of ${totalCount} ready`;
  const isFree = commitmentCoins === "0";
  const hasCost = commitmentCoins !== undefined && commitmentCoins !== null;
  const startLabel = isFree
    ? "Start Game (Free)"
    : hasCost
    ? `Start Game (🪙 ${commitmentCoins})`
    : "Start Game";

  const allReady = readyCount >= totalCount && totalCount > 0;

  // Sticky Bar Layout (used across mobile and tablet dock)
  if (variant === "sticky-mobile") {
    return (
      <div
        data-testid="lobby-action-bar-mobile"
        className="fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-[#0F1420]/95 backdrop-blur-md border-t border-stone-200/90 dark:border-slate-800 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Readiness Status & Subtitle */}
          <div role="status" aria-live="polite" className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
            <span
              className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                allReady
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${allReady ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
              <span>{readyRatioText}</span>
            </span>
            <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
              {allReady ? "All players ready to play!" : "Waiting for everyone to be ready"}
            </span>
          </div>

          {/* Center & Right Actions */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center">
            {/* Ready Toggle Button */}
            <button
              id="lobby-ready-btn-mobile"
              type="button"
              onClick={onToggleReady}
              aria-pressed={isReady}
              aria-label={isReady ? "Ready (Cancel)" : "I'm Ready"}
              className={`flex-1 sm:flex-initial min-h-[48px] px-6 sm:px-8 py-2.5 rounded-full font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                isReady
                  ? "bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border-2 border-amber-400/80 ring-2 ring-amber-400/20"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-900/20 ring-2 ring-emerald-500/25"
              }`}
            >
              <span className="text-base">{isReady ? "✓" : "⚡"}</span>
              <span className="whitespace-nowrap">{isReady ? "Ready (Cancel)" : "I'm Ready"}</span>
            </button>

            {/* Host Start Game Button */}
            {isHost && (
              <div className="flex-1 sm:flex-initial flex flex-col items-center">
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={!canStart}
                  aria-disabled={!canStart}
                  aria-label={canStart ? startLabel : "Start Game disabled"}
                  className={`w-full sm:w-auto min-h-[48px] px-6 sm:px-8 py-2.5 rounded-full font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                    canStart
                      ? "bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-orange-900/30 cursor-pointer ring-2 ring-orange-500/30 animate-pulse"
                      : "bg-stone-200/80 dark:bg-slate-800 text-stone-400 dark:text-slate-500 cursor-not-allowed border border-stone-300/80 dark:border-slate-700"
                  }`}
                >
                  <span className="text-xs">▶</span>
                  <span className="whitespace-nowrap">{startLabel}</span>
                </button>
                {!canStart && (
                  <span className="text-[10px] text-stone-400 dark:text-slate-500 font-medium mt-0.5 hidden xs:inline">
                    Requires all players to be ready
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Panel Variant
  return (
    <div className="bg-white dark:bg-[#131926] border border-stone-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4.5 shadow-xs space-y-3">
      {/* Header with Readiness meter */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">🏁</span>
          <h2 className="text-xs uppercase tracking-wider text-[#2B3550] dark:text-slate-200 font-black">
            Table Status
          </h2>
        </div>

        <span
          role="status"
          aria-live="polite"
          className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
        >
          {readyRatioText}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5">
        <button
          id="lobby-ready-btn-desktop"
          type="button"
          onClick={onToggleReady}
          aria-pressed={isReady}
          aria-label={isReady ? "Ready (Cancel)" : "I'm Ready"}
          className={`w-full min-h-[48px] px-5 py-2.5 rounded-full font-black text-xs sm:text-sm transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            isReady
              ? "bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border-2 border-amber-400/80 ring-2 ring-amber-400/20"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-900/20 ring-2 ring-emerald-500/20"
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
            className={`w-full min-h-[48px] px-5 py-2.5 rounded-full font-black text-xs sm:text-sm transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
              canStart
                ? "bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-orange-900/30 cursor-pointer ring-2 ring-orange-500/20 animate-pulse"
                : "bg-stone-200/80 dark:bg-slate-800 text-stone-400 dark:text-slate-500 cursor-not-allowed border border-stone-300/80 dark:border-slate-700"
            }`}
          >
            <span className="text-xs">▶</span>
            <span className="whitespace-nowrap font-black">{startLabel}</span>
          </button>
        )}
      </div>

      {isHost && !canStart && (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-[11px] text-amber-800 dark:text-amber-300 font-medium text-center bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60 rounded-xl py-1.5 px-2.5"
        >
          {startGameDisabledReason || "Requires all players to be ready"}
        </p>
      )}
    </div>
  );
}
