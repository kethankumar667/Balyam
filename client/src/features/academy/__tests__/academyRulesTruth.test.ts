import { describe, expect, it } from "vitest";
import { GAME_LIMITS } from "@shared/catalog";
import {
  GAME_ACADEMY_CATALOG,
  getAllAcademySpecs,
  getGameAcademy,
  hasGameAcademy,
} from "../data";
import type { GameAcademySpec, InteractiveSandboxKind } from "../types/academy";

/**
 * The academy is an in-app tutorial, so a wrong rule in it is a defect. These
 * tests pin the data to the engines and boards it describes. Each assertion
 * names the source it was verified against.
 */

/** Academy slugs whose catalog key differs (Brick Blocks is the Block Blast spec). */
const CATALOG_KEY_BY_ACADEMY_SLUG: Readonly<Record<string, string>> = {
  brickblocks: "blockblast",
};

/**
 * Road Rash is served by the client-only Brick Racer page (App.tsx `/roadrash`)
 * and has no server engine, so GAME_LIMITS' 1-4 is a seat count nothing plays.
 * The academy stays truthful ("Solo Play") instead of advertising 1-4 players.
 */
const SOLO_ONLY_DESPITE_CATALOG: ReadonlySet<string> = new Set(["roadrash"]);

/** The sandboxes SandboxRenderer can actually draw (carrom/chess/star/bingo have none). */
const REAL_SANDBOX_KINDS: ReadonlySet<InteractiveSandboxKind> = new Set<InteractiveSandboxKind>([
  "dice-roll",
  "card-meld",
  "uno-challenge",
  "cricket-duel",
  "quantum-grid",
  "dots-chain",
  "word-chain",
  "sudoku-scanner",
  "retro-mini",
]);

function distinctSpecs(): GameAcademySpec[] {
  return [...new Set(Object.values(GAME_ACADEMY_CATALOG))];
}

function specOf(slug: string): GameAcademySpec {
  const spec = getGameAcademy(slug);
  if (!spec) throw new Error(`no academy spec for ${slug}`);
  return spec;
}

function textOf(spec: GameAcademySpec): string {
  return JSON.stringify(spec);
}

function keyLabels(spec: GameAcademySpec): string[] {
  return (spec.keybindings ?? []).map((binding) => binding.key);
}

function playerNumbers(players: string): number[] {
  return (players.match(/\d+/g) ?? []).map(Number);
}

describe("academy player counts match shared/catalog GAME_LIMITS", () => {
  const checked: string[] = [];

  for (const spec of distinctSpecs()) {
    const catalogKey = CATALOG_KEY_BY_ACADEMY_SLUG[spec.slug] ?? spec.slug;
    const limits = (GAME_LIMITS as Record<string, { min: number; max: number } | undefined>)[catalogKey];
    if (!limits || SOLO_ONLY_DESPITE_CATALOG.has(spec.slug)) continue;
    checked.push(spec.slug);

    it(`${spec.slug}: "${spec.players}" covers ${limits.min}-${limits.max}`, () => {
      const numbers = playerNumbers(spec.players);
      if (limits.max === 1) {
        // A one-seat game reads "Solo Play" or "1 Player".
        expect(/solo/i.test(spec.players) || numbers.includes(1)).toBe(true);
        return;
      }
      expect(numbers[0]).toBe(limits.min);
      expect(numbers[numbers.length - 1]).toBe(limits.max);
    });
  }

  it("actually checks the catalog-backed games (guards against a silently empty loop)", () => {
    expect(checked.length).toBeGreaterThanOrEqual(18);
    for (const slug of ["ludo", "snl", "uno", "dotsboxes", "wordbuilding", "stargame", "bingo", "tambola",
      "namesplaceanimal", "carrom", "spacewar", "brickblocks"]) {
      expect(checked, slug).toContain(slug);
    }
  });

  it("keeps the exempted solo games solo", () => {
    for (const slug of SOLO_ONLY_DESPITE_CATALOG) {
      expect(specOf(slug).players).toMatch(/solo/i);
    }
  });
});

