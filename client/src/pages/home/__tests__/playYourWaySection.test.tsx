import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useState } from "react";
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PlayYourWaySection, PAWN_HOP_MS } from "../PlayYourWaySection";
import { GamesSection } from "../GamesSection";
import { Die, ROLL_MS, dealFace, resetDeal, wayForFace, type DieFace } from "../Die";
import { BHALYAM_GAMES, isLocked } from "../../../components/bhalyam/data";
import { gamesForWay, type PlayWay } from "../playWay";

beforeEach(() => {
  resetDeal();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * A file under `client/public`, from its URL (`/way-faces/face-1.webp`).
 *
 * Built with `resolve`, NOT `new URL(`...${src}`, import.meta.url)`: Vite rewrites
 * that pattern into an asset import and, for a file in `public/`, hands back
 * `undefined`, so the test reported real files as missing.
 */
const publicFile = (src: string) =>
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../../public", `.${src}`);

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

/** Holds the choice the way the home page does, inside a router so the boxes can really go somewhere. */
function Harness({
  initial = null,
  onChange,
  rollFace,
}: {
  initial?: PlayWay | null;
  onChange?: (next: PlayWay | null) => void;
  rollFace?: () => DieFace;
}) {
  const [way, setWay] = useState<PlayWay | null>(initial);
  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <PlayYourWaySection
              way={way}
              rollFace={rollFace}
              onChangeWay={(next) => {
                onChange?.(next);
                setWay(next);
              }}
            />
          }
        />
        <Route path="/games" element={<p>The games page</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

/**
 * The section rendered OUTSIDE the routes, so changing the URL leaves it mounted.
 * Needed wherever a test clicks something that navigates (a way box, "Show all
 * games") and then still wants to look at the section.
 */
function StayMounted({
  initial = null,
  onChange,
}: {
  initial?: PlayWay | null;
  onChange?: (next: PlayWay | null) => void;
}) {
  const [way, setWay] = useState<PlayWay | null>(initial);
  return (
    <MemoryRouter initialEntries={["/"]}>
      <PlayYourWaySection
        way={way}
        onChangeWay={(next) => {
          onChange?.(next);
          setWay(next);
        }}
      />
      <LocationProbe />
    </MemoryRouter>
  );
}

const where = () => screen.getByTestId("location").textContent;
const box = (name: RegExp) => screen.getByRole("link", { name });

/** Lets a roll finish: shuffling faces for `ROLL_MS`, then the die settles. */
async function finishRoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ROLL_MS + 50);
  });
}

/** Lets the pawn land, after which the page changes. */
async function finishHop() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PAWN_HOP_MS + 50);
  });
}

const playableCount = (way: PlayWay) =>
  gamesForWay(BHALYAM_GAMES.filter((g) => !isLocked(g)), way).length;

