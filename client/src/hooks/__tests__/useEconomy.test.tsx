import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWallet } from "../useEconomy";
import { useAuthStore } from "../../store/authStore";
import { getEconomyWallet } from "../../lib/economyApi";
import { EconomyClientError, type CoinWalletRecord } from "../../lib/economyApi";

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
  return { ...actual, getEconomyWallet: vi.fn() };
});

const mockedGetEconomyWallet = vi.mocked(getEconomyWallet);

function wallet(balance: string): { wallet: CoinWalletRecord } {
  return {
    wallet: {
      identityId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
      identityKind: "member",
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

beforeEach(() => {
  mockedGetEconomyWallet.mockReset();
  useAuthStore.setState({ ready: true, userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9" });
});

afterEach(() => {
  useAuthStore.setState({ ready: false, userId: null });
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
