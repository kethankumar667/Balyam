export default function LoadingState({
  variant = "table",
  rows = 5,
  label = "Loading...",
  className = "",
}: {
  variant?: "table" | "cards" | "chart";
  rows?: number;
  /**
   * The accessible announcement — e.g. "Loading user list". The skeleton
   * itself is purely decorative (aria-hidden), so without this a screen
   * reader user gets no indication anything is happening at all until
   * content suddenly appears.
   */
  label?: string;
  className?: string;
}) {
  if (variant === "cards") {
    return (
      <div
        role="status"
        aria-busy="true"
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      >
        <span className="sr-only">{label}</span>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`skel-c-${i}`}
            aria-hidden="true"
            className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] animate-pulse space-y-3 shadow-2xs"
          >
            <div className="h-3 w-20 bg-[var(--chrome-control)] rounded" />
            <div className="h-8 w-28 bg-[var(--chrome-control)] rounded" />
            <div className="h-2.5 w-36 bg-[var(--chrome-control)] rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div
        role="status"
        aria-busy="true"
        className={`p-6 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] animate-pulse space-y-4 shadow-2xs ${className}`}
      >
        <div aria-hidden="true" className="flex items-center justify-between">
          <div className="h-4 w-32 bg-[var(--chrome-control)] rounded" />
          <div className="h-6 w-20 bg-[var(--chrome-control)] rounded" />
        </div>
        <div
          aria-hidden="true"
          className="h-64 w-full bg-[var(--chrome-control)]/50 rounded-xl flex items-center justify-center border border-[var(--chrome-hairline)]"
        >
          <span className="text-xs text-[var(--chrome-ink-soft)] font-medium">
            Loading visual analytics...
          </span>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      className={`rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] overflow-hidden shadow-2xs ${className}`}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="p-4 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-control)]/40 animate-pulse">
        <div className="h-4 w-40 bg-[var(--chrome-control)] rounded" />
      </div>
      <div aria-hidden="true" className="divide-y divide-[var(--chrome-hairline)] p-4 space-y-3 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`skel-r-${i}`} className="flex items-center justify-between pt-2">
            <div className="h-4 w-48 bg-[var(--chrome-control)] rounded" />
            <div className="h-4 w-20 bg-[var(--chrome-control)] rounded" />
            <div className="h-4 w-16 bg-[var(--chrome-control)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
