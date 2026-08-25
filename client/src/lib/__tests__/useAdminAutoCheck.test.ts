import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdminAutoCheck } from "../useAdminAutoCheck";
import { useAuthStore } from "../../store/authStore";
import { checkOperationalAccess } from "../operationalApi";

vi.mock("../operationalApi", () => ({
  checkOperationalAccess: vi.fn(),
}));

describe("useAdminAutoCheck", () => {
  beforeEach(() => {
    vi.mocked(checkOperationalAccess).mockReset();
    useAuthStore.setState({
      userId: null,
      isMember: false,
      isAdmin: false,
      isSuperAdmin: false,
      email: null,
    });
  });

  it("does nothing for a guest (not a member)", () => {
    renderHook(() => useAdminAutoCheck());
    expect(checkOperationalAccess).not.toHaveBeenCalled();
  });

  it("regression: grants admin access as soon as a signed-in member's account turns out to be on the allowlist — without requiring a visit to /admin first", async () => {
    vi.mocked(checkOperationalAccess).mockResolvedValue({
      kind: "admin-user",
      userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
      email: "kethankumargontla@gmail.com",
    });
    useAuthStore.setState({ userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9", isMember: true, isAdmin: false });

    renderHook(() => useAdminAutoCheck());

    await waitFor(() => {
      expect(useAuthStore.getState().isSuperAdmin).toBe(true);
    });
    expect(useAuthStore.getState().email).toBe("kethankumargontla@gmail.com");
  });

  it("does not grant anything for an ordinary member who isn't on the allowlist", async () => {
    vi.mocked(checkOperationalAccess).mockResolvedValue(null);
    useAuthStore.setState({ userId: "some-other-user", isMember: true, isAdmin: false });

    renderHook(() => useAdminAutoCheck());

    await waitFor(() => {
      expect(checkOperationalAccess).toHaveBeenCalled();
    });
    expect(useAuthStore.getState().isSuperAdmin).toBe(false);
  });

  it("does not re-check once the account is already known to be admin", () => {
    useAuthStore.setState({ userId: "u1", isMember: true, isAdmin: true });
    renderHook(() => useAdminAutoCheck());
    expect(checkOperationalAccess).not.toHaveBeenCalled();
  });

  it("only checks once per userId, not on every re-render", async () => {
    vi.mocked(checkOperationalAccess).mockResolvedValue(null);
    useAuthStore.setState({ userId: "u1", isMember: true, isAdmin: false });

    const { rerender } = renderHook(() => useAdminAutoCheck());
    await waitFor(() => expect(checkOperationalAccess).toHaveBeenCalledTimes(1));

    rerender();
    rerender();
    expect(checkOperationalAccess).toHaveBeenCalledTimes(1);
  });
});
