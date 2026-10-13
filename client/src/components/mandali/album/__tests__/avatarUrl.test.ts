import { describe, it, expect } from "vitest";
import { FALLBACK_AVATAR, getAvatarUrl } from "../avatarUrl";

describe("getAvatarUrl", () => {
  describe("what keeps working", () => {
    it("shows the logo when there is no avatar", () => {
      expect(getAvatarUrl(undefined)).toBe(FALLBACK_AVATAR);
      expect(getAvatarUrl("")).toBe(FALLBACK_AVATAR);
    });

    it("puts a plain filename under the avatar folder", () => {
      expect(getAvatarUrl("file_0000000084c48208b1f893419d784cf2_1.jpg")).toBe(
        "/Avatars/file_0000000084c48208b1f893419d784cf2_1.jpg",
      );
      expect(getAvatarUrl("photo.webp")).toBe("/Avatars/photo.webp");
    });

    it("assumes a bare name is a .png", () => {
      expect(getAvatarUrl("rajesh")).toBe("/Avatars/rajesh.png");
      expect(getAvatarUrl("avatar_1")).toBe("/Avatars/avatar_1.png");
    });

    it("lets a path inside the avatar folder, and the logo, through", () => {
      expect(getAvatarUrl("/Avatars/a.png")).toBe("/Avatars/a.png");
      expect(getAvatarUrl(FALLBACK_AVATAR)).toBe(FALLBACK_AVATAR);
    });
  });

  describe("what must never be loaded as someone's picture", () => {
    // Anything off-site makes every viewer's browser fetch it, which hands the
    // address's owner each viewer's IP address and browser details.
    it.each([
      ["an off-site address", "https://attacker.example/pixel.png"],
      ["an insecure off-site address", "http://attacker.example/pixel.png"],
      ["a protocol-relative address", "//attacker.example/pixel.png"],
      ["a backslash-relative address", "\\\\attacker.example\\pixel.png"],
      ["a path out of the avatar folder", "/Avatars/../index.html"],
      ["an unrelated same-site path", "/api/profile/someone"],
      ["a relative path with folders", "../../secret.jpg"],
      ["a data address", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
      ["a script address", "javascript:alert(1)"],
      ["a name with a folder in it", "folder/photo.png"],
      ["a name that is only dots", ".."],
      ["a name that starts with a dot", ".hidden.png"],
    ])("falls back to the logo for %s", (_label, avatar) => {
      expect(getAvatarUrl(avatar)).toBe(FALLBACK_AVATAR);
    });
  });
});
