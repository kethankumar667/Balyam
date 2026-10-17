import { describe, expect, it } from "vitest";
import {
  VAMANA_PITS_PER_SIDE,
  VAMANA_SCORE_MAX,
  VAMANA_SCORE_MIN,
  VAMANA_SEEDS_PER_PIT,
  VAMANA_TOTAL_SEEDS,
  DEFAULT_VAMANA_OPTIONS,
} from "@shared/types.js";
import { GAME_LIMITS } from "@shared/catalog";
import { getGameAcademy, hasGameAcademy } from "../../../features/academy/data";
import { DATA_INVENTORY } from "../../../lib/privacy/dataInventory";
import { VAMANA_TUTORIAL_KEY } from "../useVamanaBoard";
import { VAMANA_MUTE_STORAGE_KEY } from "../vamanaAudio";

/**
 * The lesson is the only place a first-time player learns the rules, so every fact it states is pinned
 * here to the shared constants the server enforces — not to a number typed twice.
 */
describe("Vamana Guntalu academy lesson", () => {
  const spec = getGameAcademy("vamanaguntalu");
  const text = JSON.stringify(spec);

  it("exists and is found by the tutorial key's first segment", () => {
    expect(hasGameAcademy("vamanaguntalu")).toBe(true);
    expect(spec).not.toBeNull();
    expect(VAMANA_TUTORIAL_KEY.split(".")[0]).toBe(spec?.slug);
  });

  it("states the real board: seven pits a side, five seeds each, 70 in all", () => {
    expect(text).toContain(`${VAMANA_PITS_PER_SIDE} pits`);
    expect(text).toContain(`${VAMANA_SEEDS_PER_PIT} seeds`);
    expect(text).toContain(String(VAMANA_TOTAL_SEEDS));
  });

  it("states the sowing, relay and capture rules the engine implements", () => {
    expect(text).toMatch(/counter-clockwise/i);
    expect(text).toMatch(/relay/i);
    expect(text).toMatch(/empty/i);
    expect(text).toMatch(/capture/i);
  });

  it("states how the match ends: each player keeps their own row, the bigger pile wins, equal is a draw", () => {
    expect(text).toMatch(/keeps? the seeds/i);
    expect(text).toContain(String(VAMANA_TOTAL_SEEDS / 2));
    expect(text).toMatch(/draw/i);
  });

  it("states the real turn clock and the real leaderboard rule", () => {
    expect(text).toContain(`${DEFAULT_VAMANA_OPTIONS.turnTimerSeconds} seconds`);
    expect(text).toContain(String(VAMANA_SCORE_MIN));
    expect(text).toContain(String(VAMANA_SCORE_MAX));
  });

  it("matches the player count the catalog allows", () => {
    expect(GAME_LIMITS.vamanaguntalu).toEqual({ min: 2, max: 2 });
    expect(spec?.players).toBe("2 Players");
  });

  it("promises nothing the game does not do", () => {
    for (const invented of [/power-?up/i, /special seed/i, /ranked season/i, /xp\b/i, /coins? reward/i, /unbeatable/i, /ai-powered/i]) {
      expect(text).not.toMatch(invented);
    }
  });

  it("gives every slide a unique id", () => {
    const ids = spec?.slides.map((slide) => slide.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Vamana Guntalu storage keys", () => {
  const declared = new Map(DATA_INVENTORY.map((entry) => [entry.key, entry]));

  it.each([
    VAMANA_TUTORIAL_KEY,
    VAMANA_MUTE_STORAGE_KEY,
    "bhalyam.academy.vamanaguntalu.v2",
  ])("declares %s in the privacy inventory, as non-personal on-device data", (key) => {
    const entry = declared.get(key);
    expect(entry, key).toBeDefined();
    expect(entry?.isPersonalData).toBe(false);
    expect(["progress", "preference"]).toContain(entry?.purpose);
    expect((entry?.description ?? "").length).toBeGreaterThan(24);
  });

  it("uses the academy's own completion key as declared", () => {
    expect(getGameAcademy("vamanaguntalu")?.storageKey).toBe("bhalyam.academy.vamanaguntalu.v2");
  });
});
