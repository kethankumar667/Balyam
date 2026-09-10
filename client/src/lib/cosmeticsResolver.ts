/**
 * BHALYAM — Cosmetics Presentation & Surface Resolvers
 *
 * Provides visual resolution helpers and React hooks for translating equipped cosmetics
 * into runtime visual presentations across game boards, cards, dice, pawns, avatars, and podiums.
 *
 * Strictly adheres to platform tenets:
 * - Zero Pay-to-Win: purely cosmetic (CSS, SVG, borders, glows); zero effect on RNG, game logic, or server state.
 * - Closed-set catalog validation: any unrecognised or unequipped ID gracefully falls back to default.
 * - Card Back Privacy: always uses local viewer's preferred card back for face-down cards to prevent information leakage.
 */

import { useMemo } from "react";
import { useCosmeticsStore } from "../store/cosmeticsStore";
import {
  type GameKind,
  type PublicPresentationLoadout,
} from "@shared/types";
import {
  type CosmeticGameScope,
  type ResolvedCosmeticsLoadout,
} from "@shared/cosmetics";

// ── 1. Table Themes ──

export interface TableThemeConfig {
  id: string;
  name: string;
  bgClass: string;
  surfaceClass: string;
  feltStyle: React.CSSProperties;
}

export const TABLE_THEMES: Record<string, TableThemeConfig> = {
  table_classic_green: {
    id: "table_classic_green",
    name: "Classic Green Felt",
    bgClass: "bg-[#143823]",
    surfaceClass: "bg-emerald-950/80 border-emerald-700/40",
    feltStyle: { background: "radial-gradient(ellipse at center, #1b4d2e 0%, #0e2918 100%)" },
  },
  table_crt_neon_90s: {
    id: "table_crt_neon_90s",
    name: "CRT Neon 90s",
    bgClass: "bg-[#090b14]",
    surfaceClass: "bg-indigo-950/80 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.25)]",
    feltStyle: { background: "radial-gradient(ellipse at center, #1e1145 0%, #070612 100%)" },
  },
  table_royal_mahogany: {
    id: "table_royal_mahogany",
    name: "Royal Mahogany",
    bgClass: "bg-[#200f07]",
    surfaceClass: "bg-amber-950/80 border-amber-600/40 shadow-[0_0_25px_rgba(217,119,6,0.2)]",
    feltStyle: { background: "radial-gradient(ellipse at center, #3d1b0c 0%, #150702 100%)" },
  },
  table_midnight_velvet: {
    id: "table_midnight_velvet",
    name: "Midnight Velvet",
    bgClass: "bg-[#0a0d1a]",
    surfaceClass: "bg-slate-950/80 border-blue-600/40 shadow-[0_0_25px_rgba(37,99,235,0.2)]",
    feltStyle: { background: "radial-gradient(ellipse at center, #111b38 0%, #050711 100%)" },
  },
};

export function getTableThemeConfig(themeId?: string): TableThemeConfig {
  if (themeId && themeId in TABLE_THEMES) {
    return TABLE_THEMES[themeId];
  }
  return TABLE_THEMES.table_classic_green;
}

// ── 2. Dice Skins ──

export interface DiceSkinConfig {
  id: string;
  wooden: boolean;
  faceBg: string;
  faceBorder: string;
  pipBg: string;
  pipBorder: string;
  glow?: string;
}

