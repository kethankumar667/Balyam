/**
 * BHALYAM — Cosmetics Collectible Tile Card
 *
 * Displays a cosmetic catalog item as an authentic collectible tile:
 * - Miniature visual preview thumbnail (table, dice, token, card back, aura, title).
 * - Full rarity identity & borders (COMMON, RARE, EPIC, LEGENDARY) kept distinct from selection.
 * - Restrained selection highlight (ring-1 ring-amber-400/80 with active preview indicator).
 * - Two-line title wrapping without truncate clipping.
 * - Single centralized CTA in preview panel (cards are purely selectable tiles).
 * - Deficit badge and progress bar without duplicate deficit sentences.
 * - Admin and Super Admin free access indicators (Crown FREE).
 * - Accessible >=44x44px interaction target with keyboard support.
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
} from "lucide-react";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
} from "@shared/cosmetics";
import { resolveCosmeticPresentationState } from "./presentationState";

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

  // Rarity styling — establishes the permanent collectible identity of the card
  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case "LEGENDARY":
        return {
          pill: "bg-amber-500/20 text-amber-400 border-amber-500/40",
          cardBorder: isSelected
            ? "border-amber-400/80 ring-1 ring-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] bg-[#121a30]"
            : "border-amber-500/30 hover:border-amber-400/60 bg-[#0d1322]/90",
        };
      case "EPIC":
        return {
          pill: "bg-purple-500/20 text-purple-300 border-purple-500/40",
          cardBorder: isSelected
            ? "border-purple-400/80 ring-1 ring-amber-400/80 shadow-[0_0_20px_rgba(168,85,247,0.25)] bg-[#121a30]"
            : "border-purple-500/30 hover:border-purple-400/60 bg-[#0d1322]/90",
        };
      case "RARE":
        return {
          pill: "bg-sky-500/20 text-sky-300 border-sky-500/40",
          cardBorder: isSelected
            ? "border-sky-400/80 ring-1 ring-amber-400/80 shadow-[0_0_20px_rgba(56,189,248,0.25)] bg-[#121a30]"
            : "border-sky-500/30 hover:border-sky-400/60 bg-[#0d1322]/90",
        };
      default:
        return {
          pill: "bg-zinc-800 text-zinc-400 border-zinc-700",
          cardBorder: isSelected
            ? "border-zinc-500/80 ring-1 ring-amber-400/80 shadow-[0_0_15px_rgba(255,255,255,0.1)] bg-[#121a30]"
            : "border-zinc-800 hover:border-zinc-700 bg-[#0d1322]/90",
        };
    }
  };

  const rarityStyle = getRarityBadge(item.rarity);

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
      aria-label={`Inspect ${item.name} in vault`}
      className={`group relative p-3.5 rounded-xl border-2 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer select-none min-h-[148px] ${rarityStyle.cardBorder}`}
    >
      {/* ── Top Header: Rarity & Current State Badge ── */}
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${rarityStyle.pill}`}>
          {item.rarity}
        </span>

        {/* Presentation State Badge */}
        {pres.state === "EQUIPPED" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
            <Check className="w-3 h-3 stroke-[3]" /> EQUIPPED
          </span>
        ) : pres.state === "EQUIPPING" || pres.state === "PURCHASING" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1 shrink-0">
            <RefreshCw className="w-3 h-3 animate-spin" /> {pres.badgeLabel}
          </span>
        ) : isAdminUser ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 shrink-0">
            <Crown className="w-3 h-3" /> FREE
          </span>
        ) : pres.state === "OWNED" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40 shrink-0">
            OWNED
          </span>
        ) : pres.state === "DEFAULT" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
            DEFAULT
          </span>
        ) : pres.state === "LOCKED" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3" /> Day 7
          </span>
        ) : pres.state === "AVAILABLE" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
            <Coins className="w-3 h-3 text-amber-400" />
            {item.priceCoins.toLocaleString()}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40 shrink-0">
            {pres.shortfall.toLocaleString()} SHORT
          </span>
        )}
      </div>

      {/* ── Middle: Miniature Visual Preview + Lore Name & Subtitle ── */}
      <div className="flex items-center gap-3">
        {/* Animated Miniature Preview Thumbnail */}
        <CollectibleThumbnail item={item} category={category} isSelected={isSelected} />

        {/* Text details: 2-line title wrapping without truncate */}
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-bold text-white tracking-tight leading-snug break-words line-clamp-2 min-h-[2.5rem] flex items-center group-hover:text-amber-300 transition-colors">
            {item.name}
          </h5>
          <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>
      </div>

      {/* ── Bottom: Progress Bar / Preview Status ── */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
        {pres.state === "INSUFFICIENT_BALANCE" ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
              <span className="text-rose-400 font-medium">Shortfall: {pres.shortfall.toLocaleString()}</span>
              <span className="font-mono text-zinc-500">{pres.progressText}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${pres.progressPercent}%` }}
              />
            </div>
          </div>
        ) : isSelected ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              Previewing in Vault
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Active
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors truncate">
              {pres.cardSubtext}
            </span>
            <span className="text-[10px] text-zinc-500 group-hover:text-amber-400/90 transition-colors shrink-0 font-medium">
              Preview &rarr;
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIATURE PREVIEW THUMBNAILS FOR COLLECTIBLE TILES
// ─────────────────────────────────────────────────────────────────────────────

