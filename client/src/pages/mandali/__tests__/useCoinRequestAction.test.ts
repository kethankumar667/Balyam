import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MandaliChannel, MandaliMember } from "@shared/mandali/types.js";

const store = vi.hoisted(() => ({
  createCoinRequest: vi.fn(),
  fetchCoinRequestCooldown: vi.fn(async () => undefined),
  coinRequestCooldownEndsAt: null as number | null,
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../../../store/mandaliStore", () => ({
  useMandaliStore: (selector: (s: typeof store) => unknown) => selector(store),
}));
vi.mock("../../../hooks/useToast", () => ({ toast: toastMock }));

import { useCoinRequestAction } from "../useCoinRequestAction";

const member = (playerId: string, role: string, joinedAt = 1): MandaliMember =>
  ({
    memberId: playerId, mandaliId: "m1", playerId, displayName: `Name ${playerId}`, avatar: "a1",
    role, state: "ACTIVE", joinedAt, presence: "online", contributionScore: 0,
  }) as MandaliMember;

const channels = [{ channelId: "c1", type: "TEXT", name: "lounge-chat" }] as MandaliChannel[];
const members = [member("me", "MEMBER"), member("owner", "OWNER")];

const setup = () =>
  renderHook(() =>
    useCoinRequestAction({ mandaliId: "m1", playerId: "me", members, channels, activeChannelId: "c1" })
  );

describe("useCoinRequestAction", () => {
  beforeEach(() => {
    store.createCoinRequest.mockReset();
    store.fetchCoinRequestCooldown.mockClear();
    store.coinRequestCooldownEndsAt = null;
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it("checks the cooldown with the server when it first loads", () => {
    setup();

    expect(store.fetchCoinRequestCooldown).toHaveBeenCalled();
  });

  it("sends the request instantly when eligible — no dialog", async () => {
    store.createCoinRequest.mockResolvedValue({ success: true });
    const { result } = setup();

    await act(async () => {
      await result.current.requestCoins();
    });

    expect(store.createCoinRequest).toHaveBeenCalledWith("m1", "c1", "owner", 100);
    expect(result.current.showCooldown).toBe(false);
    // Anyone can pay, so the confirmation speaks to the group rather than naming one person.
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("Asked the group"));
  });

  it("sends nothing and shows the countdown dialog while cooling down", async () => {
    store.coinRequestCooldownEndsAt = Date.now() + 3 * 60 * 60 * 1000;
    const { result } = setup();

    await act(async () => {
      await result.current.requestCoins();
    });

    expect(store.createCoinRequest).not.toHaveBeenCalled();
    expect(result.current.showCooldown).toBe(true);
    expect(result.current.isCoolingDown).toBe(true);
  });

  it("shows the dialog when the server says it is too soon, even if this device thought it was eligible", async () => {
    store.createCoinRequest.mockResolvedValue({ success: false, retryAfterMs: 9_000_000, error: "wait" });
    const { result } = setup();

    await act(async () => {
      await result.current.requestCoins();
    });

    expect(result.current.showCooldown).toBe(true);
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("shows other failures as a message, not as the cooldown dialog", async () => {
    store.createCoinRequest.mockResolvedValue({ success: false, error: "Not an active member" });
    const { result } = setup();

    await act(async () => {
      await result.current.requestCoins();
    });

    expect(result.current.showCooldown).toBe(false);
    expect(toastMock.error).toHaveBeenCalledWith("Not an active member");
  });

  it("does not send twice when tapped twice quickly", async () => {
    let finish: (v: unknown) => void = () => undefined;
    store.createCoinRequest.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = setup();

    await act(async () => {
      void result.current.requestCoins();
      void result.current.requestCoins();
    });
    await act(async () => {
      finish({ success: true });
    });

    expect(store.createCoinRequest).toHaveBeenCalledTimes(1);
  });

  it("explains when there is nobody to ask", async () => {
    const { result } = renderHook(() =>
      useCoinRequestAction({ mandaliId: "m1", playerId: "me", members: [member("me", "OWNER")], channels, activeChannelId: "c1" })
    );

    await act(async () => {
      await result.current.requestCoins();
    });

    expect(store.createCoinRequest).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it("falls back to the first text channel when none is active", async () => {
    store.createCoinRequest.mockResolvedValue({ success: true });
    const { result } = renderHook(() =>
      useCoinRequestAction({ mandaliId: "m1", playerId: "me", members, channels, activeChannelId: null })
    );

    await act(async () => {
      await result.current.requestCoins();
    });

    expect(store.createCoinRequest).toHaveBeenCalledWith("m1", "c1", "owner", 100);
  });

  it("can be closed", async () => {
    store.coinRequestCooldownEndsAt = Date.now() + 60_000;
    const { result } = setup();
    await act(async () => {
      await result.current.requestCoins();
    });

    act(() => result.current.closeCooldown());

    expect(result.current.showCooldown).toBe(false);
  });
});
