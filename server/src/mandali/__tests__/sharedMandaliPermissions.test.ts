import { describe, it, expect } from "vitest";
import { mandaliCapabilitiesFor } from "@shared/mandali/mandaliPermissions.js";

describe("mandaliCapabilitiesFor", () => {
  it("gives the owner every capability", () => {
    expect(mandaliCapabilitiesFor("OWNER")).toEqual({
      read: true,
      post: true,
      review: true,
      moderate: true,
      administer: true,
    });
  });

  it("stops admins at moderation — no administering", () => {
    const caps = mandaliCapabilitiesFor("ADMIN");
    expect(caps.review).toBe(true);
    expect(caps.moderate).toBe(true);
    expect(caps.administer).toBe(false);
  });

  it("lets members read and post only", () => {
    expect(mandaliCapabilitiesFor("MEMBER")).toEqual({
      read: true,
      post: true,
      review: false,
      moderate: false,
      administer: false,
    });
  });
});
