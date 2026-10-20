import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes";
import { BHALYAM_GAMES } from "../../components/bhalyam/data";
import { CLIENT_GAME_ROUTES, gameLaunch, launchLinkProps } from "../gameLaunch";

/**
 * "Play Arena" on the leaderboard sent players to `/games/nokiacricket`, `/games/brickracer` and
 * three more paths the app has no route for, so they landed on the 404 page. Every surface that
 * launches a game (leaderboard, scorecard decks, the share link, the create-room sheet) now asks
 * `gameLaunch`, and this file holds that answer to what App.tsx really serves.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(resolve(here, relative), "utf8");

const appRoutes = new Set([...read("../../App.tsx").matchAll(/<Route[^>]*\spath="([^"]+)"/g)].map((m) => m[1]));

describe("every route a game launches to is a route the app has", () => {
  it.each(Object.entries(CLIENT_GAME_ROUTES))("%s -> %s", (_slug, route) => {
    expect(appRoutes.has(route), `${route} is not a <Route> in App.tsx`).toBe(true);
  });

  it("has the games page the fallback sends people to", () => {
    expect(appRoutes.has("/games")).toBe(true);
  });
});

describe("every game on the leaderboard has somewhere to go", () => {
  const slugs = Object.keys(GAME_MODE_REGISTRY);

  it.each(slugs)("%s resolves to a page, a create-room sheet, or the games page", (slug) => {
    const launch = gameLaunch(slug);
    if (launch.kind === "page") expect(appRoutes.has(launch.to)).toBe(true);
    if (launch.kind === "room-sheet") expect(BHALYAM_GAMES.some((g) => g.slug === launch.slug)).toBe(true);
    if (launch.kind === "browse") expect(appRoutes.has(launch.to)).toBe(true);
  });

  it("never builds a /games/<slug> path, which is the 404 that was reported", () => {
    for (const slug of slugs) expect(launchLinkProps(slug).to).not.toMatch(/^\/games\/./);
  });

  it("falls back to browsing only for a game with no page and no catalog tile", () => {
    // Block Blast is on the leaderboard but nothing in the app can start it. Listed here so a game
    // that quietly loses its launch shows up as a change to this line.
    expect(slugs.filter((s) => gameLaunch(s).kind === "browse")).toEqual(["blockblast"]);
  });
});

describe("gameLaunch", () => {
  it("opens a client-only game on its own page", () => {
    expect(gameLaunch("nokiacricket")).toEqual({ kind: "page", to: "/nokiacricket" });
    expect(gameLaunch("roadrash")).toEqual({ kind: "page", to: "/roadrash" });
    expect(gameLaunch("brickblocks")).toEqual({ kind: "page", to: "/brickblocks" });
    expect(gameLaunch("breakout")).toEqual({ kind: "page", to: "/breakout" });
    expect(gameLaunch("2048")).toEqual({ kind: "page", to: "/2048" });
  });

  it("treats the tetris alias exactly like brickblocks", () => {
    expect(gameLaunch("tetris")).toEqual(gameLaunch("brickblocks"));
  });

  it("opens the create-room sheet for a game played in a room", () => {
    expect(gameLaunch("ludo")).toEqual({ kind: "room-sheet", slug: "ludo" });
    expect(gameLaunch("handcricket")).toEqual({ kind: "room-sheet", slug: "handcricket" });
    expect(gameLaunch("spacewar")).toEqual({ kind: "room-sheet", slug: "spacewar" });
  });

  it("sends an unknown game, or an inherited property name, to the games page", () => {
    expect(gameLaunch("not-a-game")).toEqual({ kind: "browse", to: "/games" });
    expect(gameLaunch("constructor")).toEqual({ kind: "browse", to: "/games" });
    expect(gameLaunch("__proto__")).toEqual({ kind: "browse", to: "/games" });
  });
});

describe("launchLinkProps: the props for a <Link> that launches a game", () => {
  it("is a plain path for a game with its own page", () => {
    expect(launchLinkProps("nokiasnake")).toEqual({ to: "/nokiasnake" });
  });

  it("hands a room game to the home layout, which opens its create sheet (the `state.newRoom` hand-off)", () => {
    expect(launchLinkProps("rummy")).toEqual({ to: "/", state: { newRoom: "rummy" } });
  });

  it("is the games page for a game that cannot be launched", () => {
    expect(launchLinkProps("blockblast")).toEqual({ to: "/games" });
  });
});

describe("no launch surface builds its own /games/<slug> path any more", () => {
  it.each([
    "../../pages/LeaderboardPage.tsx",
    "../../components/scorecard/HoloPassShareModal.tsx",
    "../../components/scorecard/ChronoScorecardDeckDesktop.tsx",
    "../../components/scorecard/ChronoScorecardDeckMobile.tsx",
  ])("%s", (file) => {
    expect(read(file)).not.toMatch(/\/games\/(\$\{|nokia|brick)/);
  });
});
