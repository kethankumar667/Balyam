import { describe, it, expect, beforeEach, vi } from "vitest";
import { metadataDisplayName, useAuthStore } from "../authStore";
import { RecentlyPlayedManager } from "../../services/RecentlyPlayedManager";
import { FavouritesManager } from "../../services/FavouritesManager";

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

describe("metadataDisplayName", () => {
  it("prefers display_name (our own signup form) when present", () => {
    expect(
      metadataDisplayName({ display_name: "Kethan Kumar", full_name: "Kethan K.", name: "Kethan" }),
    ).toBe("Kethan Kumar");
  });

  it("falls back to full_name (Google OAuth) when display_name is absent", () => {
    expect(metadataDisplayName({ full_name: "Kethan Kumar", name: "Kethan" })).toBe("Kethan Kumar");
  });

  it("falls back to name when neither display_name nor full_name is present", () => {
    expect(metadataDisplayName({ name: "Kethan Kumar" })).toBe("Kethan Kumar");
  });

  it("trims whitespace", () => {
    expect(metadataDisplayName({ display_name: "  Kethan Kumar  " })).toBe("Kethan Kumar");
  });

  it("returns null for missing, empty, non-string, or whitespace-only metadata", () => {
    expect(metadataDisplayName(null)).toBeNull();
    expect(metadataDisplayName(undefined)).toBeNull();
    expect(metadataDisplayName({})).toBeNull();
    expect(metadataDisplayName({ display_name: "" })).toBeNull();
    expect(metadataDisplayName({ display_name: "   " })).toBeNull();
    expect(metadataDisplayName({ display_name: 12345 })).toBeNull();
  });

  it("regression: this is what stops a stale local guest nickname from permanently overwriting a real signup/OAuth name on first sign-in", () => {
    // The exact bug scenario: a browser has "Jetpacker" sitting in local
    // guest-play state, and the account being signed into has a real name
    // from Google OAuth metadata. The real name must win.
    const meta = { full_name: "Kethan Kumar" };
    const localGuestNickname = "Jetpacker";
    const resolved = metadataDisplayName(meta) || localGuestNickname;
    expect(resolved).toBe("Kethan Kumar");
  });
});

describe("grantAdminAccess", () => {
  beforeEach(() => {
    useAuthStore.setState({
      kind: "member",
      email: "kethankumargontla@gmail.com",
      since: 12345,
      userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
      isMember: true,
      isAdmin: false,
      isSuperAdmin: false,
    });
  });

  it("regression: does not overwrite the real signed-in email with the old hardcoded 'superadmin@bhalyam.io' placeholder", () => {
    // This is the exact bug setSuperAdmin(true) had: AdminRoute called it
    // after a REAL admin session passed server verification, and it always
    // wrote a fake email, discarding who was actually signed in.
    useAuthStore.getState().grantAdminAccess({
      userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
      email: "kethankumargontla@gmail.com",
    });
    expect(useAuthStore.getState().email).toBe("kethankumargontla@gmail.com");
    expect(useAuthStore.getState().email).not.toBe("superadmin@bhalyam.io");
  });

  it("grants super_admin kind and flips isAdmin/isSuperAdmin/isMember", () => {
    useAuthStore.getState().grantAdminAccess({ userId: "u1", email: "a@b.com" });
    const state = useAuthStore.getState();
    expect(state.kind).toBe("super_admin");
    expect(state.isAdmin).toBe(true);
    expect(state.isSuperAdmin).toBe(true);
    expect(state.isMember).toBe(true);
  });

  it("falls back to whatever email/userId the store already had when the principal carries none (the ops-key path)", () => {
    useAuthStore.getState().grantAdminAccess({});
    const state = useAuthStore.getState();
    expect(state.email).toBe("kethankumargontla@gmail.com");
    expect(state.userId).toBe("12e092a4-d712-4bfc-8222-a5a6f37e4ec9");
  });
});

describe("signOut", () => {
  let localMock: ReturnType<typeof fakeStorage>;
  let sessionMock: ReturnType<typeof fakeStorage>;

  beforeEach(() => {
    localMock = fakeStorage();
    sessionMock = fakeStorage();
    vi.stubGlobal("localStorage", localMock);
    vi.stubGlobal("sessionStorage", sessionMock);

    // Unrelated keys a shared device would have accumulated — recently
    // played, favourites, a feature flag override, an admin ops key —
    // none of which authStore itself knows the names of.
    localMock.setItem("bhalyam.recentlyPlayed", "[...]");
    localMock.setItem("bhalyam.favourites", "[...]");
    localMock.setItem("bhalyam.ff.some-flag", "true");
    sessionMock.setItem("bhalyam.ops.key", "some-admin-key");

    useAuthStore.setState({
      kind: "super_admin",
      email: "kethankumargontla@gmail.com",
      since: 12345,
      userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
      isMember: true,
      isAdmin: true,
      isSuperAdmin: true,
    });
  });

  it("regression: wipes every localStorage and sessionStorage key on this device, not just the ones authStore itself writes", async () => {
    await useAuthStore.getState().signOut();
    expect(localMock.size).toBe(0);
    expect(sessionMock.size).toBe(0);
  });

  it("regression: resets RecentlyPlayedManager and FavouritesManager, not just their storage keys — the previous account's activity must not survive into the next guest session", async () => {
    // These singletons cache in memory once loaded; localStorage.clear()
    // alone (asserted above) can't reach that cache. signOut() must call
    // each manager's own clear method for this to actually take effect —
    // this is the exact bug a real user hit: logged out, still saw the
    // signed-in account's Recently Played list and its unread count.
    RecentlyPlayedManager.recordRecentlyPlayed("ludo");
    FavouritesManager.addFavourite("rummy");
    expect(RecentlyPlayedManager.getRecentlyPlayed().length).toBe(1);
    expect(FavouritesManager.getFavourites().length).toBe(1);

    await useAuthStore.getState().signOut();

    expect(RecentlyPlayedManager.getRecentlyPlayed()).toEqual([]);
    expect(FavouritesManager.getFavourites()).toEqual([]);
  });

  it("resets auth state to a signed-out guest", async () => {
    await useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.kind).toBe("guest");
    expect(state.isMember).toBe(false);
    expect(state.isAdmin).toBe(false);
    expect(state.isSuperAdmin).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.email).toBeNull();
  });

  it("does not throw when storage is unavailable (private browsing)", async () => {
    const deny = () => {
      throw new Error("storage disabled");
    };
    vi.stubGlobal("localStorage", { getItem: deny, setItem: deny, removeItem: deny, clear: deny });
    await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();
  });
});
