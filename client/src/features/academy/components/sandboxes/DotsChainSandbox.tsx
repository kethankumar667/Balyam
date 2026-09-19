import React, { useState } from "react";
import { motion } from "framer-motion";
import { Zap, RefreshCw } from "lucide-react";
import { HapticsManager } from "../../../../services/HapticsManager";
import { useReducedMotion } from "../../../../animations/helpers/useReducedMotion";
import { useCompleteOnce, type SandboxProps } from "./sandboxShared";

export const DotsChainSandbox: React.FC<SandboxProps> = ({ onComplete }) => {
  const [closed, setClosed] = useState(false);
  const reduceMotion = useReducedMotion();
  const complete = useCompleteOnce(onComplete);

  const handleCloseBox = () => {
    if (closed) return;
    setClosed(true);
    HapticsManager.getInstance().win();
    complete();
  };

  const handleReset = () => {
    setClosed(false);
  };

  return (
    <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-center shadow-inner relative overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-black">
        Chain Capture Lab
      </div>

      <div className="text-left w-full max-w-xs mt-4">
        <span className="text-xs font-mono text-blue-300 font-bold block">
          4th Line Closure & Extra Turn:
        </span>
        <p className="text-[11px] font-mono text-stone-400 leading-tight">
          Three sides of this box are already drawn. Tap the flashing bottom line to close the box and claim your bonus turn!
        </p>
      </div>

      {/* Mini 2x2 Dots Grid Simulation */}
      <div className="relative w-44 h-44 bg-slate-950/80 rounded-2xl border border-stone-800 flex items-center justify-center p-6 shadow-md">
        {/* Top-Left Dot */}
        <div className="absolute top-6 left-6 w-3.5 h-3.5 rounded-full bg-stone-300 shadow-sm" />
        {/* Top-Right Dot */}
        <div className="absolute top-6 right-6 w-3.5 h-3.5 rounded-full bg-stone-300 shadow-sm" />
        {/* Bottom-Left Dot */}
        <div className="absolute bottom-6 left-6 w-3.5 h-3.5 rounded-full bg-stone-300 shadow-sm" />
        {/* Bottom-Right Dot */}
        <div className="absolute bottom-6 right-6 w-3.5 h-3.5 rounded-full bg-stone-300 shadow-sm" />

        {/* Drawn Top Line */}
        <div className="absolute top-7 left-9 right-9 h-1.5 bg-blue-500 rounded-full" />
        {/* Drawn Left Line */}
        <div className="absolute left-7 top-9 bottom-9 w-1.5 bg-blue-500 rounded-full" />
        {/* Drawn Right Line */}
        <div className="absolute right-7 top-9 bottom-9 w-1.5 bg-blue-500 rounded-full" />

        {/* The 4th Interactive Bottom Line */}
        <button
          type="button"
          onClick={handleCloseBox}
          className={`absolute bottom-7 left-9 right-9 h-3.5 rounded-full flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
            closed
              ? "bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.6)]"
              : "bg-amber-400/40 hover:bg-amber-400 hover:text-slate-950 text-amber-100 border-2 border-dashed border-amber-400 motion-safe:animate-pulse"
          }`}
          aria-label={closed ? "Closing line drawn" : "Draw 4th closing line"}
        >
          {!closed && (
            <span className="text-[8px] font-mono font-black uppercase tracking-tighter">
              Click to Close
            </span>
          )}
        </button>

        {/* Claimed Box Interior */}
        {closed && (
          <motion.div
            initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-xl bg-blue-500/20 border border-blue-400/50 flex flex-col items-center justify-center text-blue-300 font-mono"
          >
            <span className="text-2xl font-black">P1</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">+1 Point</span>
          </motion.div>
        )}
      </div>

      {/* Bonus Turn Indicator */}
      <div role="status" className="w-full max-w-xs">
        {closed && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs text-left">
            <Zap className="w-4 h-4 flex-shrink-0 text-emerald-400 motion-safe:animate-bounce" aria-hidden="true" />
            <div>
              <span className="font-black">EXTRA TURN!</span>
              <p className="text-[10px] text-stone-300">
                Closing a box lets you immediately draw another line — chain 10+ boxes in a single run!
              </p>
            </div>
          </div>
        )}
      </div>

      {closed && (
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
