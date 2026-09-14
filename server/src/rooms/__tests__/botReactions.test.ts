import { describe, it, expect } from "vitest";
import { maybeAmbientBotReactionEmoji } from "../botReactions.js";
import { GAME_REACTIONS, QUICK_REACTIONS, pickReactionEmoji } from "@shared/reactions.js";

describe("pickReactionEmoji", () => {
  it("picks deterministically from the given pool via an injected rng", () => {
    const pool = ["a", "b", "c"] as const;
    expect(pickReactionEmoji(pool, () => 0)).toBe("a");
    expect(pickReactionEmoji(pool, () => 0.999)).toBe("c");
  });

  it("falls back to QUICK_REACTIONS when the pool is undefined or empty", () => {
    expect(QUICK_REACTIONS).toContain(pickReactionEmoji(undefined, () => 0));
    expect(QUICK_REACTIONS).toContain(pickReactionEmoji([], () => 0));
  });
});

describe("maybeAmbientBotReactionEmoji", () => {
  it("returns null when the ambient roll misses (>= 7% threshold)", () => {
    const calls = [0.5]; // well above the ~0.07 chance
    let i = 0;
    expect(maybeAmbientBotReactionEmoji("chess", () => calls[i++])).toBeNull();
  });

  it("returns an emoji from that game's themed pool when the roll hits", () => {
    // First call: the ambient-chance roll (hits, < 0.07). Second call: the
    // emoji-pick roll, forwarded into pickReactionEmoji.
    const calls = [0.01, 0];
    let i = 0;
    const emoji = maybeAmbientBotReactionEmoji("handcricket", () => calls[i++]);
    expect(GAME_REACTIONS.handcricket).toContain(emoji);
  });

  it("falls back to QUICK_REACTIONS for a game with no themed GAME_REACTIONS entry", () => {
    const calls = [0.01, 0];
    let i = 0;
    const emoji = maybeAmbientBotReactionEmoji("uno", () => calls[i++]);
    expect(GAME_REACTIONS.uno).toBeUndefined();
    expect(QUICK_REACTIONS).toContain(emoji);
  });
});
