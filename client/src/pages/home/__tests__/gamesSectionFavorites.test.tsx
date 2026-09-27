import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GamesSection, GameTile } from "../GamesSection";
import CategoryFilter from "../../../components/bhalyam/CategoryFilter";
import { FavouritesManager } from "../../../services/FavouritesManager";
import { BHALYAM_GAMES } from "../../../components/bhalyam/data";
import { toastStore } from "../../../lib/toastStore";

const mockGame = BHALYAM_GAMES[0]; // "handcricket"
const mockSecondGame = BHALYAM_GAMES[1]; // "snl"

beforeEach(() => {
  FavouritesManager.clearFavourites();
});

afterEach(() => {
  cleanup();
  FavouritesManager.clearFavourites();
  vi.restoreAllMocks();
});

describe("GameTile — Favourite Functionality", () => {
  it("renders a 44x44px Heart favorite button with accessible aria-label", () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <GameTile game={mockGame} onSelect={onSelect} />
      </MemoryRouter>
    );

    const favButton = screen.getByRole("button", {
      name: new RegExp(`Add ${mockGame.title} to favourites`, "i"),
    });

    expect(favButton).not.toBeNull();
    // Verify touch target requirements from AGENTS.md (>= 44x44px)
    expect(favButton.className).toContain("min-w-[44px]");
    expect(favButton.className).toContain("min-h-[44px]");
  });

  it("toggles favourite state and shows toast without triggering onSelect", () => {
    const onSelect = vi.fn();
    const toastSpy = vi.spyOn(toastStore, "show");

    render(
      <MemoryRouter>
        <GameTile game={mockGame} onSelect={onSelect} />
      </MemoryRouter>
    );

    const favButton = screen.getByRole("button", {
      name: new RegExp(`Add ${mockGame.title} to favourites`, "i"),
    });

    // Initial state: not favorited
    expect(FavouritesManager.isFavourite(mockGame.slug)).toBe(false);

    // Click heart button
    act(() => {
      fireEvent.click(favButton);
    });

    // Card onSelect should NOT have been called due to e.stopPropagation
    expect(onSelect).not.toHaveBeenCalled();

    // Now favorited
    expect(FavouritesManager.isFavourite(mockGame.slug)).toBe(true);
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${mockGame.title} added to favourites`),
      "default"
    );

    // Accessible label flips to remove
    expect(favButton.getAttribute("aria-label")).toBe(
      `Remove ${mockGame.title} from favourites`
    );

    // Click again to unfavorite
    act(() => {
      fireEvent.click(favButton);
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(FavouritesManager.isFavourite(mockGame.slug)).toBe(false);
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${mockGame.title} removed from favourites`),
      "default"
    );
  });
});

describe("CategoryFilter — Favourites Segment Integration", () => {
  it("renders the Favourites segment and dynamically reflects favorite count", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CategoryFilter value={{ category: "all" }} onChange={onChange} />
    );

    // Initial: 0 favorites
    const favRadio = screen.getByRole("radio", { name: /Favourites/i });
    expect(favRadio).not.toBeNull();
    expect(favRadio.textContent).toContain("Favourites");

    // Add a favorite
    act(() => {
      FavouritesManager.toggleFavourite(mockGame.slug);
    });

    rerender(<CategoryFilter value={{ category: "all" }} onChange={onChange} />);

    // Count updates to (1)
    expect(screen.getByRole("radio", { name: /Favourites \(1\)/i })).not.toBeNull();

    // Add a second favorite
    act(() => {
      FavouritesManager.toggleFavourite(mockSecondGame.slug);
    });

    rerender(<CategoryFilter value={{ category: "all" }} onChange={onChange} />);
    expect(screen.getByRole("radio", { name: /Favourites \(2\)/i })).not.toBeNull();
  });

  it("calls onChange with { category: 'favourites' } when clicked", () => {
    const onChange = vi.fn();
    render(<CategoryFilter value={{ category: "all" }} onChange={onChange} />);

    const favRadio = screen.getByRole("radio", { name: /Favourites/i });
    act(() => {
      fireEvent.click(favRadio);
    });

    expect(onChange).toHaveBeenCalledWith({ category: "favourites" });
  });
});

describe("GamesSection — End-to-End Home Page Favourites", () => {
  it("displays empty state when favourites filter is selected and no games are favorited", () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <GamesSection onSelect={onSelect} />
      </MemoryRouter>
    );

    // Switch to Favourites filter
    const favRadio = screen.getByRole("radio", { name: /Favourites/i });
    act(() => {
      fireEvent.click(favRadio);
    });

    // Check empty state
    expect(screen.getByText("No Favourite Games Yet")).not.toBeNull();
    expect(
      screen.getByText(/Tap the heart icon on any game card below/i)
    ).not.toBeNull();

    // "Show All Games" button returns to all
    const showAllButton = screen.getByRole("button", { name: "Show All Games" });
    act(() => {
      fireEvent.click(showAllButton);
    });

    expect(screen.queryByText("No Favourite Games Yet")).toBeNull();
  });

  it("filters and displays favorited games when games are added to favourites", () => {
    const onSelect = vi.fn();

    // Mark mockGame as favourite
    FavouritesManager.addFavourite(mockGame.slug);

    render(
      <MemoryRouter>
        <GamesSection onSelect={onSelect} />
      </MemoryRouter>
    );

    // Switch to Favourites filter
    const favRadio = screen.getByRole("radio", { name: /Favourites \(1\)/i });
    act(() => {
      fireEvent.click(favRadio);
    });

    // MockGame should be shown
    expect(screen.getByText(mockGame.title)).not.toBeNull();

    // Unfavorited game should not be shown
    expect(screen.queryByText(mockSecondGame.title)).toBeNull();

    // Clicking heart on the displayed game removes it from favourites
    const removeBtn = screen.getByRole("button", {
      name: `Remove ${mockGame.title} from favourites`,
    });
    act(() => {
      fireEvent.click(removeBtn);
    });

    // Now empty state should appear
    expect(screen.getByText("No Favourite Games Yet")).not.toBeNull();
  });
});
