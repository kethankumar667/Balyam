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

import React, { useId } from "react";
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
  Eye,
  Award,
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
  getTokenSkinConfig,
} from "../../lib/cosmeticsResolver";
import { PawnGlyph } from "../../games/ludo/PawnGlyph";
import { COLOR_HEX, COLOR_HEX_DARK } from "../../games/ludo/board-layout";

/** No real seat exists at shop-browse time — every token thumbnail/preview
 *  shows this one fixed "showcase" seat color so a purchased finish's own
 *  technique (not an arbitrary demo hue) is what the shopper compares. */
const TOKEN_SHOWCASE_COLOR = COLOR_HEX.blue;
const TOKEN_SHOWCASE_COLOR_DARK = COLOR_HEX_DARK.blue;

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
    ? `${rarity.borderSelected} ring-1 ring-amber-400/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:from-[#162035] dark:via-[#0c1222] dark:to-[#04060c] shadow-[0_20px_48px_-20px_rgba(245,158,11,0.65)] ${rarity.surfaceSelected}`
    : `${rarity.border} ${rarity.borderHover} bg-gradient-to-br from-white via-stone-50 to-amber-50/[0.25] dark:from-[#0e1526] dark:via-[#080d1a] dark:to-[#03050a] shadow-[0_12px_32px_-20px_rgba(0,0,0,0.6)]`;

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
      className={`group relative p-4 rounded-[22px] border flex flex-col justify-between gap-3.5
                  transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out
                  cursor-pointer select-none min-h-[148px] sm:min-h-[166px] overflow-hidden
                  motion-safe:hover:-translate-y-1 focus-visible:outline-hidden
                  focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
                  focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#080c16]
                  ${cardSurface}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(125,211,252,0.12),transparent_32%)] opacity-90" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.22]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:12px_12px]" />
      
      {/* Legendary light sweep sheen */}
      {rarity.particleTier >= 3 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px] motion-reduce:hidden"
        >
          <div className="absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-amber-400/20 dark:via-amber-300/15 to-transparent motion-safe:animate-cosmetic-sweep" />
        </div>
      )}

      {/* ── Top Header: Rarity & Current State Badge ── */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${rarity.badge}`}>
          {item.rarity}
        </span>

        {/* Presentation State Badge */}
        {pres.state === "EQUIPPED" ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50 border flex items-center gap-1 shrink-0 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.3)]">
            <Check className="w-3 h-3 stroke-[3]" /> EQUIPPED
          </span>
        ) : pres.state === "EQUIPPING" || pres.state === "PURCHASING" ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/50 border motion-safe:animate-pulse flex items-center gap-1 shrink-0 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.3)]">
            <RefreshCw className="w-3 h-3 motion-safe:animate-spin" /> {pres.badgeLabel}
          </span>
        ) : isAdminUser ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-200 to-yellow-300 text-stone-900 border border-amber-400/80 dark:from-amber-500/30 dark:to-yellow-500/20 dark:text-amber-300 dark:border-amber-400/50 flex items-center gap-1 shrink-0 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.35)]">
            <Crown className="w-3 h-3 text-amber-700 dark:text-amber-300" /> FREE
          </span>
        ) : pres.state === "OWNED" ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40 border shrink-0">
            OWNED
          </span>
        ) : pres.state === "DEFAULT" ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700 border-stone-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 border shrink-0">
            DEFAULT
          </span>
        ) : pres.state === "LOCKED" ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 border flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3" /> Day 7
          </span>
        ) : pres.state === "AVAILABLE" ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-100 text-amber-900 border-amber-300 dark:from-amber-500/20 dark:via-yellow-500/15 dark:to-amber-500/20 dark:text-amber-200 dark:border-amber-400/40 border flex items-center gap-1.5 shrink-0 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.25)]">
            <Coins className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            {item.priceCoins.toLocaleString()}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/50 border shrink-0">
            {pres.shortfall.toLocaleString()} SHORT
          </span>
        )}
      </div>

      {/* ── Middle: Velvet-Recessed Miniature Visual Preview + Lore Name & Subtitle ── */}
      <div className="flex items-center gap-3 relative z-10">
        {/* Recessed velvet jewelry display well */}
        <div className="relative p-1.5 rounded-2xl bg-stone-100 dark:bg-black/50 border border-stone-200/80 dark:border-white/10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)] flex items-center justify-center shrink-0">
          <CollectibleThumbnail item={item} category={category} isSelected={isSelected} rarity={item.rarity} />
        </div>

        {/* Text details: 2-line title wrapping without truncate */}
        <div className="flex-1 min-w-0">
          <h5 className={`text-[15px] font-black text-stone-950 dark:text-white tracking-tight leading-snug break-words line-clamp-2 min-h-[2.5rem] flex items-center transition-colors group-hover:${rarity.accentText}`}>
            {item.name}
          </h5>
          <p className="text-xs text-stone-600 dark:text-zinc-400 line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>
      </div>

      {/* ── Bottom: Progress Bar / Preview Status ── */}
      <div className="pt-3 border-t border-stone-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-xs relative z-10">
        {pres.state === "INSUFFICIENT_BALANCE" ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-zinc-400 mb-1">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">Shortfall: {pres.shortfall.toLocaleString()}</span>
              <span className="font-mono text-stone-500 dark:text-zinc-400 font-semibold">{pres.progressText}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-black/60 overflow-hidden border border-stone-300 dark:border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${pres.progressPercent}%` }}
              />
            </div>
          </div>
        ) : isSelected ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Previewing in Vault
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/50 dark:border-amber-400/40">
              Active
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-stone-500 dark:text-zinc-400 group-hover:text-stone-800 dark:group-hover:text-zinc-200 transition-colors truncate font-medium">
              {pres.cardSubtext}
            </span>
            <span className="text-[10px] text-stone-400 dark:text-zinc-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors shrink-0 font-bold">
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

export function CollectibleThumbnail({
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
    return <TokenSkinThumbnail skinId={item.id} isSelected={isSelected} />;
  }

  if (category === "CARD_BACK") {
    const isUno = item.id.includes("uno");
    if (isUno) {
      const bg = getUnoCardBackConfig(item.id);
      if (bg.kind === "image") {
        return (
          <img
            src={bg.imageSrc}
            alt=""
            className="w-8 h-11 rounded-lg border-2 border-stone-300 dark:border-zinc-700 object-cover shadow-md shrink-0"
          />
        );
      }
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
    if (bg.kind === "image") {
      return (
        <img
          src={bg.imageSrc}
          alt=""
          className="w-8 h-11 rounded-lg border-2 border-stone-300 dark:border-zinc-700 object-cover shadow-md shrink-0"
        />
      );
    }
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

/**
 * Renders the real `PawnGlyph` at the fixed showcase seat color — sourced
 * from the SAME registry Token.tsx renders from, so a premium finish's
 * craftsmanship actually shows here instead of a flat neutral circle. A
 * separate component (not a branch inline in `CollectibleThumbnail`) so
 * `useId()` can be called unconditionally at its own top level.
 */
export function TokenSkinThumbnail({ skinId, isSelected }: { skinId: string; isSelected: boolean }) {
  const uid = useId().replace(/:/g, "");
  const tokenSkin = getTokenSkinConfig(skinId);
  return (
    <div
      className={`w-10 h-11 rounded-xl bg-stone-100 dark:bg-zinc-850 border border-stone-300 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-sm transition-transform ${isSelected ? "scale-105" : ""}`}
    >
      <div className="w-8 h-9">
        <PawnGlyph
          main={TOKEN_SHOWCASE_COLOR}
          dark={TOKEN_SHOWCASE_COLOR_DARK}
          tokenSkin={tokenSkin}
          uid={uid}
        />
      </div>
    </div>
  );
}
