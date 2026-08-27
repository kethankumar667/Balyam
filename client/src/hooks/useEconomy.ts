import { useState, useEffect, useCallback, useRef } from "react";
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
 * Hook to read and manage the caller's server-authoritative wallet.
 * Strictly adheres to server-authoritative balances (optimistic updates forbidden).
 */
export function useWallet(): WalletState {
  const [wallet, setWallet] = useState<CoinWalletRecord | null>(null);
  const [status, setStatus] = useState<WalletStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const authReady = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);

  const fetchWallet = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setCorrelationId(null);
    try {
      const data = await getEconomyWallet();
      setWallet(data.wallet);
      setStatus(data.wallet.balance === "0" ? "zero" : "loaded");
    } catch (err) {
      setWallet(null);
      if (err instanceof EconomyClientError) {
        // The server answered, definitively: sign-in required, identity not
        // found, request rejected. Never the same visual state as a real 0.
        setStatus("error");
        setError(err.message);
        setCorrelationId(err.correlationId);
      } else {
        // No definite answer at all — offline, timed out, DNS failure. The
        // real balance might be fine; the connection to find out is not.
        setStatus("unavailable");
        setError("Wallet is temporarily unavailable. Check your connection and try again.");
      }
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    void fetchWallet();
  }, [authReady, userId, fetchWallet]);

  return {
    wallet,
    status,
    balance: wallet?.balance ?? null,
    isLoading: status === "loading",
    error,
    correlationId,
    refetch: fetchWallet,
  };
}

/**
 * Hook to retrieve ledger transaction history with pagination.
 */
export function useLedger(initialLimit = 20) {
  const [entries, setEntries] = useState<CoinLedgerEntryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

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
    void fetchInitial();
  }, [fetchInitial]);

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
