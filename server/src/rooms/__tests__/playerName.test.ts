import { describe, it, expect } from "vitest";
import {
  MAX_PLAYER_NAME_LENGTH,
  isNameRefusal,
  isReservedGuestName,
  NAME_NOT_ALLOWED_ERROR,
  NAME_TAKEN_ERROR,
  playerNameKey,
  sanitizePlayerName,
} from "@shared/playerName.js";
import { guestDisplayName } from "@shared/guestIdentity.js";

// The invisible characters are built from code points on purpose: they must never appear in this file.
const ZERO_WIDTH_SPACE = String.fromCodePoint(0x200b);
const RIGHT_TO_LEFT_OVERRIDE = String.fromCodePoint(0x202e);
const NULL_CHARACTER = String.fromCodePoint(0x0000);
const FULL_WIDTH_ADMIN = String.fromCodePoint(0xff21, 0xff24, 0xff2d, 0xff29, 0xff2e);

describe("sanitizePlayerName", () => {
  it("leaves an ordinary name alone", () => {
    expect(sanitizePlayerName("Ravi")).toBe("Ravi");
  });

  it("trims and collapses whitespace, turning a newline or tab into a single space", () => {
    expect(sanitizePlayerName("  Ravi \n\t Kumar  ")).toBe("Ravi Kumar");
  });

  it("removes invisible and directional characters that let two names look identical", () => {
    const sneaky = `Ra${ZERO_WIDTH_SPACE}vi${RIGHT_TO_LEFT_OVERRIDE}${NULL_CHARACTER}`;

    expect(sanitizePlayerName(sneaky)).toBe("Ravi");
  });

  it("drops angle brackets so a name never reads as markup", () => {
    expect(sanitizePlayerName("<b>Ravi</b>")).toBe("bRavi/b");
  });

  it("folds full-width look-alikes to plain letters", () => {
    expect(sanitizePlayerName(FULL_WIDTH_ADMIN)).toBe("ADMIN");
  });

  it("caps by character, never splitting an emoji in half", () => {
    const rocket = String.fromCodePoint(0x1f680);
    const long = rocket.repeat(MAX_PLAYER_NAME_LENGTH + 5);

    const cleaned = sanitizePlayerName(long);

    expect(Array.from(cleaned)).toHaveLength(MAX_PLAYER_NAME_LENGTH);
    expect(cleaned).toBe(rocket.repeat(MAX_PLAYER_NAME_LENGTH));
  });

  it("returns an empty string for anything that is not text", () => {
    expect(sanitizePlayerName(undefined)).toBe("");
    expect(sanitizePlayerName(42)).toBe("");
    expect(sanitizePlayerName({ name: "Ravi" })).toBe("");
  });
});

describe("playerNameKey", () => {
  it("treats case and look-alikes as the same name", () => {
    expect(playerNameKey("ADMIN")).toBe(playerNameKey(FULL_WIDTH_ADMIN.toLowerCase()));
    expect(playerNameKey("Ravi")).toBe(playerNameKey("rAVI"));
  });
});

describe("isReservedGuestName", () => {
  it("refuses titles of authority however they are dressed up", () => {
    for (const name of ["Admin", "SYSTEM", "a d m i n", "mod.erator", FULL_WIDTH_ADMIN, "Host", "Bhalyam"]) {
      expect(isReservedGuestName(name), name).toBe(true);
    }
  });

  it("refuses the shape of the automatic name, which only its owner may carry", () => {
    expect(isReservedGuestName("Guest 12345678")).toBe(true);
    expect(isReservedGuestName("guest#7")).toBe(true);
  });

  it("lets a guest keep their OWN automatic name but nobody else's", () => {
    const mine = guestDisplayName("guest_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const theirs = guestDisplayName("guest_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

    expect(isReservedGuestName(mine, mine)).toBe(false);
    expect(isReservedGuestName(theirs, mine)).toBe(true);
  });

  it("refuses a name that is empty once cleaned", () => {
    expect(isReservedGuestName(ZERO_WIDTH_SPACE)).toBe(true);
  });

  it("allows an ordinary name", () => {
    expect(isReservedGuestName("Ravi")).toBe(false);
    expect(isReservedGuestName("Guesthouse")).toBe(false);
  });
});

describe("isNameRefusal", () => {
  it("recognises exactly the two name errors the server sends", () => {
    expect(isNameRefusal(NAME_TAKEN_ERROR)).toBe(true);
    expect(isNameRefusal(NAME_NOT_ALLOWED_ERROR)).toBe(true);
    expect(isNameRefusal("Room is full")).toBe(false);
    expect(isNameRefusal(undefined)).toBe(false);
  });
});
