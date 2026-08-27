import { useEffect, useState } from "react";
import { getApiBaseUrl } from "./socket";
import { useAuthStore, currentAccessToken } from "../store/authStore";

/**
 * The credential this browser presents to the player API.
 *
 * ── What this replaces ────────────────────────────────────────────────
 * Five pages each derived their identity the same way:
 *
 *     const effectivePlayerId = userId || localStorage.getItem("mpg.playerId") || "guest_player_1";
 *
 * and then put that string in the URL of every request. Nothing was signed and
 * nothing was checked, so the string was a claim the server had no choice but
 * to believe — which is exactly how `PUT /api/profile/victim_user` worked from
 * a stranger's browser. Note the fallback, too: every player who had never
 * been in a room shared the single id `guest_player_1`, and therefore shared
 * one profile, one friends list and one set of challenge rewards.
 *
 * ── The model now ─────────────────────────────────────────────────────
 * • Signed in → the Supabase access token. The server verifies it and takes
 *   the identity from the verified `sub` claim.
 * • Not signed in → a guest identity minted BY the server
 *   (`POST /api/auth/guest`), returned with a signed token that proves it.
 *
 * Either way the id travels as a consequence of a credential rather than as a
 * request parameter, and the page never has to be trusted about who it is.
 *
 * ── Why the guest id is not `mpg.playerId` ────────────────────────────
 * `mpg.playerId` is minted fresh by `RoomManager` on every room create or
 * join, so it changes whenever you sit at a new table — it identifies a SEAT,
 * not a person. It was never a stable identity, which is part of why the
 * profile screen showed so little. The guest id here is stable, is signed, and
 * is the only thing the HTTP API answers to. The room and socket path is
 * untouched.
 */

const GUEST_ID_KEY = "bhalyam.guest.id";
const GUEST_TOKEN_KEY = "bhalyam.guest.token";
const GUEST_EXP_KEY = "bhalyam.guest.expires";

export interface PlayerCredential {
  playerId: string;
  token: string;
  kind: "member" | "guest";
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private browsing — the identity holds for this page only */
  }
}

/** Drop the stored guest identity. The next call mints a fresh one. */
export function clearGuestIdentity(): void {
  for (const key of [GUEST_ID_KEY, GUEST_TOKEN_KEY, GUEST_EXP_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
  }
  pending = null;
}

function storedGuest(): PlayerCredential | null {
  const playerId = read(GUEST_ID_KEY);
  const token = read(GUEST_TOKEN_KEY);
  const expires = Number(read(GUEST_EXP_KEY) ?? 0);
  if (!playerId || !token) return null;
  // A minute of slack, so a request does not leave with a token that expires
  // while it is in flight.
  if (expires && expires - 60_000 <= Date.now()) return null;
  return { playerId, token, kind: "guest" };
}

/**
 * The stored guest bearer token, if this browser already has one — never
 * mints a fresh one. Mirrors `authStore.ts`'s `currentAccessToken()`: a
 * synchronous read for call sites (room:create/room:join's socket payloads)
 * that build a plain object rather than awaiting a credential. A guest with
 * no token yet (their very first action on the site, before anything else
 * has called `getPlayerCredential()`) simply sends none — Economy V1's
 * socket identity resolution already treats a missing/unverifiable guest
 * token as `identityId: null`, exactly as it did before this existed.
 */
export function currentGuestToken(): string | undefined {
  return storedGuest()?.token;
}

/**
 * In-flight mint, shared.
 *
 * Four pages can mount at once and each would otherwise ask for its own guest
 * identity — and because the SERVER chooses the id, four requests mean four
 * different people, with the last write winning. One promise, one identity.
 */
let pending: Promise<PlayerCredential | null> | null = null;

async function mintGuest(): Promise<PlayerCredential | null> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/guest`, { method: "POST" });
      if (!res.ok) return null;
      const body = (await res.json()) as { playerId: string; token: string; expiresAt: number };
      write(GUEST_ID_KEY, body.playerId);
      write(GUEST_TOKEN_KEY, body.token);
      write(GUEST_EXP_KEY, String(body.expiresAt));
      return { playerId: body.playerId, token: body.token, kind: "guest" as const };
    } catch {
      // Offline, or the server is down. The caller renders its own empty
      // state; inventing a local id here is what produced `guest_player_1`.
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/**
 * Who this browser is, minting a guest identity if it has none.
 *
 * A signed-in session always wins, and note what that means in practice: sign
 * in and your guest identity is simply not consulted any more. Carrying guest
 * progress into a new account is a migration this codebase cannot do yet —
 * there is nowhere durable to carry it FROM (see P0-3) — and pretending
 * otherwise by merging ids client-side would be worse than being explicit.
 */
export async function getPlayerCredential(): Promise<PlayerCredential | null> {
  const { userId } = useAuthStore.getState();
  const token = currentAccessToken();
  if (userId && token) return { playerId: userId, token, kind: "member" };

  return storedGuest() ?? (await mintGuest());
}

/**
 * A player-API request that carries a credential.
 *
 * On a 401 the stored guest identity is dropped and the request is retried
 * once with a fresh one. That is the expiry path — a token thirty days old, or
 * a server restarted without `SESSION_SECRET` — and without the retry it would
 * surface as a permanently broken profile screen with no way back.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const credential = await getPlayerCredential();
  const send = (cred: PlayerCredential | null): Promise<Response> =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(cred ? { Authorization: `Bearer ${cred.token}` } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });

  const res = await send(credential);
  if (res.status !== 401 || credential?.kind !== "guest") return res;

  clearGuestIdentity();
  const fresh = await getPlayerCredential();
  return fresh ? send(fresh) : res;
}

/** `apiFetch`, parsed, returning `null` for any non-2xx rather than throwing. */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await apiFetch(path, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * The identity a page should render for, once it is known.
 *
 * `ready` is false only for the first moments of a guest's first visit, while
 * the mint is in flight. A page that renders its skeleton during that is
 * correct; a page that fires requests with `playerId === null` is not, which
 * is why this returns null rather than a placeholder.
 */
export function usePlayerId(): { playerId: string | null; ready: boolean; kind: "member" | "guest" | null } {
  const userId = useAuthStore((s) => s.userId);
  const authReady = useAuthStore((s) => s.ready);
  const [state, setState] = useState<{ playerId: string | null; kind: "member" | "guest" | null }>(
    () => {
      const guest = storedGuest();
      return guest ? { playerId: guest.playerId, kind: "guest" } : { playerId: null, kind: null };
    },
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    void getPlayerCredential().then((cred) => {
      if (cancelled) return;
      setState({ playerId: cred?.playerId ?? null, kind: cred?.kind ?? null });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authReady]);

  return { ...state, ready };
}
