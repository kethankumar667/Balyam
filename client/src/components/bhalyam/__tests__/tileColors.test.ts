import { describe, it, expect } from "vitest";
import { BHALYAM_GAMES } from "../data";
import { CALM_BUTTON, calmTileSurface, lightTileSurface, withAlpha, HYBRID_CATEGORIES, HYBRID_FEATURED, hybridTileSurface } from "../tileColors";

/**
 * Game tiles are the first thing a player sees, so their colour has to do two jobs: keep the Play Now label
 * readable, and let neighbouring tiles be told apart. The light theme used to fail both. It faded white into the
 * game's DARK second colour, which went muddy, and six tiles were the same pink-red.
 */

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastWithWhite = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

describe("hybrid category palette", () => {
  it("keeps every category CTA readable at both gradient ends", () => {
    for (const category of [...Object.values(HYBRID_CATEGORIES), HYBRID_FEATURED]) {
      expect(contrastWithWhite(category.from)).toBeGreaterThanOrEqual(4.5);
      expect(contrastWithWhite(category.to)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses continuous category gradients and rims while reserving gold for featured", () => {
    for (const dark of [false, true]) {
      const regular = hybridTileSurface(HYBRID_CATEGORIES.board, dark, false);
      expect(regular.card.background).toContain("linear-gradient");
      expect(regular.card.border).toBe(HYBRID_CATEGORIES.board.border);
      expect(regular.rail).toBe("#2563EB");
      expect(regular.stage.background).toContain(dark ? "#2563EB" : "#EFF6FF");
      const featured = hybridTileSurface(HYBRID_CATEGORIES.board, dark, true);
      expect(featured.card.background).toContain("linear-gradient");
      expect(featured.button.background).toContain(HYBRID_FEATURED.from);
      expect(featured).toEqual(hybridTileSurface(HYBRID_CATEGORIES.retro, dark, true));
    }
  });

  it("uses the warm brand palette without inventing another colour for player-count tags", () => {
    expect(HYBRID_FEATURED.primary).toBe("#F59E0B");
    expect(HYBRID_CATEGORIES.board.primary).toBe("#2563EB");
    expect(HYBRID_CATEGORIES.retro.primary).toBe("#E11D48");
    expect(HYBRID_CATEGORIES.classroom.primary).toBe("#16A34A");
    expect(HYBRID_CATEGORIES.party.primary).toBe("#9333EA");
    expect(HYBRID_CATEGORIES.solo.primary).toBe(HYBRID_CATEGORIES.board.primary);
    expect(HYBRID_CATEGORIES.multiplayer.primary).toBe(HYBRID_CATEGORIES.board.primary);
  });
});

const hueAndSaturation = (hex: string): { hue: number; saturation: number } => {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return { hue: 0, saturation: 0 };
  const hue =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { hue: (hue * 60 + 360) % 360, saturation: d / (1 - Math.abs(max + min - 1)) };
};

const hueGap = (a: string, b: string): number => {
  const x = hueAndSaturation(a);
  const y = hueAndSaturation(b);
  const raw = Math.abs(x.hue - y.hue);
  return Math.min(raw, 360 - raw);
};

describe("Play Now button colours", () => {
  it.each(BHALYAM_GAMES.map((g) => [g.slug, g] as const))(
    "%s keeps white label text readable at both ends of its gradient",
    (_slug, game) => {
      expect(game.btnGradient).toBeDefined();
      const { from, to } = game.btnGradient!;
      expect(contrastWithWhite(from)).toBeGreaterThanOrEqual(4.5);
      expect(contrastWithWhite(to)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe("light tile tint colour", () => {
  // A dark accent (a deep red, say) at 12-24% over white is a dusty salmon, not a tint. The tint colour has to be bright.
  const MAX_TINT_CONTRAST_WITH_WHITE = 5;

  it.each(BHALYAM_GAMES.map((g) => [g.slug, g] as const))("%s uses a bright accent for its tint", (_slug, game) => {
    if (hueAndSaturation(game.accent.from).saturation < 0.3) return;
    expect(contrastWithWhite(game.accent.from)).toBeLessThanOrEqual(MAX_TINT_CONTRAST_WITH_WHITE);
  });
});

describe("neighbouring tiles", () => {
  const COLUMNS = 3;
  const NEUTRAL_SATURATION = 0.3;
  const MIN_HUE_GAP = 25;

  it("never sit next to a tile of the same colour family in a three-column grid", () => {
    const clashes: string[] = [];
    BHALYAM_GAMES.forEach((game, index) => {
      const right = index % COLUMNS < COLUMNS - 1 ? BHALYAM_GAMES[index + 1] : undefined;
      const below = BHALYAM_GAMES[index + COLUMNS];
      for (const other of [right, below]) {
        if (!other) continue;
        const a = game.btnGradient!.from;
        const b = other.btnGradient!.from;
        if (hueAndSaturation(a).saturation < NEUTRAL_SATURATION || hueAndSaturation(b).saturation < NEUTRAL_SATURATION) continue;
        if (hueGap(a, b) < MIN_HUE_GAP) clashes.push(`${game.slug} / ${other.slug}`);
      }
    });
    expect(clashes).toEqual([]);
  });
});

describe("calm tile surface", () => {
  const GREEN = "#16A34A";
  const ORANGE = "#F97316";

  it("keeps the card itself neutral, on the theme's own surface and rim", () => {
    for (const isDark of [false, true]) {
      const { card } = calmTileSurface(GREEN, isDark);
      expect(card.background).toBe("var(--surface-1)");
      expect(card.border).toBe("var(--rim-soft)");
      expect(card.background + card.border + card.shadow).not.toContain(GREEN);
    }
  });

  it("puts the game's colour only on the top rail and the art stage", () => {
    const { rail, stage } = calmTileSurface(GREEN, false);

    expect(rail).toBe(GREEN);
    expect(stage.background).toContain(GREEN);
    expect(stage.border).toContain(GREEN);
  });

  it("makes the stage a little stronger on dark, where a faint tint would vanish", () => {
    const alphaOf = (css: string) => parseInt(css.match(/#16A34A([0-9A-F]{2})/)![1], 16);
    expect(alphaOf(calmTileSurface(GREEN, true).stage.border)).toBeGreaterThan(alphaOf(calmTileSurface(GREEN, false).stage.border));
  });

  it("gives every game the same Play Now button, whatever its colour", () => {
    expect(calmTileSurface(GREEN, false).button).toEqual(calmTileSurface(ORANGE, true).button);
    expect(calmTileSurface(GREEN, false).button.background).toContain(CALM_BUTTON.from);
  });

  it("keeps the Play Now label readable at both ends of the button", () => {
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    expect(contrast(CALM_BUTTON.text, CALM_BUTTON.from)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(CALM_BUTTON.text, CALM_BUTTON.to)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("light tile surface", () => {
  it("fades from white into the game's bright colour only, never a dark second colour", () => {
    const surface = lightTileSurface("#16A34A");

    expect(surface.background).toMatch(/^linear-gradient\(155deg, #FFFFFF 0%/);
    expect(surface.background).toContain("#16A34A");
    expect(surface.border).toContain("#16A34A");
    expect(surface.shadow).toContain("#16A34A");
  });

  it("starts from the theme's own surface colour when one is passed", () => {
    expect(lightTileSurface("#16A34A", "var(--surface-1)").background).toContain("var(--surface-1) 0%");
  });

  it("keeps the tint soft enough to read dark text on", () => {
    const tail = lightTileSurface("#16A34A").background.match(/#16A34A([0-9A-F]{2}) 100%/);
    expect(tail).not.toBeNull();
    expect(parseInt(tail![1], 16) / 255).toBeLessThanOrEqual(0.3);
  });

  it("copes with a colour that is not a six-digit hex", () => {
    expect(withAlpha("hsl(120, 80%, 48%)", 0.2)).toContain("color-mix");
    expect(withAlpha("#16A34A", 1)).toBe("#16A34AFF");
  });
});
