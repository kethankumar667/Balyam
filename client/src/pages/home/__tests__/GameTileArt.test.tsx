import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import { GameTileArt } from "../GamesSection";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * Regression coverage for the working-tree audit: converting this tile's
 * <img> to <picture><source avif/webp> introduced avif/webp URLs derived
 * from the raw `src` instead of the cache-busting `resolvedSrc`, silently
 * disabling the retry-after-image-failure mechanism for any browser that
 * honors <source> (i.e. nearly all of them) — the retried request was
 * byte-identical to the one that just failed.
 */
describe("GameTileArt — retry after image load failure", () => {
  it("carries the retry cache-buster into the avif/webp <source> URLs, not just the fallback <img src>", () => {
    vi.useFakeTimers();

    const { container } = render(
      <GameTileArt src="/tiles/ludo.png" title="Ludo" compact={false}>
        <span>fallback</span>
      </GameTileArt>,
    );

    const img = container.querySelector("img")!;
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toBe("/tiles/ludo.png");

    act(() => {
      fireEvent.error(img);
    });

    act(() => {
      vi.advanceTimersByTime(900);
    });

    const retriedImg = container.querySelector("img")!;
    expect(retriedImg.getAttribute("src")).toBe("/tiles/ludo.png?retry=1");

    const sources = Array.from(container.querySelectorAll("source"));
    const avifSrc = sources.find((s) => s.getAttribute("type") === "image/avif")?.getAttribute("srcset");
    const webpSrc = sources.find((s) => s.getAttribute("type") === "image/webp")?.getAttribute("srcset");

    // Before the fix these stayed "/tiles/ludo.avif" / "/tiles/ludo.webp" —
    // identical to the URL that just failed, so the browser's <source>
    // preference meant the retry never actually re-fetched anything new.
    expect(avifSrc).toBe("/tiles/ludo.avif?retry=1");
    expect(webpSrc).toBe("/tiles/ludo.webp?retry=1");
  });
});
