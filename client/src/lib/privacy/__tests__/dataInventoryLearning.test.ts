import { describe, it, expect } from "vitest";
import { DATA_INVENTORY } from "../dataInventory";
import { getAllAcademySpecs } from "../../../features/academy/data";

/**
 * The Game Academy remembers, per game, that a player finished its walkthrough
 * (`bhalyam.academy.<game>.v2`). Under the DPDP rule every stored key must be in
 * the inventory, or the privacy notice under-declares and the player's own data
 * export lists it as "undeclared". This guard derives the expected keys from the
 * academy catalog itself, so adding a game to the academy without declaring its
 * key fails here instead of shipping quietly.
 */
describe("privacy inventory — learning & onboarding keys", () => {
  const declared = new Map(DATA_INVENTORY.map((entry) => [entry.key, entry]));

  it("declares the completion key of every Game Academy walkthrough", () => {
    const specs = getAllAcademySpecs();
    expect(specs.length).toBeGreaterThan(0);
    const missing = specs.map((spec) => spec.storageKey).filter((key) => !declared.has(key));
    expect(missing).toEqual([]);
  });

  it.each([
    "uno.tutorial.completed.v2",
    "handcricket.tutorial.completed.v1",
    "snl.tutorial.completed.v1",
    "rps.tutorial.completed.v1",
    "dotsboxes.tutorial.completed.v1",
    "stargame.tutorial.completed.v1",
    "snake.tutorial.completed.v1",
    "bhalyam.onboarding.state",
  ])("declares %s", (key) => {
    expect(declared.has(key)).toBe(true);
  });

  it("never marks any of these as personal data", () => {
    const keys = [...getAllAcademySpecs().map((spec) => spec.storageKey), "bhalyam.onboarding.state"];
    for (const key of keys) {
      expect(declared.get(key)?.isPersonalData, key).toBe(false);
    }
  });

  it("does not declare the same key twice", () => {
    const keys = DATA_INVENTORY.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
