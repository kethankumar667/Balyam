import { afterEach, describe, expect, it } from "vitest";
import { isVoiceEnabled } from "../voiceFeature.js";

const original = process.env.VOICE_ENABLED;

afterEach(() => {
  if (original === undefined) delete process.env.VOICE_ENABLED;
  else process.env.VOICE_ENABLED = original;
});

describe("isVoiceEnabled", () => {
  it("is off when VOICE_ENABLED is unset", () => {
    delete process.env.VOICE_ENABLED;
    expect(isVoiceEnabled()).toBe(false);
  });

  it("is off for anything that is not an explicit yes", () => {
    for (const v of ["", "false", "0", "no", "off", "yes please"]) {
      process.env.VOICE_ENABLED = v;
      expect(isVoiceEnabled(), v).toBe(false);
    }
  });

  it("is on only for true or 1, ignoring case and spaces", () => {
    for (const v of ["true", "TRUE", " 1 ", "True"]) {
      process.env.VOICE_ENABLED = v;
      expect(isVoiceEnabled(), v).toBe(true);
    }
  });
});
