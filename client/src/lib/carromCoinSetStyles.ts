/**
 * How each Carrom coin set looks. Identity and price live in `shared/cosmeticsFramesAndCoins.ts`;
 * this file is only the paint, keyed by the same ids.
 *
 * Every set is a pair of sides plus a queen. The two sides are called `white` and `black` because
 * that is what the game's own rules and prompts call them ("pot all your white coins"), even when
 * a set paints them saffron and indigo. A coin set must never make the sides hard to tell apart,
 * so the palettes below are held to a contrast floor by `carromCoinSetStyles.test.ts`.
 *
 * The queen keeps a red-pink family in most sets so it stays recognisable, and moves to a
 * different hue only where a side itself is red.
 */

import { CARROM_COIN_SET_DEFAULT_ID } from "@shared/cosmeticsFramesAndCoins";

/** Highlight, body and shade colours for one coin, painted with the board's usual radial gradient. */
export interface CoinFace {
  readonly highlight: string;
  readonly body: string;
  readonly shade: string;
  readonly rim: string;
}

export type CoinPattern =
  | "plain"
  | "rings"
  | "band"
  | "spokes"
  | "dots"
  | "star"
  | "petals"
  | "teeth"
  | "checks"
  | "sparkles";

export interface CarromCoinSetStyle {
  readonly id: string;
  readonly white: CoinFace;
  readonly black: CoinFace;
  readonly queen: CoinFace;
  /** Extra decoration drawn on both sides, in each side's own rim colour. */
  readonly pattern: CoinPattern;
}

const CLASSIC_QUEEN: CoinFace = { highlight: "#FF77DD", body: "#E0115F", shade: "#770033", rim: "#F59E0B" };

