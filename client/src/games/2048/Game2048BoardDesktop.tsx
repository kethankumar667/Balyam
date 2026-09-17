import { memo } from "react";
import Grid2048 from "./Grid2048";
import Game2048ModeMenu from "./Game2048ModeMenu";
import HyperspaceWarp from "./HyperspaceWarp";
import QuantumCodexModal from "./QuantumCodexModal";
import { type UseGame2048Result, TARGET_TILE } from "./useGame2048";
import { getTileVisual, type TableTheme } from "./tileStyles";
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
  Award,
  Zap,
  Cpu,
  Activity,
  BookOpen,
  Layers,
} from "lucide-react";
import { useAudio } from "../../hooks/useAudio";

export interface Game2048BoardDesktopProps {
  game: UseGame2048Result;
  onExit?: () => void;
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

const THEMES: { id: TableTheme; label: string }[] = [
  { id: "cyberpunk", label: "Cyber" },
  { id: "obsidian", label: "Obsidian" },
  { id: "synthwave", label: "Synth" },
  { id: "zen", label: "Zen" },
];

function Game2048BoardDesktop({ game, onExit }: Game2048BoardDesktopProps) {
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
  const highestMeta = getTileVisual(game.highestTile > 0 ? game.highestTile : 2, game.theme);

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#F7F3EB] dark:bg-[#070B14] flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-y-auto overflow-x-hidden">
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
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest font-mono">
            <span>2048 • {game.mode}</span>
            {game.isOverclocked && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-stone-950 font-black text-[10px] animate-pulse">
                <Zap className="w-3 h-3 fill-current" />
                <span>OVERCLOCK</span>
              </span>
            )}
          </div>

