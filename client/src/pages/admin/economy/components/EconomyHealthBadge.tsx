import React from "react";
import { ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";

export type EconomyHealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

interface EconomyHealthBadgeProps {
  status: EconomyHealthStatus;
  score?: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EconomyHealthBadge({
  status,
  score = 100,
  showScore = false,
  size = "md",
  className = "",
}: EconomyHealthBadgeProps) {
  if (status === "HEALTHY") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 ${className}`}
      >
        <ShieldCheck className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span>HEALTHY</span>
        {showScore && <span className="font-mono ml-1 opacity-80">({score}/100)</span>}
      </span>
    );
  }

  if (status === "WARNING") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 ${className}`}
      >
        <AlertTriangle className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span>WARNING</span>
        {showScore && <span className="font-mono ml-1 opacity-80">({score}/100)</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/50 animate-pulse ${className}`}
    >
      <AlertOctagon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      <span>CRITICAL</span>
      {showScore && <span className="font-mono ml-1 opacity-80">({score}/100)</span>}
    </span>
  );
}

export default EconomyHealthBadge;
