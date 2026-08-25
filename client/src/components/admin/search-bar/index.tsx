import { type ChangeEvent, useEffect, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface SearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  disabled?: boolean;
  shortcut?: string;
  className?: string;
  onClear?: () => void;
}

export default function SearchBar({
  value: controlledValue,
  onChange,
  placeholder = "Search...",
  debounceMs = 250,
  loading = false,
  disabled = false,
  shortcut,
  className = "",
  onClear,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    if (!onChange) return;
    const timer = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  };

  const handleClear = () => {
    setInternalValue("");
    onChange?.("");
    onClear?.();
  };

  return (
    <div className={`relative flex items-center min-w-0 sm:min-w-[220px] max-w-md w-full ${className}`}>
      <div className="absolute left-3 text-[var(--chrome-ink-soft)] pointer-events-none flex items-center">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>

      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-disabled={disabled}
        className="w-full pl-9 pr-14 py-2 text-sm rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] text-[var(--chrome-ink)] placeholder-[var(--chrome-ink-soft)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--chrome-control)]"
      />

      <div className="absolute right-2.5 flex items-center gap-1">
        {internalValue && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] rounded-md transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : shortcut ? (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-[var(--chrome-ink-soft)] bg-[var(--chrome-control)] border border-[var(--chrome-border)] rounded shadow-2xs font-mono">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    </div>
  );
}
