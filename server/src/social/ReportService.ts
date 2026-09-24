import { nanoid } from "nanoid";
import type { ReportReason } from "@shared/social/Report.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

/**
 * Records that one player reported another.
 *
 * Write-only from the server's point of view: nothing in the app reads a
 * report back yet, so nothing is held in memory — a report goes straight to
 * the durable store, where a moderator (and the retention job) will find it.
 * The reason has already been checked against the closed list by the caller.
 */
class ReportService {
  public submit(reporterId: string, reportedId: string, reason: ReportReason, now = Date.now()): void {
    progressionSync.reportSaved({
      id: `rep_${nanoid()}`,
      reporterId,
      reportedId,
      reason,
      createdAt: now,
    });
  }
}

export const reportService = new ReportService();
