import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach } from "vitest";
import {
  AVATAR_FRAME_CATALOG,
  AVATAR_FRAME_DEFAULT_ID,
  CARROM_COIN_SET_CATALOG,
  CARROM_COIN_SET_DEFAULT_ID,
} from "@shared/cosmeticsFramesAndCoins.js";
import {
  BHALYAM_COSMETIC_REGISTRY,
  isPriceWithinRarityBand,
  resolveEffectiveLoadout,
  sanitizeEquippedLoadout,
  sanitizePublicPresentation,
  type CosmeticCategory,
} from "@shared/cosmetics.js";
import { CosmeticsService } from "../CosmeticsService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";

/**
 * Avatar frames and Carrom coin sets are three things that must agree: the shared table, the
 * closed-set registry that gates every id on the wire, and the SQL migration that seeds the
 * durable catalog. These tests are what stop them drifting, because a price that differs between
 * the in-memory seed and the migration would charge players two different amounts depending on
 * which backend the server happened to boot with.
 */

const MIGRATION_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../supabase/migrations/20261027000000_cosmetics_avatar_frames_carrom_coins.sql",
);

const SHELVES: ReadonlyArray<{
  label: string;
  category: CosmeticCategory;
  entries: typeof AVATAR_FRAME_CATALOG;
  defaultId: string;
  scope: "GLOBAL" | "carrom";
}> = [
  { label: "avatar frames", category: "AVATAR_FRAME", entries: AVATAR_FRAME_CATALOG, defaultId: AVATAR_FRAME_DEFAULT_ID, scope: "GLOBAL" },
  { label: "carrom coin sets", category: "CARROM_COIN_SET", entries: CARROM_COIN_SET_CATALOG, defaultId: CARROM_COIN_SET_DEFAULT_ID, scope: "carrom" },
];

describe.each(SHELVES)("$label shelf", ({ category, entries, defaultId, scope }) => {
  it("has fifteen items for sale plus one free default, all with distinct ids and names", () => {
    expect(entries).toHaveLength(16);
    expect(entries.filter((entry) => entry.priceCoins > 0)).toHaveLength(15);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(16);
    expect(new Set(entries.map((entry) => entry.name)).size).toBe(16);
    expect(entries[0].id).toBe(defaultId);
  });

  it("prices every item inside its rarity band", () => {
    for (const entry of entries) {
      expect(
        isPriceWithinRarityBand({ ...entry, unlockMethod: entry.priceCoins === 0 ? "DEFAULT" : "COIN_PURCHASE" }),
        `${entry.id} at ${entry.priceCoins} is outside its ${entry.rarity} band`,
      ).toBe(true);
    }
  });

  it("registers every item under the right category and scope, with exactly one default", () => {
    const registered = BHALYAM_COSMETIC_REGISTRY.filter((def) => def.category === category);
    expect(registered.map((def) => def.id).sort()).toEqual(entries.map((entry) => entry.id).sort());
    expect(registered.every((def) => def.supportedScopes.length === 1 && def.supportedScopes[0] === scope)).toBe(true);
    expect(registered.filter((def) => def.isDefault).map((def) => def.id)).toEqual([defaultId]);
  });

  it("is mirrored row for row, with the same price and rarity, in the SQL migration", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    for (const entry of entries) {
      const unlock = entry.priceCoins === 0 ? "DEFAULT" : "COIN_PURCHASE";
      expect(sql, `${entry.id} is missing or different in the migration`).toContain(
        `('${entry.id}', '${category}', '${entry.name.replace(/'/g, "''")}', '${entry.description.replace(/'/g, "''")}', ${entry.priceCoins}, '${entry.rarity}', '${unlock}', ${entry.displayOrder})`,
      );
    }
  });
});

describe("the migration widens both category constraints", () => {
  it("lists the two new categories on the catalog and the equipped table", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toContain("cosmetic_catalog_category_check");
    expect(sql).toContain("user_equipped_cosmetics_category_check");
    expect(sql.match(/'AVATAR_FRAME', 'CARROM_COIN_SET'/g)).toHaveLength(2);
  });
});

