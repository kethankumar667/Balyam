import { useEffect, useState } from "react";
import { useAdminLiveStore } from "../../../store/adminLiveStore";
import { Radio, RefreshCw, AlertCircle, WifiOff, ShieldAlert } from "lucide-react";

/**
 * How long a tick may go missing before a nominally "connected" transport is
 * shown as stale rather than live. Set well above the server's 1s broadcast
 * cadence (`TelemetryBroadcastHub`) to absorb ordinary network jitter, but
 * tight enough that a genuinely stuck stream is caught within a couple of
 * missed ticks rather than sitting on a reassuring green badge indefinitely.
 */
const FRESHNESS_THRESHOLD_MS = 2_500;

/** How often the badge re-checks freshness on its own, independent of
 *  whether a new tick has actually arrived — this is what lets LIVE age
 *  into STALE without needing new data to trigger the re-render. */
const FRESHNESS_CHECK_INTERVAL_MS = 1_000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

type BadgeState = "unauthorized" | "connecting" | "live" | "stale" | "polling";

export default function ConnectionStatusBadge() {
  const status = useAdminLiveStore((s) => s.connectionStatus);
  const lastTickAt = useAdminLiveStore((s) => s.lastTickAt);
  const isUnauthorized = useAdminLiveStore((s) => s.isUnauthorized);
  const reducedMotion = usePrefersReducedMotion();

  // A tick's own arrival re-renders this component (it's subscribed to
  // `lastTickAt`), but staleness has to be detectable with NO new tick
  // arriving at all — that's exactly the failure this badge exists to
  // surface. One timer, owned here (not one per KPI card elsewhere), ticks
  // this component only while it can actually matter.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (status !== "connected") return;
    const id = window.setInterval(() => forceTick((n) => n + 1), FRESHNESS_CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [status]);

  const formattedTime = lastTickAt
    ? new Date(lastTickAt).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const state: BadgeState = isUnauthorized
    ? "unauthorized"
    : status === "reconnecting"
      ? "connecting"
      : status === "connected"
        ? lastTickAt !== null && Date.now() - lastTickAt <= FRESHNESS_THRESHOLD_MS
          ? "live"
          : "stale"
        : "polling";

  if (state === "unauthorized") {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold"
        role="status"
        aria-live="polite"
      >
        <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Not Authorized</span>
      </div>
    );
  }

  if (state === "connecting") {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold"
        role="status"
        aria-live="polite"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${reducedMotion ? "" : "animate-spin"}`} aria-hidden="true" />
        <span>Reconnecting Stream...</span>
      </div>
    );
  }

  if (state === "live") {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2">
          {!reducedMotion && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Radio className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Live Stream (1s)</span>
        {formattedTime && <span className="text-[10px] opacity-75 font-mono">[{formattedTime}]</span>}
      </div>
    );
  }

  if (state === "stale") {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold"
        role="status"
        aria-live="polite"
      >
        <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Stream Stale</span>
        {formattedTime && <span className="text-[10px] opacity-75 font-mono">[{formattedTime}]</span>}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-600 dark:text-zinc-400 text-xs font-semibold"
      role="status"
      aria-live="polite"
    >
      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Polling Sync (3s)</span>
      {formattedTime && <span className="text-[10px] opacity-75 font-mono">[{formattedTime}]</span>}
    </div>
  );
}
