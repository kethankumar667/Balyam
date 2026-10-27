/**
 * Test helper: a `CosmeticsShop` (the shop hook's return value) built by hand, so the layouts can be driven through
 * every state — affordable, too expensive, owned, equipped, loading, empty — without the store or the network.
 */

import { vi } from "vitest";
import type { CosmeticCatalogItem } from "@shared/cosmetics";
import type { CosmeticsShop } from "../../useCosmeticsShop";

/** Real registry ids, because the slot filter and the thumbnails look them up there. */
export function frame(over: Partial<CosmeticCatalogItem> = {}): CosmeticCatalogItem {
  return {
    id: "frame_bubble_float",
    category: "AVATAR_AURA",
    name: "Bubble Float",
    description: "Soap bubbles of every size drifting round your avatar.",
    priceCoins: 600,
    rarity: "COMMON",
    unlockMethod: "COIN_PURCHASE",
    isActive: true,
    displayOrder: 1,
    ...over,
  };
}

export const DEFAULT_FRAME = frame({
  id: "aura_none",
  name: "No Aura",
  description: "Standard clean avatar border.",
  priceCoins: 0,
  unlockMethod: "DEFAULT",
  displayOrder: 0,
});

export const BLAZE_RING = frame({
  id: "frame_blaze_ring",
  name: "Blaze Ring",
  description: "A ring of flame.",
  priceCoins: 3200,
  rarity: "EPIC",
  displayOrder: 2,
});

/** A slot with nothing in it. */
export function makeEmptyShop(over: FakeShopOptions = {}): CosmeticsShop {
  return makeShop({ categoryItems: [], previewItem: null, ...over });
}

export type FakeShopOptions =Partial<CosmeticsShop> & {
  /** Convenience: ids the shopper owns / wears. */
  ownedIds?: Set<string>;
  wearing?: string | null;
};

export function makeShop(over: FakeShopOptions = {}): CosmeticsShop {
  const items = over.categoryItems ?? [DEFAULT_FRAME, frame(), BLAZE_RING];
  const previewItem = over.previewItem === undefined ? items[1] ?? null : over.previewItem;
  const ownedIds = over.ownedIds ?? new Set<string>();
  const wearing = over.wearing ?? null;
  const isOwned = (item: CosmeticCatalogItem) => ownedIds.has(item.id) || item.unlockMethod === "DEFAULT";
  const isEquipped = (item: CosmeticCatalogItem) => (wearing === null ? false : item.id === wearing);

  const base: CosmeticsShop = {
    catalog: items,
    ownedIds,
    equipped: { tableThemes: {}, diceSkins: {}, tokenSkins: {}, cardBacks: {}, avatarAura: wearing ?? undefined },
    walletBalance: "2000",
    walletStatus: "loaded",
    walletError: null,
    retryWallet: vi.fn(async () => {}),
    retryCatalog: vi.fn(async () => {}),
    isAdminUser: false,
    selectedCategory: "AVATAR_AURA",
    selectedScope: "GLOBAL",
    selectedItemId: previewItem?.id ?? null,
    categoryItems: items,
    previewItem,
    previewMode: "PROFILE",
    isPreviewEquipped: previewItem ? isEquipped(previewItem) : false,
    isPreviewOwned: previewItem ? isOwned(previewItem) : false,
    isLoading: false,
    isSubmitting: false,
    errorMessage: null,
    isOwned,
    isEquipped,
    selectCategory: vi.fn(),
    selectScope: vi.fn(),
    selectItem: vi.fn(),
    setPreviewMode: vi.fn(),
    purchase: vi.fn(async () => {}),
    refund: vi.fn(async () => {}),
    equip: vi.fn(async () => {}),
    unequip: vi.fn(async () => {}),
  };
  const { ownedIds: _o, wearing: _w, ...rest } = over;
  return { ...base, ...rest };
}
