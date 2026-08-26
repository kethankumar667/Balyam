import { logger } from "../lib/logger.js";
import { readPostgrestConfig } from "../persistence/postgrest.js";
import { InMemoryEconomyRepository } from "../persistence/InMemoryEconomyRepository.js";
import { SupabaseEconomyRepository } from "../persistence/SupabaseEconomyRepository.js";
import type { EconomyRepository } from "../persistence/EconomyRepository.js";
import { EconomyService } from "./EconomyService.js";

/**
 * Choosing where Economy V1 lives, once, at boot — the boot-time wiring
 * Phase 5/6 explicitly deferred ("no `economyRepository()`-style factory,
 * constructor injection only"). This is that wiring, at last: RoomManager
 * needs a live `EconomyService` handed to it, and something has to build
 * one.
 *
 * Mirrors `persistence/index.ts`'s `initialiseProgressionStore` exactly —
 * same rule, same reasoning, same escape hatch, reused rather than
 * reinvented:
 *
 *   service-role key present  ->  Supabase Postgres (durable)
 *   absent, development       ->  memory, with a warning that says what is lost
 *   absent, PRODUCTION        ->  refuse to start
 *
 * A production process that silently ran Economy V1 in memory would mean
 * every wallet, every ledger entry, and every outstanding voucher vanishes
 * on the next restart or idle spin-down — the exact failure class P0-3
 * already exists to prevent for progression, now real for money. It must be
 * impossible to deploy that by forgetting an environment variable.
 */

export interface EconomyStoreStatus {
  kind: "memory" | "supabase";
  durable: boolean;
  reachable: boolean;
  detail: string;
}

let status: EconomyStoreStatus = {
  kind: "memory",
  durable: false,
  reachable: true,
  detail: "not initialised",
};

/** For `/health` — never includes credentials. */
export function economyStoreStatus(): EconomyStoreStatus {
  return { ...status };
}

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

/**
 * Pick a repository, prove it works, build the service on top of it.
 *
 * Returns `null` only in the one case that's genuinely fine: development,
 * with no service-role key, where the room-level economy gate itself
 * degrades to "not configured" (see `RoomManager`'s optional
 * `economyService` constructor parameter) rather than this function
 * fabricating a store nothing asked for.
 */
export async function initialiseEconomyStore(): Promise<{ service: EconomyService | null; status: EconomyStoreStatus }> {
  const config = readPostgrestConfig();

  if (!config) {
    const escapeHatch = (process.env.ALLOW_EPHEMERAL_ECONOMY ?? "").trim().toLowerCase() === "true";

    if (isProduction() && !escapeHatch) {
      throw new Error(
        "Refusing to start in production without durable Economy V1 persistence. " +
          "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set, and " +
          "supabase/migrations/20260826000000_economy_v1.sql must have been applied. " +
          "Without them every wallet, ledger entry, and outstanding voucher is lost on restart. " +
          "Set ALLOW_EPHEMERAL_ECONOMY=true only for a smoke test that must not keep anything.",
      );
    }

    if (isProduction()) {
      logger.error({
        message:
          "ALLOW_EPHEMERAL_ECONOMY is set in production. Economy V1 is IN MEMORY and will be " +
          "erased by the next restart, crash, or idle spin-down.",
        module: "ECONOMY",
      });
    } else {
      logger.warn({
        message:
          "Economy V1 is in memory: SUPABASE_SERVICE_ROLE_KEY is not set. Every wallet and ledger " +
          "entry is lost when this process stops. Fine for development.",
        module: "ECONOMY",
      });
    }

    const repository: EconomyRepository = new InMemoryEconomyRepository();
    status = { kind: "memory", durable: false, reachable: true, detail: "no service-role key configured" };
    return { service: new EconomyService(repository), status: economyStoreStatus() };
  }

  const supabase = new SupabaseEconomyRepository(config);
  try {
    await supabase.ping();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error({
      message:
        `Configured for durable Economy V1 but the store did not answer: ${detail}. Check ` +
        "SUPABASE_URL, that the key is the SERVICE-ROLE key, and that " +
        "20260826000000_economy_v1.sql has been applied.",
      module: "ECONOMY",
    });
    throw new Error(`Economy V1 store unreachable: ${detail}`);
  }

  status = { kind: "supabase", durable: true, reachable: true, detail: "supabase postgres" };
  logger.info({
    message: "Economy V1 is durable (Supabase Postgres). Wallets and ledgers survive a restart.",
    module: "ECONOMY",
  });
  return { service: new EconomyService(supabase), status: economyStoreStatus() };
}

export { EconomyService } from "./EconomyService.js";
