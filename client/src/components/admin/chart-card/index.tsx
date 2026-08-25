import { useState, type ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  timeRanges?: Array<{ label: string; value: string }>;
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  badge,
  timeRanges = [
    { label: "24h", value: "24h" },
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
  ],
  selectedRange: controlledRange,
  onRangeChange,
  headerAction,
  children,
  footer,
  className = "",
}: ChartCardProps) {
  const [internalRange, setInternalRange] = useState(timeRanges[0]?.value ?? "24h");
  const currentRange = controlledRange ?? internalRange;

  const handleRangeClick = (val: string) => {
    setInternalRange(val);
    onRangeChange?.(val);
  };

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--chrome-ink-soft)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {timeRanges.length > 0 && (
            <div className="flex items-center p-0.5 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs">
              {timeRanges.map((tr) => (
                <button
                  key={tr.value}
                  type="button"
                  onClick={() => handleRangeClick(tr.value)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    currentRange === tr.value
                      ? "bg-amber-500 text-zinc-950 font-black shadow-2xs"
                      : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          )}
          {headerAction}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="w-full flex-1 min-h-[220px]">{children}</div>

      {/* Optional Footer Metric summary */}
      {footer && (
        <div className="mt-4 pt-3 border-t border-[var(--chrome-hairline)]">
          {footer}
        </div>
      )}
    </div>
  );
}
