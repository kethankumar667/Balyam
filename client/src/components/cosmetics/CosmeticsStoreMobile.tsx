/**
 * BHALYAM — Cosmetics Boutique Mobile Experience
 *
 * Dedicated mobile-first layout optimized for touchscreens and viewports < 768px.
 * Solves the critical mobile UX issues of the desktop modal:
 * 1. Eliminates the 500px+ preview wall: features a sleek, compact Hero Showcase (~150px)
 *    so the catalog grid is immediately visible above the fold.
 * 2. Zero scroll jumping: selecting an item updates the preview and thumb bar instantly
 *    without jarring scrollIntoView() jumps.
 * 3. 2-column visual grid: compact collectible cards with material thumbnails, rarity styling,
 *    and price/owned status pills.
 * 4. Sticky Thumb-Zone Action Bar: fixed at the bottom with safe-area padding for 1-tap
 *    EQUIP / UNLOCK / shortfall feedback without back-and-forth scrolling.
 * 5. On-Demand 3D Inspection Sheet: preserves full 3D interactive multi-mode previews
 *    (Inspect, Roll Simulation, In-Game) via an accessible drawer.
 *
 * WCAG 2.1 AA compliant: >=44x44px touch targets, focus rings, approved iconography.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  X,
  Coins,
  Dice5,
  Layers,
  CircleDot,
  Crown,
  Check,
  RotateCcw,
  Eye,
  Lock,
} from "lucide-react";
import {
  type CosmeticCategory,
  type CosmeticCatalogItem,
  type CosmeticGameScope,
  getRegistryCosmetic,
} from "@shared/cosmetics";
import {
  type PreviewMode,
  isValidModeForCategory,
  getDefaultPreviewMode,
} from "./previewModes";
import { resolveCosmeticPresentationState } from "./presentationState";
import {
  getCosmeticSurface,
  getRarityTokensAdaptive,
} from "./designTokens";
import { CollectibleThumbnail } from "./CosmeticsItemCard";
import { CosmeticsPreviewStage } from "./CosmeticsPreviewStage";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { bhalyamSpring } from "../../lib/motion";
import { useTheme } from "../../lib/useTheme";
import { getDiceSkinConfig, getTokenSkinConfig } from "../../lib/cosmeticsResolver";
import { PawnGlyph } from "../../games/ludo/PawnGlyph";
import { COLOR_HEX, COLOR_HEX_DARK } from "../../games/ludo/board-layout";

const CATEGORY_TABS: Array<{
  category: CosmeticCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { category: "DICE_SKIN", label: "Dice", icon: Dice5 },
  { category: "TOKEN_SKIN", label: "Tokens", icon: CircleDot },
  { category: "CARD_BACK", label: "Cards", icon: Layers },
];

export interface CosmeticsStoreMobileProps {
  catalog: CosmeticCatalogItem[];
  ownedIds: Set<string>;
  equipped: {
    tableThemes?: Record<string, string>;
    diceSkins?: Record<string, string>;
    tokenSkins?: Record<string, string>;
    cardBacks?: { uno?: string; rummy?: string };
    avatarAura?: string | null;
    podiumTitle?: string | null;
  };
  selectedCategory: CosmeticCategory;
  selectedScope: CosmeticGameScope;
  selectedItemId: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  walletBalance: string;
  isAdminUser: boolean;
  onClose: () => void;
  onSelectCategory: (category: CosmeticCategory) => void;
  onSelectScope: (scope: CosmeticGameScope) => void;
  onSelectItem: (itemId: string) => void;
  onPurchase: (item: CosmeticCatalogItem) => void;
  onRefund: (item: CosmeticCatalogItem) => void;
  onEquip: (item: CosmeticCatalogItem) => void;
  onUnequip: () => void;
}

export function CosmeticsStoreMobile({
  catalog,
  ownedIds,
  equipped,
  selectedCategory,
  selectedScope,
  selectedItemId,
  isLoading,
  isSubmitting,
  errorMessage,
  walletBalance,
  isAdminUser,
  onClose,
  onSelectCategory,
  onSelectScope,
  onSelectItem,
  onPurchase,
  onRefund,
  onEquip,
  onUnequip,
}: CosmeticsStoreMobileProps) {
  const [theme] = useTheme();
  const surface = getCosmeticSurface(theme);

  // On-demand 3D inspection drawer state
  const [is3DDrawerOpen, setIs3DDrawerOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("INSPECT");

  // Filter catalog items for selected category and scope
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

  // Selected item or fallback to first item
  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      const found = categoryItems.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return categoryItems[0] ?? null;
  }, [categoryItems, selectedItemId]);

  // Determine if active item is equipped
  const isPreviewEquipped = useMemo(() => {
    if (!selectedItem) return false;
    if (selectedCategory === "DICE_SKIN") {
      return equipped.diceSkins?.[selectedScope] === selectedItem.id;
    }
    if (selectedCategory === "TOKEN_SKIN") {
      return equipped.tokenSkins?.[selectedScope] === selectedItem.id;
    }
    if (selectedCategory === "CARD_BACK") {
      const s = selectedScope === "uno" ? "uno" : "rummy";
      return equipped.cardBacks?.[s] === selectedItem.id;
    }
    return false;
  }, [selectedItem, selectedCategory, selectedScope, equipped]);

  const isPreviewOwned = selectedItem
    ? isAdminUser || ownedIds.has(selectedItem.id) || selectedItem.unlockMethod === "DEFAULT"
    : false;

  // Selected item presentation result
  const presentation = useMemo(() => {
    if (!selectedItem) return null;
    return resolveCosmeticPresentationState({
      item: selectedItem,
      isOwned: isPreviewOwned,
      isEquipped: isPreviewEquipped,
      isAdminUser,
      walletBalance,
      isSubmitting,
    });
  }, [selectedItem, isPreviewOwned, isPreviewEquipped, isAdminUser, walletBalance, isSubmitting]);

  const rarityTokens = selectedItem
    ? getRarityTokensAdaptive(selectedItem.rarity)
    : getRarityTokensAdaptive("COMMON");

  // Selection handler: instantaneous with haptic feedback and ZERO scroll jumping
  const handleItemClick = (item: CosmeticCatalogItem) => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    onSelectItem(item.id);
  };

  return (
    <div
      className="w-full flex flex-col h-[92vh] max-h-[92dvh] relative overflow-hidden select-none"
      style={{ background: theme === "light" ? surface.base : "linear-gradient(180deg, #101827 0%, #060912 56%, #03050a 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute -top-24 left-8 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      {/* Top Drag Handle */}
      <div className="flex-shrink-0 pt-2.5 pb-1 flex justify-center">
        <span
          aria-hidden
          className="w-10 h-1 rounded-full bg-stone-300 dark:bg-white/20"
        />
      </div>

      {/* ── Mobile Header: Boutique Wordmark & Quick Actions ── */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b border-stone-200/80 dark:border-white/10 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-[0_12px_24px_-14px_rgba(245,158,11,0.95)] shrink-0 border border-amber-100/60">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black tracking-tight text-stone-950 dark:text-white truncate">
                Boutique
              </h2>
              {isAdminUser && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-0.5 shrink-0">
                  <Crown className="w-2.5 h-2.5" /> FREE
                </span>
              )}
            </div>
            <p className="text-[10px] text-stone-500 dark:text-zinc-400 truncate font-semibold">
              {categoryItems.length} curated styles
            </p>
          </div>
        </div>

        {/* Right Header Area: Balance Chip & Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Coin Balance Chip */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 font-mono font-bold text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>{Number(walletBalance || 0).toLocaleString()}</span>
          </div>

          {/* Close Button: >=44x44px target */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Boutique"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-stone-300 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] text-stone-500 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Category Navigation Tabs ── */}
      <div
        role="tablist"
        aria-label="Cosmetic categories"
        className="flex-shrink-0 px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-stone-200/60 dark:border-white/10 relative z-10"
      >
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.category;
          return (
            <button
              key={tab.category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                HapticsManager.trigger("subtle");
                onSelectCategory(tab.category);
              }}
              className={`min-h-[44px] flex-1 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isActive
                  ? "bg-amber-300/15 text-amber-800 dark:text-amber-200 border border-amber-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "bg-stone-100/70 dark:bg-white/[0.04] text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-white/10"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-amber-600 dark:text-amber-400" : ""}`} />
              <span className="truncate">{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="mobile-category-indicator"
                  transition={bhalyamSpring}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sub-Scope Switcher (for Card Backs: Rummy / Uno) ── */}
      {selectedCategory === "CARD_BACK" && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-500/5 border-b border-stone-200/40 dark:border-white/10 flex items-center justify-between relative z-10">
          <span className="text-[11px] text-stone-500 dark:text-zinc-400 font-semibold">Game variant</span>
          <div className="flex items-center gap-1">
            {(["rummy", "uno"] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => {
                  HapticsManager.trigger("subtle");
                  onSelectScope(scope);
                }}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition uppercase cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  selectedScope === scope
                    ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/50"
                    : "text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/80 border-b border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between shrink-0 relative z-10">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Hero Quick-Showcase Card (~150px height) ── */}
      {selectedItem && (
        <div className="flex-shrink-0 px-3.5 pt-3 pb-1">
          <div
            className={`w-full rounded-[22px] p-3.5 border ${rarityTokens.border} shadow-2xl relative overflow-hidden flex items-center justify-between gap-3 transition-all duration-300`}
            style={{
              background: "linear-gradient(135deg, #111827 0%, #080c16 60%, #03050a 100%)",
              boxShadow: `${rarityTokens.glowShadow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
          >
            {/* Ambient Rarity & Warm Gold Glow */}
            <div
              className={`absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_var(--tw-gradient-stops))] ${rarityTokens.ambientGlow} pointer-events-none opacity-50`}
            />
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:12px_12px]" />

            {/* Left: Artifact Preview with Interactive Touch */}
            <div className="relative z-10 flex items-center gap-3 min-w-0">
              <MobileArtifactShowcase
                item={selectedItem}
                category={selectedCategory}
                scope={selectedScope}
              />

              {/* Title & Rarity Details */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.14em] border shadow-xs ${rarityTokens.badge}`}>
                    {selectedItem.rarity}
                  </span>
                  {isPreviewEquipped && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.3)]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" /> EQUIPPED
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-white tracking-tight truncate leading-tight">
                  {selectedItem.name}
                </h3>
                <p className="text-[11px] text-zinc-300/80 line-clamp-1 mt-0.5 font-medium">
                  {selectedItem.description}
                </p>
              </div>
            </div>

            {/* Right: On-Demand "Inspect 3D" Trigger Button */}
            <div className="relative z-10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  HapticsManager.trigger("subtle");
                  AudioManager.play(AUDIO.UI_CLICK);
                  setIs3DDrawerOpen(true);
                }}
                aria-label={`Inspect ${selectedItem.name} in 3D multi-mode vault`}
                className="min-h-[44px] min-w-[48px] px-3.5 py-1.5 rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-400/20 to-yellow-500/10 hover:from-amber-400/30 hover:to-yellow-500/20 active:scale-95 text-amber-200 text-[11px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shadow-[0_4px_12px_-2px_rgba(245,158,11,0.25)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <Eye className="w-4 h-4 text-amber-300" />
                <span className="text-[9px] tracking-tight font-extrabold uppercase">3D Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main 2-Column Catalog Grid (Scrollable Body) ── */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-2.5 pb-28 min-h-0 relative z-10">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
            {selectedCategory === "DICE_SKIN" ? "Dice skins" : selectedCategory === "TOKEN_SKIN" ? "Token finishes" : "Card designs"}
          </span>
          <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold">
            Tap to preview
          </span>
        </div>

        {isLoading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-2 text-stone-500 dark:text-zinc-500">
            <div className="w-7 h-7 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <span className="text-xs font-medium">Loading collection...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categoryItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isItemOwned =
                isAdminUser || ownedIds.has(item.id) || item.unlockMethod === "DEFAULT";
              const isItemEquipped =
                selectedCategory === "DICE_SKIN"
                  ? equipped.diceSkins?.[selectedScope] === item.id
                  : selectedCategory === "TOKEN_SKIN"
                    ? equipped.tokenSkins?.[selectedScope] === item.id
                    : equipped.cardBacks?.[selectedScope as "uno" | "rummy"] === item.id;

              return (
                <MobileCosmeticsCard
                  key={item.id}
                  item={item}
                  category={selectedCategory}
                  isSelected={isSelected}
                  isOwned={isItemOwned}
                  isEquipped={isItemEquipped}
                  isAdminUser={isAdminUser}
                  walletBalance={walletBalance}
                  isSubmitting={isSubmitting}
                  onSelect={() => handleItemClick(item)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Action Bar (Thumb-Zone CTA) ── */}
      {selectedItem && presentation && (
        <div
          className="sticky bottom-0 left-0 right-0 z-20 px-4 pt-3.5 border-t border-amber-400/30 dark:border-amber-400/20 shadow-[0_-20px_48px_-16px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          style={{
            background: theme === "light" ? "rgba(255, 253, 247, 0.98)" : "rgba(6, 9, 18, 0.96)",
            paddingBottom: "max(0.85rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Left: Price & Status Information */}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-stone-900 dark:text-white truncate">
                {selectedItem.name}
              </div>
              <div className="text-[11px] mt-0.5 font-bold">
                {presentation.state === "EQUIPPED" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Currently equipped
                  </span>
                ) : presentation.state === "INSUFFICIENT_BALANCE" ? (
                  <span className="text-rose-600 dark:text-rose-400">
                    Need {presentation.shortfall.toLocaleString()} more Coins
                  </span>
                ) : presentation.state === "AVAILABLE" ? (
                  <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-500" /> {selectedItem.priceCoins.toLocaleString()} Coins
                  </span>
                ) : presentation.state === "OWNED" ? (
                  <span className="text-sky-600 dark:text-sky-400">
                    Ready to equip
                  </span>
                ) : isAdminUser ? (
                  <span className="text-amber-600 dark:text-amber-300">
                    Unlocked via Admin Pass
                  </span>
                ) : (
                  <span className="text-stone-500 dark:text-zinc-400 font-medium">
                    {presentation.cardSubtext}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Primary Thumb Action Button (min 44px height) with 3D Embossed Finish */}
            <div className="shrink-0 flex items-center gap-2">
              {presentation.state === "EQUIPPED" ? (
                selectedItem.unlockMethod !== "DEFAULT" ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onUnequip}
                    className="min-h-[46px] px-4 py-2 rounded-2xl text-xs font-black bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 border border-stone-300 dark:border-zinc-700 hover:bg-stone-300 dark:hover:bg-zinc-700 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span>EQUIPPED</span>
                  </button>
                ) : (
                  <div className="min-h-[46px] px-4 py-2 rounded-2xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-1.5 select-none shadow-[0_2px_12px_-2px_rgba(16,185,129,0.3)]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>DEFAULT</span>
                  </div>
                )
              ) : presentation.canEquip ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onEquip(selectedItem)}
                  className="min-h-[46px] px-6 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-stone-950 border-t border-amber-200/80 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.55),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(180,83,9,0.5)] active:translate-y-0.5 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>EQUIP</span>
                </button>
              ) : presentation.canPurchase ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onPurchase(selectedItem)}
                  className="min-h-[46px] px-6 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-stone-950 border-t border-amber-200/80 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.55),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(180,83,9,0.5)] active:translate-y-0.5 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Coins className="w-4 h-4" />
                  <span>UNLOCK</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="min-h-[46px] px-4 py-2.5 rounded-2xl text-xs font-black bg-stone-200 dark:bg-zinc-900 text-stone-400 dark:text-zinc-600 border border-stone-300 dark:border-zinc-800 flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
                >
                  <span>{presentation.ctaLabel}</span>
                </button>
              )}
            </div>
          </div>

          {/* Refund action link if eligible */}
          {isPreviewOwned && !isAdminUser && selectedItem.unlockMethod === "COIN_PURCHASE" && (
            <div className="pt-1.5 flex justify-center">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onRefund(selectedItem)}
                className="py-1 text-[11px] font-bold text-stone-400 dark:text-zinc-500 hover:text-rose-500 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Refund for {selectedItem.priceCoins.toLocaleString()} Coins</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── On-Demand 3D Multi-Mode Inspection Drawer / Sheet ── */}
      <AnimatePresence>
        {is3DDrawerOpen && selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="fixed inset-0 z-50 bg-[#060912] flex flex-col overflow-y-auto"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            {/* Drawer Top Header */}
            <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-amber-500/20 bg-[#0a0f1d]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black text-white">3D Inspection Vault</span>
              </div>
              <button
                type="button"
                onClick={() => setIs3DDrawerOpen(false)}
                aria-label="Close 3D Inspection Vault"
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Full 3D Interactive Stage */}
            <div className="flex-1 p-4 flex flex-col gap-4">
              <CosmeticsPreviewStage
                item={selectedItem}
                category={selectedCategory}
                scope={selectedScope}
                previewMode={
                  isValidModeForCategory(previewMode, selectedCategory)
                    ? previewMode
                    : getDefaultPreviewMode(selectedCategory)
                }
                onSelectPreviewMode={setPreviewMode}
                isEquipped={isPreviewEquipped}
                isOwned={isPreviewOwned}
                isAdminUser={isAdminUser}
                walletBalance={walletBalance}
                isSubmitting={isSubmitting}
                onPurchase={onPurchase}
                onEquip={onEquip}
                onUnequip={onUnequip}
                onRefund={onRefund}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT 2-COLUMN COLLECTIBLE CARD FOR MOBILE
// ─────────────────────────────────────────────────────────────────────────────

interface MobileCosmeticsCardProps {
  item: CosmeticCatalogItem;
  category: CosmeticCategory;
  isSelected: boolean;
  isOwned: boolean;
  isEquipped: boolean;
  isAdminUser: boolean;
  walletBalance: string;
  isSubmitting: boolean;
  onSelect: () => void;
}

function MobileCosmeticsCard({
  item,
  category,
  isSelected,
  isOwned,
  isEquipped,
  isAdminUser,
  walletBalance,
  isSubmitting,
  onSelect,
}: MobileCosmeticsCardProps) {
  const pres = resolveCosmeticPresentationState({
    item,
    isOwned,
    isEquipped,
    isAdminUser,
    walletBalance,
    isSubmitting,
  });

  const rarity = getRarityTokensAdaptive(item.rarity);

  const cardBorderClass = isSelected
    ? `${rarity.borderSelected} ring-2 ring-amber-400/90 shadow-lg ${rarity.surfaceSelected}`
    : `${rarity.border} bg-gradient-to-br from-white via-stone-50 to-amber-50/[0.2] dark:from-[#0d1322] dark:via-[#080d19] dark:to-[#04060d] hover:border-amber-400/50 shadow-sm`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Inspect ${item.name}, ${rarity.label} rarity`}
      className={`relative p-3 rounded-2xl border flex flex-col justify-between gap-2 min-h-[142px] cursor-pointer select-none transition-all duration-150 active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${cardBorderClass}`}
    >
      {/* Top Bar: Rarity + Status Pill */}
      <div className="flex items-center justify-between gap-1">
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-xs ${rarity.badge}`}>
          {item.rarity}
        </span>

        {/* State Badge */}
        {pres.state === "EQUIPPED" ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5 shrink-0 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.3)]">
            <Check className="w-2.5 h-2.5 stroke-[3]" /> EQUIPPED
          </span>
        ) : isAdminUser ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-0.5 shrink-0 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.3)]">
            <Crown className="w-2.5 h-2.5" /> FREE
          </span>
        ) : pres.state === "OWNED" ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 shrink-0">
            OWNED
          </span>
        ) : pres.state === "DEFAULT" ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-200 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-300 dark:border-zinc-700 shrink-0">
            DEFAULT
          </span>
        ) : pres.state === "LOCKED" ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
            <Lock className="w-2.5 h-2.5" /> Day 7
          </span>
        ) : pres.state === "AVAILABLE" ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/35 flex items-center gap-1 shrink-0 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.2)]">
            <Coins className="w-2.5 h-2.5 text-amber-500" />
            {item.priceCoins.toLocaleString()}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 shrink-0">
            {pres.shortfall.toLocaleString()} SHORT
          </span>
        )}
      </div>

      {/* Center: Visual Thumbnail in Velvet Display Well */}
      <div className="flex items-center justify-center my-0.5">
        <div className="p-1 rounded-xl bg-black/30 dark:bg-black/50 border border-stone-200/60 dark:border-white/10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] flex items-center justify-center">
          <CollectibleThumbnail
            item={item}
            category={category}
            isSelected={isSelected}
            rarity={item.rarity}
          />
        </div>
      </div>

      {/* Bottom: Item Name */}
      <div className="min-w-0">
        <div className="text-xs font-black text-stone-900 dark:text-white leading-tight break-words line-clamp-2 min-h-[1.75rem] flex items-center">
          {item.name}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT HERO ARTIFACT SHOWCASE FOR MOBILE
