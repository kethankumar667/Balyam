import { memo } from "react";
import Grid2048 from "./Grid2048";
import Game2048ModeMenu from "./Game2048ModeMenu";
import HyperspaceWarp from "./HyperspaceWarp";
import QuantumCodexModal from "./QuantumCodexModal";
import { type UseGame2048Result, TARGET_TILE } from "./useGame2048";
import type { TableTheme } from "./tileStyles";
import {
  Trophy,
  RotateCcw,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Volume2,
  VolumeX,
  Undo2,
  Zap,
  Activity,
  BookOpen,
  Layers,
} from "lucide-react";
import { useAudio } from "../../hooks/useAudio";

export interface Game2048BoardMobileProps {
  game: UseGame2048Result;
  onExit?: () => void;
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

const THEMES: TableTheme[] = ["cyberpunk", "obsidian", "synthwave", "zen"];
function getNextTheme(current: TableTheme): TableTheme {
  const idx = THEMES.indexOf(current);
  return THEMES[(idx + 1) % THEMES.length];
}

function Game2048BoardMobile({ game, onExit }: Game2048BoardMobileProps) {
  const { settings, toggleMute } = useAudio();

  const maxScoreEver = Math.max(
    game.highestTile,
    game.allBestScores.battle,
    game.allBestScores.zen,
    game.allBestScores.timeattack,
    game.dailyBestScore
  );

  if (game.mode == null) {
    return (
      <>
        <Game2048ModeMenu
          bestScore={game.allBestScores}
          bestRaceTimeMs={game.bestRaceTimeMs}
          dailyBestScore={game.dailyBestScore}
          onSelect={game.selectMode}
          onExit={onExit}
          onOpenCodex={() => game.setShowCodex(true)}
        />
        <QuantumCodexModal
          isOpen={game.showCodex}
          onClose={() => game.setShowCodex(false)}
          highestEver={maxScoreEver}
        />
      </>
    );
  }

  const mm = game.secondsLeft != null ? Math.floor(game.secondsLeft / 60) : 0;
  const ss = game.secondsLeft != null ? game.secondsLeft % 60 : 0;
  const urgent = game.secondsLeft != null && game.secondsLeft <= 10;

  return (
    <div className="w-full h-dvh-safe max-h-dvh-safe bg-[#F7F3EB] dark:bg-[#070B14] flex flex-col items-center justify-between p-2.5 sm:p-4 select-none overflow-hidden overscroll-none touch-none relative">
      {/* Modals */}
      <QuantumCodexModal
        isOpen={game.showCodex}
        onClose={() => game.setShowCodex(false)}
        highestEver={maxScoreEver}
      />

      {/* Hyperspace Warp Event on 2048 Singularity */}
      {game.showHyperspaceWarp && (
        <HyperspaceWarp onDismiss={game.dismissHyperspaceWarp} />
      )}

      {/* Mobile Top Navigation */}
      <header className="w-full max-w-sm flex items-center justify-between gap-1.5 pt-safe">
        <button
          type="button"
          onClick={game.backToMenu}
          className="min-h-[44px] min-w-[44px] px-3 rounded-2xl text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-sm hover:bg-white dark:hover:bg-stone-800 transition flex items-center gap-1"
        >
          <span>← Menu</span>
        </button>

        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          <span className="text-[11px] font-black uppercase tracking-widest font-mono">
            {game.mode}
          </span>
          {game.isOverclocked && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500 text-stone-950 font-black animate-pulse">
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>OVR</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => game.setShowCodex(true)}
            aria-label="Quantum Codex"
            className="min-h-[44px] min-w-[44px] p-2 rounded-2xl text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 shadow-sm flex items-center justify-center"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => game.setTheme(getNextTheme(game.theme))}
            aria-label={`Theme: ${game.theme}`}
            className="min-h-[44px] min-w-[44px] p-2 rounded-2xl text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-center"
          >
            <Layers className="w-4 h-4" />
          </button>
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
            aria-label="Restart"
            className="min-h-[44px] min-w-[44px] p-2 rounded-2xl text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-sm hover:bg-white dark:hover:bg-stone-800 transition flex items-center justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="w-full max-w-sm flex-1 flex flex-col justify-between items-center my-0.5 min-h-0 space-y-1">
        {/* Score & Best Dual Stat Card */}
        <section aria-label="Game Scores" className="w-full grid grid-cols-2 gap-2">
          <div className="relative p-2 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-md flex flex-col items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Score
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {game.score.toLocaleString()}
            </span>
            {game.combo >= 2 && (
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] uppercase tracking-wide shadow">
                {game.combo}x Combo
              </span>
            )}
          </div>

