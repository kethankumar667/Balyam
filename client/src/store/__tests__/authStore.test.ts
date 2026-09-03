import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  metadataDisplayName,
  useAuthStore,
  getIdentityPresentation,
  hasVerifiedMemberIdentity,
  setAccessToken,
} from "../authStore";
import { RecentlyPlayedManager } from "../../services/RecentlyPlayedManager";
import { FavouritesManager } from "../../services/FavouritesManager";
import { useRoomStore } from "../roomStore";

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

  it("regression: resets roomStore's seats and lastGangs — bearer room credentials and other players' names must not survive into the next guest session on a shared device", async () => {
    useRoomStore.getState().rememberSeat("ABC123", "p_111", "token_aaa");
    useRoomStore.getState().recordLastGang("Gang 1", ["Alice", "Bob"]);
    expect(useRoomStore.getState().seatFor("ABC123")).not.toBeNull();
    expect(useRoomStore.getState().lastGangs.length).toBe(1);

    await useAuthStore.getState().signOut();

    expect(useRoomStore.getState().seatFor("ABC123")).toBeNull();
    expect(useRoomStore.getState().lastGangs).toEqual([]);
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

/**
 * Guest-wallet-consistency remediation (T3/T4).
 *
 * Root cause (finding G1): on a build with no Supabase keys configured,
 * `signInLocal()` flips `kind` to "member" but never sets `userId` — so that
 * "member" session was reading and spending the SAME guest wallet the whole
 * time, under different UI chrome. `signOut()` used to wipe the guest
 * identity unconditionally, which meant "sign out of my local-flag account"
 * silently deleted the only progress that ever existed. The fix: `signOut()`
 * only runs the full device wipe when `userId` was actually set, i.e. a
 * real, distinct identity is genuinely being left.
 */
describe("signOut — guest identity boundary (guest-wallet-consistency fix)", () => {
  let localMock: ReturnType<typeof fakeStorage>;
  let sessionMock: ReturnType<typeof fakeStorage>;

  beforeEach(() => {
    localMock = fakeStorage();
    sessionMock = fakeStorage();
    vi.stubGlobal("localStorage", localMock);
    vi.stubGlobal("sessionStorage", sessionMock);

    // The guest identity and progress this device had before "logging in".
    localMock.setItem("bhalyam.guest.id", "guest_senthil");
    localMock.setItem("bhalyam.guest.token", "bg1.fake-payload.fake-signature");
    localMock.setItem("bhalyam.guest.expires", String(Date.now() + 1_000_000));
    localMock.setItem("mpg.playerName", "Senthil");
    useRoomStore.setState({ playerId: "guest_senthil", playerName: "Senthil" });
  });

  it("T4: a local-flag session (signInLocal, no real userId) never held a distinct identity — signing out of it leaves the guest's identity and wallet untouched", async () => {
    useAuthStore.setState({
      kind: "member",
      email: "local-flag@bhalyam.io",
      since: 12345,
      userId: null, // signInLocal() never sets this — see authStore.ts
      isMember: true,
      isAdmin: false,
      isSuperAdmin: false,
    });

    await useAuthStore.getState().signOut();

    // The guest identity survives — this is the T1/T2 persistence contract
    // (Scenario 1: "Senthil / 1800" across a refresh) actually being upheld,
    // rather than destroyed by a sign-out that was never leaving it.
    expect(localMock.getItem("bhalyam.guest.id")).toBe("guest_senthil");
    expect(localMock.getItem("bhalyam.guest.token")).toBe("bg1.fake-payload.fake-signature");
    expect(localMock.getItem("mpg.playerName")).toBe("Senthil");
    expect(useRoomStore.getState().playerName).toBe("Senthil");
    expect(useRoomStore.getState().playerId).toBe("guest_senthil");

    // The UI still correctly reports "no longer a member" — only the
    // underlying wallet/identity is spared, never the auth-state transition.
    const state = useAuthStore.getState();
    expect(state.kind).toBe("guest");
    expect(state.isMember).toBe(false);
    expect(state.userId).toBeNull();
  });

  it("T3: a real session (userId set) still wipes the device on sign-out — this destroys only the identity actually being left, per the existing shared-device contract", async () => {
    useAuthStore.setState({
      kind: "member",
      email: "real-member@bhalyam.io",
      since: 12345,
      userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
      isMember: true,
      isAdmin: false,
      isSuperAdmin: false,
    });

    await useAuthStore.getState().signOut();

    expect(localMock.getItem("bhalyam.guest.id")).toBeNull();
    expect(localMock.getItem("bhalyam.guest.token")).toBeNull();
    expect(useRoomStore.getState().playerName).toBe("");
    expect(useRoomStore.getState().playerId).toBeNull();
  });
});

describe("Identity Presentation & Truthful Capability Model", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", fakeStorage());
    vi.stubGlobal("sessionStorage", fakeStorage());
    useAuthStore.setState({
      kind: "guest",
      email: null,
      since: null,
      userId: null,
      isMember: false,
      isAdmin: false,
      isSuperAdmin: false,
      ready: true,
    });
  });

  it("guest identity presents as Guest Player with no verified membership", () => {
    const state = useAuthStore.getState();
    const presentation = getIdentityPresentation(state);
    expect(presentation.mode).toBe("guest");
    expect(presentation.isVerifiedMember).toBe(false);
    expect(presentation.isLocalFallback).toBe(false);
    expect(presentation.label).toBe("Guest");
    expect(presentation.badgeText).toBe("Guest Player");
  });

  it("signInLocal assigns truthful local_fallback presentation and does not grant member capabilities", () => {
    useAuthStore.getState().signInLocal("demo@bhalyam.io");
    const state = useAuthStore.getState();

    // Local fallback is unverified — cannot masquerade as real member
    expect(state.userId).toBeNull();
    expect(state.isMember).toBe(false);
    expect(state.isAdmin).toBe(false);
    expect(state.isSuperAdmin).toBe(false);

    // Capabilities must be guest-equivalent (real-member-only features disabled)
    expect(state.capabilities.viewProfile).toBe(false);
    expect(state.capabilities.viewTournaments).toBe(false);
    expect(state.capabilities.viewLeaderboards).toBe(false);
    expect(state.capabilities.viewSocial).toBe(false);

    // Presentation must be truthful Offline Demo Mode
    const presentation = getIdentityPresentation(state);
    expect(presentation.mode).toBe("local_fallback");
    expect(presentation.isVerifiedMember).toBe(false);
    expect(presentation.isLocalFallback).toBe(true);
    expect(presentation.label).toBe("Offline Demo Mode");
    expect(presentation.badgeText).toBe("Offline Demo Mode");
    expect(hasVerifiedMemberIdentity(state)).toBe(false);
  });

  it("super_admin presentation displays Super Admin label while fail-closed predicate denies forged member identity", () => {
    useAuthStore.getState().signInSuperAdmin();
    const state = useAuthStore.getState();
    expect(state.isSuperAdmin).toBe(true);

    const presentation = getIdentityPresentation(state);
    expect(presentation.mode).toBe("super_admin");
    expect(presentation.label).toBe("Super Admin");
    expect(presentation.badgeText).toBe("Super Admin");
    // Without a real Supabase session (userId + accessToken), client-asserted admin cannot claim verified member identity
    expect(presentation.isVerifiedMember).toBe(false);
    expect(hasVerifiedMemberIdentity(state)).toBe(false);
  });

  it("verified session with admin role is recognized as verified member identity", () => {
    useAuthStore.getState().grantAdminAccess({ userId: "u_verified_admin", email: "admin@bhalyam.io" });
    setAccessToken("real_signed_admin_token");
    const state = useAuthStore.getState();

    const presentation = getIdentityPresentation(state);
    expect(presentation.mode).toBe("super_admin");
    expect(presentation.isVerifiedMember).toBe(true);
    expect(hasVerifiedMemberIdentity(state)).toBe(true);
  });
});
