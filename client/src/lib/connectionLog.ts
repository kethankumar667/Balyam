/**
 * A persistent record of what the socket actually did.
 *
 * Two rounds of reconnect fixes have now failed on a real phone, and the
 * reason is that nobody can see anything: the device shows a banner, the
 * console is unreachable, and by the time the player is back on wifi the
 * evidence is gone. Every diagnosis so far has been a guess.
 *
 * This writes each connection event to localStorage as it happens, so the
 * log survives the outage, a page reload, and even the tab being discarded
 * by the OS. /diagnostics reads it back.
 *
 * Deliberately tiny: a bounded ring of plain strings, no dependencies, and a
 * synchronous write per event. It must not be able to fail during the exact
 * failure it exists to record.
 */

export interface ConnEvent {
  /** ms since epoch. */
  t: number;
  kind: string;
  detail?: string;
}

const KEY = "bhalyam.connlog";
/** Enough to cover a long outage without growing unbounded. */
const MAX_EVENTS = 80;

function safeRead(): ConnEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConnEvent[]) : [];
  } catch {
    return [];
  }
}

/** Record one event. Never throws — logging must not break the app. */
export function logConn(kind: string, detail?: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    const events = safeRead();
    events.push({ t: Date.now(), kind, detail });
    // Keep the TAIL: the interesting part of a failure is always the end.
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota, private mode, SSR — none of it is worth a crash */
  }
}

export function readConnLog(): ConnEvent[] {
  return safeRead();
}

export function clearConnLog(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Human-readable dump, with elapsed time from the first event. Relative
 * timing is what matters when reading this: "attempt 12 at +38s" says
 * something, a wall-clock timestamp does not.
 */
export function formatConnLog(): string {
  const events = safeRead();
  const firstEvent = events[0];
  if (!firstEvent) return "No connection events recorded.";
  const start = firstEvent.t;
  const lines = events.map((e) => {
    const secs = ((e.t - start) / 1000).toFixed(1).padStart(7);
    return `+${secs}s  ${e.kind}${e.detail ? `  ${e.detail}` : ""}`;
  });
  return [
    `BHALYAM connection log (${events.length} events)`,
    `started ${new Date(start).toISOString()}`,
    `ua ${typeof navigator !== "undefined" ? navigator.userAgent : "?"}`,
    "",
    ...lines,
  ].join("\n");
}
