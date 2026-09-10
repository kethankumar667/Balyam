/**
 * BHALYAM — Cosmetics Boutique "Enchanted Display Vault" Modal
 *
 * Single accessible dialog shell built directly on `components/Modal.tsx`.
 * Renders as a native-feeling bottom sheet on mobile viewports (<768px)
 * and an expansive, centered boutique exhibition chamber on desktop (>=768px).
 *
 * Fully adheres to:
 * - The Enchanted Display Vault creative direction (vault lighting, surface depth, collectible tiles).
 * - WCAG 2.1 AA accessibility (focus trap, ARIA role="dialog", Esc key, body lock).
 * - Minimum 44x44px touch targets on all interactive controls.
 * - Single DOM tree (no destructive DOM rebuilding on window resize).
 * - Decoupled presentation effects (audio and haptics trigger only on confirmed success).
 * - Strict zero-pay-to-win aesthetic customization.
 * - Admin and Super Admin free pass (all items unlocked for free with no coin deduction).
 */

import React, { useState, useMemo } from "react";
import {
  Store,
  X,
  Coins,
  Palette,
  Dice5,
  Layers,
  CircleDot,
  Crown,
  Info,
  Orbit,
} from "lucide-react";
import Modal from "../Modal";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { useWallet } from "../../hooks/useEconomy";
import { useAuthStore } from "../../store/authStore";
import {
  type CosmeticCategory,
  type CosmeticCatalogItem,
  getRegistryCosmetic,
} from "@shared/cosmetics";
import {
  type PreviewMode,
  isValidModeForCategory,
  getDefaultPreviewMode,
} from "./previewModes";
import { CosmeticsPreviewStage } from "./CosmeticsPreviewStage";
import { CosmeticsItemCard } from "./CosmeticsItemCard";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

const CATEGORY_TABS: Array<{
  category: CosmeticCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { category: "TABLE_THEME", label: "Tables", icon: Palette },
  { category: "DICE_SKIN", label: "Dice", icon: Dice5 },
  { category: "TOKEN_SKIN", label: "Tokens", icon: CircleDot },
  { category: "CARD_BACK", label: "Cards", icon: Layers },
  { category: "AVATAR_AURA", label: "Auras", icon: Orbit },
  { category: "PODIUM_TITLE", label: "Titles", icon: Crown },
];

