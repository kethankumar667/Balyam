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
            <h4 className="text-sm font-bold text-[var(--chrome-ink)]">{title}</h4>
            {subtitle && <span className="text-xs text-[var(--chrome-ink-soft)]">{subtitle}</span>}
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-[var(--chrome-accent)]">
          {current} / {total}
        </span>
      </div>

      <div className="space-y-1">
        <div role="progressbar" aria-label={title} aria-valuenow={Math.min(100, Math.max(0, progressPercent))} aria-valuemin={0} aria-valuemax={100} className="h-2 bg-[var(--chrome-control-hi)] rounded-full overflow-hidden border border-[var(--chrome-border)]">
          <div
            className={`h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-500 motion-reduce:transition-none`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
        <div className="flex justify-end text-xs font-mono text-[var(--chrome-ink-soft)]">
          <span>{Math.round(Math.min(100, Math.max(0, progressPercent)))}%</span>
        </div>
      </div>
    </div>
  );
};
