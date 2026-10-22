/**
 * What a public health probe may say about a failure.
 *
 * `GET /health` is read by uptime pingers and by every runbook, so it stays public and keeps every count,
 * flag and timestamp. What it must not carry is the raw error TEXT some subsystems remember in `lastError`
 * (for example `settle(match-123): <database message>`): that can name matches, tables or columns, and the
 * same text is already in the server log, where an operator should read it.
 */

export const REDACTED_ERROR = "(details in the server log)";

/** A copy of `value` with every non-null string `lastError` replaced; `null` stays `null`, so "no error" still reads as none. */
export function redactLastErrors<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactLastErrors(item)) as T;
  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      copy[key] = key === "lastError" && typeof inner === "string" ? REDACTED_ERROR : redactLastErrors(inner);
    }
    return copy as T;
  }
  return value;
}
