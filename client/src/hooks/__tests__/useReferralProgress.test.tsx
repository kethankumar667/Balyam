import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import { useReferralProgress } from "../useReferralProgress";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(), attribute: vi.fn(), session: vi.fn(), fetchCosmetics: vi.fn(), updateUser: vi.fn(),
}));
vi.mock("../../store/authStore", () => ({
  useAuthStore: create(() => ({ userId: "account-a" as string | null })),
}));
vi.mock("../../store/progressionVersionStore", () => ({
  useProgressionVersion: create(() => ({ version: 0 })),
}));
vi.mock("../../lib/supabase/client", () => ({
  getSupabase: () => ({ auth: { getSession: mocks.session, updateUser: mocks.updateUser } }),
}));
vi.mock("../../store/cosmeticsStore", () => ({
  useCosmeticsStore: { getState: () => ({ fetchCosmetics: mocks.fetchCosmetics }) },
}));
vi.mock("../../lib/referrals", async importOriginal => ({
  ...await importOriginal<typeof import("../../lib/referrals")>(),
  syncReferrals: mocks.sync, attributeReferral: mocks.attribute,
}));
vi.mock("../../lib/playerIdentity", () => ({ apiFetch: vi.fn() }));
vi.mock("../../lib/socket", () => ({ getApiBaseUrl: () => "" }));
import { useAuthStore } from "../../store/authStore";

const progress = { inviteCode: "code-a", qualifiedFriends: 2, pendingFriends: 1, target: 3, rewardGranted: false };
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ userId: "account-a" });
  mocks.session.mockResolvedValue({ data: { session: { user: { id: "account-a", user_metadata: {} } } }, error: null });
  mocks.sync.mockResolvedValue(progress);
  mocks.attribute.mockResolvedValue({ ok: true });
  mocks.updateUser.mockResolvedValue({ error: null });
});

describe("account-owned referral progress", () => {
  it("does not request anything for a guest and does not spin forever for a local-only member", async () => {
    const { result, rerender } = renderHook(({ enabled }) => useReferralProgress(enabled), { initialProps: { enabled: false } });
    expect(result.current.loading).toBe(false);
    expect(mocks.sync).not.toHaveBeenCalled();
    act(() => useAuthStore.setState({ userId: null }));
    rerender({ enabled: true });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toMatch(/verified/i);
  });

  it("connects email-signup metadata from another device before syncing", async () => {
    mocks.session.mockResolvedValue({ data: { session: { user: { id: "account-a", user_metadata: { referral_intent: "signed-on-phone" } } } } });
    const { result } = renderHook(() => useReferralProgress(true));
    await waitFor(() => expect(result.current.progress).toEqual(progress));
    expect(mocks.attribute).toHaveBeenCalledWith("signed-on-phone");
    expect(mocks.attribute.mock.invocationCallOrder[0]).toBeLessThan(mocks.sync.mock.invocationCallOrder[0]!);
    expect(result.current.notice).toMatch(/connected/i);
    expect(mocks.updateUser).toHaveBeenCalledWith({ data: { referral_intent: null } });
  });

  it("never turns an expired member session into an implicit guest write", async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useReferralProgress(true));
    await waitFor(() => expect(result.current.error).toMatch(/sign in with a verified account/i));
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.attribute).not.toHaveBeenCalled();
  });

  it("keeps a verification-pending intent, surfaces failures, and supports retry", async () => {
    localStorage.setItem("bhalyam.referral.intent", "pending-email");
    mocks.attribute.mockResolvedValue({ ok: false, code: "VERIFY_EMAIL" });
    mocks.sync.mockRejectedValueOnce(new Error("Service offline"));
    const { result } = renderHook(() => useReferralProgress(true));
    await waitFor(() => expect(result.current.error).toBe("Service offline"));
    expect(localStorage.getItem("bhalyam.referral.intent")).toBe("pending-email");
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.progress).toEqual(progress));
    expect(result.current.notice).toMatch(/verify your email/i);
  });

  it("never attributes an old account's metadata while a new account is becoming active", async () => {
    let finish!: (value: unknown) => void;
    mocks.session.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useReferralProgress(true));
    act(() => useAuthStore.setState({ userId: "account-b" }));
    expect(result.current.progress).toBeNull();
    await act(async () => finish({ data: { session: { user: { id: "account-a", user_metadata: { referral_intent: "old-intent" } } } } }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.attribute).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/account|sign.in/i);
  });

  it("discards a previous owner's delayed progress and refreshes earned cosmetics", async () => {
    let finish!: (value: typeof progress) => void;
    mocks.sync.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useReferralProgress(true));
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledOnce());
    mocks.session.mockResolvedValue({ data: { session: { user: { id: "account-b", user_metadata: {} } } } });
    mocks.sync.mockResolvedValue({ ...progress, inviteCode: "code-b", rewardGranted: true });
    act(() => useAuthStore.setState({ userId: "account-b" }));
    await waitFor(() => expect(result.current.progress?.inviteCode).toBe("code-b"));
    await act(async () => finish(progress));
    expect(result.current.progress?.inviteCode).toBe("code-b");
    expect(mocks.fetchCosmetics).toHaveBeenCalledOnce();
  });
});