function CollectibleThumbnail({
  item,
  category,
  isSelected,
}: {
  item: CosmeticCatalogItem;
  category: CosmeticCategory;
  isSelected: boolean;
}) {
  if (category === "AVATAR_AURA") {
    const ringColor =
      item.id === "aura_radiant_vanguard"
        ? "border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
        : item.id === "aura_ludo_king"
          ? "border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
          : item.id === "aura_rummy_maestro"
            ? "border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
            : "border-zinc-500";
    return (
      <div className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0">
        <div className={`absolute inset-0 rounded-full border-2 ${ringColor} ${isSelected ? "animate-spin [animation-duration:6s]" : ""}`} />
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center">
          <Orbit className="w-4 h-4 text-zinc-200" />
        </div>
      </div>
    );
  }

  if (category === "DICE_SKIN") {
    const diceStyle =
      item.id === "dice_wooden_teak"
        ? "bg-[#451a03] border-[#78350f] text-[#fde68a] shadow-[0_2px_8px_rgba(69,26,3,0.6)]"
        : item.id === "dice_golden_ember"
          ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]"
          : item.id === "dice_cyber_neon"
            ? "bg-zinc-950 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
            : "bg-zinc-100 border-zinc-300 text-zinc-800 shadow-sm";
    return (
      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shadow-md shrink-0 transition-transform ${isSelected ? "scale-105" : ""} ${diceStyle}`}>
        <Dice5 className="w-5 h-5 stroke-[2.5]" />
      </div>
    );
  }

  if (category === "TOKEN_SKIN") {
    return (
      <div className="w-10 h-11 rounded-xl bg-zinc-850 border border-zinc-700 flex items-center justify-center shrink-0 relative shadow-sm">
        <CircleDot className="w-5 h-5 text-amber-400" />
        {item.id === "token_golden_crown" && (
          <Crown className="w-3 h-3 text-amber-400 absolute -top-1" />
        )}
      </div>
    );
  }

  if (category === "CARD_BACK") {
    const cardBg =
      item.id === "cardback_vintage_velvet_rummy"
        ? "bg-gradient-to-br from-red-950 to-rose-900 border-amber-400 text-amber-300"
        : item.id === "cardback_neon_cyber_uno"
          ? "bg-gradient-to-br from-indigo-950 to-purple-950 border-cyan-400 text-cyan-300"
          : item.id === "cardback_classic_uno"
            ? "bg-red-600 border-white text-white"
            : "bg-blue-900 border-amber-200 text-amber-200";
    return (
      <div className={`w-8 h-11 rounded-lg border-2 flex items-center justify-center shadow-md shrink-0 ${cardBg}`}>
        <Layers className="w-4 h-4" />
      </div>
    );
  }

  if (category === "TABLE_THEME") {
    const tableBg =
      item.id === "table_crt_neon_90s"
        ? "bg-gradient-to-br from-indigo-950 to-purple-950 border-cyan-400"
        : item.id === "table_royal_mahogany"
          ? "bg-gradient-to-br from-amber-950 to-amber-900 border-amber-500"
          : item.id === "table_midnight_velvet"
            ? "bg-gradient-to-br from-slate-950 to-blue-950 border-blue-400"
            : "bg-gradient-to-br from-emerald-950 to-green-950 border-emerald-600";
    return (
      <div className={`w-12 h-9 rounded-lg border-2 flex items-center justify-center shadow-md shrink-0 ${tableBg}`}>
        <Palette className="w-4 h-4 text-white/70" />
      </div>
    );
  }

  // PODIUM_TITLE
  return (
    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shrink-0">
      {item.id === "title_grandmaster" ? (
        <Crown className="w-5 h-5 text-amber-400" />
      ) : (
        <Award className="w-5 h-5 text-amber-400" />
      )}
    </div>
  );
}
