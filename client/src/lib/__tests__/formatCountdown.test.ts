import { describe, it, expect } from "vitest";
import { formatCountdown } from "../formatCountdown";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("formatCountdown", () => {
  it("shows hours, minutes and seconds for the full 4-hour window", () => {
    expect(formatCountdown(4 * HOUR)).toBe("4h 0m 0s");
  });

  it("drops the hours once under an hour", () => {
    expect(formatCountdown(42 * MINUTE + 10 * SECOND)).toBe("42m 10s");
  });

  it("shows only seconds under a minute", () => {
    expect(formatCountdown(9 * SECOND)).toBe("9s");
  });

  it("rounds a partial second up so it never shows 0s while time remains", () => {
    expect(formatCountdown(1)).toBe("1s");
    expect(formatCountdown(3 * HOUR + 59 * MINUTE + 59 * SECOND + 400)).toBe("4h 0m 0s");
  });

  it("is 0s at zero and never negative", () => {
    expect(formatCountdown(0)).toBe("0s");
    expect(formatCountdown(-5000)).toBe("0s");
  });
});
