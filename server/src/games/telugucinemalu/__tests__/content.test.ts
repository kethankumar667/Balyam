import { describe, it, expect } from "vitest";
import { TELUGUCINEMALU_PERSONALITIES } from "../personalities.js";
import { TELUGUCINEMALU_SETS } from "../sets.js";
import { TC_ROUND_PLAN } from "@shared/types.js";
import type { TcDifficulty, TeluguCinemaluQuestion } from "@shared/types.js";

/**
 * Content integrity. A hand-authored bank drifts silently — a pool missing its
 * "extreme" question, an option list where the answer index points past the
 * end, two questions sharing an id. Every one of those surfaces mid-game as a
 * broken round, so they are caught here instead.
 */

const allQuestions: TeluguCinemaluQuestion[] = [
  ...TELUGUCINEMALU_PERSONALITIES.flatMap((p) => p.questions),
  ...TELUGUCINEMALU_SETS.flatMap((s) => [...s.narration, ...s.dialogue, ...s.combination]),
];

function mixFor(kind: string): readonly TcDifficulty[] {
  const spec = TC_ROUND_PLAN.find((r) => r.kind === kind);
  if (!spec) throw new Error(`No round plan for ${kind}`);
  return spec.mix;
}

/** Does `pool` cover every difficulty slot `mix` demands, with enough of each? */
function coversMix(pool: TeluguCinemaluQuestion[], mix: readonly TcDifficulty[]): boolean {
  const need = new Map<TcDifficulty, number>();
  for (const d of mix) need.set(d, (need.get(d) ?? 0) + 1);
  for (const [d, n] of need) {
    if (pool.filter((q) => q.difficulty === d).length < n) return false;
  }
  return true;
}

describe("question shape", () => {
  it("has questions to serve", () => {
    expect(allQuestions.length).toBeGreaterThan(0);
  });

  it("gives every question a unique id", () => {
    const seen = new Map<string, number>();
    for (const q of allQuestions) seen.set(q.id, (seen.get(q.id) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
    expect(dupes).toEqual([]);
  });

  it("points correctIndex at a real option", () => {
    for (const q of allQuestions) {
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex, q.id).toBeLessThan(q.options.length);
    }
  });

  it("offers four distinct options for every question", () => {
    for (const q of allQuestions) {
      expect(q.options.length, q.id).toBe(4);
      expect(new Set(q.options).size, `${q.id} has a repeated option`).toBe(4);
    }
  });

  it("never leaves an option blank", () => {
    for (const q of allQuestions) {
      for (const o of q.options) expect(o.trim().length, q.id).toBeGreaterThan(0);
    }
  });

  it("always asks something", () => {
    for (const q of allQuestions) expect(q.prompt.trim().length, q.id).toBeGreaterThan(0);
  });
});

describe("personality pools", () => {
  it("covers all four roles", () => {
    const roles = new Set(TELUGUCINEMALU_PERSONALITIES.map((p) => p.role));
    expect([...roles].sort()).toEqual(["director", "hero", "heroine", "musicDirector"]);
  });

  it("offers at least six choices per role, as the brief asks", () => {
    for (const role of ["hero", "heroine", "director", "musicDirector"] as const) {
      const n = TELUGUCINEMALU_PERSONALITIES.filter((p) => p.role === role).length;
      expect(n, `${role} has only ${n}`).toBeGreaterThanOrEqual(6);
    }
  });

  it("gives every personality a pool that satisfies the round-1 difficulty ladder", () => {
    const mix = mixFor("personality");
    for (const p of TELUGUCINEMALU_PERSONALITIES) {
      expect(coversMix(p.questions, mix), `${p.name} cannot fill the ladder`).toBe(true);
    }
  });

  it("gives every personality a unique id and a subtitle", () => {
    const ids = TELUGUCINEMALU_PERSONALITIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of TELUGUCINEMALU_PERSONALITIES) {
      expect(p.knownFor.trim().length, p.id).toBeGreaterThan(0);
    }
  });
});

describe("question sets", () => {
  it("has at least one playable set", () => {
    expect(TELUGUCINEMALU_SETS.length).toBeGreaterThan(0);
  });

  it("gives every set enough questions for each round's ladder", () => {
    for (const s of TELUGUCINEMALU_SETS) {
      expect(coversMix(s.narration, mixFor("narration")), `${s.id} narration`).toBe(true);
      expect(coversMix(s.dialogue, mixFor("dialogue")), `${s.id} dialogue`).toBe(true);
      expect(coversMix(s.combination, mixFor("combination")), `${s.id} combination`).toBe(true);
    }
  });

  it("gives narration and combination questions a body to reason about", () => {
    for (const s of TELUGUCINEMALU_SETS) {
      for (const q of [...s.narration, ...s.combination]) {
        expect(q.body?.trim().length ?? 0, `${q.id} has no body`).toBeGreaterThan(0);
      }
    }
  });

  it("uses unique set ids", () => {
    const ids = TELUGUCINEMALU_SETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("round plan", () => {
  it("matches the specified structure: 5 + 5 + 5 + 8", () => {
    expect(TC_ROUND_PLAN.map((r) => r.mix.length)).toEqual([5, 5, 5, 8]);
  });

  it("orders the rounds as personality, narration, dialogue, combination", () => {
    expect(TC_ROUND_PLAN.map((r) => r.kind)).toEqual([
      "personality",
      "narration",
      "dialogue",
      "combination",
    ]);
  });
});
