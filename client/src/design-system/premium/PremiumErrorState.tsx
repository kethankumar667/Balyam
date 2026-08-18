import React from "react";
import { SURFACES } from "../dls";

interface PremiumErrorStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onRetry?: () => void;
  className?: string;
}

export const PremiumErrorState: React.FC<PremiumErrorStateProps> = ({
  title = "Connection Interrupted",
  message = "We encountered a temporary network hiccup communicating with the lounge servers.",
  actionText = "Try Again",
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`${SURFACES.cardElevated} p-6 sm:p-8 text-center space-y-4 max-w-md mx-auto border border-rose-500/40 shadow-2xl ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner text-rose-400">
        ⚠️
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-black text-stone-100 dark:text-zinc-100 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-stone-400 font-mono leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-stone-700 transition uppercase font-mono tracking-wider"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
