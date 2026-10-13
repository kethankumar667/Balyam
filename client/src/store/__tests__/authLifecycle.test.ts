import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  onSession: null as ((event: string, session: Session | null) => void) | null,
  read: vi.fn(),
  save: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock("../../lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  SESSION_STORAGE_KEY: "bhalyam.session",
  getSupabase: () => ({ auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (callback: typeof mocks.onSession) => { mocks.onSession = callback; },
    signOut: mocks.signOut,
  } }),
}));
vi.mock("../../lib/supabase/profile", () => ({
  fetchProfileResult: mocks.read,
  fetchProfile: vi.fn(),
  saveProfile: mocks.save,
  deleteAccount: mocks.deleteAccount,
}));
vi.mock("../../services/UserDataSyncService", () => ({
  syncUserDataOnLogin: vi.fn(),
  clearUserDataOnSignOut: vi.fn(),
}));

import { currentAccessToken, useAuthStore } from "../authStore";
import { useRoomStore } from "../roomStore";
import { needsConsent, recordConsent, resetConsentSession } from "../../lib/privacy/consent";
import { executeAccountDeletion } from "../../lib/accountDeletion";

function session(userId = "google-user"): Session {
  return {
    access_token: `token-${userId}`, refresh_token: "refresh", expires_in: 3600,
    token_type: "bearer",
    user: { id: userId, email: "player@example.com", created_at: "2026-10-13T00:00:00Z",
      app_metadata: {}, user_metadata: { full_name: "Asha Rao" }, aud: "authenticated" },
  };
}

function signIn(userId = "google-user") {
  mocks.onSession?.("SIGNED_IN", session(userId));
}

