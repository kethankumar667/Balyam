import { logger } from "../lib/logger.js";
import { progressionRepository } from "../persistence/index.js";
import { REPORT_RETENTION_DAYS } from "./limits.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Let the server finish booting before the first sweep. */
const DEFAULT_INITIAL_DELAY_MS = 2 * 60 * 1000;

export interface ReportRetentionJobOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  /** The clock, injectable so the window can be tested without waiting a year. */
  now?: () => number;
}

/** Removes reports older than the retention window and returns how many went. */
export async function pruneExpiredReports(now = Date.now()): Promise<number> {
  return progressionRepository().pruneReportsBefore(now - REPORT_RETENTION_DAYS * DAY_MS);
}

/**
 * Prunes old reports once a day.
 *
 * A report names two people, so it is not kept indefinitely: past the window it
 * is deleted, and that is enforced here rather than promised in a document. The
 * sweep deletes everything past the window, not "one day's worth", so a missed
 * run is caught up by the next. A failed run is logged and retried tomorrow; it
 * never throws into the process. Returns a function that stops the job.
 */
export function startReportRetentionJob(options: ReportRetentionJobOptions = {}): () => void {
  const intervalMs = options.intervalMs ?? DAY_MS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const now = options.now ?? Date.now;

  let running = false;

  const sweep = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const removed = await pruneExpiredReports(now());
      if (removed > 0) {
        logger.info({
          message: `[SOCIAL] Retention removed ${removed} report(s) older than ${REPORT_RETENTION_DAYS} days.`,
          module: "SOCIAL",
        });
      }
    } catch (err) {
      logger.warn({
        message: `[SOCIAL] Report retention sweep failed; will retry at the next run: ${err instanceof Error ? err.message : String(err)}`,
        module: "SOCIAL",
      });
    } finally {
      running = false;
    }
  };

  const first = setTimeout(() => void sweep(), initialDelayMs);
  const recurring = setInterval(() => void sweep(), intervalMs);
  first.unref();
  recurring.unref();

  return () => {
    clearTimeout(first);
    clearInterval(recurring);
  };
}
