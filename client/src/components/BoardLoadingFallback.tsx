import React from "react";

export function BoardLoadingFallback({ gameName }: { gameName?: string }) {
  return (
    <div
      className="w-full flex-1 min-h-[360px] flex flex-col items-center justify-center p-6 text-center"
      role="status"
      aria-live="polite"
      aria-label={gameName ? `Loading ${gameName} board` : "Loading game board"}
    >
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-zinc-800 border-2 border-amber-300 dark:border-zinc-700 flex items-center justify-center text-2xl shadow-inner">
          🎲
        </div>
        <div className="flex items-center gap-2 text-sm font-black text-[#5C3D1E] dark:text-amber-300 tracking-wide uppercase">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>Setting up the {gameName ? gameName : "game"} board…</span>
        </div>
        <p className="text-xs text-[#8A6D4B] dark:text-zinc-400 font-medium">
          Connecting your seat to the table
        </p>
      </div>
    </div>
  );
}

export default BoardLoadingFallback;
