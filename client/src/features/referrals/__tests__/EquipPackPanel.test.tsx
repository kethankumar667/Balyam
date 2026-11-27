import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { capabilitiesFor } from "@shared/permissions";
import { packEquipTargets, type ReferralOverview } from "@shared/referrals";
import { EquipPackPanel } from "../crew/EquipPackPanel";

const mocks = vi.hoisted(() => ({
  fetchCosmetics: vi.fn(),
  equipItem: vi.fn(),
  cosmeticError: null as string | null,
}));
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

const LOCKED: ReferralOverview["pack"] = { granted: false, qualifiedFriends: 0, target: 3 };
const EARNED: ReferralOverview["pack"] = { granted: true, qualifiedFriends: 3, target: 3 };

function show(pack = LOCKED) {
  return render(<EquipPackPanel pack={pack} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cosmeticError = null;
  mocks.fetchCosmetics.mockResolvedValue(undefined);
  mocks.equipItem.mockResolvedValue(true);
  useAuthStore.setState({ userId: "super-admin", capabilities: capabilitiesFor("super_admin") });
});
afterEach(cleanup);

describe("Wearing the Nostalgia Pack on the Crew Quest page", () => {
  it("lets a Super Admin equip all three items with zero qualifying referrals, without claiming they were earned", async () => {
    show();
    expect(screen.getByText(/Admin Pass gives access to all three items.*not earned ownership/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Equip earned pack" })).not.toBeInTheDocument();
    expect(mocks.equipItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Equip pack · Admin Pass" }));
    await screen.findByText(/Pack equipped/);
    expect(mocks.fetchCosmetics).toHaveBeenCalledOnce();
    expect(mocks.equipItem.mock.calls).toEqual(packEquipTargets().map(item => [item.category, item.scope, item.id]));
  });

  it("preserves the existing Admin Pass for ordinary admins too", () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("admin") });
    show();
    expect(screen.getByRole("button", { name: "Equip pack · Admin Pass" })).toBeEnabled();
  });

  it("offers nothing to an unearned member or a guest", () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("member") });
    const member = show();
    expect(member.container).toBeEmptyDOMElement();
    cleanup();
    useAuthStore.setState({ userId: null, capabilities: capabilitiesFor("guest") });
    const guest = show();
    expect(guest.container).toBeEmptyDOMElement();
    expect(mocks.equipItem).not.toHaveBeenCalled();
  });

  it("keeps the earned-pack action for a member whose pack is unlocked, with no Admin Pass wording", async () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("member") });
    show(EARNED);
    expect(screen.queryByText(/Admin Pass/)).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Equip pack · Admin Pass" }));
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
