import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { needsConsent, NOTICE_VERSION, readConsent, recordConsent, subscribeConsent, withdrawConsent } from "../consent";
import { eraseLocalData } from "../dataInventory";

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

  it("does not treat a guest's answer as a member's acknowledgement", () => {
    recordConsent("granted");

    expect(needsConsent()).toBe(false);
    expect(needsConsent("member-a")).toBe(true);
  });

  it.each(["granted", "essential-only"] as const)("remembers a member's %s answer without asking again", (choice) => {
    recordConsent(choice, new Date(), "member-a");

    expect(needsConsent("member-a")).toBe(false);
    expect(needsConsent("member-b")).toBe(true);
    expect(readConsent()?.choice).toBe(choice);
  });

  it("remembers both members when accounts switch on the same browser", () => {
    recordConsent("granted", new Date(), "member-a");
    recordConsent("essential-only", new Date(), "member-b");

    expect(needsConsent("member-a")).toBe(false);
    expect(needsConsent("member-b")).toBe(false);
    expect(needsConsent("member-c")).toBe(true);
  });

  it("preserves member acknowledgements when consent is withdrawn", () => {
    recordConsent("granted", new Date(), "member-a");

    withdrawConsent();

    expect(needsConsent("member-a")).toBe(false);
    expect(readConsent()?.choice).toBe("essential-only");
  });

  it("requires each member to answer again after a notice update", () => {
    localStorage.setItem("bhalyam.consent", JSON.stringify({
      choice: "granted", noticeVersion: NOTICE_VERSION - 1, memberIds: ["member-a", "member-b"],
    }));
    expect(needsConsent("member-a")).toBe(true);

    recordConsent("granted", new Date(), "member-a");

    expect(needsConsent("member-a")).toBe(false);
    expect(needsConsent("member-b")).toBe(true);
  });

  it("ignores malformed member acknowledgements in storage", () => {
    localStorage.setItem("bhalyam.consent", JSON.stringify({
      choice: "granted", noticeVersion: NOTICE_VERSION, memberIds: [123, null, "member-a"],
    }));

    expect(needsConsent("member-a")).toBe(false);
    expect(needsConsent("member-b")).toBe(true);
  });

  it("keeps storage-refused answers scoped to the member who answered", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    recordConsent("granted");
    expect(needsConsent("member-a")).toBe(true);

    recordConsent("essential-only", new Date(), "member-a");

    expect(needsConsent("member-a")).toBe(false);
    expect(needsConsent("member-b")).toBe(true);
  });

  it("does not restore erased member acknowledgements from a storage-refused answer", () => {
    const write = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    recordConsent("granted", new Date(), "member-a");
    expect(write).toHaveBeenCalled();
    expect(localStorage.getItem("bhalyam.consent")).toBeNull();

    eraseLocalData();
    write.mockRestore();
    recordConsent("granted");

    expect(needsConsent("member-a")).toBe(true);
    expect(readConsent()?.memberIds).not.toContain("member-a");
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
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
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
