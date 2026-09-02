/**
 * Optional crash telemetry sink (Sentry), env-gated.
 *
 * The structured logger already puts every error on stdout — this module
 * exists because stdout is only useful when someone is reading it. On a
 * single-operator deployment the difference between "logged" and "someone
 * got paged" is the difference between finding out on Saturday and finding
 * out the following week.
 *
 * Design constraints, in order:
 *
 * 1. OFF by default. No `SENTRY_DSN` → every function here is a no-op, the
 *    `@sentry/node` import never happens (it is dynamic, below), and the
 *    server behaves exactly as it did before this file existed. A dev
 *    machine and a misconfigured deploy both need zero infrastructure.
 *
 * 2. NEVER in the request path. `capture` is fire-and-forget and swallows
 *    its own failures: telemetry that can crash the thing it observes is
 *    worse than no telemetry. If Sentry is down the errors still reach the
 *    logger, which is the channel that already worked.
 *
 * 3. No SDK dependency at import time. The dynamic `import()` keeps
 *    `@sentry/node` out of the boot path entirely when unset, so the
 *    production readiness of this file does not depend on the package
 *    having been installed.
 */

import { logger } from "./logger.js";

const DSN = process.env.SENTRY_DSN?.trim() || "";

/** Resolved once, on first use. `null` = disabled or failed to load. */
let sdkPromise: Promise<boolean> | null = null;

function resolveSdk(): Promise<boolean> {
  if (!DSN) return Promise.resolve(false);
  if (!sdkPromise) {
    sdkPromise = (async () => {
      try {
        const Sentry = await import("@sentry/node");
        Sentry.init({
          dsn: DSN,
          environment: process.env.NODE_ENV === "production" ? "production" : "development",
        });
        logger.info({ message: "Crash telemetry (Sentry) enabled", module: "TELEMETRY" });
        return true;
      } catch (err) {
        // Most likely: package not installed while SENTRY_DSN was set.
        // Degrade to logger-only rather than boot-failing a working server.
        logger.warn({
          message: `SENTRY_DSN is set but @sentry/node could not load; crash telemetry disabled. ${String(err)}`,
          module: "TELEMETRY",
        });
        return false;
      }
    })();
  }
  return sdkPromise;
}

/** Report an exception. Never throws, never blocks the caller. */
export function captureCrash(err: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  void resolveSdk()
    .then((ok) => {
      if (!ok) return;
      // Late import is fine — resolveSdk() has already run by now.
      return import("@sentry/node").then((Sentry) => {
        Sentry.captureException(err, { extra: context });
      });
    })
    .catch(() => undefined);
}

/** Explicitly tell the sink the process is going away (graceful shutdown). */
export async function flushCrashTelemetry(): Promise<void> {
  if (!DSN) return;
  try {
    const ok = await resolveSdk();
    if (!ok) return;
    const Sentry = await import("@sentry/node");
    // Bounded wait: shutdown has an 8s backstop and telemetry must not
    // be the thing that hits it.
    await Sentry.flush(2_000);
  } catch {
    // A sink that cannot be flushed on the way out is not worth dying for.
  }
}
