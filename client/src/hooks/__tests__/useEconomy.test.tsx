import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWallet, useLedger } from "../useEconomy";
import { useAuthStore } from "../../store/authStore";
import { getEconomyWallet, getEconomyLedger } from "../../lib/economyApi";
import { EconomyClientError, type CoinWalletRecord, type CoinLedgerEntryRecord } from "../../lib/economyApi";

/**
 * Controllable guest id, standing in for `bhalyam.guest.id` — the guest-
 * wallet-consistency remediation's T5/T6 tests need to move the guest id
 * without going through a real `/api/auth/guest` round trip. `vi.hoisted`
 * because `vi.mock` factories are hoisted above these `let`/`const`
 * declarations, so the mock and the test body must share state through an
 * object created before hoisting happens.
 */
const guestIdState = vi.hoisted(() => ({
  id: null as string | null,
  listeners: new Set<() => void>(),
}));

function setGuestId(id: string | null): void {
  guestIdState.id = id;
  for (const listener of guestIdState.listeners) listener();
}

vi.mock("../../lib/playerIdentity", async () => {
  const actual = await vi.importActual<typeof import("../../lib/playerIdentity")>(
    "../../lib/playerIdentity",
  );
  return {
    ...actual,
    getGuestIdSnapshot: () => guestIdState.id,
    subscribeGuestId: (onStoreChange: () => void) => {
      guestIdState.listeners.add(onStoreChange);
      return () => guestIdState.listeners.delete(onStoreChange);
    },
  };
});

/**
 * Phase 1/2 regression: a real production balance of 5000 once rendered as
 * "0" because `useWallet()` collapsed every failure (and even a malformed
 * success) into the same fallback as a real zero balance. These tests pin
 * the fix at the hook layer, isolated from network/auth plumbing that is
 * already covered elsewhere — `getEconomyWallet` is mocked directly so this
 * suite is exercising exactly what Phase 2 changed: state mapping, not
 * credential resolution.
 */
vi.mock("../../lib/economyApi", async () => {
  const actual = await vi.importActual<typeof import("../../lib/economyApi")>("../../lib/economyApi");
  return {
    ...actual,
    getEconomyWallet: vi.fn(),
    getEconomyLedger: vi.fn(),
  };
});

const mockedGetEconomyWallet = vi.mocked(getEconomyWallet);
const mockedGetEconomyLedger = vi.mocked(getEconomyLedger);

function wallet(
  balance: string,
  identityId = "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
  identityKind: "member" | "guest" = "member",
): { wallet: CoinWalletRecord } {
  return {
    wallet: {
      identityId,
      identityKind,
      balance,
      version: 3,
      lifetimeGranted: "5000",
      lifetimeEarned: "0",
      lifetimeSpent: "400",
      lifetimeRefunded: "400",
      starterGranted: true,
      isFrozen: false,
      updatedAt: Date.now(),
    },
  };
}

function ledgerEntry(id: number, amount: string): CoinLedgerEntryRecord {
  return {
    id,
    walletId: "w_1",
    amount,
    balanceBefore: "500",
    balanceAfter: "1000",
    walletVersionBefore: 1,
    walletVersionAfter: 2,
    entryType: "STARTER_GRANT",
    sourceKind: "SYSTEM",
    sourceId: "src_1",
    idempotencyKey: `key_${id}`,
    description: "test entry",
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  mockedGetEconomyWallet.mockReset();
  mockedGetEconomyLedger.mockReset();
  useAuthStore.setState({ ready: true, userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9" });
  setGuestId(null);
});

afterEach(() => {
  useAuthStore.setState({ ready: false, userId: null });
  setGuestId(null);
});

describe("useWallet — the exact production regression", () => {
  it("renders the real proven balance (5000) as loaded, never collapsed toward 0", async () => {
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("5000"));

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    expect(result.current.balance).toBe("5000");
    expect(result.current.error).toBeNull();
  });

  it("a genuinely empty wallet is its own state ('zero'), distinct from a failure", async () => {
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("0"));

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe("zero"));

    expect(result.current.balance).toBe("0");
    expect(result.current.error).toBeNull();
  });

  it("a server-mapped failure (e.g. an auth/identity error) renders 'error' with balance null — never a fabricated 0", async () => {
    mockedGetEconomyWallet.mockRejectedValueOnce(
      new EconomyClientError(401, "Unauthorized", "Sign in, or request a guest identity.", "corr-abc-123"),
    );

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.balance).toBeNull();
    expect(result.current.error).toBe("Sign in, or request a guest identity.");
    expect(result.current.correlationId).toBe("corr-abc-123");
  });

  it("a network failure (not a server response at all) renders 'unavailable', not 0 and not the same as a server error", async () => {
    mockedGetEconomyWallet.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe("unavailable"));

    expect(result.current.balance).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it("refetch clears a previous error state on success", async () => {
    mockedGetEconomyWallet.mockRejectedValueOnce(new EconomyClientError(404, "IdentityNotFound", "No registered identity."));
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe("error"));

    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("5000"));
    await result.current.refetch();
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.balance).toBe("5000");
    expect(result.current.error).toBeNull();
  });
});

