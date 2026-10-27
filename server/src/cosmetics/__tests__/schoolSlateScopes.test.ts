import { describe, expect, it } from "vitest";
import {
  SCHOOL_SLATE_ID,
  SCHOOL_SLATE_SCOPES,
  getRegistryCosmetic,
  resolveEffectiveLoadout,
  sanitizeCosmeticId,
  sanitizeEquippedLoadout,
} from "@shared/cosmetics.js";
import { NOSTALGIA_PACK, packEquipTargets } from "@shared/referrals.js";

describe("School Slate scopes", () => {
  it("is a table theme offered for the six games that draw it, and for no others", () => {
    const def = getRegistryCosmetic(SCHOOL_SLATE_ID);
    expect(def?.category).toBe("TABLE_THEME");
    expect([...(def?.supportedScopes ?? [])].sort()).toEqual(["bingo", "brainvita", "ludo", "rummy", "stargame", "sudoku"]);
  });

  it.each(SCHOOL_SLATE_SCOPES)("accepts the slate in the %s slot", (scope) => {
    expect(sanitizeCosmeticId(SCHOOL_SLATE_ID, "TABLE_THEME", scope)).toBe(SCHOOL_SLATE_ID);
  });

  it.each(["uno", "snl"] as const)("refuses the slate in the %s slot, which has no slate to draw", (scope) => {
    expect(sanitizeCosmeticId(SCHOOL_SLATE_ID, "TABLE_THEME", scope)).toBeUndefined();
  });

  it("resolves a slate equipped for one game only in that game's slot", () => {
    const resolved = resolveEffectiveLoadout({ tableThemes: { sudoku: SCHOOL_SLATE_ID } });
    expect(resolved.tableThemes.sudoku).toBe(SCHOOL_SLATE_ID);
    for (const scope of ["rummy", "ludo", "brainvita", "bingo", "stargame"] as const) {
      expect(resolved.tableThemes[scope]).not.toBe(SCHOOL_SLATE_ID);
    }
  });

  it("heals a slate written into a slot that cannot draw it", () => {
    const resolved = resolveEffectiveLoadout({ tableThemes: { uno: SCHOOL_SLATE_ID, snl: SCHOOL_SLATE_ID } });
    expect(resolved.tableThemes.uno).not.toBe(SCHOOL_SLATE_ID);
    expect(resolved.tableThemes.snl).not.toBe(SCHOOL_SLATE_ID);
    expect(sanitizeEquippedLoadout({ tableThemes: { uno: SCHOOL_SLATE_ID } }).tableThemes.uno).toBeUndefined();
  });

  it("gives every new game a default dice and token slot so resolved loadouts stay complete", () => {
    const resolved = resolveEffectiveLoadout();
    for (const scope of ["brainvita", "bingo", "stargame", "sudoku"] as const) {
      expect(resolved.diceSkins[scope]).toBe(resolved.diceSkins.uno);
      expect(resolved.tokenSkins[scope]).toBe(resolved.tokenSkins.uno);
    }
  });
});

describe("Equipping the Nostalgia Pack", () => {
  it("equips the slate once per game, and the aura and the title once each", () => {
    const targets = packEquipTargets();
    const slate = targets.filter((target) => target.id === SCHOOL_SLATE_ID);
    expect(slate.map((target) => target.scope)).toEqual([...SCHOOL_SLATE_SCOPES]);
    expect(targets).toHaveLength(SCHOOL_SLATE_SCOPES.length + NOSTALGIA_PACK.length - 1);
    expect(targets.filter((target) => target.id === "aura_nostalgia_gold")).toHaveLength(1);
    expect(targets.filter((target) => target.id === "title_gang_leader")).toHaveLength(1);
  });

  it("only ever asks for a slot the item is valid in", () => {
    for (const target of packEquipTargets()) {
      expect(sanitizeCosmeticId(target.id, target.category, target.scope)).toBe(target.id);
    }
  });
});
