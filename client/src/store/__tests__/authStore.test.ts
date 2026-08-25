import { describe, it, expect } from "vitest";
import { metadataDisplayName } from "../authStore";

describe("metadataDisplayName", () => {
  it("prefers display_name (our own signup form) when present", () => {
    expect(
      metadataDisplayName({ display_name: "Kethan Kumar", full_name: "Kethan K.", name: "Kethan" }),
    ).toBe("Kethan Kumar");
  });

  it("falls back to full_name (Google OAuth) when display_name is absent", () => {
    expect(metadataDisplayName({ full_name: "Kethan Kumar", name: "Kethan" })).toBe("Kethan Kumar");
  });

  it("falls back to name when neither display_name nor full_name is present", () => {
    expect(metadataDisplayName({ name: "Kethan Kumar" })).toBe("Kethan Kumar");
  });

  it("trims whitespace", () => {
    expect(metadataDisplayName({ display_name: "  Kethan Kumar  " })).toBe("Kethan Kumar");
  });

  it("returns null for missing, empty, non-string, or whitespace-only metadata", () => {
    expect(metadataDisplayName(null)).toBeNull();
    expect(metadataDisplayName(undefined)).toBeNull();
    expect(metadataDisplayName({})).toBeNull();
    expect(metadataDisplayName({ display_name: "" })).toBeNull();
    expect(metadataDisplayName({ display_name: "   " })).toBeNull();
    expect(metadataDisplayName({ display_name: 12345 })).toBeNull();
  });

  it("regression: this is what stops a stale local guest nickname from permanently overwriting a real signup/OAuth name on first sign-in", () => {
    // The exact bug scenario: a browser has "Jetpacker" sitting in local
    // guest-play state, and the account being signed into has a real name
    // from Google OAuth metadata. The real name must win.
    const meta = { full_name: "Kethan Kumar" };
    const localGuestNickname = "Jetpacker";
    const resolved = metadataDisplayName(meta) || localGuestNickname;
    expect(resolved).toBe("Kethan Kumar");
  });
});
