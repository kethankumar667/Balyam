/**
 * BHALYAM — Cosmetics Collectible Tile Card
 *
 * Displays a cosmetic catalog item as an authentic collectible tile:
 * - Material-accurate thumbnail, sourced from the SAME registries the real
 *   game boards render from (lib/cosmeticsResolver.ts) — not a third,
 *   independent copy of the color values.
 * - Rarity identity (COMMON, RARE, EPIC, LEGENDARY) from the shared
 *   `designTokens.ts` token layer, kept distinct from selection styling.
 * - Restrained selection highlight (a constant amber ring, never recoloring
 *   the rarity border) plus a "Previewing in Vault" indicator.
 * - Premium hover elevation: a soft lift + rarity-tinted glow response.
 * - Rarity-tiered ambient presence (ParticleTier from designTokens) — never
 *   the only signal, always alongside the border hue and text badge.
 * - Two-line title wrapping without truncate clipping.
 * - Single centralized CTA in preview panel (cards are purely selectable tiles).
 * - Deficit badge and progress bar without duplicate deficit sentences.
 * - Admin and Super Admin free access indicators (Crown FREE).
 * - Accessible >=44x44px interaction target with keyboard support.
 * - Reduced-motion safe: all continuous animation is gated by `motion-safe:`.
 */

import React from "react";
import {
  Coins,
  Check,
  Lock,
  Orbit,
  RefreshCw,
  Crown,
  Layers,
  Dice5,
  Palette,
  CircleDot,
  Eye,
  Award,
  Flame,
  Gem,
} from "lucide-react";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
} from "@shared/cosmetics";
import { resolveCosmeticPresentationState } from "./presentationState";
import { getRarityTokensAdaptive } from "./designTokens";
import {
  getDiceSkinConfig,
  getTableThemeConfig,
  getRummyCardBackConfig,
  getUnoCardBackConfig,
  getAvatarAuraConfig,
} from "../../lib/cosmeticsResolver";

interface CosmeticsItemCardProps {
  item: CosmeticCatalogItem;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
  isSelected: boolean;
  isOwned: boolean;
  isEquipped: boolean;
  isSubmitting: boolean;
  walletBalance: string;
  isAdminUser: boolean;
  onSelect: () => void;
  onPurchase?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
}

