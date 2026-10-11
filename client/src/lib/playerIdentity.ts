import { useEffect, useState } from "react";
import { GUEST_IDLE_EXPIRY_DAYS, guestDisplayName } from "@shared/guestIdentity";
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

/** Restart the guest's clock once less than this is left — i.e. after half the idle window. */
const SLIDE_WHEN_REMAINING_BELOW_MS = (GUEST_IDLE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) / 2;

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

/**
 * Notified whenever the guest id this device answers to changes — minted,
 * cleared, or silently replaced (the 401 retry in `apiFetch` below).
 *
 * ── Why this exists ────────────────────────────────────────────────────
 * `useWallet()` (`hooks/useEconomy.ts`) used to key its cache by
 * `authStore`'s `userId` alone, which is `null` for every guest. Swapping
 * from guest A to guest B — sign-out on a build where "member" was never a
 * distinct identity (see `authStore.ts`'s `signOut()`), or a token silently
 * invalidated by a server restart — left `userId` at `null` on both sides of
 * the swap, so nothing ever told a mounted `useWallet()` that the identity
 * underneath it had changed. The stale cache entry for guest A's balance
 * kept rendering until something unrelated (a full page reload) happened to
 * reset the module. Subscribing to guest-id changes directly closes that
 * gap: an economy hook can now tell guest A from guest B without needing a
 * `userId` to differ.
 */
const guestIdListeners = new Set<() => void>();

function notifyGuestIdChange(): void {
  for (const listener of guestIdListeners) listener();
}

/** Subscribe to guest-id changes. For `useSyncExternalStore` in economy hooks. */
export function subscribeGuestId(onStoreChange: () => void): () => void {
  guestIdListeners.add(onStoreChange);
  return () => {
    guestIdListeners.delete(onStoreChange);
  };
}

/** The current guest id, or `null` if this device has none minted right now. */
export function getGuestIdSnapshot(): string | null {
  return read(GUEST_ID_KEY);
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
  notifyGuestIdChange();
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

const MINT_LOCK_NAME = "bhalyam.guest.mint";

interface MintedGuestBody {
  playerId: string;
  token: string;
  expiresAt: number;
}

/** Persist a server-issued guest credential and tell subscribers if the id itself changed. */
function storeGuest(body: MintedGuestBody): PlayerCredential {
  const idChanged = read(GUEST_ID_KEY) !== body.playerId;
  write(GUEST_ID_KEY, body.playerId);
  write(GUEST_TOKEN_KEY, body.token);
  write(GUEST_EXP_KEY, String(body.expiresAt));
  if (idChanged) notifyGuestIdChange();
  return { playerId: body.playerId, token: body.token, kind: "guest" };
}

/**
 * Trade the stored guest token for a fresh one that keeps the SAME id and restarts the 7-day clock.
 *
 * This is what turns "expires after 7 days" into "expires after 7 days of INACTIVITY": a guest who
 * keeps playing keeps their identity (and wallet), one who stops does not. The server refuses
 * (401) a forged token, one signed with a key it no longer has, or one that has already expired —
 * then the caller starts a new guest.
 */
async function renewStoredGuest(): Promise<PlayerCredential | null> {
  const token = read(GUEST_TOKEN_KEY);
  if (!token) return null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/guest/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return storeGuest((await res.json()) as MintedGuestBody);
  } catch {
    return null;
  }
}

