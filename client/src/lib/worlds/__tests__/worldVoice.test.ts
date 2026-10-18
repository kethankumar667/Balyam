import { describe, expect, it } from "vitest";
import { WORLD_IDS } from "@shared/worlds";
import LUDO_SOUND from "../../../games/ludo/sound.ts?raw";
import RUMMY_SOUND from "../../../games/rummy/sound.ts?raw";
import LUDO_ENTRY from "../../../games/ludo/LudoBoard.tsx?raw";
import RUMMY_ENTRY from "../../../games/rummy/RummyBoard.tsx?raw";
import { WORLD_VOICE, voiceOfWorld, voicedNoiseGain, voicedTone } from "../worldVoice";

/**
 * What a world sounds like. The classic table must be the cues exactly as they were, and every other world must change
 * what the cues are made of, so two worlds never sound alike.
 */

describe("which voice each world speaks in", () => {
  it("gives the classic table no voice, so its cues are untouched", () => {
    expect(voiceOfWorld("classic")).toBeNull();
    expect(voicedTone(null, 440, 100, "sawtooth", 0.2)).toEqual([{ frequency: 440, durMs: 100, type: "sawtooth", gain: 0.2 }]);
    expect(voicedNoiseGain(null, 0.06)).toBe(0.06);
  });

  it("gives every other world a voice of its own", () => {
    const others = WORLD_IDS.filter((id) => id !== "classic");
    const ids = others.map((id) => WORLD_VOICE[id]);
    expect(ids.every((id) => id !== null)).toBe(true);
    expect(new Set(ids).size).toBe(others.length);
  });
});

describe("a tone in a voice", () => {
  const sample = (world: Parameters<typeof voiceOfWorld>[0]) => voicedTone(voiceOfWorld(world), 660, 100, "square", 0.16);

  it("is lower and drier on stone than on glass", () => {
    const [stone] = sample("zen");
    const [glass] = sample("neon");
    expect(stone.frequency).toBeLessThan(660);
    expect(glass.frequency).toBeGreaterThan(660);
    expect(stone.durMs).toBeLessThan(100);
  });

  it("glides in water and in the toy box, and nowhere else", () => {
    for (const world of ["reef", "toy"] as const) expect(sample(world)[0].glideTo, world).toBeGreaterThan(sample(world)[0].frequency);
    for (const world of ["neon", "zen", "palace"] as const) expect(sample(world)[0].glideTo, world).toBeUndefined();
  });

  it("rings a metal partial above a low tone in the palace, and none above a high one", () => {
    expect(sample("palace")).toHaveLength(2);
    expect(sample("palace")[1].frequency).toBeGreaterThan(sample("palace")[0].frequency * 2);
    expect(voicedTone(voiceOfWorld("palace"), 1900, 100, "sine", 0.1)).toHaveLength(1);
  });

  it("never rings longer than the cap in any voiced world, however long the voice would like", () => {
    for (const world of WORLD_IDS.filter((id) => id !== "classic")) for (const shape of voicedTone(voiceOfWorld(world), 500, 900, "sine", 0.1)) expect(shape.durMs).toBeLessThanOrEqual(700);
  });

  it("makes a stone clack and a pane barely touch", () => {
    expect(voicedNoiseGain(voiceOfWorld("zen"), 0.05)).toBeGreaterThan(0.05);
    expect(voicedNoiseGain(voiceOfWorld("neon"), 0.05)).toBeLessThan(0.05);
  });
});

describe("the voice reaches both games' cues", () => {
  it("is applied by each game's own sound file", () => {
    expect(LUDO_SOUND).toContain("voicedTone(voice");
    expect(RUMMY_SOUND).toContain("voicedTone(voice");
    expect(RUMMY_SOUND).toContain("voicedNoiseGain(voice");
  });

  it("is set from the table's world, and put back to the classic voice on leaving", () => {
    for (const entry of [LUDO_ENTRY, RUMMY_ENTRY]) {
      expect(entry).toMatch(/SoundWorld\(soundWorld\)/);
      expect(entry).toMatch(/SoundWorld\("classic"\)/);
    }
  });
});
