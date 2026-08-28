import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface ConservationBadgeProps {
  isConserved: boolean | null | undefined;
  discrepancy?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConservationBadge({
  isConserved,
  discrepancy = "0",
  size = "md",
  className = "",
}: ConservationBadgeProps) {
  if (isConserved === null || isConserved === undefined) {
    return (
      <span
        role="status"
        aria-label="Mathematical conservation status: UNAUDITED"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" aria-hidden="true" />
        <span>UNAUDITED</span>
      </span>
    );
  }

  if (isConserved) {
    return (
      <span
        role="status"
        aria-label="Mathematical conservation status: 100% CONSERVED"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 ${className}`}
        title="Mathematical conservation verified: Total Debited = Total Credited"
      >
        <CheckCircle2 className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} aria-hidden="true" />
        <span>100% CONSERVED</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={`Mathematical conservation status: DISCREPANCY of ${discrepancy} coins`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/40 animate-pulse ${className}`}
      title={`Conservation discrepancy detected: ${discrepancy} coin delta`}
    >
      <AlertTriangle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} aria-hidden="true" />
      <span>DISCREPANCY ({discrepancy} 🪙)</span>
    </span>
  );
}

export default ConservationBadge;
