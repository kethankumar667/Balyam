const SIX_DIGIT_HEX = /^#[0-9a-f]{6}$/i;

/** `#RRGGBB` plus an alpha byte; anything else (an `hsl()` fallback accent) goes through `color-mix`. */
export function withAlpha(color: string, alpha: number): string {
  if (SIX_DIGIT_HEX.test(color)) {
    const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
    return `${color}${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
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
