/**
 * BHALYAM — Cosmetics Collectible Tile Card
 *
 * Displays a cosmetic catalog item as an authentic collectible tile:
 * - Miniature animated visual preview thumbnail (table, dice, token, card back, aura, title).
 * - Full rarity identity & borders (COMMON, RARE, EPIC, LEGENDARY).
 * - Distinct unmistakable card states: Available, Insufficient Balance (with deficit & progress),
 *   Owned, Equipped, and Inspected/Previewed.
 * - Admin and Super Admin free access indicators (Crown FREE).
 * - Accessible >=44x44px interaction target with subtle hover lift and inspection ring.
 */

import React from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
} from "@shared/cosmetics";

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
  onPurchase: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}

export function CosmeticsItemCard({
  item,
  category,
  scope,
  isSelected,
  isOwned,
  isEquipped,
  isSubmitting,
  walletBalance,
  isAdminUser,
  onSelect,
  onPurchase,
  onEquip,
  onUnequip,
}: CosmeticsItemCardProps) {
  const isDefault = item.unlockMethod === "DEFAULT";
  const isStreakUnlock = item.unlockMethod === "STREAK_MILESTONE";
  const effectiveOwned = isAdminUser || isDefault || isOwned;

  const priceCoins = item.priceCoins;
  const balanceBn = BigInt(walletBalance || "0");
  const priceBn = BigInt(priceCoins);
  const canAfford = balanceBn >= priceBn;
  const deficitBn = priceBn > balanceBn ? priceBn - balanceBn : 0n;
  const deficitFormatted = Number(deficitBn).toLocaleString();
  const progressPercent =
    priceCoins > 0
      ? Math.min(100, Math.max(0, Math.round((Number(balanceBn) / priceCoins) * 100)))
      : 100;

  // Rarity styling
  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case "LEGENDARY":
        return {
          pill: "bg-amber-500/20 text-amber-400 border-amber-500/40",
          cardBorder: isSelected
            ? "border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.3)] bg-[#11192e]"
            : "border-amber-500/30 hover:border-amber-400/60 bg-[#0d1322]",
        };
      case "EPIC":
        return {
          pill: "bg-purple-500/20 text-purple-300 border-purple-500/40",
          cardBorder: isSelected
            ? "border-purple-400 ring-2 ring-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.3)] bg-[#11192e]"
            : "border-purple-500/30 hover:border-purple-400/60 bg-[#0d1322]",
        };
      case "RARE":
        return {
          pill: "bg-sky-500/20 text-sky-300 border-sky-500/40",
          cardBorder: isSelected
            ? "border-sky-400 ring-2 ring-sky-400/50 shadow-[0_0_25px_rgba(56,189,248,0.3)] bg-[#11192e]"
            : "border-sky-500/30 hover:border-sky-400/60 bg-[#0d1322]",
        };
      default:
        return {
          pill: "bg-zinc-800 text-zinc-400 border-zinc-700",
          cardBorder: isSelected
            ? "border-zinc-400 ring-2 ring-zinc-400/40 shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-[#11192e]"
            : "border-zinc-800 hover:border-zinc-600 bg-[#0d1322]",
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
      className={`group relative p-3.5 rounded-xl border-2 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer select-none ${rarityStyle.cardBorder}`}
    >
      {/* ── Top Header: Rarity & Current State Badge ── */}
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${rarityStyle.pill}`}>
          {item.rarity}
        </span>

        {/* State Badge */}
        {isEquipped ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
            <Check className="w-3 h-3 stroke-[3]" /> EQUIPPED
          </span>
        ) : effectiveOwned ? (
          isAdminUser ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 shrink-0">
              <Crown className="w-3 h-3" /> FREE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40 shrink-0">
              OWNED
            </span>
          )
        ) : isStreakUnlock ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3" /> Day 7
          </span>
        ) : canAfford ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
            <Coins className="w-3 h-3 text-amber-400" />
            {priceCoins.toLocaleString()}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/40 shrink-0">
            Need {deficitFormatted}
          </span>
        )}
      </div>

      {/* ── Middle: Miniature Visual Preview + Lore Name & Subtitle ── */}
      <div className="flex items-center gap-3">
        {/* Animated Miniature Preview Thumbnail */}
        <CollectibleThumbnail item={item} category={category} isSelected={isSelected} />

        {/* Text details */}
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-amber-300 transition-colors">
            {item.name}
          </h5>
          <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>
      </div>

      {/* ── Bottom: Progress Bar (if insufficient) / Inspection Status & Actions ── */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
        {/* Left: Deficit progress or Inspection label */}
        <div className="flex-1 min-w-0">
          {!effectiveOwned && !canAfford ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="text-rose-400 font-medium">Deficit: {deficitFormatted}</span>
                <span className="font-mono text-zinc-500">
                  {Number(walletBalance || 0).toLocaleString()} / {priceCoins.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : isSelected ? (
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Inspecting
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
              Click to preview
            </span>
          )}
        </div>

        {/* Right: Direct 1-Click Action target (>=44x44px target) */}
        <div onClick={(e) => e.stopPropagation()}>
          {isEquipped ? (
            !isDefault ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onUnequip}
                aria-label={`Reset ${item.name}`}
                title="Restore default"
                className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3 text-zinc-400" />
                <span>Reset</span>
              </button>
            ) : (
              <span className="min-h-[44px] px-2 flex items-center text-xs font-bold text-zinc-500">
                Active
              </span>
            )
          ) : effectiveOwned ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onEquip}
              aria-label={`Equip ${item.name}`}
              className="min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-black transition flex items-center justify-center gap-1 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Equip</span>
            </button>
          ) : null}
        </div>
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
    const diceBg =
      item.id === "dice_golden_ember"
        ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
        : item.id === "dice_cyber_neon"
          ? "bg-zinc-950 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          : item.id === "dice_wooden_teak"
            ? "bg-amber-800 border-amber-950 text-amber-950"
            : "bg-white border-zinc-300 text-zinc-800";
    return (
      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shadow-md shrink-0 ${diceBg}`}>
        <Dice5 className="w-6 h-6" />
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
      <Crown className="w-5 h-5 text-amber-400" />
    </div>
  );
}