describe("Google account lifecycle", () => {
  beforeEach(async () => {
    await Promise.resolve();
    mocks.onSession?.("SIGNED_OUT", null);
    localStorage.clear();
    sessionStorage.clear();
    resetConsentSession();
    useRoomStore.getState().resetIdentity();
    mocks.read.mockReset().mockResolvedValue({ status: "missing" });
    mocks.save.mockReset().mockResolvedValue(true);
    mocks.signOut.mockReset().mockImplementation(async () => {
      mocks.onSession?.("SIGNED_OUT", null);
      return {};
    });
    mocks.deleteAccount.mockReset().mockImplementation(async () => {
      await mocks.signOut();
      return { ok: true };
    });
  });

  it("rebuilds a missing Google profile completely and reopens its consent", async () => {
    recordConsent("granted", new Date(), "google-user");
    useRoomStore.getState().setBio("Previous account bio");
    signIn();
    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save).toHaveBeenCalledWith("google-user", expect.objectContaining({
      displayName: "Asha Rao", firstName: "Asha", lastName: "Rao",
      email: "player@example.com", accountId: expect.any(String),
      dob: null, gender: null, bio: null, region: null,
    }));
    expect(needsConsent("google-user")).toBe(true);
  });

  it("does not recreate or invalidate consent when the profile read is unavailable", async () => {
    mocks.read.mockResolvedValue({ status: "unavailable" });
    recordConsent("essential-only", new Date(), "google-user");
    signIn();
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(needsConsent("google-user")).toBe(false);
  });

  it("clears the outgoing profile when the incoming account cannot be read", async () => {
    mocks.read.mockResolvedValueOnce({ status: "found", profile: {
      displayName: "Previous member", avatarId: "previous-avatar",
      bio: "Private previous bio", region: "Previous region",
    } });
    signIn("previous-member");
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
    mocks.read.mockResolvedValue({ status: "unavailable" });
    signIn("incoming-member");
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
    expect(useRoomStore.getState()).toMatchObject({
      playerName: "Asha Rao", avatarId: null, bio: "", region: "",
    });
  });

  it("allows repeated account deletion and registration with the same Google email", async () => {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const userId = `registered-${cycle}`;
      signIn(userId);
      await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
      expect(needsConsent(userId)).toBe(true);
      recordConsent("granted", new Date(), userId);
      expect(await executeAccountDeletion()).toEqual({ ok: true });
      expect(useAuthStore.getState().userId).toBeNull();
      expect(currentAccessToken()).toBeUndefined();
      expect(needsConsent(userId)).toBe(true);
    }
    expect(mocks.deleteAccount).toHaveBeenCalledTimes(3);
  });

  it("does not invalidate an acknowledgement if recreating the profile fails", async () => {
    mocks.save.mockResolvedValue(false);
    recordConsent("granted", new Date(), "google-user");
    signIn();
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
    expect(needsConsent("google-user")).toBe(false);
  });

  it("restarts same-account recovery when SDK sign-out emits no event", async () => {
    let finishRead!: (value: { status: "missing" }) => void;
    mocks.read.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    signIn();
    mocks.signOut.mockResolvedValue({ error: new Error("session read failed") });
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().profileReady).toBe(true);
    signIn();
    finishRead({ status: "missing" });
    await vi.waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
  });

  it("clears the deleted session even when SDK sign-out emits no event", async () => {
    let finishRead!: (value: { status: "missing" }) => void;
    mocks.read.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    signIn();
    mocks.signOut.mockResolvedValue({ error: new Error("session read failed") });
    expect(await executeAccountDeletion()).toEqual({ ok: true });
    expect(currentAccessToken()).toBeUndefined();
    expect(useAuthStore.getState().profileReady).toBe(true);
    finishRead({ status: "missing" });
    await Promise.resolve();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("loads an existing profile even if optional backfill cannot be saved", async () => {
    mocks.read.mockResolvedValue({ status: "found", profile: {
      displayName: "Saved name", avatarId: null, bio: "Saved bio", region: null,
    } });
    mocks.save.mockResolvedValue(false);
    useRoomStore.getState().setPlayerName("Previous account");
    signIn();
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
    expect(useRoomStore.getState().playerName).toBe("Saved name");
    expect(useRoomStore.getState().bio).toBe("Saved bio");
    vi.useFakeTimers();
    try {
      useRoomStore.getState().setBio("Edited bio");
      await vi.advanceTimersByTimeAsync(800);
      expect(mocks.save).toHaveBeenCalledWith("google-user", expect.objectContaining({ bio: "Edited bio" }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits for an already committed recreation before releasing a returning account", async () => {
    let finishSave!: (saved: boolean) => void;
    mocks.save.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    recordConsent("granted", new Date(), "google-user");
    signIn();
    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
    await useAuthStore.getState().signOut();
    mocks.read.mockResolvedValue({ status: "found", profile: {
      displayName: "Asha Rao", avatarId: null, firstName: "Asha", lastName: "Rao",
      email: "player@example.com", accountId: "restored-id",
    } });
    signIn();
    finishSave(true);
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
    expect(needsConsent("google-user")).toBe(true);
    recordConsent("granted", new Date(), "google-user");
    await Promise.resolve();
    expect(needsConsent("google-user")).toBe(false);
  });

  it("preserves acknowledgements and wipes other data through repeated SDK sign-outs", async () => {
    mocks.read.mockResolvedValue({ status: "found", profile: {
      displayName: "Asha Rao", avatarId: null, firstName: "Asha", lastName: "Rao",
      email: "player@example.com", accountId: "existing-id",
    } });
    recordConsent("granted", new Date(), "google-user");
    for (let cycle = 0; cycle < 3; cycle += 1) {
      signIn();
      await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
      localStorage.setItem("private-data", "secret");
      await useAuthStore.getState().signOut();
      expect(localStorage.getItem("private-data")).toBeNull();
      expect(currentAccessToken()).toBeUndefined();
      expect(needsConsent("google-user")).toBe(false);
    }
  });

  it("ignores a profile read that resolves after logout and login to the same account", async () => {
    let finishRead!: (value: { status: "missing" }) => void;
    mocks.read.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    signIn();
    await useAuthStore.getState().signOut();
    mocks.read.mockResolvedValue({ status: "unavailable" });
    signIn();
    finishRead({ status: "missing" });
    await vi.waitFor(() => expect(useAuthStore.getState().profileReady).toBe(true));
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("does not write an outgoing account's profile after switching accounts", async () => {
    let finishRead!: (value: { status: "missing" }) => void;
    mocks.read.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    signIn("old-user");
    signIn("new-user");
    finishRead({ status: "missing" });
    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledWith("new-user", expect.anything()));
    expect(mocks.save.mock.calls.some(([userId]) => userId === "old-user")).toBe(false);
  });
});