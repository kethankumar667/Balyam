import { memo } from "react";
import { SUDOKU_THEMES, type SudokuThemeId, isLightTheme } from "./sudokuThemes";
import { type SudokuInputMode } from "./useSudoku";
import { Undo2, Eraser, Pencil, Zap, Layers, Check } from "lucide-react";

export interface SudokuKeypadProps {
  digitCounts: Record<number, number>;
  selectedDigit: number | null;
  notesMode: boolean;
  inputMode: SudokuInputMode;
  themeId: SudokuThemeId;
  canUndo: boolean;
  onSelectDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onToggleInputMode: () => void;
  onUndo: () => void;
  onUseHint: () => void;
  onAutoFillNotes: () => void;
}

function SudokuKeypad({
  digitCounts,
  selectedDigit,
  notesMode,
  inputMode,
  themeId,
  canUndo,
  onSelectDigit,
  onErase,
  onToggleNotes,
  onToggleInputMode,
  onUndo,
  onUseHint,
  onAutoFillNotes,
}: SudokuKeypadProps) {
  const theme = SUDOKU_THEMES[themeId] || SUDOKU_THEMES.obsidian;
  const isLight = isLightTheme(themeId);

  const actionBtnClass = isLight
    ? "bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-xs"
    : "bg-white/5 border border-white/10 hover:bg-white/10 text-stone-300";

  return (
    <div className="w-full max-w-sm sm:max-w-md flex flex-col gap-2 select-none">
      {/* Action Control Deck */}
      <div className="flex items-center justify-between gap-1.5 px-0.5">
        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo move"
          className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 ${actionBtnClass}`}
        >
          <Undo2 className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Undo</span>
        </button>

        {/* Erase */}
        <button
          type="button"
          onClick={onErase}
          aria-label="Erase cell"
          className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition active:scale-95 ${actionBtnClass}`}
        >
          <Eraser className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Erase</span>
        </button>

        {/* Notes (Pencil) Mode */}
        <button
          type="button"
          onClick={onToggleNotes}
          aria-label="Toggle notes pencil mode"
          className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl border transition active:scale-95 ${
            notesMode
              ? isLight
                ? "bg-sky-500 border-sky-600 text-white shadow-md shadow-sky-500/30 font-black"
                : `${theme.badgeBg} font-black`
              : actionBtnClass
          }`}
          // A runtime colour cannot be a Tailwind class (it is only emitted for literal text
          // found at build time), so the glow is an inline style.
          style={notesMode && !isLight ? { boxShadow: `0 0 15px ${theme.accentGlow}` } : undefined}
        >
          <div className="relative">
            <Pencil className="w-4 h-4" />
            {notesMode && (
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isLight ? "bg-white" : "bg-cyan-400"} animate-ping`} />
            )}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">
            {notesMode ? "Notes ON" : "Notes"}
          </span>
        </button>

        {/* Auto Fill Notes */}
        <button
          type="button"
          onClick={onAutoFillNotes}
          aria-label="Auto candidate notes"
          className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition active:scale-95 ${actionBtnClass}`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Auto Note</span>
        </button>

        {/* Neural Hint */}
        <button
          type="button"
          onClick={onUseHint}
          aria-label="Neural laser hint"
          className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl border transition active:scale-95 ${
            isLight
              ? "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 hover:from-amber-100 hover:to-amber-200 text-amber-900 shadow-xs font-bold"
              : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/40 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Hint</span>
        </button>
      </div>

      {/* 1-9 Number Row / Touch Grid */}
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const placedCount = digitCounts[digit] || 0;
          const isComplete = placedCount >= 9;
          const remaining = Math.max(0, 9 - placedCount);
          const isSelectedInDigitMode = inputMode === "digit-first" && selectedDigit === digit;

          return (
            <button
              key={digit}
              type="button"
              onClick={() => onSelectDigit(digit)}
              aria-label={`Digit ${digit}, ${remaining} remaining`}
              className={`relative min-h-[46px] sm:min-h-[52px] p-0.5 sm:p-1 rounded-2xl flex flex-col items-center justify-center font-black transition-all active:scale-95 border select-none
                ${
                  isSelectedInDigitMode
                    ? isLight
                      ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400 shadow-md"
                      : theme.keypadActiveBg
                    : isComplete
                    ? isLight
                      ? "bg-slate-100/90 text-slate-400 border-slate-200 opacity-60"
                      : theme.keypadCompletedBg
                    : `${theme.keypadBg} ${theme.keypadText} ${theme.keypadBorder} shadow-xs`
                }
              `}
            >
              <span className={`text-lg xs:text-xl sm:text-2xl leading-none mt-0.5 ${theme.fontFamily}`}>{digit}</span>
              <span
                className={`text-[8px] xs:text-[9px] sm:text-[10px] font-bold leading-none mt-0.5 ${
                  isComplete
                    ? isLight
                      ? "text-emerald-600 font-extrabold"
                      : "text-emerald-400 font-extrabold"
                    : "opacity-60"
                }`}
              >
                {isComplete ? "✓" : remaining}
              </span>
            </button>
          );
        })}
      </div>

      {/* Input Mode Switcher Pill */}
      <div className="flex items-center justify-center px-2 pt-0.5">
        <button
          type="button"
          onClick={onToggleInputMode}
          className={`text-[10px] font-bold transition flex items-center gap-1.5 ${
            isLight ? "text-slate-600 hover:text-slate-900" : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <span>Input Mode:</span>
          <span
            className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
              inputMode === "digit-first"
                ? isLight
                  ? "bg-purple-100 border-purple-300 text-purple-800"
                  : "bg-fuchsia-950/80 border-fuchsia-500/50 text-fuchsia-300"
                : isLight
                ? "bg-sky-100 border-sky-300 text-sky-800"
                : "bg-cyan-950/80 border-cyan-500/50 text-cyan-300"
            }`}
          >
            {inputMode === "digit-first" ? "⚡ Fast Digit-First" : "🎯 Cell-First"}
          </span>
        </button>
      </div>
    </div>
  );
}

export default memo(SudokuKeypad);
