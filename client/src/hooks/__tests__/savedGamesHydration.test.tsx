import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/RecentlyPlayedManager", () => {
  const saved = [{ slug: "ludo", playedAt: 123 }];
  return { RecentlyPlayedManager: {
    subscribe: () => () => {},
    getRecentlyPlayed: () => saved,
    recordRecentlyPlayed: vi.fn(),
    clearRecentlyPlayed: vi.fn(),
  } };
});
vi.mock("../../services/FavouritesManager", () => {
  const saved = ["ludo"];
  return { FavouritesManager: {
    subscribe: () => () => {},
    getFavourites: () => saved,
    toggleFavourite: vi.fn(),
    addFavourite: vi.fn(),
    removeFavourite: vi.fn(),
  } };
});

import { useRecentlyPlayed } from "../useRecentlyPlayed";
import { useFavourites } from "../useFavourites";

function SavedGames() {
  const { recentItems } = useRecentlyPlayed();
  const { favourites } = useFavourites();
  return <p>{recentItems.length + favourites.length}</p>;
}

describe("saved game hydration", () => {
  it("uses cached empty server snapshots, then restores device lists", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<SavedGames />);
    expect(container.textContent).toBe("0");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoveries: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <SavedGames />, {
          onRecoverableError: (error) => recoveries.push(error),
        });
      });
      expect(container.textContent).toBe("2");
      expect(recoveries).toEqual([]);
      expect(errors.mock.calls.flat().join(" ")).not.toMatch(/getServerSnapshot|hydration/i);
    } finally {
      act(() => root?.unmount());
      errors.mockRestore();
    }
  });
});
