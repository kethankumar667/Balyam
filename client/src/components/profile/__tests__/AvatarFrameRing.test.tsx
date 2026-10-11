import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AvatarFrameRing from "../AvatarFrameRing";
import SeatAvatar from "../SeatAvatar";

/**
 * A frame is decoration around someone's face, and the face has to survive it: it must never
 * block taps, never be announced to a screen reader, and never appear for an id this build does
 * not recognise.
 */
describe("AvatarFrameRing", () => {
  it("draws nothing for no frame, the default frame, or an unknown id", () => {
    for (const frameId of [undefined, "", "frame_none", "frame_from_a_future_release"]) {
      const { container, unmount } = render(<AvatarFrameRing frameId={frameId} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("draws a ring that is hidden from assistive tech and does not take taps", () => {
    const { container } = render(<AvatarFrameRing frameId="frame_saffron_edge" />);
    const ring = container.querySelector("[data-avatar-frame='frame_saffron_edge']");
    expect(ring).not.toBeNull();
    expect(ring).toHaveAttribute("aria-hidden", "true");
    expect(ring?.className).toContain("pointer-events-none");
  });

  it("draws a second ring for the twin frames", () => {
    const single = render(<AvatarFrameRing frameId="frame_saffron_edge" />);
    const singleLayers = single.container.querySelectorAll("[data-avatar-frame] > span").length;
    single.unmount();
    const twin = render(<AvatarFrameRing frameId="frame_indigo_twin" />);
    expect(twin.container.querySelectorAll("[data-avatar-frame] > span").length).toBeGreaterThan(singleLayers);
  });

  it("draws eight lights for Diwali Lights, four stars for Rangoli Stars, and a crown for Royal Crown", () => {
    const lights = render(<AvatarFrameRing frameId="frame_diwali_lights" />);
    expect(lights.container.querySelectorAll("span[style*='width: 3px']")).toHaveLength(8);
    lights.unmount();

    const stars = render(<AvatarFrameRing frameId="frame_rangoli_stars" />);
    expect(stars.container.querySelectorAll("svg")).toHaveLength(4);
    stars.unmount();

    const crown = render(<AvatarFrameRing frameId="frame_royal_crown" />);
    expect(crown.container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("only animates behind motion-safe, so reduced-motion players get a still ring", () => {
    const { container } = render(<AvatarFrameRing frameId="frame_aurora_flow" />);
    const classes = Array.from(container.querySelectorAll("span")).map((node) => node.className).join(" ");
    expect(classes).toContain("motion-safe:animate-spin");
    expect(classes).not.toMatch(/(^|\s)animate-spin/);
  });
});

describe("SeatAvatar with a frame", () => {
  it("wears the frame it is given", () => {
    const { container } = render(<SeatAvatar name="Anand" frame="frame_royal_crown" />);
    expect(container.querySelector("[data-avatar-frame='frame_royal_crown']")).not.toBeNull();
  });

  it("looks exactly as before when it has no frame", () => {
    const { container } = render(<SeatAvatar name="Anand" />);
    expect(container.querySelector("[data-avatar-frame]")).toBeNull();
  });
});