describe("sandbox assignment", () => {
  it("only uses sandbox kinds the renderer can draw", () => {
    for (const spec of distinctSpecs()) {
      for (const slide of spec.slides) {
        if (slide.sandboxKind === undefined) continue;
        expect(REAL_SANDBOX_KINDS.has(slide.sandboxKind), `${spec.slug}/${slide.id}: ${slide.sandboxKind}`).toBe(true);
      }
    }
  });

  it("does not leave sandboxConfig on a slide without a sandboxKind", () => {
    for (const spec of distinctSpecs()) {
      for (const slide of spec.slides) {
        if (slide.sandboxKind === undefined) {
          expect(slide.sandboxConfig, `${spec.slug}/${slide.id}`).toBeUndefined();
        }
      }
    }
  });

  it("shows the pixel-snake demo only on Snake slides", () => {
    for (const spec of distinctSpecs()) {
      const usesRetroMini = spec.slides.some((slide) => slide.sandboxKind === "retro-mini");
      if (spec.slug === "snake") {
        expect(usesRetroMini).toBe(true);
      } else {
        expect(usesRetroMini, spec.slug).toBe(false);
      }
    }
  });

  it("keeps the Ludo yard/start demo off Snakes & Ladders and the capture-lock slide", () => {
    for (const slide of specOf("snl").slides) {
      expect(slide.sandboxKind, `snl/${slide.id}`).not.toBe("dice-roll");
    }
    const captureSlide = specOf("ludo").slides.find((slide) => slide.id === "mandatory_capture");
    expect(captureSlide).toBeDefined();
    expect(captureSlide?.sandboxKind).toBeUndefined();
  });
});