describe("PlayYourWaySection", () => {
  it("offers two links under one labelled group, each going to its own shelf of games", () => {
    render(<Harness />);

    expect(screen.getByRole("group", { name: /who.s around today/i })).not.toBeNull();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(box(/play together/i).getAttribute("href")).toBe("/games?c=multiplayer");
    expect(box(/play alone/i).getAttribute("href")).toBe("/games?c=solo");
    links.forEach((link) => expect(link.getAttribute("aria-current")).toBeNull());
  });

  it("keeps every box a generous touch target", () => {
    render(<Harness />);
    screen.getAllByRole("link").forEach((link) => {
      expect(link.className).toContain("min-h-[132px]");
    });
  });

  it("shows how many games each box holds before anything is chosen", () => {
    render(<Harness />);
    expect(screen.getByText(`${playableCount("friends")} games`)).not.toBeNull();
    expect(screen.getByText(`${playableCount("solo")} games`)).not.toBeNull();
  });

  it("keeps the art out of the accessibility tree", () => {
    const { container } = render(<Harness />);
    const images = [...container.querySelectorAll("img")];
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
  });

  it("never puts a space in an image source, which would silently skip the AVIF and WebP files", () => {
    const { container } = render(<Harness />);
    const sources = [...container.querySelectorAll("source")].map((s) => s.getAttribute("srcset") ?? "");
    expect(sources.length).toBeGreaterThan(0);
    sources.forEach((srcset) => expect(srcset).not.toMatch(/\s/));
  });

  describe("going to the games page", () => {
    it("takes Play alone to the Solo Play shelf, after the pawn has taken its seat", async () => {
      vi.useFakeTimers();
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);

      fireEvent.click(box(/play alone/i));

      // The pawn is in the box at once; the page waits for the hop to land.
      expect(onChange).toHaveBeenCalledWith("solo");
      expect(where()).toBe("/");
      await finishHop();
      expect(where()).toBe("/games?c=solo");
    });

    it("takes Play together to the Multiplayer shelf", async () => {
      vi.useFakeTimers();
      render(<Harness />);

      fireEvent.click(box(/play together/i));
      await finishHop();

      expect(where()).toBe("/games?c=multiplayer");
    });

    it("marks the box the pawn is in as the current one", () => {
      render(<Harness />);
      fireEvent.click(box(/play alone/i));
      expect(box(/play alone/i).getAttribute("aria-current")).toBe("true");
      expect(box(/play together/i).getAttribute("aria-current")).toBeNull();
    });

    it("still goes when the box that is already remembered is tapped", async () => {
      vi.useFakeTimers();
      render(<Harness initial="friends" />);

      fireEvent.click(box(/play together/i));
      await finishHop();

      expect(where()).toBe("/games?c=multiplayer");
    });

    it("cannot go twice from a double tap", async () => {
      vi.useFakeTimers();
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);

      fireEvent.click(box(/play alone/i));
      fireEvent.click(box(/play alone/i));
      await finishHop();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(where()).toBe("/games?c=solo");
    });

    it("can go again when the page was never torn down, as when Back is pressed during a slow load", async () => {
      vi.useFakeTimers();
      // Rendered OUTSIDE the routes, so changing the URL leaves it mounted, like a
      // games page that is still loading while the player hits Back.
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PlayYourWaySection way={null} onChangeWay={() => {}} />
          <LocationProbe />
        </MemoryRouter>,
      );

      fireEvent.click(box(/play alone/i));
      await finishHop();
      expect(where()).toBe("/games?c=solo");

      fireEvent.click(box(/play together/i));
      await finishHop();
      expect(where()).toBe("/games?c=multiplayer");
    });

    it("leaves a ctrl-click to the browser, so the box can open in a new tab", async () => {
      vi.useFakeTimers();
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);

      fireEvent.click(box(/play alone/i), { ctrlKey: true });
      await finishHop();

      expect(onChange).not.toHaveBeenCalled();
      expect(where()).toBe("/");
    });
  });

  describe("the handheld on the Play alone box", () => {
    it("is drawn inside Play alone and nowhere else", () => {
      const { container } = render(<Harness />);
      const handhelds = container.querySelectorAll("[data-handheld]");
      expect(handhelds).toHaveLength(1);
      expect(handhelds[0].closest("a")).toBe(box(/play alone/i));
    });

    it("is decoration, hidden from assistive technology", () => {
      const { container } = render(<Harness />);
      const handheld = container.querySelector("[data-handheld]");
      expect(handheld?.getAttribute("aria-hidden")).toBe("true");
      expect(handheld?.getAttribute("focusable")).toBe("false");
    });

    it("keeps its pixel snake as one segmented dash pattern the length of its route", () => {
      const { container } = render(<Harness />);
      const snake = [...container.querySelectorAll("[data-handheld] path")].find((p) => p.getAttribute("stroke-dasharray"));
      const parts = (snake?.getAttribute("stroke-dasharray") ?? "").split(" ").map(Number);
      expect(parts.length % 2).toBe(0);
      // One lap of the route: the seven segments, their joints and the long gap add up to the 160-unit path.
      expect(parts.reduce((sum, n) => sum + n, 0)).toBeCloseTo(160, 5);
    });

    it("has the snake chasing a pixel heart", () => {
      const { container } = render(<Harness />);
      // The heart is 4 rows of pixels: 2 + 5 + 3 + 1.
      expect(container.querySelectorAll("[data-handheld] [data-pixel-heart] rect")).toHaveLength(11);
    });

    it("keeps a glass of chai beside it, as decoration", () => {
      const { container } = render(<Harness />);
      const chai = container.querySelector("[data-chai]");
      expect(chai?.closest("a")).toBe(box(/play alone/i));
      expect(chai?.getAttribute("aria-hidden")).toBe("true");
    });

    it("renders without error when the box is focused, left or pointed at", () => {
      render(<Harness />);
      const alone = box(/play alone/i);
      fireEvent.focus(alone);
      fireEvent.pointerEnter(alone);
      fireEvent.pointerLeave(alone);
      fireEvent.blur(alone);
      expect(alone.getAttribute("href")).toBe("/games?c=solo");
    });
  });

  describe("the pawn", () => {
    const boxHoldingPawn = (container: HTMLElement) =>
      container.querySelector("[data-way-pawn]")?.closest("a") ?? null;

    it("waits in the caption until a way is chosen", () => {
      const { container } = render(<Harness />);
      expect(container.querySelector("[data-way-pawn]")).not.toBeNull();
      expect(boxHoldingPawn(container)).toBeNull();
    });

    it("stands in the box that was chosen", () => {
      const { container } = render(<Harness />);
      fireEvent.click(box(/play alone/i));
      expect(container.querySelectorAll("[data-way-pawn]")).toHaveLength(1);
      expect(boxHoldingPawn(container)).toBe(box(/play alone/i));
    });

    it("is already in the remembered box when the page is opened", () => {
      const { container } = render(<Harness initial="friends" />);
      expect(boxHoldingPawn(container)).toBe(box(/play together/i));
    });

    it("goes home to the caption when the choice is cleared", () => {
      const { container } = render(<StayMounted initial="solo" />);
      fireEvent.click(screen.getByRole("link", { name: /show all games/i }));
      expect(container.querySelectorAll("[data-way-pawn]")).toHaveLength(1);
      expect(boxHoldingPawn(container)).toBeNull();
    });

    it("sits in the seat saved for you at the table when Play together is chosen", () => {
      const { container } = render(<StayMounted />);
      fireEvent.click(box(/play together/i));
      expect(container.querySelector("[data-table-seat] [data-way-pawn]")).not.toBeNull();
    });

    it("sits on the cushion beside the handheld when Play alone is chosen", () => {
      const { container } = render(<StayMounted />);
      fireEvent.click(box(/play alone/i));
      const pawn = container.querySelector("[data-way-pawn]");
      expect(pawn?.closest("[data-seat]")).not.toBeNull();
      expect(pawn?.closest("[data-table-seat]")).toBeNull();
      expect(pawn?.closest("a")).toBe(box(/play alone/i));
    });
  });

  it("tells the player how many games fit once a way is remembered", async () => {
    render(<Harness initial="solo" />);
    expect(await screen.findByText(new RegExp(`${playableCount("solo")} games for one`))).not.toBeNull();
  });

  describe("Show all games", () => {
    it("is a link to the games page with every game showing", () => {
      render(<Harness initial="solo" />);
      const link = screen.getByRole("link", { name: /show all games/i });
      // No `?c=`: the games page reads that as "All Games".
      expect(link.getAttribute("href")).toBe("/games");
    });

    it("forgets the remembered way and takes the player to the games page", () => {
      const onChange = vi.fn();
      render(<StayMounted initial="solo" onChange={onChange} />);

      fireEvent.click(screen.getByRole("link", { name: /show all games/i }));

      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(where()).toBe("/games");
      expect(screen.queryByRole("link", { name: /show all games/i })).toBeNull();
    });

    it("leaves a ctrl-click to the browser and forgets nothing on this page", () => {
      const onChange = vi.fn();
      render(<StayMounted initial="friends" onChange={onChange} />);

      fireEvent.click(screen.getByRole("link", { name: /show all games/i }), { ctrlKey: true });

      expect(onChange).not.toHaveBeenCalled();
      expect(where()).toBe("/");
      expect(box(/play together/i).getAttribute("aria-current")).toBe("true");
    });

    it("is not offered when nothing is remembered", () => {
      render(<Harness />);
      expect(screen.queryByRole("link", { name: /show all games/i })).toBeNull();
    });
  });
});

