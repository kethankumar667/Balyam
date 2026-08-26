import { type ReactNode } from "react";
import { Filter, X, RotateCcw } from "lucide-react";

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (val: string) => void;
  /**
   * Accessible name override — e.g. "Filter by game". Defaults to
   * `Filter by ${label}` rather than the bare visible label ("Game"),
   * since a screen reader announcing just "Game, combobox" out of context
   * says less than the visible text already implies from its position
   * next to "Filters".
   */
  ariaLabel?: string;
}

interface FilterBarProps {
  filters?: FilterOption[];
  activeCount?: number;
  onReset?: () => void;
  children?: ReactNode;
  className?: string;
}

export default function FilterBar({
  filters = [],
  activeCount,
  onReset,
  children,
  className = "",
}: FilterBarProps) {
  const calculatedActiveCount =
    activeCount !== undefined
      ? activeCount
      : filters.filter((f) => f.value && f.value !== "all").length;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--chrome-ink-soft)] pl-1 pr-2 border-r border-[var(--chrome-hairline)]">
          <Filter className="w-3.5 h-3.5 text-amber-500" />
          <span>Filters</span>
          {calculatedActiveCount > 0 && (
            <span className="w-4.5 h-4.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-xs">
              {calculatedActiveCount}
            </span>
          )}
        </div>

        {/* Dynamic Select Filters */}
        {filters.map((filter) => (
          <div key={filter.id} className="relative">
            <select
              aria-label={filter.ariaLabel ?? `Filter by ${filter.label}`}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all cursor-pointer"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {filter.label}: {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {children}
      </div>

      {calculatedActiveCount > 0 && onReset && (
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset filters"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] rounded-lg hover:bg-[var(--chrome-control)] transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-amber-500" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
