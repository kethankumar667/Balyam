import { describe, it, expect } from "vitest";
import { TEST_ACCOUNTS, TEST_ACCOUNTS_PASSWORD } from "../testAccounts";
import { AVATAR_FILES } from "@shared/avatars";

describe("Real-Time Testing Accounts", () => {
  it("defines exactly 10 testing accounts", () => {
    expect(TEST_ACCOUNTS.length).toBe(10);
  });

  it("assigns unique IDs, names, and emails to all accounts", () => {
    const ids = new Set(TEST_ACCOUNTS.map((a) => a.id));
    const names = new Set(TEST_ACCOUNTS.map((a) => a.name));
    const emails = new Set(TEST_ACCOUNTS.map((a) => a.email));

    expect(ids.size).toBe(10);
    expect(names.size).toBe(10);
    expect(emails.size).toBe(10);
  });

  it("uses valid password and authentic avatar filenames from AVATAR_FILES", () => {
    expect(TEST_ACCOUNTS_PASSWORD).toBe("Bhalyam@2026");

    for (const acc of TEST_ACCOUNTS) {
      expect(acc.password).toBe("Bhalyam@2026");
      expect(acc.email).toMatch(/^tester\d+@bhalyam\.com$/);
      expect(AVATAR_FILES).toContain(acc.avatarFile);
    }
  });
});
