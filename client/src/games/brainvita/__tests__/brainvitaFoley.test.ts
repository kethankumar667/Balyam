import { describe, expect, it, vi } from "vitest";
import { CAPTURE_AT, LANDING_AT, jumpSound, pickSound, playStrikes, refuseSound, stuckSound, strikeLength, winSound, type Strike } from "../brainvitaFoley";
import { JUMP_DURATION_MS } from "../brainvitaJump";

/** A small deterministic random source, so a recipe can be pinned and compared. */
const seeded = (seed: number) => {
  let state = seed >>> 0;
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const everyRecipe: [string, (random: () => number) => Strike[]][] = [
  ["pick", pickSound],
  ["jump", jumpSound],
  ["refuse", refuseSound],
  ["win", winSound],
  ["stuck", stuckSound],
];

const loudest = (strike: Strike): number => Math.max(...strike.overtones.map((o) => o.frequency));
const lowest = (strike: Strike): number => Math.min(...strike.overtones.map((o) => o.frequency));

describe.each(everyRecipe)("the %s sound", (_name, recipe) => {
  it("is made of audible, finite strikes in the order they happen", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const strikes = recipe(seeded(seed));
      expect(strikes.length).toBeGreaterThan(0);
      for (const strike of strikes) {
        expect(strike.at).toBeGreaterThanOrEqual(0);
        expect(strike.level).toBeGreaterThan(0);
        expect(strike.level).toBeLessThanOrEqual(1);
        for (const overtone of strike.overtones) {
          expect(Number.isFinite(overtone.frequency)).toBe(true);
          expect(overtone.frequency).toBeGreaterThan(20);
          expect(overtone.frequency).toBeLessThan(20000);
          expect(overtone.decay).toBeGreaterThan(0);
          expect(overtone.gain).toBeGreaterThan(0);
        }
      }
    }
  });

  it("is the same sound for the same random numbers, and a slightly different one for others", () => {
    expect(recipe(seeded(7))).toEqual(recipe(seeded(7)));
    expect(recipe(seeded(7))).not.toEqual(recipe(seeded(8)));
  });

  it("never lasts so long it would get in the way of the next move", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const end = Math.max(...recipe(seeded(seed)).map((strike) => strike.at + strikeLength(strike)));
      expect(end).toBeLessThan(2);
    }
  });
});

describe("pickSound", () => {
  it("is a high glass tick followed by a low wooden tap", () => {
    const [tick, tap] = pickSound(seeded(3));
    expect(lowest(tick)).toBeGreaterThan(2500);
    expect(loudest(tap)).toBeLessThan(700);
    expect(tap.at).toBeGreaterThan(tick.at);
    expect(tap.level).toBeLessThan(tick.level);
  });

  it("varies its pitch a few percent from play to play, never wildly", () => {
    const firsts = Array.from({ length: 100 }, (_, i) => pickSound(seeded(i + 1))[0].overtones[0].frequency);
    expect(Math.min(...firsts)).toBeGreaterThanOrEqual(3100 * 0.95 - 1e-6);
    expect(Math.max(...firsts)).toBeLessThanOrEqual(3100 * 1.05 + 1e-6);
    expect(new Set(firsts.map((f) => f.toFixed(2))).size).toBeGreaterThan(50);
  });
});

describe("jumpSound", () => {
  const sound = (seed = 5) => jumpSound(seeded(seed));

  it("rolls, then clinks, then lands, then settles, in that order", () => {
    const strikes = sound();
    const ats = strikes.map((strike) => strike.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    expect(strikes).toHaveLength(6);
    expect(strikes[0].overtones).toHaveLength(0);
    expect(strikes[0].contact?.sweepTo).toBeGreaterThan(strikes[0].contact?.frequency ?? Infinity);
  });

  it("clinks when the marble passes over its neighbour, well before it lands", () => {
    const [, clink, landing] = sound();
    expect(clink.at).toBeGreaterThan(CAPTURE_AT * 0.89);
    expect(clink.at).toBeLessThan(CAPTURE_AT * 1.11);
    expect(clink.at).toBeLessThan(landing.at);
    expect(lowest(clink)).toBeGreaterThan(2000);
  });

  it("lands as the flight on screen ends, so the sound and the picture agree", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const landing = jumpSound(seeded(seed))[2];
      expect(landing.at).toBeGreaterThan(LANDING_AT * 0.94);
      expect(landing.at).toBeLessThan(LANDING_AT * 1.06);
      expect(landing.at).toBeLessThanOrEqual(JUMP_DURATION_MS / 1000);
    }
  });

  it("lands with wood's low body under glass's ring", () => {
    const landing = sound()[2];
    expect(lowest(landing)).toBeLessThan(500);
    expect(loudest(landing)).toBeGreaterThan(3000);
  });

  it("settles with three bounces that come quieter and higher each time", () => {
    const [, , landing, ...bounces] = sound();
    expect(bounces).toHaveLength(3);
    let previous = landing;
    for (const bounce of bounces) {
      expect(bounce.at).toBeGreaterThan(previous.at);
      expect(bounce.level).toBeLessThan(previous.level);
      expect(lowest(bounce)).toBeGreaterThan(lowest(previous) * 0.97);
      expect(bounce.at - previous.at).toBeGreaterThan(0.02);
      expect(bounce.at - previous.at).toBeLessThan(0.08);
      previous = bounce;
    }
  });

  it("is not the same twice in a row", () => {
    expect(sound(1)[2].level).not.toBe(sound(2)[2].level);
  });
});

