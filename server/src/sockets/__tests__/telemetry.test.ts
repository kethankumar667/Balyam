import { describe, expect, it } from "vitest";
import {
  CLIENT_TELEMETRY_MAX_DURATION_MS,
  sanitizeClientTelemetry,
} from "../telemetry.js";

describe("sanitizeClientTelemetry", () => {
  it("keeps finite non-negative durations", () => {
    expect(sanitizeClientTelemetry({ pageLoadMs: 1234, roomLoadMs: 0, boardLoadMs: 56.5 })).toEqual({
      pageLoadMs: 1234,
      roomLoadMs: 0,
      boardLoadMs: 56.5,
    });
  });

  it("drops absent, non-numeric, negative, and non-finite values", () => {
    expect(
      sanitizeClientTelemetry({
        pageLoadMs: -1,
        roomLoadMs: Number.NaN,
        boardLoadMs: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({});
    expect(sanitizeClientTelemetry(undefined)).toEqual({});
    expect(sanitizeClientTelemetry(null)).toEqual({});
    expect(sanitizeClientTelemetry({ pageLoadMs: "fast" as unknown as number })).toEqual({});
  });

  it("caps extreme values at the documented maximum", () => {
    const capped = sanitizeClientTelemetry({ pageLoadMs: Number.MAX_SAFE_INTEGER });
    expect(capped.pageLoadMs).toBe(CLIENT_TELEMETRY_MAX_DURATION_MS);
  });

  it("ignores unknown fields", () => {
    const extra = sanitizeClientTelemetry({ pageLoadMs: 5, secret: "x" } as Record<string, unknown>);
    expect(extra).toEqual({ pageLoadMs: 5 });
    expect(Object.keys(extra)).not.toContain("secret");
  });
});
