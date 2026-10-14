import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BHALYAM_COSMETIC_REGISTRY } from "@shared/cosmetics";
import { PawnGlyph } from "../../PawnGlyph";
import { TOKEN_SKINS, getTokenSkinConfig } from "../../../../lib/cosmeticsResolver";
import type { TokenFigurineType } from "../TokenFigurineRenderer";

const COLLECTIBLE_IDS = BHALYAM_COSMETIC_REGISTRY.filter(
  (d) => d.category === "TOKEN_SKIN" && TOKEN_SKINS[d.id]?.figurineType,
).map((d) => d.id);

const render1 = (skinId: string, uid = "a", extra: { label?: string; movable?: boolean } = {}) =>
  render(
    <PawnGlyph main="#D22B27" dark="#7F1D1D" tokenSkin={getTokenSkinConfig(skinId)} uid={uid} color="red" {...extra} />,
  );

describe("collectible token figurines", () => {
  it("there are sixteen, each with its own figurine", () => {
    expect(COLLECTIBLE_IDS).toHaveLength(16);
    const types = COLLECTIBLE_IDS.map((id) => TOKEN_SKINS[id].figurineType as TokenFigurineType);
    expect(new Set(types).size).toBe(16);
  });

  it("every collectible renders a drawing without throwing", () => {
    for (const id of COLLECTIBLE_IDS) {
      const { container, unmount } = render1(id);
      expect(container.querySelector("svg"), id).not.toBeNull();
      expect(container.querySelectorAll("path,ellipse,circle,rect,polygon").length, id).toBeGreaterThan(5);
      unmount();
    }
  });

  it("never draws lettering of its own, so no brand name can ride along", () => {
    for (const id of COLLECTIBLE_IDS) {
      const { container, unmount } = render1(id);
      expect(container.querySelectorAll("text").length, id).toBe(0);
      unmount();
    }
  });

  it("only shows a seat number when asked, and puts it on top of the figurine", () => {
    const { container } = render1(COLLECTIBLE_IDS[0], "n", { label: "3" });
    expect(container.querySelector("text")?.textContent).toBe("3");
  });

  it("keeps every gradient id unique per token, so a full board never cross-wires colours", () => {
    for (const id of COLLECTIBLE_IDS) {
      const first = render1(id, "one");
      const second = render1(id, "two");
      const ids = [...first.container.querySelectorAll("[id]"), ...second.container.querySelectorAll("[id]")].map(
        (e) => e.id,
      );
      expect(new Set(ids).size, id).toBe(ids.length);
      first.unmount();
      second.unmount();
    }
  });

  it("shows the pulsing ring only for a pawn that can move", () => {
    const idle = render1(COLLECTIBLE_IDS[0], "i");
    const live = render1(COLLECTIBLE_IDS[0], "m", { movable: true });
    expect(idle.container.querySelectorAll("animate").length).toBe(0);
    expect(live.container.querySelectorAll("animate").length).toBeGreaterThan(0);
  });
});

describe("existing token skins keep their look", () => {
  const LEGACY = [
    "token_classic_pawn",
    "token_golden_crown",
    "token_fireball_ludo",
    "token_neon_ring",
    "token_diamond_elite",
    "token_phoenix_wing",
    "token_theme_imperial_general",
    "token_theme_void_reaper",
  ];

  it("do not silently turn into a collectible figurine", () => {
    for (const id of LEGACY) expect(TOKEN_SKINS[id].figurineType, id).toBeUndefined();
  });

  it("still draw the classic pawn, with their accessory and character overlays", () => {
    const plain = render1("token_classic_pawn", "p");
    expect(plain.container.querySelector(".figurine-classic-pawn")).not.toBeNull();

    const crown = render1("token_golden_crown", "c");
    expect(crown.container.querySelector(".figurine-classic-pawn")).not.toBeNull();
    expect(crown.container.innerHTML).not.toBe(plain.container.innerHTML);

    const themed = render1("token_theme_void_reaper", "t");
    expect(themed.container.querySelector(".figurine-classic-pawn")).not.toBeNull();
    expect(themed.container.innerHTML).not.toBe(plain.container.innerHTML);
  });
});
