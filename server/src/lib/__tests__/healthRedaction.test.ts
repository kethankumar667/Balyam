import { describe, it, expect } from "vitest";
import { REDACTED_ERROR, redactLastErrors } from "../healthRedaction.js";

/**
 * `GET /health` is public (uptime pingers and every runbook read it), and two of its sections carry a raw
 * `lastError`: text such as `settle(match-123): <whatever the database said>`. The counts and timestamps are what
 * an operator watches; the text is for the server log, not for anyone who can spell the URL.
 */

describe("redactLastErrors", () => {
  it("replaces the text of a lastError, wherever it sits", () => {
    const health = {
      status: "healthy",
      progression: { durable: true, sync: { failed: 2, lastError: "PostgREST 409 on match_participants: duplicate key" } },
      economy: { queue: { failed: 1, lastError: "settle(match-123): connection refused", lastErrorAt: 1730000000000 } },
    };

    const safe = redactLastErrors(health);

    expect(safe.progression.sync.lastError).toBe(REDACTED_ERROR);
    expect(safe.economy.queue.lastError).toBe(REDACTED_ERROR);
    expect(JSON.stringify(safe)).not.toMatch(/PostgREST|match-123|connection refused/);
  });

  it("keeps every count, flag and timestamp an operator watches", () => {
    const safe = redactLastErrors({
      status: "healthy",
      economy: { queue: { failed: 3, pending: 1, lastError: "boom", lastErrorAt: 42 } },
      progression: { durable: false },
    });

    expect(safe.economy.queue).toMatchObject({ failed: 3, pending: 1, lastErrorAt: 42 });
    expect(safe.progression.durable).toBe(false);
    expect(safe.status).toBe("healthy");
  });

  it("leaves a lastError that is null alone, so 'no error yet' still reads as none", () => {
    expect(redactLastErrors({ sync: { lastError: null } }).sync.lastError).toBeNull();
  });

  it("reaches into arrays", () => {
    const safe = redactLastErrors({ workers: [{ lastError: "a" }, { lastError: null }] });

    expect(safe.workers[0].lastError).toBe(REDACTED_ERROR);
    expect(safe.workers[1].lastError).toBeNull();
  });

  it("does not change the object it is given", () => {
    const original = { queue: { lastError: "secret detail" } };

    redactLastErrors(original);

    expect(original.queue.lastError).toBe("secret detail");
  });

  it("passes plain values through", () => {
    expect(redactLastErrors("ok")).toBe("ok");
    expect(redactLastErrors(7)).toBe(7);
    expect(redactLastErrors(null)).toBeNull();
  });
});
