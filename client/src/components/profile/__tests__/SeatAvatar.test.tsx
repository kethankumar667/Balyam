import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SeatAvatar from "../SeatAvatar";
import { AVATARS } from "../../../lib/avatars";

/** A real shipped avatar, so the picture path is the one under test, not the initial fallback. */
const AVATAR = AVATARS[0].id;

/**
 * The lobby seat card sizes an avatar as `w-full h-full` inside a fixed box. A percentage needs a
 * parent with a size, and the wrapper used to have none, so the picture took its dimensions from the
 * image file: a portrait-shaped avatar became an egg while a square one stayed round, and a row of
 * seats looked uneven. These pin the two things that make every avatar a circle of the size it is given.
 */
describe("SeatAvatar shape", () => {
  it("fills its box when asked to, so a percentage size has something to be a percentage of", () => {
    const { container } = render(<SeatAvatar avatar={AVATAR} name="Kethan" className="w-full h-full rounded-full object-cover" />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass("w-full", "h-full");
  });

  it("does not stretch a fixed-size avatar", () => {
    const { container } = render(<SeatAvatar avatar={AVATAR} name="Kethan" className="w-8 h-8" />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).not.toHaveClass("w-full");
  });

  it("clips the picture to a square, whatever shape the image file is", () => {
    const { container } = render(<SeatAvatar avatar={AVATAR} name="Kethan" className="w-14 h-14" />);

    const clip = container.querySelector("img")?.parentElement as HTMLElement;
    expect(clip).toHaveClass("aspect-square", "rounded-full", "overflow-hidden");
  });
});
