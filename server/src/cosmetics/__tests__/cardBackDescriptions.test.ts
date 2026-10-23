import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { InMemoryCosmeticsRepository } from "../InMemoryCosmeticsRepository.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const filename = "20261105000000_card_back_descriptions.sql";
const original = readFileSync(join(root, "supabase", "migrations", "20260923000000_cosmetics_card_back_expansion.sql"), "utf8");
const expected: Record<string, string> = {
  cardback_retro_blocks_uno: "Tilted color blocks on a cream field with a geometric rosette.",
  cardback_brush_strokes_uno: "Diagonal four-color stripes on a cream field with a geometric rosette.",
  cardback_hazard_stripes_uno: "Diagonal amber stripes on a dark field with a geometric rosette.",
  cardback_confetti_shapes_uno: "Colorful circles, squares and triangles on a dark field with a geometric rosette.",
  cardback_pigment_blast_uno: "Four-color geometric rays radiating from a central rosette.",
  cardback_rainbow_swirl_uno: "Overlapping four-color elliptical rings on a dark field with a geometric rosette.",
  cardback_action_pack_uno: "Tilted neon color blocks on a dark field with a geometric rosette.",
  cardback_prism_shatter_uno: "Overlapping four-color triangles on a dark field with a geometric rosette.",
  cardback_emerald_leaf_uno: "Emerald petal shapes around a geometric rosette on a deep green field.",
  cardback_deep_blue_vortex_uno: "Overlapping blue elliptical rings around a geometric rosette on navy.",
  cardback_crimson_vortex_uno: "Overlapping crimson elliptical rings around a geometric rosette on dark red.",
  cardback_splash_burst_uno: "Neon geometric rays radiating from a central rosette on a dark field.",
  cardback_golden_eclipse_uno: "Overlapping gold elliptical rings around a geometric rosette on a dark field.",
  cardback_neon_vortex_uno: "Overlapping neon elliptical rings around a geometric rosette on a dark field.",
  cardback_gilded_swirl_uno: "Overlapping gold elliptical rings around a geometric rosette on deep brown.",
  cardback_neon_streak_uno: "Curved neon light trails across a dark field with a geometric rosette.",
};

describe("Color Cards back descriptions", () => {
  it("describes the actual procedural motifs without changing the original commercial fields", async () => {
    const repo = new InMemoryCosmeticsRepository(new InMemoryEconomyRepository());
    const catalog = await repo.getCatalog();
    const backs = catalog.filter((item) => Object.hasOwn(expected, item.id));
    expect(backs).toHaveLength(16);
    for (const item of backs) {
      expect(item.description, item.id).toBe(expected[item.id]);
      expect(item.description).not.toMatch(/\b(uno|logo|skip|reverse|wild)\b/i);
      const old = original.split("\n").find((line) => line.includes(`('${item.id}',`));
      expect(old, item.id).toContain(`'${item.name}'`);
      expect(old, item.id).toContain(`, ${item.priceCoins}, '${item.rarity}', '${item.unlockMethod}', ${item.displayOrder})`);
      expect(item.category).toBe("CARD_BACK");
      expect(item.isActive).toBe(true);
    }
  });

  it.each(["migrations", "rollbacks"])("ships a guarded description-only %s file for exactly these sixteen ids", (folder) => {
    const path = join(root, "supabase", folder, filename);
    expect(existsSync(path), path).toBe(true);
    const sql = readFileSync(path, "utf8").replace(/--.*$/gm, "");
    const rows = [...sql.matchAll(/\('(cardback_[a-z_]+_uno)', '([^']*)', '([^']*)'\)/g)];
    expect(rows).toHaveLength(16);
    expect(rows.map((row) => row[1]).sort()).toEqual(Object.keys(expected).sort());
    for (const row of rows) {
      expect(row[3], row[1]).toBe(expected[row[1]]);
      expect(original, row[1]).toContain(`'${row[2]}'`);
    }
    expect(sql).toMatch(/update public\.cosmetic_catalog/);
    expect(sql).toMatch(/where c\.id = copy\.id/);
    expect(sql.match(/\bset\s+[a-z_]+\s*=/gi)).toEqual([expect.stringMatching(/\bset description =/i)]);
    expect(sql).not.toMatch(/\b(insert|delete|truncate|alter|drop)\b/i);
    expect(sql).not.toMatch(/\b(user_cosmetics|user_equipped_cosmetics|wallets|coin_ledger)\b/i);
    expect(sql).toContain(folder === "migrations" ? "c.description in (copy.old_description, replace(copy.old_description, 'UNO', 'card'))" : "c.description = copy.new_description");
  });
});
