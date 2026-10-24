import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
// `?raw`: the client is typed for the browser (no node:fs), and Vite resolves these the way the app does.
import WORLDS_CSS from "../rummy-worlds.css?raw";
import DESKTOP from "../RummyBoardDesktop.tsx?raw";
import MOBILE from "../RummyBoardMobile.tsx?raw";
import ENTRY from "../RummyBoard.tsx?raw";
import { artWorldsFor } from "../../../lib/worlds/worldArt";
import { RummyWorldScene } from "../RummyWorldScene";
import type { WorldId } from "@shared/worlds";

/**
 * How a table's world reaches the Rummy table.
 *
 * The desktop table is built from design tokens, so a world is a block of tokens on the room. The phone table is not
 * (its table is a hard-coded wooden gradient and frame), so a world sets two variables the phone's root reads, with the
 * old wooden values as the fallback, which is why the classic table is untouched. A printed card is the same printed
 * card in every world: no world may touch a suit colour or the court-card artwork.
 */

const RUMMY_WORLDS: readonly WorldId[] = artWorldsFor("rummy").filter((id) => id !== "classic");

/** The table tokens every world must set on the desktop room. */
const TABLE_TOKENS = [
  "--rm-room-bg",
  "--rm-felt-deep",
  "--rm-felt",
  "--rm-felt-lit",
  "--rm-panel",
  "--rm-panel-lit",
  "--rm-edge",
  "--rm-edge-strong",
  "--rm-brass",
  "--rm-brass-dim",
  "--rm-brass-glow",
  "--rm-ink",
  "--rm-ink-mid",
  "--rm-ink-low",
] as const;

/** What the phone table reads. */
const PHONE_VARS = ["--rm-m-table", "--rm-m-frame"] as const;

/** The stylesheet without its comments, which explain the rules and so mention the very things the rules must not do. */
const RULES = WORLDS_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the rule whose selector is exactly this, at the start of a line (`.rm-world-toy` is not `.rm-room.rm-world-toy`). */
function block(selector: string): string | null {
  const start = RULES.search(new RegExp(`^${selector.replace(/\./g, "\\.")} \\{`, "m"));
  if (start < 0) return null;
  return RULES.slice(start, RULES.indexOf("}", start));
}

describe("the worlds Rummy can draw", () => {
  it("includes every world but the classic table", () => {
    expect(RUMMY_WORLDS).toEqual(["neon", "toy", "zen", "reef", "palace"]);
  });

  it("sets the table tokens on the desktop room for each world", () => {
    for (const id of RUMMY_WORLDS) {
      const css = block(`.rm-room.rm-world-${id}`);
      expect(css, `no .rm-room.rm-world-${id} block`).not.toBeNull();
      for (const token of TABLE_TOKENS) expect(css, `${id} is missing ${token}`).toContain(token);
    }
  });

  it("sets what the phone table reads for each world", () => {
    for (const id of RUMMY_WORLDS) {
      const css = block(`.rm-world-${id}`);
      expect(css, `no .rm-world-${id} block`).not.toBeNull();
      for (const v of PHONE_VARS) expect(css, `${id} is missing ${v}`).toContain(v);
    }
  });

  it("makes each world's table differ from the others and from the classic, not just by a shade", () => {
    const tables = RUMMY_WORLDS.map((id) => /--rm-m-table:\s*([^;]+);/.exec(block(`.rm-world-${id}`) ?? "")?.[1]);
    expect(new Set(tables).size).toBe(RUMMY_WORLDS.length);
    for (const table of tables) expect(table).not.toContain("#6D4323");
  });
});

describe("a printed card is the same in every world", () => {
  it("never touches a suit colour or the court-card artwork", () => {
    expect(RULES).not.toMatch(/--rm-suit-/);
    expect(RULES).not.toMatch(/--rm-art-/);
    expect(RULES).not.toMatch(/--rm-card-back/);
  });
});

describe("the worlds are wired into both layouts", () => {
  it("puts the mobile world icon before fullscreen, outside the hamburger menu", () => {
    const header = MOBILE.slice(MOBILE.indexOf("function TopStrip("));
    const control = header.indexOf('<TableWorldControl game="rummy" variant="icon"');
    expect(control).toBeGreaterThan(-1);
    expect(control).toBeLessThan(header.indexOf("{fullscreenSupported &&"));
    expect(control).toBeLessThan(header.indexOf("onClick={onOpenMenu}"));
    expect(MOBILE.match(/<TableWorldControl\b/g)).toHaveLength(1);
    expect(MOBILE).not.toContain('<TableWorldControl game="rummy" variant="row"');
    expect(DESKTOP).toContain('<TableWorldControl game="rummy" variant="chip"');
  });

  it("confines the earned School Slate material to the classic world in both layouts", () => {
    for (const layout of [DESKTOP, MOBILE]) {
      expect(layout).toContain('useTableTheme("rummy")');
      expect(layout).toContain('world === "classic" && tableTheme.id === "table_retro_school_slate"');
    }
    expect(block(".rm-room.rm-world-classic.rm-school-slate")).toContain("--rm-felt");
    expect(block(".rm-world-classic.rm-school-slate")).toContain("--rm-m-table");
    expect(block(".rm-world-classic.rm-school-slate")).toContain("--rm-m-frame");
  });

  it("passes the world from the entry to the desktop and the phone table", () => {
    expect(ENTRY).toContain("world");
    expect(ENTRY).toMatch(/<RummyBoardDesktop \{\.\.\.props\}/);
    expect(ENTRY).toMatch(/<RummyBoardMobile \{\.\.\.props\}/);
  });

  it("marks the desktop room with the world and draws its scene", () => {
    expect(DESKTOP).toContain("rm-world-");
    expect(DESKTOP).toContain("RummyWorldScene");
    expect(DESKTOP).toContain("rummy-worlds.css");
  });

  it("lets the phone table read the world's variables, keeping the wooden table as the fallback", () => {
    expect(MOBILE).toContain("rm-world-");
    expect(MOBILE).toContain("RummyWorldScene");
    expect(MOBILE).toContain("var(--rm-m-table,");
    expect(MOBILE).toContain("var(--rm-m-frame,");
    expect(MOBILE).toContain("#6D4323");
  });
});

describe("RummyWorldScene", () => {
  it("draws nothing for the classic table", () => {
    const { container } = render(<RummyWorldScene world="classic" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws nothing for something that is not a world", () => {
    const { container } = render(<RummyWorldScene world={"lava" as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is decoration only: hidden from assistive tech and never in the way of a tap", () => {
    const { container } = render(<RummyWorldScene world="palace" />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.className).toContain("pointer-events-none");
  });

  it("draws each world's own scene once it has arrived", async () => {
    const MARK: Record<string, string> = { neon: "bvw-twinkle", toy: "bt-dots", zen: "cy=\"46\"", reef: "rgba(220,255,250,0.55)", palace: "bp-carpet" };
    for (const id of RUMMY_WORLDS) {
      const view = render(<RummyWorldScene world={id} />);
      await waitFor(() => expect(view.container.innerHTML, id).toContain(MARK[id]));
      view.unmount();
    }
  });
});
