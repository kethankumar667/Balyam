import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { GamesSection } from "../GamesSection";
import GameCardGrid from "../../../components/games/GameCardGrid";
import { BHALYAM_GAMES } from "../../../components/bhalyam/data";
import { dailyFeaturedGames, dailyPopularGames, featuredDay } from "../../../components/games/dailyFeatured";
import { FavouritesManager } from "../../../services/FavouritesManager";

vi.mock("../../../hooks/useAudio", () => ({ useAudio: () => ({ play: vi.fn() }) }));

/**
 * Home used to swap its featured games for a "Matching games" list whenever a category or a remembered way to play
 * narrowed the page, so the featured games came and went between visits. Now the page always opens with today's two
 * featured and four popular games, and a filter only adds a list beneath them.
 */
const NOON_IST = "2026-10-23T06:30:00Z";

beforeEach(() => {
  FavouritesManager.clearFavourites();
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  FavouritesManager.clearFavourites();
});

const renderHome = (way: "friends" | "solo" | null = null) =>
  render(<MemoryRouter><GamesSection onSelect={vi.fn()} way={way} /></MemoryRouter>);

const slugsIn = (name: string) =>
  within(screen.getByRole("region", { name })).getAllByRole("article").map((card) => card.getAttribute("data-game"));

describe("Home's featured and popular games", () => {
  it("shows two featured and four popular games, and no list of matches, when nothing is filtered", () => {
    renderHome();

    expect(slugsIn("Featured games")).toHaveLength(2);
    expect(slugsIn("Popular games")).toHaveLength(4);
    expect(screen.queryByRole("heading", { name: "Matching games" })).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("shows today's picks, with no game in both rows", () => {
    renderHome();
    const day = featuredDay(Date.now());

    expect(slugsIn("Featured games")).toEqual(dailyFeaturedGames(BHALYAM_GAMES, day).map((game) => game.slug));
    expect(slugsIn("Popular games")).toEqual(dailyPopularGames(BHALYAM_GAMES, day).map((game) => game.slug));
    expect(new Set([...slugsIn("Featured games"), ...slugsIn("Popular games")]).size).toBe(6);
  });

  it.each(["friends", "solo"] as const)("keeps both rows when the way to play is %s, and lists the matches beneath", (way) => {
    renderHome(way);

    expect(slugsIn("Featured games")).toHaveLength(2);
    expect(slugsIn("Popular games")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Matching games" })).toBeInTheDocument();
  });

  it("keeps both rows when a category is chosen, and lists that category beneath", () => {
    renderHome();
    fireEvent.click(screen.getByRole("radio", { name: /Favourites/i }));

    expect(slugsIn("Featured games")).toHaveLength(2);
    expect(slugsIn("Popular games")).toHaveLength(4);
    expect(screen.getByText("No Favourite Games Yet")).toBeInTheDocument();
  });

  it("changes both rows at midnight IST while the page is open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T18:29:59Z"));
    renderHome();
    const before = { featured: slugsIn("Featured games"), popular: slugsIn("Popular games") };

    act(() => { vi.advanceTimersByTime(1000); });

    expect(slugsIn("Featured games")).not.toEqual(before.featured);
    expect(slugsIn("Popular games")).not.toEqual(before.popular);
    expect(slugsIn("Featured games")).toHaveLength(2);
    expect(slugsIn("Popular games")).toHaveLength(4);
  });

  it("holds the same places with skeletons in the prerendered page, whatever day it was built", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOON_IST));
    const first = renderToString(<GameCardGrid games={BHALYAM_GAMES} curated onSelect={vi.fn()} />);
    vi.setSystemTime(new Date("2026-10-26T06:30:00Z"));
    const second = renderToString(<GameCardGrid games={BHALYAM_GAMES} curated onSelect={vi.fn()} />);

    expect(first).toBe(second);
    expect(first).toContain("Featured games");
    expect(first).toContain("Popular games");
    expect(first).not.toContain("data-game=");
  });
});
