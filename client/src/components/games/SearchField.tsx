import React, { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name. Separate from `placeholder` so the visible hint can stay
   *  short enough not to clip while the announced name stays descriptive. */
  accessibleLabel?: string;
  className?: string;
  id?: string;
}

export default function SearchField({
  value,
  onChange,
  /**
   * Short enough to finish inside the field at 390px.
   *
   * The previous string — "Search games by title, category, or nostalgia tag…"
   * — is 48 characters and the input shows about 36 at the narrowest supported
   * width, so it rendered as "Search games by title, rules, or nost" with the
   * last word cut mid-syllable. A placeholder the layout truncates reads as a
   * broken field rather than a hint.
   *
   * The long form survives as the accessible name below, where nothing clips
   * it, so screen-reader users keep the fuller description.
   */
  placeholder = "Search games…",
  accessibleLabel = "Search games by title, category, or nostalgia tag",
  className = "",
  id = "game-search-field",
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global "/" shortcut to focus search input if not already typing in an input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search Games
      </label>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-600/70 dark:text-amber-400/70">
        <Search className="w-4 h-4" aria-hidden="true" />
      </div>
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={accessibleLabel}
        className="w-full min-h-[44px] pl-10 pr-10 rounded-2xl font-semibold text-sm transition-all duration-200
                   bg-surface-0 border border-surface-rim text-ink-hi placeholder:text-ink-mute
                   hover:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500
                   shadow-xs"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search query"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-mute hover:text-ink-hi transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <div className="absolute inset-y-0 right-0 pr-3.5 items-center pointer-events-none hidden sm:flex">
          <kbd className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-surface-1 border border-surface-rim text-ink-mute">
            /
          </kbd>
        </div>
      )}
    </div>
  );
}
