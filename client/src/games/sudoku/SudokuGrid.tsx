import { memo } from "react";
import { type SudokuCell } from "./useSudoku";
import { SUDOKU_THEMES, type SudokuThemeId, isLightTheme } from "./sudokuThemes";
import { Play, AlertOctagon } from "lucide-react";

export interface SudokuGridProps {
  cells: SudokuCell[];
  selectedCellIndex: number | null;
  selectedDigit: number | null;
  themeId: SudokuThemeId;
  isPaused: boolean;
  isGameOver: boolean;
  recentlyCompletedUnits?: string[];
  onSelectCell: (index: number) => void;
  onResume: () => void;
  onRestart: () => void;
}

function SudokuGrid({
  cells,
  selectedCellIndex,
  selectedDigit,
  themeId,
  isPaused,
  isGameOver,
  recentlyCompletedUnits = [],
  onSelectCell,
  onResume,
  onRestart,
}: SudokuGridProps) {
  const theme = SUDOKU_THEMES[themeId] || SUDOKU_THEMES.chronicle;
  const isLight = isLightTheme(themeId);
  const selectedCell = selectedCellIndex !== null ? cells[selectedCellIndex] : null;
  const activeValue = selectedCell?.value ?? selectedDigit ?? null;

  return (
    <div
      className={`relative w-full max-w-[min(92vw,max(240px,calc(100dvh-280px)),440px)] md:max-w-[480px] aspect-square rounded-3xl p-1.5 sm:p-2.5 transition-all duration-300 flex flex-col justify-between ${theme.boardFrame}`}
    >
      {/* Thematic Masthead Banner */}
      {theme.masthead && (
        <div className={`w-full flex items-center justify-between px-1.5 ${theme.masthead.style}`}>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider truncate">
            {theme.masthead.title}
          </span>
          <span className="text-[8px] sm:text-[9px] opacity-75 uppercase tracking-widest hidden xs:inline">
            {theme.masthead.subtitle}
          </span>
        </div>
      )}

      {/* Cyber Corner HUD Brackets */}
      {(theme.id === "cyber" || theme.id === "obsidian" || theme.id === "quantum") && (
        <>
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none z-20" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none z-20" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none z-20" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none z-20" />
        </>
      )}

      {/* Retro Arcade CRT Scanline Overlay */}
      {(theme.id === "arcade" || theme.id === "midnight") && (
        <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-30" />
      )}

      {/* 9x9 Cell Grid */}
      <div
        role="grid"
        aria-label="Sudoku 9 by 9 puzzle grid"
        className={`flex-1 w-full grid grid-cols-9 grid-rows-9 rounded-2xl overflow-hidden border-2 ${theme.majorBorder} ${theme.boardBg}`}
      >
        {cells.map((cell) => {
          const isSelected = selectedCellIndex === cell.index;
          const isSameRow = selectedCell ? cell.row === selectedCell.row : false;
          const isSameCol = selectedCell ? cell.col === selectedCell.col : false;
          const isSameBlock = selectedCell ? cell.block === selectedCell.block : false;
          const isCrosshair = isSameRow || isSameCol || isSameBlock;
          const isMatchingDigit =
            activeValue !== null &&
            cell.value === activeValue &&
            cell.value !== null;

          const isInSweep = recentlyCompletedUnits.some(
            (u) =>
              u === `row-${cell.row}` ||
              u === `col-${cell.col}` ||
              u === `block-${cell.block}`
          );

          // 3x3 Block demarcation borders
          const isRightMajor = cell.col % 3 === 2 && cell.col !== 8;
          const isBottomMajor = cell.row % 3 === 2 && cell.row !== 8;
          const isRightMinor = cell.col % 3 !== 2 && cell.col !== 8;
          const isBottomMinor = cell.row % 3 !== 2 && cell.row !== 8;

          let cellBg = "";
          let textColor = cell.isGiven ? theme.givenText : theme.userText;

          if (cell.isError) {
            cellBg = theme.errorBg;
            textColor = theme.errorText;
          } else if (isInSweep) {
            cellBg = isLight
              ? "bg-sky-200/90 animate-pulse"
              : "bg-cyan-400/30 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.8)]";
          } else if (isSelected) {
            cellBg = theme.selectedCellBg;
          } else if (isMatchingDigit) {
            cellBg = theme.matchingDigitBg;
          } else if (isCrosshair) {
            cellBg = theme.crosshairBg;
          }

          return (
            <button
              key={cell.index}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectCell(cell.index)}
              aria-label={`Row ${cell.row + 1}, Column ${cell.col + 1}${
                cell.value ? `, Value ${cell.value}` : ", Empty"
              }`}
              className={`relative flex items-center justify-center select-none transition-colors duration-150 outline-none
                ${cellBg}
                ${isRightMajor ? `border-r-2 ${theme.majorBorder}` : ""}
                ${isBottomMajor ? `border-b-2 ${theme.majorBorder}` : ""}
                ${isRightMinor ? `border-r ${theme.minorBorder}` : ""}
                ${isBottomMinor ? `border-b ${theme.minorBorder}` : ""}
                ${isSelected ? `${theme.selectedCellBorder} z-10` : ""}
              `}
            >

              {cell.value ? (
                <span
                  className={`text-xl xs:text-2xl sm:text-3xl font-black tracking-tight ${textColor} ${theme.fontFamily} transition-transform ${
                    isSelected ? "scale-110" : ""
                  }`}
                >
                  {cell.value}
                </span>
              ) : cell.notes.length > 0 ? (
                // 3x3 Mini-Notes Candidate Display
                <div className="w-full h-full p-0.5 grid grid-cols-3 grid-rows-3 pointer-events-none select-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <span
                      key={num}
                      className={`text-[8px] xs:text-[9px] sm:text-[10px] font-bold flex items-center justify-center leading-none ${
                        cell.notes.includes(num)
                          ? isMatchingDigit && num === activeValue
                            ? isLight
                              ? "text-blue-700 font-extrabold scale-125"
                              : "text-fuchsia-300 font-extrabold scale-125"
                            : theme.noteText
                          : "opacity-0"
                      }`}
                    >
                      {num}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Paused Anti-Cheat Blur Overlay */}
      {isPaused && (
        <div
          className={`absolute inset-0 rounded-3xl backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in duration-200 ${
            isLight ? "bg-white/90 text-slate-800" : "bg-black/80 text-white"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <Play className="w-7 h-7 text-cyan-400 ml-1" />
          </div>
          <h3 className={`text-xl font-black tracking-widest uppercase mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            Neural Link Suspended
          </h3>
          <p className={`text-xs max-w-xs mb-5 ${isLight ? "text-slate-600" : "text-stone-400"}`}>
            Matrix paused. Grid shielded to maintain competitive integrity.
          </p>
          <button
            type="button"
            onClick={onResume}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase text-xs tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:brightness-110 active:scale-95 transition"
          >
            Resume Quantum Link
          </button>
        </div>
      )}

      {/* 3-Strikes System Overload Overlay */}
      {isGameOver && (
        <div
          className={`absolute inset-0 rounded-3xl backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center z-30 animate-in zoom-in-95 duration-200 ${
            isLight ? "bg-white/95 text-slate-800" : "bg-black/85 text-white"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(244,63,94,0.4)]">
            <AlertOctagon className="w-7 h-7 text-rose-400" />
          </div>
          <h3 className={`text-xl font-black tracking-widest uppercase mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            System Overload
          </h3>
          <p className="text-xs text-rose-500 max-w-xs mb-5 font-medium">
            3 neural collision errors detected. The matrix collapsed.
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black uppercase text-xs tracking-wider shadow-[0_0_20px_rgba(244,63,94,0.6)] hover:brightness-110 active:scale-95 transition"
          >
            Reboot Matrix
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(SudokuGrid);
