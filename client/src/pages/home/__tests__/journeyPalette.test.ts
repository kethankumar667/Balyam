import { describe, expect, it } from "vitest";
import CSS from "../../../index.css?raw";
import CONFIG from "../../../../tailwind.config.js?raw";
import DASHBOARD from "../PlayerJourneyDashboard.tsx?raw";
import REFERRALS from "../ReferralQuest.tsx?raw";
import ART from "../JourneyArtwork.tsx?raw";

const SURFACES = ["canvas", "chip", "panel", "input", "play-start", "play-end", "level-start", "level-end", "social-start", "social-end"] as const;
const INKS = ["ink", "soft", "detail", "gold", "mint", "cyan", "violet"] as const;
const TOKENS = [...SURFACES, ...INKS, "edge", "track", "skeleton", "signal", "play-action", "play-hover"] as const;
type Rgb = readonly [number, number, number];

function palette(theme: "light" | "dark") {
  const selector = theme === "light"
    ? /(?:^|\n)\.bhalyam-journey\s*\{([^}]+)\}/
    : /:root\[data-theme="dark"\] \.bhalyam-journey\s*\{([^}]+)\}/;
  const declarations = CSS.match(selector)?.[1];
  if (!declarations) throw new Error(`Missing scoped ${theme} Journey palette`);
  return (token: typeof TOKENS[number]): Rgb => {
    const channels = declarations.match(new RegExp(`--journey-${token}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`));
    if (!channels) throw new Error(`Missing ${theme} Journey token ${token}`);
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

describe("Journey palette declarations (painted contrast is verified in Chromium)", () => {
  it("provides opacity-aware utilities for every scoped token", () => {
    for (const token of TOKENS) {
      expect(CONFIG).toContain(`rgb(var(--journey-${token}) / <alpha-value>)`);
    }
  });

  it.each(["light", "dark"] as const)("defines complete %s colors with AA text on all base surfaces", theme => {
    const color = palette(theme);
    for (const token of TOKENS) expect(color(token).every(channel => channel >= 0 && channel <= 255)).toBe(true);
    for (const surface of SURFACES) {
      for (const ink of INKS) {
        expect(contrast(color(ink), color(surface)), `${theme}: ${ink} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("uses light surfaces by default and retains the navy dark landscape", () => {
    for (const surface of SURFACES) expect(luminance(palette("light")(surface))).toBeGreaterThan(0.75);
    expect(palette("dark")("canvas")).toEqual([7, 20, 38]);
    expect(palette("dark")("play-start")).toEqual([24, 51, 61]);
    expect(palette("dark")("level-start")).toEqual([20, 45, 72]);
    expect(palette("dark")("social-start")).toEqual([48, 34, 63]);
  });

  it("themes the dashboard, invitation controls and decorative artwork without a JS theme branch", () => {
    expect(DASHBOARD).toContain("bhalyam-journey");
    for (const source of [DASHBOARD, REFERRALS]) {
      expect(source).not.toMatch(/(?:text|bg|border|from|to|ring(?:-offset)?)-\[#/);
      expect(source).not.toMatch(/(?:text|bg|border|ring)-(?:slate|amber|cyan|violet|emerald)-\d/);
      expect(source).not.toContain("useTheme");
    }
    expect(ART).toContain('stroke="currentColor"');
    expect(ART).toContain("text-journey-soft");
  });
});