          {/* Theme Selector Pills */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs">
            <Layers className="w-3 h-3 text-stone-400 ml-1.5" />
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => game.setTheme(t.id)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase transition ${
                  game.theme === t.id
                    ? "bg-amber-500 text-stone-950 shadow-xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Codex quick trigger */}
          <button
            type="button"
            onClick={() => game.setShowCodex(true)}
            className="min-h-[44px] px-3.5 rounded-2xl text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 shadow-sm transition flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Codex</span>
          </button>

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

      {/* 3-Column Desktop Cyber Command Deck */}
      <main className="w-full max-w-6xl flex-1 grid grid-cols-12 gap-6 items-center my-4">
        {/* Left Wing: Quantum Core & A.N.N.A. Terminal */}
        <div className="col-span-3 space-y-4">
          {/* Highest Tile Glory Card */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Quantum Reactor Tier
              </span>
              <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                {highestMeta.code}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow"
                style={{
                  background: highestMeta.bg,
                  color: highestMeta.text,
                  border: `1.5px solid ${highestMeta.border}`,
                }}
              >
                {game.highestTile > 0 ? game.highestTile : "—"}
              </div>
              <div>
                <p className="font-black text-sm text-stone-900 dark:text-stone-100 font-mono">
                  {game.highestTile > 0 ? highestMeta.quantumDesignation : "Core Seed"}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {game.highestTile >= 2048
                    ? "Singularity Active"
                    : game.highestTile >= 512
                      ? "High-Yield Reactor"
                      : "Ascending Voltage"}
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Match Diagnostics */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Run Diagnostics
            </span>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Total Moves</span>
                <span className="font-bold tabular-nums text-stone-800 dark:text-stone-200">{game.moveCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Total Merges</span>
                <span className="font-bold tabular-nums text-stone-800 dark:text-stone-200">{game.mergeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Fusion Velocity</span>
                <span className="font-bold tabular-nums text-cyan-500">{game.fusionVelocity} MPM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Combo Surge</span>
                <span className={`font-bold tabular-nums ${game.isOverclocked ? "text-cyan-400 animate-pulse" : "text-amber-500"}`}>
                  {game.combo}x
                </span>
              </div>
            </div>
          </div>

          {/* A.N.N.A. Neural Tactical Console */}
          <div className="p-4 rounded-3xl bg-stone-950/90 border border-cyan-500/30 shadow-md space-y-2 font-mono">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>A.N.N.A. TACTICAL AI</span>
              </div>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ONLINE</span>
              </span>
            </div>
            <p className="text-xs text-cyan-200/90 leading-relaxed">
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
                  {game.combo}x Cascade
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
            {game.mode === "daily" && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-sm">
                <span>🌌 Score {game.score}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Global Seed Today
                </span>
                <span>Best {game.dailyBestScore}</span>
              </div>
            )}
            {game.mode === "battle" && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm">
                <span>⚔️ Score {game.score}</span>
                {game.canTriggerEmp ? (
                  <button
                    type="button"
                    onClick={game.triggerEmp}
                    className="min-h-[32px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs uppercase tracking-wider animate-bounce shadow-md flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>DEPLOY EMP (100%)</span>
                  </button>
                ) : (
                  <span className="text-xs font-mono text-rose-400">
                    EMP CHARGE: {game.empCharge}%
                  </span>
                )}
                <span>Best {game.bestScore}</span>
              </div>
            )}
            {game.mode === "race" && (
              <div className="space-y-2">
                <div className="px-4 py-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300 shadow-sm">
                  <span>🏁 Race to {TARGET_TILE}</span>
                  <span className="font-mono tabular-nums text-sm">
                    {game.elapsedMs != null ? formatMs(game.elapsedMs) : "0.0s"}
                  </span>
                </div>
                {game.ghostStatus && (
                  <div
                    className={`flex items-center justify-between px-4 py-2 rounded-xl text-[11px] font-mono font-black uppercase tracking-wider border ${
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

          {/* Tactical Power-Up Augments Bar */}
          <div className="w-full max-w-md p-2 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-md flex items-center justify-between gap-2">
            {/* Quantum Swap */}
            <button
              type="button"
              onClick={game.isSwapping ? game.cancelSwap : game.activateSwap}
              disabled={(!game.isSwapping && game.quantumSwapCharges <= 0) || game.isOver}
              className={`flex-1 min-h-[44px] px-2 py-1.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 ${
                game.isSwapping
                  ? "bg-amber-500 text-stone-950 border-amber-400 animate-pulse shadow-md"
                  : game.quantumSwapCharges > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 active:scale-95"
                    : "opacity-40 border-stone-300 dark:border-stone-700 text-stone-400 cursor-not-allowed"
              }`}
            >
              <span>⚡</span>
              <span className="truncate">
                {game.isSwapping ? "Cancel Swap" : `Swap (${game.quantumSwapCharges})`}
              </span>
            </button>

            {/* Cryo Freeze */}
            <button
              type="button"
              onClick={game.activateCryo}
              disabled={game.cryoFreezeCharges <= 0 || game.isCryoFrozen || game.isOver}
              className={`flex-1 min-h-[44px] px-2 py-1.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 ${
                game.isCryoFrozen
                  ? "bg-cyan-500 text-stone-950 border-cyan-400 animate-pulse shadow-md"
                  : game.cryoFreezeCharges > 0
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 active:scale-95"
                    : "opacity-40 border-stone-300 dark:border-stone-700 text-stone-400 cursor-not-allowed"
              }`}
            >
              <span>❄️</span>
              <span className="truncate">
                {game.isCryoFrozen ? `${game.cryoSecondsLeft}s Stasis` : `Cryo (${game.cryoFreezeCharges})`}
              </span>
            </button>

            {/* Prism Core Wildcard */}
            <button
              type="button"
              onClick={game.activateWildcard}
              disabled={game.wildcardCharges <= 0 || game.isOver}
              className={`flex-1 min-h-[44px] px-2 py-1.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 ${
                game.wildcardCharges > 0
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 active:scale-95"
                  : "opacity-40 border-stone-300 dark:border-stone-700 text-stone-400 cursor-not-allowed"
              }`}
            >
              <span>🌈</span>
              <span className="truncate">Wildcard ({game.wildcardCharges})</span>
            </button>
          </div>

          {/* Swap instruction banner */}
          {game.isSwapping && (
            <div className="w-full max-w-md px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-bold text-center animate-pulse">
              🎯 Quantum Swap: Click a tile, then click an adjacent tile to transpose!
            </div>
          )}

          {/* The Grand Holographic Quantum Grid */}
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
              isOverclocked={game.isOverclocked}
              isChronoRewinding={game.isChronoRewinding}
              theme={game.theme}
              isCryoFrozen={game.isCryoFrozen}
              isSwapping={game.isSwapping}
              selectedSwapIdx={game.selectedSwapIdx}
              onTileClick={game.onTileClick}
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

        {/* Right Wing: Telemetry Console & Tactical Controls */}
        <div className="col-span-3 space-y-4">
          {/* Cyber Telemetry Console (Entropy & Velocity) */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3 font-mono">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Grid Telemetry</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">GRID ENTROPY</span>
                <span
                  className={`font-black ${
                    game.entropyPercent >= 85
                      ? "text-rose-400 animate-pulse"
                      : game.entropyPercent >= 65
                        ? "text-amber-400"
                        : "text-cyan-400"
                  }`}
                >
                  {game.entropyPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
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
          </div>

          {/* Hall of Fame Panel */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Lounge Hall of Fame</span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">⚔️ Battle</span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  {game.allBestScores.battle > 0 ? game.allBestScores.battle.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">🏁 Race</span>
                <span className="font-black text-sky-600 dark:text-sky-400">
                  {game.bestRaceTimeMs != null ? formatMs(game.bestRaceTimeMs) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">⏱ Time Attack</span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  {game.allBestScores.timeattack > 0 ? game.allBestScores.timeattack.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">🧘 Zen</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {game.allBestScores.zen > 0 ? game.allBestScores.zen.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-bold text-stone-700 dark:text-stone-300">🌌 Daily Seed</span>
                <span className="font-black text-purple-600 dark:text-purple-400">
                  {game.dailyBestScore > 0 ? game.dailyBestScore.toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Tactical Controls & Keyboard Cheatsheet */}
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
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Vector:</span>
                <span className="font-bold text-stone-700 dark:text-stone-300">Arrows / WASD</span>
              </div>
              <div className="flex justify-between">
                <span>Restart:</span>
                <span className="font-bold text-stone-700 dark:text-stone-300">R</span>
              </div>
              {game.mode === "zen" && (
                <div className="flex justify-between">
                  <span>Chrono:</span>
                  <span className="font-bold text-stone-700 dark:text-stone-300">U</span>
                </div>
              )}
              {game.mode === "battle" && (
                <div className="flex justify-between">
                  <span>EMP:</span>
                  <span className="font-bold text-stone-700 dark:text-stone-300">E</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Menu:</span>
                <span className="font-bold text-stone-700 dark:text-stone-300">Esc</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(Game2048BoardDesktop);
