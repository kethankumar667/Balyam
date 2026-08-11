import { describe, it, expect, beforeEach } from "vitest";
import { TeluguCinemaluEngine } from "../TeluguCinemaluEngine.js";
import { TC_DIFFICULTY_POINTS, TC_ROUND_PLAN, TC_TOTAL_QUESTIONS } from "@shared/types.js";
import type { Player } from "@shared/types.js";

const P: Player[] = [{ id: "p1", name: "Kethan", isBot: false } as Player];

function fresh(): TeluguCinemaluEngine {
  const e = new TeluguCinemaluEngine();
  e.setRng(() => 0.42); // deterministic shuffles
  e.init(P);
  return e;
}

/** Drives past role and person selection into the first question. */
function start(e: TeluguCinemaluEngine): void {
  e.applyMove({ playerId: "p1", type: "selectRole", data: { role: "hero" } } as never);
  const id = e.getPublicState().personChoices?.[0]?.id;
  e.applyMove({ playerId: "p1", type: "selectPerson", data: { personId: id } } as never);
}

/** Answers the current question correctly, using the engine's own key. */
function answerCorrectly(e: TeluguCinemaluEngine): number {
  const before = e.getPublicState();
  const key = (e as unknown as { plan: { question: { correctIndex: number } }[]; cursor: number });
  const correct = key.plan[key.cursor].question.correctIndex;
  e.applyMove({ playerId: "p1", type: "submitAnswer", data: { optionIndex: correct } } as never);
  void before;
  return correct;
}

describe("selection flow", () => {
  let e: TeluguCinemaluEngine;
  beforeEach(() => {
    e = fresh();
  });

  it("opens on role selection with no question exposed", () => {
    const s = e.getPublicState();
    expect(s.phase).toBe("roleSelection");
    expect(s.currentQuestion).toBeNull();
    expect(s.personChoices).toBeNull();
  });

  it("offers person cards once a role is chosen", () => {
    e.applyMove({ playerId: "p1", type: "selectRole", data: { role: "director" } } as never);
    const s = e.getPublicState();
    expect(s.phase).toBe("personSelection");
    expect(s.selectedRole).toBe("director");
    expect(s.personChoices!.length).toBeGreaterThanOrEqual(1);
    for (const c of s.personChoices!) expect(c.name.length).toBeGreaterThan(0);
  });

  it("rejects a person who was not offered", () => {
    e.applyMove({ playerId: "p1", type: "selectRole", data: { role: "hero" } } as never);
    const r = e.applyMove({
      playerId: "p1",
      type: "selectPerson",
      data: { personId: "p_dir_rajamouli" },
    } as never);
    expect(r.ok).toBe(false);
  });

  it("cannot skip role selection", () => {
    const r = e.applyMove({
      playerId: "p1",
      type: "selectPerson",
      data: { personId: "p_hero_mahesh" },
    } as never);
    expect(r.ok).toBe(false);
  });

  it("builds the full 23-question plan on selection", () => {
    start(e);
    const s = e.getPublicState();
    expect(s.phase).toBe("playing");
    expect(s.totalQuestions).toBe(TC_TOTAL_QUESTIONS);
    expect(s.totalQuestions).toBe(23);
    expect(s.currentQuestion).not.toBeNull();
  });
});

describe("answer secrecy", () => {
  it("withholds the answer while the question is live", () => {
    const e = fresh();
    start(e);
    const s = e.getPublicState();
    expect(s.correctIndex).toBeNull();
    expect(s.lastAwarded).toBeNull();
    expect(s.selectedIndices).toBeNull();
    // The trivia often names the answer, so it is held back too.
    expect(s.currentQuestion!.trivia).toBeUndefined();
    expect((s.currentQuestion as Record<string, unknown>).correctIndex).toBeUndefined();
  });

  it("reveals the answer only after the player commits", () => {
    const e = fresh();
    start(e);
    answerCorrectly(e);
    const s = e.getPublicState();
    expect(s.phase).toBe("questionSummary");
    expect(s.correctIndex).not.toBeNull();
  });

  it("refuses a second answer to the same question", () => {
    const e = fresh();
    start(e);
    answerCorrectly(e);
    const r = e.applyMove({ playerId: "p1", type: "submitAnswer", data: { optionIndex: 1 } } as never);
    expect(r.ok).toBe(false);
  });

  it("rejects an out-of-range option", () => {
    const e = fresh();
    start(e);
    const r = e.applyMove({ playerId: "p1", type: "submitAnswer", data: { optionIndex: 9 } } as never);
    expect(r.ok).toBe(false);
  });
});

