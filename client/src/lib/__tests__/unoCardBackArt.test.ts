import { describe, it, expect } from "vitest";
import { UNO_BACK_ART, UNO_BACK_ART_IDS } from "../unoCardBackArt";
import { UNO_CARD_BACKS } from "../cosmeticsResolver";

const decode = (uri: string): string => decodeURIComponent(uri.split(",")[1] ?? "");

describe("generated Color Cards card backs", () => {
  it("provides art for all 16 artwork card backs", () => {
    expect(UNO_BACK_ART_IDS).toHaveLength(16);
    for (const id of UNO_BACK_ART_IDS) {
      expect(UNO_BACK_ART[id].startsWith("data:image/svg+xml")).toBe(true);
    }
  });

  it("never draws a wordmark or an embedded raster, so no third-party logo can ride along", () => {
    for (const id of UNO_BACK_ART_IDS) {
      const svg = decode(UNO_BACK_ART[id]);
      expect(svg, id).not.toMatch(/<text|<image|<foreignObject/i);
    }
  });

  it("gives every card back its own distinct art", () => {
    const unique = new Set(UNO_BACK_ART_IDS.map((id) => UNO_BACK_ART[id]));
    expect(unique.size).toBe(UNO_BACK_ART_IDS.length);
  });

  it("is what the cosmetics resolver serves, never a bundled PNG", () => {
    for (const id of UNO_BACK_ART_IDS) {
      const cfg = UNO_CARD_BACKS[id];
      expect(cfg.kind).toBe("image");
      if (cfg.kind === "image") expect(cfg.imageSrc).toBe(UNO_BACK_ART[id]);
    }
    for (const cfg of Object.values(UNO_CARD_BACKS)) {
      if (cfg.kind === "image") expect(cfg.imageSrc).not.toMatch(/uno-card-backs|\.png$/i);
    }
  });
});
