import { describe, expect, it } from "vitest";
import { SocketRateLimiter } from "../rateLimiter.js";

describe("SocketRateLimiter", () => {
  it("allows requests within capacity", () => {
    const limiter = new SocketRateLimiter(5, 2);
    const res1 = limiter.consume("s1");
    expect(res1.allowed).toBe(true);
    expect(res1.remainingTokens).toBe(4);
    limiter.destroy();
  });

  it("rejects requests exceeding capacity", () => {
    const limiter = new SocketRateLimiter(2, 1);
    expect(limiter.consume("s1").allowed).toBe(true);
    expect(limiter.consume("s1").allowed).toBe(true);
    expect(limiter.consume("s1").allowed).toBe(false);
    limiter.destroy();
  });
});
