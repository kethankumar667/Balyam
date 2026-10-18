import { describe, expect, it } from "vitest";
// `?raw` rather than node:fs — the client is typed for the browser (no
// @types/node), and Vite resolves these through the same pipeline the app
// uses, so the test reads exactly what ships.
import CSS from "../../../index.css?raw";
import SVG from "../PrintBoardSVG.tsx?raw";
import CROSS from "../ludo-board-shared.tsx?raw";
import SCENE from "../LudoWorldScene.tsx?raw";
import SETTINGS from "../settings.ts?raw";
import ROOM from "../../../pages/Room.tsx?raw";
import { artWorldsFor } from "../../../lib/worlds/worldArt";
import { WORLD_META } from "../../../lib/worlds/worldMeta";
import type { WorldId } from "@shared/worlds";

/**
 * How a table's world reaches the Ludo board.
 *
 * These tests exist because of a bug that was invisible from the UI: the old picker wrote the choice through
 * correctly, but the CSS behind it targeted `.track-cell`, a class no element carried, so every theme rendered
 * identically and nothing failed. So the contract worth pinning is not "does a setting change" but "does every
 * world Ludo offers reach real pixels": a variable block in the stylesheet, class hooks in the SVG for the rules to
 * bind to, and the paints those rules point at.
 *
 * The board's LOOK is the host's choice for the whole table now, not a setting of each player: the old per-player
 * themes (paper, neon, emerald, midnight, sunset) are gone, and no world may switch the app between light and dark.
 */

const LUDO_WORLDS: readonly WorldId[] = artWorldsFor("ludo");

/** Custom properties every world's block must define for the board surface. */
const BOARD_VARS = ["--ludo-bg", "--ludo-paper", "--ludo-cell", "--ludo-ink", "--ludo-star", "--ludo-hub", "--ludo-label"] as const;

/** Custom properties every world's block must define for the chrome round the board. */
const CHROME_VARS = [
  "--ludo-font",
  "--ludo-screen-bg",
  "--ludo-screen-border",
  "--ludo-card-bg",
  "--ludo-card-border",
  "--ludo-card-text",
  "--ludo-card-subtext",
  "--ludo-chip-bg",
  "--ludo-chip-border",
  "--ludo-chip-text",
  "--ludo-panel-bg",
  "--ludo-panel-border",
  "--ludo-panel-text",
  "--ludo-feed-bg",
  "--ludo-feed-border",
  "--ludo-feed-text",
  "--ludo-nav-bg",
  "--ludo-nav-border",
  "--ludo-nav-text",
] as const;

/** Classes the world rules bind to; each must exist in the board SVG. */
const REQUIRED_HOOKS = ["board-bg-rect", "ludo-paper", "track-cell", "ludo-grid", "ludo-lane", "ludo-star", "ludo-hub", "ludo-arm-label"] as const;

/**
 * Body of the `.theme-<id>` variable block, if one exists.
 *
 * Anchored to the start of a line so it selects the standalone variable block and not
 * `.ludo-board.theme-<id> { background: … }`, which also contains the substring `.theme-<id> {`.
 */
function worldBlock(id: WorldId): string | null {
  const m = CSS.match(new RegExp(`^\\.theme-${id}\\s*\\{([^}]*)\\}`, "m"));
  return m ? m[1] : null;
}

describe("the worlds Ludo can draw", () => {
  it("includes the classic table and has a name for every world", () => {
    expect(LUDO_WORLDS).toContain("classic");
    for (const id of LUDO_WORLDS) expect(WORLD_META[id].name, `name for ${id}`).toBeTruthy();
  });

  it("no longer has the old per-player colour themes", () => {
    for (const old of ["paper", "emerald", "midnight", "sunset"]) {
      expect(CSS, `.theme-${old} should be gone`).not.toMatch(new RegExp(`^\\.theme-${old}\\s*\\{`, "m"));
    }
    expect(CSS).not.toMatch(/^\.theme-neon\s*\{/m);
  });
});

describe("every world reaches real pixels", () => {
  it("has a .theme-<id> block in index.css", () => {
    for (const id of LUDO_WORLDS) expect(worldBlock(id), `missing .theme-${id} block in index.css`).not.toBeNull();
  });

  it("defines every board surface variable in each block", () => {
    for (const id of LUDO_WORLDS) {
      const block = worldBlock(id) ?? "";
      for (const v of BOARD_VARS) expect(block, `.theme-${id} is missing ${v}`).toContain(v);
    }
  });

  it("defines every piece of chrome in each block, so no world leaves another world's colour on screen", () => {
    for (const id of LUDO_WORLDS) {
      const block = worldBlock(id) ?? "";
      for (const v of CHROME_VARS) expect(block, `.theme-${id} is missing ${v}`).toContain(v);
    }
  });

  it("gives each world its own board background", () => {
    // Without this the wrapper's Tailwind `bg-white` shows through and a dark board sits in a white frame.
    for (const id of LUDO_WORLDS) {
      expect(CSS, `no background rule for .ludo-board.theme-${id}`).toMatch(new RegExp(`\\.ludo-board\\.theme-${id}\\s*\\{[^}]*background`));
    }
  });

  it("makes the worlds differ in more than colour: a world fills its tiles with its own paint, or draws a scene", () => {
    const own = LUDO_WORLDS.filter((id) => id !== "classic");
    expect(own.length).toBeGreaterThan(0);
    for (const id of own) {
      expect(worldBlock(id) ?? "", `.theme-${id} should paint its tiles`).toMatch(/--ludo-cell:\s*url\(#lw-/);
      expect(SCENE, `LudoWorldScene should draw ${id}`).toContain(id === "toy" ? "ToyScene" : "PalaceScene");
    }
  });

  it("defines the paint every world's tiles point at", () => {
    for (const id of LUDO_WORLDS) {
      const match = (worldBlock(id) ?? "").match(/--ludo-cell:\s*url\(#([^)]+)\)/);
      if (match) expect(SCENE, `no <linearGradient id="${match[1]}"> in LudoWorldScene`).toContain(`id="${match[1]}"`);
    }
  });
});

describe("stylesheet hooks match the board SVG", () => {
  it("only styles classes that PrintBoardSVG actually renders", () => {
    for (const hook of REQUIRED_HOOKS) expect(SVG, `PrintBoardSVG renders no className="${hook}"`).toContain(hook);
  });

  it("binds each hook from a .ludo-board rule", () => {
    for (const hook of REQUIRED_HOOKS) expect(CSS, `no .ludo-board .${hook} rule`).toMatch(new RegExp(`\\.ludo-board\\s+\\.${hook}\\b`));
  });

  it("themes the tiles of the four-arm board as well, through the same variable", () => {
    expect(CROSS).toContain("var(--ludo-cell");
    expect(CROSS).toContain("track-cell");
  });

  it("does not repaint seat colours", () => {
    // Seat colour is player identity and lives in print-board.ts SEAT_COLORS / board-layout.ts COLOR_HEX. A world
    // that overrode the seat gradients would break recognition at a glance.
    for (const id of LUDO_WORLDS) expect(worldBlock(id) ?? "").not.toMatch(/--ludo-seat|seat-\d/);
  });
});

describe("a world never changes the app's own light or dark", () => {
  it("is not written by Ludo's settings, which no longer touch the document theme", () => {
    expect(SETTINGS).not.toContain("setTheme");
    expect(SETTINGS).not.toContain("syncDocumentTheme");
  });

  it("is not applied to the document by the room screen either", () => {
    expect(ROOM).not.toContain("syncDocumentTheme");
  });
});
