import { describe, expect, it } from "vitest";
import { resolveEffectiveLoadout, type EquippedCosmeticsLoadout } from "@shared/cosmetics";
import { getPublicPresentationLoadout } from "../publicPresentation";

/**
 * What a player tells the room about how they look. The server only accepts `tokenSkin` from the Ludo
 * slot, so a caller that does not know the game (join by code, rejoin after a refresh) used to read the
 * GLOBAL slot, which never holds a token, and quietly sent the default pawn.
 */

const DRACO = "token_draco_inferno";

function loadout(equipped: EquippedCosmeticsLoadout) {
  return resolveEffectiveLoadout(equipped);
}

const nothingEquipped: EquippedCosmeticsLoadout = { tableThemes: {}, diceSkins: {}, tokenSkins: {}, cardBacks: {} };
const withLudoToken: EquippedCosmeticsLoadout = { ...nothingEquipped, tokenSkins: { ludo: DRACO } };

describe("getPublicPresentationLoadout — token skin", () => {
  it("sends the equipped Ludo token when the caller knows the game", () => {
    expect(getPublicPresentationLoadout(loadout(withLudoToken), "ludo").tokenSkin).toBe(DRACO);
  });

  it("still sends it when the caller does not know the game (join by code, rejoin)", () => {
    expect(getPublicPresentationLoadout(loadout(withLudoToken)).tokenSkin).toBe(DRACO);
  });

  it("sends it for any other game too, because the server reads only the Ludo slot", () => {
    expect(getPublicPresentationLoadout(loadout(withLudoToken), "rummy").tokenSkin).toBe(DRACO);
  });

  it("sends the default pawn when nothing is equipped", () => {
    expect(getPublicPresentationLoadout(loadout(nothingEquipped), "ludo").tokenSkin).toBe("token_classic_pawn");
  });
});

describe("getPublicPresentationLoadout — dice skin", () => {
  const defaultDice = loadout(nothingEquipped).diceSkins.GLOBAL;

  it("uses the slot of the game being played", () => {
    const equipped: EquippedCosmeticsLoadout = { ...nothingEquipped, diceSkins: { ludo: "dice_golden_ember" } };
    expect(getPublicPresentationLoadout(loadout(equipped), "ludo").diceSkin).toBe("dice_golden_ember");
  });

  it("falls back to the global slot for a game with no slot of its own", () => {
    const equipped: EquippedCosmeticsLoadout = { ...nothingEquipped, diceSkins: { GLOBAL: "dice_golden_ember" } };
    expect(getPublicPresentationLoadout(loadout(equipped), "chess").diceSkin).toBe("dice_golden_ember");
  });

  it("when the game is unknown, finds a dice skin equipped only for Ludo", () => {
    const equipped: EquippedCosmeticsLoadout = { ...nothingEquipped, diceSkins: { ludo: "dice_golden_ember" } };
    expect(getPublicPresentationLoadout(loadout(equipped)).diceSkin).toBe("dice_golden_ember");
  });

  it("when the game is unknown and both are equipped, the global choice wins", () => {
    const equipped: EquippedCosmeticsLoadout = {
      ...nothingEquipped,
      diceSkins: { GLOBAL: "dice_wooden_teak", ludo: "dice_golden_ember" },
    };
    expect(getPublicPresentationLoadout(loadout(equipped)).diceSkin).toBe("dice_wooden_teak");
  });

  it("sends the default dice when nothing is equipped", () => {
    expect(getPublicPresentationLoadout(loadout(nothingEquipped)).diceSkin).toBe(defaultDice);
  });
});

describe("getPublicPresentationLoadout — aura, title and purity", () => {
  it("leaves out an aura and a title that are the 'none' defaults", () => {
    const out = getPublicPresentationLoadout(loadout(withLudoToken), "ludo");
    expect(out.avatarAura).toBeUndefined();
    expect(out.podiumTitle).toBeUndefined();
  });

  it("does not change the loadout it is given", () => {
    const resolved = loadout(withLudoToken);
    const before = JSON.stringify(resolved);
    getPublicPresentationLoadout(resolved, "ludo");
    getPublicPresentationLoadout(resolved);
    expect(JSON.stringify(resolved)).toBe(before);
  });
});
