/**
 * BHALYAM — Cosmetics Boutique Premium Design Tokens
 *
 * Single source of truth for the boutique's "Enchanted Display Vault" visual
 * language: surface elevation, rarity hierarchy, glow scale, and motion
 * timing. Everything here was previously scattered and duplicated three
 * times over (CosmeticsItemCard's own rarity switch, CosmeticsPreviewStage's
 * own separate rarity switch, and a THIRD copy of dice-material colors
 * inline in CosmeticsItemCard's thumbnail, independent of
 * `lib/cosmeticsResolver.ts`'s DICE_SKINS registry) — three places that could
 * silently drift out of sync, which is exactly how "Legendary" could end up
 * looking less premium in one place than another.
 *
 * Deliberately its OWN local palette, not a reuse of `tailwind.config.js`'s
 * `sand`/`chest`/`lamp` global theme: that ladder is warm-cream, built for
 * the app's parchment/wood identity (see its own header comment). The
 * boutique is an intentionally separate dark "vault" surface — the same
 * pattern already established by `bhalyam.*`, `nostalgia.*`, and `hc.*` in
 * that same config, each a self-contained palette scoped to one feature.
 * This module is that pattern's cosmetics-boutique instance, just expressed
 * as importable TS constants (inline hex/rgba, matching how these
 * components already write color — `bg-[#090d18]` etc.) rather than new
 * Tailwind utility classes, so no shared config file needs editing.
 */

import type { CosmeticRarity } from "@shared/cosmetics";

// ─────────────────────────────────────────────────────────────────────────
// Surface elevation — the modal shell and everything stacked on top of it
// ─────────────────────────────────────────────────────────────────────────

export interface CosmeticSurfaceTokens {
  /** The modal shell itself — deepest layer. */
  readonly base: string;
  /** Cards, the catalog grid container, the financial-context panel. */
  readonly raised: string;
  /** Floating chips, badges, popovers that sit above raised surfaces. */
  readonly overlay: string;
  /** Sunken wells — progress track backgrounds, input-like surfaces. */
  readonly inset: string;
  /** A 1px inner highlight for the topmost edge of a raised/base surface,
   *  simulating a soft key light grazing the panel from above. */
  readonly edgeLight: string;
}