describe("the table on the Play together box", () => {
  it("is drawn inside Play together and nowhere else", () => {
    const { container } = render(<Harness />);
    const scenes = container.querySelectorAll("[data-table-scene]");
    expect(scenes).toHaveLength(1);
    expect(scenes[0].closest("a")).toBe(box(/play together/i));
  });

  it("seats four friends round a die with one seat saved for you, hidden from assistive technology", () => {
    const { container } = render(<Harness />);
    const scene = container.querySelector("[data-table-scene]");
    expect(scene?.getAttribute("aria-hidden")).toBe("true");
    expect(scene?.querySelectorAll("[data-table-face]")).toHaveLength(4);
    expect(scene?.querySelectorAll("[data-table-seat]")).toHaveLength(1);
    expect(scene?.querySelectorAll("[data-die]")).toHaveLength(1);
  });

  it("draws every friend with a face the project actually ships", () => {
    const { container } = render(<Harness />);
    const sources = [...container.querySelectorAll("[data-table-face] img")].map((img) => img.getAttribute("src") ?? "");
    expect(sources).toHaveLength(4);
    sources.forEach((src) => {
      expect(src).toMatch(/^\/way-faces\/face-\d\.webp$/);
      expect(existsSync(publicFile(src)), `${src} is missing from client/public`).toBe(true);
    });
  });

  it("keeps all four faces small enough to be cheap on a phone", () => {
    const { container } = render(<Harness />);
    const sources = [...container.querySelectorAll("[data-table-face] img")].map((img) => img.getAttribute("src") ?? "");
    const total = sources.reduce((sum, src) => sum + statSync(publicFile(src)).size, 0);
    // The avatar originals are ~150 KB each; the crops are ~4 KB. A budget keeps them honest.
    expect(total).toBeLessThan(40 * 1024);
  });

  it("does not confuse its own pawns with the player's pawn", () => {
    const { container } = render(<Harness />);
    expect(container.querySelectorAll("[data-way-pawn]")).toHaveLength(1);
  });
});

