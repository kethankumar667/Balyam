import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { LudoWorldDefs, LudoWorldScene } from "../LudoWorldScene";

/**
 * What a world puts behind a Ludo table. The classic table keeps its own backdrop and draws nothing here; the toy box
 * and the palace each draw a scene, the paint their tiles are filled with, and (on the wide layout only) the things
 * lying beside the board.
 */
describe("LudoWorldScene", () => {
  it("draws nothing for the classic table", () => {
    const { container } = render(<LudoWorldScene world="classic" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws nothing for something that is not a world", () => {
    const { container } = render(<LudoWorldScene world={"lava" as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws each of the five other worlds' own scene once it has arrived", async () => {
    const MARK: Record<string, string> = { neon: "bvw-twinkle", toy: "bt-dots", zen: "cy=\"46\"", reef: "rgba(220,255,250,0.55)", palace: "bp-carpet" };
    for (const id of ["neon", "toy", "zen", "reef", "palace"] as const) {
      const view = render(<LudoWorldScene world={id} />);
      await waitFor(() => expect(view.container.innerHTML, id).toContain(MARK[id]));
      view.unmount();
    }
  });

  it("is decoration only: hidden from assistive tech and never in the way of a tap", () => {
    const { container } = render(<LudoWorldScene world="toy" />);
    const layer = container.querySelector("[class*='-z-10']") as HTMLElement;
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.className).toContain("pointer-events-none");
  });

  it("puts the paints the tiles point at in the document, for each world that has a scene", () => {
    const toy = render(<LudoWorldScene world="toy" />);
    expect(toy.container.querySelector("#lw-toy-tile")).not.toBeNull();
    toy.unmount();
    const palace = render(<LudoWorldScene world="palace" />);
    expect(palace.container.querySelector("#lw-palace-tile")).not.toBeNull();
  });

  it("draws the toy box's scene once it has arrived", async () => {
    const { container } = render(<LudoWorldScene world="toy" />);
    await waitFor(() => expect(container.innerHTML).toContain("bt-dots"));
  });

  it("draws the palace's scene once it has arrived", async () => {
    const { container } = render(<LudoWorldScene world="palace" />);
    await waitFor(() => expect(container.innerHTML).toContain("bp-carpet"));
  });

  it("brings the toy box's props only to the wide layout", async () => {
    const wide = render(<LudoWorldScene world="toy" isDesktop />);
    await waitFor(() => expect(wide.container.innerHTML).toContain(">C<"));
    wide.unmount();
    const narrow = render(<LudoWorldScene world="toy" />);
    await waitFor(() => expect(narrow.container.innerHTML).toContain("bt-dots"));
    expect(narrow.container.innerHTML).not.toContain(">C<");
  });

  it("brings the palace's props only to the wide layout", async () => {
    const wide = render(<LudoWorldScene world="palace" isDesktop />);
    await waitFor(() => expect(wide.container.innerHTML).toContain("bp-brass"));
    wide.unmount();
    const narrow = render(<LudoWorldScene world="palace" />);
    await waitFor(() => expect(narrow.container.innerHTML).toContain("bp-carpet"));
    expect(narrow.container.innerHTML).not.toContain("bp-brass");
  });
});

describe("LudoWorldDefs", () => {
  it("defines a tile paint for each world, and takes no room", () => {
    const { container } = render(<LudoWorldDefs />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg).toHaveAttribute("width", "0");
    expect(svg).toHaveAttribute("height", "0");
    for (const id of ["lw-neon-tile", "lw-toy-tile", "lw-zen-tile", "lw-reef-tile", "lw-palace-tile"]) expect(container.querySelector(`#${id}`), id).not.toBeNull();
  });
});
