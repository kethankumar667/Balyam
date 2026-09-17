import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mandaliFlags } from "../flags.js";

const FLAG_KEYS = [
  "MANDALI_ENABLED",
  "MANDALI_GROUPS",
  "MANDALI_CHAT",
  "MANDALI_COIN_REQUESTS",
  "MANDALI_DONATIONS",
  "MANDALI_PRIVATE_GAMES",
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of FLAG_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of FLAG_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("mandaliFlags", () => {
  it("reads every action off when nothing is configured", () => {
    expect(mandaliFlags()).toEqual({
      enabled: false,
      groups: false,
      chat: false,
      coinRequests: false,
      donations: false,
      privateGames: false,
    });
  });

  it("ignores values other than an explicit true — blank, mistyped, casing apart", () => {
    process.env.MANDALI_ENABLED = "TRUE";
    process.env.MANDALI_GROUPS = "1";
    process.env.MANDALI_CHAT = "yes";
    process.env.MANDALI_COIN_REQUESTS = "on";
    process.env.MANDALI_PRIVATE_GAMES = " true ";
    const flags = mandaliFlags();
    expect(flags.enabled).toBe(true);
    expect(flags.groups).toBe(false);
    expect(flags.chat).toBe(false);
    expect(flags.coinRequests).toBe(false);
    // Trimmed, case-normalized "true" is the one spelling that counts.
    expect(flags.privateGames).toBe(true);
  });

  it("keeps child flags off while the master switch is off", () => {
    process.env.MANDALI_ENABLED = "false";
    process.env.MANDALI_GROUPS = "true";
    process.env.MANDALI_CHAT = "true";
    expect(mandaliFlags().groups).toBe(false);
    expect(mandaliFlags().chat).toBe(false);
  });

  it("opens a child flag only under master + child both true", () => {
    process.env.MANDALI_ENABLED = "true";
    process.env.MANDALI_COIN_REQUESTS = "true";
    expect(mandaliFlags().coinRequests).toBe(true);
  });

  it("keeps donations off unless both the master and the donation flag say true", () => {
    process.env.MANDALI_ENABLED = "true";
    expect(mandaliFlags().donations).toBe(false);
    process.env.MANDALI_DONATIONS = "true";
    expect(mandaliFlags().donations).toBe(true);
    process.env.MANDALI_ENABLED = "false";
    expect(mandaliFlags().donations).toBe(false);
  });
});
