import React, { useState } from "react";
import { Link } from "react-router-dom";
import { SURFACES } from "../../design-system/dls";
import { X } from "lucide-react";

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
      className={`${SURFACES.cardDefault} p-4 flex flex-wrap items-center justify-between gap-3 text-sm shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <span className="font-bold text-[var(--chrome-ink)] block">{title}</span>
          <span className="text-[var(--chrome-ink-soft)] block">{tip}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {actionRoute && actionText && (
          <Link
            to={actionRoute}
            className="inline-flex items-center min-h-[44px] bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-accent)] font-bold px-3 py-2 rounded-xl border border-[var(--chrome-border)] text-xs transition"
          >
            {actionText}
          </Link>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl"
          aria-label="Dismiss hint"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
