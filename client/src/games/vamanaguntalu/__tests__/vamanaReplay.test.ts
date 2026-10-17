import { describe, expect, it } from "vitest";
import type { VamanaLastMove } from "@shared/types.js";
import { MAX_REPLAY_FRAMES, buildReplayFrames } from "../vamanaReplay";

const FRESH = Array(14).fill(5);

/** The hand-worked opening from the server tests: pit 0 sows, relays four times, and captures pit 5. */
const OPENING: VamanaLastMove = {
  playerId: "p1",
  lifts: [
    { pit: 0, seeds: 5 },
    { pit: 6, seeds: 5 },
    { pit: 12, seeds: 5 },
    { pit: 4, seeds: 6 },
    { pit: 11, seeds: 6 },
  ],
  capture: { pit: 5, seeds: 7 },
  truncated: false,
};
const OPENING_BOARD = [2, 8, 8, 8, 0, 0, 1, 7, 7, 7, 7, 0, 1, 7];

describe("buildReplayFrames", () => {
  it("ends on exactly the board the server reported", () => {
    const frames = buildReplayFrames(FRESH, OPENING);
    expect(frames[frames.length - 1].pits).toEqual(OPENING_BOARD);
  });

  it("shows one frame per lift, per seed dropped, and one for the capture", () => {
    const frames = buildReplayFrames(FRESH, OPENING);
    expect(frames).toHaveLength(5 + 27 + 1);
  });

  it("starts by lifting the chosen pit, then drops seeds one at a time into the next pits", () => {
    const frames = buildReplayFrames(FRESH, OPENING);
    expect(frames[0].activePit).toBe(0);
    expect(frames[0].pits[0]).toBe(0);
    expect(frames[1].activePit).toBe(1);
    expect(frames[1].pits[1]).toBe(6);
    expect(frames[5].activePit).toBe(5);
    expect(frames[5].pits[5]).toBe(6);
    // the next lift (pit 6) comes straight after the fifth seed
    expect(frames[6].activePit).toBe(6);
    expect(frames[6].pits[6]).toBe(0);
  });

  it("marks the captured pit only on the last frame", () => {
    const frames = buildReplayFrames(FRESH, OPENING);
    expect(frames[frames.length - 1].capturedPit).toBe(5);
    expect(frames.slice(0, -1).every((frame) => frame.capturedPit === null)).toBe(true);
  });

  it("makes a turn with no capture end on the last dropped seed", () => {
    const before = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4];
    const move: VamanaLastMove = { playerId: "p1", lifts: [{ pit: 0, seeds: 1 }], capture: null, truncated: false };
    const frames = buildReplayFrames(before, move);
    expect(frames).toHaveLength(2);
    expect(frames[1].pits).toEqual([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]);
    expect(frames[1].capturedPit).toBeNull();
  });

  it("wraps from the last pit to the first", () => {
    const before = Array(14).fill(0);
    before[13] = 2;
    const move: VamanaLastMove = { playerId: "p2", lifts: [{ pit: 13, seeds: 2 }], capture: null, truncated: false };
    const frames = buildReplayFrames(before, move);
    expect(frames[1].activePit).toBe(0);
    expect(frames[2].activePit).toBe(1);
  });

  it("does not change the board it was given", () => {
    const before = [...FRESH];
    buildReplayFrames(before, OPENING);
    expect(before).toEqual(FRESH);
  });

  it("hands out frames that do not share arrays", () => {
    const frames = buildReplayFrames(FRESH, OPENING);
    frames[0].pits[3] = 99;
    expect(frames[1].pits[3]).toBe(5);
  });

  it("thins a very long turn to the cap and still ends on the true final board", () => {
    const frames = buildReplayFrames(FRESH, OPENING, 10);
    expect(frames.length).toBeLessThanOrEqual(11);
    expect(frames[frames.length - 1].pits).toEqual(OPENING_BOARD);
    expect(frames[frames.length - 1].capturedPit).toBe(5);
    expect(MAX_REPLAY_FRAMES).toBeGreaterThan(30);
  });
});
