import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import {
  getEconomyWallet,
  getEconomyLedger,
  quoteMatchCheckout,
  type CoinWalletRecord,
  type CoinLedgerEntryRecord,
  type MatchCheckoutQuote,
  type MatchCheckoutQuoteInput,
  EconomyClientError,
} from "../lib/economyApi";
import { useAuthStore } from "../store/authStore";

/**
 * The five states a wallet display can honestly be in.
 *
 * ── Why this exists (root-caused, not speculative) ────────────────────────
 * The previous version of this hook collapsed every failure into
 * `wallet?.balance ?? "0"` — a 401 from an unverified token, a 404 from a
 * schema that was not yet deployed, and a genuinely empty wallet all
 * rendered as the identical "0" the player sees. That is indistinguishable
 * from correct, which is exactly why a proven production balance of 5000
 * once showed as 0 with nothing in the UI to say why. `loading` and `loaded`
 * are the ordinary path; `zero` is a real, confirmed balance of 0 (not an
 * error in disguise); `error` is a definite answer FROM the server (a
 * mapped `EconomyClientError` — auth, not-found, validation); `unavailable`
 * is "we could not complete the request at all" (network failure, timeout,
 * a malformed response) and carries no claim about the real balance either
 * way.
 */
export type WalletStatus = "loading" | "loaded" | "zero" | "error" | "unavailable";

export interface WalletState {
  wallet: CoinWalletRecord | null;
  status: WalletStatus;
  /** Server-authoritative balance, or `null` whenever it is not actually known — never a fallback "0". */
  balance: string | null;
  isLoading: boolean;
  /** User-safe message for `error`/`unavailable` states. Never a raw exception or stack trace. */
  error: string | null;
  /** Present only for `error` (a server-mapped failure) — safe to show, useful for support. */
  correlationId: string | null;
  refetch: () => Promise<void>;
}

/**
 * ── Shared wallet cache ─────────────────────────────────────────────────
 * `useWallet()` used to run its own independent fetch on every mount. That
 * was correct but wasteful: the balance had usually already been fetched
 * moments earlier by some OTHER mounted screen in the same tab (the global
 * header, a room lobby, the wallet drawer — none of them share state), so
 * every new mount repeated the loading-skeleton flash for a number the app
 * already had. This module-level cache is shared by every `useWallet()`
 * call in the tab: whichever mounts first fetches and populates it; every
 * later mount for the SAME identity paints the cached balance instantly
 * while a background refresh keeps it current (server-authoritative — the
 * balance can move from another device or a match settling elsewhere, so
 * "instant" must still mean "revalidated", never "frozen").
 *
 * Scoped by `userId` (`null` = guest) specifically so a sign-in or sign-out
 * can never paint one identity's balance under another's name for even a
 * frame: a cache miss for the new identity always renders `"loading"`
 * first, exactly as an uncached hook would. `walletFetchToken` guards
 * against a slow, superseded request (e.g. a rapid sign-out then sign-in)
 * writing its answer over a newer request's result after the fact.
 */
interface WalletCacheEntry {
  userId: string | null;
  wallet: CoinWalletRecord | null;
  status: WalletStatus;
  error: string | null;
  correlationId: string | null;
}

let walletCache: WalletCacheEntry | null = null;
let walletFetchToken = 0;
let walletInFlight: { userId: string | null; promise: Promise<void> } | null = null;
const walletListeners = new Set<() => void>();

function setWalletCache(entry: WalletCacheEntry): void {
  walletCache = entry;
  for (const listener of walletListeners) listener();
}

function subscribeWalletCache(onStoreChange: () => void): () => void {
  walletListeners.add(onStoreChange);
  return () => {
    walletListeners.delete(onStoreChange);
  };
}

function getWalletCacheSnapshot(): WalletCacheEntry | null {
  return walletCache;
}

/** (Re)fetches the wallet for `userId`, deduping concurrent callers requesting the same identity. */
function loadWallet(userId: string | null): Promise<void> {
  if (walletInFlight && walletInFlight.userId === userId) {
    return walletInFlight.promise;
  }

  const token = ++walletFetchToken;
  setWalletCache({
    userId,
    // Same identity as what's already cached: keep the balance on screen
    // through the refresh instead of blanking it back to a skeleton.
    // Different (or no) identity: nothing of this new identity's is known
    // yet, so there is nothing honest to show but loading.
    wallet: walletCache?.userId === userId ? walletCache.wallet : null,
    status: "loading",
    error: null,
    correlationId: null,
  });

  const promise = (async () => {
    try {
      const data = await getEconomyWallet();
      if (token !== walletFetchToken) return; // superseded by a later request
      setWalletCache({
        userId,
        wallet: data.wallet,
        status: data.wallet.balance === "0" ? "zero" : "loaded",
        error: null,
        correlationId: null,
      });
    } catch (err) {
      if (token !== walletFetchToken) return;
      if (err instanceof EconomyClientError) {
        // The server answered, definitively: sign-in required, identity not
        // found, request rejected. Never the same visual state as a real 0.
        setWalletCache({ userId, wallet: null, status: "error", error: err.message, correlationId: err.correlationId });
      } else {
        // No definite answer at all — offline, timed out, DNS failure. The
        // real balance might be fine; the connection to find out is not.
        setWalletCache({
          userId,
          wallet: null,
          status: "unavailable",
          error: "Wallet is temporarily unavailable. Check your connection and try again.",
          correlationId: null,
        });
      }
    } finally {
      if (walletInFlight && walletInFlight.userId === userId && walletFetchToken === token) {
        walletInFlight = null;
      }
    }
  })();

  walletInFlight = { userId, promise };
  return promise;
}

