import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BHALYAM_COSMETIC_REGISTRY,
  isPriceWithinRarityBand,
  type CosmeticCatalogItem,
} from "@shared/cosmetics.js";
import { InMemoryCosmeticsRepository } from "../InMemoryCosmeticsRepository.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

/**
 * The Ludo collectible token set lives in four places that must never drift:
 * the closed-set registry, the dev seed, the production migration, and its
 * rollback. CosmeticsService refuses to boot when a database row has no registry
 * entry or a price outside its rarity band, so a drift here is an outage, not a
 * cosmetic bug.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const MIGRATION = readFileSync(join(repoRoot, "supabase/migrations/20261102000000_ludo_collectible_tokens.sql"), "utf8");
const ROLLBACK = readFileSync(join(repoRoot, "supabase/rollbacks/20261102000000_ludo_collectible_tokens.sql"), "utf8");

interface MigrationRow {
  id: string;
  name: string;
  price: number;
  rarity: string;
  unlock: string;
  order: number;
}

const SQL_STRING = "'((?:[^']|'')*)'";
const ROW = new RegExp(
  `\\(${SQL_STRING}, 'TOKEN_SKIN', ${SQL_STRING}, ${SQL_STRING}, (\\d+), ${SQL_STRING}, ${SQL_STRING}, (\\d+)\\)`,
  "g",
);

function migrationRows(): MigrationRow[] {
  return [...MIGRATION.matchAll(ROW)].map((m) => ({
    id: m[1],
    name: m[2].replace(/''/g, "'"),
    price: Number(m[4]),
    rarity: m[5],
    unlock: m[6],
    order: Number(m[7]),
  }));
}

async function seedTokens(): Promise<Map<string, CosmeticCatalogItem>> {
  const repo = new InMemoryCosmeticsRepository(new InMemoryEconomyRepository());
  const catalog = await repo.getCatalog();
  return new Map(catalog.map((c) => [c.id, c]));
}

describe("Ludo collectible tokens — registry, seed, migration and rollback agree", () => {
  const rows = migrationRows();

  it("the migration adds exactly sixteen distinct tokens", () => {
    expect(rows).toHaveLength(16);
    expect(new Set(rows.map((r) => r.id)).size).toBe(16);
  });

  it("every migration row is a known Ludo token in the registry", () => {
    for (const r of rows) {
      const def = BHALYAM_COSMETIC_REGISTRY.find((d) => d.id === r.id);
      expect(def, r.id).toBeDefined();
      expect(def?.category).toBe("TOKEN_SKIN");
      expect(def?.supportedScopes).toEqual(["ludo"]);
      expect(def?.isDefault).toBe(false);
    }
  });

  it("the dev seed carries the same name, price, rarity and order as the migration", async () => {
    const seed = await seedTokens();
    for (const r of rows) {
      const s = seed.get(r.id);
      expect(s, r.id).toBeDefined();
      expect({ name: s?.name, price: s?.priceCoins, rarity: s?.rarity, unlock: s?.unlockMethod, order: s?.displayOrder }).toEqual({
        name: r.name,
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

  it("gives every token its own place in the shop", () => {
    expect(new Set(rows.map((r) => r.order)).size).toBe(rows.length);
  });

  it("the rollback deactivates the same sixteen and deletes nothing", () => {
    const ids = [...ROLLBACK.matchAll(/'(token_[a-z_0-9]+)'/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual(rows.map((r) => r.id).sort());
    expect(ROLLBACK).toMatch(/set is_active = false/);
    expect(ROLLBACK).not.toMatch(/\bdelete\b/i);
  });

  it("uses no third-party brand in a name a player sees", () => {
    for (const r of rows) expect(r.name, r.id).not.toMatch(/nokia|3310|ludo king|mattel|uno\b/i);
  });
});