// ─────────────────────────────────────────────────────────────────────────────

function MobileArtifactShowcase({
  item,
  category,
  scope: _scope,
}: {
  item: CosmeticCatalogItem;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
}) {
  const [diceTumble, setDiceTumble] = useState(false);

  if (category === "DICE_SKIN") {
    const dice = getDiceSkinConfig(item.id);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (diceTumble) return;
          HapticsManager.trigger("subtle");
          setDiceTumble(true);
          window.setTimeout(() => setDiceTumble(false), 650);
        }}
        aria-label="Tap to roll dice preview"
        className="w-14 h-14 rounded-2xl flex items-center justify-center relative cursor-pointer select-none shrink-0 transition-transform active:scale-90"
        style={{
          background: dice.faceBg,
          border: `2px solid ${dice.faceBorder}`,
          boxShadow: dice.glow ?? "0 8px 16px rgba(0,0,0,0.4)",
        }}
      >
        <motion.div
          animate={diceTumble ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 0.9, 1] } : {}}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="w-full h-full flex items-center justify-center"
        >
          <Dice5 className="w-8 h-8 stroke-[2.5]" style={{ color: dice.wooden ? "#fde68a" : "#18181b" }} />
        </motion.div>
      </div>
    );
  }

  if (category === "TOKEN_SKIN") {
    const tokenSkin = getTokenSkinConfig(item.id);
    return (
      <div className="w-14 h-14 rounded-2xl bg-stone-900/80 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md">
        <div className="w-10 h-11">
          <PawnGlyph
            main={COLOR_HEX.blue}
            dark={COLOR_HEX_DARK.blue}
            tokenSkin={tokenSkin}
            uid="mobile-hero-token"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md">
      <CollectibleThumbnail
        item={item}
        category={category}
        isSelected={true}
        rarity={item.rarity}
      />
    </div>
  );
}

