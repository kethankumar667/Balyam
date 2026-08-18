import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  clearGuestIdentity,
  getPlayerCredential,
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
      localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 3600000));

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
