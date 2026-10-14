import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AGE_GATE_CHANGED_EVENT,
  AGE_GATE_KEY,
  clearAgeAnswer,
  getAgeAnswer,
  isMinor,
  needsAgeAnswer,
  recordAgeAnswer,
  subscribeAge,
} from "../ageGate";

afterEach(() => {
  clearAgeAnswer();
  localStorage.clear();
});

describe("age gate store", () => {
  it("asks until the player has answered", () => {
    expect(getAgeAnswer()).toBeNull();
    expect(needsAgeAnswer()).toBe(true);
    expect(isMinor()).toBe(false);
  });

  it("an adult answer ends the question and stores no birthday", () => {
    recordAgeAnswer("adult", true, new Date("2026-10-14T10:00:00.000Z"));
    expect(needsAgeAnswer()).toBe(false);
    expect(isMinor()).toBe(false);
    // The guardian flag is meaningless for an adult and is never kept.
    expect(JSON.parse(localStorage.getItem(AGE_GATE_KEY)!)).toEqual({
      band: "adult",
      guardianConfirmed: false,
      answeredAt: "2026-10-14T10:00:00.000Z",
    });
  });

  it("a minor with a guardian's OK is answered and in limited mode", () => {
    recordAgeAnswer("minor", true);
    expect(needsAgeAnswer()).toBe(false);
    expect(isMinor()).toBe(true);
  });

  it("a minor without a guardian's OK is still asked", () => {
    recordAgeAnswer("minor", false);
    expect(needsAgeAnswer()).toBe(true);
  });

  it("ignores a corrupted record and asks again", () => {
    localStorage.setItem(AGE_GATE_KEY, "{not json");
    expect(getAgeAnswer()).toBeNull();
    localStorage.setItem(AGE_GATE_KEY, JSON.stringify({ band: "grown-up", guardianConfirmed: true, answeredAt: "x" }));
    expect(getAgeAnswer()).toBeNull();
    expect(needsAgeAnswer()).toBe(true);
  });

  it("tells subscribers when the answer changes", () => {
    const listener = vi.fn();
    const off = subscribeAge(listener);
    recordAgeAnswer("adult", false);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    window.dispatchEvent(new Event(AGE_GATE_CHANGED_EVENT));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
