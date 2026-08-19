import React, { useState } from "react";
import { Link } from "react-router-dom";
import { SURFACES } from "../../design-system/dls";

interface SmartHintProps {
  id: string;
  icon?: string;
  title: string;
  tip: string;
  actionRoute?: string;
  actionText?: string;
  className?: string;
}

export const SmartHint: React.FC<SmartHintProps> = ({
  id,
  icon = "💡",
  title,
  tip,
  actionRoute,
  actionText,
  className = "",
}) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(`bhalyam.hint.${id}`) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(`bhalyam.hint.${id}`, "1");
    } catch {
      // Ignore
    }
    setDismissed(true);
  };

  return (
    <div
      className={`${SURFACES.cardDefault} p-4 rounded-2xl border border-amber-500/20 bg-stone-900/60 flex items-center justify-between gap-3 text-xs font-mono shadow-md ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <span className="font-bold text-stone-200 block truncate">{title}</span>
          <span className="text-stone-400 text-[11px] block">{tip}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {actionRoute && actionText && (
          <Link
            to={actionRoute}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-500/40 text-[11px] transition"
          >
            {actionText}
          </Link>
        )}
        <button
          onClick={handleDismiss}
          className="text-stone-500 hover:text-stone-300 p-1 text-xs"
          aria-label="Dismiss hint"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
