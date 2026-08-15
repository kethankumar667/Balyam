import { describe, expect, it } from "vitest";
import {
  BHALYAM_GAMES,
  GAME_CATEGORIES,
  categoryById,
  isLocked,
  type GameTag,
} from "../data";
import { CATEGORY_ICON } from "../categoryIcons";
import { countIn, filterGames, gamesWithTag } from "../CategoryFilter";

/**
 * Game filters.
 *
 * The failure this guards against is a silently untagged game: it would vanish
 * from every filtered view while still existing in the catalogue, so nobody
 * would notice until a player asked where it went. TypeScript makes `tags`
 * required but cannot stop it being an empty array, so that is checked here
 * along with the parts types can't reach.
 */

const TAG_IDS = GAME_CATEGORIES.map((c) => c.id);

describe("catalogue tagging", () => {
  it("gives every game at least one tag", () => {
    for (const game of BHALYAM_GAMES) {
      expect(game.tags.length, `${game.slug} has no tags`).toBeGreaterThan(0);
    }
  });

  it("only uses tags that exist as filters", () => {
    for (const game of BHALYAM_GAMES) {
      for (const tag of game.tags) {
        expect(categoryById(tag), `${game.slug} has bogus tag "${tag}"`).toBeDefined();
      }
    }
  });

  it("never repeats a tag on the same game", () => {
    for (const game of BHALYAM_GAMES) {
      expect(new Set(game.tags).size).toBe(game.tags.length);
    }
  });

  it("uses every declared filter — no empty chips in the UI", () => {
    for (const tag of TAG_IDS) {
      expect(gamesWithTag(tag).length, `filter "${tag}" has no games`).toBeGreaterThan(0);
    }
  });

  it("has unique filter ids and non-empty labels", () => {
    expect(new Set(TAG_IDS).size).toBe(TAG_IDS.length);
    for (const c of GAME_CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.blurb.length).toBeGreaterThan(0);
    }
  });

  it("gives every filter a pictogram from the house icon set", () => {
    // Emoji were replaced because the project's own rule (shared/reactions.ts)
    // caps glyphs at Unicode 6.0 for old-Android rendering.
    for (const tag of TAG_IDS) {
      expect(CATEGORY_ICON[tag], `no icon for "${tag}"`).toBeDefined();
    }
  });
});

describe("player-count tags partition the active catalogue", () => {
  it("marks every active game solo, multiplayer, or both", () => {
    // These two answer "who is around?", so between them they must cover the
    // active lineup. Upcoming games are segregated under upcoming only.
    for (const game of BHALYAM_GAMES) {
      if (game.tags.includes("upcoming")) continue;
      const hasCount = game.tags.includes("solo") || game.tags.includes("multiplayer");
      expect(hasCount, `${game.slug} is neither solo nor multiplayer`).toBe(true);
    }
  });

  it("lets a game be both, because some genuinely are", () => {
    // Snake and Block Blast seat 1 to 4. Forcing them into one bucket
    // would hide them from a filter players would expect them in.
    const both = BHALYAM_GAMES.filter(
      (g) => g.tags.includes("solo") && g.tags.includes("multiplayer"),
    );
    expect(both.length).toBeGreaterThan(0);
  });

  it("adds up to the active catalogue across solo and multiplayer", () => {
    const activeGames = BHALYAM_GAMES.filter((g) => !g.tags.includes("upcoming"));
    const covered = new Set([
      ...gamesWithTag("solo").map((g) => g.slug),
      ...gamesWithTag("multiplayer").map((g) => g.slug),
    ]);
    expect(covered.size).toBe(activeGames.length);
  });
});

describe("filtering", () => {
  it("returns only games carrying the selected tag", () => {
    for (const tag of TAG_IDS) {
      const got = filterGames({ category: tag });
      expect(got.length).toBeGreaterThan(0);
      for (const g of got) expect(g.tags).toContain(tag);
    }
  });

  it("returns everything except upcoming under All", () => {
    const expected = BHALYAM_GAMES.filter((g) => !g.tags.includes("upcoming"));
    expect(filterGames({ category: "all" })).toHaveLength(expected.length);
  });

  it("keeps chip counts and revealed tiles in agreement", () => {
    // A chip that says 6 and then shows 5 tiles is the kind of thing nobody
    // reports but everybody notices.
    expect(countIn("all")).toBe(filterGames({ category: "all" }).length);
    for (const tag of TAG_IDS) {
      expect(countIn(tag)).toBe(filterGames({ category: tag }).length);
    }
  });

  it("can exclude coming-soon games without emptying a filter", () => {
    const playable = filterGames({ category: "all" }, false);
    expect(playable.every((g) => !isLocked(g))).toBe(true);
    expect(playable.length).toBeGreaterThan(0);
  });

  it("has no game reachable only through All", () => {
    // Every game must be findable by narrowing, not just by scrolling the
    // full list.
    for (const game of BHALYAM_GAMES) {
      const reachable = TAG_IDS.some((tag: GameTag) =>
        filterGames({ category: tag }).some((g) => g.slug === game.slug),
      );
      expect(reachable, `${game.slug} is only reachable under All`).toBe(true);
    }
  });
});
