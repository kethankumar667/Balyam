import { describe, expect, it } from "vitest";
// `?raw` rather than node:fs — the client is typed for the browser (no
// @types/node), and Vite resolves these through the same pipeline the app
// uses, so the test reads exactly what ships.
import CSS from "../../../index.css?raw";
import SVG from "../PrintBoardSVG.tsx?raw";
import {
  LUDO_THEMES,
  LUDO_THEME_LABELS,
  LUDO_THEME_SWATCH,
  type LudoTheme,
} from "../settings";

/**
 * Board theme wiring.
 *
 * These tests exist because of a bug that was invisible from the UI: the
 * picker offered Classic / Neon / Paper and wrote the choice through
 * correctly, but the CSS behind it targeted `.track-cell` — a class no
 * element in PrintBoardSVG carried — and `.board-bg-rect`, which the board
 * silhouette paints straight over. All three themes therefore rendered
 * identically, and nothing anywhere failed. Players reported it as "we want
 * board themes" for a feature that had shipped.
 *
 * So the contract worth pinning is not "does the picker set state" (it
 * always did) but "does every declared theme reach real pixels": a variable
 * block in the stylesheet, and class hooks in the SVG for the rules to bind
 * to.
 */

/** Custom properties every theme block must define. */
const REQUIRED_VARS = [
  "--ludo-bg",
  "--ludo-paper",
  "--ludo-cell",
  "--ludo-ink",
  "--ludo-star",
  "--ludo-hub",
  "--ludo-label",
] as const;

/** Classes the theme rules bind to; each must exist in the board SVG. */
const REQUIRED_HOOKS = [
  "board-bg-rect",
  "ludo-paper",
  "track-cell",
  "ludo-grid",
  "ludo-lane",
  "ludo-star",
  "ludo-hub",
  "ludo-arm-label",
] as const;

/**
 * Body of the `.theme-<id>` variable block, if one exists.
 *
 * Anchored to the start of a line so it selects the standalone variable
 * block and not `.ludo-board.theme-<id> { background: … }`, which also
 * contains the substring `.theme-<id> {`.
 */
function themeBlock(id: LudoTheme): string | null {
  const m = CSS.match(new RegExp(`^\\.theme-${id}\\s*\\{([^}]*)\\}`, "m"));
  return m ? m[1] : null;
}

describe("theme catalogue", () => {
  it("gives every theme a label and a swatch", () => {
    for (const id of LUDO_THEMES) {
      expect(LUDO_THEME_LABELS[id], `label for ${id}`).toBeTruthy();
      expect(LUDO_THEME_SWATCH[id], `swatch for ${id}`).toHaveLength(2);
    }
  });

  it("keeps the three original ids so a stored preference still resolves", () => {
    // settings.ts merges localStorage over defaults without validating, so
    // dropping one of these would leave existing players on a theme id with
    // no stylesheet block behind it.
    for (const legacy of ["classic", "neon", "paper"] as const) {
      expect(LUDO_THEMES).toContain(legacy);
    }
  });
});

describe("every theme reaches real pixels", () => {
  it("has a .theme-<id> block in index.css", () => {
    for (const id of LUDO_THEMES) {
      expect(themeBlock(id), `missing .theme-${id} block in index.css`).not.toBeNull();
    }
  });

  it("defines every board surface variable in each block", () => {
    for (const id of LUDO_THEMES) {
      const block = themeBlock(id) ?? "";
      for (const v of REQUIRED_VARS) {
        expect(block, `.theme-${id} is missing ${v}`).toContain(v);
      }
    }
  });

  it("gives each theme its own board background", () => {
    // Without this the wrapper's Tailwind `bg-white` shows through and a
    // dark board sits in a white frame.
    for (const id of LUDO_THEMES) {
      expect(CSS, `no background rule for .ludo-board.theme-${id}`).toMatch(
        new RegExp(`\\.ludo-board\\.theme-${id}\\s*\\{[^}]*background`),
      );
    }
  });
});

describe("stylesheet hooks match the board SVG", () => {
  it("only styles classes that PrintBoardSVG actually renders", () => {
    // The original defect in one assertion: `.track-cell` was styled but
    // never rendered.
    for (const hook of REQUIRED_HOOKS) {
      expect(SVG, `PrintBoardSVG renders no className="${hook}"`).toContain(hook);
    }
  });

  it("binds each hook from a .ludo-board rule", () => {
    for (const hook of REQUIRED_HOOKS) {
      expect(CSS, `no .ludo-board .${hook} rule`).toMatch(
        new RegExp(`\\.ludo-board\\s+\\.${hook}\\b`),
      );
    }
  });

  it("does not repaint seat colours", () => {
    // Seat colour is player identity and lives in print-board.ts
    // SEAT_COLORS / board-layout.ts COLOR_HEX. A theme that overrode the
    // seat gradients would break recognition at a glance.
    for (const id of LUDO_THEMES) {
      expect(themeBlock(id) ?? "").not.toMatch(/--ludo-seat|seat-\d/);
    }
  });
});
