import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOLO_UNLOCK_MAX_MARBLES,
  SKINS,
  SKIN_STORAGE_KEY,
  TILT_STORAGE_KEY,
  UNLOCKED_STORAGE_KEY,
  earnsHolo,
  loadSkin,
  loadTilt,
  loadUnlocked,
  parseUnlocked,
  resolveSkin,
  saveSkin,
  saveTilt,
  saveUnlocked,
} from "../brainvitaSkins";
import { ARC_HEIGHT, PARTICLE_COUNT, flightKeyframes, jumpGeometry, particleAngles } from "../brainvitaJump";
import { DRAG_START_PX, SNAP_RADIUS, clampToBoard, hasDragged, holeCentre, pointerToCells, snapTarget } from "../brainvitaDrag";
import { AMBIENT_VOICES, AmbientEngine, ambientVoiceCount, resolutionChord } from "../brainvitaAmbient";
import { CENTRE_HOLE, holeAt } from "../brainvitaRules";

const hole = (row: number, col: number): number => holeAt(row, col) as number;

describe("skins", () => {
  beforeEach(() => localStorage.clear());

  it("gives every skin the same set of paint, and a way to earn the one that is not free", () => {
    expect(Object.keys(SKINS.wood).sort()).toEqual(Object.keys(SKINS.holo).sort());
    expect(SKINS.wood.unlockHint).toBeNull();
    expect(SKINS.holo.unlockHint).toContain(String(HOLO_UNLOCK_MAX_MARBLES));
  });

  it("earns the holo table only from an unassisted game with few enough marbles left", () => {
    expect(earnsHolo({ marblesLeft: 1, usedHelp: false })).toBe(true);
    expect(earnsHolo({ marblesLeft: HOLO_UNLOCK_MAX_MARBLES, usedHelp: false })).toBe(true);
    expect(earnsHolo({ marblesLeft: HOLO_UNLOCK_MAX_MARBLES + 1, usedHelp: false })).toBe(false);
    expect(earnsHolo({ marblesLeft: 1, usedHelp: true })).toBe(false);
  });

  it("always has the wood skin, and ignores anything it does not recognise", () => {
    expect(parseUnlocked(null)).toEqual(["wood"]);
    expect(parseUnlocked("holo")).toEqual(["wood", "holo"]);
    expect(parseUnlocked("holo, gold,  ,wood,holo")).toEqual(["wood", "holo"]);
  });

  it("will not show a skin that has not been earned, even if storage says so", () => {
    expect(resolveSkin("holo", ["wood"])).toBe("wood");
    expect(resolveSkin("holo", ["wood", "holo"])).toBe("holo");
    expect(resolveSkin("nonsense", ["wood", "holo"])).toBe("wood");
    expect(resolveSkin(null, ["wood", "holo"])).toBe("wood");
  });

  it("remembers the unlock and the choice across loads", () => {
    saveUnlocked(["wood", "holo"]);
    saveSkin("holo");
    expect(localStorage.getItem(UNLOCKED_STORAGE_KEY)).toBe("wood,holo");
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe("holo");
    expect(loadUnlocked()).toEqual(["wood", "holo"]);
    expect(loadSkin()).toBe("holo");
  });

  it("falls back to wood when a hand-edited choice was never earned", () => {
    localStorage.setItem(SKIN_STORAGE_KEY, "holo");
    expect(loadSkin()).toBe("wood");
  });

  it("remembers the tilt choice, off by default", () => {
    expect(loadTilt()).toBe(false);
    saveTilt(true);
    expect(localStorage.getItem(TILT_STORAGE_KEY)).toBe("true");
    expect(loadTilt()).toBe(true);
  });

  it("never lets unavailable storage break playing", () => {
    const failing = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const failingSet = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadSkin()).toBe("wood");
    expect(loadTilt()).toBe(false);
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
