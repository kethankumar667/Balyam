import type { ClientTelemetryPayload } from "@shared/types.js";

export const CLIENT_TELEMETRY_MAX_DURATION_MS = 300_000;

export interface SanitizedClientTelemetry {
  pageLoadMs?: number;
  roomLoadMs?: number;
  boardLoadMs?: number;
}

export function sanitizeClientTelemetry(
  payload: ClientTelemetryPayload | undefined | null,
): SanitizedClientTelemetry {
  const out: SanitizedClientTelemetry = {};
  if (!payload || typeof payload !== "object") return out;
  for (const key of ["pageLoadMs", "roomLoadMs", "boardLoadMs"] as const) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      out[key] = Math.min(value, CLIENT_TELEMETRY_MAX_DURATION_MS);
    }
  }
  return out;
}
