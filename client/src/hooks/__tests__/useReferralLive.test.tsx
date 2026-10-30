import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { REFERRAL_LIVE_EVENT } from "@shared/referrals";
import { useReferralLive } from "../useReferralLive";
import { useReferralLiveStore } from "../../store/referralLiveStore";

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  on: vi.fn(),
  off: vi.fn(),
  show: vi.fn(),
  refreshWallet: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    on: (event: string, handler: (payload: unknown) => void) => { mocks.handlers.set(event, handler); mocks.on(event); },
    off: (event: string) => { mocks.handlers.delete(event); mocks.off(event); },
  }),
}));
vi.mock("../../lib/toastStore", () => ({ toastStore: { show: (...args: unknown[]) => mocks.show(...args) } }));
vi.mock("../useEconomy", () => ({ refreshCurrentWallet: () => mocks.refreshWallet() }));
vi.mock("react-router-dom", async importOriginal => ({
  ...await importOriginal<typeof import("react-router-dom")>(),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../../store/authStore", async () => {
  const { create } = await import("zustand");
  return { useAuthStore: create(() => ({ isMember: true, userId: "member-a" as string | null })) };
});
import { useAuthStore } from "../../store/authStore";

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
const send = (payload: unknown) => act(() => { mocks.handlers.get(REFERRAL_LIVE_EVENT)?.(payload); });
const AT = 1_800_000_000_000;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers.clear();
  mocks.refreshWallet.mockResolvedValue(undefined);
  useAuthStore.setState({ isMember: true, userId: "member-a" });
  useReferralLiveStore.setState({ version: 0 });
});
afterEach(cleanup);

describe("useReferralLive", () => {
  it("listens for referral notices while a member is signed in, and stops when they leave", () => {
    const { unmount } = renderHook(() => useReferralLive(), { wrapper });
    expect(mocks.handlers.has(REFERRAL_LIVE_EVENT)).toBe(true);
    unmount();
    expect(mocks.off).toHaveBeenCalledWith(REFERRAL_LIVE_EVENT);
  });

  it("does not listen for a guest", () => {
    useAuthStore.setState({ isMember: false, userId: null });
    renderHook(() => useReferralLive(), { wrapper });
    expect(mocks.on).not.toHaveBeenCalled();
  });

  it("shows a toast when a friend joins, with a way to the Referrals page", () => {
    renderHook(() => useReferralLive(), { wrapper });
    send({ kind: "friend_joined", friendName: "Meera", at: AT });
    expect(mocks.show).toHaveBeenCalledOnce();
    const [message, type, , options] = mocks.show.mock.calls[0]!;
    expect(message).toBe("Meera joined with your code.");
    expect(type).toBe("info");
    expect(options.key).toBe(`referral:friend_joined:${AT}`);
    options.action.onClick();
    expect(mocks.navigate).toHaveBeenCalledWith("/referrals");
  });

  it("tells the Referrals page to re-read, so it updates without a refresh", () => {
    renderHook(() => useReferralLive(), { wrapper });
    send({ kind: "friend_played", friendName: "Meera", coins: 2000, at: AT });
    expect(useReferralLiveStore.getState().version).toBe(1);
  });

  it("reloads the wallet when coins land, and only then", () => {
    renderHook(() => useReferralLive(), { wrapper });
    send({ kind: "friend_joined", friendName: "Meera", at: AT });
    send({ kind: "bonus_on_the_way", friendName: "Sunita", coins: 2000, at: AT + 1 });
    expect(mocks.refreshWallet).not.toHaveBeenCalled();
    send({ kind: "bonus_landed", friendName: "Meera", coins: 2000, at: AT + 2 });
    expect(mocks.refreshWallet).toHaveBeenCalledOnce();
  });

  it("gives a landed-coins notice no link, since the wallet already shows it", () => {
    renderHook(() => useReferralLive(), { wrapper });
    send({ kind: "bonus_landed", friendName: "Meera", coins: 2000, at: AT });
    expect(mocks.show.mock.calls[0]![3].action).toBeUndefined();
  });

  it.each(["/room/ABC123", "/watch/ABC123", "/tv/ABC123"])(
    "still tells the player at a table (%s), but with no link that would walk them out of their match",
    (path) => {
      const atATable = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
      renderHook(() => useReferralLive(), { wrapper: atATable });
      send({ kind: "friend_joined", friendName: "Meera", at: AT });
      expect(mocks.show).toHaveBeenCalledOnce();
      expect(mocks.show.mock.calls[0]![0]).toBe("Meera joined with your code.");
      expect(mocks.show.mock.calls[0]![3].action).toBeUndefined();
    },
  );

  it("offers the link again on an ordinary page", () => {
    const home = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={["/games"]}>{children}</MemoryRouter>;
    renderHook(() => useReferralLive(), { wrapper: home });
    send({ kind: "friend_joined", friendName: "Meera", at: AT });
    expect(mocks.show.mock.calls[0]![3].action).toBeDefined();
  });

  it("ignores a malformed payload: no toast, no refresh, no wallet reload", () => {
    renderHook(() => useReferralLive(), { wrapper });
    send({ kind: "free_coins", friendName: "Meera" });
    send(null);
    send({ kind: "bonus_landed", friendName: "Meera", coins: -5, at: AT });
    expect(mocks.show).not.toHaveBeenCalled();
    expect(mocks.refreshWallet).not.toHaveBeenCalled();
    expect(useReferralLiveStore.getState().version).toBe(0);
  });
});