export const COSMETIC_SURFACE: CosmeticSurfaceTokens = {
  base: "linear-gradient(180deg, #0f1526 0%, #0a0e1a 45%, #050710 100%)",
  raised: "linear-gradient(180deg, #131a2e 0%, #0d1322 100%)",
  overlay: "rgba(19, 26, 46, 0.92)",
  inset: "rgba(2, 4, 10, 0.55)",
  edgeLight: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

/**
 * Light-mode counterpart to `COSMETIC_SURFACE`, added so the boutique shell
 * (modal panel, header/footer bars, tab strip, item-grid container) can
 * follow the app's real light/dark toggle (`lib/useTheme.ts`) instead of
 * always forcing the dark "vault" look. Built from the same `sand` ramp the
 * rest of the app's light identity already uses (tailwind.config.js) rather
 * than a third invented palette. `COSMETIC_SURFACE` above is kept exactly as
 * it was — it's still the dark value returned by `getCosmeticSurface` and is
 * also what `CosmeticsPreviewStage` uses permanently (see that file's own
 * comment on why the preview stage stays a fixed dark "display case").
 */
export const COSMETIC_SURFACE_LIGHT: CosmeticSurfaceTokens = {
  base: "linear-gradient(180deg, #FFFDF7 0%, #FBF5E9 55%, #F3E7D3 100%)",
  raised: "linear-gradient(180deg, #FFFFFF 0%, #FBF5E9 100%)",
  overlay: "rgba(255, 253, 247, 0.92)",
  inset: "rgba(230, 212, 181, 0.35)",
  edgeLight: "inset 0 1px 0 rgba(255,255,255,0.9)",
};

export function getCosmeticSurface(theme: "light" | "dark"): CosmeticSurfaceTokens {
  return theme === "light" ? COSMETIC_SURFACE_LIGHT : COSMETIC_SURFACE;
}

// ─────────────────────────────────────────────────────────────────────────
// Rarity hierarchy — the core of the premium feel
// ─────────────────────────────────────────────────────────────────────────

/**
 * How much ambient particle presence a rarity earns. Never used as the ONLY
 * signal for rarity (border hue + badge text + this density together), per
 * "never communicate rarity through color alone."
 *   0 — Common:    no particles, minimal glow.
 *   1 — Rare:      a handful of slow, sparse shimmer motes.
 *   2 — Epic:      orbiting accent points, slow rotation.
 *   3 — Legendary: light rays + a slow animated edge sweep, in addition to shimmer.
 */
export type ParticleTier = 0 | 1 | 2 | 3;

export interface RarityVisualTokens {
  readonly key: CosmeticRarity;
  readonly label: string;
  /** Tile border classes, resting (unselected) state. */
  readonly border: string;
  readonly borderHover: string;
  /** Tile border + background wash when this tile IS the active preview
   *  selection — the rarity hue is kept; selection itself is signaled by
   *  the separate, constant amber ring applied by the caller, never by
   *  recoloring the border away from its rarity hue. */
  readonly borderSelected: string;
  readonly surfaceSelected: string;
  /** Small rarity-label pill (catalog card top-left chip). */
  readonly badge: string;
  /** Bolder, filled eyebrow pill (preview-stage header). */
  readonly eyebrowPill: string;
  readonly accentText: string;
  /** Elevated glow shadow for hover/selected states. */
  readonly glowShadow: string;
  /** Radial atmosphere gradient stops behind the preview artifact. */
  readonly ambientGlow: string;
  /** Hex for SVG rune-ring / particle strokes. */
  readonly runeStroke: string;
  readonly particleTier: ParticleTier;
}

export const RARITY_TOKENS: Record<CosmeticRarity, RarityVisualTokens> = {
  COMMON: {
    key: "COMMON",
    label: "Common",
    border: "border-zinc-800",
    borderHover: "hover:border-zinc-600",
    borderSelected: "border-zinc-400/80",
    surfaceSelected: "bg-[#141824]",
    badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
    eyebrowPill: "bg-gradient-to-r from-zinc-500 to-zinc-600 text-white font-bold",
    accentText: "text-zinc-300",
    glowShadow: "0 0 14px rgba(161,161,170,0.18)",
    ambientGlow: "from-zinc-400/10 via-zinc-700/5 to-transparent",
    runeStroke: "#a1a1aa",
    particleTier: 0,
  },
  RARE: {
    key: "RARE",
    label: "Rare",
    border: "border-sky-500/30",
    borderHover: "hover:border-sky-400/60",
    borderSelected: "border-sky-400/80",
    surfaceSelected: "bg-[#0f1c2e]",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    eyebrowPill: "bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold",
    accentText: "text-sky-300",
    glowShadow: "0 0 20px rgba(56,189,248,0.28)",
    ambientGlow: "from-sky-500/25 via-blue-900/10 to-transparent",
    runeStroke: "#38bdf8",
    particleTier: 1,
  },
  EPIC: {
    key: "EPIC",
    label: "Epic",
    border: "border-purple-500/30",
    borderHover: "hover:border-purple-400/60",
    borderSelected: "border-purple-400/80",
    surfaceSelected: "bg-[#160f2e]",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    eyebrowPill: "bg-gradient-to-r from-purple-400 to-fuchsia-500 text-white font-black",
    accentText: "text-purple-300",
    glowShadow: "0 0 24px rgba(168,85,247,0.32)",
    ambientGlow: "from-purple-500/28 via-fuchsia-900/12 to-transparent",
    runeStroke: "#a855f7",
    particleTier: 2,
  },
  LEGENDARY: {
    key: "LEGENDARY",
    label: "Legendary",
    border: "border-amber-500/35",
    borderHover: "hover:border-amber-400/70",
    borderSelected: "border-amber-400/80",
    surfaceSelected: "bg-[#221a0c]",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    eyebrowPill: "bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 text-black font-black",
    accentText: "text-amber-300",
    glowShadow: "0 0 32px rgba(245,158,11,0.4)",
    ambientGlow: "from-amber-400/35 via-amber-700/14 to-transparent",
    runeStroke: "#f59e0b",
    particleTier: 3,
  },
};

export function getRarityTokens(rarity: CosmeticRarity): RarityVisualTokens {
  return RARITY_TOKENS[rarity] ?? RARITY_TOKENS.COMMON;
}

/**
 * Theme-reactive counterpart to `RARITY_TOKENS`, for the boutique surfaces
 * that now follow the app's real light/dark toggle (the item grid tiles in
 * `CosmeticsItemCard`) rather than the fixed-dark preview stage. Each field
 * pairs a light-mode-safe (WCAG-legible-on-cream) class with a `dark:`
 * variant carrying the ORIGINAL `RARITY_TOKENS` value verbatim — so every
 * existing dark-mode class name substring (e.g. `border-purple-400/80`,
 * checked by name in cosmeticsBoutiquePolish.test.tsx) is still present,
 * just now inside a `dark:` prefix that only activates under
 * `[data-theme="dark"]`. Only the fields that actually carry page-background
 * -dependent contrast (borders, badge/accent text, selected-surface fill)
 * need a light variant — `eyebrowPill` is an opaque filled pill (its own
 * background, not the page's) and `glowShadow`/`ambientGlow`/`runeStroke`
 * are only ever drawn against the preview stage's fixed dark backdrop, so
 * those are reused unchanged from `RARITY_TOKENS`.
 */
export const RARITY_TOKENS_ADAPTIVE: Record<CosmeticRarity, RarityVisualTokens> = {
  COMMON: {
    ...RARITY_TOKENS.COMMON,
    border: "border-stone-300 dark:border-zinc-800",
    borderHover: "hover:border-stone-400 dark:hover:border-zinc-600",
    borderSelected: "border-stone-500/80 dark:border-zinc-400/80",
    surfaceSelected: "bg-stone-100 dark:bg-[#141824]",
    badge: "bg-stone-200 text-stone-700 border-stone-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    accentText: "text-stone-600 dark:text-zinc-300",
  },
  RARE: {
    ...RARITY_TOKENS.RARE,
    border: "border-sky-600/40 dark:border-sky-500/30",
    borderHover: "hover:border-sky-700/70 dark:hover:border-sky-400/60",
    borderSelected: "border-sky-600/80 dark:border-sky-400/80",
    surfaceSelected: "bg-sky-50 dark:bg-[#0f1c2e]",
    badge: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
    accentText: "text-sky-700 dark:text-sky-300",
  },
  EPIC: {
    ...RARITY_TOKENS.EPIC,
    border: "border-purple-600/40 dark:border-purple-500/30",
    borderHover: "hover:border-purple-700/70 dark:hover:border-purple-400/60",
    borderSelected: "border-purple-600/80 dark:border-purple-400/80",
    surfaceSelected: "bg-purple-50 dark:bg-[#160f2e]",
    badge: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40",
    accentText: "text-purple-700 dark:text-purple-300",
  },
  LEGENDARY: {
    ...RARITY_TOKENS.LEGENDARY,
    border: "border-amber-600/45 dark:border-amber-500/35",
    borderHover: "hover:border-amber-700/80 dark:hover:border-amber-400/70",
    borderSelected: "border-amber-600/90 dark:border-amber-400/80",
    surfaceSelected: "bg-amber-50 dark:bg-[#221a0c]",
    badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40",
    accentText: "text-amber-800 dark:text-amber-300",
  },
};

export function getRarityTokensAdaptive(rarity: CosmeticRarity): RarityVisualTokens {
  return RARITY_TOKENS_ADAPTIVE[rarity] ?? RARITY_TOKENS_ADAPTIVE.COMMON;
}

// ─────────────────────────────────────────────────────────────────────────
// Glow scale — for surfaces that aren't rarity-driven (CTA, wallet chip)
// ─────────────────────────────────────────────────────────────────────────

export const COSMETIC_GLOW = {
  soft: "0 0 12px rgba(245,158,11,0.18)",
  medium: "0 0 22px rgba(245,158,11,0.32)",
  intense: "0 0 34px rgba(245,158,11,0.5)",
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Radius — reuses the existing Tailwind scale by name, documented here so
// component authors reach for the same three steps instead of one-off px
// values. `rounded-2xl` / `rounded-3xl` are Tailwind config overrides
// already (see tailwind.config.js) — no new values are declared.
// ─────────────────────────────────────────────────────────────────────────

export const COSMETIC_RADIUS = {
  tile: "rounded-xl",
  panel: "rounded-2xl",
  shell: "rounded-3xl",
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Motion — durations in seconds (framer-motion's unit), reusing the app's
// own spring/easing curves from lib/motion.ts rather than inventing new ones.
// ─────────────────────────────────────────────────────────────────────────

export const COSMETIC_MOTION = {
  fast: 0.18,
  base: 0.32,
  slow: 0.55,
} as const;
