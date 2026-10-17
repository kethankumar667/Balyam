import { describe, expect, it } from "vitest";
import { getGameAcademy, hasGameAcademy } from "../../../features/academy/data";
import { DATA_INVENTORY } from "../../../lib/privacy/dataInventory";
import { getGameModeConfig } from "@shared/profile/GameModes.js";
import { BRAINVITA_TUTORIAL_KEY } from "../useBrainVita";
import { BRAINVITA_MUTE_STORAGE_KEY } from "../brainvitaAudio";
import { SKIN_STORAGE_KEY, TILT_STORAGE_KEY, UNLOCKED_STORAGE_KEY } from "../brainvitaSkins";
import { CENTRE_HOLE, HOLE_COUNT, createBoard, marbleCount, rateResult } from "../brainvitaRules";

/** The lesson is where a first-time player learns the rules, so each fact it states is pinned to the game. */
describe("Brain Vita academy lesson", () => {
  const spec = getGameAcademy("brainvita");
  const text = JSON.stringify(spec);

  it("exists and is found by the tutorial key's first segment", () => {
    expect(hasGameAcademy("brainvita")).toBe(true);
    expect(BRAINVITA_TUTORIAL_KEY.split(".")[0]).toBe(spec?.slug);
  });

  it("states the real board: 33 holes, 32 marbles, centre empty", () => {
    expect(text).toContain(`${HOLE_COUNT} holes`);
    expect(text).toContain(`${marbleCount(createBoard())} marbles`);
    expect(createBoard()[CENTRE_HOLE]).toBe(false);
    expect(text).toMatch(/centre/i);
  });

  it("states how a jump works, including that diagonals are not allowed", () => {
    expect(text).toMatch(/jump/i);
    expect(text).toMatch(/never diagonally/i);
    expect(text).toMatch(/taken off the board/i);
  });

  it("states the jump count of a one-marble game: every jump removes one marble, 31 in all", () => {
    expect(text).toContain("31 jumps");
    expect(marbleCount(createBoard()) - 1).toBe(31);
  });

  it("states the ratings the game really gives", () => {
    expect(text).toContain(`1 is ${rateResult(1, false).title}`);
    expect(text).toContain(rateResult(2, false).title);
    expect(text).toContain(rateResult(3, false).title);
    expect(text).toContain(rateResult(4, false).title);
  });

  it("states the real leaderboard rule: unassisted games only, marbles left, 1 is best", () => {
    expect(text).toMatch(/without any hint or undo/i);
    const mode = getGameModeConfig("brainvita").modes[0];
    expect(mode.scoringDirection).toBe("LOWER_IS_BETTER");
    expect(text).toMatch(/1 is the best/i);
  });

  it("is one player, and promises nothing the game does not do", () => {
    expect(spec?.players).toBe("1 Player");
    for (const invented of [/power-?up/i, /coins? reward/i, /xp\b/i, /multiplayer/i, /unbeatable/i, /ai-powered/i]) {
      expect(text).not.toMatch(invented);
    }
  });

  it("gives every slide a unique id", () => {
    const ids = spec?.slides.map((slide) => slide.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Brain Vita storage keys", () => {
  const declared = new Map(DATA_INVENTORY.map((entry) => [entry.key, entry]));

  it.each([BRAINVITA_TUTORIAL_KEY, BRAINVITA_MUTE_STORAGE_KEY, "bhalyam.academy.brainvita.v2", SKIN_STORAGE_KEY, UNLOCKED_STORAGE_KEY, TILT_STORAGE_KEY])(
    "declares %s in the privacy inventory, as non-personal on-device data",
    (key) => {
      const entry = declared.get(key);
      expect(entry, key).toBeDefined();
      expect(entry?.isPersonalData).toBe(false);
      expect(["progress", "preference"]).toContain(entry?.purpose);
      expect((entry?.description ?? "").length).toBeGreaterThan(24);
    },
  );

  it("uses the academy's own completion key as declared", () => {
    expect(getGameAcademy("brainvita")?.storageKey).toBe("bhalyam.academy.brainvita.v2");
  });
});
