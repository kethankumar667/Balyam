/**
 * BHALYAM — Cosmetics shop: pure logic shared by every shop layout.
 *
 * The shop used to live inside a modal whose desktop body and mobile sheet each carried their own copy of
 * these rules (which tabs exist, which items a slot lists, what "equipped" means). They are here once so a
 * layout is only layout, and so they can be tested without rendering anything.
 */

import type { ComponentType } from "react";
import { CircleDot, Dice5, Layers, Orbit } from "lucide-react";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
  getRegistryCosmetic,
} from "@shared/cosmetics";

/**
 * Tables and Titles are not sold (2026-09-10) — their catalog rows are deactivated server-side — so they have
 * no tab: a tab with nothing purchasable behind it is worse than no tab. Avatar auras came back as Frames
 * (2026-10-20): twenty animated designs in the same AVATAR_AURA slot.
 */
export const SHOP_CATEGORY_TABS: ReadonlyArray<{
  category: CosmeticCategory;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { category: "DICE_SKIN", label: "Dice", icon: Dice5 },
  { category: "TOKEN_SKIN", label: "Tokens", icon: CircleDot },
  { category: "CARD_BACK", label: "Cards", icon: Layers },
  { category: "AVATAR_AURA", label: "Frames", icon: Orbit },
];

/** The two game variants a card back is sold for. */
export const CARD_BACK_SCOPES = ["rummy", "uno"] as const;

/**
 * What a slot lists: the category, narrowed to the game variant being browsed.
 *
 * Category alone used to be the only filter, which let a UNO-only card back appear and be equipped while the
 * RUMMY tab was active — the write went through, but Rummy's renderer only knows rummy-scoped ids and
 * silently fell back to the default look. An item with no registry match (assertCatalogIntegrity guards this
 * at boot) is left out rather than shown unfiltered.
 */
export function itemsForSlot(
  catalog: readonly CosmeticCatalogItem[],
  category: CosmeticCategory,
  scope: CosmeticGameScope,
): CosmeticCatalogItem[] {
  return catalog.filter((item) => {
    if (item.category !== category) return false;
    const def = getRegistryCosmetic(item.id);
    if (!def) return false;
    return def.supportedScopes.includes(scope) || def.supportedScopes.includes("GLOBAL");
  });
}

/**
 * What equipped-state needs from a loadout. Structural, so both the store's full loadout and the phone layout's
 * looser prop (optional groups, a nullable frame) satisfy it.
 */
export interface EquippedSlots {
  tableThemes?: Partial<Record<CosmeticGameScope, string>>;
  diceSkins?: Partial<Record<CosmeticGameScope, string>>;
  tokenSkins?: Partial<Record<CosmeticGameScope, string>>;
  cardBacks?: { uno?: string; rummy?: string };
  avatarAura?: string | null;
  podiumTitle?: string | null;
}

/** Whether `itemId` is what the player currently has equipped in this slot. */
export function isEquippedInSlot(
  equipped: EquippedSlots,
  category: CosmeticCategory,
  scope: CosmeticGameScope,
  itemId: string,
): boolean {
  switch (category) {
    case "TABLE_THEME":
      return equipped.tableThemes?.[scope] === itemId;
    case "DICE_SKIN":
      return equipped.diceSkins?.[scope] === itemId;
    case "TOKEN_SKIN":
      return equipped.tokenSkins?.[scope] === itemId;
    case "CARD_BACK":
      return equipped.cardBacks?.[scope === "uno" ? "uno" : "rummy"] === itemId;
    case "AVATAR_AURA":
      return equipped.avatarAura === itemId;
    case "PODIUM_TITLE":
      return equipped.podiumTitle === itemId;
    default:
      return false;
  }
}

/** Heading for the collection panel. */
export function categoryTitle(category: CosmeticCategory): string {
  switch (category) {
    case "TABLE_THEME":
      return "TABLE THEMES";
    case "DICE_SKIN":
      return "DICE SKINS";
    case "TOKEN_SKIN":
      return "TOKEN SKINS";
    case "CARD_BACK":
      return "CARD BACKS";
    case "AVATAR_AURA":
      return "AVATAR FRAMES";
    case "PODIUM_TITLE":
      return "PODIUM TITLES";
    default:
      return "CUSTOMIZATIONS";
  }
}

export interface ShopQuery {
  category?: CosmeticCategory;
  scope?: CosmeticGameScope;
}

/**
 * Reads a `/shop` deep link (`?category=AVATAR_AURA`, `?category=CARD_BACK&scope=uno`).
 *
 * The URL is outside input, so it is checked against closed sets and anything else is dropped silently — the
 * shop then opens on the tab the player last browsed. Only the tabs that exist are accepted, and a scope only
 * for card backs, the one category that sells per game variant.
 */
export function parseShopQuery(search: string): ShopQuery {
  const params = new URLSearchParams(search);
  const rawCategory = params.get("category");
  const category = SHOP_CATEGORY_TABS.find((tab) => tab.category === rawCategory)?.category;
  if (!category) return {};

  const rawScope = params.get("scope");
  const scope =
    category === "CARD_BACK" ? CARD_BACK_SCOPES.find((candidate) => candidate === rawScope) : undefined;
  return scope ? { category, scope } : { category };
}
