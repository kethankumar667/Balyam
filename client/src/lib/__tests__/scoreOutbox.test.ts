import { beforeEach, describe, expect, it } from "vitest";
import type { RecordScorePayload } from "@shared/profile/Scorecard";
import { OUTBOX_KEY, enqueueScore, pendingScores, readOutbox, removeScore } from "../scoreOutbox";

/**
 * A score that could not reach the account is kept here until it can, instead of vanishing the way a failed
 * request used to. Each entry keeps its `matchId`, which the server de-duplicates on, so sending one twice
 * counts once.
 */

const payload = (matchId: string, score = 18): RecordScorePayload => ({
  game: "nokiacricket", modeId: "classic_1", score, matchId, context: "SOLO",
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("scoreOutbox", () => {
  it("keeps a queued score, with who it belongs to", () => {
    enqueueScore("alice", payload("m1"), 100);

    expect(readOutbox()).toEqual([{ playerId: "alice", payload: payload("m1"), queuedAt: 100 }]);
  });

  it("holds each player's scores apart", () => {
    enqueueScore("alice", payload("m1"), 1);
    enqueueScore("bob", payload("m2"), 2);

    expect(pendingScores("alice").map((entry) => entry.payload.matchId)).toEqual(["m1"]);
    expect(pendingScores("bob").map((entry) => entry.payload.matchId)).toEqual(["m2"]);
    expect(pendingScores("nobody")).toEqual([]);
  });

  it("queues the same result once, so a retry loop cannot pile up copies", () => {
    enqueueScore("alice", payload("m1"), 1);
    const pending = enqueueScore("alice", payload("m1"), 2);

    expect(pending).toBe(1);
    expect(readOutbox()).toHaveLength(1);
  });

  it("queues two different results from the same mode separately", () => {
    enqueueScore("alice", payload("m1", 10), 1);
    expect(enqueueScore("alice", payload("m2", 30), 2)).toBe(2);
  });

  it("removes a score once the account has it, and only that one", () => {
    enqueueScore("alice", payload("m1"), 1);
    enqueueScore("alice", payload("m2"), 2);

    removeScore("alice", payload("m1"));

    expect(pendingScores("alice").map((entry) => entry.payload.matchId)).toEqual(["m2"]);
  });

  it("starts empty when nothing has been saved or the saved value is damaged", () => {
    expect(readOutbox()).toEqual([]);
    window.localStorage.setItem(OUTBOX_KEY, "{not json");
    expect(readOutbox()).toEqual([]);
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify({ version: 1, entries: [{ playerId: 5 }, "x", null] }));
    expect(readOutbox()).toEqual([]);
  });

  it("keeps the newest scores when the queue is full rather than refusing a new one", () => {
    for (let i = 0; i < 205; i++) enqueueScore("alice", payload(`m${i}`), i);

    const kept = pendingScores("alice");
    expect(kept).toHaveLength(200);
    expect(kept[kept.length - 1]?.payload.matchId).toBe("m204");
  });

  it("does not throw when storage is unavailable", () => {
    const original = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = () => { throw new Error("quota"); };
    try {
      expect(() => enqueueScore("alice", payload("m1"), 1)).not.toThrow();
    } finally {
      window.localStorage.setItem = original;
    }
  });
});
