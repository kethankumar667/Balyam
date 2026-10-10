import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlbumAvatar } from "../AlbumAvatar";

const dotOf = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-presence]");

/**
 * The little badge on a face, the way Teams draws it: green and ticked when someone is
 * around, red and barred when they are busy in a game, an empty ring when they are not
 * here. The shapes differ as well as the colours, so it never rests on hue alone.
 */
describe("AlbumAvatar presence badge", () => {
  it("draws no badge where presence is not shown", () => {
    expect(dotOf(render(<AlbumAvatar avatar="" name="" />).container)).toBeNull();
  });

  it("is green for someone who is online", () => {
    const dot = dotOf(render(<AlbumAvatar avatar="" name="" presence="online" />).container);
    expect(dot?.dataset.presence).toBe("online");
    expect(dot?.className).toContain("bg-album-success");
  });

  it("is red for someone in a game, not green", () => {
    const dot = dotOf(render(<AlbumAvatar avatar="" name="" presence="in-game" />).container);
    expect(dot?.dataset.presence).toBe("in-game");
    expect(dot?.className).toContain("bg-album-danger");
    expect(dot?.className).not.toContain("bg-album-success");
  });

  it("is an empty ring, with no fill, for someone who is not here", () => {
    const dot = dotOf(render(<AlbumAvatar avatar="" name="" presence="offline" />).container);
    expect(dot?.dataset.presence).toBe("offline");
    expect(dot?.className).not.toContain("bg-album-success");
    expect(dot?.className).not.toContain("bg-album-danger");
    expect(dot?.className).toContain("border");
  });

  it("gives each state its own mark inside the badge, so colour is never the only signal", () => {
    const marks = (["online", "in-game", "offline"] as const).map((presence) => {
      const dot = dotOf(render(<AlbumAvatar avatar="" name="" presence={presence} />).container);
      return dot?.querySelector("svg")?.innerHTML;
    });
    expect(new Set(marks).size).toBe(3);
    expect(marks.every(Boolean)).toBe(true);
  });
});