describe("the die", () => {
  it("shows as many pips as its face", () => {
    ([1, 2, 3, 4, 5, 6] as const).forEach((face) => {
      const { container, unmount } = render(<Die face={face} tumbling={false} />);
      expect(container.querySelectorAll("[data-pip]")).toHaveLength(face);
      unmount();
    });
  });

  it("is decoration, hidden from assistive technology", () => {
    const { container } = render(<Die face={3} tumbling={false} />);
    expect(container.querySelector("[data-die]")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("sends even faces to Play together and odd faces to Play alone, at exactly even odds", () => {
    const faces = [1, 2, 3, 4, 5, 6];
    expect(faces.map(wayForFace)).toEqual(["solo", "friends", "solo", "friends", "solo", "friends"]);
    expect(faces.filter((f) => wayForFace(f) === "friends")).toHaveLength(3);
  });
});

describe("dealing the die", () => {
  /** A small deterministic random source, so the long runs below are repeatable. */
  function seeded(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
  }

  const dealt = (count: number, seed: number) => {
    const random = seeded(seed);
    return Array.from({ length: count }, () => wayForFace(dealFace(random)));
  };

  it("keeps the printed rule: every face dealt is a real face, even for together and odd for alone", () => {
    const random = seeded(7);
    for (let i = 0; i < 500; i += 1) {
      const face = dealFace(random);
      expect([1, 2, 3, 4, 5, 6]).toContain(face);
    }
  });

  it("is exactly 50/50 over time", () => {
    const outcomes = dealt(2000, 1);
    expect(outcomes.filter((o) => o === "friends")).toHaveLength(1000);
  });

  it("gives one of each in every pair of rolls", () => {
    const outcomes = dealt(1000, 2);
    for (let i = 0; i < outcomes.length; i += 2) {
      expect(new Set([outcomes[i], outcomes[i + 1]]).size).toBe(2);
    }
  });

  it("never gives the same answer more than twice running, where a plain fair die often gave five", () => {
    const outcomes = dealt(5000, 3);
    let longest = 1;
    let run = 1;
    for (let i = 1; i < outcomes.length; i += 1) {
      run = outcomes[i] === outcomes[i - 1] ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
    expect(longest).toBeLessThanOrEqual(2);
  });

  it("can start either way, so the first roll is not predictable", () => {
    const firsts = new Set<string>();
    for (let i = 1; i <= 40; i += 1) {
      resetDeal();
      // Spread the seeds out: a simple generator gives near-identical first values for 1, 2, 3...
      firsts.add(dealt(1, i * 1_000_003)[0]);
    }
    expect(firsts.size).toBe(2);
  });
});

describe("Roll to decide", () => {
  const rollButton = () => screen.getByRole("button", { name: /roll the die to pick for me/i });

  it("is offered while nothing is remembered, with the rule printed beside it", () => {
    render(<Harness />);
    expect(rollButton()).not.toBeNull();
    expect(screen.getByText(/even plays together, odd plays alone/i)).not.toBeNull();
  });

  it("is gone while a way is remembered, and comes back when it is cleared", () => {
    render(<StayMounted initial="solo" />);
    expect(screen.queryByRole("button", { name: /roll the die/i })).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: /show all games/i }));
    expect(rollButton()).not.toBeNull();
  });

  it("sends the pawn to Play together, and the page to the Multiplayer shelf, on an even face", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} rollFace={() => 4} />);

    fireEvent.click(rollButton());
    expect(onChange).not.toHaveBeenCalled(); // still tumbling
    await finishRoll();

    expect(onChange).toHaveBeenCalledWith("friends");
    expect(box(/play together/i).getAttribute("aria-current")).toBe("true");
    await finishHop();
    expect(where()).toBe("/games?c=multiplayer");
  });

  it("sends the pawn to Play alone, and the page to the Solo Play shelf, on an odd face", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} rollFace={() => 3} />);

    fireEvent.click(rollButton());
    await finishRoll();

    expect(onChange).toHaveBeenCalledWith("solo");
    await finishHop();
    expect(where()).toBe("/games?c=solo");
  });

  it("says it is rolling while the die is in the air", async () => {
    vi.useFakeTimers();
    render(<Harness rollFace={() => 2} />);

    fireEvent.click(rollButton());

    expect(screen.getByText("Rolling the die")).not.toBeNull();
    await finishRoll();
    await finishHop();
  });

  it("cannot choose twice from a double tap", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} rollFace={() => 6} />);

    fireEvent.click(rollButton());
    fireEvent.click(rollButton());
    await finishRoll();
    await finishHop();

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("GamesSection with a way chosen", () => {
  const renderSection = (way: PlayWay | null) =>
    render(
      <MemoryRouter>
        <GamesSection onSelect={vi.fn()} way={way} />
      </MemoryRouter>,
    );

  it("counts only the games that fit the way", () => {
    renderSection("solo");
    const fitting = playableCount("solo");
    expect(screen.getByText(new RegExp(`of ${fitting} games`))).not.toBeNull();
  });

  it("tells the player the link leads to every game, not a longer version of this list", () => {
    renderSection("friends");
    expect(screen.getByRole("link", { name: /browse every game/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /view all games/i })).toBeNull();
  });

  it("keeps the usual link when no way is chosen", () => {
    renderSection(null);
    expect(screen.getByRole("link", { name: /view all games/i })).not.toBeNull();
  });
});
