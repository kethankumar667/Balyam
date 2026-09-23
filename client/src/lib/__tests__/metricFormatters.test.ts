import { describe, it, expect } from "vitest";
import { formatGameMetricValue } from "../metricFormatters";

describe("formatGameMetricValue", () => {
  it("shows a placeholder for undefined, null, and empty-string values", () => {
    expect(formatGameMetricValue(undefined)).toBe("-");
    expect(formatGameMetricValue(null)).toBe("-");
    expect(formatGameMetricValue("")).toBe("-");
  });

  it("never renders a numeric NaN as the literal text 'NaN'", () => {
    expect(formatGameMetricValue(NaN, "raw_number")).toBe("-");
    expect(formatGameMetricValue(NaN, "percentage")).toBe("-");
    expect(formatGameMetricValue(0 / 0, "duration_seconds")).toBe("-");
  });

  it("carries seconds into minutes instead of overflowing to '60s'", () => {
    // 119.5s used to round to mins=1, secs=60 -> "1m 60s"
    expect(formatGameMetricValue(119.5, "duration_seconds")).toBe("2m 00s");
    // 59.6 rounds to a full 60s, which is exactly 1 minute, not "60s"
    expect(formatGameMetricValue(59.6, "duration_seconds")).toBe("1m 00s");
    expect(formatGameMetricValue(59.4, "duration_seconds")).toBe("59s");
    expect(formatGameMetricValue(65, "duration_seconds")).toBe("1m 05s");
    expect(formatGameMetricValue(30, "duration_seconds")).toBe("30s");
  });

  it("formats raw numbers with thousands separators", () => {
    expect(formatGameMetricValue(2048, "raw_number")).toBe("2,048");
  });

  it("formats percentage, discs, and boxes with their unit suffix", () => {
    expect(formatGameMetricValue(42, "percentage")).toBe("42%");
    expect(formatGameMetricValue(7, "discs")).toBe("7 discs");
    expect(formatGameMetricValue(3, "boxes")).toBe("3 boxes");
  });

  it("special-cases zero penalty points as a distinct label", () => {
    expect(formatGameMetricValue(0, "penalty_pts")).toBe("0 (Pure Show)");
    expect(formatGameMetricValue(15, "penalty_pts")).toBe("15 pts");
  });
});
