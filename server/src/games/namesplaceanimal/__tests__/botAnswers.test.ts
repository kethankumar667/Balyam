import { describe, it, expect } from "vitest";
import { getBotAnswer, validateAnswer } from "../dictionary.js";

/** A small seeded generator, so the check gives the same result every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWYY".split("");
const CATEGORIES = ["name", "place", "animal", "thing"] as const;

describe("Name-Place-Animal bot answers", () => {
  it("is always an answer the game accepts, for every letter and category", () => {
    const random = mulberry32(11);
    for (const letter of LETTERS) {
      for (const category of CATEGORIES) {
        for (let i = 0; i < 60; i++) {
          const answer = getBotAnswer(category, letter, random);
          expect(validateAnswer(category, letter, answer), `${letter}/${category}: "${answer}"`).toBe(true);
        }
      }
    }
  });

  it("picks the same answers from the same random source", () => {
    const a = CATEGORIES.map((c) => getBotAnswer(c, "S", mulberry32(5)));
    const b = CATEGORIES.map((c) => getBotAnswer(c, "S", mulberry32(5)));

    expect(a).toEqual(b);
  });
});
