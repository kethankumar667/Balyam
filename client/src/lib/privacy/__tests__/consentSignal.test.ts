import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { needsConsent, recordConsent, subscribeConsent } from "../consent";

/** The privacy answer is announced, so the steps that wait for it (profile, welcome) can start at once. */
describe("consent signal", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    // A successful write clears the "storage refused" memory the refusal test sets.
    recordConsent("granted");
    localStorage.clear();
  });

  it("is unanswered until a choice is recorded", () => {
    expect(needsConsent()).toBe(true);

    recordConsent("granted");

    expect(needsConsent()).toBe(false);
  });

  it("tells a subscriber when the choice is recorded", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeConsent(onChange);

    recordConsent("essential-only");

    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops telling a subscriber once it has unsubscribed", () => {
    const onChange = vi.fn();
    subscribeConsent(onChange)();

    recordConsent("granted");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("treats the choice as answered for the session when the browser refuses to store it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const onChange = vi.fn();
    subscribeConsent(onChange);

    recordConsent("granted");

    // Nothing was stored, yet the question must not be asked again: nothing would ever clear it.
    expect(needsConsent()).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
