import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES_METADATA, PRERENDER_ROUTES, BASE_URL } from "../metadata";

describe("SEO Metadata & Static Prerendering Registry", () => {
  it("defines metadata for all public routes", () => {
    expect(PRERENDER_ROUTES.length).toBeGreaterThanOrEqual(10);
    expect(PRERENDER_ROUTES).toContain("/");
    expect(PRERENDER_ROUTES).toContain("/games");
    expect(PRERENDER_ROUTES).toContain("/about");
    expect(PRERENDER_ROUTES).toContain("/privacy");
    expect(PRERENDER_ROUTES).toContain("/login");
    expect(PRERENDER_ROUTES).toContain("/signup");
    expect(PRERENDER_ROUTES).toContain("/nokiacricket");
    expect(PRERENDER_ROUTES).toContain("/snake");
  });

  it("contains valid canonical URLs, titles and descriptions for each public route", () => {
    for (const [path, meta] of Object.entries(PUBLIC_ROUTES_METADATA)) {
      expect(meta.path).toBe(path);
      expect(meta.title).toBeTruthy();
      expect(meta.title.length).toBeGreaterThan(5);
      expect(meta.description).toBeTruthy();
      expect(meta.description.length).toBeGreaterThan(20);
      expect(meta.ogTitle).toBeTruthy();
      expect(meta.ogDescription).toBeTruthy();
      expect(meta.ogImage).toContain("Bhalyam-logo.png");
      expect(meta.canonical).toBe(`${BASE_URL}${path === "/" ? "/" : path}`);
    }
  });

  it("excludes private and realtime routes from prerender list", () => {
    expect(PRERENDER_ROUTES).not.toContain("/profile");
    expect(PRERENDER_ROUTES).not.toContain("/room");
    expect(PRERENDER_ROUTES).not.toContain("/tv");
    expect(PRERENDER_ROUTES).not.toContain("/diagnostics");
  });
});