describe("catalog lookups", () => {
  it("returns each distinct spec exactly once from getAllAcademySpecs", () => {
    const all = getAllAcademySpecs();
    const slugs = all.map((spec) => spec.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(all.length).toBe(distinctSpecs().length);
  });

  it("preserves catalog order when de-duplicating", () => {
    const expected = distinctSpecs().map((spec) => spec.slug);
    expect(getAllAcademySpecs().map((spec) => spec.slug)).toEqual(expected);
  });

  it("still resolves the blockblast alias", () => {
    expect(hasGameAcademy("blockblast")).toBe(true);
    expect(hasGameAcademy("BlockBlast")).toBe(true);
    expect(getGameAcademy("blockblast")).toBe(getGameAcademy("brickblocks"));
    expect(getGameAcademy("blockblast")?.slug).toBe("brickblocks");
  });

  it("gives every slide of a spec a unique, typo-free id", () => {
    for (const spec of distinctSpecs()) {
      const ids = spec.slides.map((slide) => slide.id);
      expect(new Set(ids).size, spec.slug).toBe(ids.length);
      for (const id of ids) expect(id, `${spec.slug}/${id}`).not.toMatch(/unloack/);
    }
    expect(specOf("ludo").slides.map((slide) => slide.id)).toContain("unlock_rule");
  });
});

describe("rules match the engines", () => {
  it("Ludo: R rolls (useLudoBoard), tokens 1-4, track size and Mandatory Capture are qualified", () => {
    const ludo = specOf("ludo");
    const rollKey = (ludo.keybindings ?? []).find((binding) => /roll/i.test(binding.description));
    expect(rollKey?.key).toBe("R");
    expect(keyLabels(ludo).some((key) => /space|enter/i.test(key))).toBe(false);
    // shared/ludo-rules.ts: 52-cell track for 2-4 players, 13 cells per seat for 5-8.
    const objective = ludo.slides[0];
    expect(objective.summary).toMatch(/52/);
    expect(objective.summary).toMatch(/13/);
    // Mandatory Capture is a room option (DEFAULT_LUDO_OPTIONS.mandatoryCapture: true).
    const captureSlide = ludo.slides.find((slide) => slide.id === "mandatory_capture");
    expect(captureSlide?.summary).toMatch(/room option|room setting|host/i);
    expect(textOf(ludo)).toMatch(/room option|room setting/i);
  });

  it("Snakes & Ladders: no claim about a fixed snake square (boards differ by difficulty)", () => {
    const snl = specOf("snl");
    expect(textOf(snl)).not.toMatch(/cell 98|cell 28|apex serpent/i);
    // SnlEngine has no keyboard shortcut; the Roll button is the only control.
    expect(snl.keybindings).toBeUndefined();
  });

  it("Dots & Boxes: only pointer input exists (no arrow-key handler)", () => {
    const dots = specOf("dotsboxes");
    expect(keyLabels(dots).some((key) => /arrow/i.test(key))).toBe(false);
  });

  it("UNO: D draws, P passes, U calls UNO (UnoBoardDesktop keydown)", () => {
    const uno = specOf("uno");
    const byDescription = (pattern: RegExp) => (uno.keybindings ?? []).find((b) => pattern.test(b.description));
    expect(byDescription(/draw/i)?.key).toBe("D");
    expect(byDescription(/uno/i)?.key).toBe("U");
    expect(keyLabels(uno)).not.toContain("Space");
  });

  it("Rock Paper Scissors: a tie is only a replayed round, never a sudden-death tiebreaker", () => {
    const rps = specOf("rps");
    expect(textOf(rps)).not.toMatch(/sudden/i);
    expect(textOf(rps)).toMatch(/10/);
  });

  it("Name Place Animal: 10 valid / 5 with clue, 30s default timer, no unique-answer scoring", () => {
    const npat = specOf("namesplaceanimal");
    const text = textOf(npat);
    expect(text).not.toMatch(/60[- ]second/i);
    expect(text).not.toMatch(/unique|shared answer/i);
    expect(text).toMatch(/30/);
    expect(text).toMatch(/clue/i);
  });

  it("Tic Tac Toe: describes both Quantum and Classic modes, with no invented features", () => {
    const ttt = specOf("tictactoe");
    const text = textOf(ttt);
    expect(text).not.toMatch(/lane shift/i);
    expect(text).not.toMatch(/laser/i);
    expect(text).not.toMatch(/mathematically impossible/i);
    expect(text).toMatch(/classic/i);
    expect(text).toMatch(/quantum/i);
    expect(text).toMatch(/draw/i);
  });

  it("Space War: solo wave shooter with no Hyperspace and the real X special key", () => {
    const sw = specOf("spacewar");
    expect(textOf(sw)).not.toMatch(/hyperspace/i);
    expect(textOf(sw)).not.toMatch(/gravity|photon torpedo/i);
    expect(keyLabels(sw)).toContain("X");
    expect(sw.players).toMatch(/solo/i);
  });

  it("Tambola: only the prizes TambolaEngine can award (no Four Corners)", () => {
    expect(textOf(specOf("tambola"))).not.toMatch(/corner/i);
  });

  it("Word Building: one scoring word per move and no arrow-key navigation", () => {
    const wb = specOf("wordbuilding");
    expect(keyLabels(wb).some((key) => /arrow/i.test(key))).toBe(false);
    expect(textOf(wb)).not.toMatch(/both words score/i);
  });

  it("Star Game: only a four-of-a-kind holder can slap STAR; hand-stack scores 10 down to a 1-point floor", () => {
    const star = specOf("stargame");
    const text = textOf(star);
    expect(text).not.toMatch(/even if you don't have/i);
    // A bare "0 pts" would mean a zero-point floor; "10 pts" (the STAR winner) is correct.
    expect(text).not.toMatch(/(?<!\d)0 pts/);
  });

  it("Rummy: S sorts the melds and Space discards (RummyBoardDesktop keydown)", () => {
    const rummy = specOf("rummy");
    const sortKey = (rummy.keybindings ?? []).find((binding) => binding.key === "S");
    expect(sortKey?.description).toMatch(/sort/i);
    expect(sortKey?.description).not.toMatch(/suit/i);
  });

  it("Road Rash is the Brick Racer: three lanes, no melee or pseudo-3D claims", () => {
    const text = textOf(specOf("roadrash"));
    expect(text).not.toMatch(/kick|punch|melee|pseudo-3D|rival/i);
    expect(text).toMatch(/lane/i);
  });

  it("Breakout: no ceiling-trap or edge-angle claims the collision engine does not implement", () => {
    const text = textOf(specOf("breakout"));
    expect(text).not.toMatch(/ceiling|acute/i);
  });

  it("Snake: walls are only lethal in solid-wall mode (default is wrap)", () => {
    const snake = specOf("snake");
    expect(snake.slides[0].keyRule).toMatch(/solid|wrap/i);
  });

  it("Carrom is a two-player game and the striker foul is a 1-point penalty", () => {
    const carrom = specOf("carrom");
    expect(carrom.players).toBe("2 Players");
    expect(textOf(carrom)).not.toMatch(/2.4 Players/);
  });
});
