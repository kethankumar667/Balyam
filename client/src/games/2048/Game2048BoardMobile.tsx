import { memo } from "react";
import Grid2048 from "./Grid2048";
import Game2048ModeMenu from "./Game2048ModeMenu";
import { type UseGame2048Result, TARGET_TILE } from "./useGame2048";
import { Trophy, RotateCcw, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Volume2, VolumeX, Undo2 } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";

export interface Game2048BoardMobileProps {
  game: UseGame2048Result;
  onExit?: () => void;
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function Game2048BoardMobile({ game, onExit }: Game2048BoardMobileProps) {
  const { settings, toggleMute } = useAudio();

  if (game.mode == null) {
    return (
      <Game2048ModeMenu
        bestScore={game.allBestScores}
        bestRaceTimeMs={game.bestRaceTimeMs}
        onSelect={game.selectMode}
        onExit={onExit}
      />
    );
  }

  const mm = game.secondsLeft != null ? Math.floor(game.secondsLeft / 60) : 0;
  const ss = game.secondsLeft != null ? game.secondsLeft % 60 : 0;
  const urgent = game.secondsLeft != null && game.secondsLeft <= 10;

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#F7F3EB] dark:bg-[#070B14] flex flex-col items-center justify-between p-3 sm:p-4 select-none overflow-y-auto">
      {/* Mobile Top Navigation */}
      <header className="w-full max-w-sm flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={game.backToMenu}
          className="min-h-[44px] min-w-[44px] px-3 rounded-2xl text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-sm hover:bg-white dark:hover:bg-stone-800 transition flex items-center gap-1"
        >
          <span>← Menu</span>
        </button>

        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          <span className="text-xs font-black uppercase tracking-widest">
            {game.mode}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={settings.isMuted ? "Unmute audio" : "Mute audio"}
            className="min-h-[44px] min-w-[44px] p-2 rounded-2xl text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-sm hover:bg-white dark:hover:bg-stone-800 transition flex items-center justify-center"
          >
            {settings.isMuted ? (
              <VolumeX className="w-4 h-4 text-stone-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-500" />
            )}
          </button>
          <button
            type="button"
            onClick={game.restart}
            className="min-h-[44px] px-3 rounded-2xl text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-sm hover:bg-white dark:hover:bg-stone-800 transition flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="w-full max-w-sm flex-1 flex flex-col justify-center space-y-2.5 my-1">
        {/* Score & Best Dual Stat Card */}
        <section aria-label="Game Scores" className="grid grid-cols-2 gap-2">
          <div className="relative p-2.5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-md flex flex-col items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Score
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {game.score.toLocaleString()}
            </span>
            {game.combo >= 2 && (
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] uppercase tracking-wide shadow">
                {game.combo}x Combo
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-md flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>Best</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-stone-800 dark:text-stone-200 tabular-nums">
              {game.mode === "race"
                ? game.bestRaceTimeMs != null
                  ? formatMs(game.bestRaceTimeMs)
                  : "—"
                : game.bestScore.toLocaleString()}
            </span>
          </div>
        </section>

        {/* Dynamic Lounge Chronicler Emotional Banner */}
        <div className="px-3 py-1.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 text-center text-[11px] font-medium text-amber-800 dark:text-amber-200/90 shadow-sm leading-snug">
          {game.chroniclerQuote}
        </div>

        {/* Mode HUD Strip */}
        {game.mode === "battle" && (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm">
            <span>⚔️ Score {game.score}</span>
            <span className="text-[11px] opacity-80">Best {game.bestScore}</span>
          </div>
        )}
        {game.mode === "race" && (
          <div className="px-3 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300 shadow-sm">
            <span>🏁 Race to {TARGET_TILE}</span>
            <span className="font-mono tabular-nums text-sm">
              {game.elapsedMs != null ? formatMs(game.elapsedMs) : "0.0s"}
            </span>
          </div>
        )}
        {game.mode === "timeattack" && (
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-2xl border text-xs font-bold shadow-sm ${
              urgent
                ? "bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300 animate-pulse"
                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            <span>⏱ Score {game.score}</span>
            <span className="font-mono tabular-nums text-sm font-black">
              {`${mm}:${String(ss).padStart(2, "0")}`}
            </span>
          </div>
        )}
        {game.mode === "zen" && (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm">
            <span>🧘 Score {game.score}</span>
            <button
              type="button"
              onClick={game.undo}
              disabled={game.undosLeft <= 0 || game.isOver}
              className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo ({game.undosLeft})</span>
            </button>
          </div>
        )}

        {/* 2048 Grid with touch swipe listener */}
        <div
          onTouchStart={game.onTouchStart}
          onTouchEnd={game.onTouchEnd}
          className="touch-none w-full"
        >
          <Grid2048
            grid={game.grid}
            label="2048 board"
            lastScoreGained={game.lastScoreGained}
            scoreGainedId={game.scoreGainedId}
          />
        </div>

        {/* Tactile Mini Directional Pad for Commuters / One-Handed Play */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => game.move("up")}
            aria-label="Slide Up"
            className="w-11 h-11 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => game.move("left")}
              aria-label="Slide Left"
              className="w-11 h-11 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => game.move("down")}
              aria-label="Slide Down"
              className="w-11 h-11 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => game.move("right")}
              aria-label="Slide Right"
              className="w-11 h-11 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-stone-500 dark:text-stone-400">
          Swipe or use arrow keys to slide the board.
        </p>

        {/* Game Over / Victory Screen */}
        {game.isOver && (
          <div className="rounded-3xl border-2 border-amber-500/40 bg-white/95 dark:bg-stone-900/95 p-4 space-y-3 text-center shadow-2xl backdrop-blur-xl">
            <p className="font-black text-base text-stone-900 dark:text-amber-200">
              {game.mode === "race" && game.reachedTarget
                ? `You reached ${TARGET_TILE}!`
                : game.mode === "race"
                  ? "No moves left"
                  : "Game over"}
            </p>
            {game.isNewBest && (
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                New best!
              </p>
            )}
            <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
              {game.mode === "race"
                ? game.elapsedMs != null
                  ? `Time: ${formatMs(game.elapsedMs)}`
                  : null
                : `Score: ${game.score}`}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={game.restart}
                className="min-h-[44px] px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={game.backToMenu}
                className="min-h-[44px] px-4 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-black text-xs uppercase tracking-wider hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition"
              >
                Change Mode
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default memo(Game2048BoardMobile);