describe("refuseSound", () => {
  it("is dull: low wood, a low-pass contact, nothing bright in it", () => {
    const [knock] = refuseSound(seeded(2));
    expect(loudest(knock)).toBeLessThan(800);
    expect(knock.contact?.type).toBe("lowpass");
  });
});

describe("winSound", () => {
  it("climbs four wooden notes and ends on a glass shimmer", () => {
    const strikes = winSound(seeded(4));
    const notes = strikes.slice(0, 4);
    const fundamentals = notes.map(lowest);
    expect(fundamentals).toEqual([...fundamentals].sort((a, b) => a - b));
    expect(new Set(fundamentals.map((f) => Math.round(f))).size).toBe(4);
    const shimmer = strikes[4];
    expect(shimmer.at).toBeGreaterThan(notes[3].at);
    expect(lowest(shimmer)).toBeGreaterThan(2000);
  });

  it("rings its notes like bars, with overtones in the ratios a bar makes", () => {
    const [first] = winSound(seeded(4));
    const ratios = first.overtones.map((o) => o.frequency / first.overtones[0].frequency);
    expect(ratios[1]).toBeCloseTo(4, 1);
    expect(ratios[2]).toBeCloseTo(9.9, 1);
  });
});

describe("stuckSound", () => {
  it("is two low knocks, the second lower", () => {
    const [first, second] = stuckSound(seeded(9));
    expect(first.at).toBeLessThan(second.at);
    expect(lowest(second)).toBeLessThan(lowest(first));
    expect(loudest(first)).toBeLessThan(1000);
  });
});

describe("playStrikes", () => {
  interface Param {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  }
  const param = (): Param => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

  const makeContext = () => {
    const made = {
      gains: [] as { gain: Param; connect: ReturnType<typeof vi.fn> }[],
      oscillators: [] as { frequency: Param; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; type: string }[],
      sources: [] as { buffer: unknown; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[],
      filters: [] as { type: string; frequency: Param; Q: Param; connect: ReturnType<typeof vi.fn> }[],
      buffers: 0,
    };
    const ctx = {
      currentTime: 4,
      sampleRate: 8000,
      destination: {},
      createGain: () => {
        const node = { gain: param(), connect: vi.fn() };
        made.gains.push(node);
        return node;
      },
      createOscillator: () => {
        const node = { type: "", frequency: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        made.oscillators.push(node);
        return node;
      },
      createBuffer: (_channels: number, length: number) => {
        made.buffers += 1;
        return { getChannelData: () => new Float32Array(length) };
      },
      createBufferSource: () => {
        const node = { buffer: null as unknown, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        made.sources.push(node);
        return node;
      },
      createBiquadFilter: () => {
        const node = { type: "", frequency: param(), Q: param(), connect: vi.fn() };
        made.filters.push(node);
        return node;
      },
    } as unknown as AudioContext;
    return { ctx, made };
  };

  const strike = (overrides: Partial<Strike> = {}): Strike => ({
    at: 0.1,
    level: 0.5,
    overtones: [
      { frequency: 1000, decay: 0.05, gain: 0.6 },
      { frequency: 2000, decay: 0.03, gain: 0.4 },
    ],
    contact: { frequency: 3000, q: 1, decay: 0.01, gain: 0.5 },
    ...overrides,
  });

  it("builds one oscillator per overtone and one noise burst per contact", () => {
    const { ctx, made } = makeContext();
    playStrikes(ctx, [strike(), strike({ contact: null })]);
    expect(made.oscillators).toHaveLength(4);
    expect(made.sources).toHaveLength(1);
    expect(made.filters).toHaveLength(1);
  });

  it("starts each strike when it is due, and stops every oscillator after it has died away", () => {
    const { ctx, made } = makeContext();
    playStrikes(ctx, [strike({ at: 0.25 })]);
    for (const oscillator of made.oscillators) {
      const startAt = oscillator.start.mock.calls[0][0] as number;
      const stopAt = oscillator.stop.mock.calls[0][0] as number;
      expect(startAt).toBeCloseTo(4.25, 10);
      expect(stopAt).toBeGreaterThan(startAt);
    }
  });

  it("scales the strike's loudness by the volume asked for", () => {
    const { ctx, made } = makeContext();
    playStrikes(ctx, [strike({ level: 0.5 })], 0.5);
    expect(made.gains[0].gain.setValueAtTime.mock.calls[0][0]).toBeCloseTo(0.25, 10);
  });

  it("makes the noise buffer once per audio context, however many contacts there are", () => {
    const { ctx, made } = makeContext();
    playStrikes(ctx, [strike(), strike(), strike()]);
    playStrikes(ctx, [strike()]);
    expect(made.buffers).toBe(1);
    expect(new Set(made.sources.map((source) => source.buffer)).size).toBe(1);
  });

  it("glides a rolling contact's band when it is asked to", () => {
    const { ctx, made } = makeContext();
    playStrikes(ctx, [strike({ overtones: [], contact: { frequency: 900, q: 0.6, decay: 0.2, gain: 1, sweepTo: 2200 } })]);
    expect(made.filters[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
    expect(made.filters[0].frequency.exponentialRampToValueAtTime.mock.calls[0][0]).toBe(2200);
  });

  it("plays every real recipe through without error", () => {
    for (const [, recipe] of everyRecipe) {
      const { ctx } = makeContext();
      expect(() => playStrikes(ctx, recipe(seeded(1)))).not.toThrow();
    }
  });

  it("lets a failing audio graph throw, for its caller to swallow", () => {
    const broken = { currentTime: 0, destination: {}, createGain: () => { throw new Error("no audio"); } } as unknown as AudioContext;
    expect(() => playStrikes(broken, [strike()])).toThrow();
  });
});
