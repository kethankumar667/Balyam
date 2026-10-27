import { describe, expect, it, vi } from "vitest";
import { scrollIntoViewHorizontally } from "../scrollIntoViewHorizontally";

function trackAndItem(left: number, right: number) {
  const track = document.createElement("div");
  const item = document.createElement("button");
  Object.defineProperty(track, "clientWidth", { value: 200 });
  vi.spyOn(track, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 500, 200, 44));
  vi.spyOn(item, "getBoundingClientRect").mockReturnValue(new DOMRect(left, 500, right - left, 44));
  const scrollBy = vi.fn();
  track.scrollBy = scrollBy;
  return { track, item, scrollBy };
}

describe("horizontal category reveal", () => {
  it("moves only the track to reveal an item clipped on the right", () => {
    const { track, item, scrollBy } = trackAndItem(160, 260);
    scrollIntoViewHorizontally(track, item, "smooth");
    expect(scrollBy).toHaveBeenCalledWith({ left: 50, behavior: "smooth" });
  });

  it("moves only the track to reveal an item clipped on the left", () => {
    const { track, item, scrollBy } = trackAndItem(-30, 70);
    scrollIntoViewHorizontally(track, item, "auto");
    expect(scrollBy).toHaveBeenCalledWith({ left: -40, behavior: "auto" });
  });

  it("does not scroll any ancestor when the chosen item is already visible", () => {
    const { track, item, scrollBy } = trackAndItem(20, 120);
    scrollIntoViewHorizontally(track, item, "auto");
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("accounts for the track's border when measuring its visible area", () => {
    const { track, item, scrollBy } = trackAndItem(161, 261);
    Object.defineProperty(track, "clientLeft", { value: 1 });
    scrollIntoViewHorizontally(track, item, "auto");
    expect(scrollBy).toHaveBeenCalledWith({ left: 50, behavior: "auto" });
  });
});
