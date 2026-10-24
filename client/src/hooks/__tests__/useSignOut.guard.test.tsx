import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { RecordsAtRisk } from "../../lib/signOutGuard";

const mockPeek = vi.fn();
const mockCheck = vi.fn();
vi.mock("../../lib/playerIdentity", () => ({
  apiJson: vi.fn(), apiFetch: vi.fn(), getPlayerCredential: vi.fn(), peekPlayerCredential: (...a: unknown[]) => mockPeek(...a),
}));
vi.mock("../../lib/signOutGuard", () => ({ checkRecordsAtRisk: (...a: unknown[]) => mockCheck(...a) }));

const { useSignOut } = await import("../useSignOut");
const { useAuthStore } = await import("../../store/authStore");
const { useSignOutGuardStore } = await import("../../store/signOutGuardStore");

/**
 * Signing out clears the device. If that would delete records the account does not have, the player is asked
 * first, and "cancel" must leave them signed in and where they were.
 */

let currentPath = "";
function PathProbe({ children }: { children: ReactNode }) {
  currentPath = useLocation().pathname;
  return <>{children}</>;
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={["/profile"]}>
    <PathProbe>{children}</PathProbe>
  </MemoryRouter>
);

const risk: RecordsAtRisk = { playerId: "alice", pending: 1, deviceBests: [] };

describe("useSignOut with records at risk", () => {
  let originalSignOut: () => Promise<void>;
  const signOut = vi.fn();

  beforeEach(() => {
    originalSignOut = useAuthStore.getState().signOut;
    signOut.mockReset().mockResolvedValue(undefined);
    useAuthStore.setState({ signOut });
    mockPeek.mockReset().mockReturnValue({ playerId: "alice", token: "t", kind: "member" });
    mockCheck.mockReset();
    useSignOutGuardStore.setState({ risk: null });
  });
  afterEach(() => {
    useAuthStore.setState({ signOut: originalSignOut });
    cleanup();
  });

  it("signs out straight away when nothing would be lost", async () => {
    mockCheck.mockResolvedValue(null);
    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => { await result.current(); });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(currentPath).toBe("/");
  });

  it("asks first, and signs out once the player agrees", async () => {
    mockCheck.mockResolvedValue(risk);
    const { result } = renderHook(() => useSignOut(), { wrapper });

    let done!: Promise<void>;
    await act(async () => { done = result.current(); await Promise.resolve(); });
    expect(useSignOutGuardStore.getState().risk).toEqual(risk);
    expect(signOut).not.toHaveBeenCalled();
    expect(currentPath).toBe("/profile");

    await act(async () => { useSignOutGuardStore.getState().answer("signout"); await done; });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(currentPath).toBe("/");
  });

  it("leaves the player signed in, on the same page, when they cancel", async () => {
    mockCheck.mockResolvedValue(risk);
    const { result } = renderHook(() => useSignOut(), { wrapper });

    let done!: Promise<void>;
    await act(async () => { done = result.current(); await Promise.resolve(); });
    await act(async () => { useSignOutGuardStore.getState().answer("cancel"); await done; });

    expect(signOut).not.toHaveBeenCalled();
    expect(currentPath).toBe("/profile");
  });

  it("does not check a guest, so their sign-out stays immediate", async () => {
    mockPeek.mockReturnValue({ playerId: "g1", token: "t", kind: "guest" });
    const { result } = renderHook(() => useSignOut(), { wrapper });

    act(() => { void result.current(); });

    expect(mockCheck).not.toHaveBeenCalled();
    expect(currentPath).toBe("/");
  });
});
