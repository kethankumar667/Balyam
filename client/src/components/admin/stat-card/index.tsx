import { type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number; // percentage, e.g. 12.5
    direction: "up" | "down" | "neutral";
    label?: string; // e.g. "vs last week"
  };
  subtitle?: string;
  badge?: ReactNode;
  loading?: boolean;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  badge,
  loading = false,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`relative p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            title={title}
            className="text-xs font-bold text-[var(--chrome-ink-soft)] leading-snug break-words"
          >
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-[var(--chrome-control)] rounded-md animate-pulse my-1.5" />
          ) : (
            <p className="text-2xl sm:text-3xl font-black text-[var(--chrome-ink)] tracking-tight mt-1">
              {value}
            </p>
          )}
        </div>

        {icon && (
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(trend || subtitle || badge) && (
        <div className="mt-4 pt-3 border-t border-[var(--chrome-hairline)] flex items-center justify-between gap-2 text-xs">
          {trend ? (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-[11px] ${
                  trend.direction === "up"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : trend.direction === "down"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                }`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : trend.direction === "down" ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {trend.value > 0 ? `${trend.value}%` : `${trend.value}`}
              </span>
              {trend.label && (
                <span className="text-[var(--chrome-ink-soft)] truncate" title={trend.label}>
                  {trend.label}
                </span>
              )}
            </div>
          ) : subtitle ? (
            <span className="text-[var(--chrome-ink-soft)] font-medium text-xs leading-snug break-words" title={subtitle}>
              {subtitle}
            </span>
          ) : null}

          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
      )}
    </div>
  );
}
