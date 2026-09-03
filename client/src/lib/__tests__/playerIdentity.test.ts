import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveRoomCredential, ensureGuestToken } from "../playerIdentity";
import { useAuthStore, setAccessToken } from "../../store/authStore";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, String(v)),
    removeItem: (k: string) => map.delete(k),
    clear: () => map.clear(),
    get size() {
      return map.size;
    },
  };
}

describe("resolveRoomCredential", () => {
  let localMock: ReturnType<typeof fakeStorage>;
  let sessionMock: ReturnType<typeof fakeStorage>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localMock = fakeStorage();
    sessionMock = fakeStorage();
    vi.stubGlobal("localStorage", localMock);
    vi.stubGlobal("sessionStorage", sessionMock);
    setAccessToken(null);
    useAuthStore.setState({
      kind: "guest",
      userId: null,
      email: null,
      isMember: false,
      isAdmin: false,
      isSuperAdmin: false,
      ready: true,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it("returns member credentials with accessToken when verified session is present", async () => {
    setAccessToken("session_token_xyz");
    useAuthStore.setState({
      kind: "member",
      userId: "u_verified_123",
      isMember: true,
    });

    const res = await resolveRoomCredential();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("member");
      expect(res.accessToken).toBe("session_token_xyz");
      expect(res.guestToken).toBeUndefined();
    }
  });

  it("returns stored guest token when guest credentials already exist in storage", async () => {
    localMock.setItem("bhalyam.guest.id", "guest_existing");
    localMock.setItem("bhalyam.guest.token", "bg1.existing.token");
    localMock.setItem("bhalyam.guest.expires", String(Date.now() + 3_600_000));

    const res = await resolveRoomCredential();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("guest");
      expect(res.guestToken).toBe("bg1.existing.token");
      expect(res.accessToken).toBeUndefined();
    }
  });

  it("mints a fresh guest token when none exists and mint endpoint succeeds", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: "guest_minted_456",
        token: "bg1.minted.token",
        expiresAt: Date.now() + 3_600_000,
      }),
    } as Response);

    const res = await resolveRoomCredential();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("guest");
      expect(res.guestToken).toBe("bg1.minted.token");
      expect(res.accessToken).toBeUndefined();
    }
    expect(localMock.getItem("bhalyam.guest.token")).toBe("bg1.minted.token");
    expect(localMock.getItem("bhalyam.guest.id")).toBe("guest_minted_456");
  });

  it("fails closed with user-facing error message when guest minting fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Service unavailable" }),
    } as Response);

    const res = await resolveRoomCredential();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("We could not prepare your guest session. Check your connection and try again.");
    }
  });

  it("fails closed with user-facing error when guest minting throws a network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network disconnect"));

    const res = await resolveRoomCredential();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("We could not prepare your guest session. Check your connection and try again.");
    }
  });

  it("local fallback session (signInLocal without Supabase) resolves as guest, not member", async () => {
    useAuthStore.getState().signInLocal("demo@bhalyam.io");

    localMock.setItem("bhalyam.guest.id", "guest_fallback");
    localMock.setItem("bhalyam.guest.token", "bg1.fallback.token");
    localMock.setItem("bhalyam.guest.expires", String(Date.now() + 3_600_000));

    const res = await resolveRoomCredential();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("guest");
      expect(res.guestToken).toBe("bg1.fallback.token");
      expect(res.accessToken).toBeUndefined();
    }
  });

  it("ensureGuestToken returns undefined when resolveRoomCredential fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network disconnect"));

    const token = await ensureGuestToken();
    expect(token).toBeUndefined();
  });
});