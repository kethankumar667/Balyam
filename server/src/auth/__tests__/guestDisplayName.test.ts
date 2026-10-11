import { describe, it, expect } from "vitest";
import { guestDisplayName } from "@shared/guestIdentity.js";
import { newGuestPlayerId } from "../guestToken.js";

describe("guestDisplayName", () => {
  it("is 'Guest' plus an 8-digit serial", () => {
    expect(guestDisplayName("guest_0123456789abcdef")).toMatch(/^Guest [1-9]\d{7}$/);
  });

  it("is the same every time for the same guest, so the name is stable across rooms and screens", () => {
    const id = newGuestPlayerId();

    expect(guestDisplayName(id)).toBe(guestDisplayName(id));
  });

  it("differs between guests — a thousand random ids collide at most a handful of times", () => {
    const names = new Set(Array.from({ length: 1000 }, () => guestDisplayName(newGuestPlayerId())));

    expect(names.size).toBeGreaterThan(995);
  });

  it("fits the 20-character name limit used by every name field", () => {
    expect(guestDisplayName(newGuestPlayerId()).length).toBeLessThanOrEqual(20);
  });
});
