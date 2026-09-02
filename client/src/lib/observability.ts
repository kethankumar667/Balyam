/**
 * Centralized Client Observability & Telemetry Logger
 *
 * ── Privacy & Security Guardrails ─────────────────────────────────────
 * Never logs sensitive secrets, tokens, passwords, OTPs, or private user credentials.
 * Automatically redacts sensitive fields from objects before storage/output.
 */

export interface TelemetryEvent {
  id: string;
  category: "AUTH" | "MULTIPLAYER" | "NETWORK" | "ERROR" | "PERF";
  name: string;
  timestamp: number;
  data?: Record<string, unknown>;
  error?: string;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "seattoken",
  "otp",
  "secret",
  "authorization",
  "apikey",
]);

function sanitizeData(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map(sanitizeData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

const MAX_RING_BUFFER = 60;
const ringBuffer: TelemetryEvent[] = [];

function recordEvent(
  category: TelemetryEvent["category"],
  name: string,
  data?: Record<string, unknown>,
  error?: unknown,
): void {
  const event: TelemetryEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    name,
    timestamp: Date.now(),
    data: data ? (sanitizeData(data) as Record<string, unknown>) : undefined,
    error: error instanceof Error ? error.message : typeof error === "string" ? error : undefined,
  };

  ringBuffer.push(event);
  if (ringBuffer.length > MAX_RING_BUFFER) {
    ringBuffer.shift();
  }

  // Errors also reach the (optional, env-gated) remote sink — see
  // `sinkToSentry` below. Non-error categories stay local: the ring buffer
  // already serves their purpose (attaching recent context to a crash
  // report via `getRecentEvents()`), and shipping every auth/network event
  // remotely would burn quota and player trust for little diagnostic value.
  if (category === "ERROR") {
    sinkToSentry(name, error, data);
  }

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    const style =
      category === "ERROR"
        ? "color: #EF4444; font-weight: bold"
        : category === "MULTIPLAYER"
        ? "color: #3B82F6"
        : category === "AUTH"
        ? "color: #10B981"
        : "color: #8B5CF6";
    console.log(`%c[${category}] ${name}`, style, event.data ?? "", event.error ?? "");
  }
}

/**
 * Remote error sink (Sentry), OFF unless VITE_SENTRY_DSN is set.
 *
 * The ring buffer above is in-memory inside the player's tab — it vanishes
 * with the tab, so after a production crash there is nothing to inspect.
 * This forwards ERROR-category events to Sentry when configured.
 *
 * Constraints, mirroring the server's `crashTelemetry.ts`:
 *   - No `VITE_SENTRY_DSN` → total no-op, `@sentry/react` is never imported
 *     and the bundle stays free of the SDK (it is a dynamic import, so it
 *     also never lands in the initial chunk).
 *   - Fire-and-forget and self-swallowing: telemetry must never be the
 *     thing that crashes the app it observes.
 *   - Loads once on first error; a load failure degrades silently to the
 *     existing logger path.
 */
const SENTRY_DSN: string = import.meta.env.VITE_SENTRY_DSN as string | undefined ?? "";
let sentryLoadPromise: Promise<boolean> | null = null;

function loadSentry(): Promise<boolean> {
  if (!SENTRY_DSN) return Promise.resolve(false);
  if (!sentryLoadPromise) {
    sentryLoadPromise = import("@sentry/react")
      .then((Sentry) => {
        Sentry.init({
          dsn: SENTRY_DSN,
          environment: import.meta.env.MODE,
        });
        return true;
      })
      .catch(() => false);
  }
  return sentryLoadPromise;
}

function sinkToSentry(name: string, error: unknown, data?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  void loadSentry()
    .then((ok) => {
      if (!ok) return;
      return import("@sentry/react").then((Sentry) => {
        if (error instanceof Error) {
          Sentry.captureException(error, { extra: { ...data, eventName: name } });
        } else {
          Sentry.captureMessage(`${name}: ${typeof error === "string" ? error : "unknown"}`, {
            extra: data,
          });
        }
      });
    })
    .catch(() => undefined);
}

export const telemetry = {
  auth(name: string, data?: Record<string, unknown>): void {
    recordEvent("AUTH", name, data);
  },

  multiplayer(name: string, data?: Record<string, unknown>): void {
    recordEvent("MULTIPLAYER", name, data);
  },

  network(name: string, data?: Record<string, unknown>): void {
    recordEvent("NETWORK", name, data);
  },

  error(name: string, error: unknown, data?: Record<string, unknown>): void {
    recordEvent("ERROR", name, data, error);
  },

  getRecentEvents(): readonly TelemetryEvent[] {
    return [...ringBuffer];
  },
};
