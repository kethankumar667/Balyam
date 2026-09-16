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
 *
 * Premium visual pass (art direction only — layout, state model, and
 * backend authority are unchanged): layered surface elevation from the
 * shared `designTokens.ts`, a soft-spring modal entrance, a gradient
 * wordmark, and a real sliding tab indicator (framer-motion `layoutId`)
 * replacing the old teleporting dash under the active category.
 */

import React, { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Store,
  X,
  Coins,
  Dice5,
  Layers,
  CircleDot,
  Crown,
  Info,
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
import { getCosmeticSurface } from "./designTokens";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { bhalyamSpring } from "../../lib/motion";
import { useTheme } from "../../lib/useTheme";
import { useViewport } from "../../lib/useViewport";
import { CosmeticsStoreMobile } from "./CosmeticsStoreMobile";

// Tables, Auras, and Titles are removed from the shop (2026-09-10) — their
// catalog rows are deactivated server-side (see InMemoryCosmeticsRepository's
// SEED_CATALOG / the matching Supabase migration), and simply not listed
// here so the shop UI never offers a tab with nothing purchasable behind it.
const CATEGORY_TABS: Array<{
  category: CosmeticCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { category: "DICE_SKIN", label: "Dice", icon: Dice5 },
  { category: "TOKEN_SKIN", label: "Tokens", icon: CircleDot },
  { category: "CARD_BACK", label: "Cards", icon: Layers },
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
    refundItem,
    equipItem,
    unequipItem,
  } = useCosmeticsStore();

  const { balance: walletBalance } = useWallet();
  const { isAdmin, isSuperAdmin } = useAuthStore();
  const isAdminUser = isAdmin || isSuperAdmin;
  const viewport = useViewport();
  const isMobile = viewport === "mobile";

  // Shop chrome (shell, header/footer bars, tab strip, item-grid container)
  // follows the app's real light/dark toggle — see designTokens.ts's own
  // comment on why the preview stage (CosmeticsPreviewStage) is the one
  // surface that deliberately stays a fixed dark "display case" instead.
  const [theme] = useTheme();
  const surface = getCosmeticSurface(theme);

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

  // On mobile the preview panel and the item grid stack vertically (the
  // panel sits ABOVE the grid — see the layout below), sharing one scroll
  // container. Tapping an item while scrolled down to browse the grid used
  // to update the preview off-screen above the fold, with no visual cue it
  // had even changed — exactly "clicked an item, can't see its design."
  // Desktop shows both side by side already, so this is a no-op there.
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const handleSelectItem = (itemId: string) => {
    selectItem(itemId);
    if (window.matchMedia("(max-width: 767px)").matches) {
      previewPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  // Handle self-service refund with audio/haptics confirmation
  const handleRefund = async (item: CosmeticCatalogItem) => {
    HapticsManager.trigger("subtle");
    const result = await refundItem(item.id);
    if (result.success && result.code === "REFUNDED") {
      AudioManager.play(AUDIO.UI_CLICK);
      HapticsManager.trigger("subtle");
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

  if (isMobile) {
    return (
      <Modal
        open={isOpen}
        onClose={handleClose}
        mobileSheet={true}
        ariaLabelledBy="cosmetics-boutique-title"
        className="p-0 sm:p-4"
        panelClassName="w-full max-w-lg mx-auto border border-stone-300 dark:border-zinc-800 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] relative"
        panelStyle={{
          background: surface.base,
          boxShadow: `${surface.edgeLight}, 0 24px 60px -12px rgba(0,0,0,0.65)`,
        }}
      >
        <CosmeticsStoreMobile
          catalog={catalog}
          ownedIds={ownedIds}
          equipped={equipped}
          selectedCategory={selectedCategory}
          selectedScope={selectedScope}
          selectedItemId={selectedItemId}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          walletBalance={walletBalance ?? "0"}
          isAdminUser={isAdminUser}
          onClose={handleClose}
          onSelectCategory={selectCategory}
          onSelectScope={selectScope}
          onSelectItem={selectItem}
          onPurchase={handlePurchase}
          onRefund={handleRefund}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
        />
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      mobileSheet={true}
      ariaLabelledBy="cosmetics-boutique-title"
      panelClassName="w-full max-w-5xl border border-amber-500/30 dark:border-amber-400/20 rounded-t-3xl md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative motion-safe:animate-cosmetic-modal-in motion-reduce:animate-cosmetic-fade-in"
      panelStyle={{
        background: theme === "light" ? surface.base : "linear-gradient(180deg, #0d1322 0%, #070b14 50%, #03050a 100%)",
        boxShadow: `${surface.edgeLight}, 0 34px 92px -26px rgba(0,0,0,0.95), 0 0 80px rgba(245,158,11,0.18)`,
      }}
    >
      {/* ── Surface Reflections: Multi-Point Luxury Volumetric Glow ── */}
      <div className="absolute -top-20 -left-10 w-[32rem] h-[32rem] bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[28rem] h-[28rem] bg-gradient-to-bl from-purple-500/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/4 w-[30rem] h-[20rem] bg-gradient-to-t from-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(135deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* ── Modal Header: Luxury Boutique Marquee ── */}
      <div
        className="flex-shrink-0 px-5 py-3.5 border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between gap-3 relative z-10"
        style={{ background: theme === "light" ? "rgba(255, 253, 247, 0.94)" : "rgba(7, 11, 20, 0.92)", backdropFilter: "blur(16px)", boxShadow: surface.edgeLight }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-black flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.65)] shrink-0 border border-amber-200/80">
            <Store className="w-5 h-5 drop-shadow-sm" />
          </div>
          <div className="min-w-0">
            <h3
              id="cosmetics-boutique-title"
              className="text-xl font-black tracking-tight flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-900 via-amber-700 to-amber-950 dark:from-yellow-100 dark:via-amber-300 dark:to-yellow-500"
            >
              <span>Cosmetics Boutique</span>
              {isAdminUser && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-gradient-to-r from-amber-500/25 to-yellow-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center gap-1 shrink-0">
                  <Crown className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  ADMIN PASS
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 truncate font-semibold">
              {isAdminUser ? "All finishes unlocked for free" : "Curated collectible finishes for dice, cards & tokens."}
            </p>
          </div>
        </div>

        {/* Right Header Area: Balance capsule + Close button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Wallet Coin Balance — 24K gold capsule */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-amber-400/60 dark:border-amber-400/40 text-amber-900 dark:text-amber-200 font-mono font-black text-xs"
            style={{
              background: theme === "light"
                ? "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,243,199,0.8))"
                : "linear-gradient(135deg, rgba(30,22,8,0.7), rgba(12,16,28,0.85))",
              boxShadow: theme === "light"
                ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 0 20px rgba(245,158,11,0.2)"
                : "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px rgba(245,158,11,0.25)",
            }}
          >
            <Coins className="w-4 h-4 text-amber-500 fill-amber-300/40" />
            <span>{Number(walletBalance || 0).toLocaleString()}</span>
          </div>

          {/* Close button: >=44x44px target, premium hover/focus */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Cosmetics Boutique"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-stone-300/80 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] hover:bg-amber-100/50 dark:hover:bg-amber-400/15 hover:border-amber-500/60 active:scale-95 text-stone-600 dark:text-zinc-200 hover:text-amber-800 dark:hover:text-amber-300 transition flex items-center justify-center cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070a12]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Category Navigation: Gilded Segmented Control ── */}
      <div
        role="tablist"
        aria-label="Cosmetic categories"
        className="flex-shrink-0 px-5 py-2.5 border-b border-stone-200/80 dark:border-white/10 overflow-x-auto scrollbar-none flex items-center gap-2 relative z-10"
        style={{ background: theme === "light" ? "rgba(251, 245, 233, 0.9)" : "rgba(4, 7, 13, 0.82)" }}
      >
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
              className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer select-none relative focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isActive
                  ? "bg-gradient-to-b from-amber-300/25 via-amber-500/15 to-transparent text-amber-900 dark:text-amber-200 border border-amber-400/80 font-black shadow-[0_0_16px_rgba(245,158,11,0.28)]"
                  : "bg-white/60 dark:bg-white/[0.04] text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-white/[0.07] border border-stone-300/80 dark:border-white/10 font-bold"
              }`}
              style={isActive ? { boxShadow: theme === "light" ? "inset 0 1px 0 rgba(255,255,255,0.7), 0 0 16px rgba(245,158,11,0.2)" : "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 18px rgba(245,158,11,0.28)" } : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-600 dark:text-amber-400 drop-shadow-sm" : ""}`} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="cosmetic-category-indicator"
                  transition={bhalyamSpring}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.95)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Scope Switcher (for Card Backs) ── */}
      {selectedCategory === "CARD_BACK" && (
        <div className="flex-shrink-0 px-5 py-2 bg-white/70 dark:bg-black/30 border-b border-stone-200 dark:border-white/10 flex items-center gap-2 relative z-10">
          <span className="text-xs text-stone-500 dark:text-zinc-400 font-semibold mr-1">Game variant</span>
          {(["rummy", "uno"] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => selectScope(scope)}
              className={`min-h-[36px] px-3.5 py-1 rounded-xl text-xs font-black transition cursor-pointer uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                selectedScope === scope
                  ? "bg-gradient-to-r from-amber-400/25 to-yellow-500/15 text-amber-900 dark:text-amber-300 border border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      )}

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/80 border-b border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between relative z-10">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Main Boutique Body: Responsive 2-Column Layout ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 flex flex-col md:flex-row gap-5 min-h-0 relative z-10">
        {/* Left Column (Desktop) / Top Card (Mobile): Enchanted Display Vault Preview Stage */}
        <div ref={previewPanelRef} className="w-full md:w-5/12 flex-shrink-0 flex flex-col gap-3">
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
            onRefund={handleRefund}
          />
        </div>

        {/* Right Column (Desktop) / Bottom Grid (Mobile): Subtle Ambient Collection Container */}
        <div
          className="w-full md:w-7/12 flex flex-col border border-stone-300/80 dark:border-white/10 rounded-[24px] p-4 shadow-2xl overflow-hidden"
          style={{ background: theme === "light" ? surface.raised : "linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(8,12,22,0.96) 100%)", boxShadow: `${surface.edgeLight}, 0 22px 54px -24px rgba(0,0,0,0.8)` }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-white/10">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-900 dark:text-white">
              {categoryHeaderTitle} / {categoryItems.length} styles
            </span>
            <span className="text-[11px] text-stone-500 dark:text-zinc-400 font-semibold">Select a finish to inspect</span>
          </div>

          {isLoading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-zinc-500">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent motion-safe:animate-spin" />
              <span className="text-xs font-medium">Loading boutique collection...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto pr-1.5">
              {categoryItems.map((item, index) => {
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
                  <div
                    key={item.id}
                    className="motion-safe:animate-cosmetic-fade-in motion-reduce:opacity-100"
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                  >
                    <CosmeticsItemCard
                      item={item}
                      category={selectedCategory}
                      scope={selectedScope}
                      isSelected={isSelected}
                      isOwned={isItemOwned}
                      isEquipped={isItemEquipped}
                      isSubmitting={isSubmitting}
                      walletBalance={walletBalance ?? "0"}
                      isAdminUser={isAdminUser}
                      onSelect={() => handleSelectItem(item.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Disclaimer: Purely Cosmetic Statement ── */}
      <div
        className="flex-shrink-0 px-5 py-3 border-t border-amber-200/20 dark:border-white/10 flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400 relative z-10"
        style={{ background: theme === "light" ? "rgba(255, 253, 247, 0.92)" : "rgba(7, 10, 18, 0.92)" }}
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
          <span className="font-semibold text-stone-700 dark:text-zinc-200">Cosmetic only. Every match stays fair.</span>
        </div>
      </div>
    </Modal>
  );
}