export const CARROM_COIN_SET_STYLES: Readonly<Record<string, CarromCoinSetStyle>> = {
  [CARROM_COIN_SET_DEFAULT_ID]: {
    id: CARROM_COIN_SET_DEFAULT_ID,
    white: { highlight: "#FFFDF7", body: "#ECE0C8", shade: "#E3D3B4", rim: "#8C6339" },
    black: { highlight: "#4A403A", body: "#3A3029", shade: "#1A130E", rim: "#A36D43" },
    queen: CLASSIC_QUEEN,
    pattern: "plain",
  },
  carromcoin_cream_charcoal: {
    id: "carromcoin_cream_charcoal",
    white: { highlight: "#FFFBEF", body: "#F3E9D2", shade: "#DCCBA5", rim: "#A68B5B" },
    black: { highlight: "#5A5A5E", body: "#38383C", shade: "#1B1B1E", rim: "#8A8A92" },
    queen: CLASSIC_QUEEN,
    pattern: "rings",
  },
  carromcoin_sand_slate: {
    id: "carromcoin_sand_slate",
    white: { highlight: "#F6E7C8", body: "#E3C998", shade: "#C9A468", rim: "#8B6B3A" },
    black: { highlight: "#6B7F96", body: "#475A70", shade: "#2B394A", rim: "#9FB3C9" },
    queen: CLASSIC_QUEEN,
    pattern: "band",
  },
  carromcoin_mint_plum: {
    id: "carromcoin_mint_plum",
    white: { highlight: "#E6FBEF", body: "#B7EFD0", shade: "#7ED3A6", rim: "#B8860B" },
    black: { highlight: "#8A4B8F", body: "#5E2A66", shade: "#3A1442", rim: "#D4AF37" },
    queen: { highlight: "#FFD27A", body: "#F59E0B", shade: "#92400E", rim: "#7C2D12" },
    pattern: "band",
  },
  carromcoin_peach_cocoa: {
    id: "carromcoin_peach_cocoa",
    white: { highlight: "#FFEBDD", body: "#FFCBA4", shade: "#F0A072", rim: "#9A5B33" },
    black: { highlight: "#8B5A3C", body: "#5C3720", shade: "#341C0C", rim: "#E5B58A" },
    queen: { highlight: "#A7F3D0", body: "#0D9488", shade: "#134E4A", rim: "#FDE68A" },
    pattern: "petals",
  },
  carromcoin_saffron_indigo: {
    id: "carromcoin_saffron_indigo",
    white: { highlight: "#FFD08A", body: "#FF9F2E", shade: "#D9700A", rim: "#8A4A05" },
    black: { highlight: "#4A4FA8", body: "#2B2F78", shade: "#171A4A", rim: "#D4AF37" },
    queen: { highlight: "#F9A8D4", body: "#DB2777", shade: "#831843", rim: "#FDE68A" },
    pattern: "band",
  },
  carromcoin_lemon_forest: {
    id: "carromcoin_lemon_forest",
    white: { highlight: "#FFF9B0", body: "#F6E34A", shade: "#D2B814", rim: "#8A7A0A" },
    black: { highlight: "#3F8F5A", body: "#236B3E", shade: "#103D22", rim: "#8FD3A5" },
    queen: CLASSIC_QUEEN,
    pattern: "rings",
  },
  carromcoin_coral_navy: {
    id: "carromcoin_coral_navy",
    white: { highlight: "#FFC9C0", body: "#FF8F85", shade: "#E0574E", rim: "#9B2D26" },
    black: { highlight: "#2F5BA8", body: "#173A78", shade: "#0A1F4D", rim: "#8FB0EB" },
    queen: { highlight: "#FDE68A", body: "#EAB308", shade: "#854D0E", rim: "#1E3A8A" },
    pattern: "spokes",
  },
  carromcoin_pearl_garnet: {
    id: "carromcoin_pearl_garnet",
    white: { highlight: "#FFFFFF", body: "#F1EDF5", shade: "#D6CFE0", rim: "#8E86A3" },
    black: { highlight: "#C2394F", body: "#8E1730", shade: "#560A1C", rim: "#F2A0AE" },
    queen: { highlight: "#FDE68A", body: "#EAB308", shade: "#854D0E", rim: "#3F0D1B" },
    pattern: "dots",
  },
  carromcoin_ice_ember: {
    id: "carromcoin_ice_ember",
    white: { highlight: "#F0FAFF", body: "#BFE6FA", shade: "#7FC4EA", rim: "#3C86B0" },
    black: { highlight: "#F2674A", body: "#C2361C", shade: "#7E1A08", rim: "#FFB09C" },
    queen: { highlight: "#E9D5FF", body: "#9333EA", shade: "#4C1D95", rim: "#FDE68A" },
    pattern: "plain",
  },
  carromcoin_jade_obsidian: {
    id: "carromcoin_jade_obsidian",
    white: { highlight: "#C9F2DC", body: "#5FCB9A", shade: "#2A8F62", rim: "#14583B" },
    black: { highlight: "#3C3F4A", body: "#1C1E26", shade: "#08090D", rim: "#8A93A8" },
    queen: CLASSIC_QUEEN,
    pattern: "petals",
  },
  carromcoin_gold_onyx: {
    id: "carromcoin_gold_onyx",
    white: { highlight: "#FFF0B3", body: "#F2C94C", shade: "#B8860B", rim: "#6B4A06" },
    black: { highlight: "#3A3A3A", body: "#161616", shade: "#050505", rim: "#D4AF37" },
    queen: { highlight: "#FF9FD0", body: "#DB2777", shade: "#831843", rim: "#FFFFFF" },
    pattern: "star",
  },
  carromcoin_sunrise_dusk: {
    id: "carromcoin_sunrise_dusk",
    white: { highlight: "#FFE3CF", body: "#FFB68A", shade: "#E8825A", rim: "#A3492A" },
    black: { highlight: "#6C4BA3", body: "#432A78", shade: "#241048", rim: "#B79BE6" },
    queen: { highlight: "#A7F3D0", body: "#0D9488", shade: "#134E4A", rim: "#FDE68A" },
    pattern: "teeth",
  },
  carromcoin_royal_amethyst: {
    id: "carromcoin_royal_amethyst",
    white: { highlight: "#F3E8FF", body: "#D8B9F5", shade: "#B58AE0", rim: "#B8860B" },
    black: { highlight: "#7A3FB8", body: "#4B1D82", shade: "#2B0C52", rim: "#D4AF37" },
    queen: { highlight: "#FFE08A", body: "#D97706", shade: "#78350F", rim: "#FEF3C7" },
    pattern: "dots",
  },
  carromcoin_diamond_ruby: {
    id: "carromcoin_diamond_ruby",
    white: { highlight: "#FFFFFF", body: "#E8F1FA", shade: "#C4D6EA", rim: "#8FA8C4" },
    black: { highlight: "#D6334F", body: "#A3102E", shade: "#5E0418", rim: "#FFB3C0" },
    queen: { highlight: "#FDE68A", body: "#EAB308", shade: "#854D0E", rim: "#FFFFFF" },
    pattern: "checks",
  },
  carromcoin_celestial: {
    id: "carromcoin_celestial",
    white: { highlight: "#FFFFFF", body: "#DDE6F5", shade: "#AEBDDA", rim: "#6F82A8" },
    black: { highlight: "#27335E", body: "#121A3C", shade: "#070B1F", rim: "#8FA3E0" },
    queen: { highlight: "#FDE68A", body: "#F59E0B", shade: "#92400E", rim: "#FFFFFF" },
    pattern: "sparkles",
  },
};

/** The set for an id; an unknown or missing id falls back to the classic set. */
export function getCarromCoinSetStyle(setId?: string): CarromCoinSetStyle {
  return (setId && CARROM_COIN_SET_STYLES[setId]) || CARROM_COIN_SET_STYLES[CARROM_COIN_SET_DEFAULT_ID];
}

/** The same radial gradient the board paints a coin with, as CSS, for chips and previews. */
export function coinFaceCss(face: CoinFace): string {
  return `radial-gradient(circle at 35% 32%, ${face.highlight}, ${face.body} 65%, ${face.shade})`;
}
