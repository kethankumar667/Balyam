import { describe, it, expect } from "vitest";
import {
  PASSWORD_MIN,
  scorePassword,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
  validatePasswordPresent,
} from "../authValidation";

describe("validateEmail", () => {
  it("accepts ordinary addresses", () => {
    for (const ok of [
      "a@b.co",
      "sri.krishna@gmail.com",
      "player+bhalyam@example.co.in",
      "name_with_underscore@sub.domain.org",
    ]) {
      expect(validateEmail(ok)).toBeNull();
    }
  });

  it("accepts the shapes a stricter regex would wrongly reject", () => {
    // Locking a real user out of their own account is the expensive failure,
    // so these must pass.
    expect(validateEmail("user+tag@example.com")).toBeNull();
    expect(validateEmail("o'brien@example.ie")).toBeNull();
    expect(validateEmail("PLAYER@EXAMPLE.COM")).toBeNull();
  });

  it("rejects what a typo actually produces", () => {
    expect(validateEmail("")).toMatch(/enter your email/i);
    expect(validateEmail("   ")).toMatch(/enter your email/i);
    expect(validateEmail("no-at-sign.com")).toBeTruthy();
    expect(validateEmail("missing@domain")).toBeTruthy();
    expect(validateEmail("two@@example.com")).toBeTruthy();
    expect(validateEmail("trailing@dot.")).toBeTruthy();
  });

  it("names the space rather than the shape when that is the problem", () => {
    // Copy-paste from a contacts app is where this comes from, and "that
    // doesn't look like an email" would send the user hunting for the wrong
    // thing.
    expect(validateEmail("sri krishna@example.com")).toMatch(/space/i);
  });

  it("ignores surrounding whitespace", () => {
    expect(validateEmail("  player@example.com  ")).toBeNull();
  });
});

describe("validateName", () => {
  it("accepts a normal table name", () => {
    expect(validateName("Sri Krishna")).toBeNull();
    expect(validateName("Ravi")).toBeNull();
  });

  it("holds the same 20-character cap as a seat at the table", () => {
    expect(validateName("A".repeat(20))).toBeNull();
    expect(validateName("A".repeat(21))).toMatch(/20 characters/);
  });

  it("rejects empty and one-character names", () => {
    expect(validateName("")).toBeTruthy();
    expect(validateName("   ")).toBeTruthy();
    expect(validateName("R")).toMatch(/short/i);
  });
});

describe("validatePassword", () => {
  it("states the minimum up front", () => {
    expect(validatePassword("short")).toContain(String(PASSWORD_MIN));
  });

  it("accepts anything long enough, including a passphrase", () => {
    expect(validatePassword("correct horse battery")).toBeNull();
    expect(validatePassword("12345678")).toBeNull();
  });

  it("catches an edge space, which is invisible and breaks the next sign-in", () => {
    expect(validatePassword(" leadingspace")).toMatch(/space/i);
    expect(validatePassword("trailingspace ")).toMatch(/space/i);
  });

  it("does not lecture on the sign-in form", () => {
    // Sign-in only needs a value; the account's password already exists and
    // telling someone it is too short is both useless and confusing.
    expect(validatePasswordPresent("x")).toBeNull();
    expect(validatePasswordPresent("")).toMatch(/enter your password/i);
  });
});

describe("validatePasswordConfirm", () => {
  it("passes when they match", () => {
    expect(validatePasswordConfirm("hunter2hunter2", "hunter2hunter2")).toBeNull();
  });
  it("flags a mismatch and an empty confirmation differently", () => {
    expect(validatePasswordConfirm("hunter2hunter2", "")).toMatch(/re-type/i);
    expect(validatePasswordConfirm("hunter2hunter2", "hunter2hunter3")).toMatch(/match/i);
  });
});

describe("scorePassword", () => {
  it("says nothing about an empty box", () => {
    expect(scorePassword("")).toEqual({ score: 0, label: "weak", hint: null });
  });

  it("rates length above punctuation theatre", () => {
    const passphrase = scorePassword("orange table monday");
    const gibberish = scorePassword("Xk9$a");
    expect(passphrase.score).toBeGreaterThan(gibberish.score);
  });

  it("climbs with length and variety", () => {
    // Deliberately not alphabet runs — "abcdefghij…" is clamped as a run
    // below, which is correct and would mask what this test is checking.
    expect(scorePassword("bhalyamx").label).toBe("weak");
    expect(scorePassword("bhalyamx1").label).toBe("fair");
    expect(scorePassword("bhalyamgame12").label).toBe("good");
    expect(scorePassword("Bhalyamgame12!").label).toBe("strong");
  });

  it("refuses to call a long repeat or a keyboard run strong", () => {
    expect(scorePassword("aaaaaaaaaaaaaaaaaaaa").label).toBe("weak");
    expect(scorePassword("qwertyuiop").label).toBe("weak");
    expect(scorePassword("0123456789").label).toBe("weak");
  });

  it("gives one actionable hint, and stops once there is nothing to say", () => {
    expect(scorePassword("abcdefgh").hint).toMatch(/longer/i);
    expect(scorePassword("aaaaaaaaaaaa1").hint).toBeNull();
    expect(scorePassword("Abcdefghij12!").hint).toBeNull();
  });

  it("never exceeds the meter it drives", () => {
    for (const p of ["a", "Abcdefghij12!", "x".repeat(200), "P@ssw0rd!!!!!!!!!!!!"]) {
      const { score } = scorePassword(p);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });
});
