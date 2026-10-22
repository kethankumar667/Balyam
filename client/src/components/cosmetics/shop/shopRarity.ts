/**
 * BHALYAM — Cosmetics shop: rarity as the page's colour.
 *
 * A shop in a games app reads as one because rarity is loud. Here each rarity owns a flat colour that tints the
 * showroom band, outlines the stage plate, fills the pedestal and underlines the selected thumbnail. It is applied
 * as a CSS variable (`--shop-rar`, space-separated RGB channels) so Tailwind can mix it with alpha in either theme:
 * `bg-[rgb(var(--shop-rar)/0.10)]`.
 *
 * Rarity is never the only signal: every place that uses the colour also carries the rarity's name in text.
 */

import type { CSSProperties } from "react";
import type { CosmeticRarity } from "@shared/cosmetics";

export interface ShopRarity {
  readonly label: string;
  /** Space-separated RGB channels, for `rgb(var(--shop-rar) / <alpha>)`. */
  readonly rgb: string;
  /** Ink for text sitting on a SOLID fill of `rgb` (white fails on the gold, so gold gets dark ink). */
  readonly onSolid: string;
}

export const SHOP_RARITY: Record<CosmeticRarity, ShopRarity> = {
  // Warm bronze rather than slate: Common is the most-seen band, and slate over the cream page read as a muddy grey.
  COMMON: { label: "Common", rgb: "128 98 52", onSolid: "#FFFFFF" },
  RARE: { label: "Rare", rgb: "37 99 210", onSolid: "#FFFFFF" },
  EPIC: { label: "Epic", rgb: "124 58 209", onSolid: "#FFFFFF" },
  LEGENDARY: { label: "Legendary", rgb: "217 150 18", onSolid: "#1C1409" },
};

/** An unrecognised rarity falls back to Common rather than throwing, as the old token layer did. */
export function shopRarityOf(rarity: CosmeticRarity | undefined): ShopRarity {
  return SHOP_RARITY[rarity ?? "COMMON"] ?? SHOP_RARITY.COMMON;
}

/** Sets `--shop-rar` on an element; everything inside it can then use the rarity colour. */
export function rarityVars(rarity: CosmeticRarity | undefined): CSSProperties {
  return { ["--shop-rar" as string]: shopRarityOf(rarity).rgb } as CSSProperties;
}
