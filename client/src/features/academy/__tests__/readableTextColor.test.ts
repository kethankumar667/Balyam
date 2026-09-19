import { describe, it, expect } from "vitest";
import { readableTextColor, contrastRatio } from "../utils/readableTextColor";
import { getAllAcademySpecs } from "../data";

const DARK = "#0B1120";
const LIGHT = "#FFFFFF";
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3;

describe("readableTextColor", () => {
  it("returns dark ink on light accents", () => {
    expect(readableTextColor("#F59E0B")).toBe(DARK);
    expect(readableTextColor("#8BAC0F")).toBe(DARK);
    expect(readableTextColor("#FFFFFF")).toBe(DARK);
  });

  it("returns white ink on the dark accents that failed with slate-950 text", () => {
    expect(readableTextColor("#8C5A2B")).toBe(LIGHT);
    expect(readableTextColor("#B45309")).toBe(LIGHT);
    expect(readableTextColor("#DC2626")).toBe(LIGHT);
    expect(readableTextColor("#000000")).toBe(LIGHT);
  });

  it("accepts 3-digit hex, lower case and a missing leading hash", () => {
    expect(readableTextColor("#fff")).toBe(DARK);
    expect(readableTextColor("000")).toBe(LIGHT);
    expect(readableTextColor("#dc2626")).toBe(LIGHT);
  });

  it("falls back to dark ink for input it cannot parse", () => {
    expect(readableTextColor("")).toBe(DARK);
    expect(readableTextColor("not-a-colour")).toBe(DARK);
    expect(readableTextColor("#12345")).toBe(DARK);
  });

  it("computes the WCAG contrast ratio between two colours", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("gives every shipped academy accent readable (>= 3:1) text, and >= 4.5:1 where achievable", () => {
    for (const spec of getAllAcademySpecs()) {
      const ink = readableTextColor(spec.primaryAccent);
      const ratio = contrastRatio(ink, spec.primaryAccent);
      expect(ratio, `${spec.slug} ${spec.primaryAccent}`).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
      const best = Math.max(
        contrastRatio(DARK, spec.primaryAccent),
        contrastRatio(LIGHT, spec.primaryAccent),
      );
      expect(ratio).toBe(best);
      if (best >= WCAG_AA_NORMAL) expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
  });
});
