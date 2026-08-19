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
 */

const OPS_KEY_STORAGE = "bhalyam.ops.key";

export function readOperationalKey(): string | null {
  try {
    return sessionStorage.getItem(OPS_KEY_STORAGE);
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

function authHeaders(): Record<string, string> {
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
  if (!res.ok) throw new Error(`Operational request failed: ${res.status}`);
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
