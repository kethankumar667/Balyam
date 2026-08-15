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
