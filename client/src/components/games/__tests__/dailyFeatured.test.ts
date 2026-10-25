import { describe, expect, it } from "vitest";
import { BHALYAM_GAMES } from "../../bhalyam/data";
import { dailyFeaturedGames, dailyPopularGames, featuredDay } from "../dailyFeatured";

describe("daily featured rotation", () => {
  it("changes day at midnight IST, including month and year boundaries", () => {
    for (const midnight of ["2026-10-31T18:30:00Z", "2026-12-31T18:30:00Z"]) {
      const time = Date.parse(midnight);
      expect(featuredDay(time)).toBe(featuredDay(time - 1) + 1);
    }
    expect(featuredDay(Date.parse("2026-10-23T18:29:59Z")))
      .toBe(featuredDay(Date.parse("2026-10-22T18:30:00Z")));
  });

  it("stays stable within a day and independent of list order", () => {
    const day = featuredDay(Date.parse("2026-10-23T12:00:00Z"));
    expect(dailyFeaturedGames(BHALYAM_GAMES, day))
      .toEqual(dailyFeaturedGames([...BHALYAM_GAMES].reverse(), day));
    expect(dailyFeaturedGames(BHALYAM_GAMES, day)).toHaveLength(2);
  });

  it("rotates across the entire playable pool with no consecutive-day repeats", () => {
    const seen = new Set<string>();
    for (let day = 20000; day < 20000 + BHALYAM_GAMES.length; day++) {
      const today = dailyFeaturedGames(BHALYAM_GAMES, day).map((game) => game.slug);
      const tomorrow = dailyFeaturedGames(BHALYAM_GAMES, day + 1).map((game) => game.slug);
      expect(new Set(today).size).toBe(2);
      expect(today.some((slug) => tomorrow.includes(slug))).toBe(false);
      today.forEach((slug) => seen.add(slug));
    }
    expect(seen.size).toBe(BHALYAM_GAMES.length);
  });

  it("excludes unavailable games and handles zero, one, two or three eligible games", () => {
    const [first, second, third] = BHALYAM_GAMES;
    expect(dailyFeaturedGames([], 20000)).toEqual([]);
    expect(dailyFeaturedGames([first], 20000)).toEqual([first]);
    expect(dailyFeaturedGames([first, second], 20000)).toHaveLength(2);
    expect(new Set(dailyFeaturedGames([first, second, third], 20000)).size).toBe(2);
    expect(dailyFeaturedGames([{ ...first, maintenance: true, accessible: false }, second], 20000))
      .toEqual([second]);
    expect(dailyFeaturedGames([{ ...first, maintenance: true, accessible: true }], 20000)).toHaveLength(1);
  });
});

describe("daily popular games", () => {
  const firstDay = featuredDay(Date.parse("2026-10-23T12:00:00Z"));
  const slugs = (day: number) => dailyPopularGames(BHALYAM_GAMES, day).map((game) => game.slug);

  it("is always four games, never one of the two featured, and stays put within a day", () => {
    for (let day = firstDay; day < firstDay + 60; day++) {
      const popular = slugs(day);
      const featured = dailyFeaturedGames(BHALYAM_GAMES, day).map((game) => game.slug);
      expect(popular).toHaveLength(4);
      expect(new Set(popular).size).toBe(4);
      expect(popular.filter((slug) => featured.includes(slug))).toEqual([]);
    }
    expect(dailyPopularGames([...BHALYAM_GAMES].reverse(), firstDay).map((game) => game.slug)).toEqual(slugs(firstDay));
  });

  it("turns over every day instead of staying fixed", () => {
    for (let day = firstDay; day < firstDay + 60; day++) {
      const today = slugs(day);
      const tomorrow = slugs(day + 1);
      expect(tomorrow.filter((slug) => today.includes(slug)).length).toBeLessThan(4);
    }
    expect(new Set(Array.from({ length: 30 }, (_, index) => slugs(firstDay + index).join())).size).toBeGreaterThan(5);
  });

  it("changes at midnight IST, not at midnight UTC", () => {
    const beforeIstMidnight = featuredDay(Date.parse("2026-10-23T18:29:59Z"));
    const afterIstMidnight = featuredDay(Date.parse("2026-10-23T18:30:00Z"));
    expect(slugs(afterIstMidnight)).not.toEqual(slugs(beforeIstMidnight));
    expect(featuredDay(Date.parse("2026-10-23T00:00:00Z"))).toBe(featuredDay(Date.parse("2026-10-23T12:00:00Z")));
  });

  it("falls back to every playable game when there are few, and to nothing when there are none", () => {
    const three = BHALYAM_GAMES.slice(0, 3);
    expect(dailyPopularGames(three, firstDay)).toHaveLength(1);
    expect(dailyPopularGames([], firstDay)).toEqual([]);
  });

  it("prefers the catalogue's popular titles", () => {
    const popularIds = new Set(["ludo", "rummy", "handcricket", "snl", "uno"]);
    const picks = Array.from({ length: 12 }, (_, index) => slugs(firstDay + index)).flat();
    expect(picks.filter((slug) => popularIds.has(slug)).length).toBeGreaterThan(0);
    expect(picks.every((slug) => BHALYAM_GAMES.some((game) => game.slug === slug))).toBe(true);
  });
});
