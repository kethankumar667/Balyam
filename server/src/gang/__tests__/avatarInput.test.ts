import { describe, it, expect } from "vitest";
import { AVATAR_FILES, isKnownAvatar } from "@shared/avatars.js";
import { DEFAULT_MEMBER_AVATAR, memberAvatar } from "../avatarInput.js";

describe("memberAvatar", () => {
  it("keeps an avatar from the app's own list", () => {
    expect(memberAvatar(AVATAR_FILES[7])).toBe(AVATAR_FILES[7]);
  });

  it("falls back to the default when nothing was sent", () => {
    expect(memberAvatar(undefined)).toBe(DEFAULT_MEMBER_AVATAR);
    expect(memberAvatar("")).toBe(DEFAULT_MEMBER_AVATAR);
    expect(memberAvatar(null)).toBe(DEFAULT_MEMBER_AVATAR);
  });

  it("the default is itself on the list, so it can always be shown", () => {
    expect(isKnownAvatar(DEFAULT_MEMBER_AVATAR)).toBe(true);
  });

  it.each([
    ["an off-site address", "https://attacker.example/pixel.png"],
    ["a protocol-relative address", "//attacker.example/pixel.png"],
    ["a path out of the avatar folder", "../../secret.jpg"],
    ["an absolute path", "/Avatars/../index.html"],
    ["a script address", "javascript:alert(1)"],
    ["a made-up filename", "not-an-avatar.jpg"],
  ])("refuses %s and uses the default instead", (_label, sent) => {
    expect(memberAvatar(sent)).toBe(DEFAULT_MEMBER_AVATAR);
  });

  it.each([[42], [{}], [["a"]], [true]])("refuses a value that is not text (%j)", (sent) => {
    expect(memberAvatar(sent)).toBe(DEFAULT_MEMBER_AVATAR);
  });
});
