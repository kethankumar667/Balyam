import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { capabilitiesFor } from "@shared/permissions";
import { packEquipTargets, type ReferralProgress } from "@shared/referrals";
import { ReferralQuest } from "../ReferralQuest";

const mocks = vi.hoisted(() => ({
  progress: { inviteCode: "00000000-0000-4000-8000-000000000001", qualifiedFriends: 0, pendingFriends: 0, target: 3, rewardGranted: false } as ReferralProgress | null,
  loading: false, error: null as string | null, notice: null, retry: vi.fn(),
  fetchCosmetics: vi.fn(), equipItem: vi.fn(), cosmeticError: null as string | null,
}));
vi.mock("../../../hooks/useReferralProgress", () => ({ useReferralProgress: () => mocks }));
vi.mock("../../../store/cosmeticsStore", () => ({
  useCosmeticsStore: { getState: () => ({
    fetchCosmetics: mocks.fetchCosmetics, equipItem: mocks.equipItem, errorMessage: mocks.cosmeticError,
  }) },
}));
vi.mock("../../../store/authStore", async () => {
  const { create } = await import("zustand");
  const { capabilitiesFor } = await import("@shared/permissions");
  return { useAuthStore: create(() => ({ userId: "super-admin" as string | null, capabilities: capabilitiesFor("super_admin") })) };
});
import { useAuthStore } from "../../../store/authStore";

function show(isMember = true) {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ReferralQuest isMember={isMember} /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.progress = { inviteCode: "00000000-0000-4000-8000-000000000001", qualifiedFriends: 0, pendingFriends: 0, target: 3, rewardGranted: false };
  mocks.loading = false;
  mocks.error = null;
  mocks.cosmeticError = null;
  mocks.fetchCosmetics.mockResolvedValue(undefined);
  mocks.equipItem.mockResolvedValue(true);
  useAuthStore.setState({ userId: "super-admin", capabilities: capabilitiesFor("super_admin") });
});
afterEach(cleanup);

describe("Nostalgia Pack Admin Pass", () => {
  it("lets a Super Admin equip all three items with zero qualifying referrals, without claiming they were earned", async () => {
    show();
    expect(screen.getByText("0 / 3 friends qualified")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Equip earned pack" })).not.toBeInTheDocument();
    expect(mocks.equipItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Equip pack · Admin Pass" }));
    await screen.findByText(/Pack equipped/);
    expect(mocks.fetchCosmetics).toHaveBeenCalledOnce();
    expect(mocks.equipItem.mock.calls).toEqual(packEquipTargets().map(item => [item.category, item.scope, item.id]));
    expect(mocks.progress?.rewardGranted).toBe(false);
    expect(mocks.retry).not.toHaveBeenCalled();
  });

  it.each(["loading", "unavailable"] as const)("does not depend on referral service progress being %s", async state => {
    mocks.progress = null;
    mocks.loading = state === "loading";
    mocks.error = state === "unavailable" ? "Invitations are temporarily unavailable." : null;
    show();
    fireEvent.click(screen.getByRole("button", { name: "Equip pack · Admin Pass" }));
    await screen.findByText(/Pack equipped/);
    expect(mocks.equipItem).toHaveBeenCalledTimes(packEquipTargets().length);
  });

  it("preserves the existing Admin Pass for ordinary admins too", () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("admin") });
    show();
    expect(screen.getByRole("button", { name: "Equip pack · Admin Pass" })).toBeEnabled();
  });

  it("does not give an unearned member or guest the pack", () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("member") });
    show();
    expect(screen.queryByRole("button", { name: /Equip.*pack/ })).not.toBeInTheDocument();
    cleanup();
    useAuthStore.setState({ userId: null, capabilities: capabilitiesFor("guest") });
    show(false);
    expect(screen.queryByRole("button", { name: /Equip.*pack/ })).not.toBeInTheDocument();
    expect(mocks.equipItem).not.toHaveBeenCalled();
  });

  it("keeps the earned-pack action for qualifying members", async () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("member") });
    mocks.progress = { ...mocks.progress!, qualifiedFriends: 3, rewardGranted: true };
    show();
    fireEvent.click(screen.getByRole("button", { name: "Equip earned pack" }));
    await screen.findByText(/Pack equipped/);
    expect(mocks.equipItem).toHaveBeenCalledTimes(packEquipTargets().length);
  });

  it("surfaces a server refusal and stops without claiming the whole pack is equipped", async () => {
    mocks.equipItem.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mocks.cosmeticError = "Failed to equip cosmetic item.";
    show();
    fireEvent.click(screen.getByRole("button", { name: "Equip pack · Admin Pass" }));
    await screen.findByText(mocks.cosmeticError);
    expect(mocks.equipItem).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Pack equipped/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Equip pack · Admin Pass" })).toBeEnabled();
  });

  it("disables repeated submits and stops the remaining equips after switching accounts", async () => {
    let finish: (value: boolean) => void = () => { throw new Error("Equip did not start"); };
    mocks.equipItem.mockImplementationOnce(() => new Promise<boolean>(resolve => { finish = resolve; }));
    show();
    const button = screen.getByRole("button", { name: "Equip pack · Admin Pass" });
    fireEvent.click(button);
    await waitFor(() => expect(mocks.equipItem).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Equipping..." })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Equipping..." }));
    act(() => useAuthStore.setState({ userId: "another-member", capabilities: capabilitiesFor("member") }));
    await act(async () => { finish(true); });
    expect(mocks.equipItem).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Pack equipped/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Equip.*pack/ })).not.toBeInTheDocument();
  });
});
