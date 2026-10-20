import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BHALYAM_COSMETIC_REGISTRY } from "@shared/cosmetics";
import type { Player } from "@shared/types";
import AvatarFrameOverlay from "../AvatarFrameOverlay";
import { FRAME_DESIGNS, getFrameDesign, isFrameId } from "../frameDesigns";
import SeatAvatar from "../../../profile/SeatAvatar";
import ParticipantRow from "../../../room/ParticipantRow";

const STYLESHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "avatar-frames.css"), "utf8");

const human = (over: Partial<Player> = {}): Player => ({
  id: "p_1",
  name: "Anand",
  isHost: false,
  isReady: true,
  isConnected: true,
  ...over,
});

/** A frame's drawing with its colours and its per-instance ids taken out: what is left is its shape. */
function shapeOf(frameId: string): string {
  const { container } = render(<AvatarFrameOverlay frameId={frameId} />);
  return container.innerHTML.replace(/#[0-9a-fA-F]{3,8}|hsl\([^)]*\)|\baf[a-zA-Z0-9]+/g, "_");
}

describe("avatar frame designs", () => {
  it("draws every frame the registry sells, and sells every frame it draws", () => {
    const registered = BHALYAM_COSMETIC_REGISTRY.filter((d) => d.id.startsWith("frame_")).map((d) => d.id);
    expect(FRAME_DESIGNS.map((d) => d.id).sort()).toEqual(registered.sort());
  });

  it("has twenty frames, each with a name of its own", () => {
    expect(FRAME_DESIGNS).toHaveLength(20);
    expect(new Set(FRAME_DESIGNS.map((d) => d.name)).size).toBe(20);
  });

  it("makes every frame a different drawing, not a recolour of one ring", () => {
    const shapes = FRAME_DESIGNS.map((d) => shapeOf(d.id));
    expect(new Set(shapes).size).toBe(20);
  });

  it("draws something for every frame, inside an SVG that is decoration only", () => {
    for (const { id } of FRAME_DESIGNS) {
      const { container, unmount } = render(<AvatarFrameOverlay frameId={id} />);
      const svg = container.querySelector("svg.af-svg");
      expect(svg, id).not.toBeNull();
      expect(svg?.getAttribute("aria-hidden"), id).toBe("true");
      expect(svg?.querySelectorAll("*").length, id).toBeGreaterThan(3);
      unmount();
    }
  });

  it("draws nothing for an id it does not know", () => {
    const { container } = render(<AvatarFrameOverlay frameId="frame_not_a_real_one" />);
    expect(container).toBeEmptyDOMElement();
    expect(isFrameId("frame_not_a_real_one")).toBe(false);
    expect(isFrameId(undefined)).toBe(false);
    expect(getFrameDesign("frame_royal_crown")?.name).toBe("Royal Crown");
  });

  it("stands every frame still for anyone who has asked for less motion", () => {
    expect(STYLESHEET).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
  });
});

describe("a frame on a seat", () => {
  it("is drawn round the avatar when the seat wears one", () => {
    const { container } = render(<SeatAvatar name="Anand" aura="frame_diya_glow" className="w-8 h-8" />);
    expect(container.querySelector('svg[data-frame="frame_diya_glow"]')).not.toBeNull();
  });

  it("leaves the legacy ring as it was, and an avatar with no aura bare", () => {
    const legacy = render(<SeatAvatar name="Anand" aura="aura_ludo_king" className="w-8 h-8" />);
    expect(legacy.container.querySelector("svg.af-svg")).toBeNull();
    expect(legacy.container.querySelector(".border-dashed")).not.toBeNull();
    legacy.unmount();

    const none = render(<SeatAvatar name="Anand" className="w-8 h-8" />);
    expect(none.container.querySelector("svg.af-svg")).toBeNull();
  });

  it("shows a real player's frame in the lobby, not only a bot's", () => {
    const { container } = render(
      <ParticipantRow player={human({ cosmetics: { avatarAura: "frame_royal_crown" } })} selfId="p_self" isHost={false} />,
    );
    expect(container.querySelector('svg[data-frame="frame_royal_crown"]')).not.toBeNull();
  });

  it("draws no frame for a real player who wears none", () => {
    const { container } = render(<ParticipantRow player={human()} selfId="p_self" isHost={false} />);
    expect(container.querySelector("svg.af-svg")).toBeNull();
  });
});
