import { memo } from "react";
import Grid2048 from "./Grid2048";
import Game2048ModeMenu from "./Game2048ModeMenu";
import { type UseGame2048Result, TARGET_TILE } from "./useGame2048";
import { getTileVisual } from "./tileStyles";
import { Trophy, RotateCcw, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Volume2, VolumeX, Undo2, Award, Zap, Compass } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";

export interface Game2048BoardDesktopProps {
  game: UseGame2048Result;
  onExit?: () => void;
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function Game2048BoardDesktop({ game, onExit }: Game2048BoardDesktopProps) {
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
  const highestMeta = getTileVisual(game.highestTile > 0 ? game.highestTile : 2);

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#F7F3EB] dark:bg-[#070B14] flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-y-auto">
      {/* Top Lounge Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={game.backToMenu}
            className="min-h-[44px] px-4 rounded-2xl text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition flex items-center gap-1.5"
          >
            <span>← Menu</span>
          </button>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest">
            <span>2048 • {game.mode}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={settings.isMuted ? "Unmute audio" : "Mute audio"}
            className="min-h-[44px] px-3.5 rounded-2xl text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition flex items-center gap-2 text-xs font-bold"
          >
            {settings.isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-stone-400" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-amber-500" />
                <span>Audio On</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={game.restart}
            className="min-h-[44px] px-4 rounded-2xl text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </header>

      {/* 3-Column Desktop Command Arena */}
      <main className="w-full max-w-6xl flex-1 grid grid-cols-12 gap-6 items-center my-4">
        {/* Left Wing: Run Analytics & Lore */}
        <div className="col-span-3 space-y-4">
          {/* Highest Tile Glory Card */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Highest Fusion
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {highestMeta.tier}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow"
                style={{
                  background: highestMeta.bg,
                  color: highestMeta.text,
                  border: `1px solid ${highestMeta.border}`,
                }}
              >
                {game.highestTile > 0 ? game.highestTile : "—"}
              </div>
              <div>
                <p className="font-black text-sm text-stone-900 dark:text-stone-100">
                  {game.highestTile > 0 ? highestMeta.title : "Seed Phase"}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {game.highestTile >= 2048
                    ? "Conquered Apex"
                    : game.highestTile >= 512
                      ? "Precipice of Victory"
                      : "Ascending Ladder"}
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Match Telemetry */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Run Diagnostics
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Total Moves</span>
                <span className="font-bold tabular-nums text-stone-800 dark:text-stone-200">{game.moveCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Total Merges</span>
                <span className="font-bold tabular-nums text-stone-800 dark:text-stone-200">{game.mergeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Active Combo</span>
                <span className="font-bold tabular-nums text-amber-500">{game.combo}x</span>
              </div>
            </div>
          </div>

          {/* Strategic Chronicler Advice */}
          <div className="p-4 rounded-3xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 shadow-md space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <Compass className="w-3.5 h-3.5" />
              <span>Chronicler's Counsel</span>
            </div>
            <p className="text-xs text-stone-700 dark:text-amber-200/90 leading-relaxed italic">
              "{game.chroniclerQuote}"
            </p>
          </div>
        </div>

        {/* Center Stage: The Grand Table */}
        <div className="col-span-6 flex flex-col items-center space-y-3.5">
          {/* Dual Score & Best HUD Display */}
          <div className="w-full max-w-md grid grid-cols-2 gap-3">
            <div className="relative p-3 rounded-2xl bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-800 shadow-md flex flex-col items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Score
              </span>
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {game.score.toLocaleString()}
              </span>
              {game.combo >= 2 && (
                <span className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] uppercase tracking-wide shadow">
                  {game.combo}x Fusion Combo
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-800 shadow-md flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Personal Best</span>
              </div>
              <span className="text-3xl font-black text-stone-800 dark:text-stone-200 tabular-nums">
                {game.mode === "race"
                  ? game.bestRaceTimeMs != null
                    ? formatMs(game.bestRaceTimeMs)
                    : "—"
                  : game.bestScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Mode-Specific Status Strip */}
          <div className="w-full max-w-md">
            {game.mode === "battle" && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm">
                <span>⚔️ Score {game.score}</span>
                <span>Best {game.bestScore}</span>
              </div>
            )}
            {game.mode === "race" && (
              <div className="px-4 py-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300 shadow-sm">
                <span>🏁 Race to {TARGET_TILE}</span>
                <span className="font-mono tabular-nums text-sm">
                  {game.elapsedMs != null ? formatMs(game.elapsedMs) : "0.0s"}
                </span>
              </div>
            )}
            {game.mode === "timeattack" && (
              <div
                className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border text-xs font-bold shadow-sm ${
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
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm">
                <span>🧘 Score {game.score}</span>
                <button
                  type="button"
                  onClick={game.undo}
                  disabled={game.undosLeft <= 0 || game.isOver}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo ({game.undosLeft})</span>
                </button>
              </div>
            )}
          </div>

          {/* The Grand 2048 Grid */}
          <div
            onTouchStart={game.onTouchStart}
            onTouchEnd={game.onTouchEnd}
            className="w-full max-w-md relative"
          >
            <Grid2048
              grid={game.grid}
              label="2048 board"
              lastScoreGained={game.lastScoreGained}
              scoreGainedId={game.scoreGainedId}
            />
          </div>

          <p className="text-center text-xs text-stone-500 dark:text-stone-400">
            Swipe or use arrow keys to slide the board.
          </p>

          {/* Game Over / Victory Screen */}
          {game.isOver && (
            <div className="w-full max-w-md rounded-3xl border-2 border-amber-500/40 bg-white/95 dark:bg-stone-900/95 p-5 space-y-3 text-center shadow-2xl backdrop-blur-xl animate-fade-in">
              <p className="font-black text-lg text-stone-900 dark:text-amber-200">
                {game.mode === "race" && game.reachedTarget
                  ? `You reached ${TARGET_TILE}!`
                  : game.mode === "race"
                    ? "No moves left"
                    : "Game over"}
              </p>
              {game.isNewBest && (
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
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
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={game.restart}
                  className="min-h-[44px] px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-xl active:scale-95 transition"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={game.backToMenu}
                  className="min-h-[44px] px-5 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-black text-xs uppercase tracking-wider hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition"
                >
                  Change Mode
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Wing: Hall of Fame & Tactical Controls */}
        <div className="col-span-3 space-y-4">
          {/* Hall of Fame Panel */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Lounge Hall of Fame</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">⚔️ Battle</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                  {game.allBestScores.battle > 0 ? game.allBestScores.battle.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">🏁 Race</span>
                <span className="font-mono font-black text-sky-600 dark:text-sky-400">
                  {game.bestRaceTimeMs != null ? formatMs(game.bestRaceTimeMs) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">⏱ Time Attack</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                  {game.allBestScores.timeattack > 0 ? game.allBestScores.timeattack.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">🧘 Zen</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {game.allBestScores.zen > 0 ? game.allBestScores.zen.toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Tactical Mouse Directional Pad */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Tactical Controls
            </span>
            <div className="flex flex-col items-center gap-1.5 py-1">
              <button
                type="button"
                onClick={() => game.move("up")}
                aria-label="Slide Up"
                className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-stone-950 border border-stone-300 dark:border-stone-700 shadow flex items-center justify-center text-stone-700 dark:text-stone-200 active:scale-95 transition"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => game.move("left")}
                  aria-label="Slide Left"
                  className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-stone-950 border border-stone-300 dark:border-stone-700 shadow flex items-center justify-center text-stone-700 dark:text-stone-200 active:scale-95 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => game.move("down")}
                  aria-label="Slide Down"
                  className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-stone-950 border border-stone-300 dark:border-stone-700 shadow flex items-center justify-center text-stone-700 dark:text-stone-200 active:scale-95 transition"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => game.move("right")}
                  aria-label="Slide Right"
                  className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-stone-950 border border-stone-300 dark:border-stone-700 shadow flex items-center justify-center text-stone-700 dark:text-stone-200 active:scale-95 transition"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Keyboard shortcuts table */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>Slide:</span>
                <span className="font-mono font-bold text-stone-700 dark:text-stone-300">Arrows / WASD</span>
              </div>
              <div className="flex justify-between">
                <span>Restart:</span>
                <span className="font-mono font-bold text-stone-700 dark:text-stone-300">R</span>
              </div>
              {game.mode === "zen" && (
                <div className="flex justify-between">
                  <span>Undo:</span>
                  <span className="font-mono font-bold text-stone-700 dark:text-stone-300">U</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Menu:</span>
                <span className="font-mono font-bold text-stone-700 dark:text-stone-300">Esc</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(Game2048BoardDesktop);
