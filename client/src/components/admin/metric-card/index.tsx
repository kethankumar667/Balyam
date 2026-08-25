import { type ReactNode } from "react";

interface SubMetric {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface MetricCardProps {
  title: string;
  mainValue: string | number;
  subtitle?: string;
  progressPct?: number;
  progressColor?: string;
  subMetrics?: SubMetric[];
  icon?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export default function MetricCard({
  title,
  mainValue,
  subtitle,
  progressPct,
  progressColor = "bg-amber-500",
  subMetrics = [],
  icon,
  badge,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
                {icon}
              </div>
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)]">
              {title}
            </span>
          </div>
          {badge}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-[var(--chrome-ink)] tracking-tight">
            {mainValue}
          </span>
          {subtitle && (
            <span className="text-xs text-[var(--chrome-ink-soft)] font-medium">
              {subtitle}
            </span>
          )}
        </div>

        {progressPct !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
              <span>Capacity Utilization</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {subMetrics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2">
          {subMetrics.map((sm) => (
            <div key={sm.label} className="flex flex-col">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                {sm.label}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  {sm.value}
                </span>
                {sm.change && (
                  <span
                    className={`text-[10px] font-semibold ${
                      sm.changeType === "positive"
                        ? "text-emerald-500"
                        : sm.changeType === "negative"
                        ? "text-rose-500"
                        : "text-slate-400"
                    }`}
                  >
                    {sm.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
