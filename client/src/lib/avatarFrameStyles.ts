/**
 * How each avatar frame looks. Identity and price live in `shared/cosmeticsFramesAndCoins.ts`;
 * this is only the drawing recipe, keyed by the same ids, so a frame can be restyled without
 * touching anything a player has bought.
 *
 * A frame is a ring that hugs the round portrait. It is drawn from plain colour values rather
 * than image files, so all fifteen cost nothing to download and stay sharp at any avatar size.
 * The widest a frame reaches outside the portrait is kept to a few pixels on purpose: seats on
 * a phone are tight, and a frame that pushed into its neighbour would be a layout bug the
 * player pays for.
 */

import { AVATAR_FRAME_DEFAULT_ID } from "@shared/cosmeticsFramesAndCoins";

export type FrameOrnamentKind = "crown" | "stars" | "lights" | "flame" | "moon";

export interface AvatarFrameStyle {
  readonly id: string;
  /** Any CSS background value: a colour, a linear gradient or a conic gradient. */
  readonly ringBackground: string;
  /** Thickness of the main ring, in pixels. */
  readonly ringWidth: number;
  /** An optional second ring between the portrait and the main one, for the "twin" frames. */
  readonly innerRing?: { readonly color: string; readonly width: number; readonly gap: number };
  /** A CSS box-shadow value, used for the soft glow on the dearer frames. */
  readonly glow?: string;
  /**
   * Slow motion for the top-shelf frames. Always applied through `motion-safe`, so a player who
   * has asked their device to reduce motion gets a still ring.
   */
  readonly motion?: "spin" | "pulse";
  readonly ornament?: { readonly kind: FrameOrnamentKind; readonly colors: readonly string[] };
  /** The frame's headline colour, used for focus outlines and for the contrast test. */
  readonly accent: string;
}

export const AVATAR_FRAME_STYLES: Readonly<Record<string, AvatarFrameStyle | null>> = {
  [AVATAR_FRAME_DEFAULT_ID]: null,

  frame_marigold_band: {
    id: "frame_marigold_band",
    ringBackground: "linear-gradient(135deg, #F9B233, #E58E10)",
    ringWidth: 3,
    accent: "#E58E10",
  },
  frame_saffron_edge: {
    id: "frame_saffron_edge",
    ringBackground: "#FF7A1A",
    ringWidth: 3,
    accent: "#FF7A1A",
  },
  frame_kumkum_line: {
    id: "frame_kumkum_line",
    ringBackground: "#D7263D",
    ringWidth: 3,
    accent: "#D7263D",
  },
  frame_peacock_teal: {
    id: "frame_peacock_teal",
    ringBackground: "linear-gradient(135deg, #0F9D8F, #2AB7CA, #0B6E74)",
    ringWidth: 3,
    glow: "0 0 6px rgba(42, 183, 202, 0.55)",
    accent: "#0F9D8F",
  },
  frame_indigo_twin: {
    id: "frame_indigo_twin",
    ringBackground: "#3F51B5",
    ringWidth: 2,
    innerRing: { color: "#7986CB", width: 2, gap: 1 },
    accent: "#3F51B5",
  },
  frame_emerald_twin: {
    id: "frame_emerald_twin",
    ringBackground: "#10B981",
    ringWidth: 2,
    innerRing: { color: "#6EE7B7", width: 2, gap: 1 },
    accent: "#10B981",
  },
  frame_rose_gold: {
    id: "frame_rose_gold",
    ringBackground: "linear-gradient(135deg, #F7C6B4, #E8A08C, #FBE0D0, #D98F7A)",
    ringWidth: 3,
    glow: "0 0 6px rgba(232, 160, 140, 0.6)",
    accent: "#D98F7A",
  },
  frame_silver_chrome: {
    id: "frame_silver_chrome",
    ringBackground: "linear-gradient(135deg, #F5F7FA, #9AA5B1, #FFFFFF, #6B7685, #E5E9EF)",
    ringWidth: 3,
    glow: "0 0 5px rgba(203, 213, 225, 0.7)",
    accent: "#9AA5B1",
  },
  frame_neon_pulse: {
    id: "frame_neon_pulse",
    ringBackground: "linear-gradient(135deg, #22D3EE, #E879F9)",
    ringWidth: 3,
    glow: "0 0 10px rgba(34, 211, 238, 0.75)",
    motion: "pulse",
    accent: "#22D3EE",
  },
  frame_diwali_lights: {
    id: "frame_diwali_lights",
    ringBackground: "linear-gradient(135deg, #B7791F, #F6C453)",
    ringWidth: 2,
    ornament: { kind: "lights", colors: ["#FFD54A", "#FF8A1F"] },
    accent: "#F6C453",
  },
  frame_rangoli_stars: {
    id: "frame_rangoli_stars",
    ringBackground: "linear-gradient(135deg, #D946EF, #F5B83D)",
    ringWidth: 3,
    ornament: { kind: "stars", colors: ["#FDE047"] },
    accent: "#D946EF",
  },
  frame_haunted_moon: {
    id: "frame_haunted_moon",
    ringBackground: "linear-gradient(135deg, #7C3AED, #FB923C)",
    ringWidth: 3,
    glow: "0 0 8px rgba(124, 58, 237, 0.6)",
    ornament: { kind: "moon", colors: ["#E5E7EB"] },
    accent: "#7C3AED",
  },
  frame_royal_crown: {
    id: "frame_royal_crown",
    ringBackground: "linear-gradient(135deg, #FDE68A, #D4A017, #FFF3B0, #B8860B)",
    ringWidth: 3,
    innerRing: { color: "#B45309", width: 1, gap: 0 },
    glow: "0 0 9px rgba(250, 204, 21, 0.6)",
    ornament: { kind: "crown", colors: ["#FCD34D", "#B45309"] },
    accent: "#D4A017",
  },
  frame_aurora_flow: {
    id: "frame_aurora_flow",
    ringBackground: "conic-gradient(from 0deg, #34D399, #22D3EE, #818CF8, #C084FC, #34D399)",
    ringWidth: 3,
    glow: "0 0 9px rgba(129, 140, 248, 0.6)",
    motion: "spin",
    accent: "#818CF8",
  },
  frame_ember_dragon: {
    id: "frame_ember_dragon",
    ringBackground: "conic-gradient(from 0deg, #EF4444, #F59E0B, #FDE047, #F59E0B, #EF4444)",
    ringWidth: 3,
    glow: "0 0 10px rgba(239, 68, 68, 0.7)",
    motion: "spin",
    ornament: { kind: "flame", colors: ["#F97316", "#FDE047"] },
    accent: "#EF4444",
  },
};

/** The look for a frame id, or null for "no frame". An unknown id also draws nothing. */
export function getAvatarFrameStyle(frameId?: string): AvatarFrameStyle | null {
  if (!frameId) return null;
  return AVATAR_FRAME_STYLES[frameId] ?? null;
}
