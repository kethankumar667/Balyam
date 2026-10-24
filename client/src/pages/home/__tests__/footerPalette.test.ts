import { describe, expect, it } from "vitest";
import CSS from "../../../index.css?raw";
import CONFIG from "../../../../tailwind.config.js?raw";
import ART from "../FooterArtwork.tsx?raw";

const TOKENS = ["night", "deep", "glass", "panel", "ink", "soft", "mute", "gold", "orange", "cyan", "mint", "edge", "scene-ink"] as const;
type Token = typeof TOKENS[number];
type Rgb = readonly [number, number, number];

function palette(theme: "light" | "dark"): (token: Token) => Rgb {
  const selector = theme === "light"
    ? /(?:^|\n)\.bhalyam-footer\s*\{([^}]+)\}/
    : /:root\[data-theme="dark"\] \.bhalyam-footer\s*\{([^}]+)\}/;
  const declarations = CSS.match(selector)?.[1];
  if (!declarations) throw new Error(`Missing scoped ${theme} footer palette`);
  return token => {
    const channels = declarations.match(new RegExp(`--footer-${token}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`));
    if (!channels) throw new Error(`Missing ${theme} footer token ${token}`);
    return [Number(channels[1]), Number(channels[2]), Number(channels[3])];
  };
}

function luminance(rgb: Rgb): number {
  return rgb.reduce((total, channel, i) => {
    const srgb = channel / 255;
    return total + (srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function contrast(a: Rgb, b: Rgb): number {
  const values = [luminance(a), luminance(b)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe("footer palette declarations (rendered gradients are checked in Chromium)", () => {
  it("routes every utility through an opacity-aware CSS variable", () => {
    for (const token of TOKENS) {
      expect(CONFIG).toContain(`rgb(var(--footer-${token}) / <alpha-value>)`);
    }
  });

  it.each(["light", "dark"] as const)("defines every footer token in %s mode", theme => {
    const color = palette(theme);
    for (const token of TOKENS) {
      expect(color(token).every(channel => channel >= 0 && channel <= 255)).toBe(true);
    }
  });

  it("defaults to light surfaces with AA body/accent text on every surface", () => {
    const color = palette("light");
    for (const surface of ["night", "deep", "glass", "panel"] as const) {
      expect(luminance(color(surface))).toBeGreaterThan(0.75);
      for (const ink of ["ink", "soft", "mute", "gold", "cyan", "mint"] as const) {
        expect(contrast(color(ink), color(surface)), `${ink} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("preserves the existing dark palette", () => {
    const color = palette("dark");
    expect(TOKENS.map(token => color(token))).toEqual([
      [6, 16, 31], [16, 37, 68], [16, 37, 66], [24, 49, 82],
      [248, 250, 252], [184, 197, 216], [130, 148, 172],
      [255, 184, 0], [249, 115, 22], [39, 215, 242], [50, 214, 160],
      [125, 211, 252], [6, 16, 31],
    ]);
  });

  it("keeps playground silhouettes distinct from the light surface", () => {
    const color = palette("light");
    expect(ART).toContain('className="text-footer-scene-ink"');
    expect(contrast(color("scene-ink"), color("deep"))).toBeGreaterThanOrEqual(3);
  });
});
