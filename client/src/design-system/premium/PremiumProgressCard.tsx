import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";

interface PremiumProgressCardProps {
  title: string;
  subtitle?: string;
  current: number;
  total: number;
  progressPercent: number;
  icon?: React.ReactNode;
  barGradient?: string;
  className?: string;
}

export const PremiumProgressCard: React.FC<PremiumProgressCardProps> = ({
  title,
  subtitle,
  current,
  total,
  progressPercent,
  icon,
  barGradient = "from-amber-500 to-amber-300",
  className = "",
}) => {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${GLASSMORPHISM.panel} shadow-lg space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h4 className="text-xs font-bold text-stone-200 dark:text-zinc-200">{title}</h4>
            {subtitle && <span className="text-[10px] font-mono text-stone-500">{subtitle}</span>}
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-amber-400">
          {current} / {total}
        </span>
      </div>

      <div className="space-y-1">
        <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
          <div
            className={`h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
        <div className="flex justify-end text-[10px] font-mono text-stone-500">
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>
    </div>
  );
};
