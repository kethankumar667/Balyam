import { memo, useEffect } from "react";
import confetti from "canvas-confetti";
import { type SudokuDifficulty } from "./useSudoku";
import { SUDOKU_THEMES, type SudokuThemeId, isLightTheme } from "./sudokuThemes";
import { Trophy, Zap, RotateCcw, ArrowRight, Award, Compass, Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface SudokuVictoryModalProps {
  isOpen: boolean;
  boardNumber: number;
  elapsedSeconds: number;
  difficulty: SudokuDifficulty;
  mistakes: number;
  themeId: SudokuThemeId;
  newPersonalBest: boolean;
  onPlayNextBoard: () => void;
  onPlayAgain: () => void;
  onChangeLevel: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SudokuVictoryModal({
  isOpen,
  boardNumber,
  elapsedSeconds,
  difficulty,
  mistakes,
  themeId,
  newPersonalBest,
  onPlayNextBoard,
  onPlayAgain,
  onChangeLevel,
}: SudokuVictoryModalProps) {
  const navigate = useNavigate();
  const theme = SUDOKU_THEMES[themeId] || SUDOKU_THEMES.chronicle;
  const isLight = isLightTheme(themeId);

  useEffect(() => {
    if (!isOpen) return;

    // Trigger victory confetti burst
    const end = Date.now() + 1800;
    const colors = ["#06b6d4", "#3b82f6", "#10b981", "#f59e0b", "#a855f7"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate telemetry metrics
  const solveVelocity = elapsedSeconds > 0 ? (45 / (elapsedSeconds / 60)).toFixed(1) : "0";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in zoom-in-95 duration-200"
    >
      <div
        className={`w-full max-w-sm sm:max-w-md rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 ${
          isLight
            ? "bg-white border border-slate-200 text-slate-800 shadow-slate-300/60"
            : "bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04060a] border border-cyan-500/30 text-white shadow-[0_0_50px_rgba(6,182,212,0.3)]"
        }`}
      >
        {/* Holographic Trophy Badge */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center border shadow-xl ${
              isLight
                ? "bg-gradient-to-tr from-sky-100 to-emerald-100 border-sky-300 shadow-sky-200/50"
                : "bg-gradient-to-tr from-cyan-500/20 via-fuchsia-500/20 to-amber-500/20 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.5)]"
            }`}
          >
            <Trophy className={`w-10 h-10 animate-bounce ${isLight ? "text-amber-500" : "text-cyan-300"}`} />
          </div>
          {newPersonalBest && (
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg">
              New PB!
            </span>
          )}
        </div>

        {/* Title & Board Cleared */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
              Board-{boardNumber} Cleared
            </span>
          </div>
          <h2
            id="victory-modal-title"
            className={`text-2xl font-black uppercase tracking-wider ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            Protocol Decrypted
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-cyan-300/80"}`}>
            Level <span className="font-bold uppercase text-cyan-500">{difficulty}</span> · Board {boardNumber} solved flawlessly
          </p>
        </div>

        {/* Stats Matrix Grid */}
        <div className="grid grid-cols-3 gap-2 w-full mt-1">
          {/* Solve Time */}
          <div
            className={`p-3 rounded-2xl border flex flex-col items-center ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10"
            }`}
          >
            <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-stone-400"}`}>
              Time
            </span>
            <span className={`text-base font-black font-mono mt-0.5 ${isLight ? "text-blue-600" : "text-cyan-400"}`}>
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Solve Velocity */}
          <div
            className={`p-3 rounded-2xl border flex flex-col items-center ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10"
            }`}
          >
            <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-stone-400"}`}>
              Velocity
            </span>
            <span className={`text-base font-black font-mono mt-0.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>
              {solveVelocity} c/m
            </span>
          </div>

          {/* Mistakes */}
          <div
            className={`p-3 rounded-2xl border flex flex-col items-center ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10"
            }`}
          >
            <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-stone-400"}`}>
              Mistakes
            </span>
            <span
              className={`text-base font-black font-mono mt-0.5 ${
                mistakes === 0 ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {mistakes === 0 ? "0 Clean" : `${mistakes}/3`}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2 w-full mt-2">
          {/* Primary: Next Board */}
          <button
            type="button"
            onClick={onPlayNextBoard}
            className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white font-black uppercase text-xs tracking-wider shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
          >
            <span>Play Board {boardNumber + 1} ({difficulty})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={onChangeLevel}
              className={`min-h-[44px] py-2.5 rounded-2xl border font-bold uppercase text-xs tracking-wider active:scale-95 transition flex items-center justify-center gap-1.5 ${
                isLight
                  ? "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
                  : "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Change Level</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/leaderboard")}
              className={`min-h-[44px] py-2.5 rounded-2xl border font-bold uppercase text-xs tracking-wider active:scale-95 transition flex items-center justify-center gap-1.5 ${
                isLight
                  ? "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
                  : "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Scoreboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SudokuVictoryModal);
