import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEffectiveLoadout, type CosmeticsStateResponsePayload, type EquippedCosmeticsLoadout } from "@shared/cosmetics";
import type { RoomPublicState } from "@shared/types";

const emit = vi.fn();
const apiJson = vi.fn();

vi.mock("../../lib/socket", () => ({ getSocket: () => ({ emit }) }));
vi.mock("../../lib/playerIdentity", () => ({ apiFetch: vi.fn(), apiJson: (...args: unknown[]) => apiJson(...args) }));
vi.mock("../../hooks/useEconomy", () => ({ refreshCurrentWallet: vi.fn() }));

import { useCosmeticsStore } from "../cosmeticsStore";
import { useRoomStore } from "../roomStore";

const FIREBALL = "token_fireball_ludo";

const nothingEquipped: EquippedCosmeticsLoadout = { tableThemes: {}, diceSkins: {}, tokenSkins: {}, cardBacks: {} };
const equippedWithFireball: EquippedCosmeticsLoadout = { ...nothingEquipped, tokenSkins: { ludo: FIREBALL } };

function loadoutResponse(equipped: EquippedCosmeticsLoadout): CosmeticsStateResponsePayload {
  return { catalog: [], ownedIds: [], equipped, resolved: resolveEffectiveLoadout(equipped) } as CosmeticsStateResponsePayload;
}

function putInRoom(game: RoomPublicState["game"]) {
  useRoomStore.setState({ roomState: { game, code: "ABC123" } as RoomPublicState });
}

beforeEach(() => {
  emit.mockReset();
  apiJson.mockReset();
  useRoomStore.setState({ roomState: null });
  useCosmeticsStore.setState({
    equipped: nothingEquipped,
    resolved: resolveEffectiveLoadout(nothingEquipped),
    selectedCategory: "DICE_SKIN",
    selectedScope: "GLOBAL",
    isOpen: false,
  });
});

describe("loading a saved loadout while in a room", () => {
  it("tells the room about the equipped token once it has loaded", async () => {
    apiJson.mockResolvedValue(loadoutResponse(equippedWithFireball));
    putInRoom("ludo");

    await useCosmeticsStore.getState().fetchCosmetics();

    expect(emit).toHaveBeenCalledWith("room:setCosmetics", expect.objectContaining({ tokenSkin: FIREBALL }));
  });

  it("does not talk to a room when the player is not in one", async () => {
    apiJson.mockResolvedValue(loadoutResponse(equippedWithFireball));

    await useCosmeticsStore.getState().fetchCosmetics();

    expect(emit).not.toHaveBeenCalled();
  });

  it("does not announce anything if the load failed", async () => {
    apiJson.mockRejectedValue(new Error("offline"));
    putInRoom("ludo");

    await useCosmeticsStore.getState().fetchCosmetics();

    expect(emit).not.toHaveBeenCalled();
    expect(useCosmeticsStore.getState().errorMessage).toMatch(/failed to load/i);
  });

  it("keeps the loaded loadout in the store for the next room created or joined", async () => {
    apiJson.mockResolvedValue(loadoutResponse(equippedWithFireball));

    await useCosmeticsStore.getState().fetchCosmetics();

    expect(useCosmeticsStore.getState().resolved.tokenSkins.ludo).toBe(FIREBALL);
  });
});

describe("opening the shop", () => {
  beforeEach(() => apiJson.mockResolvedValue(loadoutResponse(equippedWithFireball)));

  it("lands on the Ludo slot when the Tokens tab was the last one viewed, so tokens are listed", () => {
    useCosmeticsStore.setState({ selectedCategory: "TOKEN_SKIN", selectedScope: "ludo" });

    useCosmeticsStore.getState().openStore();

    expect(useCosmeticsStore.getState().selectedCategory).toBe("TOKEN_SKIN");
    expect(useCosmeticsStore.getState().selectedScope).toBe("ludo");
  });

  it("opens straight onto the Ludo slot when asked for tokens", () => {
    useCosmeticsStore.getState().openStore("TOKEN_SKIN");

    expect(useCosmeticsStore.getState().selectedScope).toBe("ludo");
  });

  it("opens card backs on the Rummy slot and dice on the global slot", () => {
    useCosmeticsStore.getState().openStore("CARD_BACK");
    expect(useCosmeticsStore.getState().selectedScope).toBe("rummy");

    useCosmeticsStore.getState().openStore("DICE_SKIN");
    expect(useCosmeticsStore.getState().selectedScope).toBe("GLOBAL");
  });

  it("honours a scope the caller chose", () => {
    useCosmeticsStore.getState().openStore("CARD_BACK", "uno");

    expect(useCosmeticsStore.getState().selectedScope).toBe("uno");
  });
});
