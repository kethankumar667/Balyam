import { getApiBaseUrl } from "./socket";
import { currentAccessToken } from "../store/authStore";

/**
 * Talking to `/api/operational/*`, which now requires a credential.
 *
 * ── What changed under this ───────────────────────────────────────────
 * The admin dashboard used to call these endpoints with a bare `fetch()` and
 * no credential, and it worked, because the server let anyone in whenever
 * `OPERATIONAL_SECRET` was unset. The server no longer does. Every call from
 * this file carries one of two credentials, and a call with neither gets a 401
 * — which is now a state the UI has to render rather than a case that could
 * not arise.
 *
 * ── Two credentials, in priority order ────────────────────────────────
 * 1. The signed-in player's Supabase access token. The server verifies it and
 *    checks the id in the verified `sub` claim against `ADMIN_USER_IDS`. This
 *    is the path for a human, and it is the one to prefer: it identifies WHO
 *    looked, it is revoked by removing one id from a list, and nothing
 *    long-lived is stored in the browser.
 *
 * 2. A shared operational key the operator pastes in. For a deployment with no
 *    admin allowlist configured, and for machines.
 *
 * ── On storing the key ────────────────────────────────────────────────
 * `sessionStorage`, not `localStorage`: it dies with the tab, is not shared
 * with other tabs, and never reaches the DPDP data inventory — which
 * enumerates the PLAYER data this app keeps, and an operator's own key is
 * neither player data nor something a player's erasure request covers.
 *
 * It is still a bearer credential sitting in web storage, reachable by any
 * script that gets to run on the origin. That is a real limitation and the
 * reason path 1 exists. Documented, not hidden.
 *
 * ── `VITE_OPERATIONAL_KEY` is a DEV-only convenience, never a prod path ──
 * ADMIN-SEC-001 (2026-08-25 audit): this fallback used to be read
 * unconditionally. Any `VITE_`-prefixed variable is inlined into the public
 * JS bundle by Vite at build time — there is no such thing as a "server-only"
 * `VITE_` var — so an unconditional read meant that setting this variable in
 * a production `.env` (an easy mistake: `client/.env.example` and
 * `server/.env.example` used to ship the SAME example value for this and for
 * `OPERATIONAL_SECRET`, inviting exactly that copy-paste) shipped the shared
 * operational key to every visitor's browser, in the clear, defeating
 * `requireOperationalAuth` entirely.
 *
 * The fix is the `import.meta.env.DEV` guard below. `DEV` is a compile-time
 * constant — Vite/esbuild replace it with the literal `false` in a
 * production build, which folds `import.meta.env.DEV && ...` to `false` and
 * lets esbuild's minifier dead-code-eliminate the whole branch, including
 * the string literal `VITE_OPERATIONAL_KEY` would otherwise have been
 * replaced with. That elimination — not just "this code doesn't run" but
 * "this string does not exist in the emitted file" — is what
 * `scripts/quality-gates/adminKeySecretLeakGuard.mjs` (`npm run
 * check:admin-key-leak`) proves against a real `vite build` output, not
 * just against source — run it after `npm run build:client`.
 *
 * Never widen this gate. Never read `VITE_OPERATIONAL_KEY` outside a `DEV`
 * check, and never move the value into `localStorage`, a log line, an error
 * message, or a toast — any of those re-opens the same hole this closes.
 */

const OPS_KEY_STORAGE = "bhalyam.ops.key";
export const DEV_DEFAULT_OPERATIONAL_KEY = "bhalyam_admin_secret_key_2026";

export function readOperationalKey(): string | null {
  try {
    const fromSession = sessionStorage.getItem(OPS_KEY_STORAGE);
    if (fromSession) return fromSession;
    // DEV-only: see the comment block above. This must never read
    // VITE_OPERATIONAL_KEY outside `import.meta.env.DEV` — that is the
    // entire fix for ADMIN-SEC-001.
    if (import.meta.env.DEV && import.meta.env.VITE_OPERATIONAL_KEY) {
      return String(import.meta.env.VITE_OPERATIONAL_KEY).trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function storeOperationalKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) sessionStorage.setItem(OPS_KEY_STORAGE, trimmed);
    else sessionStorage.removeItem(OPS_KEY_STORAGE);
  } catch {
    /* private browsing — the key holds for this page only */
  }
}

export function clearOperationalKey(): void {
  try {
    sessionStorage.removeItem(OPS_KEY_STORAGE);
  } catch {
    /* nothing to clear */
  }
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const session = currentAccessToken();
  if (session) headers["Authorization"] = `Bearer ${session}`;
  const opsKey = readOperationalKey();
  // Sent on its own header, so a request can carry BOTH: a signed-in operator
  // whose id is not on the allowlist still gets in with the shared key,
  // without having to sign out first.
  if (opsKey) headers["x-operational-key"] = opsKey;
  return headers;
}

export class OperationalAuthError extends Error {
  constructor() {
    super("Not authorized for the operational API");
    this.name = "OperationalAuthError";
  }
}

/**
 * One operational GET. Throws `OperationalAuthError` on 401 so callers can
 * tell "you may not look at this" apart from "the server is unwell", which
 * are different screens.
 */
export async function operationalFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, { headers: authHeaders() });
  if (res.status === 401) throw new OperationalAuthError();
  if (!res.ok) {
    let message = `Operational request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data.message) message = data.message;
      else if (data.error) message = data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

/**
 * One operational POST. Supports sending JSON payload with operational credentials.
 */
export async function operationalPost<T>(path: string, body: unknown): Promise<T> {
  const headers = authHeaders();
  headers["Content-Type"] = "application/json";
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new OperationalAuthError();
  if (!res.ok) {
    let message = `Operational request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data.message) message = data.message;
      else if (data.error) message = data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export type OperationalPrincipal =
  | { kind: "ops-key" }
  | { kind: "admin-user"; userId: string; email: string | null };

/**
 * Ask the SERVER whether this browser may see the operations console.
 *
 * The distinction that matters: the answer comes from the server, not from a
 * flag in the client's own store. A client-side `isMember` check would gate a
 * screen while leaving the data behind it open, which is how `/admin` was
 * unprotected in the first place. Here the gate and the data are the same
 * decision, made once, server-side.
 */
export async function checkOperationalAccess(): Promise<OperationalPrincipal | null> {
  try {
    const { principal } = await operationalFetch<{ principal: OperationalPrincipal | null }>(
      "/api/operational/whoami",
    );
    return principal;
  } catch {
    return null;
  }
}
