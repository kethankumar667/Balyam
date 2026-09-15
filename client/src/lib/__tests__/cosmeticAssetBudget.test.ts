import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Enforces the card-back asset performance budget documented in
 * docs/cosmetics/ASSET_PIPELINE.md. Closes the "asset performance budgets
 * exist" Foundation exit-gate gap tracked in
 * docs/cosmetics/ACCEPTANCE_CRITERIA.md — until now the budget was
 * informal (nothing failed a build or a test if a new card-back PNG
 * shipped 10x oversized).
 *
 * 500KB is not an aspirational target — it's the real current max
 * (RUMMY5.png, ~430KB) plus headroom, so this test passes on every asset
 * already shipped and only fails on a genuine future regression.
 */
const MAX_CARD_BACK_BYTES = 500 * 1024;

const clientRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function pngSizes(dir: string): { file: string; bytes: number }[] {
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .map((name) => ({ file: name, bytes: statSync(join(dir, name)).size }));
}

describe("cosmetics card-back asset budget", () => {
  it("keeps every Rummy card-back PNG within the documented size budget", () => {
    const dir = join(clientRoot, "public", "rummy-card-backs");
    const oversized = pngSizes(dir).filter((f) => f.bytes > MAX_CARD_BACK_BYTES);
    expect(oversized).toEqual([]);
  });

  it("keeps every UNO card-back PNG within the documented size budget", () => {
    const dir = join(clientRoot, "public", "uno-card-backs");
    const oversized = pngSizes(dir).filter((f) => f.bytes > MAX_CARD_BACK_BYTES);
    expect(oversized).toEqual([]);
  });
});
