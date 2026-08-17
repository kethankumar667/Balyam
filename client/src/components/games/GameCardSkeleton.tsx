export default function GameCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full rounded-[26px] p-5 border border-surface-rim bg-surface-0/60 animate-pulse flex flex-col justify-between space-y-4 shadow-sm"
    >
      {/* Top illustration placeholder */}
      <div className="h-32 rounded-2xl bg-surface-1/80 flex items-center justify-center" />

      {/* Title & quote placeholders */}
      <div className="space-y-2 text-center flex flex-col items-center">
        <div className="h-6 w-3/4 rounded-lg bg-surface-2" />
        <div className="h-4 w-1/2 rounded-md bg-surface-1" />
      </div>

      {/* Telemetry pill placeholder */}
      <div className="flex justify-center gap-3">
        <div className="h-4 w-20 rounded bg-surface-1" />
        <div className="h-4 w-16 rounded bg-surface-1" />
      </div>

      {/* Button placeholder */}
      <div className="h-11 w-full rounded-2xl bg-surface-2" />
    </div>
  );
}
