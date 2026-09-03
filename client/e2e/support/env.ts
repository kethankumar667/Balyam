/**
 * Staging smoke-suite environment contract.
 *
 * This suite is a deployed-boundary check, not a local dev tool — it exists to be
 * pointed at a real, running staging deployment. That makes its default behavior
 * safety-critical: an absent, malformed, or accidentally-production URL must never
 * silently "just work" against the wrong target.
 *
 * ── The rules, in order ───────────────────────────────────────────────────
 *  1. E2E_BASE_URL and E2E_API_URL are both required. Absent or unparseable → throw,
 *     never a silent default.
 *  2. localhost / 127.0.0.1 / ::1 need nothing else — that is the safe, ordinary
 *     case a developer runs without thinking about it.
 *  3. Any other host requires E2E_ALLOW_REMOTE=true, set explicitly by whoever is
 *     running the suite. This is the "I know this is going over the network"
 *     confirmation — there is no default that lets a remote run happen by accident.
 *  4. A KNOWN production host is refused even with E2E_ALLOW_REMOTE=true. The only
 *     production domain this repository documents anywhere is the one in
 *     client/public/robots.txt's Sitemap: line — reused here, not invented. A later
 *     phase may add a second, SEPARATE, even-more-explicit switch to permit a
 *     deliberate production run; none exists yet, so today production is always
 *     refused.
 *
 * Never logs a full URL (which could carry a query string or path an operator did
 * not intend to have echoed into CI output) — only `hostname`, everywhere this
 * module or its callers report what they are talking to.
 */

/** Known production hosts and lookalike domains that this suite unconditionally refuses. */
export const KNOWN_PRODUCTION_HOSTS = new Set([
  "bhalyam.onrender.com",
  "bhalyam-backend.onrender.com",
]);

export interface E2EConfig {
  baseUrl: URL;
  apiUrl: URL;
  isLocal: boolean;
}

export function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isKnownProductionHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (KNOWN_PRODUCTION_HOSTS.has(lower)) return true;
  if (/(^|\.)bhalyam(-backend)?\.onrender\.com$/i.test(lower)) return true;
  return false;
}

export function parseRequiredUrl(varName: string, raw: string | undefined): URL {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) {
    throw new Error(
      `${varName} is required and was not set. This suite never assumes a default target — ` +
        `set ${varName} explicitly (see client/.env.e2e.example).`,
    );
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${varName} is not a valid absolute URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${varName} must use the http or https scheme (got "${url.protocol}").`);
  }
  if (url.username || url.password) {
    throw new Error(`${varName} must not contain credentials.`);
  }
  return url;
}

export function assertSafeToTarget(varName: string, url: URL, allowRemoteOverride?: boolean): void {
  if (isKnownProductionHost(url.hostname)) {
    throw new Error(
      `${varName} ("${url.hostname}") is a known production host. This suite refuses to run ` +
        "against production. There is no switch that permits this today — see env.ts's own header.",
    );
  }
  if (isLocalHost(url.hostname)) return;

  const allowRemote =
    allowRemoteOverride !== undefined
      ? allowRemoteOverride
      : (process.env.E2E_ALLOW_REMOTE ?? "").trim().toLowerCase() === "true";

  if (!allowRemote) {
    throw new Error(
      `${varName} ("${url.hostname}") is not localhost. Set E2E_ALLOW_REMOTE=true to explicitly ` +
        "confirm this run is intended to reach a remote (e.g. staging) target.",
    );
  }
}

/** Reads and validates the full E2E environment contract. Throws on any violation. */
export function loadE2EConfig(env: NodeJS.ProcessEnv = process.env): E2EConfig {
  const baseUrl = parseRequiredUrl("E2E_BASE_URL", env.E2E_BASE_URL);
  const apiUrl = parseRequiredUrl("E2E_API_URL", env.E2E_API_URL);

  const allowRemote = (env.E2E_ALLOW_REMOTE ?? "").trim().toLowerCase() === "true";
  assertSafeToTarget("E2E_BASE_URL", baseUrl, allowRemote);
  assertSafeToTarget("E2E_API_URL", apiUrl, allowRemote);

  const baseIsLocal = isLocalHost(baseUrl.hostname);
  const apiIsLocal = isLocalHost(apiUrl.hostname);
  if (baseIsLocal !== apiIsLocal) {
    throw new Error(
      `Mixed local and remote targets are not allowed: E2E_BASE_URL is ${baseIsLocal ? "local" : "remote"} ` +
        `while E2E_API_URL is ${apiIsLocal ? "local" : "remote"}. Both must target the same environment tier.`,
    );
  }

  return { baseUrl, apiUrl, isLocal: baseIsLocal };
}

/** For log lines: the host only, never the full URL (path/query may not be safe to echo). */
export function safeHost(url: URL): string {
  return url.hostname + (url.port ? `:${url.port}` : "");
}
