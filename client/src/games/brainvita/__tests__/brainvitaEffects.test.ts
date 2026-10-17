import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EARNED_SKINS,
  ORDER_STORAGE_KEY,
  SKINS,
  SKIN_IDS,
  SKIN_STORAGE_KEY,
  TIER_MARBLES,
  UNLOCKED_STORAGE_KEY,
  loadSkin,
  loadThemeOrder,
  loadUnlocked,
  marblesNeeded,
  parseOrder,
  parseUnlocked,
  requirementText,
  resolveSkin,
  rgba,
  saveSkin,
  saveUnlocked,
  shuffleThemes,
  skinsEarnedBy,
  type EarnedSkinId,
  type SkinId,
} from "../brainvitaSkins";
import { ARC_HEIGHT, PARTICLE_COUNT, flightKeyframes, jumpGeometry, particleAngles } from "../brainvitaJump";
import { DRAG_START_PX, SNAP_RADIUS, clampToBoard, hasDragged, holeCentre, pointerToCells, snapTarget } from "../brainvitaDrag";
import { AMBIENT_VOICES, AmbientEngine, ambientVoiceCount, resolutionChord } from "../brainvitaAmbient";
import { CENTRE_HOLE, holeAt } from "../brainvitaRules";

const hole = (row: number, col: number): number => holeAt(row, col) as number;

const LADDER: readonly EarnedSkinId[] = ["holo", "zen", "reef", "toy", "palace"];