export const DICE_SKINS: Record<string, DiceSkinConfig> = {
  dice_classic_ivory: {
    id: "dice_classic_ivory",
    wooden: false,
    faceBg: "linear-gradient(135deg, #FFFFFF 0%, #FAF5EE 55%, #EBE1D0 100%)",
    faceBorder: "#DCD0BD",
    pipBg: "linear-gradient(135deg, #334155 0%, #0F172A 100%)",
    pipBorder: "inset 0 1.5px 2px rgba(0,0,0,0.9), inset 0 -1px 1px rgba(255,255,255,0.25), 0 1px 1px rgba(255,255,255,0.75)",
  },
  dice_wooden_teak: {
    id: "dice_wooden_teak",
    wooden: true,
    faceBg: "linear-gradient(135deg, #D49862 0%, #A46934 60%, #6E411B 100%)",
    faceBorder: "#502F13",
    pipBg: "linear-gradient(135deg, #FFF5DE 0%, #DEC698 100%)",
    pipBorder: "inset 0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.4)",
  },
  dice_golden_ember: {
    id: "dice_golden_ember",
    wooden: false,
    faceBg: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #B45309 100%)",
    faceBorder: "#78350F",
    pipBg: "linear-gradient(135deg, #78350F 0%, #451A03 100%)",
    pipBorder: "inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 1px rgba(254,243,199,0.8)",
    glow: "0 0 16px rgba(245,158,11,0.6)",
  },
  dice_cyber_neon: {
    id: "dice_cyber_neon",
    wooden: false,
    faceBg: "linear-gradient(135deg, #18181B 0%, #09090B 100%)",
    faceBorder: "#06B6D4",
    pipBg: "linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)",
    pipBorder: "inset 0 1px 2px rgba(0,0,0,0.8), 0 0 6px rgba(6,182,212,0.9)",
    glow: "0 0 16px rgba(6,182,212,0.7)",
  },
  dice_sapphire_frost: {
    id: "dice_sapphire_frost",
    wooden: false,
    faceBg: "linear-gradient(135deg, #BFDBFE 0%, #3B82F6 55%, #1E3A8A 100%)",
    faceBorder: "#93C5FD",
    pipBg: "linear-gradient(135deg, #EFF6FF 0%, #BFDBFE 100%)",
    pipBorder: "inset 0 1px 2px rgba(0,0,0,0.3), 0 0 6px rgba(191,219,254,0.9)",
    glow: "0 0 18px rgba(59,130,246,0.55)",
  },
  dice_dragon_scale: {
    id: "dice_dragon_scale",
    wooden: false,
    faceBg: "linear-gradient(135deg, #1C1917 0%, #0C0A09 60%, #000000 100%)",
    faceBorder: "#B91C1C",
    pipBg: "linear-gradient(135deg, #F97316 0%, #B91C1C 100%)",
    pipBorder: "inset 0 1px 2px rgba(0,0,0,0.8), 0 0 8px rgba(239,68,68,0.9)",
    glow: "0 0 20px rgba(239,68,68,0.6)",
  },
};

export function getDiceSkinConfig(skinId?: string): DiceSkinConfig {
  if (skinId && skinId in DICE_SKINS) {
    return DICE_SKINS[skinId];
  }
  return DICE_SKINS.dice_classic_ivory;
}

// ── 3. Token Skins (Ludo) ──

export interface TokenSkinConfig {
  id: string;
  hasCrown: boolean;
  hasFireball: boolean;
  hasNeonRing: boolean;
  hasDiamond: boolean;
  hasPhoenixWing: boolean;
}

export const TOKEN_SKINS: Record<string, TokenSkinConfig> = {
  token_classic_pawn: {
    id: "token_classic_pawn",
    hasCrown: false,
    hasFireball: false,
    hasNeonRing: false,
    hasDiamond: false,
    hasPhoenixWing: false,
  },
  token_golden_crown: {
    id: "token_golden_crown",
    hasCrown: true,
    hasFireball: false,
    hasNeonRing: false,
    hasDiamond: false,
    hasPhoenixWing: false,
  },
  token_fireball_ludo: {
    id: "token_fireball_ludo",
    hasCrown: false,
    hasFireball: true,
    hasNeonRing: false,
    hasDiamond: false,
    hasPhoenixWing: false,
  },
  token_neon_ring: {
    id: "token_neon_ring",
    hasCrown: false,
    hasFireball: false,
    hasNeonRing: true,
    hasDiamond: false,
    hasPhoenixWing: false,
  },
  token_diamond_elite: {
    id: "token_diamond_elite",
    hasCrown: false,
    hasFireball: false,
    hasNeonRing: false,
    hasDiamond: true,
    hasPhoenixWing: false,
  },
  token_phoenix_wing: {
    id: "token_phoenix_wing",
    hasCrown: false,
    hasFireball: false,
    hasNeonRing: false,
    hasDiamond: false,
    hasPhoenixWing: true,
  },
};

