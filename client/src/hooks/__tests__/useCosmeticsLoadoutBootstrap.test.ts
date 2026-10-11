import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const fetchCosmetics = vi.fn(async () => {});
const peekPlayerCredential = vi.fn();
const authState = { ready: true, userId: null as string | null };

vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));
vi.mock("../../store/cosmeticsStore", () => ({
  useCosmeticsStore: { getState: () => ({ fetchCosmetics }) },
}));
vi.mock("../../lib/playerIdentity", () => ({
  peekPlayerCredential: () => peekPlayerCredential(),
}));

import { useCosmeticsLoadoutBootstrap } from "../useCosmeticsLoadoutBootstrap";

/**
 * A page view must never create a guest, so the startup load is only allowed to run for someone
 * who already has an identity, and only once the session has settled.
 */
describe("useCosmeticsLoadoutBootstrap", () => {
  beforeEach(() => {
    fetchCosmetics.mockClear();
    peekPlayerCredential.mockReset();
    authState.ready = true;
    authState.userId = null;
  });

  it("loads the equipped cosmetics for someone who already has an identity", () => {
    peekPlayerCredential.mockReturnValue({ playerId: "guest_1", token: "t", kind: "guest" });
    renderHook(() => useCosmeticsLoadoutBootstrap());
    expect(fetchCosmetics).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a visitor with no identity, so a drive-by creates no guest", () => {
    peekPlayerCredential.mockReturnValue(null);
    renderHook(() => useCosmeticsLoadoutBootstrap());
    expect(fetchCosmetics).not.toHaveBeenCalled();
  });

  it("waits until the session is known", () => {
    peekPlayerCredential.mockReturnValue({ playerId: "guest_1", token: "t", kind: "guest" });
    authState.ready = false;
    renderHook(() => useCosmeticsLoadoutBootstrap());
    expect(fetchCosmetics).not.toHaveBeenCalled();
  });
});
