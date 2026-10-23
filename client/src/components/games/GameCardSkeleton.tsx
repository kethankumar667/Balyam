export default function GameCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full rounded-2xl p-2.5 sm:p-4 border border-black/10 dark:border-white/15 bg-surface-1 motion-safe:animate-pulse flex flex-col justify-between space-y-3 shadow-sm"
    >
      <div className="flex h-11 items-center justify-between">
        <div className="h-4 w-14 rounded-full bg-surface-2" />
        <div className="h-8 w-8 rounded-full bg-surface-2" />
      </div>
      <div className="h-24 sm:h-36 rounded-xl bg-surface-2" />

      {/* Title & quote placeholders */}
      <div className="space-y-2 flex flex-col">
        <div className="h-6 w-3/4 rounded-lg bg-surface-2" />
        <div className="h-4 w-1/2 rounded-md bg-surface-1" />
      </div>

      {/* Telemetry pill placeholder */}
      <div className="flex flex-wrap gap-2">
        <div className="h-3 w-14 rounded bg-surface-2" />
        <div className="h-3 w-12 rounded bg-surface-2" />
      </div>

      {/* Button placeholder */}
      <div className="h-11 w-full rounded-xl bg-surface-2" />
    </div>
  );
}