async function createGuest(): Promise<PlayerCredential | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/guest`, { method: "POST" });
    if (!res.ok) return null;
    return storeGuest((await res.json()) as MintedGuestBody);
  } catch {
    // Offline, or the server is down. The caller renders its own empty
    // state; inventing a local id here is what produced `guest_player_1`.
    return null;
  }
}

/**
 * Serialise minting across browser tabs. `pending` only de-duplicates inside one page, so two tabs
 * opened on a fresh device would each create a guest and the loser would hold a token for an id
 * nobody stores. Where Web Locks is missing the work simply runs unlocked, as before.
 */
function withMintLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks?.request) return task();
  // The DOM typings nest the callback's promise inside request()'s; at runtime it resolves to T.
  return locks.request(MINT_LOCK_NAME, task) as unknown as Promise<T>;
}

async function mintGuest(): Promise<PlayerCredential | null> {
  if (pending) return pending;
  pending = withMintLock(async () => {
    // Another tab may have finished while this one waited for the lock.
    const already = storedGuest();
    if (already) return already;
    // No usable token here means none was stored or it has expired — and an expired guest is gone.
    return createGuest();
  }).finally(() => {
    pending = null;
  });
  return pending;
}

/**
 * Who this browser is RIGHT NOW, creating nothing.
 *
 * ── Guest identity is created just in time, not on arrival ────────────
 * A visitor who only looks around has done nothing that needs an identity, so nothing is created
 * for them: no guest id, no database row, no welcome coins. That is the standard approach for
 * anonymous users (create the account at the first action that needs one) and it closes three
 * problems the old "mint on first page" flow had: rows and wallets for every drive-by and crawler,
 * unlimited free welcome grants by clearing storage, and personal-data records for people who did
 * nothing. Reads use this; only a deliberate action (see `apiFetch` and `resolveRoomCredential`)
 * mints, through `getPlayerCredential` below.
 */
export function peekPlayerCredential(): PlayerCredential | null {
  const { userId } = useAuthStore.getState();
  const token = currentAccessToken();
  if (userId && token) return { playerId: userId, token, kind: "member" };
  return storedGuest();
}

/**
 * Who this browser is, minting a guest identity if it has none. Call this only for a deliberate action.
 *
 * A signed-in session always wins: sign in and your guest identity is not consulted any more. The
 * guest's wallet is not lost by that — `lib/guestCarryOver.ts` hands it to the account.
 */
export async function getPlayerCredential(): Promise<PlayerCredential | null> {
  const { userId } = useAuthStore.getState();
  const token = currentAccessToken();
  if (userId && token) return { playerId: userId, token, kind: "member" };

  return (await slidStoredGuest()) ?? (await mintGuest());
}

/**
 * The stored guest, with its 7-day clock restarted if more than half the window has gone.
 *
 * Only deliberate actions reach here (a read never mints, see above), which is the right meaning
 * of "activity": opening the site to look around does not keep a guest alive, playing does. A
 * failed renewal falls back to the token we have — still valid, just not extended.
 */
async function slidStoredGuest(): Promise<PlayerCredential | null> {
  const stored = storedGuest();
  if (!stored) return null;
  const expires = Number(read(GUEST_EXP_KEY) ?? 0);
  if (!expires || expires - Date.now() > SLIDE_WHEN_REMAINING_BELOW_MS) return stored;
  return (await renewStoredGuest()) ?? stored;
}

/**
 * The automatic name of this device's guest ("Guest 12345678"), or `null` when there is no guest
 * identity yet. Creates nothing. This is what a guest is called everywhere except inside a game
 * room, where they may pick a name for that room alone.
 */
export function peekGuestDisplayName(): string | null {
  const guest = storedGuest();
  return guest ? guestDisplayName(guest.playerId) : null;
}

export type RoomCredentialResult =
  | { ok: true; kind: "member"; accessToken: string; guestToken: undefined }
  | { ok: true; kind: "guest"; accessToken: undefined; guestToken: string }
  | { ok: false; error: string };

/**
 * Resolves credentials for room operations (create, join, pass & play).
 *
 * For verified members: returns the active member access token without minting a guest token.
 * For guests (or local fallback): returns a verified stored or freshly minted guest token.
 * If minting fails: returns a typed failure so callers can abort emissions, clear pending state,
 * and show an accessible error without losing form input.
 */
export async function resolveRoomCredential(): Promise<RoomCredentialResult> {
  const { userId } = useAuthStore.getState();
  const token = currentAccessToken();
  if (userId && token) {
    return { ok: true, kind: "member", accessToken: token, guestToken: undefined };
  }

  const credential = (await slidStoredGuest()) ?? (await mintGuest());
  if (!credential?.token) {
    return {
      ok: false,
      error: "We could not prepare your guest session. Check your connection and try again.",
    };
  }

  return { ok: true, kind: "guest", accessToken: undefined, guestToken: credential.token };
}

/**
 * The guest token to send on `room:create`/`room:join`, minting one first if
 * this device doesn't have one yet.
 *
 * ── The gap this closes ────────────────────────────────────────────────
 * `currentGuestToken()` above is a synchronous, never-minting read, by
 * design, for the socket payload builders that predate this — a guest whose
 * very first action on the site was creating or joining a room (rather than
 * visiting a page that mounts `useWallet()`/`usePlayerId()` first) sent no
 * guest token at all. `resolveIdentity()` (server `rooms/economyIdentity.ts`)
 * then had nothing to verify and resolved `identityId: null`, so that
 * player's very first match settled against an unresolvable guest instead of
 * the same durable id their wallet balance is tracked under. Awaiting a mint
 * here, at the one moment a socket payload is actually being built, closes
 * that race without duplicating any identity: `mintGuest()`'s shared
 * in-flight promise still guarantees one guest id per device even if this
 * fires alongside another `getPlayerCredential()` caller.
 *
 * Returns `undefined` for an already-authenticated member — the server reads
 * their identity from `accessToken` instead, exactly as before.
 */
export async function ensureGuestToken(): Promise<string | undefined> {
  const res = await resolveRoomCredential();
  if (!res.ok) return undefined;
  return res.guestToken;
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
  // A read never creates a guest. A write from someone with no identity yet is a deliberate action, so the
  // identity is created now, at the moment it is needed (and not before).
  const method = (init.method ?? "GET").toUpperCase();
  const isWrite = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const existing = peekPlayerCredential();
  const credential = existing ?? (isWrite ? await getPlayerCredential() : null);
  const auth = useAuthStore.getState();
  const adminHeaders: Record<string, string> = {};
  if (auth.isAdmin || auth.isSuperAdmin) {
    adminHeaders["x-account-kind"] = auth.kind;
  }
  try {
    const opsKey = sessionStorage.getItem("bhalyam.ops.key");
    if (opsKey) {
      adminHeaders["x-operational-key"] = opsKey;
    }
  } catch {
    /* private browsing */
  }

  const send = (cred: PlayerCredential | null): Promise<Response> =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(cred ? { Authorization: `Bearer ${cred.token}` } : {}),
        ...adminHeaders,
        ...(init.headers as Record<string, string> | undefined),
      },
    });

  const res = await send(credential);
  if (res.status !== 401 || credential?.kind !== "guest") return res;

  const fresh = await replaceRejectedGuest(credential.token);
  return fresh ? send(fresh) : res;
}

/**
 * A new credential for a guest whose token the server just refused, keeping the player's id
 * wherever the server will still vouch for it.
 *
 * In order: another tab already replaced it → use that; the server renews the same id → use that;
 * only then drop the identity and start a new guest (forged token, a restart without
 * `SESSION_SECRET`, or an identity abandoned past the renewal window).
 */
async function replaceRejectedGuest(rejectedToken: string): Promise<PlayerCredential | null> {
  const current = storedGuest();
  if (current && current.token !== rejectedToken) return current;

  const renewed = await renewStoredGuest();
  if (renewed) return renewed;

  clearGuestIdentity();
  return getPlayerCredential();
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

  // Passive: it reports who this browser already is and never creates anyone. A first-time visitor is
  // `ready` with no id, and an identity appears when they do something that needs one.
  useEffect(() => {
    if (!authReady) return;
    const cred = peekPlayerCredential();
    setState({ playerId: cred?.playerId ?? null, kind: cred?.kind ?? null });
    setReady(true);
  }, [userId, authReady]);

  return { ...state, ready };
}
