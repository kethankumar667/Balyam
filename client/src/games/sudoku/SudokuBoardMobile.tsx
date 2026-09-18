import { memo, useState } from "react";
import SudokuGrid from "./SudokuGrid";
import SudokuKeypad from "./SudokuKeypad";
import SudokuDifficultyModal from "./SudokuDifficultyModal";
import SudokuVictoryModal from "./SudokuVictoryModal";
import SudokuTutorialModal from "./SudokuTutorialModal";
import { type UseSudokuReturn, type SudokuDifficulty } from "./useSudoku";
import { SUDOKU_THEMES, THEME_CYCLE, type SudokuThemeId, isLightTheme } from "./sudokuThemes";
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Palette,
  Volume2,
  VolumeX,
  Zap,
  BookOpen,
  Eye,
  EyeOff,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { useAudio } from "../../hooks/useAudio";

export interface SudokuBoardMobileProps {
  game: UseSudokuReturn;
  onExit?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SudokuBoardMobile({ game, onExit }: SudokuBoardMobileProps) {
  const { settings, toggleMute } = useAudio();
  const [showDifficultyModal, setShowDifficultyModal] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);

  const theme = SUDOKU_THEMES[game.themeId] || SUDOKU_THEMES.chronicle;
  const isLight = isLightTheme(game.themeId);

  const cycleTheme = () => {
    const nextIdx = (THEME_CYCLE.indexOf(game.themeId) + 1) % THEME_CYCLE.length;
    game.setThemeId(THEME_CYCLE[nextIdx]!);
  };

