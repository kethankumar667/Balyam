import { describe, it, expect } from "vitest";
import { isLowEndDevice, scaledCount } from "../deviceTier";

describe("device tier for celebrations", () => {
  it("treats a browser that reports nothing as capable, so it gets the full effect", () => {
    expect(isLowEndDevice({})).toBe(false);
    expect(scaledCount(44, {})).toBe(44);
  });

  it("halves the particles on a phone with four or fewer cores", () => {
    expect(isLowEndDevice({ hardwareConcurrency: 4 })).toBe(true);
    expect(scaledCount(44, { hardwareConcurrency: 4 })).toBe(22);
  });

  it("halves them on a device with 2 GB of memory or less", () => {
    expect(scaledCount(36, { deviceMemory: 2 })).toBe(18);
    expect(scaledCount(36, { deviceMemory: 8 })).toBe(36);
  });

  it("halves them when the player has turned on data saver", () => {
    expect(scaledCount(36, { connection: { saveData: true } })).toBe(18);
  });

  it("keeps a capable device at full strength", () => {
    expect(isLowEndDevice({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(false);
    expect(scaledCount(44, { hardwareConcurrency: 8, deviceMemory: 8 })).toBe(44);
  });

  it("never drops below a count that still reads as a celebration", () => {
    expect(scaledCount(10, { hardwareConcurrency: 2 })).toBe(8);
  });

  it("ignores meaningless values rather than treating them as a weak device", () => {
    expect(isLowEndDevice({ hardwareConcurrency: 0, deviceMemory: 0 })).toBe(false);
  });
});
