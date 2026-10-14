import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const peekPlayerCredential = vi.fn();
vi.mock("../../lib/playerIdentity", () => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
  peekPlayerCredential: () => peekPlayerCredential(),
}));
vi.mock("../../hooks/useEconomy", () => ({ refreshCurrentWallet: vi.fn() }));

import { useAuthStore } from "../../store/authStore";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { useCosmeticsBootstrap } from "../useCosmeticsBootstrap";

/**
 * Equipped cosmetics are kept on the server. Until something asked for them the browser had only the
 * defaults, so a room created right after a page load announced the default pawn and the player's
 * chosen token never showed. Loading them is a read, so it needs someone who already exists: a first
 * visit has nothing saved and must not cost a request or a guest identity.
 */

const fetchCosmetics = vi.fn(async () => {});
const guest = { playerId: "guest-1", token: "t", kind: "guest" as const };

beforeEach(() => {
  fetchCosmetics.mockClear();
  peekPlayerCredential.mockReset();
  useCosmeticsStore.setState({ fetchCosmetics });
  useAuthStore.setState({ ready: true, userId: null });
});

describe("useCosmeticsBootstrap", () => {
  it("loads the saved loadout for someone who already has an identity", () => {
    peekPlayerCredential.mockReturnValue(guest);

    renderHook(() => useCosmeticsBootstrap());

    expect(fetchCosmetics).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a first-time visitor, who has nothing saved", () => {
    peekPlayerCredential.mockReturnValue(null);

    renderHook(() => useCosmeticsBootstrap());

    expect(fetchCosmetics).not.toHaveBeenCalled();
  });

  it("waits until the session is known before asking", () => {
    peekPlayerCredential.mockReturnValue(guest);
    useAuthStore.setState({ ready: false });

    renderHook(() => useCosmeticsBootstrap());
    expect(fetchCosmetics).not.toHaveBeenCalled();

    act(() => useAuthStore.setState({ ready: true }));
    expect(fetchCosmetics).toHaveBeenCalledTimes(1);
  });

  it("loads again when the player signs in, because the saved loadout is the account's", () => {
    peekPlayerCredential.mockReturnValue(guest);
    renderHook(() => useCosmeticsBootstrap());
    fetchCosmetics.mockClear();

    peekPlayerCredential.mockReturnValue({ playerId: "user-9", token: "jwt", kind: "member" });
    act(() => useAuthStore.setState({ userId: "user-9" }));

    expect(fetchCosmetics).toHaveBeenCalledTimes(1);
  });

  it("does not load again on an unrelated re-render", () => {
    peekPlayerCredential.mockReturnValue(guest);
    const { rerender } = renderHook(() => useCosmeticsBootstrap());

    rerender();
    rerender();

    expect(fetchCosmetics).toHaveBeenCalledTimes(1);
  });
});
