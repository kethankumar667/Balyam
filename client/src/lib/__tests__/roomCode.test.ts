import { describe, expect, it } from "vitest";
import {
  isCompleteRoomCode,
  normalizeRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from "../roomCode";

/**
 * What a player has in hand, turned into a code.
 *
 * The failure being guarded against is the slow one rather than the loud one:
 * a code that looks right, is accepted by the box, and only fails after a
 * round trip to the server. Every case below is something a real player
 * arrives with — a link from WhatsApp, a code with a space in it, a letter
 * the generator can never emit.
 */

describe("normalizeRoomCode", () => {
  it("uppercases what was typed in lower case", () => {
    expect(normalizeRoomCode("abc234")).toBe("ABC234");
  });

  it("drops characters the generator can never produce", () => {
    // I, O, 0 and 1 are excluded from the alphabet precisely because they are
    // misread; letting them sit in the box guarantees a failed join.
    expect(normalizeRoomCode("A0B1C2")).toBe("ABC2");
    expect(normalizeRoomCode("IOIO")).toBe("");
  });

  it("strips the spaces and dashes people add while reading aloud", () => {
    expect(normalizeRoomCode("ABC 234")).toBe("ABC234");
    expect(normalizeRoomCode("ABC-234")).toBe("ABC234");
  });

  it("pulls the code out of a pasted invite link", () => {
    // This is the fastest path into a room — the host's Share Link button —
    // and it was the one thing the old six-character box could not accept.
    expect(normalizeRoomCode("https://bhalyam.example.com/room/ABC234")).toBe("ABC234");
    expect(normalizeRoomCode("http://localhost:5173/room/ABC234")).toBe("ABC234");
    expect(normalizeRoomCode("/room/ABC234")).toBe("ABC234");
  });

  it("survives what a chat app appends to a shared link", () => {
    expect(normalizeRoomCode("https://bhalyam.example.com/room/ABC234/")).toBe("ABC234");
    expect(normalizeRoomCode("https://bhalyam.example.com/room/ABC234?utm=wa")).toBe("ABC234");
    expect(normalizeRoomCode("https://bhalyam.example.com/room/ABC234#top")).toBe("ABC234");
  });

  it("never returns more than a full code", () => {
    expect(normalizeRoomCode("ABC234EXTRA")).toHaveLength(ROOM_CODE_LENGTH);
  });

  it("returns something safe to put straight back in the input", () => {
    // Whatever comes out must be re-normalizable to itself, or typing would
    // fight the box.
    for (const raw of ["abc234", "A0B1C2", "https://x.dev/room/ZZZ999", "!!!"]) {
      const once = normalizeRoomCode(raw);
      expect(normalizeRoomCode(once)).toBe(once);
    }
  });
});

describe("isCompleteRoomCode", () => {
  it("accepts a full code from the real alphabet", () => {
    expect(isCompleteRoomCode("ABC234")).toBe(true);
  });

  it("rejects a half-typed code", () => {
    expect(isCompleteRoomCode("ABC")).toBe(false);
    expect(isCompleteRoomCode("")).toBe(false);
  });

  it("rejects the right length made of wrong characters", () => {
    expect(isCompleteRoomCode("ABC01O")).toBe(false);
  });

  it("gives the same answer every time it is asked", () => {
    // A shared /g/ regex would alternate here via lastIndex — the exact bug
    // the two-regex split in roomCode.ts exists to prevent.
    for (let i = 0; i < 5; i++) expect(isCompleteRoomCode("ABC234")).toBe(true);
    for (let i = 0; i < 5; i++) expect(isCompleteRoomCode("ABC01O")).toBe(false);
  });

  it("agrees with the alphabet the server generates from", () => {
    const full = ROOM_CODE_ALPHABET.slice(0, ROOM_CODE_LENGTH);
    expect(isCompleteRoomCode(full)).toBe(true);
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[IO01]/);
  });
});
