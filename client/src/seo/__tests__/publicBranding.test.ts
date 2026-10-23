import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes";
import { GAME_DISPLAY_NAMES, BHALYAM_GAME_CATALOGUE } from "@shared/catalog";
import { GAME_METRIC_SCHEMAS } from "@shared/profile/MetricRegistry";
import { TETRIS_ACADEMY } from "../../features/academy/data/retroArcadeGames";
import { DATA_INVENTORY } from "../../lib/privacy/dataInventory";
import { BHALYAM_GAMES } from "../../components/bhalyam/data";
import { CLIENT_GAME_ROUTES } from "../../lib/gameLaunch";
import { resolveBreadcrumbs } from "../../components/navigation/breadcrumbsConfig";
import { PUBLIC_ROUTES_METADATA, PRERENDER_ROUTES, getSocialMetadataForGame } from "../metadata";
import { getStructuredDataForRoute } from "../structuredData";

const read = (file: string) => readFileSync(resolve(__dirname, "../../..", file), "utf8").replace(/\r\n/g, "\n");
const legacyRoutes = [
  ["/nokiacricket", "/cricket2d"],
  ["/nokiasnake", "/snake"],
  ["/roadrash", "/brickracer"],
  ["/tetris", "/brickblocks"],
  ["/bricktetris", "/brickblocks"],
] as const;
const thirdPartyNames = /\b(uno|nokia|tetris|road rash|block blast|formula 1|cricbuzz|doordarshan)\b/i;

describe("public branding without changing saved game identities", () => {
  it("uses neutral launch destinations for legacy game ids", () => {
    expect(CLIENT_GAME_ROUTES.nokiacricket).toBe("/cricket2d");
    expect(CLIENT_GAME_ROUTES.nokiasnake).toBe("/snake");
    expect(CLIENT_GAME_ROUTES.roadrash).toBe("/brickracer");
    expect(CLIENT_GAME_ROUTES.tetris).toBe("/brickblocks");
    expect(BHALYAM_GAMES.find((g) => g.slug === "uno")?.title).toBe("Color Cards");
    expect(GAME_MODE_REGISTRY.roadrash.displayName).toBe("Brick Racer");
    expect(GAME_MODE_REGISTRY.brickblocks.displayName).toBe("Brick Blocks");
    expect(GAME_MODE_REGISTRY.blockblast.displayName).toBe("Block Puzzle");
  });

  it("keeps third-party names out of readable catalog, SEO and social copy", () => {
    for (const game of BHALYAM_GAMES) {
      expect(JSON.stringify([game.title, game.blurb, game.theme, game.badge])).not.toMatch(thirdPartyNames);
    }
    for (const meta of Object.values(PUBLIC_ROUTES_METADATA)) {
      const { path, canonical, ogImage, twitterImage, ...copy } = meta;
      expect(JSON.stringify(copy), path).not.toMatch(thirdPartyNames);
    }
    for (const id of ["uno", "nokiacricket", "snake", "brickracer", "brickblocks", "tetris"]) {
      const meta = getSocialMetadataForGame(id);
      expect(meta).toBeDefined();
      expect(JSON.stringify([meta?.name, meta?.shareTitle, meta?.shareDescription, meta?.imageAlt]), id)
        .not.toMatch(thirdPartyNames);
    }
  });

  it("also covers static HTML, academy, privacy labels and shared profile copy", () => {
    expect(read("index.html").replace(/<!--[\s\S]*?-->/g, "")).not.toMatch(thirdPartyNames);
    expect(JSON.stringify(Object.values(GAME_DISPLAY_NAMES))).not.toMatch(thirdPartyNames);
    expect(JSON.stringify(BHALYAM_GAME_CATALOGUE.map((g) => [g.name, g.tagline, g.description])))
      .not.toMatch(thirdPartyNames);
    expect(JSON.stringify(DATA_INVENTORY.map((e) => [e.label, e.description]))).not.toMatch(thirdPartyNames);
    for (const game of Object.values(GAME_METRIC_SCHEMAS)) {
      expect(JSON.stringify(game).replace(/"[^"]*(?:[Ii]d|[Kk]ey)"\s*:\s*"[^"]*"/g, ""))
        .not.toMatch(/\b(Tetris|Road Rash|Block Blast)\b/);
    }
    expect(TETRIS_ACADEMY.title).toBe("Brick Blocks");
    expect(getSocialMetadataForGame("uno")?.imageUrl).toMatch(/\/ColorCardsTile\.png$/);
  });

  it.each(legacyRoutes)("redirects %s to %s in the router and hosting configuration", (oldPath, newPath) => {
    expect(read("src/App.tsx")).toContain(`<Route path="${oldPath}" element={<Navigate to="${newPath}" replace />} />`);
    expect(read("../render.yaml")).toContain(`type: redirect\n        source: ${oldPath}\n        destination: ${newPath}`);
    expect(read("public/_redirects")).toContain(`${oldPath} ${newPath} 301`);
    expect(PRERENDER_ROUTES).not.toContain(oldPath);
    expect(PUBLIC_ROUTES_METADATA[oldPath]).toBeUndefined();
    expect(read("public/sitemap.xml")).not.toContain(`${oldPath}</loc>`);
    expect(read("public/robots.txt")).not.toContain(`Allow: ${oldPath}\n`);
    expect(PRERENDER_ROUTES).toContain(newPath);
    expect(PUBLIC_ROUTES_METADATA[newPath]?.canonical).toMatch(new RegExp(`${newPath}$`));
  });

  it("uses neutral names and URLs in structured data and breadcrumbs", () => {
    for (const path of ["/cricket2d", "/brickblocks", "/brickracer", "/snake"]) {
      expect(JSON.stringify(getStructuredDataForRoute(path))).not.toMatch(thirdPartyNames);
      expect(JSON.stringify(resolveBreadcrumbs(path))).not.toMatch(thirdPartyNames);
    }
    const cricket = getStructuredDataForRoute("/cricket2d");
    expect(cricket).toContainEqual(expect.objectContaining({ url: expect.stringMatching(/\/cricket2d$/) }));
    expect(JSON.stringify(getStructuredDataForRoute("/games"))).not.toContain("/games?game=cricket2d");
    expect(existsSync(resolve(__dirname, "../../../public/og/uno.jpg"))).toBe(false);
    expect(read("src/games/handcricket/doordarshan/DoordarshanCelebration.tsx")).not.toContain("DD Sports");
  });

  it("uses an existing Color Cards preview with the actual image type and dimensions", () => {
    const meta = getSocialMetadataForGame("uno")!;
    const image = readFileSync(resolve(__dirname, "../../../public", new URL(meta.imageUrl).pathname.slice(1)));
    expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(meta.imageType).toBe("image/png");
    expect(meta.imageWidth).toBe(String(image.readUInt32BE(16)));
    expect(meta.imageHeight).toBe(String(image.readUInt32BE(20)));
  });

  it("removes branded racing text from both the canvas and its frame", () => {
    for (const file of [
      "src/games/brickracer/engine/StateMachine.ts",
      "src/games/brickracer/components/BrickConsoleFrame.tsx",
      "src/games/brickracer/BrickRacerBoardDesktop.tsx",
    ]) {
      expect(read(file)).not.toMatch(/formula 1/i);
    }
    expect(read("src/features/brick-tetris/components/MatrixGrid.tsx"))
      .toContain('aria-label="Brick Blocks 10 by 20 matrix board"');
  });
});
