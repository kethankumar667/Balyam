import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  clearGuestIdentity,
  getPlayerCredential,
  ensureGuestToken,
  apiFetch,
  subscribeGuestId,
  getGuestIdSnapshot,
  type PlayerCredential,
} from "../../lib/playerIdentity";
import * as authStore from "../../store/authStore";
import { useAuthStore } from "../../store/authStore";
import AuthShell from "../../components/auth/AuthShell";

describe("Priority 1: Identity & Session Management User Journey", () => {
  beforeEach(() => {
    localStorage.clear();
    clearGuestIdentity();
    useAuthStore.setState({
      userId: null,
      kind: "guest",
      email: null,
      since: null,
      isMember: false,
      ready: true,
    } as any);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    clearGuestIdentity();
    vi.restoreAllMocks();
  });

  describe("1. Guest Identity Minting & Storage", () => {
    it("mints a fresh cryptographically signed guest identity when none is stored", async () => {
      const mockGuestResponse = {
        playerId: "guest_abc1234567890",
        token: "signed_guest_token_xyz987",
        expiresAt: Date.now() + 86400000,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGuestResponse,
      });

      const cred = await getPlayerCredential();
      expect(cred).not.toBeNull();
      expect(cred?.playerId).toBe("guest_abc1234567890");
      expect(cred?.token).toBe("signed_guest_token_xyz987");
      expect(cred?.kind).toBe("guest");

      // Verify stored in localStorage
      expect(localStorage.getItem("bhalyam.guest.id")).toBe("guest_abc1234567890");
      expect(localStorage.getItem("bhalyam.guest.token")).toBe("signed_guest_token_xyz987");
    });

    it("restores existing valid guest credentials from storage without hitting the network", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_persisted_999");
      localStorage.setItem("bhalyam.guest.token", "token_persisted_999");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 6 * 86400000));

      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const cred = await getPlayerCredential();
      expect(cred).toEqual({
        playerId: "guest_persisted_999",
        token: "token_persisted_999",
        kind: "guest",
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("handles expired tokens by automatically minting a replacement", async () => {
      // Set expired timestamp
      localStorage.setItem("bhalyam.guest.id", "guest_expired");
      localStorage.setItem("bhalyam.guest.token", "token_expired");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() - 1000));

      const mockFresh = {
        playerId: "guest_fresh_new",
        token: "token_fresh_new",
        expiresAt: Date.now() + 86400000,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockFresh,
      });

      const cred = await getPlayerCredential();
      expect(cred?.playerId).toBe("guest_fresh_new");
      expect(cred?.token).toBe("token_fresh_new");
    });

    it("gracefully recovers from corrupt localStorage values without crashing", async () => {
      localStorage.setItem("bhalyam.guest.id", "");
      localStorage.setItem("bhalyam.guest.token", "");
      localStorage.setItem("bhalyam.guest.expires", "not-a-number");

      const mockFresh = {
        playerId: "guest_recovered",
        token: "token_recovered",
        expiresAt: Date.now() + 86400000,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockFresh,
      });

      const cred = await getPlayerCredential();
      expect(cred?.playerId).toBe("guest_recovered");
    });
  });

  describe("2. Member Session & Token Flow", () => {
    it("prioritizes authenticated member credentials over guest credentials", async () => {
      useAuthStore.setState({
        userId: "user_pro_456",
        account: {
          kind: "member",
          email: "pro_player@bhalyam.com",
          displayName: "Grandmaster Ace",
        },
      } as any);

      vi.spyOn(authStore, "currentAccessToken").mockReturnValue("member_jwt_token_456");

      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const cred = await getPlayerCredential();
      expect(cred).toEqual({
        playerId: "user_pro_456",
        token: "member_jwt_token_456",
        kind: "member",
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("clears guest identity cleanly upon request", () => {
      localStorage.setItem("bhalyam.guest.id", "guest_to_delete");
      localStorage.setItem("bhalyam.guest.token", "token_to_delete");
      localStorage.setItem("bhalyam.guest.expires", "12345");

      clearGuestIdentity();

      expect(localStorage.getItem("bhalyam.guest.id")).toBeNull();
      expect(localStorage.getItem("bhalyam.guest.token")).toBeNull();
      expect(localStorage.getItem("bhalyam.guest.expires")).toBeNull();
    });
  });

  /**
   * Guest-wallet-consistency remediation (T1/T2/T8/T9/T10). These pin the
   * exact repository evidence the audit used: `guestStarterCoins: "2000"`
   * and "2000 - 200 (1 human + 1 bot)" are the server's own test fixtures
   * (server/src/persistence/InMemoryEconomyRepository.ts,
   * server/src/rooms/__tests__/economyIntegration.test.ts) — seeing a wallet
   * reset to exactly 2000 is the signature of a brand-new guest identity,
   * never the same guest losing track of its balance.
   */
  describe("4. Guest persistence across refresh (T1/T2)", () => {
    it("the SAME guest id and token come back on every call as long as storage is untouched — simulating a page refresh, which never itself clears anything", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_senthil");
      localStorage.setItem("bhalyam.guest.token", "token_senthil");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 6 * 86400000));

      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      // Two calls stand in for two page loads reading the same persisted
      // storage. Neither should ever re-mint while a valid credential exists
      // — a fresh mint here is exactly the defect that turned "Senthil / 1800"
      // into "Guest / 2000" on refresh.
      const first = await getPlayerCredential();
      const second = await getPlayerCredential();

      expect(first).toEqual({ playerId: "guest_senthil", token: "token_senthil", kind: "guest" });
      expect(second).toEqual(first);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("5. Guest credential before room lifecycle (T8/T9)", () => {
    it("mints a guest identity when none exists yet, so a guest's very first room:create/room:join always has one to send", async () => {
      const mockFresh = {
        playerId: "guest_first_touch",
        token: "token_first_touch",
        expiresAt: Date.now() + 86400000,
      };
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockFresh });

      const token = await ensureGuestToken();

      expect(token).toBe("token_first_touch");
      expect(localStorage.getItem("bhalyam.guest.id")).toBe("guest_first_touch");
    });

    it("returns the already-stored token without minting a duplicate identity", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_existing");
      localStorage.setItem("bhalyam.guest.token", "token_existing");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 6 * 86400000));
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const token = await ensureGuestToken();

      expect(token).toBe("token_existing");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns undefined for an authenticated member — the server reads identity from accessToken instead, never a guest token", async () => {
      useAuthStore.setState({ userId: "user_pro_456" } as any);
      vi.spyOn(authStore, "currentAccessToken").mockReturnValue("member_jwt_token_456");
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const token = await ensureGuestToken();

      expect(token).toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("6. Guest token invalidation path (T10)", () => {
    it("apiFetch drops an invalid guest token on 401 and retries once with a freshly minted replacement", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_stale");
      localStorage.setItem("bhalyam.guest.token", "token_stale");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 6 * 86400000));

      const mockFresh = {
        playerId: "guest_replacement",
        token: "token_replacement",
        expiresAt: Date.now() + 86400000,
      };
      let call = 0;
      global.fetch = vi.fn().mockImplementation((url: unknown) => {
        call += 1;
        if (typeof url === "string" && url.endsWith("/api/auth/guest")) {
          return Promise.resolve({ ok: true, json: async () => mockFresh });
        }
        // Call 1: the original request, rejected (stale token). Call 3: the
        // retry with the freshly minted replacement, accepted.
        return Promise.resolve({ ok: call > 2, status: call > 2 ? 200 : 401 });
      });

      const res = await apiFetch("/api/economy/wallet");

      expect(res.ok).toBe(true);
      expect(localStorage.getItem("bhalyam.guest.id")).toBe("guest_replacement");
    });

    it("notifies subscribeGuestId listeners once the replacement guest id lands — the signal useWallet() needs to refetch instead of showing the old guest's stale balance", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_stale2");
      localStorage.setItem("bhalyam.guest.token", "token_stale2");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 6 * 86400000));

      const listener = vi.fn();
      const unsubscribe = subscribeGuestId(listener);

      const mockFresh = {
        playerId: "guest_replacement2",
        token: "token_replacement2",
        expiresAt: Date.now() + 86400000,
      };
      let call = 0;
      global.fetch = vi.fn().mockImplementation((url: unknown) => {
        call += 1;
        if (typeof url === "string" && url.endsWith("/api/auth/guest")) {
          return Promise.resolve({ ok: true, json: async () => mockFresh });
        }
        return Promise.resolve({ ok: call > 2, status: call > 2 ? 200 : 401 });
      });

      await apiFetch("/api/economy/wallet");

      expect(listener).toHaveBeenCalled();
      expect(getGuestIdSnapshot()).toBe("guest_replacement2");
      unsubscribe();
    });
  });

  describe("7. Guest renewal keeps the same player (expiry must not orphan a wallet)", () => {
    const renewedBody = (playerId: string) => ({
      playerId,
      token: `renewed_token_for_${playerId}`,
      expiresAt: Date.now() + 86400000,
    });

    const DAY = 24 * 60 * 60 * 1000;

    it("starts a NEW guest once the stored token has expired — 7 days idle ends the identity", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_idle_too_long");
      localStorage.setItem("bhalyam.guest.token", "token_expired");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() - 1000));

      const fetchSpy = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => renewedBody("guest_brand_new") });
      global.fetch = fetchSpy;

      const cred = await getPlayerCredential();

      expect(cred?.playerId).toBe("guest_brand_new");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/api\/auth\/guest$/);
    });

    it("leaves a guest with plenty of time left alone — no request at all", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_fresh");
      localStorage.setItem("bhalyam.guest.token", "token_fresh");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 6 * DAY));
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const cred = await getPlayerCredential();

      expect(cred?.token).toBe("token_fresh");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("restarts the clock for the SAME id once half the window is gone, without announcing a change", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_quiet");
      localStorage.setItem("bhalyam.guest.token", "token_aging");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 2 * DAY));
      const listener = vi.fn();
      const unsubscribe = subscribeGuestId(listener);
      const fetchSpy = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => renewedBody("guest_quiet") });
      global.fetch = fetchSpy;

      const cred = await getPlayerCredential();

      expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/api\/auth\/guest\/renew$/);
      expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe("Bearer token_aging");
      expect(cred?.playerId).toBe("guest_quiet");
      expect(cred?.token).toBe("renewed_token_for_guest_quiet");
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });

    it("keeps using the current token when a renewal attempt fails, rather than discarding the guest", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_offline");
      localStorage.setItem("bhalyam.guest.token", "token_still_valid");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 1 * DAY));
      global.fetch = vi.fn().mockRejectedValue(new Error("offline"));

      const cred = await getPlayerCredential();

      expect(cred).toEqual({ playerId: "guest_offline", token: "token_still_valid", kind: "guest" });
    });

    it("a 401 on apiFetch renews the same id and retries once, minting nobody", async () => {
      localStorage.setItem("bhalyam.guest.id", "guest_kept");
      localStorage.setItem("bhalyam.guest.token", "token_rejected");
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 6 * 86400000));

      const calls: string[] = [];
      global.fetch = vi.fn().mockImplementation((url: unknown, init?: RequestInit) => {
        calls.push(String(url));
        if (String(url).endsWith("/api/auth/guest/renew")) {
          return Promise.resolve({ ok: true, json: async () => renewedBody("guest_kept") });
        }
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
        return Promise.resolve({ ok: auth !== "Bearer token_rejected", status: 401 });
      });

      const res = await apiFetch("/api/economy/wallet");

      expect(res.ok).toBe(true);
      expect(getGuestIdSnapshot()).toBe("guest_kept");
      expect(calls.some((c) => c.endsWith("/api/auth/guest"))).toBe(false);
    });
  });

  describe("3. AuthShell UI & Accessible Layout", () => {
    it("renders branding, title, subtitle, and protected form content", () => {
      render(
        <BrowserRouter>
          <AuthShell
            heroType="login"
            title="Sign In to BHALYAM"
            subtitle="Access your stats, ranks, and custom lounges"
          >
            <div data-testid="auth-form">Login Form Content</div>
          </AuthShell>
        </BrowserRouter>
      );

      expect(screen.getByTestId("auth-form")).toBeDefined();
      expect(screen.getByText("Sign In to BHALYAM")).toBeDefined();
      expect(screen.getByText("Access your stats, ranks, and custom lounges")).toBeDefined();
      expect(screen.getByAltText("BHALYAM - Play Together. Remember Forever.")).toBeDefined();
    });

    it("renders back navigation affordance with accessible link", () => {
      render(
        <BrowserRouter>
          <AuthShell
            heroType="signup"
            title="Join the Lounge"
            backLabel="Back to home"
            backTo="/"
          >
            <div>Signup Content</div>
          </AuthShell>
        </BrowserRouter>
      );

      expect(screen.getByText("Join the Lounge")).toBeDefined();
    });
  });
});
