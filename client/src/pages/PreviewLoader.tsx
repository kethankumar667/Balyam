import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, RefreshCw, Eye, EyeOff } from "lucide-react";
import PremiumGamingLoader from "../components/loading/PremiumGamingLoader";

export default function PreviewLoader() {
  const [hideDock, setHideDock] = useState(false);
  const [simulateProgress, setSimulateProgress] = useState(true);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    if (!simulateProgress) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 3;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [simulateProgress]);

  return (
    <div className="relative min-h-screen">
      {/* Floating Toggle Button for Zen Mode */}
      <button
        type="button"
        onClick={() => setHideDock((h) => !h)}
        className="fixed bottom-4 right-4 z-[70] p-2.5 rounded-2xl bg-black/60 hover:bg-black/90 text-amber-400 border border-amber-500/40 backdrop-blur-md shadow-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        title={hideDock ? "Show Inspector Dock" : "Hide Controls (Zen View)"}
      >
        {hideDock ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        <span>{hideDock ? "Show Controls" : "Zen View"}</span>
      </button>

      {/* Interactive Control Dock at the top */}
      {!hideDock && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-[#0E1526]/90 border border-amber-500/30 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 flex-wrap max-w-[95vw]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Lounge</span>
          </Link>

          <span className="text-slate-700">|</span>

          {/* Progress Simulation Toggle */}
          <button
            type="button"
            onClick={() => setSimulateProgress((p) => !p)}
            className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
              simulateProgress
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-stone-300 border-slate-700"
            }`}
          >
            {simulateProgress ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
            <span>{simulateProgress ? "Pause 0-100% Progress" : "Simulate 0-100%"}</span>
          </button>

          {/* Indeterminate Mode */}
          <button
            type="button"
            onClick={() => {
              setSimulateProgress(false);
              setProgress(-1);
            }}
            className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
              progress === -1 && !simulateProgress
                ? "bg-amber-500 text-stone-950 border-amber-600 font-black"
                : "bg-slate-800 text-stone-200 border-slate-700"
            }`}
          >
            <span>Indeterminate Sweep</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => {
              setProgress(0);
              setSimulateProgress(true);
            }}
            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-stone-200 hover:text-amber-400 transition cursor-pointer"
            title="Restart from 0%"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pristine Fullscreen AAA Gaming Loader */}
      <PremiumGamingLoader
        progress={progress >= 0 ? progress : undefined}
      />
    </div>
  );
}
