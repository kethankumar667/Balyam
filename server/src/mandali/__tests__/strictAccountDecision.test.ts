import { describe, it, expect } from "vitest";
import { decideStrictAccount } from "../strictAccount.js";

const ACCOUNT = { userId: "u-123", email: "a@example.com" };

describe("decideStrictAccount", () => {
  it("refuses an unavailable outcome — we could not ask, so we did not authorize", () => {
    expect(decideStrictAccount({ kind: "unavailable" })).toEqual({ ok: false });
  });

  it("refuses an ineligible outcome even though an account would have resolved", () => {
    expect(decideStrictAccount({ kind: "ineligible" })).toEqual({ ok: false });
  });

  it("accepts an eligible outcome and returns the provider-derived account", () => {
    expect(decideStrictAccount({ kind: "eligible", account: ACCOUNT })).toEqual({
      ok: true,
      account: ACCOUNT,
    });
  });
});
