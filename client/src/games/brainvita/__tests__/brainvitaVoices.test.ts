import { describe, expect, it, vi } from "vitest";
import { VOICES, applyVoice, jumpSound, pickSound, playStrikes, stuckSound, winSound, type Strike } from "../brainvitaFoley";
import { AMBIENT_VOICES, AmbientEngine, DEFAULT_FLAVOUR, resolutionChord } from "../brainvitaAmbient";
import { particleLook } from "../brainvitaParticles";
import type { ParticleKind } from "../brainvitaSkinKit";
import { SKINS, SKIN_IDS } from "../brainvitaSkins";

/** A random source that always answers the middle, so a recipe's variation is out of the way. */
const middle = (): number => 0.5;

const glass = (): Strike[] => [...pickSound(middle), ...jumpSound(middle), ...winSound(middle), ...stuckSound(middle)];
const fundamentals = (strikes: readonly Strike[]): number[] => strikes.flatMap((strike) => strike.overtones.map((overtone) => overtone.frequency));

describe("what each world's marbles knock against", () => {
  it("has a voice for every world's choice, and no two worlds share one", () => {
    for (const id of SKIN_IDS) expect(VOICES[SKINS[id].voice]).toBeDefined();
    expect(new Set(SKIN_IDS.map((id) => SKINS[id].voice)).size).toBe(SKIN_IDS.length);
  });

  it("leaves the wooden world's sounds exactly as the recipes make them", () => {
    const strikes = glass();
    const voiced = applyVoice(strikes, VOICES.wood);
    expect(fundamentals(voiced)).toEqual(fundamentals(strikes));
    expect(voiced.map((strike) => strike.overtones.map((overtone) => overtone.decay))).toEqual(strikes.map((strike) => strike.overtones.map((overtone) => overtone.decay)));
  });

  it("pitches a river stone lower and a neon pane higher than glass on wood", () => {
    const base = Math.max(...fundamentals(glass()));
    expect(Math.max(...fundamentals(applyVoice(glass(), VOICES.stone)))).toBeLessThan(base);
    expect(Math.max(...fundamentals(applyVoice(glass(), VOICES.synth)))).toBeGreaterThan(base);
  });

  it("makes a stone clack harder than glass touches, and a pane barely touch at all", () => {
    const noise = (strikes: readonly Strike[]) => strikes.reduce((total, strike) => total + (strike.contact?.gain ?? 0), 0);
    expect(noise(applyVoice(glass(), VOICES.stone))).toBeGreaterThan(noise(glass()));
    expect(noise(applyVoice(glass(), VOICES.synth))).toBeLessThan(noise(glass()));
  });

  it("lets a bubble rise and a toy boing, and nothing else glide", () => {
    const glides = (id: keyof typeof VOICES) => applyVoice(glass(), VOICES[id]).some((strike) => strike.overtones.some((overtone) => overtone.glideTo !== undefined));
    expect(glides("water")).toBe(true);
    expect(glides("toy")).toBe(true);
    for (const id of ["wood", "synth", "stone", "bell"] as const) expect(glides(id), id).toBe(false);
    const rise = applyVoice(glass(), VOICES.water).flatMap((strike) => strike.overtones).filter((overtone) => overtone.glideTo !== undefined);
    for (const overtone of rise) expect(overtone.glideTo).toBeGreaterThan(overtone.frequency);
  });

  it("adds the inharmonic partials of struck brass above the low overtones of a bell, and only there", () => {
    const plain = applyVoice(glass(), { ...VOICES.bell, hasBellPartials: false });
    const bell = applyVoice(glass(), VOICES.bell);
    expect(bell.flatMap((strike) => strike.overtones).length).toBeGreaterThan(plain.flatMap((strike) => strike.overtones).length);
    // The landing's low wooden body has partials; the high glass tick that opens a pick does not.
    const lowIndex = plain.findIndex((strike) => strike.overtones.length > 0 && strike.overtones[0].frequency < 1500);
    const base = plain[lowIndex].overtones[0].frequency;
    expect(bell[lowIndex].overtones.some((overtone) => Math.abs(overtone.frequency / base - 2.76) < 0.01)).toBe(true);
    const highIndex = plain.findIndex((strike) => strike.overtones.length > 0 && strike.overtones[0].frequency > 2500);
    expect(bell[highIndex].overtones).toHaveLength(plain[highIndex].overtones.length);
  });

  it("never lets anything ring for longer than a second and a fifth, however long a voice wants", () => {
    for (const voice of Object.values(VOICES)) for (const strike of applyVoice(glass(), voice)) for (const overtone of strike.overtones) expect(overtone.decay).toBeLessThanOrEqual(1.2);
  });

  it("changes nothing about when each strike happens or how loud it is overall", () => {
    const strikes = glass();
    for (const voice of Object.values(VOICES)) {
      const voiced = applyVoice(strikes, voice);
      expect(voiced.map((strike) => strike.at)).toEqual(strikes.map((strike) => strike.at));
      expect(voiced.map((strike) => strike.level)).toEqual(strikes.map((strike) => strike.level));
    }
  });

  it("sets the waveform and the glide on the oscillators it builds", () => {
    const frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    const oscillators: { type: string }[] = [];
    const node = () => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn(), frequency });
    const ctx = {
      currentTime: 0,
      destination: {},
      createGain: node,
      createOscillator: () => {
        const oscillator = Object.assign(node(), { type: "sine" });
        oscillators.push(oscillator);
        return oscillator;
      },
    } as unknown as AudioContext;
    playStrikes(ctx, applyVoice([{ at: 0, level: 0.5, overtones: [{ frequency: 400, decay: 0.1, gain: 1 }], contact: null }], VOICES.toy));
    expect(oscillators.length).toBeGreaterThan(0);
    expect(oscillators.every((oscillator) => oscillator.type === "triangle")).toBe(true);
    expect(frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
  });
});