/**
 * Guest-wallet-consistency remediation (T5/T6): the cache used to be keyed
 * by `userId` alone, which is `null` for every guest — so a guest-to-guest
 * swap (sign-out with no real member session behind it; or a token silently
 * replaced after a server restart) left the cache guard matching by
 * coincidence and rendering the OLD guest's balance under the new identity.
 * These tests pin the fix: the cache key is now an identity TAG that folds
 * in the guest id, so guest A and guest B are provably different entries.
 */
describe("useWallet — guest identity boundaries (guest-wallet-consistency fix)", () => {
  it("T6: a guest wallet is cached under a tag that includes the guest id, not just `userId` (null for every guest)", async () => {
    useAuthStore.setState({ ready: true, userId: null });
    setGuestId("guest_aaa111");
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("1800", "guest_aaa111", "guest"));

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.balance).toBe("1800");
  });

  it("T5: guest A -> guest B never renders guest A's wallet, even transiently — an honest loading state instead", async () => {
    useAuthStore.setState({ ready: true, userId: null });
    setGuestId("guest_aaa111");
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("1800", "guest_aaa111", "guest"));

    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.balance).toBe("1800");

    // Guest B replaces guest A — e.g. sign-out with no real member session
    // to actually leave, or a guest token silently invalidated and replaced.
    // `userId` stays `null` on both sides of this swap; only the guest id
    // changes. The refetch is held open deliberately so the render in
    // between can be inspected.
    let resolveGuestB!: (value: { wallet: CoinWalletRecord }) => void;
    mockedGetEconomyWallet.mockImplementationOnce(
      () => new Promise((resolve) => { resolveGuestB = resolve; }),
    );

    act(() => setGuestId("guest_bbb222"));

    // The old cache entry (tag `guest:guest_aaa111`) no longer matches the
    // current identity (`guest:guest_bbb222`) — must render loading, never
    // guest A's 1800 balance under guest B's name.
    expect(result.current.status).toBe("loading");
    expect(result.current.balance).toBeNull();

    resolveGuestB(wallet("2000", "guest_bbb222", "guest"));
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.balance).toBe("2000");
  });

  it("T11 (hook layer): reproduces the reported 2000 -> 1800 -> ... -> 2000 sequence and confirms each balance is honestly attributed to its own identity", async () => {
    // 2000: guest's starter grant.
    useAuthStore.setState({ ready: true, userId: null });
    setGuestId("guest_senthil");
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("2000", "guest_senthil", "guest"));
    const { result, rerender } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.balance).toBe("2000"));

    // Play a Hand Cricket vs Bot match: 2000 - 200 = 1800, same guest id.
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("1800", "guest_senthil", "guest"));
    await result.current.refetch();
    await waitFor(() => expect(result.current.balance).toBe("1800"));

    // A real member session begins — this is a genuinely different identity
    // (`userId` set), so a fresh, honest loading state is expected, not a
    // frozen 1800. The mock must be armed BEFORE the render that triggers
    // the effect, since `loadWallet` calls `getEconomyWallet()` synchronously
    // on commit.
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("5000", "member-uuid-1", "member"));
    useAuthStore.setState({ userId: "member-uuid-1" });
    rerender();
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.balance).toBe("5000"));

    // Sign back out to the SAME guest id (the fixed model: a local-flag or
    // real sign-out that never destroyed guest_senthil in the first place)
    // — 1800 must still be there, not reset to a fresh starter grant.
    mockedGetEconomyWallet.mockResolvedValueOnce(wallet("1800", "guest_senthil", "guest"));
    useAuthStore.setState({ userId: null });
    rerender();
    await waitFor(() => expect(result.current.balance).toBe("1800"));
  });
});

