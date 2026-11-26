import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import GameTileArt from "../GameTileArt";

afterEach(cleanup);

const sources = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("source")).map((s) => [s.getAttribute("type"), s.getAttribute("srcset")]);

describe("GameTileArt", () => {
  it("shows the game's tile art, preferring AVIF then WebP over the heavy PNG", () => {
    const { container } = render(<GameTileArt game="rummy" />);

    expect(sources(container)).toEqual([
      ["image/avif", "/RummyTile.avif"],
      ["image/webp", "/RummyTile.webp"],
    ]);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/RummyTile.png");
  });

  it("encodes a space in the file name, so a srcset entry is not split in two", () => {
    const { container } = render(<GameTileArt game="bingo" />);

    expect(container.querySelector("img")?.getAttribute("src")).toBe("/Bingo%20Tile.png");
    for (const [, srcset] of sources(container)) {
      expect(srcset).not.toMatch(/\s/);
      expect(srcset).toMatch(/^\/Bingo%20Tile\.(avif|webp)$/);
    }
  });

  it("is decorative: hidden from assistive tech, because the game's name sits beside it", () => {
    const { container } = render(<GameTileArt game="uno" />);

    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("loads lazily and asynchronously, since there are several on a phone screen", () => {
    const { container } = render(<GameTileArt game="rps" />);
    const img = container.querySelector("img");

    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("decoding")).toBe("async");
  });

  it("shows a controller icon in the same frame for a game that has no art", () => {
    const { container } = render(<GameTileArt game="a-game-without-a-tile" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("swaps a picture that fails to load for the same icon, not a broken-image mark", () => {
    const { container } = render(<GameTileArt game="ludo" />);
    expect(container.querySelector("img")).not.toBeNull();

    fireEvent.error(container.querySelector("img") as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
