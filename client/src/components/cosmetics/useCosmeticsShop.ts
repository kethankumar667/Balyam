/**
 * BHALYAM — Cosmetics shop state, shared by the desktop and mobile layouts.
 *
 * Everything the old modal computed and did lives here: the slot's item list, the preview selection, what is
 * owned and equipped, and the four actions (unlock, refund, equip, reset) with their sound and haptics, which
 * fire only on a confirmed success — a refused purchase must not sound like a reward.
 *
 * A layout takes this and draws it. It owns no rules of its own.
 */

import { useMemo, useState } from "react";
import type { CosmeticCatalogItem } from "@shared/cosmetics";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { useAuthStore } from "../../store/authStore";
import { useWallet } from "../../hooks/useEconomy";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { type PreviewMode, getDefaultPreviewMode, isValidModeForCategory } from "./previewModes";
import { isEquippedInSlot, itemsForSlot } from "./shopLogic";

export function useCosmeticsShop() {
  const {
    catalog,
    ownedIds,
    equipped,
    selectedCategory,
    selectedScope,
    selectedItemId,
    isLoading,
    isSubmitting,
    errorMessage,
    selectCategory,
    selectScope,
    selectItem,
    purchaseItem,
    refundItem,
    equipItem,
    unequipItem,
  } = useCosmeticsStore();

  const { balance } = useWallet();
  const walletBalance = balance ?? "0";
  const { isAdmin, isSuperAdmin } = useAuthStore();
  const isAdminUser = isAdmin || isSuperAdmin;

  // Derived in render, not synced in an effect: switching to a category the stored mode does not suit must
  // never paint one frame of the wrong mode.
  const [storedMode, setPreviewMode] = useState<PreviewMode>("INSPECT");
  const previewMode = isValidModeForCategory(storedMode, selectedCategory)
    ? storedMode
    : getDefaultPreviewMode(selectedCategory);

  const categoryItems = useMemo(
    () => itemsForSlot(catalog, selectedCategory, selectedScope),
    [catalog, selectedCategory, selectedScope],
  );

  // No selection (or one from another slot) previews the slot's first style.
  const previewItem = useMemo(() => {
    if (selectedItemId) {
      const found = categoryItems.find((item) => item.id === selectedItemId);
      if (found) return found;
    }
    return categoryItems[0] ?? null;
  }, [categoryItems, selectedItemId]);

  const isOwned = (item: CosmeticCatalogItem): boolean =>
    isAdminUser || ownedIds.has(item.id) || item.unlockMethod === "DEFAULT";
  const isEquipped = (item: CosmeticCatalogItem): boolean =>
    isEquippedInSlot(equipped, selectedCategory, selectedScope, item.id);

  const isPreviewEquipped = previewItem ? isEquipped(previewItem) : false;
  const isPreviewOwned = previewItem ? isOwned(previewItem) : false;

  const purchase = async (item: CosmeticCatalogItem): Promise<void> => {
    HapticsManager.trigger("subtle");
    const result = await purchaseItem(item.id);
    if (result.success || result.code === "PURCHASED") {
      AudioManager.play(AUDIO.REWARD_COIN);
      HapticsManager.trigger("reward");
    }
  };

  const refund = async (item: CosmeticCatalogItem): Promise<void> => {
    HapticsManager.trigger("subtle");
    const result = await refundItem(item.id);
    if (result.success && result.code === "REFUNDED") {
      AudioManager.play(AUDIO.UI_CLICK);
      HapticsManager.trigger("subtle");
    }
  };

  const equip = async (item: CosmeticCatalogItem): Promise<void> => {
    HapticsManager.trigger("subtle");
    const success = await equipItem(selectedCategory, selectedScope, item.id);
    if (success) {
      AudioManager.play(AUDIO.UI_CLICK);
      HapticsManager.trigger("subtle");
    }
  };

  const unequip = async (): Promise<void> => {
    HapticsManager.trigger("subtle");
    const success = await unequipItem(selectedCategory, selectedScope);
    if (success) {
      AudioManager.play(AUDIO.UI_CLICK);
      HapticsManager.trigger("subtle");
    }
  };

  return {
    // data
    catalog,
    ownedIds,
    equipped,
    walletBalance,
    isAdminUser,
    // what is on screen
    selectedCategory,
    selectedScope,
    selectedItemId,
    categoryItems,
    previewItem,
    previewMode,
    isPreviewEquipped,
    isPreviewOwned,
    // status
    isLoading,
    isSubmitting,
    errorMessage,
    // per-item reads for the grid
    isOwned,
    isEquipped,
    // actions
    selectCategory,
    selectScope,
    selectItem,
    setPreviewMode,
    purchase,
    refund,
    equip,
    unequip,
  };
}

export type CosmeticsShop = ReturnType<typeof useCosmeticsShop>;

export function stepShopSelection(
  shop: Pick<CosmeticsShop, "previewItem" | "categoryItems" | "selectItem">,
  direction: -1 | 1,
): void {
  const { previewItem: item, categoryItems: items } = shop;
  if (!item || items.length < 2) return;
  const index = items.findIndex((candidate) => candidate.id === item.id);
  shop.selectItem(items[(index + direction + items.length) % items.length].id);
}
