import { describe, it, expect } from "vitest";
import {
  appendEntry,
  formatFeedClock,
  shouldRecordShot,
  FEED_LIMIT,
  type CarromFeedEntry,
} from "../carromFeed";

const entry = (id: number, text = "no pot", at = 0): CarromFeedEntry => ({ id, text, at });

describe("shouldRecordShot", () => {
  it("records when a shot settles (resolving -> aiming)", () => {
    expect(shouldRecordShot("resolving", "aiming", "potted a white coin")).toBe(true);
  });

  it("records when a shot settles into the end of the match", () => {
    expect(shouldRecordShot("resolving", "finished", "potted the Queen")).toBe(true);
  });

  it("does not record while coins are still moving", () => {
    expect(shouldRecordShot("resolving", "resolving", "no pot")).toBe(false);
  });

  it("does not record on idle re-renders during aiming", () => {
    // The old implementation stamped a fresh clock on every render; this is
    // the case that made the displayed time drift away from the real event.
    expect(shouldRecordShot("aiming", "aiming", "no pot")).toBe(false);
  });

  it("does not record when there is no shot to describe", () => {
    expect(shouldRecordShot("resolving", "aiming", null)).toBe(false);
    expect(shouldRecordShot(null, "aiming", null)).toBe(false);
  });

  it("seeds once on first observation so a rejoin shows existing history", () => {
    expect(shouldRecordShot(null, "aiming", "potted a black coin")).toBe(true);
  });

  it("keeps two consecutive identical results as two separate shots", () => {
    // Both shots miss, so `lastShot` is the same string twice. Deduping on the
    // string would collapse them into one entry; the phase transition does not.
    expect(shouldRecordShot("resolving", "aiming", "no pot")).toBe(true);
    expect(shouldRecordShot("resolving", "aiming", "no pot")).toBe(true);
  });
});

describe("appendEntry", () => {
  it("appends in arrival order", () => {
    const out = appendEntry([entry(0, "first")], entry(1, "second"));
    expect(out.map((e) => e.text)).toEqual(["first", "second"]);
  });

  it("does not mutate the input", () => {
    const start = [entry(0)];
    appendEntry(start, entry(1));
    expect(start).toHaveLength(1);
  });

  it("holds the feed at FEED_LIMIT, dropping the oldest", () => {
    let feed: CarromFeedEntry[] = [];
    for (let i = 0; i < FEED_LIMIT + 10; i++) feed = appendEntry(feed, entry(i));
    expect(feed).toHaveLength(FEED_LIMIT);
    expect(feed[0].id).toBe(10);
    expect(feed[feed.length - 1].id).toBe(FEED_LIMIT + 9);
  });
});

describe("formatFeedClock", () => {
  it("formats the recorded instant, not the current time", () => {
    const at = new Date(2026, 7, 11, 14, 5).getTime();
    expect(formatFeedClock(at)).toBe("2:05 PM");
  });

  it("renders midnight as 12 AM rather than 0 AM", () => {
    expect(formatFeedClock(new Date(2026, 7, 11, 0, 7).getTime())).toBe("12:07 AM");
  });

  it("renders noon as 12 PM", () => {
    expect(formatFeedClock(new Date(2026, 7, 11, 12, 0).getTime())).toBe("12:00 PM");
  });
});
