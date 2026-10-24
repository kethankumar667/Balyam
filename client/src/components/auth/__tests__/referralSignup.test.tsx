import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSignUp } from "../useAccountAuth";

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), oauth: vi.fn(), signInLocal: vi.fn() }));
vi.mock("../../../store/authStore", () => ({
  useAuthStore: (select: (s: { signInLocal: typeof mocks.signInLocal }) => unknown) => select({ signInLocal: mocks.signInLocal }),
}));
vi.mock("../../../lib/playerIdentity", () => ({ apiFetch: vi.fn() }));
vi.mock("../../../lib/socket", () => ({ getApiBaseUrl: () => "" }));
vi.mock("../../../lib/supabase/client", () => ({
  getSupabase: () => ({ auth: { signUp: mocks.signUp, signInWithOAuth: mocks.oauth } }),
  isSupabaseConfigured: true,
  redirectTo: (path: string) => `https://local-fixture.example${path}`,
  authErrorMessage: (error: Error) => error.message,
  isEmailNotConfirmed: () => false,
}));
const wrapper = ({ children }: PropsWithChildren) => <MemoryRouter>{children}</MemoryRouter>;
beforeEach(() => {
  vi.restoreAllMocks();
  mocks.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mocks.oauth.mockReset().mockResolvedValue({ error: null });
  localStorage.clear();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("accepted invitations survive registration", () => {
  it("carries signed acceptance in email signup metadata without changing confirmation redirects", async () => {
    localStorage.setItem("bhalyam.referral.intent", "signed-on-phone");
    const { result } = renderHook(() => useSignUp(), { wrapper });
    act(() => result.current.submit("new@example.test", "test-password", "New Player"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: expect.objectContaining({ display_name: "New Player", referral_intent: "signed-on-phone" }),
        emailRedirectTo: "https://local-fixture.example/verify-email?state=verified",
      }),
    }));
  });
  it("preserves acceptance through the Google signup callback, without an arbitrary redirect", async () => {
    localStorage.setItem("bhalyam.referral.intent", "body.signature");
    const { result } = renderHook(() => useSignUp(), { wrapper });
    act(() => result.current.withGoogle());
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledWith({
      provider: "google", options: { redirectTo: "https://local-fixture.example/invite/complete?intent=body.signature" },
    }));
  });
  it("keeps ordinary signup and a blocked-storage browser working without inventing an invitation", async () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("Storage blocked"); } });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useSignUp(), { wrapper });
    act(() => result.current.submit("new@example.test", "test-password", "New Player"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ data: expect.objectContaining({ referral_intent: null }) }),
    }));
    expect(warning).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });
});