/** A random source that walks through fixed numbers, so a shuffle can be pinned. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("skins", () => {
  beforeEach(() => localStorage.clear());

  it("has the classic wood and five earned themes, each with the same set of paint and its own name", () => {
    expect(SKIN_IDS).toHaveLength(6);
    expect(EARNED_SKINS).toHaveLength(5);
    for (const id of SKIN_IDS) expect(Object.keys(SKINS[id]).sort()).toEqual(Object.keys(SKINS.wood).sort());
    expect(new Set(SKIN_IDS.map((id) => SKINS[id].name)).size).toBe(6);
    expect(new Set(SKIN_IDS.map((id) => SKINS[id].marbleFill)).size).toBe(6);
  });

  it("gives the wooden board its palette and the glass board its glass, and the other worlds neither, because they draw their own", () => {
    for (const id of SKIN_IDS) {
      const skin = SKINS[id];
      expect(skin.board !== null, id).toBe(id === "wood");
      expect(skin.glass !== null, id).toBe(id === "holo");
    }
  });

  it("makes each world out of different things, not the same things in different colours", () => {
    const ids = [...SKIN_IDS];
    const distinct = (pick: (skin: (typeof SKINS)[SkinId]) => string) => new Set(ids.map((id) => pick(SKINS[id]))).size;
    expect(distinct((skin) => skin.surface)).toBe(6);
    expect(distinct((skin) => skin.marbleKind)).toBe(6);
    expect(distinct((skin) => skin.particleKind)).toBe(6);
    expect(distinct((skin) => skin.voice)).toBe(6);
    expect(distinct((skin) => skin.signIcon)).toBe(5);
    expect(distinct((skin) => skin.titleFont)).toBeGreaterThanOrEqual(4);
  });

  it("gives the playroom a multicoloured title and no other world one", () => {
    expect(SKINS.toy.titleLetters).not.toBeNull();
    for (const id of SKIN_IDS.filter((other) => other !== "toy")) expect(SKINS[id].titleLetters).toBeNull();
  });

  it("gives every world a title size that fits between two buttons on a 320px phone", () => {
    for (const id of SKIN_IDS) expect(SKINS[id].titleSize).toMatch(/^clamp\(/);
  });

  it("asks for 5, 4, 3, 2 and 1 marbles on the five rungs", () => {
    expect(TIER_MARBLES).toEqual([5, 4, 3, 2, 1]);
  });

  it("turns a hex colour into rgba", () => {
    expect(rgba("#ff8000", 0.5)).toBe("rgba(255, 128, 0, 0.5)");
  });

  describe("the shuffled ladder", () => {
    it("is always each of the five themes exactly once", () => {
      for (let i = 0; i < 50; i += 1) expect([...shuffleThemes()].sort()).toEqual([...EARNED_SKINS].sort());
    });

    it("follows the random numbers it is given, so it can be pinned", () => {
      expect(shuffleThemes(sequence(0, 0, 0, 0))).toEqual(["zen", "reef", "toy", "palace", "holo"]);
      expect(shuffleThemes(sequence(0.99, 0.99, 0.99, 0.99))).toEqual([...EARNED_SKINS]);
    });

    it("puts every theme on every rung for some player, so the order is not fixed for everyone", () => {
      const seen = EARNED_SKINS.map(() => new Set<string>());
      for (let i = 0; i < 600; i += 1) shuffleThemes().forEach((id, tier) => seen[tier].add(id));
      for (const rung of seen) expect(rung.size).toBe(5);
    });

    it("gives two players different ladders when their luck differs", () => {
      expect(shuffleThemes(sequence(0.1, 0.9, 0.3, 0.7))).not.toEqual(shuffleThemes(sequence(0.9, 0.1, 0.7, 0.3)));
    });

    it("reads back only a ladder that names each theme once", () => {
      expect(parseOrder(LADDER.join(","))).toEqual(LADDER);
      expect(parseOrder(null)).toBeNull();
      expect(parseOrder("")).toBeNull();
      expect(parseOrder("holo,zen,reef,toy")).toBeNull();
      expect(parseOrder("holo,holo,reef,toy,palace")).toBeNull();
      expect(parseOrder("holo,zen,reef,toy,wood")).toBeNull();
      expect(parseOrder("holo,zen,reef,toy,palace,extra")).toBeNull();
    });

    it("is chosen once on a new device and kept ever after", () => {
      const first = loadThemeOrder(sequence(0, 0, 0, 0));
      expect(localStorage.getItem(ORDER_STORAGE_KEY)).toBe(first.join(","));
      expect(loadThemeOrder(sequence(0.99))).toEqual(first);
    });

    it("replaces a damaged stored ladder instead of trusting it", () => {
      localStorage.setItem(ORDER_STORAGE_KEY, "holo,holo,holo,holo,holo");
      const fixed = loadThemeOrder();
      expect([...fixed].sort()).toEqual([...EARNED_SKINS].sort());
      expect(parseOrder(localStorage.getItem(ORDER_STORAGE_KEY))).toEqual(fixed);
    });
  });

  describe("earning themes", () => {
    it("earns the first rung at 5 marbles, and one more for each marble fewer", () => {
      expect(skinsEarnedBy({ marblesLeft: 6, usedHelp: false }, LADDER)).toEqual([]);
      expect(skinsEarnedBy({ marblesLeft: 5, usedHelp: false }, LADDER)).toEqual(["holo"]);
      expect(skinsEarnedBy({ marblesLeft: 4, usedHelp: false }, LADDER)).toEqual(["holo", "zen"]);
      expect(skinsEarnedBy({ marblesLeft: 3, usedHelp: false }, LADDER)).toEqual(["holo", "zen", "reef"]);
      expect(skinsEarnedBy({ marblesLeft: 2, usedHelp: false }, LADDER)).toEqual(["holo", "zen", "reef", "toy"]);
      expect(skinsEarnedBy({ marblesLeft: 1, usedHelp: false }, LADDER)).toEqual(LADDER);
    });

    it("earns nothing from a game that used a hint or undo, however well it ended", () => {
      expect(skinsEarnedBy({ marblesLeft: 1, usedHelp: true }, LADDER)).toEqual([]);
    });

    it("earns the themes in the order of the player's own ladder", () => {
      const mine: readonly EarnedSkinId[] = ["palace", "toy", "holo", "reef", "zen"];
      expect(skinsEarnedBy({ marblesLeft: 5, usedHelp: false }, mine)).toEqual(["palace"]);
      expect(skinsEarnedBy({ marblesLeft: 3, usedHelp: false }, mine)).toEqual(["palace", "toy", "holo"]);
    });

    it("says how many marbles each theme asks for on this player's ladder", () => {
      const mine: readonly EarnedSkinId[] = ["palace", "toy", "holo", "reef", "zen"];
      expect(marblesNeeded(mine, "palace")).toBe(5);
      expect(marblesNeeded(mine, "holo")).toBe(3);
      expect(marblesNeeded(mine, "zen")).toBe(1);
    });

    it("words the requirement for one marble, and for several, without hint or undo", () => {
      expect(requirementText(LADDER, "palace")).toBe("Finish a game with one marble left, without a hint or undo.");
      expect(requirementText(LADDER, "reef")).toBe("Finish a game with 3 or fewer marbles left, without a hint or undo.");
    });
  });

  it("always has the wood skin, and ignores anything it does not recognise", () => {
    expect(parseUnlocked(null)).toEqual(["wood"]);
    expect(parseUnlocked("holo")).toEqual(["wood", "holo"]);
    expect(parseUnlocked("holo, gold,  ,wood,toy,holo")).toEqual(["wood", "holo", "toy"]);
  });

  it("will not show a skin that has not been earned, even if storage says so", () => {
    expect(resolveSkin("toy", ["wood"])).toBe("wood");
    expect(resolveSkin("toy", ["wood", "toy"])).toBe("toy");
    expect(resolveSkin("nonsense", ["wood", "holo"])).toBe("wood");
    expect(resolveSkin(null, ["wood", "holo"])).toBe("wood");
  });

  it("remembers the unlocks and the choice across loads", () => {
    saveUnlocked(["wood", "holo", "palace"]);
    saveSkin("palace");
    expect(localStorage.getItem(UNLOCKED_STORAGE_KEY)).toBe("wood,holo,palace");
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe("palace");
    expect(loadUnlocked()).toEqual(["wood", "holo", "palace"]);
    expect(loadSkin()).toBe("palace");
  });

  it("falls back to wood when a hand-edited choice was never earned", () => {
    localStorage.setItem(SKIN_STORAGE_KEY, "reef");
    expect(loadSkin()).toBe("wood");
  });

  it("never lets unavailable storage break playing", () => {
    const failing = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const failingSet = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadSkin()).toBe("wood");
    expect([...loadThemeOrder()].sort()).toEqual([...EARNED_SKINS].sort());
    expect(() => saveSkin("wood")).not.toThrow();
    expect(() => saveUnlocked(["wood"])).not.toThrow();
    failing.mockRestore();
    failingSet.mockRestore();
  });
});

describe("jumpGeometry and flightKeyframes", () => {
  it("measures a jump in hole widths from cell centre to cell centre", () => {
    const geometry = jumpGeometry({ from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE });
    expect(geometry.from).toEqual({ x: 3.5, y: 1.5 });
    expect(geometry.to).toEqual({ x: 3.5, y: 3.5 });
    expect(geometry.over).toEqual({ x: 3.5, y: 2.5 });
    expect(geometry.dx).toBe(0);
    expect(geometry.dy).toBe(2);
  });

  it("starts at the marble's own place, ends exactly on the landing hole, and rises in between", () => {
    const frames = flightKeyframes({ from: hole(3, 1), over: hole(3, 2), to: hole(3, 3) });
    expect(frames[0]).toMatchObject({ x: 0, y: 0, offset: 0 });
    const last = frames[frames.length - 1];
    expect(last.x).toBeCloseTo(2, 10);
    expect(last.y).toBeCloseTo(0, 10);
    expect(last.offset).toBe(1);
    const middle = frames[Math.floor(frames.length / 2)];
    expect(middle.y).toBeCloseTo(-ARC_HEIGHT, 5);
    expect(Math.min(...frames.map((frame) => frame.y))).toBeGreaterThanOrEqual(-ARC_HEIGHT - 1e-9);
  });

  it("enlarges the marble a little at the top of the arc and settles it back", () => {
    const frames = flightKeyframes({ from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE });
    expect(frames[0].scale).toBe(1);
    expect(frames[frames.length - 1].scale).toBeCloseTo(1, 10);
    expect(Math.max(...frames.map((frame) => frame.scale))).toBeGreaterThan(1);
  });

  it("spreads the particles evenly round the captured marble, and differently for the next jump", () => {
    const first = particleAngles(PARTICLE_COUNT, 0);
    expect(first).toHaveLength(PARTICLE_COUNT);
    expect(new Set(first.map((a) => a.toFixed(6))).size).toBe(PARTICLE_COUNT);
    expect(particleAngles(PARTICLE_COUNT, 3)[0]).not.toBeCloseTo(first[0], 6);
  });
});

describe("dragging", () => {
  const box = { left: 100, top: 50, width: 350, height: 350 };

  it("reads the pointer in hole widths from the pit area's corner", () => {
    expect(pointerToCells(box, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(pointerToCells(box, 450, 400)).toEqual({ x: 7, y: 7 });
    expect(pointerToCells(box, 275, 225)).toEqual({ x: 3.5, y: 3.5 });
  });

  it("treats a small movement as a tap and a larger one as a drag", () => {
    expect(hasDragged(10, 10, 10 + DRAG_START_PX - 1, 10)).toBe(false);
    expect(hasDragged(10, 10, 10, 10 + DRAG_START_PX)).toBe(true);
  });

  it("pulls a marble into the nearest landing hole once it is close, and into none when it is over wood", () => {
    const targets = [hole(3, 3), hole(1, 3)];
    expect(snapTarget(holeCentre(hole(3, 3)), targets)).toBe(hole(3, 3));
    expect(snapTarget({ x: 3.5 + SNAP_RADIUS - 0.05, y: 3.5 }, targets)).toBe(hole(3, 3));
    expect(snapTarget({ x: 3.5 + SNAP_RADIUS + 0.1, y: 3.5 }, targets)).toBeNull();
    expect(snapTarget({ x: 0.2, y: 6.8 }, targets)).toBeNull();
  });

  it("prefers the closer of two landing holes", () => {
    const targets = [hole(3, 1), hole(3, 3)];
    expect(snapTarget({ x: 2.6, y: 3.5 }, targets, 2)).toBe(hole(3, 3));
    expect(snapTarget({ x: 1.9, y: 3.5 }, targets, 2)).toBe(hole(3, 1));
  });

  it("snaps to nothing when there is nowhere to land", () => {
    expect(snapTarget({ x: 3.5, y: 3.5 }, [])).toBeNull();
  });

  it("keeps a dragged marble on the board", () => {
    expect(clampToBoard({ x: -3, y: 12 })).toEqual({ x: 0, y: 7 });
    expect(clampToBoard({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
  });
});

describe("ambient sound", () => {
  it("keeps all eight voices on a full board and one on the last marble", () => {
    expect(ambientVoiceCount(32)).toBe(AMBIENT_VOICES.length);
    expect(ambientVoiceCount(1)).toBe(1);
  });

  it("only ever loses voices as marbles go, never gains them", () => {
    let previous = ambientVoiceCount(32);
    for (let marbles = 31; marbles >= 1; marbles -= 1) {
      const now = ambientVoiceCount(marbles);
      expect(now).toBeLessThanOrEqual(previous);
      expect(now).toBeGreaterThanOrEqual(1);
      previous = now;
    }
  });

  it("resolves a perfect game to a bright chord and anything else to an open one", () => {
    expect(resolutionChord(true).frequencies.length).toBeGreaterThan(resolutionChord(false).frequencies.length);
    expect(resolutionChord(true).type).not.toBe(resolutionChord(false).type);
  });

  describe("engine", () => {
    interface FakeParam {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      setTargetAtTime: ReturnType<typeof vi.fn>;
      cancelScheduledValues: ReturnType<typeof vi.fn>;
    }
    const makeParam = (): FakeParam => ({
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    });
    let gains: { gain: FakeParam; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[];
    let oscillators: { type: string; frequency: FakeParam; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[];
    let ctx: AudioContext;

    beforeEach(() => {
      vi.useFakeTimers();
      gains = [];
      oscillators = [];
      ctx = {
        currentTime: 10,
        destination: {},
        createGain: () => {
          const node = { gain: makeParam(), connect: vi.fn(), disconnect: vi.fn() };
          gains.push(node);
          return node;
        },
        createOscillator: () => {
          const node = { type: "sine", frequency: makeParam(), connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() };
          oscillators.push(node);
          return node;
        },
      } as unknown as AudioContext;
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    /** The level each voice was last told to head for, in voice order. */
    const voiceTargets = (): number[] =>
      gains.slice(1, 1 + AMBIENT_VOICES.length).map((node) => {
        const calls = node.gain.setTargetAtTime.mock.calls;
        return calls[calls.length - 1][0] as number;
      });

    it("builds a master and two oscillators per voice on start", () => {
      const engine = new AmbientEngine(ctx);
      engine.start(32);
      expect(engine.isRunning).toBe(true);
      expect(gains).toHaveLength(1 + AMBIENT_VOICES.length);
      expect(oscillators).toHaveLength(AMBIENT_VOICES.length * 2);
      expect(oscillators.every((node) => node.start.mock.calls.length === 1)).toBe(true);
    });

    it("sounds every voice on a full board", () => {
      new AmbientEngine(ctx).start(32);
      expect(voiceTargets().every((level) => level > 0)).toBe(true);
    });

    it("fades the highest voices first as marbles go, leaving the deep ones", () => {
      const engine = new AmbientEngine(ctx);
      engine.start(32);
      engine.update(9);
      const levels = voiceTargets();
      expect(levels.slice(0, ambientVoiceCount(9)).every((level) => level > 0)).toBe(true);
      expect(levels.slice(ambientVoiceCount(9)).every((level) => level === 0)).toBe(true);
      engine.update(1);
      expect(voiceTargets().filter((level) => level > 0)).toHaveLength(1);
      expect(voiceTargets()[0]).toBeGreaterThan(0);
    });

    it("does not build a second drone when started twice", () => {
      const engine = new AmbientEngine(ctx);
      engine.start(32);
      engine.start(20);
      expect(oscillators).toHaveLength(AMBIENT_VOICES.length * 2);
    });

    it("resolves into a chord and then releases everything", () => {
      const engine = new AmbientEngine(ctx);
      engine.start(1);
      const before = oscillators.length;
      engine.resolve(true);
      expect(oscillators.length - before).toBe(resolutionChord(true).frequencies.length);
      vi.advanceTimersByTime(5000);
      expect(engine.isRunning).toBe(false);
      expect(oscillators.slice(0, AMBIENT_VOICES.length * 2).every((node) => node.stop.mock.calls.length >= 1)).toBe(true);
    });

    it("fades out and releases on stop", () => {
      const engine = new AmbientEngine(ctx);
      engine.start(20);
      engine.stop();
      vi.advanceTimersByTime(1000);
      expect(engine.isRunning).toBe(false);
    });

    it("ignores updates and resolves when it was never started", () => {
      const engine = new AmbientEngine(ctx);
      expect(() => {
        engine.update(5);
        engine.resolve(false);
        engine.stop();
      }).not.toThrow();
      expect(oscillators).toHaveLength(0);
    });

    it("survives an audio graph that throws", () => {
      const broken = { currentTime: 0, destination: {}, createGain: () => { throw new Error("no audio"); }, createOscillator: () => { throw new Error("no audio"); } } as unknown as AudioContext;
      const engine = new AmbientEngine(broken);
      expect(() => engine.start(32)).not.toThrow();
      expect(engine.isRunning).toBe(false);
    });
  });
});
