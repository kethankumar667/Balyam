import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes";
import { BHALYAM_GAMES } from "../../components/bhalyam/data";
import { CLIENT_GAME_ROUTES } from "../../lib/gameLaunch";
import { PRERENDER_ROUTES, PUBLIC_ROUTES_METADATA, getSocialMetadataForGame } from "../metadata";
import { getStructuredDataForRoute } from "../structuredData";
import { BRAINVITA_ACADEMY } from "../../features/academy/data/brainvita";

/**
 * The solo marble puzzle used to be called "Brain Vita", the name of a board game sold in India. It is now
 * Goli Jump ("goli" is a marble). What changes is everything a player, a search engine or a link can see.
 * What does NOT change is everything that is keyed by the old name and would orphan real data if renamed: the
 * game id `brainvita` (leaderboard rows, the score validator, scorecards), the saved-settings keys
 * (`bhalyam.brainvita.*`), and the folder and component names, which are only code.
 */

const here = dirname(fileURLToPath(import.meta.url));
const clientSrc = resolve(here, "../..");
const repoRoot = resolve(clientSrc, "../..");
const read = (absolute: string) => readFileSync(absolute, "utf8");

const NEW_NAME = "Goli Jump";
const NEW_PATH = "/goli-jump";
const OLD_PATH = "/brainvita";

describe("Goli Jump: the name players and links see", () => {
  it("is the catalog tile's title, and the leaderboard and academy name", () => {
    expect(BHALYAM_GAMES.find((g) => g.slug === "brainvita")?.title).toBe(NEW_NAME);
    expect(GAME_MODE_REGISTRY.brainvita.displayName).toBe(NEW_NAME);
    expect(BRAINVITA_ACADEMY.title).toBe(NEW_NAME);
  });

  it("keeps the game id `brainvita`, which scores and saved data are keyed by", () => {
    expect(BHALYAM_GAMES.some((g) => g.slug === "brainvita")).toBe(true);
    expect(GAME_MODE_REGISTRY.brainvita.game).toBe("brainvita");
    expect(getSocialMetadataForGame("brainvita")?.name).toBe(NEW_NAME);
  });

  it("launches from the game id to the new address", () => {
    expect(CLIENT_GAME_ROUTES.brainvita).toBe(NEW_PATH);
  });
});

describe("Goli Jump: the address", () => {
  it("is /goli-jump in the public page list, prerendered and under its new name", () => {
    const meta = PUBLIC_ROUTES_METADATA[NEW_PATH];

    expect(meta).toBeDefined();
    expect(meta.path).toBe(NEW_PATH);
    expect(meta.canonical).toMatch(/\/goli-jump$/);
    expect(meta.title).toContain(NEW_NAME);
    expect(PRERENDER_ROUTES).toContain(NEW_PATH);
  });

  it("no longer has a page of its own at the old address", () => {
    expect(PUBLIC_ROUTES_METADATA[OLD_PATH]).toBeUndefined();
    expect(PRERENDER_ROUTES).not.toContain(OLD_PATH);
  });

  it("gives search engines and share cards the new name and none of the old one", () => {
    const seen = JSON.stringify([PUBLIC_ROUTES_METADATA[NEW_PATH], getSocialMetadataForGame("brainvita")]);

    // The game id `brainvita` is not a name anyone reads, so only the spelled-out name and the old image are checked.
    expect(seen).not.toMatch(/brain[ -]vita/i);
    expect(seen).not.toMatch(/BrainVitaTile/);
    // Still findable by what the game IS, which is what people actually search for.
    expect(seen).toMatch(/peg solitaire/i);
    expect(seen).toMatch(/marble solitaire/i);
  });

  it("describes the page in structured data under the new name and the new address", () => {
    const data = JSON.stringify(getStructuredDataForRoute(NEW_PATH));

    expect(data).toContain(NEW_NAME);
    expect(data).toContain("/goli-jump");
    expect(data).not.toMatch(/brain[ -]vita/i);
    expect(data).not.toMatch(/BrainVitaTile/);
  });

  it("uses a tile image named for the new game, and the file is really there", () => {
    const tile = BHALYAM_GAMES.find((g) => g.slug === "brainvita")?.tileImage;

    expect(tile).toBe("/GoliJumpTile.png");
    expect(existsSync(join(clientSrc, "../public", tile ?? ""))).toBe(true);
    expect(existsSync(join(clientSrc, "../public/BrainVitaTile.png"))).toBe(false);
  });

  it("answers at the old address with a redirect, so old links and bookmarks keep working", () => {
    const app = read(join(clientSrc, "App.tsx"));

    expect(app).toMatch(/<Route path="\/goli-jump" element=\{<BrainVitaPage \/>\} \/>/);
    expect(app).toMatch(/<Route path="\/brainvita" element=\{<Navigate to="\/goli-jump" replace \/>\} \/>/);
  });

  it("is listed in the sitemap and robots.txt at the new address only", () => {
    const sitemap = read(join(clientSrc, "../public/sitemap.xml"));
    const robots = read(join(clientSrc, "../public/robots.txt"));

    expect(sitemap).toContain("/goli-jump</loc>");
    expect(sitemap).not.toContain("/brainvita");
    expect(robots).toContain("Allow: /goli-jump");
    expect(robots).not.toContain("/brainvita");
  });

  it("is served from its own prerendered page, with a permanent redirect from the old address, on Render", () => {
    const render = read(join(repoRoot, "render.yaml"));

    expect(render).toMatch(/source: \/goli-jump\s+destination: \/goli-jump\/index\.html/);
    expect(render).toMatch(/type: redirect\s+source: \/brainvita\s+destination: \/goli-jump/);
  });
});

describe("Goli Jump: nothing a player can read still says the old name", () => {
  /** Every non-test source file the client and the shared code ship. */
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      if (name === "node_modules" || name === "__tests__" || name === "dist") return [];
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }

  const isCommentLine = (line: string) => /^\s*(\*|\/\*|\/\/)/.test(line);

  it("has no 'Brain Vita' in a string, a label or a page title (comments are not shown to anyone)", () => {
    const leftovers: string[] = [];
    for (const file of [...sourceFiles(clientSrc), ...sourceFiles(join(repoRoot, "shared"))]) {
      read(file)
        .split("\n")
        .forEach((line, index) => {
          if (!isCommentLine(line) && /brain[ -]vita/i.test(line)) {
            leftovers.push(`${file.replace(repoRoot, "").split("\\").join("/")}:${index + 1}  ${line.trim().slice(0, 90)}`);
          }
        });
    }

    expect(leftovers).toEqual([]);
  });
});
