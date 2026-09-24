import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useSignOut } from "../useSignOut";
import { useAuthStore } from "../../store/authStore";

let currentPath = "";
function PathProbe({ children }: { children: ReactNode }) {
  currentPath = useLocation().pathname;
  return <>{children}</>;
}
const wrapperAt = (path: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <PathProbe>{children}</PathProbe>
      </MemoryRouter>
    );
  };

describe("useSignOut", () => {
  let originalSignOut: () => Promise<void>;

  beforeEach(() => {
    originalSignOut = useAuthStore.getState().signOut;
  });
  afterEach(() => {
    useAuthStore.setState({ signOut: originalSignOut });
    cleanup();
  });

  it("signs out and lands on the home page, from wherever the person was", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ signOut });
    const { result } = renderHook(() => useSignOut(), { wrapper: wrapperAt("/mandali/nellore") });
    expect(currentPath).toBe("/mandali/nellore");

    await act(async () => {
      await result.current();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(currentPath).toBe("/");
  });

  it("still leaves the page when ending the session fails", async () => {
    useAuthStore.setState({ signOut: vi.fn().mockRejectedValue(new Error("network down")) });
    const { result } = renderHook(() => useSignOut(), { wrapper: wrapperAt("/mandali/nellore") });

    await act(async () => {
      await result.current().catch(() => undefined);
    });

    expect(currentPath).toBe("/");
  });

  it("is on the home page while a slow sign-out is still in flight", async () => {
    let finish: () => void = () => undefined;
    useAuthStore.setState({ signOut: () => new Promise<void>((resolve) => (finish = resolve)) });
    const { result } = renderHook(() => useSignOut(), { wrapper: wrapperAt("/mandali/nellore") });

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current();
    });

    expect(currentPath).toBe("/");
    await act(async () => {
      finish();
      await pending;
    });
  });
});