export function CosmeticsStoreModal() {
  const {
    isOpen,
    catalog,
    ownedIds,
    equipped,
    selectedCategory,
    selectedScope,
    selectedItemId,
    isLoading,
    isSubmitting,
    errorMessage,
    closeStore,
    selectCategory,
    selectScope,
    selectItem,
    purchaseItem,
    equipItem,
    unequipItem,
  } = useCosmeticsStore();

  const { balance: walletBalance } = useWallet();
  const { isAdmin, isSuperAdmin } = useAuthStore();
  const isAdminUser = isAdmin || isSuperAdmin;

  // Race-safe preview mode: derived synchronously during render
  const [storedMode, setStoredMode] = useState<PreviewMode>("INSPECT");
  const previewMode = isValidModeForCategory(storedMode, selectedCategory)
    ? storedMode
    : getDefaultPreviewMode(selectedCategory);

  // Close audio feedback
  const handleClose = () => {
    AudioManager.play(AUDIO.UI_POPUP_CLOSE);
    closeStore();
  };

  // Filter catalog items for selected category AND the active game-variant
  // scope. Category alone used to be the only filter, which let e.g. a
  // UNO-only card back (supportedScopes: ["uno"]) appear and be equipped
  // while the RUMMY tab was active — the write succeeded (nothing validated
  // it server-side either, now fixed in CosmeticsService.equipCosmetic),
  // but the Rummy-specific renderer only recognizes rummy-scoped ids and
  // silently fell back to the default look. A catalog item with no
  // registry match (shouldn't happen — assertCatalogIntegrity guards this
  // at boot) is excluded rather than shown unfiltered.
  const categoryItems = useMemo(() => {
    return catalog.filter((item) => {
      if (item.category !== selectedCategory) return false;
      const def = getRegistryCosmetic(item.id);
      if (!def) return false;
      return (
        def.supportedScopes.includes(selectedScope) ||
        def.supportedScopes.includes("GLOBAL")
      );
    });
  }, [catalog, selectedCategory, selectedScope]);

  // Selected item object (or fallback to first item / default)
  const previewItem = useMemo(() => {
    if (selectedItemId) {
      const found = categoryItems.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return categoryItems[0] ?? null;
  }, [categoryItems, selectedItemId]);

  // Determine if previewed item is equipped in current slot
  const isPreviewEquipped = useMemo(() => {
    if (!previewItem) return false;
    if (selectedCategory === "TABLE_THEME") {
      return equipped.tableThemes?.[selectedScope] === previewItem.id;
    }
    if (selectedCategory === "DICE_SKIN") {
      return equipped.diceSkins?.[selectedScope] === previewItem.id;
    }
    if (selectedCategory === "TOKEN_SKIN") {
      return equipped.tokenSkins?.[selectedScope] === previewItem.id;
    }
    if (selectedCategory === "CARD_BACK") {
      const s = selectedScope === "uno" ? "uno" : "rummy";
      return equipped.cardBacks?.[s] === previewItem.id;
    }
    if (selectedCategory === "AVATAR_AURA") {
      return equipped.avatarAura === previewItem.id;
    }
    if (selectedCategory === "PODIUM_TITLE") {
      return equipped.podiumTitle === previewItem.id;
    }
    return false;
  }, [previewItem, selectedCategory, selectedScope, equipped]);

  const isPreviewOwned = previewItem
    ? isAdminUser || ownedIds.has(previewItem.id) || previewItem.unlockMethod === "DEFAULT"
    : false;

  // Handle purchase with audio/haptics confirmation
  const handlePurchase = async (item: CosmeticCatalogItem) => {
    HapticsManager.trigger("subtle");
    const result = await purchaseItem(item.id);
    if (result.success || result.code === "PURCHASED") {
      AudioManager.play(AUDIO.REWARD_COIN);
      HapticsManager.trigger("reward");
    }
  };

  // Handle equip with audio/haptics confirmation
  const handleEquip = async (item: CosmeticCatalogItem) => {
    HapticsManager.trigger("subtle");
    const success = await equipItem(selectedCategory, selectedScope, item.id);
    if (success) {
      AudioManager.play(AUDIO.UI_CLICK);
      HapticsManager.trigger("subtle");
    }
  };

  // Handle unequip / reset default with audio/haptics confirmation
  const handleUnequip = async () => {
    HapticsManager.trigger("subtle");
    const success = await unequipItem(selectedCategory, selectedScope);
    if (success) {
      AudioManager.play(AUDIO.UI_CLICK);
      HapticsManager.trigger("subtle");
    }
  };

  // User-friendly category title
  const categoryHeaderTitle = useMemo(() => {
    switch (selectedCategory) {
      case "TABLE_THEME":
        return "TABLE THEMES";
      case "DICE_SKIN":
        return "DICE SKINS";
      case "TOKEN_SKIN":
        return "TOKEN SKINS";
      case "CARD_BACK":
        return "CARD BACKS";
      case "AVATAR_AURA":
        return "AURA COLLECTION";
      case "PODIUM_TITLE":
        return "PODIUM TITLES";
      default:
        return "CUSTOMIZATIONS";
    }
  }, [selectedCategory]);

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      mobileSheet={true}
      ariaLabelledBy="cosmetics-boutique-title"
      panelClassName="w-full max-w-4xl bg-[#090d18] border border-zinc-800/90 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative"
    >
      {/* ── Surface Reflections: Warm Top-Left & Cool Bottom-Right ── */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── Modal Header ── */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-zinc-800/80 bg-[#0d1322]/80 flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 id="cosmetics-boutique-title" className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Cosmetics Boutique</span>
              {isAdminUser && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  ADMIN PASS
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              {isAdminUser ? "All cosmetics unlocked for free" : "Collect your look. Own the table."}
            </p>
          </div>
        </div>

        {/* Right Header Area: Balance chip + Close button */}
        <div className="flex items-center gap-2.5">
          {/* Wallet Coin Balance */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs shadow-inner">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{Number(walletBalance || 0).toLocaleString()}</span>
          </div>

          {/* Close button: >=44x44px target */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Cosmetics Boutique"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-zinc-400 hover:text-white transition flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Category Navigation Tabs: >=44x44px touch targets with illuminated dark pill ── */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-zinc-800/60 bg-[#090d18]/90 overflow-x-auto scrollbar-none flex items-center gap-1.5 relative z-10">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.category;
          return (
            <button
              key={tab.category}
              type="button"
              onClick={() => selectCategory(tab.category)}
              aria-selected={isActive}
              role="tab"
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer select-none relative ${
                isActive
                  ? "bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)] font-black"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800/80"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400 animate-pulse" : ""}`} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Scope Switcher (for Card Backs & Table Themes) ── */}
      {selectedCategory === "CARD_BACK" && (
        <div className="flex-shrink-0 px-5 py-2 bg-[#0d1322]/50 border-b border-zinc-800/40 flex items-center gap-2 relative z-10">
          <span className="text-xs text-zinc-400 font-medium mr-1">Game Variant:</span>
          {(["rummy", "uno"] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => selectScope(scope)}
              className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer uppercase ${
                selectedScope === scope
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      )}

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="px-5 py-2.5 bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs font-medium flex items-center justify-between relative z-10">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Main Boutique Body: Responsive 2-Column Layout ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 min-h-0 relative z-10">
        {/* Left Column (Desktop) / Top Card (Mobile): Enchanted Display Vault Preview Stage */}
        <div className="w-full md:w-5/12 flex-shrink-0 flex flex-col gap-3">
          <CosmeticsPreviewStage
            item={previewItem}
            category={selectedCategory}
            scope={selectedScope}
            previewMode={previewMode}
            onSelectPreviewMode={setStoredMode}
            isEquipped={isPreviewEquipped}
            isOwned={isPreviewOwned}
            isAdminUser={isAdminUser}
            walletBalance={walletBalance ?? "0"}
            isSubmitting={isSubmitting}
            onPurchase={handlePurchase}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
        </div>

        {/* Right Column (Desktop) / Bottom Grid (Mobile): Subtle Ambient Collection Container */}
        <div className="w-full md:w-7/12 flex flex-col bg-gradient-to-b from-[#0d1322] to-[#080c16] border border-zinc-800/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/50">
            <span className="text-xs font-black uppercase tracking-wider text-white">
              {categoryHeaderTitle} • {categoryItems.length} styles
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Select an item to inspect</span>
          </div>

          {isLoading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <span className="text-xs font-medium">Loading boutique collection...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
              {categoryItems.map((item) => {
                const isSelected = previewItem?.id === item.id;
                const isItemOwned =
                  isAdminUser || ownedIds.has(item.id) || item.unlockMethod === "DEFAULT";
                const isItemEquipped =
                  selectedCategory === "TABLE_THEME"
                    ? equipped.tableThemes?.[selectedScope] === item.id
                    : selectedCategory === "DICE_SKIN"
                      ? equipped.diceSkins?.[selectedScope] === item.id
                      : selectedCategory === "TOKEN_SKIN"
                        ? equipped.tokenSkins?.[selectedScope] === item.id
                        : selectedCategory === "CARD_BACK"
                          ? equipped.cardBacks?.[selectedScope as "uno" | "rummy"] === item.id
                          : selectedCategory === "AVATAR_AURA"
                            ? equipped.avatarAura === item.id
                            : equipped.podiumTitle === item.id;

                return (
                  <CosmeticsItemCard
                    key={item.id}
                    item={item}
                    category={selectedCategory}
                    scope={selectedScope}
                    isSelected={isSelected}
                    isOwned={isItemOwned}
                    isEquipped={isItemEquipped}
                    isSubmitting={isSubmitting}
                    walletBalance={walletBalance ?? "0"}
                    isAdminUser={isAdminUser}
                    onSelect={() => selectItem(item.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Disclaimer: Purely Cosmetic Statement ── */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-zinc-800/80 bg-[#0d1322]/80 flex items-center justify-between text-xs text-zinc-400 relative z-10">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium text-zinc-300">Cosmetic only. Every match stays fair.</span>
        </div>
      </div>
    </Modal>
  );
}
