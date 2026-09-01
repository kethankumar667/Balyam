import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES_METADATA, PRERENDER_ROUTES, BASE_URL } from "../metadata";

describe("SEO Metadata & Route Coverage Registry", () => {
  const REQUIRED_AUDIT_ROUTES = [
    "/how-to-play",
    "/support",
    "/contact",
    "/terms",
    "/safety",
    "/community-rules",
    "/leaderboard",
    "/tournaments",
    "/social",
    "/nokiacricket",
    "/snake",
    "/brickracer",
    "/brickblocks",
    "/tetris",
    "/breakout",
  ];

  it("contains all required audit routes", () => {
    for (const route of REQUIRED_AUDIT_ROUTES) {
      expect(PRERENDER_ROUTES, `Missing required route: ${route}`).toContain(route);
      expect(PUBLIC_ROUTES_METADATA[route], `Metadata not defined for route: ${route}`).toBeDefined();
    }
  });

  it("has zero duplicate titles across primary public routes", () => {
    const titles = new Map<string, string>();
    for (const [routePath, meta] of Object.entries(PUBLIC_ROUTES_METADATA)) {
      // Aliases can share or refer to primary target; check primary routes
      const isPrimary = meta.canonical === `${BASE_URL}${routePath === "/" ? "/" : routePath}`;
      if (!isPrimary) continue;

      const normalized = meta.title.trim().toLowerCase();
      expect(
        titles.has(normalized),
        `Duplicate title found on ${routePath}: "${meta.title}". Already used on ${titles.get(normalized)}`
      ).toBe(false);
      titles.set(normalized, routePath);
    }
  });

  it("has zero duplicate descriptions across primary public routes", () => {
    const descriptions = new Map<string, string>();
    for (const [routePath, meta] of Object.entries(PUBLIC_ROUTES_METADATA)) {
      const isPrimary = meta.canonical === `${BASE_URL}${routePath === "/" ? "/" : routePath}`;
      if (!isPrimary) continue;

      const normalized = meta.description.trim().toLowerCase();
      expect(
        descriptions.has(normalized),
        `Duplicate description found on ${routePath}: "${meta.description}". Already used on ${descriptions.get(normalized)}`
      ).toBe(false);
      descriptions.set(normalized, routePath);
    }
  });

  it("contains complete metadata: title, description, keywords, canonical, OG tags, Twitter tags", () => {
    const publicDir = path.resolve(__dirname, "../../../public");

    for (const [routePath, meta] of Object.entries(PUBLIC_ROUTES_METADATA)) {
      // Path and Canonical
      expect(meta.path).toBe(routePath);
      expect(meta.canonical).toMatch(/^https:\/\/bhalyam\.onrender\.com/);

      // Title & Description length and quality
      expect(meta.title.length).toBeGreaterThanOrEqual(15);
      expect(meta.description.length).toBeGreaterThanOrEqual(30);

      // Keywords
      expect(meta.keywords).toBeInstanceOf(Array);
      expect(meta.keywords.length).toBeGreaterThanOrEqual(3);

      // OpenGraph
      expect(meta.ogTitle).toBeTruthy();
      expect(meta.ogDescription).toBeTruthy();
      expect(meta.ogType).toBeTruthy();
      expect(meta.ogSiteName).toBe("BHALYAM · బాల్యం");
      expect(meta.ogLocale).toBe("en_US");

      // Strict Absolute URLs for OpenGraph & Twitter
      expect(meta.ogImage).toMatch(/^https:\/\/bhalyam\.onrender\.com\/.+\.(jpg|jpeg|png)$/);
      expect(meta.twitterImage).toMatch(/^https:\/\/bhalyam\.onrender\.com\/.+\.(jpg|jpeg|png)$/);

      // Dimensions & types
      expect(meta.ogImageWidth).toMatch(/^\d+$/);
      expect(meta.ogImageHeight).toMatch(/^\d+$/);
      expect(["image/jpeg", "image/png"]).toContain(meta.ogImageType);
      expect(meta.ogImageAlt).toBeTruthy();

      // Twitter Cards
      expect(meta.twitterCard).toBe("summary_large_image");
      expect(meta.twitterSite).toBe("@bhalyam");
      expect(meta.twitterCreator).toBe("@bhalyam");
      expect(meta.twitterTitle).toBeTruthy();
      expect(meta.twitterDescription).toBeTruthy();
      expect(meta.twitterImageAlt).toBeTruthy();

      // Verify referenced image file exists in public/ and is under 300KB (WhatsApp limit)
      const relativeAsset = meta.ogImage.replace(/^https:\/\/bhalyam\.onrender\.com\//, "");
      const assetPath = path.join(publicDir, relativeAsset);
      expect(fs.existsSync(assetPath), `Asset does not exist: ${assetPath} for route ${routePath}`).toBe(true);

      const stats = fs.statSync(assetPath);
      expect(
        stats.size,
        `Asset ${relativeAsset} exceeds 300KB WhatsApp preview limit: ${(stats.size / 1024).toFixed(1)}KB`
      ).toBeLessThan(300 * 1024);
    }
  });

  it("excludes private, authenticated or real-time game room routes from prerender list", () => {
    expect(PRERENDER_ROUTES).not.toContain("/profile");
    expect(PRERENDER_ROUTES).not.toContain("/room");
    expect(PRERENDER_ROUTES).not.toContain("/tv");
    expect(PRERENDER_ROUTES).not.toContain("/diagnostics");
    expect(PRERENDER_ROUTES).not.toContain("/admin");
  });
});