export function CosmeticsItemCard({
  item,
  category,
  scope: _scope,
  isSelected,
  isOwned,
  isEquipped,
  isSubmitting,
  walletBalance,
  isAdminUser,
  onSelect,
}: CosmeticsItemCardProps) {
  // Deterministic presentation state calculation
  const pres = resolveCosmeticPresentationState({
    item,
    isOwned,
    isEquipped,
    isAdminUser,
    walletBalance,
    isSubmitting,
  });

  const rarity = getRarityTokensAdaptive(item.rarity);

  const cardSurface = isSelected
    ? `${rarity.borderSelected} ring-1 ring-amber-400/80 shadow-[0_10px_28px_-6px_rgba(0,0,0,0.55)] ${rarity.surfaceSelected}`
    : `${rarity.border} ${rarity.borderHover} bg-white dark:bg-[#0d1322]/90`;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Inspect ${item.name}, ${rarity.label} rarity, in vault`}
      style={
        isSelected || item.rarity === "LEGENDARY"
          ? { boxShadow: rarity.glowShadow }
          : undefined
      }
      className={`group relative p-3.5 rounded-xl border-2 flex flex-col justify-between gap-3
                  transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out
                  cursor-pointer select-none min-h-[148px] overflow-hidden
                  motion-safe:hover:-translate-y-0.5 focus-visible:outline-hidden
                  focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
                  focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#080c16]
                  ${cardSurface}`}
    >
      {/* Legendary-only restrained edge sweep — one slow pass, never a
          constant loop; reduced-motion drops it to a static glow. */}
      {rarity.particleTier >= 3 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[10px] motion-reduce:hidden"
        >
          <div className="absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-amber-500/10 dark:via-amber-200/10 to-transparent motion-safe:animate-cosmetic-sweep" />
        </div>
      )}

      {/* ── Top Header: Rarity & Current State Badge ── */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${rarity.badge}`}>
          {item.rarity}
        </span>

        {/* Presentation State Badge */}
        {pres.state === "EQUIPPED" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 border flex items-center gap-1 shrink-0">
            <Check className="w-3 h-3 stroke-[3]" /> EQUIPPED
          </span>
        ) : pres.state === "EQUIPPING" || pres.state === "PURCHASING" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 border motion-safe:animate-pulse flex items-center gap-1 shrink-0">
            <RefreshCw className="w-3 h-3 motion-safe:animate-spin" /> {pres.badgeLabel}
          </span>
        ) : isAdminUser ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 border flex items-center gap-1 shrink-0">
            <Crown className="w-3 h-3" /> FREE
          </span>
        ) : pres.state === "OWNED" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/40 border shrink-0">
            OWNED
          </span>
        ) : pres.state === "DEFAULT" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-600 border-stone-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 border shrink-0">
            DEFAULT
          </span>
        ) : pres.state === "LOCKED" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 border flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3" /> Day 7
          </span>
        ) : pres.state === "AVAILABLE" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 border flex items-center gap-1 shrink-0">
            <Coins className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            {item.priceCoins.toLocaleString()}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/40 border shrink-0">
            {pres.shortfall.toLocaleString()} SHORT
          </span>
        )}
      </div>

      {/* ── Middle: Miniature Visual Preview + Lore Name & Subtitle ── */}
      <div className="flex items-center gap-3 relative z-10">
        {/* Material-accurate miniature thumbnail */}
        <CollectibleThumbnail item={item} category={category} isSelected={isSelected} rarity={item.rarity} />

        {/* Text details: 2-line title wrapping without truncate */}
        <div className="flex-1 min-w-0">
          <h5 className={`text-sm font-bold text-stone-900 dark:text-white tracking-tight leading-snug break-words line-clamp-2 min-h-[2.5rem] flex items-center transition-colors group-hover:${rarity.accentText}`}>
            {item.name}
          </h5>
          <p className="text-xs text-stone-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>
      </div>

      {/* ── Bottom: Progress Bar / Preview Status ── */}
      <div className="pt-2 border-t border-stone-200 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-xs relative z-10">
        {pres.state === "INSUFFICIENT_BALANCE" ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-zinc-400 mb-1">
              <span className="text-rose-600 dark:text-rose-400 font-medium">Shortfall: {pres.shortfall.toLocaleString()}</span>
              <span className="font-mono text-stone-400 dark:text-zinc-500">{pres.progressText}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${pres.progressPercent}%` }}
              />
            </div>
          </div>
        ) : isSelected ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Previewing in Vault
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800/80 dark:text-amber-300/80 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20">
              Active
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-stone-500 dark:text-zinc-400 group-hover:text-stone-700 dark:group-hover:text-zinc-300 transition-colors truncate">
              {pres.cardSubtext}
            </span>
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 group-hover:text-amber-700 dark:group-hover:text-amber-400/90 transition-colors shrink-0 font-medium">
              Preview &rarr;
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIATURE PREVIEW THUMBNAILS FOR COLLECTIBLE TILES — sourced from the same
// material registries the live game boards render from.
// ─────────────────────────────────────────────────────────────────────────────

function CollectibleThumbnail({
  item,
  category,
  isSelected,
  rarity: rarityKey,
}: {
  item: CosmeticCatalogItem;
  category: CosmeticCategory;
  isSelected: boolean;
  rarity: CosmeticCatalogItem["rarity"];
}) {
  const rarity = getRarityTokensAdaptive(rarityKey);

  if (category === "AVATAR_AURA") {
    const aura = getAvatarAuraConfig(item.id);
    const ringClass = aura.className || "border-zinc-600";
    return (
      <div className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0">
        <div className={`absolute inset-0 rounded-full border-2 ${ringClass} ${isSelected ? "motion-safe:animate-spin [animation-duration:6s]" : ""}`} />
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center">
          <Orbit className="w-4 h-4 text-zinc-200" />
        </div>
      </div>
    );
  }

  if (category === "DICE_SKIN") {
    const dice = getDiceSkinConfig(item.id);
    return (
      <div
        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shadow-md shrink-0 transition-transform ${isSelected ? "scale-105" : ""}`}
        style={{
          background: dice.faceBg,
          borderColor: dice.faceBorder,
          boxShadow: dice.glow ?? undefined,
          color: dice.wooden ? "#fde68a" : "#18181b",
        }}
      >
        <Dice5 className="w-5 h-5 stroke-[2.5]" />
      </div>
    );
  }

  if (category === "TOKEN_SKIN") {
    return (
      <div className="w-10 h-11 rounded-xl bg-stone-100 dark:bg-zinc-850 border border-stone-300 dark:border-zinc-700 flex items-center justify-center shrink-0 relative shadow-sm">
        <CircleDot className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        {item.id === "token_golden_crown" && (
          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400 absolute -top-1" />
        )}
        {item.id === "token_phoenix_wing" && (
          <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400 absolute -top-1" />
        )}
        {item.id === "token_diamond_elite" && (
          <Gem className="w-3 h-3 text-cyan-600 dark:text-cyan-300 absolute -top-1" />
        )}
      </div>
    );
  }

  if (category === "CARD_BACK") {
    const isUno = item.id.includes("uno");
    if (isUno) {
      const bg = getUnoCardBackConfig(item.id);
      return (
        <div
          className="w-8 h-11 rounded-lg border-2 flex items-center justify-center shadow-md shrink-0"
          style={{
            background: `linear-gradient(135deg, ${bg.bodyColor}, ${bg.ovalColor})`,
            borderColor: bg.edgeColor,
            color: bg.textColor,
          }}
        >
          <Layers className="w-4 h-4" />
        </div>
      );
    }
    const bg = getRummyCardBackConfig(item.id);
    return (
      <div
        className="w-8 h-11 rounded-lg border-2 flex items-center justify-center shadow-md shrink-0"
        style={{
          background: `linear-gradient(135deg, ${bg.stopColor1}, ${bg.stopColor2})`,
          borderColor: bg.accentColor,
          color: bg.accentColor,
        }}
      >
        <Layers className="w-4 h-4" />
      </div>
    );
  }

  if (category === "TABLE_THEME") {
    const theme = getTableThemeConfig(item.id);
    return (
      <div
        className={`w-12 h-9 rounded-lg border-2 flex items-center justify-center shadow-md shrink-0 ${theme.surfaceClass}`}
        style={theme.feltStyle}
      >
        <Palette className="w-4 h-4 text-white/70" />
      </div>
    );
  }

  // PODIUM_TITLE — no material registry (text-only cosmetic); rarity accent
  // color still ties it back to the shared token layer.
  return (
    <div className={`w-10 h-10 rounded-xl bg-amber-500/10 border flex items-center justify-center shrink-0 ${rarity.border}`}>
      {item.id === "title_grandmaster" ? (
        <Crown className="w-5 h-5 text-amber-400" />
      ) : (
        <Award className="w-5 h-5 text-amber-400" />
      )}
    </div>
  );
}