describe("useLedger — identity-aware and stale-response fencing", () => {
  it("loads initial ledger entries successfully", async () => {
    mockedGetEconomyLedger.mockResolvedValueOnce({
      entries: [ledgerEntry(1, "500")],
      hasMore: false,
    });

    const { result } = renderHook(() => useLedger());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("clears entries and transitions to loading when identity tag changes", async () => {
    useAuthStore.setState({ ready: true, userId: null });
    setGuestId("guest_aaa111");

    mockedGetEconomyLedger.mockResolvedValueOnce({
      entries: [ledgerEntry(101, "2000")],
      hasMore: false,
    });

    const { result } = renderHook(() => useLedger());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toHaveLength(1);

    // Switch to guest B with a pending ledger fetch
    let resolveGuestB!: (val: { entries: CoinLedgerEntryRecord[]; hasMore: boolean }) => void;
    mockedGetEconomyLedger.mockImplementationOnce(
      () => new Promise((resolve) => { resolveGuestB = resolve; }),
    );

    act(() => setGuestId("guest_bbb222"));

    // Immediately on identity change, previous entries must be cleared and loading set
    expect(result.current.isLoading).toBe(true);
    expect(result.current.entries).toEqual([]);

    resolveGuestB({
      entries: [ledgerEntry(102, "100")],
      hasMore: false,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe(102);
  });

  it("identity-aware stale-response fencing drops late responses from prior identity", async () => {
    useAuthStore.setState({ ready: true, userId: null });
    setGuestId("guest_first");

    let resolveFirst!: (val: { entries: CoinLedgerEntryRecord[]; hasMore: boolean }) => void;
    mockedGetEconomyLedger.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );

    const { result } = renderHook(() => useLedger());
    expect(result.current.isLoading).toBe(true);

    // Now identity switches to guest_second before first response finishes
    mockedGetEconomyLedger.mockResolvedValueOnce({
      entries: [ledgerEntry(201, "300")],
      hasMore: false,
    });

    act(() => setGuestId("guest_second"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe(201);

    // First response now completes late
    act(() => {
      resolveFirst({
        entries: [ledgerEntry(200, "999")],
        hasMore: false,
      });
    });

    // Stale response from previous identity tag must be fenced out and discarded
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe(201);
  });

  it("drops stale error from prior identity if error arrives after identity transition", async () => {
    useAuthStore.setState({ ready: true, userId: null });
    setGuestId("guest_error_first");

    let rejectFirst!: (err: Error) => void;
    mockedGetEconomyLedger.mockImplementationOnce(
      () => new Promise((_, reject) => { rejectFirst = reject; }),
    );

    const { result } = renderHook(() => useLedger());
    expect(result.current.isLoading).toBe(true);

    mockedGetEconomyLedger.mockResolvedValueOnce({
      entries: [ledgerEntry(301, "100")],
      hasMore: false,
    });

    act(() => setGuestId("guest_error_second"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.entries[0].id).toBe(301);

    // Reject first request after transition
    act(() => {
      rejectFirst(new EconomyClientError(500, "NETWORK_ERROR", "Network failed"));
    });

    // Error from old identity must not pollute the new identity
    expect(result.current.error).toBeNull();
    expect(result.current.entries[0].id).toBe(301);
  });
});
