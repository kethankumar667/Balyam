import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AvatarFrameOverlay, { hasAvatarFrameArtwork } from "../AvatarFrameOverlay";

/**
 * Golden Reunion is the frame earned by bringing three friends, so its design says so: a medallion for each
 * friend, on a gemstone of their own. These pin the parts that carry that meaning and the parts that keep it
 * safe to put on many avatars at once.
 */
const ID = "aura_nostalgia_gold";

describe("Golden Reunion frame", () => {
  it("is still the artwork the shop, the seats and the thumbnails look for", () => {
    const { container } = render(<AvatarFrameOverlay frameId={ID} />);

    expect(hasAvatarFrameArtwork(ID)).toBe(true);
    expect(container.querySelector(`svg[data-frame="${ID}"]`)).toBeInTheDocument();
  });

  it("sets one medallion for each of the three friends, each on a different gemstone", () => {
    const { container } = render(<AvatarFrameOverlay frameId={ID} />);

    const friends = [...container.querySelectorAll('[data-part="friend"]')];
    const gems = friends.map((friend) =>
      [...friend.querySelectorAll("circle")].map((circle) => circle.getAttribute("fill")).find((fill) => /-(amber|coral|teal)\)$/.test(fill ?? "")),
    );

    expect(friends).toHaveLength(3);
    expect(new Set(gems).size).toBe(3);
  });

  it("moves in four ways: a turning sunburst and sheen, floating medallions and winking glints", () => {
    const { container } = render(<AvatarFrameOverlay frameId={ID} />);

    expect(container.querySelectorAll(".af-spin").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll(".af-float")).toHaveLength(3);
    expect(container.querySelectorAll(".af-twinkle")).toHaveLength(3);
  });

  it("keeps its gradients to itself, so two of them on one page never borrow each other's gold", () => {
    const { container } = render(
      <>
        <AvatarFrameOverlay frameId={ID} />
        <AvatarFrameOverlay frameId={ID} />
      </>,
    );

    const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every fill and stroke at a gradient that exists", () => {
    const { container } = render(<AvatarFrameOverlay frameId={ID} />);

    const defined = new Set([...container.querySelectorAll("[id]")].map((element) => element.id));
    const used = [...container.querySelectorAll("[fill], [stroke]")]
      .flatMap((element) => [element.getAttribute("fill"), element.getAttribute("stroke")])
      .map((value) => value?.match(/^url\(#(.+)\)$/)?.[1])
      .filter((id): id is string => Boolean(id));

    expect(used.length).toBeGreaterThan(0);
    for (const id of used) expect(defined.has(id), `${id} is used but not defined`).toBe(true);
  });
});
