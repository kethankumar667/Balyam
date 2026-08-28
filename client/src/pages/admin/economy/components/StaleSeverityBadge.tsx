import React from "react";
import { AlertCircle, AlertTriangle, Clock } from "lucide-react";

interface StaleSeverityBadgeProps {
  ageMs: number;
  className?: string;
}

export function StaleSeverityBadge({ ageMs, className = "" }: StaleSeverityBadgeProps) {
  const minutes = Math.floor(ageMs / 60_000);

  if (minutes >= 60) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/40 animate-pulse ${className}`}
        title={`Stuck for ${minutes}m (> 60m threshold) — Critical operator attention required`}
      >
        <AlertCircle className="w-3 h-3" />
        <span>&gt;60m CRITICAL</span>
      </span>
    );
  }

  if (minutes >= 15) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 ${className}`}
        title={`Stuck for ${minutes}m (> 15m threshold) — Elevated warning`}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>&gt;15m WARNING</span>
      </span>
    );
  }

  if (minutes >= 5) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border border-yellow-500/30 ${className}`}
        title={`Stuck for ${minutes}m (> 5m threshold) — Notice`}
      >
        <Clock className="w-3 h-3" />
        <span>&gt;5m NOTICE</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)] ${className}`}
    >
      <Clock className="w-3 h-3" />
      <span>&lt;5m NOMINAL</span>
    </span>
  );
}

export default StaleSeverityBadge;
