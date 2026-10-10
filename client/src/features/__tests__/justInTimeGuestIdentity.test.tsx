import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { apiFetch, clearGuestIdentity, getGuestIdSnapshot, peekPlayerCredential, usePlayerId } from "../../lib/playerIdentity";
import { useAuthStore } from "../../store/authStore";
import { useWallet } from "../../hooks/useEconomy";

/**
 * A visitor who only looks around has done nothing that needs an identity, so none is created for
 * them: no guest id, no server row, no welcome coins. Identity is created at the first action that
 * needs one, and not before. These pin that rule from the three places it could leak.
 */
describe("just-in-time guest identity", () => {
  const minted = { playerId: "guest_jit0001", token: "signed.guest.token", expiresAt: Date.now() + 86_400_000 };
  let fetchMock: ReturnType<typeof vi.fn>;

  const urlsCalled = (): string[] => fetchMock.mock.calls.map((c) => String(c[0]));

  beforeEach(() => {
    localStorage.clear();
    clearGuestIdentity();
    useAuthStore.setState({ userId: null, kind: "guest", email: null, since: null, isMember: false, ready: true } as never);
    fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).endsWith("/api/auth/guest")) return { ok: true, status: 200, json: async () => minted };
      return { ok: true, status: 200, json: async () => ({}) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    localStorage.clear();
    clearGuestIdentity();
    vi.restoreAllMocks();
  });

  it("a read from a first-time visitor creates no guest", async () => {
    await apiFetch("/api/economy/wallet");

    expect(urlsCalled().some((u) => u.endsWith("/api/auth/guest"))).toBe(false);
    expect(getGuestIdSnapshot()).toBeNull();
  });

  it("a deliberate write from a first-time visitor creates the guest at that moment", async () => {
    await apiFetch("/api/scorecards/record", { method: "POST", body: JSON.stringify({}) });

    const calls = urlsCalled();
    expect(calls[0].endsWith("/api/auth/guest")).toBe(true);
    expect(getGuestIdSnapshot()).toBe(minted.playerId);
    // And the write itself went out carrying the new identity.
    const writeInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect((writeInit.headers as Record<string, string>).Authorization).toBe(`Bearer ${minted.token}`);
  });

  it("a visitor who already has an identity is not minted another", async () => {
    localStorage.setItem("bhalyam.guest.id", minted.playerId);
    localStorage.setItem("bhalyam.guest.token", minted.token);
    localStorage.setItem("bhalyam.guest.exp", String(Date.now() + 86_400_000));

    await apiFetch("/api/anything", { method: "POST" });

    expect(urlsCalled().some((u) => u.endsWith("/api/auth/guest"))).toBe(false);
    expect(peekPlayerCredential()?.playerId).toBe(minted.playerId);
  });

  it("the passive player-id hook reports nobody and creates nobody", async () => {
    const { result } = renderHook(() => usePlayerId());

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.playerId).toBeNull();
    expect(urlsCalled()).toEqual([]);
  });

  it("a first-time visitor's wallet is 'none': no request, and not an error or a zero", async () => {
    const { result } = renderHook(() => useWallet());

    await waitFor(() => expect(result.current.status).toBe("none"));

    expect(result.current.balance).toBeNull();
    expect(result.current.error).toBeNull();
    expect(urlsCalled()).toEqual([]);
  });
});
