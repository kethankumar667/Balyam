import { GUEST_IDLE_EXPIRY_DAYS } from "@shared/guestIdentity.js";
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

const MIN_IDLE_DAYS = GUEST_IDLE_EXPIRY_DAYS;
/**
 * One day PAST the guest token lifetime. A guest's row is touched when their token is renewed, so by
 * the time a row has been quiet for the token's whole life the token is dead and nobody can come back
 * as that guest; the extra day absorbs clock and ordering slack so a still-valid token is never purged.
 */
const DEFAULT_IDLE_DAYS = GUEST_IDLE_EXPIRY_DAYS + 1;
const DAY_MS = 86_400_000;
const FIRST_RUN_DELAY_MS = 5 * 60_000;
const BATCH = 500;

export function idleGuestDays(): number {
  const raw = Number(process.env.IDLE_GUEST_DAYS);
  return Number.isInteger(raw) && raw >= MIN_IDLE_DAYS ? raw : DEFAULT_IDLE_DAYS;
}

export interface PurgeOutcome {
  /** Idle guests with no wallet, deleted outright. */
  purged: number;
  /** Idle guests who had a wallet: personal data erased, the anonymous coin ledger kept. Absent before migration 20261028000000. */
  erased?: number;
  skipped: number;
}

export type PurgeRpc = (days: number, batch: number) => Promise<PurgeOutcome>;

const isMissingFunction = (message: string): boolean => /PGRST202|Could not find the function/.test(message);

/** One pass. Returns what it did, or `null` if the function is missing or the call failed (already logged). */
export async function runIdleGuestPurge(rpc: PurgeRpc, days: number = idleGuestDays()): Promise<PurgeOutcome | null> {
  try {
    const outcome = await rpc(days, BATCH);
    const erased = outcome.erased ?? 0;
    if (outcome.purged > 0 || erased > 0 || outcome.skipped > 0) {
      logger.info({
        message: `Idle guest purge: removed ${outcome.purged}, erased ${erased} with a wallet, kept ${outcome.skipped} that something still references.`,
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