/**
 * Hook to read and manage the caller's server-authoritative wallet.
 * Strictly adheres to server-authoritative balances (optimistic updates forbidden).
 */
export function useWallet(): WalletState {
  const authReady = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);
  const cached = useSyncExternalStore(subscribeWalletCache, getWalletCacheSnapshot, () => null);
  // Never render a cache entry that belongs to a DIFFERENT identity than
  // this hook instance currently has — the swap always reads as a fresh
  // "loading", never a flash of someone else's balance.
  const entry = cached && cached.userId === userId ? cached : null;

  const refetch = useCallback(() => loadWallet(userId), [userId]);

  useEffect(() => {
    if (!authReady) return;
    void loadWallet(userId);
  }, [authReady, userId]);

  return {
    wallet: entry?.wallet ?? null,
    status: entry?.status ?? "loading",
    balance: entry?.wallet?.balance ?? null,
    isLoading: (entry?.status ?? "loading") === "loading",
    error: entry?.error ?? null,
    correlationId: entry?.correlationId ?? null,
    refetch,
  };
}

/**
 * Hook to retrieve ledger transaction history with pagination.
 *
 * Re-fetches on sign-in/sign-out, not just on mount. `WalletDrawer` is
 * mounted unconditionally by `AppLayout` at app startup — usually while
 * still a guest — so a `fetchInitial` that only ran once at mount would
 * freeze the ledger on whatever identity was current at that moment: sign
 * in later and the drawer keeps showing the guest's (empty/errored)
 * history until a full page reload; sign out and it keeps showing the
 * previous member's transactions to whoever uses the device next. Mirrors
 * `useWallet`'s `[authReady, userId]` dependency for the same reason.
 */
export function useLedger(initialLimit = 20) {
  const [entries, setEntries] = useState<CoinLedgerEntryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const authReady = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);

  const fetchInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    offsetRef.current = 0;
    try {
      const data = await getEconomyLedger({ limit: initialLimit, offset: 0 });
      setEntries(data.entries);
      setHasMore(data.hasMore);
      offsetRef.current = data.entries.length;
    } catch (err) {
      const msg = err instanceof EconomyClientError ? err.message : "Failed to load ledger";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [initialLimit]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const data = await getEconomyLedger({ limit: initialLimit, offset: offsetRef.current });
      setEntries((prev) => [...prev, ...data.entries]);
      setHasMore(data.hasMore);
      offsetRef.current += data.entries.length;
    } catch (err) {
      const msg = err instanceof EconomyClientError ? err.message : "Failed to load more entries";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, initialLimit]);

  useEffect(() => {
    if (!authReady) return;
    void fetchInitial();
  }, [authReady, userId, fetchInitial]);

  return {
    entries,
    isLoading,
    hasMore,
    error,
    refetch: fetchInitial,
    loadMore,
  };
}

/**
 * Hook to obtain an authoritative checkout quote from POST /api/economy/checkout/quote.
 * Executes on seat configuration changes with clean request cancellation.
 */
export function useCheckoutQuote(input: MatchCheckoutQuoteInput | null) {
  const [quote, setQuote] = useState<MatchCheckoutQuote | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const seatCount = input?.seatCount;
  const humanSeatCount = input?.humanSeatCount;
  const botSeatCount = input?.botSeatCount;

  useEffect(() => {
    if (!input || seatCount === undefined) {
      setQuote(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    void quoteMatchCheckout({
      seatCount,
      humanSeatCount: humanSeatCount ?? 1,
      botSeatCount: botSeatCount ?? 0,
    })
      .then((res) => {
        if (!isCancelled) {
          setQuote(res.quote);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          const msg = err instanceof EconomyClientError ? err.message : "Failed to fetch checkout quote";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [seatCount, humanSeatCount, botSeatCount]);

  return {
    quote,
    isLoading,
    error,
  };
}
