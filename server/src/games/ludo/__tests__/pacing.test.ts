import { describe, it, expect } from "vitest";
import {
  BOT_THINK_JITTER_MS,
  BOT_THINK_MIN_MS,
  DICE_ROLL_MS,
  ROLL_COOLDOWN_MS,
  STEP_MS_MIN,
  TURN_HANDOFF_MS,
  botThinkMs,
  estimatedLapMs,
  hopMsFor,
  stepMsFor,
  travelMsFor,
} from "@shared/ludo-pacing.js";
import { LudoEngine } from "../LudoEngine.js";

/**
 * Ludo's pacing has now been wrong in BOTH directions, which is why these
 * tests pin a band rather than a ceiling.
 *
 *   Too slow — Ludo never implemented `getBotThinkDelayMs`, so it inherited
 *   RoomManager's 1200-2000ms generic fallback, applied PER SUB-MOVE. A turn
 *   is roll + move, so a 3-bot table cost 7-12s a lap.
 *
 *   Too fast — the fix was a flat ~500ms pause, which is SHORTER than the
 *   animations it was supposed to sit behind (the dice tumble alone is
 *   640ms). Bots moved before their own die read and rolled while the
 *   previous token was still walking, so whole turns passed in a flash.
 *
 * The invariant that resolves both: a seat may not act until the previous
 * seat's animation is done. These tests assert that ordering structurally,
 * because the failure mode is compositional — each constant looked defensible
 * on its own.
 */

describe("Ludo pacing budget", () => {
  it("a bot sub-move never approaches the old generic fallback", () => {
    // The fallback that caused the original "too slow" report started at
    // 1200ms of pure dead time, on top of nothing.
    expect(BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS).toBeLessThan(1000);
  });

  it("a bot's pause always covers the animation it is waiting on", () => {
    // This is the property that was only PROBABLY true before: the old flat
    // pause covered the dice tumble at its slowest sample and not at its
    // fastest, so bots intermittently moved before their own roll read.
    for (const anim of [0, DICE_ROLL_MS, travelMsFor(6), 2000]) {
      expect(botThinkMs(anim, () => 0)).toBeGreaterThanOrEqual(anim);
    }
  });

  it("botThinkMs is deterministic under an injected rng", () => {
    expect(botThinkMs(0, () => 0)).toBe(BOT_THINK_MIN_MS);
    expect(botThinkMs(0, () => 1)).toBe(BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS);
    expect(botThinkMs(500, () => 0)).toBe(500 + BOT_THINK_MIN_MS);
  });

  it("the engine implements the hook and prices the pending animation", () => {
    const e = new LudoEngine();
    expect(typeof e.getBotThinkDelayMs).toBe("function");
    // Before init there is no state and therefore nothing owed — the delay
    // must still be a sane number rather than NaN.
    const idle = e.getBotThinkDelayMs();
    expect(idle).toBeGreaterThanOrEqual(BOT_THINK_MIN_MS);
    expect(idle).toBeLessThanOrEqual(BOT_THINK_MIN_MS + BOT_THINK_JITTER_MS);
  });

  it("after a roll, the bot's own move waits out the dice tumble", () => {
    const e = new LudoEngine();
    e.setRng(() => 0.5); // rolls a 4 — no auto-move from an all-yard start
    e.init([
      { id: "a", name: "A", isReady: true, isBot: true },
      { id: "b", name: "B", isReady: true, isBot: true },
    ] as never);
    e.applyMove({ playerId: "a", type: "roll" } as never);
    // A 4 with every token still in the yard is unmovable, so the turn passes
    // instead — that broadcast still owes the tumble AND the handover beat.
    expect(e.getBotThinkDelayMs()).toBeGreaterThanOrEqual(
      DICE_ROLL_MS + TURN_HANDOFF_MS,
    );
  });

  it("one hop always finishes inside its own step slot", () => {
    // The "token jumped 5 squares in one shot" bug: the CSS transition was
    // longer than the interval between steps, so it was re-aimed before it
    // ever landed and five hops rendered as one glide.
    for (const n of [1, 2, 3, 5, 6, 13]) {
      expect(hopMsFor(n)).toBeLessThan(stepMsFor(n));
    }
  });

  it("longer token travel compresses per cell, but a step stays countable", () => {
    expect(stepMsFor(1)).toBeGreaterThan(stepMsFor(6));
    // Below roughly this, a hop stops reading as a discrete step.
    for (const n of [1, 2, 6, 13, 52]) {
      expect(stepMsFor(n)).toBeGreaterThanOrEqual(STEP_MS_MIN);
    }
    // A six is the longest ordinary walk and must not become a journey.
    expect(travelMsFor(6)).toBeLessThan(1000);
  });

  it("your own turn spends under a second before you can act again", () => {
    expect(ROLL_COOLDOWN_MS + DICE_ROLL_MS).toBeLessThan(1000);
  });

  it("a full lap at a 3-bot table stays well under the old ~12s", () => {
    const lap = estimatedLapMs(3);
    // Deliberately higher than the ~3s the flat-pause version produced: that
    // version was fast because it talked over its own animations. The floor
    // is what stops a future "make it snappy" pass reintroducing the flash.
    expect(lap).toBeGreaterThan(4000);
    expect(lap).toBeLessThan(9000);
  });

  it("table size costs a fixed amount per seat, and that amount is small", () => {
    // The old form of this ("lap(7) < 2 x lap(3)") only held while the bot
    // cost was negligible beside your own turn, so it failed the moment bots
    // were given enough time to be watchable — for a reason that was not a
    // pacing problem. A bigger table genuinely does take more turns; what
    // must not drift is the cost of ONE extra seat.
    const marginal = estimatedLapMs(4) - estimatedLapMs(3);
    expect(estimatedLapMs(7) - estimatedLapMs(6)).toBeCloseTo(marginal, 5);
    // One bot turn: tumble, read, walk, hand over. Seconds, not many.
    expect(marginal).toBeLessThan(2500);
  });
});
