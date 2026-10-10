import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RETIRED_STORAGE_KEYS, purgeRetiredStorage } from "../retiredStorage";

/**
 * Vouchers are gone, and so is the storage that held a guest's unredeemed one. A browser that
 * played before the change still has those keys, holding a code that can never be redeemed.
 * They were never declared in the privacy inventory, so nothing else would ever clear them:
 * they are removed once, on start, from both kinds of browser storage.
 */
describe("purgeRetiredStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("names the three keys the voucher feature used", () => {
    expect([...RETIRED_STORAGE_KEYS].sort()).toEqual([
      "bhalyam.pending_voucher_amount",
      "bhalyam.pending_voucher_code",
      "bhalyam.pending_vouchers",
    ]);
  });

  it("removes a leftover voucher from localStorage and from sessionStorage", () => {
    window.localStorage.setItem("bhalyam.pending_vouchers", JSON.stringify([{ code: "OLD-CODE", amount: "150" }]));
    window.sessionStorage.setItem("bhalyam.pending_vouchers", JSON.stringify([{ code: "OLD-CODE", amount: "150" }]));
    window.localStorage.setItem("bhalyam.pending_voucher_code", "OLD-CODE");
    window.localStorage.setItem("bhalyam.pending_voucher_amount", "150");

    purgeRetiredStorage();

    for (const key of RETIRED_STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
      expect(window.sessionStorage.getItem(key)).toBeNull();
    }
  });

  it("leaves every other key alone", () => {
    window.localStorage.setItem("mpg.playerId", "p_123_abc");
    window.localStorage.setItem("bhalyam.session", "tokens");
    window.localStorage.setItem("bhalyam.pending_vouchers", "[]");

    purgeRetiredStorage();

    expect(window.localStorage.getItem("mpg.playerId")).toBe("p_123_abc");
    expect(window.localStorage.getItem("bhalyam.session")).toBe("tokens");
  });

  it("does nothing, and does not throw, when there is nothing to remove", () => {
    expect(() => purgeRetiredStorage()).not.toThrow();
  });

  it("does not throw when storage is blocked", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage blocked");
      },
    });
    try {
      expect(() => purgeRetiredStorage()).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
