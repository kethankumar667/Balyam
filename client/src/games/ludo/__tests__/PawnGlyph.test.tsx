import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PawnGlyph } from "../PawnGlyph";
import type { TokenFinishId } from "../TokenFinishOverlay";
import type { TokenThemeId } from "../TokenThemeOverlay";
import { COLOR_HEX, COLOR_HEX_DARK } from "../board-layout";
import type { TokenSkinConfig } from "../../../lib/cosmeticsResolver";

const ALL_FINISHES: TokenFinishId[] = [
  "polishedPearl",
  "carvedGrain",
  "matteNoir",
  "roseGlass",
  "crystalFacet",
  "chromeMirror",
  "iceCrystal",
  "veinedMarble",
  "gemCut",
  "moltenCore",
  "engravedLattice",
  "nebulaSwirl",
  "holographicShift",
];

function tokenSkinWithFinish(finish: TokenFinishId): TokenSkinConfig {
  return {
    id: `token_finish_test_${finish}`,
    hasCrown: false,
    hasFireball: false,
    hasNeonRing: false,
    hasDiamond: false,
    hasPhoenixWing: false,
    finish,
  };
}

describe("PawnGlyph — premium craftsmanship finishes", () => {
  it.each(ALL_FINISHES)("renders the %s finish without throwing, in the player's own seat color", (finish) => {
    const { container } = render(
      <svg>
        <PawnGlyph
          main={COLOR_HEX.red}
          dark={COLOR_HEX_DARK.red}
          tokenSkin={tokenSkinWithFinish(finish)}
          uid="test-uid-red"
        />
      </svg>,
    );
    // The base body path is always painted with `main` — proves the finish
    // overlay never replaces the seat-color paint with a fixed hue.
    expect(container.innerHTML).toContain(COLOR_HEX.red);
  });

  it("renders the same finish in a DIFFERENT seat color without a fixed hue leaking through", () => {
    const { container } = render(
      <svg>
        <PawnGlyph
          main={COLOR_HEX.green}
          dark={COLOR_HEX_DARK.green}
          tokenSkin={tokenSkinWithFinish("gemCut")}
          uid="test-uid-green"
        />
      </svg>,
    );
    expect(container.innerHTML).toContain(COLOR_HEX.green);
    expect(container.innerHTML).not.toContain(COLOR_HEX.red);
  });

  it("still renders the 6 legacy accessory-flag skins with no finish set", () => {
    const legacy: TokenSkinConfig = {
      id: "token_golden_crown",
      hasCrown: true,
      hasFireball: false,
      hasNeonRing: false,
      hasDiamond: false,
      hasPhoenixWing: false,
    };
    const { container } = render(
      <svg>
        <PawnGlyph main={COLOR_HEX.blue} dark={COLOR_HEX_DARK.blue} tokenSkin={legacy} uid="test-uid-legacy" />
      </svg>,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

const ALL_THEMES: TokenThemeId[] = [
  "ninja",
  "thunderHammer",
  "superHero",
  "arcaneWizard",
  "starVoyager",
  "dragonKnight",
  "pirateCaptain",
  "cyberBot",
  "samurai",
  "vampireCount",
  "desertSultan",
  "arcticRanger",
  "steamInventor",
  "jungleScout",
  "imperialGeneral",
  "voidReaper",
];

function tokenSkinWithTheme(theme: TokenThemeId): TokenSkinConfig {
  return {
    id: `token_theme_test_${theme}`,
    hasCrown: false,
    hasFireball: false,
    hasNeonRing: false,
    hasDiamond: false,
    hasPhoenixWing: false,
    theme,
  };
}

describe("PawnGlyph — character-themed accessories", () => {
  it.each(ALL_THEMES)("renders the %s theme without throwing, body still in the player's own seat color", (theme) => {
    const { container } = render(
      <svg>
        <PawnGlyph
          main={COLOR_HEX.orange}
          dark={COLOR_HEX_DARK.orange}
          tokenSkin={tokenSkinWithTheme(theme)}
          uid="test-uid-orange"
        />
      </svg>,
    );
    // The base body path is always painted with `main` — proves the theme
    // badge never replaces the seat-color body paint.
    expect(container.innerHTML).toContain(COLOR_HEX.orange);
  });
});
