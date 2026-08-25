import { describe, it, expect, beforeEach } from "vitest";
import { metadataDisplayName, useAuthStore } from "../authStore";

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