describe("loadout handling", () => {
  it("resolves to the free defaults when nothing is equipped", () => {
    const resolved = resolveEffectiveLoadout({});
    expect(resolved.avatarFrame).toBe(AVATAR_FRAME_DEFAULT_ID);
    expect(resolved.carromCoinSet).toBe(CARROM_COIN_SET_DEFAULT_ID);
  });

  it("keeps a valid frame and coin set, and drops an id in the wrong slot or from nowhere", () => {
    const loadout = sanitizeEquippedLoadout({
      avatarFrame: "frame_royal_crown",
      carromCoinSet: "carromcoin_celestial",
    });
    expect(loadout.avatarFrame).toBe("frame_royal_crown");
    expect(loadout.carromCoinSet).toBe("carromcoin_celestial");

    const swapped = sanitizeEquippedLoadout({
      avatarFrame: "carromcoin_celestial",
      carromCoinSet: "frame_royal_crown",
    });
    expect(swapped.avatarFrame).toBeUndefined();
    expect(swapped.carromCoinSet).toBeUndefined();

    expect(sanitizeEquippedLoadout({ avatarFrame: "../../etc/passwd" }).avatarFrame).toBeUndefined();
  });

  it("broadcasts a frame to the table but never a coin set", () => {
    const publicPresentation = sanitizePublicPresentation({
      avatarFrame: "frame_aurora_flow",
      carromCoinSet: "carromcoin_celestial",
    });
    expect(publicPresentation.avatarFrame).toBe("frame_aurora_flow");
    expect(publicPresentation).not.toHaveProperty("carromCoinSet");
  });
});

describe("buying and equipping through the service", () => {
  const USER_ID = "frames_and_coins_player";
  let economyService: EconomyService;
  let cosmeticsService: CosmeticsService;

  beforeEach(async () => {
    const economyRepo = new InMemoryEconomyRepository();
    economyService = new EconomyService(economyRepo);
    cosmeticsService = new CosmeticsService({ economyRepository: economyRepo, postgrestConfig: null });
    await economyService.ensureIdentityRegistered(USER_ID, "member");
  });

  it("passes the boot-time catalog integrity check with the new rows", async () => {
    await expect(cosmeticsService.assertCatalogIntegrity()).resolves.toBeUndefined();
  });

  it("lists all thirty-two items in the shop", async () => {
    const catalog = await cosmeticsService.getCatalog();
    expect(catalog.filter((item) => item.category === "AVATAR_FRAME")).toHaveLength(16);
    expect(catalog.filter((item) => item.category === "CARROM_COIN_SET")).toHaveLength(16);
  });

  it("charges the listed price for a frame, then lets the owner equip it and shows it resolved", async () => {
    const before = BigInt((await economyService.getWallet(USER_ID)).balance);
    const purchase = await cosmeticsService.purchaseCosmetic(USER_ID, "frame_rose_gold", "frame-key-1");
    expect(purchase.applied).toBe(true);
    expect(BigInt(purchase.walletBalance!)).toBe(before - 1800n);

    await cosmeticsService.equipCosmetic(USER_ID, "AVATAR_FRAME", "GLOBAL", "frame_rose_gold", false);
    const state = await cosmeticsService.getState(USER_ID);
    expect(state.equipped.avatarFrame).toBe("frame_rose_gold");
    expect(state.resolved.avatarFrame).toBe("frame_rose_gold");
  });

  it("lets an owner equip a coin set for Carrom, and refuses it in any other scope", async () => {
    await cosmeticsService.purchaseCosmetic(USER_ID, "carromcoin_sand_slate", "coin-key-1");
    await cosmeticsService.equipCosmetic(USER_ID, "CARROM_COIN_SET", "carrom", "carromcoin_sand_slate", false);
    expect((await cosmeticsService.getState(USER_ID)).resolved.carromCoinSet).toBe("carromcoin_sand_slate");

    await expect(
      cosmeticsService.equipCosmetic(USER_ID, "CARROM_COIN_SET", "ludo", "carromcoin_sand_slate", false),
    ).rejects.toThrow();
  });

  it("refuses to equip a frame the player has not bought", async () => {
    await expect(
      cosmeticsService.equipCosmetic(USER_ID, "AVATAR_FRAME", "GLOBAL", "frame_ember_dragon", false),
    ).rejects.toThrow();
  });

  it("returns to the default when a frame is unequipped", async () => {
    await cosmeticsService.purchaseCosmetic(USER_ID, "frame_saffron_edge", "frame-key-2");
    await cosmeticsService.equipCosmetic(USER_ID, "AVATAR_FRAME", "GLOBAL", "frame_saffron_edge", false);
    await cosmeticsService.unequipCosmetic(USER_ID, "AVATAR_FRAME", "GLOBAL");
    expect((await cosmeticsService.getState(USER_ID)).resolved.avatarFrame).toBe(AVATAR_FRAME_DEFAULT_ID);
  });
});
