export default function LoadingState({
  variant = "table",
  rows = 5,
  className = "",
}: {
  variant?: "table" | "cards" | "chart";
  rows?: number;
  className?: string;
}) {
  if (variant === "cards") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`skel-c-${i}`}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 animate-pulse space-y-3"
          >
            <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-2.5 w-36 bg-slate-200 dark:bg-zinc-800 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div
        className={`p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 animate-pulse space-y-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-64 w-full bg-slate-100 dark:bg-zinc-800/50 rounded-xl flex items-center justify-center">
          <span className="text-xs text-slate-400 dark:text-zinc-600 font-medium">
            Loading visual analytics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 overflow-hidden ${className}`}
    >
      <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 p-4 space-y-3 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`skel-r-${i}`} className="flex items-center justify-between pt-2">
            <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