export function getTokenSkinConfig(skinId?: string): TokenSkinConfig {
  if (skinId && skinId in TOKEN_SKINS) {
    return TOKEN_SKINS[skinId];
  }
  return TOKEN_SKINS.token_classic_pawn;
}

// ── 4. Card Backs ──

export interface RummyCardBackConfig {
  id: string;
  stopColor1: string;
  stopColor2: string;
  accentColor: string;
}

export const RUMMY_CARD_BACKS: Record<string, RummyCardBackConfig> = {
  cardback_classic_navy: {
    id: "cardback_classic_navy",
    stopColor1: "var(--rm-card-back, #1e3a8a)",
    stopColor2: "var(--rm-card-back-deep, #0f172a)",
    accentColor: "var(--rm-brass, #d4af37)",
  },
  cardback_vintage_velvet_rummy: {
    id: "cardback_vintage_velvet_rummy",
    stopColor1: "#881337",
    stopColor2: "#4c0519",
    accentColor: "#F59E0B",
  },
  cardback_royal_sapphire_rummy: {
    id: "cardback_royal_sapphire_rummy",
    stopColor1: "#1E3A8A",
    stopColor2: "#0C1B3D",
    accentColor: "#CBD5E1",
  },
};

export interface UnoCardBackConfig {
  id: string;
  bodyColor: string;
  ovalColor: string;
  textColor: string;
  edgeColor: string;
}

export const UNO_CARD_BACKS: Record<string, UnoCardBackConfig> = {
  cardback_classic_uno: {
    id: "cardback_classic_uno",
    bodyColor: "#17181d",
    ovalColor: "#D22B27",
    textColor: "#F5C400",
    edgeColor: "#FFFFFF",
  },
  cardback_neon_cyber_uno: {
    id: "cardback_neon_cyber_uno",
    bodyColor: "#05070F",
    ovalColor: "#06B6D4",
    textColor: "#A5F3FC",
    edgeColor: "#0891B2",
  },
  cardback_dragon_ember_uno: {
    id: "cardback_dragon_ember_uno",
    bodyColor: "#1C1006",
    ovalColor: "#EA580C",
    textColor: "#FED7AA",
    edgeColor: "#B91C1C",
  },
};

export function getRummyCardBackConfig(skinId?: string): RummyCardBackConfig {
  if (skinId && skinId in RUMMY_CARD_BACKS) {
    return RUMMY_CARD_BACKS[skinId];
  }
  return RUMMY_CARD_BACKS.cardback_classic_navy;
}

export function getUnoCardBackConfig(skinId?: string): UnoCardBackConfig {
  if (skinId && skinId in UNO_CARD_BACKS) {
    return UNO_CARD_BACKS[skinId];
  }
  return UNO_CARD_BACKS.cardback_classic_uno;
}

// ── 5. Avatar Auras ──

export interface AvatarAuraConfig {
  id: string;
  className: string;
  ringColor: string;
}

export const AVATAR_AURAS: Record<string, AvatarAuraConfig> = {
  aura_none: {
    id: "aura_none",
    className: "",
    ringColor: "",
  },
  aura_radiant_vanguard: {
    id: "aura_radiant_vanguard",
    className: "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.7)] animate-spin [animation-duration:9s]",
    ringColor: "#F59E0B",
  },
  aura_ludo_king: {
    id: "aura_ludo_king",
    className: "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse",
    ringColor: "#F43F5E",
  },
  aura_rummy_maestro: {
    id: "aura_rummy_maestro",
    className: "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)] animate-spin [animation-duration:12s]",
    ringColor: "#34D399",
  },
};

export function getAvatarAuraConfig(auraId?: string): AvatarAuraConfig {
  if (auraId && auraId in AVATAR_AURAS) {
    return AVATAR_AURAS[auraId];
  }
  return AVATAR_AURAS.aura_none;
}

// ── 6. Podium Titles ──

export interface PodiumTitleConfig {
  id: string;
  label: string;
  badgeClass: string;
}

export const PODIUM_TITLES: Record<string, PodiumTitleConfig> = {
  title_none: {
    id: "title_none",
    label: "",
    badgeClass: "",
  },
  title_early_bird: {
    id: "title_early_bird",
    label: "Early Bird",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  },
  title_table_master: {
    id: "title_table_master",
    label: "Table Master",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-400/40",
  },
  title_grandmaster: {
    id: "title_grandmaster",
    label: "Grandmaster",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-400/40",
  },
};

