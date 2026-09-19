import { memo, useState, useEffect } from "react";
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
  Trophy,
  Keyboard,
  BookOpen,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import { useScorecardStore } from "../../store/scorecardStore";

export interface SudokuBoardDesktopProps {
  game: UseSudokuReturn;
  onExit?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SudokuBoardDesktop({ game, onExit }: SudokuBoardDesktopProps) {
  const { settings, toggleMute } = useAudio();
  const [showDifficultyModal, setShowDifficultyModal] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const archive = useScorecardStore((s) => s.archive);

  const theme = SUDOKU_THEMES[game.themeId] || SUDOKU_THEMES.chronicle;
  const isLight = isLightTheme(game.themeId);

  const cycleTheme = () => {
    const nextIdx = (THEME_CYCLE.indexOf(game.themeId) + 1) % THEME_CYCLE.length;
    game.setThemeId(THEME_CYCLE[nextIdx]!);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // A held key auto-repeats keydown. Arrow repeat is wanted (it glides the
      // cursor); for every action it is not — repeating a wrong digit flips
      // "mistake / erase / mistake" and burns all three lives in a blink, and
      // repeating H spends every hint.
      if (e.repeat && !e.key.startsWith("Arrow")) return;

      if (game.isPaused || game.isComplete || game.isGameOver) return;

      // Digits 1-9
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const digit = Number(e.key);
        if (game.inputMode === "digit-first") {
          game.selectDigit(digit);
        } else {
          game.inputDigit(digit);
        }
        return;
      }

      // Erase
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        game.eraseCell();
        return;
      }

      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        game.undo();
        return;
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        game.undo();
        return;
      }

      // Notes Toggle (N)
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        game.toggleNotesMode();
        return;
      }

      // Hint (H)
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        game.useHint();
        return;
      }

      // Zen mode toggle (Z)
      if (e.key === "z" || e.key === "Z") {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          game.toggleZenMode();
          return;
        }
      }

      // Arrow navigation
      if (game.selectedCellIndex !== null) {
        let r = Math.floor(game.selectedCellIndex / 9);
        let c = game.selectedCellIndex % 9;

        if (e.key === "ArrowUp") {
          e.preventDefault();
          r = Math.max(0, r - 1);
          game.selectCell(r * 9 + c);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          r = Math.min(8, r + 1);
          game.selectCell(r * 9 + c);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          c = Math.max(0, c - 1);
          game.selectCell(r * 9 + c);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          c = Math.min(8, c + 1);
          game.selectCell(r * 9 + c);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game]);

  const currentPB = archive?.games?.sudoku?.modes?.[game.difficulty]?.bestScore;

  return (
    <div
      className={`w-full min-h-screen ${theme.bg} flex flex-col justify-between p-6 select-none transition-colors duration-300 relative`}
    >
      {/* Top Desktop Navigation Bar */}
      <header className="w-full flex items-center justify-between border-b border-white/10 pb-4 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit to games catalog"
            className={`min-h-[44px] px-4 rounded-2xl border transition active:scale-95 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
              isLight
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
                : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Games</span>
          </button>

          {/* Difficulty & Board Number Pill */}
          <button
            type="button"
            onClick={() => setShowDifficultyModal(true)}
            className={`min-h-[44px] px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center gap-2 shadow-xs whitespace-nowrap ${theme.badgeBg}`}
          >
            <Zap className="w-4 h-4 text-cyan-500 shrink-0" />
            <span>{game.difficulty}</span>
            <span className="opacity-40">·</span>
            <span className={isLight ? "text-blue-600 font-extrabold" : "text-cyan-400 font-extrabold"}>
              Board {game.boardNumber}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-0.5 shrink-0" />
          </button>
        </div>

        {/* Center Title */}
        <div className="flex flex-col items-center">
          <h1
            className={`text-lg font-black uppercase tracking-widest ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            Bhalyam Sudoku
          </h1>
          <span className={`text-[10px] uppercase font-mono tracking-widest ${isLight ? "text-slate-500" : "text-cyan-400/80"}`}>
            Level {game.difficulty} · Board #{game.boardNumber}
          </span>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          {/* Interactive Tutorial Guide */}
          <button
            type="button"
            onClick={() => setShowTutorialModal(true)}
            title="Interactive Tutorial"
            className={`min-h-[44px] px-3.5 rounded-2xl border transition flex items-center gap-1.5 text-xs font-bold ${
              isLight
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
                : "bg-white/5 border-white/10 text-cyan-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden lg:inline">Tutorial</span>
          </button>

          {/* Zen Mode Toggle */}
          <button
            type="button"
            onClick={game.toggleZenMode}
            title="Toggle Zen Mode"
            className={`min-h-[44px] px-3 rounded-2xl border transition flex items-center gap-1.5 text-xs font-bold ${
              game.zenMode
                ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                : isLight
                  ? "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
            }`}
          >
            {game.zenMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden lg:inline">Zen</span>
          </button>

          {/* Theme Palette Switcher */}
          <button
            type="button"
            onClick={cycleTheme}
            aria-label="Cycle theme"
            className={`min-h-[44px] px-3.5 rounded-2xl border transition flex items-center gap-1.5 text-xs font-bold uppercase ${
              isLight
                ? "bg-white border-slate-300 text-slate-600 hover:bg-slate-50 shadow-xs"
                : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span className="hidden xl:inline">{theme.name}</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={settings.isMuted ? "Unmute audio" : "Mute audio"}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border transition ${
              isLight
                ? "bg-white border-slate-300 text-slate-600 hover:bg-slate-50 shadow-xs"
                : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
            }`}
          >
            {settings.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Restart Current Board */}
          <button
            type="button"
            onClick={game.restartCurrentGame}
            className={`min-h-[44px] px-3.5 rounded-2xl border transition flex items-center gap-1 text-xs font-bold uppercase ${
              isLight
                ? "bg-white border-slate-300 text-slate-600 hover:bg-slate-50 shadow-xs"
                : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main Desktop Play Arena */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center justify-center max-w-7xl mx-auto w-full py-4 z-10">
        {/* Left Side Command Panel (hidden if zenMode) */}
        {!game.zenMode && (
          <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4">
            {/* Chrono Timer & Mistakes Card */}
            <div
              className={`p-5 rounded-3xl border flex flex-col gap-4 ${
                isLight
                  ? "bg-white border-slate-200 shadow-lg shadow-slate-200/50"
                  : "bg-white/[0.03] border-white/10 backdrop-blur-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-stone-400"}`}>
                    Chrono Timer
                  </span>
                  <div className={`text-3xl font-black font-mono mt-0.5 ${isLight ? "text-blue-600" : "text-cyan-400"}`}>
                    {formatTime(game.elapsedSeconds)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {game.ghostDeltaFormatted && (
                    <span
                      className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full border ${
                        game.ghostDelta! <= 0
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      }`}
                    >
                      {game.ghostDeltaFormatted}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={game.togglePause}
                    className={`min-h-[44px] px-4 py-2 rounded-2xl border font-bold uppercase text-xs tracking-wider flex items-center gap-2 transition active:scale-95 ${
                      isLight
                        ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-stone-300"
                    }`}
                  >
                    {game.isPaused ? (
                      <>
                        <Play className="w-4 h-4 text-cyan-500 fill-cyan-500" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <Pause className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-stone-400"}`} />
                        <span>Pause</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/50">
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-stone-400"}`}>
                    Mistakes
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
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
                      className={`text-xl font-black font-mono ${
                        game.mistakes > 0 ? "text-rose-500" : "text-emerald-500"
                      }`}
                    >
                      {game.mistakes} / {game.maxMistakes}
                    </span>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-stone-400"}`}>
                    Personal Best
                  </span>
                  <div className="text-xl font-black font-mono text-amber-500 mt-0.5 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    <span>{typeof currentPB === "number" && currentPB > 0 ? formatTime(currentPB) : "--:--"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Keypad Controls */}
            <div
              className={`p-5 rounded-3xl border flex flex-col items-center ${
                isLight
                  ? "bg-white border-slate-200 shadow-lg shadow-slate-200/50"
                  : "bg-white/[0.03] border-white/10 backdrop-blur-md"
              }`}
            >
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
            </div>

            {/* Keyboard Shortcuts Hint Bar */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-600"
                  : "bg-white/[0.02] border-white/5 text-stone-400"
              }`}
            >
              <Keyboard className="w-5 h-5 text-stone-400 shrink-0" />
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                <span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-slate-800 border border-slate-300" : "bg-white/20"}`}>1-9</kbd> Fill</span>
                <span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-slate-800 border border-slate-300" : "bg-white/20"}`}>N</kbd> Notes</span>
                <span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-slate-800 border border-slate-300" : "bg-white/20"}`}>H</kbd> Hint</span>
                <span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-slate-800 border border-slate-300" : "bg-white/20"}`}>Z</kbd> Zen</span>
                <span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-slate-800 border border-slate-300" : "bg-white/20"}`}>Del</kbd> Erase</span>
              </div>
            </div>
          </div>
        )}

        {/* Center Grid Matrix Board */}
        <div className={`${game.zenMode ? "col-span-12" : "md:col-span-7 lg:col-span-8"} flex flex-col items-center justify-center`}>
          {game.hintText && (
            <div
              className={`mb-3 px-4 py-2 rounded-2xl border text-xs font-bold text-center tracking-wide animate-in fade-in duration-150 ${
                isLight
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-amber-500/20 border-amber-400/40 text-amber-300"
              }`}
            >
              {game.hintText}
            </div>
          )}

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
      </div>

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
        hintsUsed={game.hintsUsed}
        emptyCellCount={game.cells.filter((c) => !c.isGiven).length}
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

export default memo(SudokuBoardDesktop);
