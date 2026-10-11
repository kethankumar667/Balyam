import { describe, it, expect } from "vitest";
import { AVATAR_FRAME_CATALOG, AVATAR_FRAME_DEFAULT_ID, CARROM_COIN_SET_CATALOG, CARROM_COIN_SET_DEFAULT_ID } from "@shared/cosmeticsFramesAndCoins";
import { AVATAR_FRAME_STYLES, getAvatarFrameStyle } from "../avatarFrameStyles";
import { CARROM_COIN_SET_STYLES, getCarromCoinSetStyle } from "../carromCoinSetStyles";

/**
 * Every item the shop can sell has to have a look, and the looks have to stay safe to play with.
 * The frame test guards seat layout (a ring that reaches too far pushes into its neighbour on a
 * phone). The coin test guards the one thing a coin must never fail at: telling the two sides,
 * and the queen, apart.
 */

function channel(hex: string, from: number): number {
  return parseInt(hex.slice(from, from + 2), 16);
}

function relativeLuminance(hex: string): number {
  const linear = [1, 3, 5].map((from) => {
    const value = channel(hex, from) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function colourDistance(a: string, b: string): number {
  return Math.hypot(channel(a, 1) - channel(b, 1), channel(a, 3) - channel(b, 3), channel(a, 5) - channel(b, 5));
}

describe("avatar frame looks", () => {
  it("covers every frame in the catalog and draws nothing for the default", () => {
    for (const entry of AVATAR_FRAME_CATALOG) {
      expect(entry.id in AVATAR_FRAME_STYLES, `${entry.id} has no look`).toBe(true);
    }
    expect(getAvatarFrameStyle(AVATAR_FRAME_DEFAULT_ID)).toBeNull();
  });

  it("draws nothing for a missing or unknown frame id", () => {
    expect(getAvatarFrameStyle(undefined)).toBeNull();
    expect(getAvatarFrameStyle("frame_from_a_future_release")).toBeNull();
  });

  it("never reaches more than six pixels outside the portrait", () => {
    for (const style of Object.values(AVATAR_FRAME_STYLES)) {
      if (!style) continue;
      const innerReach = style.innerRing ? style.innerRing.width + style.innerRing.gap : 0;
      expect(innerReach + style.ringWidth, `${style.id} reaches too far`).toBeLessThanOrEqual(6);
    }
  });

  it("keeps every animated frame to the two motions that respect reduced-motion", () => {
    const motions = Object.values(AVATAR_FRAME_STYLES).map((style) => style?.motion).filter(Boolean);
    expect(motions.length).toBeGreaterThan(0);
    for (const motion of motions) expect(["spin", "pulse"]).toContain(motion);
  });
});

describe("carrom coin set looks", () => {
  const forSale = CARROM_COIN_SET_CATALOG.filter((entry) => entry.id !== CARROM_COIN_SET_DEFAULT_ID);

  it("covers every set in the catalog", () => {
    for (const entry of CARROM_COIN_SET_CATALOG) {
      expect(entry.id in CARROM_COIN_SET_STYLES, `${entry.id} has no look`).toBe(true);
    }
  });

  it("falls back to the classic set for an unknown id", () => {
    expect(getCarromCoinSetStyle("carromcoin_from_a_future_release").id).toBe(CARROM_COIN_SET_DEFAULT_ID);
    expect(getCarromCoinSetStyle(undefined).id).toBe(CARROM_COIN_SET_DEFAULT_ID);
  });

  it.each(CARROM_COIN_SET_CATALOG.map((entry) => entry.id))("%s keeps the two sides easy to tell apart", (id) => {
    const set = getCarromCoinSetStyle(id);
    expect(contrastRatio(set.white.body, set.black.body)).toBeGreaterThanOrEqual(3);
  });

  it.each(forSale.map((entry) => entry.id))("%s keeps the queen distinct from both sides", (id) => {
    const set = getCarromCoinSetStyle(id);
    expect(colourDistance(set.queen.body, set.white.body)).toBeGreaterThanOrEqual(90);
    expect(colourDistance(set.queen.body, set.black.body)).toBeGreaterThanOrEqual(90);
  });

  it("gives every set for sale its own pair of colours", () => {
    const pairs = forSale.map((entry) => {
      const set = getCarromCoinSetStyle(entry.id);
      return `${set.white.body}|${set.black.body}`;
    });
    expect(new Set(pairs).size).toBe(pairs.length);
  });
});
