import { describe, expect, it } from "vitest";
import {
  ALLOWED_SOUND_CLIPS,
  SOUNDBOARD_CLIPS,
  soundClipById,
} from "@shared/soundboard";
import { audioKeyForClip, unmappedClipIds } from "../soundboard";
import { THEMES } from "../../assets/audio/themes/manifests";

/**
 * Catalogue consistency.
 *
 * reactions.ts exists because the picker and the server allowlist had drifted,
 * producing a button that did nothing with no error anywhere. The soundboard
 * has three lists that can drift instead of two — catalogue, audio-key map,
 * theme manifests — so the same class of silent failure is three times as
 * likely here. These tests are the guard rail.
 */

describe("soundboard catalogue", () => {
  it("has unique, non-empty clip ids", () => {
    const ids = SOUNDBOARD_CLIPS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).not.toBe("");
  });

  it("derives the server allowlist from the catalogue", () => {
    expect(ALLOWED_SOUND_CLIPS.size).toBe(SOUNDBOARD_CLIPS.length);
    for (const clip of SOUNDBOARD_CLIPS) {
      expect(ALLOWED_SOUND_CLIPS.has(clip.id)).toBe(true);
    }
  });

  it("gives every clip a label and a glyph for the picker", () => {
    for (const clip of SOUNDBOARD_CLIPS) {
      // A glyph-only button is a guessing game: you cannot preview a clip
      // before playing it to the whole room.
      expect(clip.label.length).toBeGreaterThan(0);
      expect(clip.glyph.length).toBeGreaterThan(0);
      expect(["cheer", "tease", "drama"]).toContain(clip.group);
    }
  });

  it("resolves every clip id to an audio key", () => {
    expect(unmappedClipIds()).toEqual([]);
    for (const clip of SOUNDBOARD_CLIPS) {
      expect(audioKeyForClip(clip.id)).toBeTruthy();
    }
  });

  it("returns null for an unknown clip rather than throwing", () => {
    expect(audioKeyForClip("nope")).toBeNull();
    expect(soundClipById("nope")).toBeUndefined();
  });

  it("maps every clip in every audio theme", () => {
    for (const theme of THEMES) {
      for (const clip of SOUNDBOARD_CLIPS) {
        const key = audioKeyForClip(clip.id);
        // A clip present in one theme but missing in another would go silent
        // for whoever picked that theme — the soundboard is a shared social
        // contract, so coverage must be uniform.
        expect(key && theme.files[key], `${theme.id} is missing ${clip.id}`).toBeTruthy();
      }
    }
  });
});
