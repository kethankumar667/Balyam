import type { GameTag } from "./data";

const SIX_DIGIT_HEX = /^#[0-9a-f]{6}$/i;

interface HybridPalette {
  label: string;
  primary: string;
  from: string;
  to: string;
  tint: string;
  border: string;
}

const BOARD_PALETTE = {
  label: "Board & Cards", primary: "#2563EB", from: "#2563EB", to: "#1D4ED8", tint: "#EFF6FF", border: "#93C5FD",
};

// Gold and green CTAs use deeper shades so white labels meet 4.5:1.
export const HYBRID_FEATURED = {
  label: "Featured", primary: "#F59E0B", from: "#B45309", to: "#92400E", tint: "#FFF7E6", border: "#FBBF24",
} satisfies HybridPalette;

export const HYBRID_CATEGORIES = {
  classroom: { label: "Classroom", primary: "#16A34A", from: "#15803D", to: "#166534", tint: "#F0FDF4", border: "#86EFAC" },
  board: BOARD_PALETTE,
  party: { label: "Party", primary: "#9333EA", from: "#9333EA", to: "#7E22CE", tint: "#FAF5FF", border: "#D8B4FE" },
  retro: { label: "Retro", primary: "#E11D48", from: "#E11D48", to: "#BE123C", tint: "#FDF2F8", border: "#F9A8D4" },
  solo: { ...BOARD_PALETTE, label: "Solo" },
  multiplayer: { ...BOARD_PALETTE, label: "Multiplayer" },
} satisfies Record<GameTag, HybridPalette>;

export function gameCardCategory(tags: readonly GameTag[]): GameTag {
  return tags.find((tag) => tag !== "solo" && tag !== "multiplayer") ?? tags[0] ?? "solo";
}

/** Artwork floats on a continuous category wash; featured cards keep the gold spotlight. */
export function hybridTileSurface(category: HybridPalette, isDark: boolean, featured: boolean) {
  const palette = featured ? HYBRID_FEATURED : category;
  return {
    card: {
      background: `linear-gradient(135deg, var(--surface-1) 0%, ${withAlpha(palette.primary, isDark ? 0.22 : 0.18)} 100%)`,
      border: palette.border,
      shadow: featured
        ? `0 10px 24px -14px ${withAlpha(palette.primary, 0.55)}, 0 3px 8px rgba(15,23,42,0.08)`
        : "0 3px 8px rgba(15,23,42,0.06)",
    },
    rail: palette.primary,
    stage: {
      background: isDark ? withAlpha(palette.primary, 0.12) : palette.tint,
      border: isDark ? withAlpha(palette.border, 0.25) : palette.border,
    },
    button: {
      background: `linear-gradient(180deg, ${palette.from}, ${palette.to})`,
      color: "#FFFFFF",
      shadow: `0 7px 12px -5px ${withAlpha(palette.to, 0.65)}, inset 0 1px 0 rgba(255,255,255,0.15)`,
    },
  };
}

/** `#RRGGBB` plus an alpha byte; anything else (an `hsl()` fallback accent) goes through `color-mix`. */
export function withAlpha(color: string, alpha: number): string {
  if (SIX_DIGIT_HEX.test(color)) {
    const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
    return `${color}${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

/** One Play Now button for every game: brand gold with dark ink, readable (>= 4.5:1) at both ends. */
export const CALM_BUTTON = { from: "#F5C842", to: "#E0A91E", text: "#3B2506" } as const;

/**
 * The calm tile: a neutral card with the game's colour on two small things only, a thin rail along the top and
 * the stage the artwork stands on.
 *
 * A full-colour wash per game fought the artwork (which is already colourful), made 25 different loud
 * buttons compete, and had to be hand-tuned for light and dark. Here the card is the theme's own surface, so
 * contrast is the same for every game and in both themes, and the colour that remains tells games apart
 * without carrying any text.
 */
export function calmTileSurface(accentFrom: string, isDark: boolean) {
  return {
    card: {
      background: "var(--surface-1)",
      border: "var(--rim-soft)",
      shadow: isDark
        ? "0 14px 30px -18px rgba(0,0,0,0.75)"
        : "0 1px 2px rgba(15,23,42,0.06), 0 12px 26px -16px rgba(15,23,42,0.22)",
    },
    rail: accentFrom,
    stage: {
      background: `radial-gradient(circle at 50% 38%, ${withAlpha(accentFrom, isDark ? 0.3 : 0.22)} 0%, ${withAlpha(accentFrom, isDark ? 0.12 : 0.08)} 62%, transparent 100%)`,
      border: withAlpha(accentFrom, isDark ? 0.34 : 0.22),
    },
    button: {
      background: `linear-gradient(180deg, ${CALM_BUTTON.from}, ${CALM_BUTTON.to})`,
      color: CALM_BUTTON.text,
      shadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 6px 14px -6px rgba(180,120,0,0.55)",
    },
  };
}

/**
 * The light-theme look of a game tile: white fading into ONE bright tint of the game's colour.
 *
 * It used to fade into the game's dark second colour as well, and a translucent dark red, brown or green over
 * white is a dusty grey-pink, not a tint. Using only the bright colour keeps every tile clean and lets the
 * hue, not the muddiness, tell the games apart. `base` is the top-left colour, for a tile that sits on a themed
 * surface rather than plain white.
 */
export function lightTileSurface(accentFrom: string, base = "#FFFFFF") {
  return {
    background: `linear-gradient(155deg, ${base} 0%, ${withAlpha(accentFrom, 0.12)} 42%, ${withAlpha(accentFrom, 0.24)} 100%)`,
    border: withAlpha(accentFrom, 0.4),
    shadow: `0 16px 34px -14px ${withAlpha(accentFrom, 0.4)}, inset 0 2px 2px rgba(255,255,255,0.95)`,
  };
}
