/**
 * BHALYAM — Cosmetics Boutique "Enchanted Display Vault" Preview Stage
 *
 * Polished artifact exhibition chamber with:
 * - Category-specific preview modes (Inspect, Roll Preview, In Game, etc.)
 * - High-fidelity 3D Dice materials (Teak Wood, Polished Ivory, Golden Ember, Cyber Neon)
 * - Presentation-only roll simulation isolated from gameplay RNG
 * - Pure static presentational in-game mockup (zero game engine or network calls)
 * - Unified single decisive CTA with safe deficit calculation
 * - Full WAI-ARIA tablist/tabpanel accessibility and prefers-reduced-motion support
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Coins,
  Check,
  RotateCw,
  Eye,
  Gamepad2,
  Trophy,
  Star,
  Grid,
  Gem,
  Flame,
} from "lucide-react";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
  getDefaultCosmetic,
} from "@shared/cosmetics";
import SeatAvatar from "../profile/SeatAvatar";
import { useRoomStore } from "../../store/roomStore";
import { bhalyamSpring } from "../../lib/motion";
import {
  type PreviewMode,
  PREVIEW_MODES_BY_CATEGORY,
} from "./previewModes";
import {
  resolveCosmeticPresentationState,
  type CosmeticPresentationResult,
} from "./presentationState";
import { getRarityTokens } from "./designTokens";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface CosmeticsPreviewStageProps {
  item: CosmeticCatalogItem | null;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
  previewMode: PreviewMode;
  onSelectPreviewMode: (mode: PreviewMode) => void;
  isEquipped: boolean;
  isOwned: boolean;
  isAdminUser: boolean;
  walletBalance: string;
  isSubmitting: boolean;
  onPurchase: (item: CosmeticCatalogItem) => void;
  onEquip: (item: CosmeticCatalogItem) => void;
  onUnequip: () => void;
}

export function CosmeticsPreviewStage({
  item,
  category,
  scope,
  previewMode,
  onSelectPreviewMode,
  isEquipped,
  isOwned,
  isAdminUser,
  walletBalance,
  isSubmitting,
  onPurchase,
  onEquip,
  onUnequip,
}: CosmeticsPreviewStageProps) {
  const { playerName, avatarId } = useRoomStore();
  const displayName = playerName.trim() || "Player";

  // Effective preview item (or category default if none selected)
  const previewItem: CosmeticCatalogItem = item ?? {
    id: getDefaultCosmetic(category, scope).id,
    category,
    name: "Standard Default",
    description: "Standard lounge default cosmetic.",
    priceCoins: 0,
    rarity: "COMMON",
    unlockMethod: "DEFAULT",
    isActive: true,
    displayOrder: 0,
  };
  const rarity = previewItem.rarity ?? "COMMON";

  // Compute deterministic presentation state
  const presentation: CosmeticPresentationResult =
    resolveCosmeticPresentationState({
      item: previewItem,
      isOwned,
      isEquipped,
      isAdminUser,
      walletBalance,
      isSubmitting,
    });

  // Available preview modes for this category
  const modeOptions = PREVIEW_MODES_BY_CATEGORY[category];

  // Rarity atmospheric illumination — shared token layer (designTokens.ts),
  // replacing a locally-duplicated copy of the same four-tier switch that
  // also lived in CosmeticsItemCard. `accent`/`pill`/`border`/`glow` names
  // are kept as local aliases so the JSX below reads unchanged.
  const rarityVisual = getRarityTokens(previewItem.rarity ?? "COMMON");
  const rarityTheme = {
    glow: rarityVisual.ambientGlow,
    border: rarityVisual.border,
    accent: rarityVisual.accentText,
    pill: rarityVisual.eyebrowPill,
    runeStroke: rarityVisual.runeStroke,
  };
  const prefersReducedMotionGlobal = useReducedMotion();

  return (
    <div
      className={`w-full flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-[#0e1424] via-[#090d18] to-[#05070d] border ${rarityTheme.border} shadow-2xl relative overflow-hidden min-h-[490px] transition-colors duration-500`}
    >
      {/* ── 1. Layer: Atmospheric Rarity Radial Glow ── */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_var(--tw-gradient-stops))] ${rarityTheme.glow} pointer-events-none transition-all duration-700`}
      />

      {/* ── 2. Layer: Rarity-Tiered Ambient Particle System ──
          COMMON gets nothing here — "no particles" per the rarity spec.
          RARE gets a handful of sparse shimmer motes. EPIC keeps the
          rotating rune compass (orbiting accents). LEGENDARY adds radiating
          light rays and a slow edge sweep on top of the compass. This is
          never the ONLY rarity signal — the border hue, eyebrow pill text,
          and accent color all still differ independently. Reduced motion
          keeps the geometry (a static decoration) but drops the spin/sweep. */}
      {rarityVisual.particleTier >= 1 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10" aria-hidden="true">
          <svg
            viewBox="0 0 400 400"
            className={`w-80 h-80 ${
              rarityVisual.particleTier >= 2 && !prefersReducedMotionGlobal
                ? "motion-safe:animate-spin [animation-duration:120s] [animation-timing-function:linear]"
                : ""
            }`}
          >
            {rarityVisual.particleTier >= 2 && (
              <>
                <circle cx="200" cy="200" r="160" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="1.5" strokeDasharray="4 8" />
                <circle cx="200" cy="200" r="120" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="1" strokeDasharray="2 12" />
                <polygon points="200,45 335,280 65,280" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="0.8" opacity="0.6" />
                <polygon points="200,355 65,120 335,120" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="0.8" opacity="0.6" />
              </>
            )}
            {/* RARE: sparse shimmer motes only (no full compass). */}
            {rarityVisual.particleTier === 1 && (
              <>
                <circle cx="140" cy="120" r="2.5" fill={rarityTheme.runeStroke} opacity="0.7" />
                <circle cx="280" cy="180" r="2" fill={rarityTheme.runeStroke} opacity="0.5" />
                <circle cx="220" cy="290" r="2.5" fill={rarityTheme.runeStroke} opacity="0.6" />
              </>
            )}
            {/* LEGENDARY: light rays radiating from the artifact's center. */}
            {rarityVisual.particleTier >= 3 && (
              <g stroke={rarityTheme.runeStroke} strokeWidth="1" opacity="0.35">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <line
                    key={deg}
                    x1="200"
                    y1="200"
                    x2={200 + 190 * Math.cos((deg * Math.PI) / 180)}
                    y2={200 + 190 * Math.sin((deg * Math.PI) / 180)}
                  />
                ))}
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Legendary-only animated edge sweep across the whole stage. */}
      {rarityVisual.particleTier >= 3 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden" aria-hidden="true">
          <div className="absolute -inset-y-16 -left-1/2 w-1/4 rotate-12 bg-gradient-to-r from-transparent via-amber-100/[0.06] to-transparent motion-safe:animate-cosmetic-sweep" />
        </div>
      )}

      {/* ── 3. Layer: Ground Pedestal Shadow ── */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-48 h-8 rounded-[100%] bg-black/60 blur-md pointer-events-none" />

      {/* ── Top Bar: Rarity Eyebrow + WAI-ARIA Category-Specific Tablist ── */}
      <div className="w-full flex items-center justify-between gap-2 z-10">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow-xs ${rarityTheme.pill}`}
        >
          {rarity}
        </span>

        {/* WAI-ARIA Tablist with arrow-key roving tabindex */}
        <div
          role="tablist"
          aria-label="Preview Context"
          className="flex items-center p-0.5 rounded-lg bg-black/60 border border-zinc-800 text-[11px] font-bold select-none"
        >
          {modeOptions.map((opt, idx) => {
            const Icon = opt.icon;
            const isActive = previewMode === opt.id;
            return (
              <button
                key={opt.id}
                id={`preview-tab-${opt.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`preview-panel-${opt.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelectPreviewMode(opt.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = modeOptions[(idx + 1) % modeOptions.length];
                    onSelectPreviewMode(next.id);
                    document
                      .getElementById(`preview-tab-${next.id}`)
                      ?.focus();
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prev =
                      modeOptions[
                        (idx - 1 + modeOptions.length) % modeOptions.length
                      ];
                    onSelectPreviewMode(prev.id);
                    document
                      .getElementById(`preview-tab-${prev.id}`)
                      ?.focus();
                  }
                }}
                aria-label={opt.accessibleLabel}
                className={`min-h-[32px] px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isActive
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="text-[11px] whitespace-nowrap">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Artifact Display Stage (WAI-ARIA Tabpanel) ── */}
      <div
        role="tabpanel"
        id={`preview-panel-${previewMode}`}
        aria-labelledby={`preview-tab-${previewMode}`}
        className="flex-1 flex flex-col items-center justify-center my-3 relative z-10 min-h-[220px]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${previewItem.id}-${previewMode}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={bhalyamSpring}
            className="flex flex-col items-center justify-center"
          >
            {category === "DICE_SKIN" && (
              <EnchantedDiceSkinPreview
                skinId={previewItem.id}
                mode={previewMode}
              />
            )}

            {category === "AVATAR_AURA" && (
              <EnchantedAvatarAuraPreview
                auraId={previewItem.id}
                mode={previewMode}
                displayName={displayName}
                avatarId={avatarId}
              />
            )}

            {category === "TOKEN_SKIN" && (
              <EnchantedTokenSkinPreview
                skinId={previewItem.id}
                mode={previewMode}
              />
            )}

            {category === "CARD_BACK" && (
              <EnchantedCardBackPreview
                cardId={previewItem.id}
                mode={previewMode}
                scope={scope}
              />
            )}

            {category === "TABLE_THEME" && (
              <EnchantedTableThemePreview
                skinId={previewItem.id}
                mode={previewMode}
              />
            )}

            {category === "PODIUM_TITLE" && (
              <EnchantedPodiumTitlePreview
                skinId={previewItem.id}
                titleName={previewItem.name}
                displayName={displayName}
                mode={previewMode}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Lore Narrative & Single Unified CTA ── */}
      <div className="flex flex-col gap-3 z-10">
        {/* Lore Typography */}
        <div className="flex flex-col gap-1 border-t border-zinc-800/80 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${rarityTheme.accent}`}
            >
              {rarity} • {category.replace("_", " ")}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              {previewItem.priceCoins > 0
                ? `${previewItem.priceCoins.toLocaleString()} Coins`
                : "Free Default"}
            </span>
          </div>
          <h4 className="text-base font-extrabold text-white tracking-tight leading-snug">
            {previewItem.name}
          </h4>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {previewItem.description}
          </p>
        </div>

        {/* Financial Context & Deficit Calculation */}
        <div className="flex flex-col gap-1.5 bg-black/40 border border-zinc-800/80 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Balance:</span>
              <strong className="font-mono text-zinc-200">
                {presentation.safeBalance.toLocaleString()} Coins
              </strong>
            </div>

            {/* Exactly ONE full shortfall sentence (Deduplication Rule) */}
            {presentation.state === "INSUFFICIENT_BALANCE" && (
              <span className="text-rose-400 font-bold text-xs">
                Need {presentation.shortfall.toLocaleString()} more Coins
              </span>
            )}

            {presentation.state === "AVAILABLE" && (
              <span className="text-emerald-400 font-bold text-xs">
                Sufficient funds
              </span>
            )}
          </div>

          {/* Progress bar for unowned items */}
          {!isOwned &&
            !isAdminUser &&
            previewItem.unlockMethod !== "DEFAULT" && (
              <div className="w-full flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      presentation.state === "INSUFFICIENT_BALANCE"
                        ? "bg-gradient-to-r from-amber-500 to-rose-500"
                        : "bg-gradient-to-r from-amber-400 to-emerald-400"
                    }`}
                    style={{ width: `${presentation.progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                  {presentation.progressText}
                </span>
              </div>
            )}
        </div>

        {/* ── Single Decisive Action Button ── */}
        <div className="w-full">
          {presentation.state === "EQUIPPED" ? (
            presentation.canEquip || isEquipped ? (
              previewItem.unlockMethod !== "DEFAULT" ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onUnequip}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>EQUIPPED (Click to Reset Default)</span>
                </button>
              ) : (
                <div className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-2 select-none">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>EQUIPPED AS DEFAULT</span>
                </div>
              )
            ) : null
          ) : presentation.canEquip ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onEquip(previewItem)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-extrabold text-xs bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.99] text-black shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{presentation.ctaLabel}</span>
            </button>
          ) : presentation.canPurchase ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onPurchase(previewItem)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-extrabold text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.99] text-black shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              <span>{presentation.ctaLabel}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-extrabold text-xs bg-zinc-900 text-zinc-500 border border-zinc-800 flex items-center justify-center gap-2 cursor-not-allowed select-none"
            >
              <span>{presentation.ctaLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENCHANTED 3D DICE SKIN PREVIEW (136x136px, Tactile Materials, 3 Modes)
// ─────────────────────────────────────────────────────────────────────────────

interface DiceFaceProps {
  value: number;
  skinId: string;
  pipClass: string;
}

function DiceFacePipGrid({ value, skinId, pipClass }: DiceFaceProps) {
  // Return standard pip positions for 1-6
  const pips = [];
  const isOne = value === 1;
  const isTwo = value === 2;
  const isThree = value === 3;
  const isFour = value === 4;
  const isFive = value === 5;
  const isSix = value === 6;

  // Dot 1: Top-Left
  if (isTwo || isThree || isFour || isFive || isSix) {
    pips.push(
      <span
        key="tl"
        className={`w-3.5 h-3.5 rounded-full col-start-1 row-start-1 ${pipClass}`}
      />,
    );
  }
  // Dot 2: Top-Right
  if (isFour || isFive || isSix) {
    pips.push(
      <span
        key="tr"
        className={`w-3.5 h-3.5 rounded-full col-start-3 row-start-1 ${pipClass}`}
      />,
    );
  }
  // Dot 3: Center-Left
  if (isSix) {
    pips.push(
      <span
        key="cl"
        className={`w-3.5 h-3.5 rounded-full col-start-1 row-start-2 ${pipClass}`}
      />,
    );
  }
  // Dot 4: Center
  if (isOne || isThree || isFive) {
    pips.push(
      <span
        key="cc"
        className={`w-3.5 h-3.5 rounded-full col-start-2 row-start-2 ${pipClass} ${
          isOne && skinId === "dice_classic_ivory"
            ? "scale-125 !bg-red-600"
            : ""
        }`}
      />,
    );
  }
  // Dot 5: Center-Right
  if (isSix) {
    pips.push(
      <span
        key="cr"
        className={`w-3.5 h-3.5 rounded-full col-start-3 row-start-2 ${pipClass}`}
      />,
    );
  }
  // Dot 6: Bottom-Left
  if (isFour || isFive || isSix) {
    pips.push(
      <span
        key="bl"
        className={`w-3.5 h-3.5 rounded-full col-start-1 row-start-3 ${pipClass}`}
      />,
    );
  }
  // Dot 7: Bottom-Right
  if (isTwo || isThree || isFour || isFive || isSix) {
    pips.push(
      <span
        key="br"
        className={`w-3.5 h-3.5 rounded-full col-start-3 row-start-3 ${pipClass}`}
      />,
    );
  }

  return (
    <div className="w-20 h-20 grid grid-cols-3 grid-rows-3 p-1.5 items-center justify-items-center">
      {pips}
    </div>
  );
}

function EnchantedDiceSkinPreview({
  skinId,
  mode,
}: {
  skinId: string;
  mode: PreviewMode;
}) {
  const [rollFace, setRollFace] = useState(5);
  const [isTumbling, setIsTumbling] = useState(false);
  const tumbleIntervalRef = useRef<number | null>(null);

  // Reactive reduced-motion preference — a live OS-level toggle mid-session
  // now actually takes effect, unlike the one-off matchMedia snapshot this
  // replaced (computed once per render, never updated again).
  const prefersReducedMotion = useReducedMotion();

  // Dice visual material styles
  const getDiceMaterial = (id: string) => {
    switch (id) {
      case "dice_wooden_teak":
        return {
          container:
            "bg-gradient-to-br from-[#8B4513] via-[#5C2E0B] to-[#3B1E08] border-[3.5px] border-[#2A1406] shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),inset_0_-3px_6px_rgba(0,0,0,0.85),0_16px_35px_rgba(0,0,0,0.75)]",
          pip: "bg-[#1A0A02] shadow-[inset_0_2px_3px_rgba(0,0,0,0.95)] border border-[#3A1804]",
          grain: true,
          aura: "shadow-[0_0_25px_rgba(180,83,9,0.3)]",
        };
      case "dice_golden_ember":
        return {
          container:
            "bg-gradient-to-br from-[#FDE047] via-[#D97706] to-[#78350F] border-[3px] border-[#FEF08A] shadow-[inset_0_3px_6px_rgba(255,255,255,0.7),inset_0_-3px_6px_rgba(0,0,0,0.6),0_0_35px_rgba(245,158,11,0.5)]",
          pip: "bg-[#451A03] shadow-[0_0_8px_rgba(245,158,11,0.8)] border border-amber-950",
          grain: false,
          aura: "shadow-[0_0_35px_rgba(245,158,11,0.6)]",
        };
      case "dice_cyber_neon":
        return {
          container:
            "bg-gradient-to-br from-[#18181B] via-[#09090B] to-[#000000] border-[2.5px] border-cyan-400 shadow-[inset_0_1px_4px_rgba(6,182,212,0.6),0_0_30px_rgba(6,182,212,0.4)]",
          pip: "bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1),0_0_18px_rgba(6,182,212,0.6)] border border-cyan-200",
          grain: false,
          aura: "shadow-[0_0_35px_rgba(6,182,212,0.4)]",
        };
      case "dice_sapphire_frost":
        return {
          container:
            "bg-gradient-to-br from-[#DBEAFE] via-[#3B82F6] to-[#1E3A8A] border-[3px] border-[#93C5FD] shadow-[inset_0_3px_6px_rgba(255,255,255,0.6),inset_0_-3px_6px_rgba(0,0,0,0.4),0_0_35px_rgba(59,130,246,0.5)]",
          pip: "bg-[#EFF6FF] shadow-[0_0_8px_rgba(191,219,254,0.9)] border border-blue-200",
          grain: false,
          aura: "shadow-[0_0_35px_rgba(59,130,246,0.55)]",
        };
      case "dice_dragon_scale":
        return {
          container:
            "bg-gradient-to-br from-[#292524] via-[#0C0A09] to-[#000000] border-[3px] border-[#B91C1C] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-3px_6px_rgba(0,0,0,0.9),0_0_35px_rgba(239,68,68,0.5)]",
          pip: "bg-gradient-to-br from-orange-500 to-red-800 shadow-[0_0_10px_rgba(239,68,68,0.9)] border border-red-950",
          grain: false,
          aura: "shadow-[0_0_40px_rgba(239,68,68,0.6)]",
        };
      default:
        // dice_classic_ivory
        return {
          container:
            "bg-gradient-to-br from-[#FFFFFF] via-[#F4F4F5] to-[#D4D4D8] border-[3px] border-[#A1A1AA] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.25),0_16px_32px_rgba(0,0,0,0.5)]",
          pip: "bg-[#18181B] shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.8)]",
          grain: false,
          aura: "shadow-[0_8px_25px_rgba(0,0,0,0.4)]",
        };
    }
  };

  const mat = getDiceMaterial(skinId);

  // Presentation-only roll preview trigger
  const triggerPresentationRoll = () => {
    if (isTumbling) return;
    setIsTumbling(true);
    let step = 0;
    const sequence = [2, 4, 1, 6, 3, 5, (Math.floor(Math.random() * 6) + 1)];
    tumbleIntervalRef.current = window.setInterval(() => {
      step++;
      if (step < sequence.length) {
        setRollFace(sequence[step]);
      } else {
        if (tumbleIntervalRef.current) clearInterval(tumbleIntervalRef.current);
        setIsTumbling(false);
      }
    }, 140);
  };

  useEffect(() => {
    if (mode === "ROLL_PREVIEW" && !prefersReducedMotion) {
      triggerPresentationRoll();
    }
    return () => {
      if (tumbleIntervalRef.current) clearInterval(tumbleIntervalRef.current);
    };
  }, [mode]);

  // Mode 1: IN_GAME Preview (Static presentational mockup, zero engine or network code)
  if (mode === "IN_GAME") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Static Mini Board Felt Mockup */}
        <div className="w-64 h-36 rounded-2xl bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 border-2 border-emerald-600/40 relative overflow-hidden flex items-center justify-center shadow-2xl">
          {/* Subtle felt texture lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          {/* Table track borders */}
          <div className="absolute inset-2 rounded-xl border border-dashed border-emerald-500/30 pointer-events-none" />

          {/* Tokens at corners */}
          <div className="absolute top-3 left-3 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-md" />
          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-md" />
          <div className="absolute bottom-3 left-3 w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-md" />
          <div className="absolute bottom-3 right-3 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-md" />

          {/* Dice placed in center of felt */}
          <div className="relative z-10 scale-75">
            <div
              className={`w-28 h-28 rounded-2xl flex items-center justify-center relative ${mat.container} ${mat.aura}`}
            >
              <DiceFacePipGrid
                value={6}
                skinId={skinId}
                pipClass={mat.pip}
              />
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono tracking-wider text-emerald-400/80 uppercase mt-2">
          In-Match Table Surface View
        </span>
      </div>
    );
  }

  // Mode 2: ROLL_PREVIEW (Presentation-only visual roll animation)
  if (mode === "ROLL_PREVIEW") {
    return (
      <div className="flex flex-col items-center justify-center">
        <motion.div
          animate={
            isTumbling && !prefersReducedMotion
              ? {
                  rotateX: [0, 90, 180, 270, 360],
                  rotateY: [0, -90, -180, -270, -360],
                  scale: [1, 1.1, 0.95, 1.05, 1],
                }
              : { rotateX: 12, rotateY: -15 }
          }
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className={`w-32 h-32 rounded-3xl flex items-center justify-center relative cursor-pointer select-none ${mat.container} ${mat.aura}`}
          style={{ transformStyle: "preserve-3d" }}
          onClick={triggerPresentationRoll}
        >
          {mat.grain && (
            <div className="absolute inset-0 rounded-3xl opacity-25 bg-[radial-gradient(circle_at_25%_25%,_rgba(255,255,255,0.4)_0%,_transparent_60%)] pointer-events-none" />
          )}
          <DiceFacePipGrid
            value={rollFace}
            skinId={skinId}
            pipClass={mat.pip}
          />
        </motion.div>

        {/* Contact Shadow */}
        <div className="w-28 h-3 rounded-[100%] bg-black/70 blur-sm mt-2" />

        {/* Interactive Roll Again CTA */}
        <button
          type="button"
          onClick={triggerPresentationRoll}
          disabled={isTumbling}
          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RotateCw
            className={`w-3 h-3 text-amber-400 ${
              isTumbling ? "animate-spin" : ""
            }`}
          />
          <span>{isTumbling ? "Rolling..." : "Roll Again"}</span>
        </button>
        <span className="text-[9px] font-mono text-zinc-500 mt-1">
          Visual Preview Only • Independent of game RNG
        </span>
      </div>
    );
  }

  // Mode 3: INSPECT (Default, 136x136px Large 3D Tilt Dice Showcase)
  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        animate={
          prefersReducedMotion
            ? { rotateX: 12, rotateY: -12 }
            : {
                rotateX: [10, 18, 5, 10],
                rotateY: [-15, 15, -20, -15],
              }
        }
        transition={{
          repeat: Infinity,
          duration: 7,
          ease: "easeInOut",
        }}
        className={`w-34 h-34 sm:w-36 sm:h-36 rounded-3xl flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none ${mat.container} ${mat.aura}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Wood grain pattern overlay for Teak */}
        {mat.grain && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none opacity-30 mix-blend-overlay">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="15"
                cy="15"
                r="30"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                opacity="0.4"
              />
              <circle
                cx="15"
                cy="15"
                r="50"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
                opacity="0.3"
              />
              <circle
                cx="15"
                cy="15"
                r="70"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.8"
                opacity="0.2"
              />
            </svg>
          </div>
        )}

        <DiceFacePipGrid
          value={5}
          skinId={skinId}
          pipClass={mat.pip}
        />
      </motion.div>

      {/* Ground Contact Shadow */}
      <div className="w-32 h-4 rounded-[100%] bg-black/75 blur-md mt-3" />
      <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase mt-1">
        3D Tactile Material Inspection
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ENCHANTED AVATAR AURA PREVIEW (Profile, Game Seat, Podium)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedAvatarAuraPreview({
  auraId,
  mode,
  displayName,
  avatarId,
}: {
  auraId: string;
  mode: PreviewMode;
  displayName: string;
  avatarId: string | null;
}) {
  const getAuraStyle = (id: string) => {
    switch (id) {
      case "aura_radiant_vanguard":
        return {
          glow: "from-amber-400/40 via-yellow-500/20 to-transparent",
          coreRing: "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.9)]",
          ringColor: "#f59e0b",
        };
      case "aura_ludo_king":
        return {
          glow: "from-rose-500/40 via-red-600/20 to-transparent",
          coreRing: "border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.9)]",
          ringColor: "#f43f5e",
        };
      case "aura_rummy_maestro":
        return {
          glow: "from-emerald-400/40 via-green-500/20 to-transparent",
          coreRing: "border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.9)]",
          ringColor: "#34d399",
        };
      default:
        return {
          glow: "from-zinc-500/20 via-zinc-700/10 to-transparent",
          coreRing: "border-zinc-500 shadow-md",
          ringColor: "#71717a",
        };
    }
  };

  const style = getAuraStyle(auraId);

  // Mode: GAME_SEAT
  if (mode === "GAME_SEAT") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-56 h-36 rounded-2xl bg-[#0b1220] border-2 border-zinc-700/80 relative flex flex-col items-center justify-center p-3 shadow-xl">
          <div className="absolute top-2 left-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
              Seat 1
            </span>
          </div>
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full overflow-hidden border-2 ${style.coreRing} bg-zinc-900 shadow-lg`}
            >
              <SeatAvatar
                avatar={avatarId ?? undefined}
                name={displayName}
                className="w-full h-full"
              />
            </div>
          </div>
          <span className="text-xs font-bold text-white mt-1.5">
            {displayName}
          </span>
          <div className="w-24 h-1 rounded-full bg-amber-400/70 mt-1" />
        </div>
      </div>
    );
  }

  // Mode: PODIUM
  if (mode === "PODIUM") {
    return (
      <div className="flex flex-col items-center justify-center">
        <Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] -mb-2 z-20" />
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full overflow-hidden border-3 ${style.coreRing} bg-zinc-900 shadow-2xl relative z-10`}
          >
            <SeatAvatar
              avatar={avatarId ?? undefined}
              name={displayName}
              className="w-full h-full"
            />
          </div>
          <Star className="w-5 h-5 text-amber-300 fill-amber-300 absolute -top-1 -right-2 animate-bounce z-20" />
        </div>
        <div className="w-32 py-1.5 mt-1 rounded-t-lg bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 text-black text-center font-black text-xs shadow-lg shadow-amber-500/30">
          #1 WINNER
        </div>
        <div className="w-40 h-2 bg-amber-800 rounded-b-md shadow-md" />
      </div>
    );
  }

  // Mode: PROFILE (Default)
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {/* Outer pulsing radiance halo */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${style.glow} blur-xl animate-pulse`}
      />

      {/* Rotating celestial rune ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full animate-spin [animation-duration:24s] [animation-timing-function:linear]"
          aria-hidden="true"
        >
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke={style.ringColor}
            strokeWidth="1.5"
            strokeDasharray="6 8"
            opacity="0.8"
          />
          <circle
            cx="80"
            cy="80"
            r="74"
            fill="none"
            stroke={style.ringColor}
            strokeWidth="1"
            strokeDasharray="2 6"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* 2x Scale Avatar with Core Aura Ring */}
      <div
        className={`w-28 h-28 rounded-full overflow-hidden border-4 ${style.coreRing} bg-zinc-900 shadow-2xl relative z-10`}
      >
        <SeatAvatar
          avatar={avatarId ?? undefined}
          name={displayName}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENCHANTED TOKEN SKIN PREVIEW (Inspect, Home Base, On Board)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedTokenSkinPreview({
  skinId,
  mode,
}: {
  skinId: string;
  mode: PreviewMode;
}) {
  const isCrown = skinId === "token_golden_crown";
  const isFireball = skinId === "token_fireball_ludo";
  const isNeon = skinId === "token_neon_ring";
  const isDiamond = skinId === "token_diamond_elite";
  const isPhoenix = skinId === "token_phoenix_wing";

  if (mode === "HOME_BASE") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Yard Mockup */}
        <div className="w-44 h-44 rounded-full bg-amber-950/40 border-4 border-amber-500/40 p-3 grid grid-cols-2 grid-rows-2 gap-3 items-center justify-items-center shadow-2xl relative">
          <div className="w-8 h-8 rounded-full bg-amber-500/80 border-2 border-white flex items-center justify-center shadow-md">
            {isCrown && <Crown className="w-4 h-4 text-amber-950" />}
            {isDiamond && <Gem className="w-4 h-4 text-white" />}
            {isPhoenix && <Flame className="w-4 h-4 text-white" />}
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/80 border-2 border-white flex items-center justify-center shadow-md">
            {isCrown && <Crown className="w-4 h-4 text-amber-950" />}
            {isDiamond && <Gem className="w-4 h-4 text-white" />}
            {isPhoenix && <Flame className="w-4 h-4 text-white" />}
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/80 border-2 border-white flex items-center justify-center shadow-md">
            {isCrown && <Crown className="w-4 h-4 text-amber-950" />}
            {isDiamond && <Gem className="w-4 h-4 text-white" />}
            {isPhoenix && <Flame className="w-4 h-4 text-white" />}
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/80 border-2 border-white flex items-center justify-center shadow-md">
            {isCrown && <Crown className="w-4 h-4 text-amber-950" />}
            {isDiamond && <Gem className="w-4 h-4 text-white" />}
            {isPhoenix && <Flame className="w-4 h-4 text-white" />}
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-2">
          Home Base Yard View
        </span>
      </div>
    );
  }

  if (mode === "ON_BOARD") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Track Step Mockup */}
        <div className="flex items-center gap-2 bg-zinc-900/90 p-3 rounded-2xl border border-zinc-700 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-500 text-xs font-mono font-bold">
            24
          </div>
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg relative">
            <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-md">
              {isCrown && <Crown className="w-4 h-4 text-amber-950" />}
              {isFireball && <div className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />}
              {isNeon && <div className="w-5 h-5 rounded-full border border-cyan-300" />}
              {isDiamond && <Gem className="w-4 h-4 text-cyan-100" />}
              {isPhoenix && <Flame className="w-4 h-4 text-orange-100" />}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-500 text-xs font-mono font-bold">
            26
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-2">
          Board Track Movement View
        </span>
      </div>
    );
  }

  // INSPECT (Default)
  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative flex flex-col items-center justify-center">
        {isCrown && (
          <Crown className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.9)] mb-1" />
        )}
        {isFireball && (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 via-orange-500 to-yellow-400 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.9)] mb-1" />
        )}
        {isNeon && (
          <div className="w-12 h-12 rounded-full border-4 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,1)] mb-1" />
        )}
        {isDiamond && (
          <div className="w-12 h-12 flex items-center justify-center mb-1">
            <Gem className="w-11 h-11 text-cyan-200 drop-shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
          </div>
        )}
        {isPhoenix && (
          <div className="w-12 h-12 flex items-center justify-center mb-1">
            <Flame className="w-11 h-11 text-orange-400 animate-pulse drop-shadow-[0_0_20px_rgba(251,146,60,0.9)]" />
          </div>
        )}

        {/* Sculpted Pawn Base */}
        <div className="w-20 h-28 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 rounded-t-full rounded-b-2xl border-2 border-amber-300 shadow-2xl flex flex-col items-center justify-end pb-2">
          <div className="w-16 h-3 rounded-full bg-amber-900/60" />
        </div>
      </div>
      <div className="w-24 h-4 rounded-[100%] bg-black/60 blur-md mt-2" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ENCHANTED CARD BACK PREVIEW (Card Back, Draw Pile, In Hand)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedCardBackPreview({
  cardId,
  mode,
  scope,
}: {
  cardId: string;
  mode: PreviewMode;
  scope: CosmeticGameScope;
}) {
  const getCardDesign = (id: string) => {
    switch (id) {
      case "cardback_neon_cyber_uno":
        return {
          bg: "bg-zinc-950 border-cyan-400 text-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.5)]",
          pattern: "CYBER",
          badge: "bg-cyan-500/20 text-cyan-300 border border-cyan-400",
        };
      case "cardback_vintage_velvet_rummy":
        return {
          bg: "bg-gradient-to-br from-red-950 via-red-900 to-black border-amber-500/60 text-amber-400 shadow-[0_0_30px_rgba(185,28,28,0.5)]",
          pattern: "VELVET",
          badge: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
        };
      case "cardback_royal_sapphire_rummy":
        return {
          bg: "bg-gradient-to-br from-blue-900 via-blue-950 to-black border-slate-300/60 text-slate-200 shadow-[0_0_30px_rgba(30,58,138,0.5)]",
          pattern: "SAPPHIRE",
          badge: "bg-slate-500/20 text-slate-200 border border-slate-300/40",
        };
      case "cardback_dragon_ember_uno":
        return {
          bg: "bg-gradient-to-br from-orange-700 via-red-900 to-black border-orange-400/70 text-orange-300 shadow-[0_0_35px_rgba(234,88,12,0.55)]",
          pattern: "EMBER",
          badge: "bg-orange-500/20 text-orange-300 border border-orange-400/40",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-rose-600 via-red-700 to-rose-900 border-white text-white shadow-2xl",
          pattern: "UNO",
          badge: "bg-black/30 text-white border border-white/40",
        };
    }
  };

  const style = getCardDesign(cardId);

  if (mode === "DRAW_PILE") {
    return (
      <div className="relative flex flex-col items-center justify-center">
        {/* Stacked Deck Layers */}
        <div className="w-28 h-40 rounded-xl bg-zinc-800 border border-zinc-700 absolute -top-2 left-2 shadow-md rotate-3" />
        <div className="w-28 h-40 rounded-xl bg-zinc-800 border border-zinc-700 absolute -top-1 left-1 shadow-md rotate-1" />
        <div
          className={`w-28 h-40 rounded-xl border-3 flex flex-col items-center justify-center relative shadow-2xl ${style.bg}`}
        >
          <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${style.badge}`}>
            {style.pattern}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-3">
          Draw Pile Deck View
        </span>
      </div>
    );
  }

  if (mode === "IN_HAND") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center h-44 w-52">
          {/* Card 1 */}
          <div
            className={`w-24 h-36 rounded-xl border-2 flex items-center justify-center absolute left-2 -rotate-12 shadow-xl ${style.bg}`}
          >
            <span className="text-[10px] font-black">{style.pattern}</span>
          </div>
          {/* Card 2 */}
          <div
            className={`w-24 h-36 rounded-xl border-2 flex items-center justify-center absolute z-10 shadow-2xl ${style.bg}`}
          >
            <span className="text-xs font-black">{style.pattern}</span>
          </div>
          {/* Card 3 */}
          <div
            className={`w-24 h-36 rounded-xl border-2 flex items-center justify-center absolute right-2 rotate-12 shadow-xl ${style.bg}`}
          >
            <span className="text-[10px] font-black">{style.pattern}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-1">
          Fanned Player Hand View
        </span>
      </div>
    );
  }

  // CARD_BACK (Default)
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`w-32 h-44 rounded-2xl border-3 flex flex-col items-center justify-center relative shadow-2xl ${style.bg}`}
      >
        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${style.badge}`}>
          {style.pattern}
        </span>
        <div className="w-20 h-28 mt-2 rounded-lg border border-dashed border-white/20 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/50 uppercase">BHALYAM</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ENCHANTED TABLE THEME PREVIEW (Full Table, Player View, Mobile View)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedTableThemePreview({
  skinId,
  mode,
}: {
  skinId: string;
  mode: PreviewMode;
}) {
  const getThemeClass = (id: string) => {
    switch (id) {
      case "table_royal_mahogany":
        return "bg-gradient-to-br from-amber-950 via-yellow-950 to-stone-950 border-amber-700 shadow-[0_0_35px_rgba(180,83,9,0.4)]";
      case "table_crt_neon_90s":
        return "bg-gradient-to-br from-zinc-950 via-purple-950 to-cyan-950 border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.4)]";
      case "table_midnight_velvet":
        return "bg-gradient-to-br from-blue-950 via-indigo-950 to-black border-indigo-600 shadow-[0_0_35px_rgba(79,70,229,0.3)]";
      default:
        return "bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 border-emerald-600 shadow-[0_0_35px_rgba(16,185,129,0.3)]";
    }
  };

  if (mode === "MOBILE_VIEW") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Smartphone mockup */}
        <div className="w-32 h-44 rounded-3xl border-3 border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl relative">
          <div className="w-10 h-1.5 bg-zinc-800 rounded-full mx-auto mb-1" />
          <div
            className={`w-full h-[140px] rounded-2xl border flex flex-col items-center justify-center ${getThemeClass(
              skinId,
            )}`}
          >
            <Grid className="w-5 h-5 text-white/40" />
            <span className="text-[8px] font-mono text-white/50 uppercase mt-1">
              Mobile Table
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "PLAYER_VIEW") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Player close-up view */}
        <div
          className={`w-64 h-36 rounded-2xl border-3 flex flex-col items-center justify-between p-3 relative overflow-hidden shadow-2xl ${getThemeClass(
            skinId,
          )}`}
        >
          <div className="w-full flex items-center justify-between text-[10px] text-white/60 font-mono">
            <span>Opponent Seat</span>
            <span>Pot: 500 Coins</span>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-11 rounded bg-black/40 border border-white/20" />
            <div className="w-8 h-11 rounded bg-black/40 border border-white/20" />
            <div className="w-8 h-11 rounded bg-black/40 border border-white/20" />
          </div>
          <span className="text-[10px] font-bold text-white/80">Your Hand</span>
        </div>
      </div>
    );
  }

  // FULL_TABLE (Default)
  return (
    <div
      className={`w-64 h-36 rounded-2xl border-4 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl ${getThemeClass(
        skinId,
      )}`}
    >
      <div className="w-32 h-20 rounded-xl border border-dashed border-white/25 flex flex-col items-center justify-center">
        <Grid className="w-6 h-6 text-white/50 animate-pulse" />
        <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase mt-1">
          FELT MAT
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ENCHANTED PODIUM TITLE PREVIEW (Profile, Lobby, Podium)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedPodiumTitlePreview({
  skinId,
  titleName,
  displayName,
  mode,
}: {
  skinId: string;
  titleName: string;
  displayName: string;
  mode: PreviewMode;
}) {
  if (mode === "LOBBY") {
    return (
      <div className="w-60 bg-zinc-900/90 border border-zinc-700/80 rounded-xl p-3 flex items-center gap-3 shadow-xl">
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
          <Crown className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate">
            {displayName}
          </div>
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {titleName}
          </span>
        </div>
      </div>
    );
  }

  if (mode === "PODIUM") {
    return (
      <div className="flex flex-col items-center justify-center">
        <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] mb-1" />
        <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/30">
          {titleName}
        </div>
        <div className="w-32 h-6 mt-2 rounded-t-lg bg-amber-800 text-amber-200 text-center text-[10px] font-bold py-1">
          #1 CHAMPION
        </div>
      </div>
    );
  }

  // PROFILE (Default)
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
      <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)] flex flex-col items-center">
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
          AWARDED TITLE
        </span>
        <span className="text-sm font-black text-amber-300 uppercase tracking-wide mt-0.5">
          {titleName}
        </span>
      </div>
    </div>
  );
}
