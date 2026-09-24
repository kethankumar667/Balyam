/**
 * Why a player can be reported.
 *
 * A CLOSED list, defined once and used by both sides. The server validates a
 * report's reason by set membership against this; the client builds its picker
 * from it. There is deliberately no free-text field: a note about another
 * person is personal data a report does not need in order to be actionable.
 */
export const REPORT_REASONS = [
  "HARASSMENT",
  "SPAM",
  "CHEATING",
  "INAPPROPRIATE_NAME",
  "IMPERSONATION",
  "OTHER",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

const REASON_SET: ReadonlySet<string> = new Set(REPORT_REASONS);

/** Exact membership only — "harassment" or " HARASSMENT" is not a reason. */
export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && REASON_SET.has(value);
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  HARASSMENT: "Harassment or bullying",
  SPAM: "Spam",
  CHEATING: "Cheating",
  INAPPROPRIATE_NAME: "Inappropriate name or avatar",
  IMPERSONATION: "Pretending to be someone else",
  OTHER: "Something else",
};
