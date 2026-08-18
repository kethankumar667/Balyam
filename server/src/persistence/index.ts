import { logger } from "../lib/logger.js";
import type { ProgressionRepository } from "./ProgressionRepository.js";
import { InMemoryProgressionRepository } from "./InMemoryProgressionRepository.js";
import { SupabaseProgressionRepository } from "./SupabaseProgressionRepository.js";
import { readPostgrestConfig } from "./postgrest.js";

/**
 * Choosing where progression lives, once, at boot.
 *
 * ── The rule ──────────────────────────────────────────────────────────
 *   service-role key present  →  Supabase Postgres
 *   absent, development       →  memory, with a warning that says what is lost
 *   absent, PRODUCTION        →  refuse to start
 *
 * That last line is the whole point of the guard. A production process that
 * silently falls back to memory is the P0-3 finding wearing a fix's clothes:
 * everything works, every test passes, and the first redeploy erases every
 * player's rewards. It has to be impossible to deploy that by forgetting an
 * environment variable, which means the failure has to happen at boot, where
 * somebody is watching.
 *
 * The strictness is opt-out-able with `ALLOW_EPHEMERAL_PROGRESSION=true`, for
 * the one legitimate case — a production-mode smoke test with no database. It
 * is deliberately verbose to type and it logs at ERROR every time it is used,
 * because an escape hatch nobody notices is just the old behaviour with extra
 * steps.
 */

let repository: ProgressionRepository | null = null;

export function progressionRepository(): ProgressionRepository {
  if (!repository) {
    // Nothing initialised it. Fall back rather than throw, so a unit test that
    // reaches this indirectly gets a working store instead of a crash — but
    // the server's own boot path always calls `initialiseProgressionStore`.
    repository = new InMemoryProgressionRepository();
  }
  return repository;
}

/** Test seam. Lets a suite install a stub or a fresh in-memory store. */
export function setProgressionRepository(next: ProgressionRepository | null): void {
  repository = next;
}

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

export interface PersistenceStatus {
  kind: "memory" | "supabase";
  durable: boolean;
  reachable: boolean;
  detail: string;
}

let status: PersistenceStatus = {
  kind: "memory",
  durable: false,
  reachable: true,
  detail: "not initialised",
};

/** For `/health` and the operational API. Never includes credentials. */
export function persistenceStatus(): PersistenceStatus {
  return { ...status };
}

/**
 * Pick a repository, prove it works, and refuse to continue if it does not.
 *
 * `ping()` is not ceremony. A URL typo, a publishable key where a service-role
 * key belongs, and a project that never ran the migration all produce a server
 * that starts perfectly and fails at the first write — three different fixes,
 * all discovered by a player rather than by a deploy.
 */
export async function initialiseProgressionStore(): Promise<PersistenceStatus> {
  const config = readPostgrestConfig();

  if (!config) {
    const escapeHatch =
      (process.env.ALLOW_EPHEMERAL_PROGRESSION ?? "").trim().toLowerCase() === "true";

    if (isProduction() && !escapeHatch) {
      throw new Error(
        "Refusing to start in production without durable progression. " +
          "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set, and " +
          "supabase/migrations/20260818000000_progression_persistence.sql must have been applied. " +
          "Without them every profile, reward claim, friendship and match record is lost on " +
          "restart. Set ALLOW_EPHEMERAL_PROGRESSION=true only for a smoke test that must not " +
          "keep anything.",
      );
    }

    if (isProduction()) {
      logger.error({
        message:
          "ALLOW_EPHEMERAL_PROGRESSION is set in production. Progression is IN MEMORY and will " +
          "be erased by the next restart, crash or idle spin-down. Rewards can be claimed again " +
          "after every deploy.",
        module: "PERSISTENCE",
      });
    } else {
      logger.warn({
        message:
          "Progression is in memory: SUPABASE_SERVICE_ROLE_KEY is not set. Everything a player " +
          "earns is lost when this process stops. Fine for development; see " +
          "docs/runbooks/persistence.md to make it durable.",
        module: "PERSISTENCE",
      });
    }

    repository = new InMemoryProgressionRepository();
    status = {
      kind: "memory",
      durable: false,
      reachable: true,
      detail: "no service-role key configured",
    };
    return persistenceStatus();
  }

  const supabase = new SupabaseProgressionRepository(config);
  try {
    await supabase.ping();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error({
      message:
        `Configured for durable progression but the store did not answer: ${detail}. ` +
        "Check SUPABASE_URL, that the key is the SERVICE-ROLE key, and that " +
        "20260818000000_progression_persistence.sql has been applied.",
      module: "PERSISTENCE",
    });
    // Never quietly downgrade to memory: that is the exact failure mode this
    // guard exists to prevent, and it would be worse for having looked healthy.
    throw new Error(`Progression store unreachable: ${detail}`);
  }

  repository = supabase;
  status = {
    kind: "supabase",
    durable: true,
    reachable: true,
    detail: "supabase postgres",
  };
  logger.info({
    message: "Progression is durable (Supabase Postgres). Rewards, matches and friendships survive a restart.",
    module: "PERSISTENCE",
  });
  return persistenceStatus();
}

export { InMemoryProgressionRepository } from "./InMemoryProgressionRepository.js";
export { SupabaseProgressionRepository } from "./SupabaseProgressionRepository.js";
export * from "./ProgressionRepository.js";
