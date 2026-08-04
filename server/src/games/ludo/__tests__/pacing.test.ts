import { describe, it, expect } from "vitest";
import {
  BOT_THINK_JITTER_MS,
  BOT_THINK_MIN_MS,
  DICE_ROLL_MS,
  ROLL_COOLDOWN_MS,
  botThinkMs,
  estimatedLapMs,
  stepMsFor,
} from "@shared/ludo-pacing.js";
import { LudoEngine } from "../LudoEngine.js";

/**
 * "The game feels slow" was a real report, and the cause was a number nobody
 * was looking at: Ludo never implemented `getBotThinkDelayMs`, so it inherited
 * RoomManager's generic 1200-2000ms fallback — applied PER SUB-MOVE. A Ludo
 * turn is roll + move, so every bot turn cost 2.4-4s and a 3-bot table left a
 * human waiting 7-12s between their own turns.
 *
 * These tests pin the BUDGET rather than the individual constants, because the
 * failure mode is compositional: each number looked defensible alone.
 */

describe("Ludo pacing budget", () => {
  it("a bot sub-move never approaches the old generic fallback", () => {
    // The fallback that caused the problem started at 1200ms.
    expect(BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS).toBeLessThan(1000);
  });

  it("a bot pause still covers the dice animation, so bots never look instant", () => {
    // Below the dice tumble the bot appears to move before its own roll reads.
    const slowest = BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS;
    expect(slowest).toBeGreaterThanOrEqual(DICE_ROLL_MS);
  });

  it("the engine actually implements the hook (not inheriting the fallback)", () => {
    const e = new LudoEngine();
    expect(typeof e.getBotThinkDelayMs).toBe("function");
    const d = e.getBotThinkDelayMs();
    expect(d).toBeGreaterThanOrEqual(BOT_THINK_MIN_MS);
    expect(d).toBeLessThanOrEqual(BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS);
  });

  it("botThinkMs is deterministic under an injected rng", () => {
    expect(botThinkMs(() => 0)).toBe(BOT_THINK_MIN_MS);
    expect(botThinkMs(() => 1)).toBe(BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS);
  });

  it("longer token travel compresses per cell, and never below the floor", () => {
    expect(stepMsFor(1)).toBeGreaterThan(stepMsFor(6));
    // A six — the commonest meaningful roll — must not dominate the turn.
    expect(stepMsFor(6) * 6).toBeLessThan(700);
    for (const n of [1, 2, 6, 13, 52]) expect(stepMsFor(n)).toBeGreaterThanOrEqual(85);
  });

  it("your own turn spends under a second before you can act again", () => {
    expect(ROLL_COOLDOWN_MS + DICE_ROLL_MS).toBeLessThan(1000);
  });

  it("a full lap at a 3-bot table stays well under the old ~12s", () => {
    const lap = estimatedLapMs(3);
    expect(lap).toBeLessThan(5000);
    // And scales sanely rather than exploding with table size.
    expect(estimatedLapMs(7)).toBeLessThan(2 * estimatedLapMs(3));
  });
});