          <div className="p-2 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-md flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>Best</span>
            </div>
            <span className="text-lg sm:text-xl font-black text-stone-800 dark:text-stone-200 tabular-nums">
              {game.mode === "race"
                ? game.bestRaceTimeMs != null
                  ? formatMs(game.bestRaceTimeMs)
                  : "—"
                : game.bestScore.toLocaleString()}
            </span>
          </div>
        </section>

        {/* Live Cybernetic Telemetry Bar (Entropy & Velocity) */}
        <div className="px-3 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 text-[10px] font-mono flex items-center justify-between text-stone-400 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">ENTROPY:</span>
            <span
              className={`font-black tabular-nums ${
                game.entropyPercent >= 85
                  ? "text-rose-400 animate-pulse"
                  : game.entropyPercent >= 65
                    ? "text-amber-400"
                    : "text-cyan-400"
              }`}
            >
              {game.entropyPercent}%
            </span>
            {/* Miniature visual bar */}
            <div className="w-12 h-1.5 rounded-full bg-stone-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  game.entropyPercent >= 85
                    ? "bg-rose-500"
                    : game.entropyPercent >= 65
                      ? "bg-amber-500"
                      : "bg-cyan-500"
                }`}
                style={{ width: `${game.entropyPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="text-stone-500">VELOCITY:</span>
            <span className="font-bold text-stone-200 tabular-nums">
              {game.fusionVelocity} MPM
            </span>
          </div>
        </div>

        {/* A.N.N.A. Neural Tactical Assistant Status Console */}
        <div className="px-3 py-1.5 rounded-2xl bg-stone-950/90 border border-cyan-500/30 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <p className="text-[11px] font-mono text-cyan-200/90 truncate leading-tight">
            {game.chroniclerQuote}
          </p>
        </div>

        {/* Mode HUD Strip */}
        {game.mode === "daily" && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-sm">
            <span>🌌 Score {game.score}</span>
            <span className="text-[10px] font-mono text-purple-500">TODAY'S SEED</span>
            <span className="text-[11px] opacity-80">Best {game.dailyBestScore}</span>
          </div>
        )}
        {game.mode === "battle" && (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm">
            <span>⚔️ Score {game.score}</span>
            {game.canTriggerEmp ? (
              <button
                type="button"
                onClick={game.triggerEmp}
                className="min-h-[32px] px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-[10px] uppercase tracking-wider animate-bounce shadow-md flex items-center gap-1"
              >
                <Zap className="w-3 h-3 fill-white" />
                <span>FIRE EMP (100%)</span>
              </button>
            ) : (
              <span className="text-[10px] font-mono text-stone-400">
                EMP: {game.empCharge}%
              </span>
            )}
            <span className="text-[11px] opacity-80">Best {game.bestScore}</span>
          </div>
        )}
        {game.mode === "race" && (
          <div className="space-y-1.5">
            <div className="px-3 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300 shadow-sm">
              <span>🏁 Race to {TARGET_TILE}</span>
              <span className="font-mono tabular-nums text-sm">
                {game.elapsedMs != null ? formatMs(game.elapsedMs) : "0.0s"}
              </span>
            </div>
            {game.ghostStatus && (
              <div
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider border ${
                  game.ghostStatus === "ahead"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : game.ghostStatus === "behind"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                      : "bg-stone-500/10 border-stone-500/30 text-stone-500 dark:text-stone-400"
                }`}
              >
                <span>👻 GHOST PACE</span>
                <span>
                  {game.ghostStatus === "ahead"
                    ? "AHEAD OF BEST RUN"
                    : game.ghostStatus === "behind"
                      ? "BEHIND BEST RUN"
                      : "TIED WITH BEST RUN"}
                </span>
              </div>
            )}
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

        {/* Tactical Power-Up Augments Bar */}
        <div className="w-full max-w-[min(88vw,350px,46vh)] flex items-center justify-between gap-1.5 px-1 py-1">
          {/* Quantum Swap */}
          <button
            type="button"
            onClick={game.isSwapping ? game.cancelSwap : game.activateSwap}
            disabled={(!game.isSwapping && game.quantumSwapCharges <= 0) || game.isOver}
            className={`flex-1 min-h-[44px] px-2 rounded-xl border text-[11px] font-black transition flex items-center justify-center gap-1 ${
              game.isSwapping
                ? "bg-amber-500 text-stone-950 border-amber-400 animate-pulse shadow-sm"
                : game.quantumSwapCharges > 0
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 active:scale-95"
                  : "opacity-35 border-stone-300 dark:border-stone-800 text-stone-400 cursor-not-allowed"
            }`}
          >
            <span>⚡</span>
            <span>{game.isSwapping ? "Cancel" : `Swap (${game.quantumSwapCharges})`}</span>
          </button>

          {/* Cryo Freeze */}
          <button
            type="button"
            onClick={game.activateCryo}
            disabled={game.cryoFreezeCharges <= 0 || game.isCryoFrozen || game.isOver}
            className={`flex-1 min-h-[44px] px-2 rounded-xl border text-[11px] font-black transition flex items-center justify-center gap-1 ${
              game.isCryoFrozen
                ? "bg-cyan-500 text-stone-950 border-cyan-400 animate-pulse shadow-sm"
                : game.cryoFreezeCharges > 0
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300 active:scale-95"
                  : "opacity-35 border-stone-300 dark:border-stone-800 text-stone-400 cursor-not-allowed"
            }`}
          >
            <span>❄️</span>
            <span>{game.isCryoFrozen ? `${game.cryoSecondsLeft}s` : `Cryo (${game.cryoFreezeCharges})`}</span>
          </button>

          {/* Prism Core Wildcard */}
          <button
            type="button"
            onClick={game.activateWildcard}
            disabled={game.wildcardCharges <= 0 || game.isOver}
            className={`flex-1 min-h-[44px] px-2 rounded-xl border text-[11px] font-black transition flex items-center justify-center gap-1 ${
              game.wildcardCharges > 0
                ? "bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300 active:scale-95"
                : "opacity-35 border-stone-300 dark:border-stone-800 text-stone-400 cursor-not-allowed"
            }`}
          >
            <span>🌈</span>
            <span>Core ({game.wildcardCharges})</span>
          </button>
        </div>

        {/* Swap instruction banner */}
        {game.isSwapping && (
          <div className="w-full max-w-[min(88vw,350px,46vh)] px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold text-center animate-pulse">
            🎯 Tap a tile, then tap an adjacent tile to swap!
          </div>
        )}

        {/* 2048 Grid with zero-latency touch swipe listener and Overclock / Chrono-Rewind support */}
        <div
          onTouchStart={game.onTouchStart}
          onTouchMove={game.onTouchMove}
          onTouchEnd={game.onTouchEnd}
          className="touch-none select-none w-full flex-1 flex flex-col items-center justify-center my-auto min-h-0"
        >
          <div className="w-full max-w-[min(88vw,350px,46vh)] aspect-square flex items-center justify-center">
            <Grid2048
              grid={game.grid}
              label="2048 board"
              lastScoreGained={game.lastScoreGained}
              scoreGainedId={game.scoreGainedId}
              isOverclocked={game.isOverclocked}
              isChronoRewinding={game.isChronoRewinding}
              theme={game.theme}
              isCryoFrozen={game.isCryoFrozen}
              isSwapping={game.isSwapping}
              selectedSwapIdx={game.selectedSwapIdx}
              onTileClick={game.onTileClick}
            />
          </div>
        </div>

        {/* Tactile Mini Directional Pad with zero-latency pointer response */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => game.move("up")}
            onPointerDown={(e) => {
              if (e.pointerType === "touch") {
                e.preventDefault();
                game.move("up");
              }
            }}
            aria-label="Slide Up"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition touch-manipulation"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => game.move("left")}
              onPointerDown={(e) => {
                if (e.pointerType === "touch") {
                  e.preventDefault();
                  game.move("left");
                }
              }}
              aria-label="Slide Left"
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => game.move("down")}
              onPointerDown={(e) => {
                if (e.pointerType === "touch") {
                  e.preventDefault();
                  game.move("down");
                }
              }}
              aria-label="Slide Down"
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition touch-manipulation"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => game.move("right")}
              onPointerDown={(e) => {
                if (e.pointerType === "touch") {
                  e.preventDefault();
                  game.move("right");
                }
              }}
              aria-label="Slide Right"
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-300 active:scale-90 transition touch-manipulation"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-stone-500 dark:text-stone-400">
          Swipe or use arrow keys to slide the board.
        </p>

        {/* Game Over / Victory Screen Modal */}
        {game.isOver && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-xs rounded-3xl border-2 border-amber-500/40 bg-white/95 dark:bg-stone-900/95 p-4 space-y-3 text-center shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
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
          </div>
        )}
      </main>
    </div>
  );
}

export default memo(Game2048BoardMobile);