describe("how a captured marble scatters in each world", () => {
  const KINDS: readonly ParticleKind[] = ["spark", "pixel", "dust", "bubble", "confetti", "petal"];
  const colours = ["#111111", "#222222", "#333333"];

  it("looks different for every kind", () => {
    const looks = KINDS.map((kind) => JSON.stringify(particleLook(kind, 0, 0.3, -0.2, colours).style));
    expect(new Set(looks).size).toBe(KINDS.length);
  });

  it("is the one thing each world chose: every world's own kind exists", () => {
    for (const id of SKIN_IDS) expect(KINDS).toContain(SKINS[id].particleKind);
  });

  it("makes bubbles rise and dust, confetti and petals fall, while sparks and pixels simply fly", () => {
    const travel = (kind: ParticleKind): number => Number(/translate\(([-\d.]+)%, ([-\d.]+)%\)/.exec(particleLook(kind, 0, 0, 0, colours).to)?.[2]);
    expect(travel("bubble")).toBeLessThan(0);
    for (const kind of ["dust", "confetti", "petal"] as const) expect(travel(kind), kind).toBeGreaterThan(0);
    for (const kind of ["spark", "pixel"] as const) expect(travel(kind), kind).toBe(0);
  });

  it("spins confetti and petals, either way, and not sparks", () => {
    expect(particleLook("confetti", 0, 0, 0, colours).to).toContain("rotate(560deg)");
    expect(particleLook("confetti", 1, 0, 0, colours).to).toContain("rotate(-560deg)");
    expect(particleLook("petal", 0, 0, 0, colours).to).toContain("rotate(");
    expect(particleLook("spark", 0, 0, 0, colours).to).not.toContain("rotate");
  });

  it("takes its colours in turn from the world, so confetti is every colour", () => {
    const colour = (index: number) => particleLook("confetti", index, 0, 0, colours).style.background;
    expect([colour(0), colour(1), colour(2), colour(3)]).toEqual(["#111111", "#222222", "#333333", "#111111"]);
    expect(SKINS.toy.particleColors.length).toBeGreaterThan(3);
    expect(SKINS.wood.particleColors).toHaveLength(1);
  });

  it("gives a square pixel, a round spark and a leaf-shaped petal", () => {
    expect(particleLook("pixel", 0, 0, 0, colours).style.borderRadius).toBeUndefined();
    expect(particleLook("spark", 0, 0, 0, colours).style.borderRadius).toBe("50%");
    expect(String(particleLook("petal", 0, 0, 0, colours).style.borderRadius)).toContain("/");
  });
});

describe("the drone's colour in each world", () => {
  const fakeContext = () => {
    const frequencies: number[] = [];
    const types: string[] = [];
    const gainNode = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() } });
    const ctx = {
      currentTime: 0,
      destination: {},
      createGain: gainNode,
      createOscillator: () => {
        const oscillator = { type: "sine", frequency: { setValueAtTime: (value: number) => frequencies.push(value) }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        types.push("");
        return new Proxy(oscillator, { set: (target, key, value) => { if (key === "type") types[types.length - 1] = value as string; return Reflect.set(target, key, value); } });
      },
    } as unknown as AudioContext;
    return { ctx, frequencies, types };
  };

  it("sits where it always did by default", () => {
    const { ctx, frequencies } = fakeContext();
    new AmbientEngine(ctx).start(32);
    expect(frequencies.slice(0, 1)).toEqual([AMBIENT_VOICES[0]]);
    expect(DEFAULT_FLAVOUR).toEqual({ scale: 1, wave: "triangle" });
  });

  it("is lifted or lowered, and made of another wave, by the world it is playing in", () => {
    const low = fakeContext();
    new AmbientEngine(low.ctx, { scale: 0.75, wave: "sine" }).start(32);
    expect(low.frequencies[0]).toBeCloseTo(AMBIENT_VOICES[0] * 0.75);
    expect(new Set(low.types)).toEqual(new Set(["sine"]));
    const high = fakeContext();
    new AmbientEngine(high.ctx, { scale: 1.5, wave: "triangle" }).start(32);
    expect(high.frequencies[0]).toBeCloseTo(AMBIENT_VOICES[0] * 1.5);
  });

  it("resolves into a chord, moved the same way", () => {
    const { ctx, frequencies } = fakeContext();
    const engine = new AmbientEngine(ctx, { scale: 2, wave: "sine" });
    engine.start(32);
    const before = frequencies.length;
    engine.resolve(true);
    const chord = frequencies.slice(before);
    expect(chord).toEqual(resolutionChord(true).frequencies.map((frequency) => frequency * 2));
  });
});
