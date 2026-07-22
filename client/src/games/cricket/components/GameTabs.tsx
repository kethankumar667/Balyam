import { cn } from "../../../lib/cn";

/**
 * Accessible segmented tabs following the ARIA tablist pattern. Controlled:
 * the parent owns `value`. Left/Right arrow keys move focus between tabs.
 */
export interface GameTab<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
}

export interface GameTabsProps<T extends string> {
  tabs: ReadonlyArray<GameTab<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
}

export function GameTabs<T extends string>({ tabs, value, onChange, ariaLabel, className }: GameTabsProps<T>) {
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const enabled = tabs.filter((t) => !t.disabled);
    const idx = enabled.findIndex((t) => t.id === value);
    if (idx < 0) return;
    const next = e.key === "ArrowRight" ? (idx + 1) % enabled.length : (idx - 1 + enabled.length) % enabled.length;
    onChange(enabled[next].id);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("inline-flex rounded-full border border-[#E4D3AC] bg-[#F3E6C6] p-1", className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold transition disabled:opacity-40",
              active ? "bg-[#2E7D32] text-white shadow" : "text-[#6D4323]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
