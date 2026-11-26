import { describe, expect, it } from "vitest";
import { formatRelativeDay } from "../relativeDay";

// 26 Nov 2026, local time. Built from parts so the test means the same thing in any time zone.
const at = (day: number, hour = 12, minute = 0, month = 10) => new Date(2026, month, day, hour, minute).getTime();
const NOW = at(26);

describe("formatRelativeDay", () => {
  it("calls a match from earlier the same calendar day Today", () => {
    expect(formatRelativeDay(at(26, 0, 5), NOW)).toBe("Today");
  });

  it("counts calendar days, not 24-hour spans: 23:50 is Yesterday ten minutes after midnight", () => {
    expect(formatRelativeDay(at(25, 23, 50), at(26, 0, 10))).toBe("Yesterday");
  });

  it("says how many days ago for the rest of the week", () => {
    expect(formatRelativeDay(at(25), NOW)).toBe("Yesterday");
    expect(formatRelativeDay(at(23), NOW)).toBe("3 days ago");
    expect(formatRelativeDay(at(20), NOW)).toBe("6 days ago");
  });

  it("switches to a plain date from a week back", () => {
    const label = formatRelativeDay(at(19), NOW);
    expect(label).toMatch(/Nov/);
    expect(label).not.toMatch(/ago/);
  });

  it("does not invent a date when the match has none", () => {
    expect(formatRelativeDay(undefined, NOW)).toBe("Recorded match");
    expect(formatRelativeDay(0, NOW)).toBe("Recorded match");
  });

  it("reads a timestamp slightly in the future (clock skew) as Today", () => {
    expect(formatRelativeDay(at(27, 0, 1), NOW)).toBe("Today");
  });
});
