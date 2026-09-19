import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useCompleteOnce, type SandboxProps } from "./sandboxShared";

const MISSING_DIGIT = 5;
const KEYPAD_DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
/** The sector box, row by row; `null` is the naked single to deduce. */
const SECTOR_CELLS: readonly (number | null)[] = [1, 2, 3, 4, null, 6, 7, 8, 9];

function cellClass(value: number | null, isSolved: boolean): string {
  if (value !== null) {
    return "bg-stone-900/80 border-stone-800 text-stone-300 text-base";
  }
  if (isSolved) {
    return "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] text-lg";
  }
  return "bg-indigo-500/20 border-dashed border-indigo-400 text-indigo-300 motion-safe:animate-pulse text-lg";
}

function keyClass(isSolvedKey: boolean, isErrorKey: boolean): string {
  if (isSolvedKey) return "bg-emerald-400 text-slate-950 font-black shadow-md";
  if (isErrorKey) return "bg-red-500/30 text-red-300 border border-red-500/50";
  return "bg-slate-800 hover:bg-slate-700 text-stone-200 border border-stone-700";
}

export const SudokuScannerSandbox: React.FC<SandboxProps> = ({ onComplete }) => {
  const [solvedDigit, setSolvedDigit] = useState<number | null>(null);
  const [errorDigit, setErrorDigit] = useState<number | null>(null);
  const complete = useCompleteOnce(onComplete);
  const isSolved = solvedDigit === MISSING_DIGIT;

  const handleSelectDigit = (digit: number) => {
    if (isSolved) return;
    if (digit === MISSING_DIGIT) {
      setSolvedDigit(digit);
      setErrorDigit(null);
      HapticsManager.getInstance().win();
      complete();
      return;
    }
    setErrorDigit(digit);
    HapticsManager.getInstance().subtle();
  };

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-black">
        Naked Single Resolver
      </div>

      <div className="text-left w-full max-w-xs mt-4">
        <span className="text-xs font-mono text-indigo-300 font-bold block">
          Sector Box Deduction:
        </span>
        <p className="text-[11px] font-mono text-stone-400 leading-tight">
          This 3x3 sector box has 8 of its 9 numbers locked in. Determine and tap the missing "Naked Single" digit!
        </p>
      </div>

      {/* 3x3 Sector Box */}
      <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950/80 rounded-2xl border-2 border-indigo-500/40 shadow-md">
        {SECTOR_CELLS.map((val, idx) => (
          <div
            key={idx}
            className={`w-11 h-11 rounded-lg border flex items-center justify-center font-mono font-black ${cellClass(
              val,
              isSolved,
            )}`}
          >
            {val !== null ? val : solvedDigit ?? "?"}
          </div>
        ))}
      </div>

      {/* Keypad */}
      <div className="w-full max-w-xs">
        <span className="text-[11px] font-mono text-stone-400 font-bold block mb-1.5">
          Pick the missing digit (1–9):
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {KEYPAD_DIGITS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleSelectDigit(n)}
              className={`py-2.5 rounded-lg font-mono font-bold text-sm transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${keyClass(
                solvedDigit === n,
                errorDigit === n,
              )}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div role="status" className="min-h-[1.75rem]">
        {isSolved && (
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Naked Single 5 identified. Demo complete.</span>
          </div>
        )}
        {errorDigit !== null && !isSolved && (
          <span className="text-[11px] font-mono text-red-400">
            Digit {errorDigit} already exists in this sector! Look for the one omitted.
          </span>
        )}
      </div>
    </div>
  );
};
