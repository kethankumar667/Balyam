import { useEffect, useRef, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { getApiBaseUrl } from "../../lib/socket";

type PulseState =
  | { phase: "idle" | "checking" }
  | { phase: "reachable"; checkedAt: number; latency: number; samples: number[] }
  | { phase: "unavailable"; timedOut: boolean };

export function FooterSystemPulse() {
  const element = useRef<HTMLElement>(null);
  const checkNow = useRef<() => void>(() => {});
  const [state, setState] = useState<PulseState>({ phase: "idle" });

  useEffect(() => {
    let inView = false;
    let disposed = false;
    let request: AbortController | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let revision = 0;
    const samples: number[] = [];
    const active = () => inView && document.visibilityState !== "hidden" && !disposed;
    const stop = () => {
      revision++;
      clearTimeout(refreshTimer);
      clearTimeout(timeoutTimer);
      request?.abort();
      request = null;
    };

    async function check() {
      if (!active() || request) return;
      clearTimeout(refreshTimer);
      const controller = new AbortController();
      request = controller;
      const current = ++revision;
      let timedOut = false;
      setState({ phase: "checking" });
      const started = performance.now();
      timeoutTimer = setTimeout(() => { timedOut = true; controller.abort(); }, 5000);
      try {
        const response = await fetch(`${getApiBaseUrl().replace(/\/+$/, "")}/health`, {
          cache: "no-store", credentials: "omit", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unhealthy HTTP response");
        const body: unknown = await response.json();
        if (typeof body !== "object" || body === null || !("status" in body) || body.status !== "healthy") {
          throw new Error("Unhealthy server response");
        }
        const latency = Math.max(0, Math.round(performance.now() - started));
        if (current !== revision || !active()) return;
        samples.push(latency);
        if (samples.length > 8) samples.shift();
        setState({ phase: "reachable", checkedAt: Date.now(), latency, samples: [...samples] });
      } catch {
        if (current === revision && active()) setState({ phase: "unavailable", timedOut });
      } finally {
        if (current === revision) {
          clearTimeout(timeoutTimer);
          request = null;
          if (active()) refreshTimer = setTimeout(() => void check(), 60_000);
        }
      }
    }

    checkNow.current = () => { void check(); };
    const visibilityChanged = () => { if (active()) void check(); else stop(); };
    document.addEventListener("visibilitychange", visibilityChanged);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      if (visible === inView) return;
      inView = visible;
      visibilityChanged();
    });
    if (observer && element.current) observer.observe(element.current);
    else { inView = true; void check(); }
    return () => {
      disposed = true;
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      checkNow.current = () => {};
    };
  }, []);

  const reachable = state.phase === "reachable";
  const checking = state.phase === "checking";
  return <section ref={element} aria-label="System pulse" className="mt-6 max-w-sm rounded-2xl border border-footer-edge/25 bg-footer-glass/80 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-footer-cyan">
        <Activity size={14} aria-hidden="true" />System pulse
      </h3>
      <span className="text-[10px] text-footer-mute">60s checks while in view</span>
    </div>
    <div role="status" aria-live="polite" aria-atomic="true">
      <p className="flex items-center gap-2 text-sm font-semibold text-footer-ink">
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${reachable ? "bg-footer-mint motion-safe:animate-pulse" : "bg-footer-mute"}`} />
        {reachable ? "Game server reachable" : checking ? "Checking server..." : state.phase === "unavailable" ? "Server check unavailable" : "Not checked yet"}
      </p>
      {checking && <div aria-hidden="true" className="my-3 h-3 w-32 rounded bg-footer-edge/15 motion-safe:animate-pulse" />}
      {reachable && <>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-mono text-xs text-footer-mint">{state.latency} ms response time</p>
          {state.samples.length > 1 && <svg viewBox="0 0 120 24" className="h-6 w-28 text-footer-mint" aria-hidden="true">
            <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={state.samples.map((sample, i) =>
              `${i * 120 / (state.samples.length - 1)},${21 - sample / Math.max(1, ...state.samples) * 18}`).join(" ")} />
          </svg>}
        </div>
        <p className="mt-1 text-[10px] text-footer-soft">Last checked <time dateTime={new Date(state.checkedAt).toISOString()}>{new Date(state.checkedAt).toLocaleTimeString()}</time></p>
      </>}
      {state.phase === "unavailable" && <p className="mt-2 text-xs leading-relaxed text-footer-soft">
        {state.timedOut ? "The server check timed out. Try again." : "Could not confirm server availability. Try again."}
      </p>}
    </div>
    <details className="mt-2">
      <summary className="flex min-h-[44px] cursor-pointer items-center rounded-lg text-xs text-footer-soft underline decoration-footer-mute underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-cyan">
        What does this measure?
      </summary>
      <p className="pb-2 text-xs leading-relaxed text-footer-soft">A browser-to-server health request, not gameplay latency or a guarantee that every service is available.</p>
    </details>
    <button type="button" disabled={checking} onClick={() => checkNow.current()}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-xs font-semibold text-footer-cyan hover:bg-footer-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-cyan disabled:cursor-wait disabled:text-footer-mute">
      <RefreshCw size={13} aria-hidden="true" className={checking ? "motion-safe:animate-spin" : ""} />
      {checking ? "Checking server" : "Check server"}
    </button>
  </section>;
}