  return (
    <div
      className={`w-full min-h-dvh-safe h-dvh-safe max-h-dvh-safe ${theme.bg} flex flex-col items-center justify-between p-2 sm:p-3 select-none overflow-hidden overscroll-none touch-none transition-colors duration-300 relative`}
    >
      {/* Top Cyber Navigation Bar & Telemetry Console */}
      <div className="w-full max-w-sm sm:max-w-md flex flex-col gap-1.5 shrink-0 z-20">
        {!game.zenMode ? (
          <header className="w-full flex items-center justify-between gap-2 pt-safe">
            {/* Back Button */}
            <button
              type="button"
              onClick={onExit}
              aria-label="Exit to games catalog"
              className={`min-h-[44px] min-w-[44px] px-3 rounded-2xl text-xs font-bold transition active:scale-95 flex items-center gap-1 shrink-0 ${
                isLight
                  ? "text-slate-700 hover:text-slate-900 bg-white border border-slate-200 shadow-xs"
                  : "text-stone-300 hover:text-white bg-white/5 border border-white/10"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline uppercase text-[10px] tracking-wider">Back</span>
            </button>

            {/* Difficulty & Board Number Pill - NEVER WRAPS */}
            <button
              type="button"
              onClick={() => setShowDifficultyModal(true)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${theme.badgeBg}`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>{game.difficulty}</span>
              <span className="opacity-40">·</span>
              <span className={isLight ? "text-blue-600 font-extrabold" : "text-cyan-400 font-extrabold"}>
                Board {game.boardNumber}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-0.5 shrink-0" />
            </button>

            {/* Right Tools Group */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Interactive Tutorial Guide */}
              <button
                type="button"
                onClick={() => setShowTutorialModal(true)}
                aria-label="Sudoku interactive tutorial guide"
                title="Interactive Tutorial"
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border transition active:scale-95 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                    : "bg-white/5 border-white/10 text-cyan-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* Quick Settings Drawer Toggle */}
              <button
                type="button"
                onClick={() => setShowSettingsMenu((v) => !v)}
                aria-label="Quick tools and options"
                title="Tools & Settings"
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border transition active:scale-95 ${
                  showSettingsMenu
                    ? isLight
                      ? "bg-sky-100 border-sky-300 text-sky-700 shadow-xs"
                      : "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                    : isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                    : "bg-white/5 border-white/10 text-stone-300 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </header>
        ) : (
          // Minimalist Zen Mode Bar
          <div className="w-full flex items-center justify-between pt-safe px-2 z-20">
            <span className={`text-[11px] font-mono uppercase tracking-wider ${isLight ? "text-slate-500" : "text-stone-500"}`}>
              Zen Focus · Board {game.boardNumber}
            </span>
            <button
              type="button"
              onClick={game.toggleZenMode}
              className={`min-h-[40px] px-3 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 ${
                isLight ? "bg-white border-slate-300 text-slate-700" : "bg-white/10 border-white/20 text-stone-300"
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Exit Zen</span>
            </button>
          </div>
        )}

        {/* Quick Tools & Settings Ribbon (when toggled) */}
        {!game.zenMode && showSettingsMenu && (
          <div
            className={`w-full flex items-center justify-between p-1 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-150 z-20 ${
              isLight
                ? "bg-white border-slate-200 shadow-md text-slate-700"
                : "bg-stone-900/95 border-white/10 shadow-xl text-white backdrop-blur-md"
            }`}
          >
            {/* Cycle Theme */}
            <button
              type="button"
              onClick={cycleTheme}
              className={`flex-1 min-h-[40px] px-2 py-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/10"
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-cyan-500" />
              <span className="truncate">{theme.name}</span>
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />

            {/* Zen Toggle */}
            <button
              type="button"
              onClick={() => {
                game.toggleZenMode();
                setShowSettingsMenu(false);
              }}
              className={`flex-1 min-h-[40px] px-2 py-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/10"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>Zen</span>
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              className={`min-h-[40px] px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95 ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/10"
              }`}
            >
              {settings.isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
              <span>{settings.isMuted ? "Muted" : "Sound"}</span>
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />

            {/* Restart */}
            <button
              type="button"
              onClick={() => {
                game.restartCurrentGame();
                setShowSettingsMenu(false);
              }}
              className={`min-h-[40px] px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95 ${
                isLight ? "hover:bg-rose-50 text-rose-600" : "hover:bg-rose-500/20 text-rose-400"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* Unified Telemetry Console (Mistakes, Pace & Timer) */}
        <div
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-2xl border transition-all shrink-0 z-10 ${
            isLight
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-white/[0.04] border-white/10 backdrop-blur-md"
          }`}
        >
          {/* Mistakes Meter */}
          <div className="flex items-center gap-2" title="Mistakes counter (3 strikes allowed)">
            <span className={`uppercase text-[10px] font-black tracking-wider ${isLight ? "text-slate-500" : "text-stone-400"}`}>
              Mistakes
            </span>
            <div className="flex items-center gap-1.5" aria-label={`${game.mistakes} of ${game.maxMistakes} mistakes`}>
              {[0, 1, 2].map((pipIdx) => {
                const isStruck = pipIdx < game.mistakes;
                return (
                  <span
                    key={pipIdx}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      isStruck
                        ? "bg-rose-500 border border-rose-600 scale-105"
                        : isLight
                        ? "bg-slate-200 border border-slate-300"
                        : "bg-white/20 border border-white/25"
                    }`}
                  />
                );
              })}
            </div>
            <span
              className={`font-mono text-xs font-black ${
                game.mistakes > 0 ? "text-rose-500" : isLight ? "text-slate-700" : "text-stone-300"
              }`}
            >
              {game.mistakes}/{game.maxMistakes}
            </span>
          </div>

          {/* Ghost Pace Delta (if active) */}
          {game.ghostDeltaFormatted && (
            <div
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border transition-all ${
                game.ghostDelta! <= 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-600"
              }`}
              title="Ghost pace vs Benchmark pace"
            >
              <span>{game.ghostDeltaFormatted}</span>
              <span className="opacity-75 text-[9px] uppercase tracking-tight">pace</span>
            </div>
          )}

          {/* Timer with Pause Control */}
          <button
            type="button"
            onClick={game.togglePause}
            aria-label={game.isPaused ? "Resume game" : "Pause game"}
            className={`min-h-[36px] px-3 py-1 rounded-xl font-mono font-black text-xs flex items-center gap-1.5 transition active:scale-95 ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                : "bg-white/10 hover:bg-white/15 text-white"
            }`}
          >
            <span className="tracking-wider text-sm">{formatTime(game.elapsedSeconds)}</span>
            {game.isPaused ? (
              <Play className="w-3 h-3 text-cyan-500 fill-cyan-500" />
            ) : (
              <Pause className={`w-3 h-3 ${isLight ? "text-slate-400" : "text-stone-400"}`} />
            )}
          </button>
        </div>
      </div>

      {/* Main Play Deck (Board + Hint + Keypad unified and ergonomically connected) */}
      <main className="w-full max-w-sm sm:max-w-md flex-1 flex flex-col items-center justify-center min-h-0 py-1 z-10">
        <div className="w-full flex flex-col items-center gap-2 xs:gap-2.5 sm:gap-3">
          {/* Matrix Grid Board */}
          <div className="w-full flex items-center justify-center min-h-0 shrink-0">
            <SudokuGrid
              cells={game.cells}
              selectedCellIndex={game.selectedCellIndex}
              selectedDigit={game.selectedDigit}
              themeId={game.themeId}
              isPaused={game.isPaused}
              isGameOver={game.isGameOver}
              recentlyCompletedUnits={game.recentlyCompletedUnits}
              onSelectCell={game.selectCell}
              onResume={game.togglePause}
              onRestart={game.restartCurrentGame}
            />
          </div>

          {/* Hint Banner (if active) */}
          {game.hintText && (
            <div
              className={`w-full px-3 py-1 rounded-xl border text-xs font-bold text-center tracking-wide shrink-0 animate-in fade-in slide-in-from-bottom-1 duration-150 z-20 ${
                isLight
                  ? "bg-amber-50 border-amber-300 text-amber-800 shadow-xs"
                  : "bg-amber-500/20 border-amber-400/40 text-amber-300"
              }`}
            >
              {game.hintText}
            </div>
          )}

          {/* Touch Control Keypad */}
          <footer className="w-full flex flex-col items-center z-20 shrink-0 pb-safe">
            <SudokuKeypad
              digitCounts={game.digitCounts}
              selectedDigit={game.selectedDigit}
              notesMode={game.notesMode}
              inputMode={game.inputMode}
              themeId={game.themeId}
              canUndo={game.canUndo}
              onSelectDigit={game.selectDigit}
              onErase={game.eraseCell}
              onToggleNotes={game.toggleNotesMode}
              onToggleInputMode={game.toggleInputMode}
              onUndo={game.undo}
              onUseHint={game.useHint}
              onAutoFillNotes={game.autoFillNotes}
            />
          </footer>
        </div>
      </main>

      {/* Modals */}
      <SudokuDifficultyModal
        isOpen={showDifficultyModal}
        currentDifficulty={game.difficulty}
        progress={game.progress}
        themeId={game.themeId}
        onClose={() => setShowDifficultyModal(false)}
        onSelectDifficulty={(diff) => game.startNewGame(diff)}
      />

      <SudokuVictoryModal
        isOpen={game.isComplete}
        boardNumber={game.boardNumber}
        elapsedSeconds={game.elapsedSeconds}
        difficulty={game.difficulty}
        mistakes={game.mistakes}
        themeId={game.themeId}
        newPersonalBest={game.newPersonalBest}
        onPlayNextBoard={game.startNextBoard}
        onPlayAgain={game.restartCurrentGame}
        onChangeLevel={() => setShowDifficultyModal(true)}
      />

      <SudokuTutorialModal
        isOpen={showTutorialModal}
        themeId={game.themeId}
        onClose={() => setShowTutorialModal(false)}
      />
    </div>
  );
}

export default memo(SudokuBoardMobile);
