import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import GameCard from "../GameCard";
import GameCardGrid from "../GameCardGrid";
import { BHALYAM_GAMES } from "../../bhalyam/data";
import { dailyFeaturedGames, featuredDay } from "../dailyFeatured";
import { FavouritesManager } from "../../../services/FavouritesManager";

vi.mock("../../../hooks/useAudio", () => ({ useAudio: () => ({ play: vi.fn() }) }));

beforeEach(() => {
  FavouritesManager.clearFavourites();
  vi.useRealTimers();
  document.documentElement.setAttribute("data-theme", "light");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  FavouritesManager.clearFavourites();
});

const game = BHALYAM_GAMES.find((item) => item.slug === "dotsboxes")!;

describe("hybrid game cards", () => {
  it("gives regular tiles a continuous gradient, floating artwork and pill-shaped CTA", () => {
    const { container } = render(<GameCard game={game} onSelect={vi.fn()} />);
    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("data-tile-style", "hybrid");
    expect(card).toHaveAttribute("data-category", "classroom");
    expect(card).toHaveAttribute("data-featured", "false");
    expect(screen.getByText("Classroom")).toBeVisible();
    expect(card.style.background).toContain("linear-gradient");
    expect(container.querySelector("[data-color-rail]")).toBeNull();
    const stage = container.querySelector<HTMLElement>("[data-art-stage]")!;
    expect(stage.style.background).toBe("");
    expect(stage).not.toHaveClass("border");
    expect(screen.getByRole("button", { name: `Add ${game.title} to favourites` })).toHaveClass("rounded-full", "bg-white/60");
    expect(screen.getByRole("button", { name: `Play ${game.title}` })).toHaveClass("min-h-[44px]", "rounded-full");
  });

  it("uses a stronger featured surface and larger artwork without changing the launch action", () => {
    const select = vi.fn();
    const { container } = render(<GameCard game={game} featured onSelect={select} />);
    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("data-featured", "true");
    expect(card.style.background).toContain("linear-gradient");
    expect(container.querySelector("[data-color-rail]")).toBeNull();
    expect(container.querySelector<HTMLElement>("[data-art-stage]")!.style.background).toBe("");
    expect(screen.getByRole("button", { name: `Play ${game.title}` }).style.background.toLowerCase()).toContain("#b45309");
    expect(screen.getByText("Featured")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: `Play ${game.title}` }));
    expect(select).toHaveBeenCalledOnce();
  });

  it("toggles favourites independently and exposes the pressed state", () => {
    const select = vi.fn();
    render(<GameCard game={game} onSelect={select} />);
    const favourite = screen.getByRole("button", { name: `Add ${game.title} to favourites` });
    expect(favourite).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(favourite);
    expect(favourite).toHaveAttribute("aria-pressed", "true");
    expect(FavouritesManager.isFavourite(game.slug)).toBe(true);
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(favourite);
    expect(favourite).toHaveAttribute("aria-pressed", "false");
  });

  it("does not launch a locked card but still allows saving it", () => {
    const select = vi.fn();
    render(<GameCard game={{ ...game, maintenance: true, accessible: false }} onSelect={select} />);
    const play = screen.getByRole("button", { name: `Play ${game.title}` });
    expect(play).toBeDisabled();
    expect(play).toHaveTextContent("Coming soon");
    fireEvent.click(play);
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: `Add ${game.title} to favourites` }));
    expect(FavouritesManager.isFavourite(game.slug)).toBe(true);
  });

  it("shows a glyph after an artwork error and keeps Play usable", () => {
    const select = vi.fn();
    render(<GameCard game={game} onSelect={select} />);
    fireEvent.error(screen.getByAltText(`${game.title} artwork`));
    expect(screen.queryByAltText(`${game.title} artwork`)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `Play ${game.title}` }));
    expect(select).toHaveBeenCalledOnce();
  });
});

describe("shared catalog grouping", () => {
  it("keeps prerendered markup date-independent until hydration finishes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    const first = renderToString(<GameCardGrid games={BHALYAM_GAMES} onSelect={vi.fn()} />);
    vi.setSystemTime(new Date("2026-10-24T12:00:00Z"));
    const second = renderToString(<GameCardGrid games={BHALYAM_GAMES} onSelect={vi.fn()} />);
    expect(first).toBe(second);
    expect(first).not.toContain('data-featured="true"');
  });

  it("features today's two playable games, with no duplicated or missing cards", () => {
    const games = BHALYAM_GAMES.slice(0, 6);
    render(<GameCardGrid games={games} onSelect={vi.fn()} />);
    const featured = screen.getByRole("region", { name: "Featured games" });
    const cards = within(featured).getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.getAttribute("data-game")))
      .toEqual(dailyFeaturedGames(games, featuredDay(Date.now())).map((game) => game.slug));
    expect(screen.getAllByRole("article")).toHaveLength(games.length);
    for (const item of games) expect(screen.getAllByRole("heading", { name: item.title })).toHaveLength(1);
  });

  it("keeps the same daily picks with a six-card Home cap and the full catalog", () => {
    const { container } = render(<>
      <GameCardGrid games={BHALYAM_GAMES} limit={6} onSelect={vi.fn()} />
      <GameCardGrid games={BHALYAM_GAMES} onSelect={vi.fn()} />
    </>);
    const regions = screen.getAllByRole("region", { name: "Featured games" });
    const picks = regions.map((region) => within(region).getAllByRole("article").map((card) => card.dataset.game));
    expect(picks[0]).toEqual(picks[1]);
    expect(container.querySelectorAll("article")).toHaveLength(6 + BHALYAM_GAMES.length);
  });

  it("updates an open grid at IST midnight and after returning from a suspended tab", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T18:29:59Z"));
    const { unmount } = render(<GameCardGrid games={BHALYAM_GAMES} onSelect={vi.fn()} />);
    const picks = () => within(screen.getByRole("region", { name: "Featured games" }))
      .getAllByRole("article").map((card) => card.dataset.game);
    const yesterday = picks();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(picks().some((slug) => yesterday.includes(slug))).toBe(false);
    vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    act(() => { fireEvent(window, new Event("focus")); });
    expect(picks()).toEqual(dailyFeaturedGames(BHALYAM_GAMES, featuredDay(Date.now())).map((game) => game.slug));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not re-promote games in a filtered view and preserves selection", () => {
    const select = vi.fn();
    render(<GameCardGrid games={[game]} showFeatured={false} onSelect={select} />);
    expect(screen.queryByRole("region", { name: "Featured games" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `Play ${game.title}` }));
    expect(select).toHaveBeenCalledWith(game.slug);
  });

  it("does not render empty featured or regular sections", () => {
    const { container } = render(<GameCardGrid games={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