export function getPodiumTitleConfig(titleId?: string): PodiumTitleConfig | null {
  if (titleId && titleId in PODIUM_TITLES && titleId !== "title_none") {
    return PODIUM_TITLES[titleId];
  }
  return null;
}

// ── React Hooks ──

/**
 * Hook to retrieve user's fully resolved cosmetics loadout.
 */
export function useResolvedCosmetics(): ResolvedCosmeticsLoadout {
  return useCosmeticsStore((s) => s.resolved);
}

/**
 * Resolves the active table theme for a specific game kind or global.
 */
export function useTableTheme(gameKind?: GameKind): TableThemeConfig {
  const resolved = useResolvedCosmetics();
  return useMemo(() => {
    const scope = (gameKind as CosmeticGameScope) ?? "GLOBAL";
    const themeId = resolved.tableThemes[scope] ?? resolved.tableThemes.GLOBAL;
    return getTableThemeConfig(themeId);
  }, [resolved.tableThemes, gameKind]);
}

/**
 * Resolves dice skin for a game kind, supporting opponent seat skins if provided.
 */
export function useDiceSkin(gameKind?: GameKind, seatSkin?: string): DiceSkinConfig {
  const resolved = useResolvedCosmetics();
  return useMemo(() => {
    if (seatSkin) return getDiceSkinConfig(seatSkin);
    const scope = (gameKind as CosmeticGameScope) ?? "GLOBAL";
    const skinId = resolved.diceSkins[scope] ?? resolved.diceSkins.GLOBAL;
    return getDiceSkinConfig(skinId);
  }, [resolved.diceSkins, gameKind, seatSkin]);
}

/**
 * Resolves token skin for Ludo or Snakes & Ladders.
 */
export function useTokenSkin(gameKind: "ludo" | "snl" = "ludo", seatSkin?: string): TokenSkinConfig {
  const resolved = useResolvedCosmetics();
  return useMemo(() => {
    if (seatSkin) return getTokenSkinConfig(seatSkin);
    const skinId = resolved.tokenSkins[gameKind] ?? resolved.tokenSkins.GLOBAL;
    return getTokenSkinConfig(skinId);
  }, [resolved.tokenSkins, gameKind, seatSkin]);
}

/**
 * Resolves card back skin strictly from local viewer preference (Zero Information Leakage).
 */
export function useCardBack(game: "rummy" | "uno"): string {
  const resolved = useResolvedCosmetics();
  return resolved.cardBacks[game];
}

/**
 * Resolves avatar aura configuration for a specific seat or local player.
 */
export function useAvatarAura(seatAura?: string): AvatarAuraConfig {
  const resolved = useResolvedCosmetics();
  return useMemo(() => {
    const auraId = seatAura ?? resolved.avatarAura;
    return getAvatarAuraConfig(auraId);
  }, [seatAura, resolved.avatarAura]);
}

/**
 * Resolves podium title for a specific seat or local player.
 */
export function usePodiumTitle(seatTitle?: string): PodiumTitleConfig | null {
  const resolved = useResolvedCosmetics();
  return useMemo(() => {
    const titleId = seatTitle ?? resolved.podiumTitle;
    return getPodiumTitleConfig(titleId);
  }, [seatTitle, resolved.podiumTitle]);
}

/**
 * Formats the public presentation payload to broadcast to the room.
 */
export function getPublicPresentationLoadout(
  resolved: ResolvedCosmeticsLoadout,
  game?: GameKind,
): PublicPresentationLoadout {
  const gameScope = (game as CosmeticGameScope) ?? "GLOBAL";
  return {
    avatarAura: resolved.avatarAura !== "aura_none" ? resolved.avatarAura : undefined,
    podiumTitle: resolved.podiumTitle !== "title_none" ? resolved.podiumTitle : undefined,
    tokenSkin: resolved.tokenSkins[gameScope] ?? resolved.tokenSkins.GLOBAL,
    diceSkin: resolved.diceSkins[gameScope] ?? resolved.diceSkins.GLOBAL,
  };
}
