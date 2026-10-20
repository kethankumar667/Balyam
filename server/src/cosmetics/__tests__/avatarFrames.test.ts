import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BHALYAM_COSMETIC_REGISTRY,
  isPriceWithinRarityBand,
  sanitizePublicPresentation,
  type CosmeticCatalogItem,
} from "@shared/cosmetics.js";
import { InMemoryCosmeticsRepository } from "../InMemoryCosmeticsRepository.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

/**
 * The twenty avatar frames live in four places that must never drift: the closed-set registry, the dev
 * seed, the production migration and its rollback (the drawing of each is held to the registry by a client
 * test). CosmeticsService refuses to boot when a database row has no registry entry or a price outside its
 * rarity band, so drift here is an outage, not a cosmetic bug.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const MIGRATION = readFileSync(join(repoRoot, "supabase/migrations/20261103000000_avatar_frames.sql"), "utf8");
const ROLLBACK = readFileSync(join(repoRoot, "supabase/rollbacks/20261103000000_avatar_frames.sql"), "utf8");

interface MigrationRow {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: string;
  unlock: string;
  order: number;
}

const SQL_STRING = "'((?:[^']|'')*)'";
const ROW = new RegExp(
  `\\(${SQL_STRING}, 'AVATAR_AURA', ${SQL_STRING}, ${SQL_STRING}, (\\d+), ${SQL_STRING}, ${SQL_STRING}, (\\d+)\\)`,
  "g",
);

function migrationRows(): MigrationRow[] {
  return [...MIGRATION.matchAll(ROW)].map((m) => ({
    id: m[1],
    name: m[2].replace(/''/g, "'"),
    description: m[3].replace(/''/g, "'"),
    price: Number(m[4]),
    rarity: m[5],
    unlock: m[6],
    order: Number(m[7]),
  }));
}

async function seedCatalog(): Promise<Map<string, CosmeticCatalogItem>> {
  const repo = new InMemoryCosmeticsRepository(new InMemoryEconomyRepository());
  const catalog = await repo.getCatalog();
  return new Map(catalog.map((c) => [c.id, c]));
}

describe("Avatar frames — registry, seed, migration and rollback agree", () => {
  const rows = migrationRows();

  it("the migration adds exactly twenty distinct frames", () => {
    expect(rows).toHaveLength(20);
    expect(new Set(rows.map((r) => r.id)).size).toBe(20);
  });

  it("every migration row is a purchasable, non-default global aura in the registry", () => {
    for (const r of rows) {
      const def = BHALYAM_COSMETIC_REGISTRY.find((d) => d.id === r.id);
      expect(def, r.id).toBeDefined();
      expect(def?.category).toBe("AVATAR_AURA");
      expect(def?.supportedScopes).toEqual(["GLOBAL"]);
      expect(def?.isDefault).toBe(false);
      expect(r.unlock).toBe("COIN_PURCHASE");
    }
  });

  it("the registry holds no frame the migration does not sell", () => {
    const registered = BHALYAM_COSMETIC_REGISTRY.filter((d) => d.id.startsWith("frame_")).map((d) => d.id);
    expect(registered.sort()).toEqual(rows.map((r) => r.id).sort());
  });

  it("the dev seed carries the same name, price, rarity and order as the migration, and has them on sale", async () => {
    const seed = await seedCatalog();
    for (const r of rows) {
      const s = seed.get(r.id);
      expect(s, r.id).toBeDefined();
      expect(s?.isActive).toBe(true);
      expect({ name: s?.name, description: s?.description, price: s?.priceCoins, rarity: s?.rarity, unlock: s?.unlockMethod, order: s?.displayOrder }).toEqual({
        name: r.name,
        description: r.description,
        price: r.price,
        rarity: r.rarity,
        unlock: r.unlock,
        order: r.order,
      });
    }
  });

  it("every price sits inside its rarity band, or the server would refuse to boot", () => {
    for (const r of rows) {
      expect(
        isPriceWithinRarityBand({ priceCoins: r.price, rarity: r.rarity as never, unlockMethod: r.unlock as never }),
        `${r.id} at ${r.price} ${r.rarity}`,
      ).toBe(true);
    }
  });

  it("spreads the shelf across every rarity and gives each frame its own place", () => {
    expect(new Set(rows.map((r) => r.rarity))).toEqual(new Set(["COMMON", "RARE", "EPIC", "LEGENDARY"]));
    expect(new Set(rows.map((r) => r.order)).size).toBe(rows.length);
  });

  it("the rollback deactivates the same twenty and deletes nothing", () => {
    const ids = [...ROLLBACK.matchAll(/'(frame_[a-z_0-9]+)'/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual(rows.map((r) => r.id).sort());
    expect(ROLLBACK).toMatch(/set is_active = false/);
    expect(ROLLBACK).not.toMatch(/\bdelete\b/i);
  });

  it("a frame can be worn at a table: it survives the same closed-set check a seat's loadout goes through", () => {
    for (const r of rows) expect(sanitizePublicPresentation({ avatarAura: r.id }).avatarAura, r.id).toBe(r.id);
    expect(sanitizePublicPresentation({ avatarAura: "frame_not_a_real_one" }).avatarAura).toBeUndefined();
  });

  it("uses no third-party brand in a name a player sees", () => {
    for (const r of rows) expect(`${r.name} ${r.description}`, r.id).not.toMatch(/nokia|ludo king|mattel|uno\b|ipl\b|bcci/i);
  });
});
