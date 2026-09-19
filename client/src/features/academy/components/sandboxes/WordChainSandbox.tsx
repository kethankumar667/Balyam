import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useCompleteOnce, type SandboxProps } from "./sandboxShared";

const FILLED_CELL_CLASS =
  "w-11 h-11 rounded-lg bg-stone-900 border border-stone-700 flex items-center justify-center text-lg font-black font-mono text-stone-200";
const EMPTY_CELL_CLASS =
  "w-11 h-11 rounded-lg bg-stone-950/40 border border-stone-900 flex items-center justify-center text-stone-400 font-mono";

function FilledCell({ letter }: { letter: string }): React.ReactElement {
  return <div className={FILLED_CELL_CLASS}>{letter}</div>;
}

function EmptyCell(): React.ReactElement {
  return (
    <div className={EMPTY_CELL_CLASS} aria-hidden="true">
      ·
    </div>
  );
}

export const WordChainSandbox: React.FC<SandboxProps> = ({ onComplete }) => {
  const [letterPlaced, setLetterPlaced] = useState(false);
  const complete = useCompleteOnce(onComplete);

  const handlePlaceLetter = () => {
    if (letterPlaced) return;
    setLetterPlaced(true);
    HapticsManager.getInstance().win();
    complete();
  };

  const handleReset = () => {
    setLetterPlaced(false);
  };

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black">
        Cross-Word Scorer
      </div>

      <div className="text-left w-full max-w-xs mt-4">
        <span className="text-xs font-mono text-amber-300 font-bold block">
          Simultaneous Dual-Word Score:
        </span>
        <p className="text-[11px] font-mono text-stone-400 leading-tight">
          Tap the highlighted cell to place 'T'. It completes "CAT" horizontally and "TOP" vertically in a single stroke!
        </p>
      </div>

      {/* Crossword 3x3 Mini Grid */}
      <div className="grid grid-cols-3 gap-1.5 p-3 bg-stone-950/80 rounded-2xl border border-stone-800 shadow-md">
        {/* Row 1: C - A - [T] */}
        <FilledCell letter="C" />
        <FilledCell letter="A" />
        <button
          type="button"
          onClick={handlePlaceLetter}
          className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center text-lg font-black font-mono transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
            letterPlaced
              ? "bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              : "bg-amber-500/20 border-dashed border-amber-400 text-amber-300 motion-safe:animate-pulse hover:bg-amber-500/30"
          }`}
          aria-label="Place letter T"
        >
          {letterPlaced ? "T" : "?"}
        </button>

        {/* Row 2: . - . - O */}
        <EmptyCell />
        <EmptyCell />
        <FilledCell letter="O" />

        {/* Row 3: . - . - P */}
        <EmptyCell />
        <EmptyCell />
        <FilledCell letter="P" />
      </div>

      {/* Marks Summary */}
      <div role="status" className="w-full max-w-xs">
        {letterPlaced ? (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-mono text-xs text-left space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>HORIZONTAL: "CAT"</span>
              <span className="text-amber-400">+3 Marks</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span>VERTICAL: "TOP"</span>
              <span className="text-amber-400">+3 Marks</span>
            </div>
            <div className="pt-1 border-t border-emerald-500/30 flex items-center justify-between font-black text-white">
              <span>TOTAL COMBO:</span>
              <span className="text-emerald-400">+6 Marks</span>
            </div>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-stone-400">
            Click the '?' box to drop the letter 'T'
          </span>
        )}
      </div>

      {letterPlaced && (
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          <span>Reset Demo</span>
        </button>
      )}
    </div>
  );
};
