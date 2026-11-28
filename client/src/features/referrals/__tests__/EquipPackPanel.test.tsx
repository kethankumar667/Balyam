import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { EquippedCosmeticsLoadout } from "@shared/cosmetics";
import { capabilitiesFor } from "@shared/permissions";
import { isPackEquipped, packEquipTargets, type ReferralOverview } from "@shared/referrals";
import { EquipPackPanel } from "../crew/EquipPackPanel";

const mocks = vi.hoisted(() => ({
  fetchCosmetics: vi.fn(),
  equipItem: vi.fn(),
}));
vi.mock("../../../store/cosmeticsStore", async () => {
  const { create } = await import("zustand");
  const empty = { tableThemes: {}, diceSkins: {}, tokenSkins: {}, cardBacks: {} };
  return {
    useCosmeticsStore: create(() => ({
      equipped: empty as EquippedCosmeticsLoadout,
      errorMessage: null as string | null,
      fetchCosmetics: mocks.fetchCosmetics,
      equipItem: mocks.equipItem,
    })),
  };
});
vi.mock("../../../store/authStore", async () => {
  const { create } = await import("zustand");
  const { capabilitiesFor } = await import("@shared/permissions");
  return { useAuthStore: create(() => ({ userId: "super-admin" as string | null, capabilities: capabilitiesFor("super_admin") })) };
});
import { useAuthStore } from "../../../store/authStore";
import { useCosmeticsStore } from "../../../store/cosmeticsStore";

const LOCKED: ReferralOverview["pack"] = { granted: false, qualifiedFriends: 0, target: 3 };
const EARNED: ReferralOverview["pack"] = { granted: true, qualifiedFriends: 3, target: 3 };
const EMPTY_LOADOUT: EquippedCosmeticsLoadout = { tableThemes: {}, diceSkins: {}, tokenSkins: {}, cardBacks: {} };

/** What the server's loadout looks like once every pack slot is worn. */
function fullLoadout(): EquippedCosmeticsLoadout {
  const loadout: EquippedCosmeticsLoadout = { tableThemes: {}, diceSkins: {}, tokenSkins: {}, cardBacks: {} };
  for (const item of packEquipTargets()) {
    if (item.category === "AVATAR_AURA") loadout.avatarAura = item.id;
    else if (item.category === "PODIUM_TITLE") loadout.podiumTitle = item.id;
    else loadout.tableThemes[item.scope] = item.id;
  }
  return loadout;
}

/** An equip that succeeds and is reflected in the loadout, the way the real store updates after the server agrees. */
function equipAndRemember(category: string, scope: string, id: string): Promise<boolean> {
  const current = useCosmeticsStore.getState().equipped;
  const next: EquippedCosmeticsLoadout = { ...current, tableThemes: { ...current.tableThemes } };
  if (category === "AVATAR_AURA") next.avatarAura = id;
  else if (category === "PODIUM_TITLE") next.podiumTitle = id;
  else next.tableThemes[scope as keyof typeof next.tableThemes] = id;
  useCosmeticsStore.setState({ equipped: next });
  return Promise.resolve(true);
}

function show(pack = LOCKED) {
  return render(<EquipPackPanel pack={pack} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchCosmetics.mockResolvedValue(undefined);
  mocks.equipItem.mockImplementation(equipAndRemember);
  useCosmeticsStore.setState({ equipped: EMPTY_LOADOUT, errorMessage: null });
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
    await screen.findByText(/Pack equipped\. School Slate/);
    expect(mocks.equipItem.mock.calls).toEqual(packEquipTargets().map(item => [item.category, item.scope, item.id]));
  });

  it("preserves the existing Admin Pass for ordinary admins too", () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("admin") });
    show();
    expect(screen.getByRole("button", { name: "Equip pack · Admin Pass" })).toBeEnabled();
  });

  it("offers nothing to an unearned member or a guest, and does not even load their cosmetics", () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("member") });
    const member = show();
    expect(member.container).toBeEmptyDOMElement();
    cleanup();
    useAuthStore.setState({ userId: null, capabilities: capabilitiesFor("guest") });
    const guest = show();
    expect(guest.container).toBeEmptyDOMElement();
    expect(mocks.equipItem).not.toHaveBeenCalled();
    expect(mocks.fetchCosmetics).not.toHaveBeenCalled();
  });

  it("keeps the earned-pack action for a member whose pack is unlocked, with no Admin Pass wording", async () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("member") });
    show(EARNED);
    expect(screen.queryByText(/Admin Pass/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Equip earned pack" }));
    await screen.findByText(/Pack equipped\. School Slate/);
    expect(mocks.equipItem).toHaveBeenCalledTimes(packEquipTargets().length);
  });

  it("surfaces a server refusal and stops without claiming the whole pack is equipped", async () => {
    mocks.equipItem.mockImplementationOnce(equipAndRemember).mockImplementationOnce(() => Promise.resolve(false));
    useCosmeticsStore.setState({ errorMessage: "Failed to equip cosmetic item." });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Equip pack · Admin Pass" }));
    await screen.findByText("Failed to equip cosmetic item.");
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

describe("Once the pack is worn", () => {
  it("turns the button into a disabled 'Pack equipped' status right after equipping, and it cannot be pressed again", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Equip pack · Admin Pass" }));
    const done = await screen.findByRole("button", { name: "Pack equipped" });
    expect(done).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Equip pack/ })).not.toBeInTheDocument();
    const calls = mocks.equipItem.mock.calls.length;
    fireEvent.click(done);
    expect(mocks.equipItem).toHaveBeenCalledTimes(calls);
  });

  it("shows it as equipped on arrival when the saved loadout already holds the whole pack (for an earned member too)", async () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("member") });
    useCosmeticsStore.setState({ equipped: fullLoadout() });
    show(EARNED);
    expect(screen.getByRole("button", { name: "Pack equipped" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/School Slate appears in Rummy/);
    expect(screen.queryByRole("button", { name: /Equip earned pack/ })).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.fetchCosmetics).toHaveBeenCalled());
    expect(mocks.equipItem).not.toHaveBeenCalled();
  });

  it("brings the button back when one slot of the pack is changed afterwards", () => {
    useCosmeticsStore.setState({ equipped: fullLoadout() });
    show();
    expect(screen.getByRole("button", { name: "Pack equipped" })).toBeDisabled();
    act(() => useCosmeticsStore.setState({ equipped: { ...fullLoadout(), avatarAura: "some_other_aura" } }));
    expect(screen.getByRole("button", { name: "Equip pack · Admin Pass" })).toBeEnabled();
  });

  it("does not call a part-worn pack equipped", () => {
    const partial = fullLoadout();
    delete partial.podiumTitle;
    useCosmeticsStore.setState({ equipped: partial });
    show();
    expect(screen.getByRole("button", { name: "Equip pack · Admin Pass" })).toBeEnabled();
  });
});

describe("isPackEquipped", () => {
  it("needs the aura, the title and the slate in every one of its games", () => {
    expect(isPackEquipped(EMPTY_LOADOUT)).toBe(false);
    expect(isPackEquipped(fullLoadout())).toBe(true);
    const missingGame = fullLoadout();
    const [firstScope] = Object.keys(missingGame.tableThemes);
    delete missingGame.tableThemes[firstScope as keyof typeof missingGame.tableThemes];
    expect(isPackEquipped(missingGame)).toBe(false);
  });
});
