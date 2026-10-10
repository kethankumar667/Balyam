import { logger } from "../lib/logger.js";
import { persistenceStatus } from "../persistence/index.js";
import { PostgrestClient, readPostgrestConfig } from "../persistence/postgrest.js";

/**
 * Daily retention for guests who did nothing: calls `purge_idle_guests` (migration
 * `20261026000000_purge_idle_guests.sql`), which removes idle guest identities that never got a
 * wallet and were never absorbed into an account, and keeps everyone else whole.
 *
 * Runs only on Supabase. On memory there is nothing durable to purge. A missing function (the
 * migration not applied yet) is logged once and the job carries on, so a deploy that went out first
 * is a quiet no-op rather than a crash.
 */

const MIN_IDLE_DAYS = 7;
const DEFAULT_IDLE_DAYS = 45;
const DAY_MS = 86_400_000;
const FIRST_RUN_DELAY_MS = 5 * 60_000;
const BATCH = 500;

export function idleGuestDays(): number {
  const raw = Number(process.env.IDLE_GUEST_DAYS);
  return Number.isInteger(raw) && raw >= MIN_IDLE_DAYS ? raw : DEFAULT_IDLE_DAYS;
}

export interface PurgeOutcome {
  purged: number;
  skipped: number;
}

export type PurgeRpc = (days: number, batch: number) => Promise<PurgeOutcome>;

const isMissingFunction = (message: string): boolean => /PGRST202|Could not find the function/.test(message);

/** One pass. Returns what it did, or `null` if the function is missing or the call failed (already logged). */
export async function runIdleGuestPurge(rpc: PurgeRpc, days: number = idleGuestDays()): Promise<PurgeOutcome | null> {
  try {
    const outcome = await rpc(days, BATCH);
    if (outcome.purged > 0 || outcome.skipped > 0) {
      logger.info({
        message: `Idle guest purge: removed ${outcome.purged}, kept ${outcome.skipped} that something still references.`,
        module: "AUTH",
      });
    }
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({
      message: isMissingFunction(message)
        ? "Idle guest purge skipped: purge_idle_guests is not in the database yet (run migration 20261026000000)."
        : `Idle guest purge failed: ${message}`,
      module: "AUTH",
    });
    return null;
  }
}

export function startIdleGuestPurge(): void {
  if (persistenceStatus().kind !== "supabase") return;
  const config = readPostgrestConfig();
  if (!config) return;
  const db = new PostgrestClient(config);
  const rpc: PurgeRpc = (days, batch) => db.rpc<PurgeOutcome>("purge_idle_guests", { p_idle_days: days, p_batch: batch });

  const first = setTimeout(() => void runIdleGuestPurge(rpc), FIRST_RUN_DELAY_MS);
  const daily = setInterval(() => void runIdleGuestPurge(rpc), DAY_MS);
  first.unref();
  daily.unref();
}
