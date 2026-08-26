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
 * Hook to read and manage the caller's server-authoritative wallet.
 * Strictly adheres to server-authoritative balances (optimistic updates forbidden).
 */
export function useWallet() {
  const [wallet, setWallet] = useState<CoinWalletRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);

  const fetchWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getEconomyWallet();
      setWallet(data.wallet);
    } catch (err) {
      const msg = err instanceof EconomyClientError ? err.message : "Failed to load wallet";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    void fetchWallet();
  }, [authReady, userId, fetchWallet]);

  return {
    wallet,
    balance: wallet?.balance ?? "0",
    isLoading,
    error,
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
