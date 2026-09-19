/**
 * Picks the more readable of two ink colours for text drawn on a solid
 * background, using WCAG 2.x relative luminance / contrast ratio.
 *
 * The academy paints text on each game's `primaryAccent` (a Next button, an
 * icon tile). A fixed dark ink fails on the darker accents (#8C5A2B, #B45309,
 * #DC2626), so the ink is derived from the accent instead.
 */

export const DARK_INK = "#0B1120";
export const LIGHT_INK = "#FFFFFF";

type Rgb = readonly [number, number, number];

const HEX_3 = /^[0-9a-f]{3}$/i;
const HEX_6 = /^[0-9a-f]{6}$/i;
const CHANNEL_MAX = 255;
const SRGB_LINEAR_CUTOFF = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_DIVISOR = 1.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_WEIGHTS: Rgb = [0.2126, 0.7152, 0.0722];
const CONTRAST_FLARE = 0.05;

function parseHex(input: string): Rgb | null {
  const digits = input.trim().replace(/^#/, "");
  const full = HEX_3.test(digits)
    ? digits
        .split("")
        .map((c) => c + c)
        .join("")
    : digits;
  if (!HEX_6.test(full)) return null;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function linearChannel(channel: number): number {
  const c = channel / CHANNEL_MAX;
  return c <= SRGB_LINEAR_CUTOFF
    ? c / SRGB_LINEAR_DIVISOR
    : ((c + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA;
}

function relativeLuminance(rgb: Rgb): number {
  return rgb.reduce((sum, channel, i) => sum + LUMINANCE_WEIGHTS[i] * linearChannel(channel), 0);
}

/** WCAG contrast ratio (1 to 21) between two hex colours; 1 if either is unparseable. */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return 1;
  const [lighter, darker] = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a);
  return (lighter + CONTRAST_FLARE) / (darker + CONTRAST_FLARE);
}

/** Dark or white ink, whichever contrasts more with `backgroundHex`. Dark for unparseable input. */
export function readableTextColor(backgroundHex: string): typeof DARK_INK | typeof LIGHT_INK {
  if (!parseHex(backgroundHex)) return DARK_INK;
  return contrastRatio(LIGHT_INK, backgroundHex) > contrastRatio(DARK_INK, backgroundHex)
    ? LIGHT_INK
    : DARK_INK;
}
