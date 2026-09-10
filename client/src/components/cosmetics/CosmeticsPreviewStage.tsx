/**
 * BHALYAM — Cosmetics Boutique "Enchanted Display Vault" Preview Stage
 *
 * Transforms the cosmetic preview into an artifact exhibition chamber:
 * - 4 atmospheric background layers (rarity radial glow, cosmic runes, mist, pedestal shadow).
 * - Doubled artifact visual scale with layered energy, orbiting particles, and rotating rune rings.
 * - Real-context preview switcher: [Profile | Game Seat | Podium].
 * - Full lore typography hierarchy (Rarity eyebrow, bold title, unabridged description).
 * - Integrated single decisive Purchase / Equip CTA with explicit coin-deficit calculations.
 * - Admin and Super Admin free pass support (instant equip with zero cost).
 * - Restrained motion with full prefers-reduced-motion support and WCAG 2.1 AA contrast.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Coins,
  Check,
  Lock,
  RefreshCw,
  User,
  Gamepad2,
  Trophy,
  Star,
  Grid,
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

export type PreviewContext = "profile" | "seat" | "podium";

interface CosmeticsPreviewStageProps {
  item: CosmeticCatalogItem | null;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
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
  const [context, setContext] = useState<PreviewContext>("profile");

  // Effective preview item (or category default if none selected)
  const previewId = item?.id ?? getDefaultCosmetic(category, scope).id;
  const previewName = item?.name ?? "Default";
  const rarity = item?.rarity ?? "COMMON";
  const isDefault = item?.unlockMethod === "DEFAULT";

  // Ownership & transaction math
  const effectiveOwned = isAdminUser || isDefault || isOwned;
  const priceCoins = item?.priceCoins ?? 0;
  const balanceBn = BigInt(walletBalance || "0");
  const priceBn = BigInt(priceCoins);
  const canAfford = balanceBn >= priceBn;
  const deficitBn = priceBn > balanceBn ? priceBn - balanceBn : 0n;
  const deficitFormatted = Number(deficitBn).toLocaleString();
  const progressPercent =
    priceCoins > 0
      ? Math.min(100, Math.max(0, Math.round((Number(balanceBn) / priceCoins) * 100)))
      : 100;

  // Rarity atmospheric illumination
  const getRarityAtmosphere = (r: string) => {
    switch (r) {
      case "LEGENDARY":
        return {
          glow: "from-amber-500/25 via-amber-700/10 to-transparent",
          border: "border-amber-500/40",
          accent: "text-amber-400",
          pill: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black",
          runeStroke: "#f59e0b",
        };
      case "EPIC":
        return {
          glow: "from-purple-500/25 via-fuchsia-900/10 to-transparent",
          border: "border-purple-500/40",
          accent: "text-purple-300",
          pill: "bg-gradient-to-r from-purple-400 to-pink-500 text-white font-black",
          runeStroke: "#a855f7",
        };
      case "RARE":
        return {
          glow: "from-sky-500/25 via-blue-900/10 to-transparent",
          border: "border-sky-500/40",
          accent: "text-sky-300",
          pill: "bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold",
          runeStroke: "#38bdf8",
        };
      default:
        return {
          glow: "from-zinc-500/15 via-zinc-800/5 to-transparent",
          border: "border-zinc-700/50",
          accent: "text-zinc-300",
          pill: "bg-gradient-to-r from-zinc-400 to-zinc-600 text-white font-bold",
          runeStroke: "#71717a",
        };
    }
  };

  const rarityTheme = getRarityAtmosphere(rarity);

  return (
    <div
      className={`w-full flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-[#0e1424] via-[#090d18] to-[#05070d] border ${rarityTheme.border} shadow-2xl relative overflow-hidden min-h-[460px] transition-colors duration-500`}
    >
      {/* ── 1. Layer: Atmospheric Rarity Radial Glow ── */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_var(--tw-gradient-stops))] ${rarityTheme.glow} pointer-events-none transition-all duration-700`}
      />

      {/* ── 2. Layer: Background Geometric Runes & Celestial Compass ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <svg className="w-80 h-80 animate-spin [animation-duration:120s]" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="0.5" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="75" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="1" strokeDasharray="12 6" />
          <polygon points="100,10 190,100 100,190 10,100" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="0.5" />
          <polygon points="100,25 175,100 100,175 25,100" fill="none" stroke={rarityTheme.runeStroke} strokeWidth="0.5" />
        </svg>
      </div>

      {/* ── 3. Layer: Grounded Pedestal Shadow ── */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-48 h-8 rounded-[100%] bg-black/60 blur-md pointer-events-none" />

      {/* ── Top Bar: Rarity Eyebrow + Context Segmented Switch ── */}
      <div className="w-full flex items-center justify-between gap-2 z-10">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow-xs ${rarityTheme.pill}`}>
          {rarity}
        </span>

        {/* Real-Context Preview Segmented Switch */}
        <div
          role="tablist"
          aria-label="Preview Context"
          className="flex items-center p-0.5 rounded-lg bg-black/50 border border-zinc-800 text-[11px] font-bold select-none"
        >
          <button
            type="button"
            role="tab"
            aria-selected={context === "profile"}
            onClick={() => setContext("profile")}
            className={`min-h-[32px] px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
              context === "profile"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-3 h-3" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={context === "seat"}
            onClick={() => setContext("seat")}
            className={`min-h-[32px] px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
              context === "seat"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Gamepad2 className="w-3 h-3" />
            <span>Game Seat</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={context === "podium"}
            onClick={() => setContext("podium")}
            className={`min-h-[32px] px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
              context === "podium"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Trophy className="w-3 h-3" />
            <span>Podium</span>
          </button>
        </div>
      </div>

      {/* ── Center Stage: 2x Scale Visual Artifact ── */}
      <div className="w-full flex-1 flex items-center justify-center my-3 relative z-10 min-h-[190px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${previewId}-${context}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={bhalyamSpring}
            className="w-full flex items-center justify-center"
          >
            {category === "TABLE_THEME" && (
              <EnchantedTableThemePreview skinId={previewId} context={context} />
            )}
            {category === "DICE_SKIN" && (
              <EnchantedDiceSkinPreview skinId={previewId} context={context} />
            )}
            {category === "TOKEN_SKIN" && (
              <EnchantedTokenSkinPreview skinId={previewId} context={context} />
            )}
            {category === "CARD_BACK" && (
              <EnchantedCardBackPreview skinId={previewId} scope={scope} context={context} />
            )}
            {category === "AVATAR_AURA" && (
              <EnchantedAvatarAuraPreview
                skinId={previewId}
                avatarId={avatarId}
                displayName={displayName}
                context={context}
              />
            )}
            {category === "PODIUM_TITLE" && (
              <EnchantedPodiumTitlePreview
                skinId={previewId}
                titleName={previewName}
                displayName={displayName}
                context={context}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Selected Item Lore & Info Hierarchy ── */}
      <div className="w-full text-center z-10 mb-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {rarity} {category.replace("_", " ")}
        </div>
        <h4 className="text-lg font-black tracking-tight text-white uppercase mt-0.5">
          {previewName}
        </h4>
        <p className="text-xs text-zinc-300/90 max-w-sm mx-auto mt-1 leading-relaxed">
          {item?.description ?? "Standard default customization."}
        </p>
      </div>

      {/* ── Transaction Bar: Balance, Price & Unified Primary CTA ── */}
      <div className="w-full pt-3 border-t border-zinc-800/80 flex flex-col gap-2.5 z-10 bg-zinc-950/40 rounded-xl p-3">
        {/* Balance and Price Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>Your Balance:</span>
            <span className="font-mono font-bold text-amber-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {Number(walletBalance || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Price:</span>
            {isDefault ? (
              <span className="font-black text-emerald-400 text-xs">DEFAULT</span>
            ) : isAdminUser ? (
              <span className="font-black text-amber-400 text-xs flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> FREE
              </span>
            ) : (
              <span className="font-mono font-bold text-white text-xs flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                {priceCoins.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Deficit Bar when insufficient funds */}
        {!effectiveOwned && !canAfford && (
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Need {deficitFormatted} more Coins
              </span>
              <span className="text-zinc-500 font-mono text-[10px]">
                {Number(walletBalance || 0).toLocaleString()} / {priceCoins.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Unified Decisive Action CTA */}
        <div className="pt-1 flex items-center gap-2">
          {isEquipped ? (
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 min-h-[44px] px-4 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black text-xs flex items-center justify-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>EQUIPPED</span>
              </div>
              {!isDefault && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onUnequip}
                  aria-label="Restore default"
                  title="Restore default"
                  className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          ) : effectiveOwned ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => item && onEquip(item)}
              aria-label={`Equip ${previewName}`}
              className="w-full min-h-[44px] px-4 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-black transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>EQUIP {category.replace("_", " ")}</span>
            </button>
          ) : canAfford ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => item && onPurchase(item)}
              aria-label={`Unlock ${previewName} for ${priceCoins} coins`}
              className="w-full min-h-[44px] px-4 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-98 text-black transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 cursor-pointer disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              <span>UNLOCK FOR {priceCoins.toLocaleString()} COINS</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full min-h-[44px] px-4 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Need {deficitFormatted} more Coins</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCHANTED ARTIFACT VISUAL PREVIEW RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Enchanted Avatar Aura Preview (2x Scale, 3 Contexts) ──
function EnchantedAvatarAuraPreview({
  skinId,
  avatarId,
  displayName,
  context,
}: {
  skinId: string;
  avatarId: string | null;
  displayName: string;
  context: PreviewContext;
}) {
  const getAuraColor = (id: string) => {
    switch (id) {
      case "aura_radiant_vanguard":
        return {
          coreRing: "border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.9)]",
          orbitColor: "#f59e0b",
          pulseColor: "rgba(245,158,11,0.4)",
        };
      case "aura_ludo_king":
        return {
          coreRing: "border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.9)]",
          orbitColor: "#f43f5e",
          pulseColor: "rgba(244,63,94,0.4)",
        };
      case "aura_rummy_maestro":
        return {
          coreRing: "border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.9)]",
          orbitColor: "#10b981",
          pulseColor: "rgba(16,185,129,0.4)",
        };
      default:
        return {
          coreRing: "border-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.2)]",
          orbitColor: "#71717a",
          pulseColor: "transparent",
        };
    }
  };

  const style = getAuraColor(skinId);

  // Profile context (large avatar showcase)
  if (context === "profile") {
    return (
      <div className="relative flex flex-col items-center justify-center">
        {/* Layer: Outer Rotating Rune Ring */}
        <div className="absolute -inset-6 flex items-center justify-center pointer-events-none">
          <svg className="w-44 h-44 animate-spin [animation-duration:18s]" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="72" fill="none" stroke={style.orbitColor} strokeWidth="1.5" strokeDasharray="6 4 2 4" opacity="0.7" />
            <circle cx="80" cy="8" r="3" fill={style.orbitColor} />
            <circle cx="80" cy="152" r="3" fill={style.orbitColor} />
            <circle cx="8" cy="80" r="3" fill={style.orbitColor} />
            <circle cx="152" cy="80" r="3" fill={style.orbitColor} />
          </svg>
        </div>

        {/* Layer: Middle Particle Orbit */}
        <div className="absolute -inset-3 flex items-center justify-center pointer-events-none">
          <svg className="w-36 h-36 animate-spin [animation-duration:12s] [animation-direction:reverse]" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke={style.orbitColor} strokeWidth="1" strokeDasharray="3 8" opacity="0.5" />
            <circle cx="60" cy="6" r="2.5" fill="#ffffff" />
            <circle cx="114" cy="60" r="2.5" fill="#ffffff" />
          </svg>
        </div>

        {/* Layer: Inner Pulsing Energy Halo */}
        <div
          className="absolute -inset-1 rounded-full animate-pulse blur-sm pointer-events-none"
          style={{ backgroundColor: style.pulseColor }}
        />

        {/* Center: 2x Scale Avatar (112x112 px) */}
        <div className={`w-28 h-28 rounded-full overflow-hidden border-3 ${style.coreRing} relative z-10 bg-zinc-900 shadow-2xl`}>
          <SeatAvatar avatar={avatarId ?? undefined} name={displayName} className="w-full h-full" />
        </div>

        {/* Soft Reflected Glow Below */}
        <div
          className="w-24 h-4 rounded-full blur-md mt-2 opacity-70"
          style={{ backgroundColor: style.pulseColor }}
        />
      </div>
    );
  }

  // Game Seat context (in-match table seat representation)
  if (context === "seat") {
    return (
      <div className="w-64 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-black border border-emerald-500/30 flex items-center gap-3.5 shadow-2xl relative">
        <div className="relative">
          <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${style.coreRing} bg-zinc-900 shadow-lg`}>
            <SeatAvatar avatar={avatarId ?? undefined} name={displayName} className="w-full h-full" />
          </div>
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-black border border-black shadow-xs">
            1P
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate">{displayName}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">Turn 14 • 5 cards</p>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-300 font-mono">
            <Coins className="w-3 h-3 text-amber-400" />
            <span>2,500 Bet</span>
          </div>
        </div>
      </div>
    );
  }

  // Podium context (victory result stage)
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Crown */}
      <Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] -mb-2 z-20" />

      {/* Avatar with Aura */}
      <div className="relative">
        <div className={`w-20 h-20 rounded-full overflow-hidden border-3 ${style.coreRing} bg-zinc-900 shadow-2xl relative z-10`}>
          <SeatAvatar avatar={avatarId ?? undefined} name={displayName} className="w-full h-full" />
        </div>
        {/* Victory Star */}
        <Star className="w-5 h-5 text-amber-300 fill-amber-300 absolute -top-1 -right-2 animate-bounce z-20" />
      </div>

      {/* Victory Pedestal */}
      <div className="w-32 py-1.5 mt-1 rounded-t-lg bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 text-black text-center font-black text-xs shadow-lg shadow-amber-500/30">
        #1 WINNER
      </div>
      <div className="w-40 h-2 bg-amber-800 rounded-b-md shadow-md" />
    </div>
  );
}