describe("scoring", () => {
  it("pays the difficulty's rate for a correct answer", () => {
    const e = fresh();
    start(e);
    const difficulty = e.getPublicState().currentQuestion!.difficulty;
    answerCorrectly(e);
    expect(e.getPublicState().players[0].score).toBe(TC_DIFFICULTY_POINTS[difficulty]);
  });

  it("pays nothing for a wrong answer but does not go negative", () => {
    const e = fresh();
    start(e);
    const key = e as unknown as { plan: { question: { correctIndex: number } }[]; cursor: number };
    const wrong = (key.plan[0].question.correctIndex + 1) % 4;
    e.applyMove({ playerId: "p1", type: "submitAnswer", data: { optionIndex: wrong } } as never);
    const s = e.getPublicState();
    expect(s.players[0].score).toBe(0);
    expect(s.players[0].correctCount).toBe(0);
  });

  it("tracks a streak and resets it on a miss", () => {
    const e = fresh();
    start(e);
    answerCorrectly(e);
    expect(e.getPublicState().players[0].streak).toBe(1);

    e.applyMove({ playerId: "p1", type: "next" } as never);
    const key = e as unknown as { plan: { question: { correctIndex: number } }[]; cursor: number };
    const wrong = (key.plan[key.cursor].question.correctIndex + 1) % 4;
    e.applyMove({ playerId: "p1", type: "submitAnswer", data: { optionIndex: wrong } } as never);
    expect(e.getPublicState().players[0].streak).toBe(0);
  });
});

describe("round progression", () => {
  /** Plays the whole game correctly, returning the final state. */
  function playThrough(e: TeluguCinemaluEngine) {
    for (let i = 0; i < TC_TOTAL_QUESTIONS; i++) {
      answerCorrectly(e);
      e.applyMove({ playerId: "p1", type: "next" } as never);
      if (e.getPublicState().phase === "roundSummary") {
        e.applyMove({ playerId: "p1", type: "next" } as never);
      }
    }
    return e.getPublicState();
  }

  it("walks all four rounds and finishes", () => {
    const e = fresh();
    start(e);
    const s = playThrough(e);
    expect(s.phase).toBe("finished");
    expect(s.isOver).toBe(true);
    expect(e.isOver()).toBe(true);
  });

  it("files one result per round, in order, with the right question counts", () => {
    const e = fresh();
    start(e);
    const s = playThrough(e);
    expect(s.roundResults.map((r) => r.kind)).toEqual(TC_ROUND_PLAN.map((r) => r.kind));
    expect(s.roundResults.map((r) => r.asked)).toEqual([5, 5, 5, 8]);
  });

  it("credits every question when the player answers them all correctly", () => {
    const e = fresh();
    start(e);
    const s = playThrough(e);
    const totalCorrect = s.roundResults.reduce((n, r) => n + r.correct, 0);
    expect(totalCorrect).toBe(TC_TOTAL_QUESTIONS);
    expect(s.players[0].correctCount).toBe(TC_TOTAL_QUESTIONS);
  });

  it("makes the round tallies add up to the final score", () => {
    const e = fresh();
    start(e);
    const s = playThrough(e);
    const summed = s.roundResults.reduce((n, r) => n + r.points, 0);
    expect(summed).toBe(s.players[0].score);
  });

  it("pauses on a round summary between rounds", () => {
    const e = fresh();
    start(e);
    // Round 1 is five questions.
    for (let i = 0; i < 5; i++) {
      answerCorrectly(e);
      e.applyMove({ playerId: "p1", type: "next" } as never);
    }
    expect(e.getPublicState().phase).toBe("roundSummary");
    expect(e.getPublicState().roundResults).toHaveLength(1);
  });

  it("never repeats a question inside one game", () => {
    const e = fresh();
    start(e);
    const key = e as unknown as { plan: { question: { id: string } }[] };
    const ids = key.plan.map((p) => p.question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("follows the specified difficulty ladder in every round", () => {
    const e = fresh();
    start(e);
    const key = e as unknown as {
      plan: { round: number; question: { difficulty: string } }[];
    };
    TC_ROUND_PLAN.forEach((spec, i) => {
      const got = key.plan.filter((p) => p.round === i + 1).map((p) => p.question.difficulty);
      expect(got.slice().sort()).toEqual(spec.mix.slice().sort());
    });
  });
});

describe("timeouts", () => {
  it("reveals the answer when the clock runs out unanswered", () => {
    const e = fresh();
    start(e);
    e.resolveDeadline();
    const s = e.getPublicState();
    expect(s.phase).toBe("questionSummary");
    expect(s.players[0].score).toBe(0);
  });

  it("leaves the selection phases untimed", () => {
    const e = fresh();
    expect(e.getPhaseTimerSeconds()).toBe(0);
    e.applyMove({ playerId: "p1", type: "selectRole", data: { role: "hero" } } as never);
    expect(e.getPhaseTimerSeconds()).toBe(0);
  });

  it("times the playing phase", () => {
    const e = fresh();
    start(e);
    expect(e.getPhaseTimerSeconds()).toBeGreaterThan(0);
  });
});
