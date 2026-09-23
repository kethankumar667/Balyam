import { logger } from "../lib/logger.js";
import type { MandaliRepository } from "./MandaliRepository.js";

/** Mandali chat is kept this long, then removed. */
export const MANDALI_CHAT_RETENTION_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Let the server finish booting (and any deploy churn settle) before the first sweep. */
const DEFAULT_INITIAL_DELAY_MS = 2 * 60 * 1000;

export interface MandaliRetentionJobOptions {
  retentionDays?: number;
  intervalMs?: number;
  initialDelayMs?: number;
}

/**
 * Removes Mandali chat older than the retention window, once a day.
 *
 * The database function deletes everything past the window rather than "one
 * day's worth", so a sweep that was missed (server asleep, deploy, outage) is
 * caught up by the next one. In steady state each run removes the single day
 * that has just crossed the line. The function is safe to run from several
 * server instances at once, and a failed run is simply retried tomorrow — it
 * never throws into the process.
 *
 * Returns a function that stops the job.
 */
export function startMandaliRetentionJob(
  repository: MandaliRepository,
  options: MandaliRetentionJobOptions = {}
): () => void {
  const retentionDays = options.retentionDays ?? MANDALI_CHAT_RETENTION_DAYS;
  const intervalMs = options.intervalMs ?? DAY_MS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;

  let running = false;

  const sweep = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const removed = await repository.pruneExpiredMessagesDurable(retentionDays);
      if (removed > 0) {
        logger.info({
          message: `[MANDALI] Retention removed ${removed} chat message(s) older than ${retentionDays} days.`,
          module: "MANDALI",
        });
      }
    } catch (err) {
      logger.warn({
        message: `[MANDALI] Chat retention sweep failed; will retry at the next run: ${err instanceof Error ? err.message : String(err)}`,
        module: "MANDALI",
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