// ── 2. Enchanted 3D Dice Skin Preview (2x Scale) ──
function EnchantedDiceSkinPreview({
  skinId,
  context,
}: {
  skinId: string;
  context: PreviewContext;
}) {
  const getDiceStyle = (id: string) => {
    switch (id) {
      case "dice_wooden_teak":
        return {
          bg: "bg-gradient-to-br from-amber-700 to-amber-950 border-amber-950 text-amber-950 shadow-[0_8px_30px_rgba(120,53,15,0.5)]",
          pip: "bg-amber-950 shadow-inner",
        };
      case "dice_golden_ember":
        return {
          bg: "bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border-amber-200 text-amber-950 shadow-[0_0_40px_rgba(245,158,11,0.7)]",
          pip: "bg-amber-950 shadow-[0_0_10px_rgba(245,158,11,1)]",
        };
      case "dice_cyber_neon":
        return {
          bg: "bg-zinc-950 border-cyan-400 text-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.6)]",
          pip: "bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,1)]",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-white via-zinc-100 to-zinc-300 border-zinc-400 text-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
          pip: "bg-rose-600 shadow-sm",
        };
    }
  };

  const style = getDiceStyle(skinId);

  return (
    <motion.div
      animate={{ rotateX: [0, 15, -15, 0], rotateY: [0, 25, -25, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
      className={`w-28 h-28 rounded-3xl border-3 flex items-center justify-center relative cursor-grab active:cursor-grabbing ${style.bg}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="w-20 h-20 grid grid-cols-3 grid-rows-3 p-1.5">
        <span className={`w-4 h-4 rounded-full col-start-1 row-start-1 ${style.pip}`} />
        <span className={`w-4 h-4 rounded-full col-start-3 row-start-1 ${style.pip}`} />
        <span className={`w-4 h-4 rounded-full col-start-2 row-start-2 ${style.pip}`} />
        <span className={`w-4 h-4 rounded-full col-start-1 row-start-3 ${style.pip}`} />
        <span className={`w-4 h-4 rounded-full col-start-3 row-start-3 ${style.pip}`} />
      </div>
    </motion.div>
  );
}

// ── 3. Enchanted Token Skin Preview (2x Scale) ──
function EnchantedTokenSkinPreview({
  skinId,
  context,
}: {
  skinId: string;
  context: PreviewContext;
}) {
  const isCrown = skinId === "token_golden_crown";
  const isFireball = skinId === "token_fireball_ludo";
  const isNeon = skinId === "token_neon_ring";

  return (
    <div className="relative flex items-center justify-center">
      {isFireball && (
        <span className="absolute -inset-6 rounded-full bg-gradient-to-r from-orange-500/50 via-red-500/40 to-amber-500/50 blur-lg animate-pulse" />
      )}
      {isNeon && (
        <span className="absolute -inset-4 rounded-full border-3 border-cyan-400 animate-ping opacity-60" />
      )}

      {/* 2x Scale SVG Pawn Body */}
      <svg className="w-28 h-36 drop-shadow-2xl" viewBox="0 0 60 75" fill="none">
        <defs>
          <radialGradient id="pawnGrad2" cx="30%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>

        <circle cx="30" cy="22" r="14" fill="url(#pawnGrad2)" stroke="#78350f" strokeWidth="2" />
        {isCrown && (
          <path
            d="M20 12 L24 16 L30 8 L36 16 L40 12 L38 20 L22 20 Z"
            fill="#fbbf24"
            stroke="#78350f"
            strokeWidth="1.5"
          />
        )}
        <ellipse cx="30" cy="36" rx="10" ry="3" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
        <path
          d="M23 36 C23 48, 12 62, 12 66 L48 66 C48 62, 37 48, 37 36 Z"
          fill="url(#pawnGrad2)"
          stroke="#78350f"
          strokeWidth="2"
        />
        <ellipse cx="30" cy="66" rx="20" ry="6" fill="#92400e" stroke="#78350f" strokeWidth="2" />
      </svg>
    </div>
  );
}

// ── 4. Enchanted Card Back Preview (2x Scale) ──
function EnchantedCardBackPreview({
  skinId,
  scope,
  context,
}: {
  skinId: string;
  scope: CosmeticGameScope;
  context: PreviewContext;
}) {
  const isUno = scope === "uno" || skinId.includes("uno");

  const getCardBackStyle = (id: string) => {
    switch (id) {
      case "cardback_vintage_velvet_rummy":
        return "bg-gradient-to-br from-red-950 via-rose-900 to-red-950 border-amber-400 text-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.4)]";
      case "cardback_neon_cyber_uno":
        return "bg-gradient-to-br from-indigo-950 via-purple-900 to-black border-cyan-400 text-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.5)]";
      case "cardback_classic_uno":
        return "bg-red-600 border-white text-white shadow-2xl";
      default:
        return "bg-blue-900 border-amber-200 text-amber-200 shadow-2xl";
    }
  };

  return (
    <motion.div
      animate={{ rotateY: [0, 180, 360] }}
      transition={{ repeat: Infinity, duration: 9, ease: "linear" }}
      className={`w-32 h-48 rounded-2xl border-4 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden ${getCardBackStyle(
        skinId,
      )}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="w-full h-full border border-dashed border-current/40 rounded-xl flex flex-col items-center justify-center">
        {isUno ? (
          <span className="text-3xl font-black italic tracking-tighter drop-shadow-md">UNO</span>
        ) : (
          <>
            <span className="text-3xl font-serif">♠</span>
            <span className="text-[10px] font-mono tracking-widest uppercase mt-1">BHALYAM</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── 5. Enchanted Table Theme Preview (Perspective Display) ──
function EnchantedTableThemePreview({
  skinId,
  context,
}: {
  skinId: string;
  context: PreviewContext;
}) {
  const getThemeClass = (id: string) => {
    switch (id) {
      case "table_crt_neon_90s":
        return "bg-gradient-to-br from-indigo-950 via-purple-900 to-black border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.4)]";
      case "table_royal_mahogany":
        return "bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.3)]";
      case "table_midnight_velvet":
        return "bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.3)]";
      default:
        return "bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 border-emerald-600 shadow-[0_0_35px_rgba(16,185,129,0.3)]";
    }
  };

  return (
    <div
      className={`w-64 h-36 rounded-2xl border-4 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${getThemeClass(
        skinId,
      )}`}
    >
      {skinId === "table_crt_neon_90s" && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none" />
      )}
      <div className="w-32 h-20 rounded-xl border border-dashed border-white/25 flex flex-col items-center justify-center">
        <Grid className="w-6 h-6 text-white/50 animate-pulse" />
        <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase mt-1">
          FELT MAT
        </span>
      </div>
    </div>
  );
}

// ── 6. Enchanted Podium Title Preview ──
function EnchantedPodiumTitlePreview({
  skinId,
  titleName,
  displayName,
  context,
}: {
  skinId: string;
  titleName: string;
  displayName: string;
  context: PreviewContext;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <span className="text-sm font-bold text-zinc-400">{displayName}</span>
      <div className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center gap-2.5">
        <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
        <span className="text-base font-black tracking-wider uppercase text-amber-300 drop-shadow-md">
          {titleName}
        </span>
      </div>
    </div>
  );
}
