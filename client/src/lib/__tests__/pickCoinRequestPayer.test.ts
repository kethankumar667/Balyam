import { describe, it, expect } from "vitest";
import type { MandaliMember } from "@shared/mandali/types.js";
import { pickCoinRequestPayer } from "../pickCoinRequestPayer";

const member = (playerId: string, role: string, joinedAt: number, state = "ACTIVE"): MandaliMember =>
  ({
    memberId: `m:${playerId}`, mandaliId: "m", playerId, displayName: playerId, avatar: "a1",
    role, state, joinedAt, presence: "online", contributionScore: 0,
  }) as MandaliMember;

describe("pickCoinRequestPayer", () => {
  it("asks the owner first", () => {
    const members = [member("me", "MEMBER", 1), member("admin", "ADMIN", 2), member("owner", "OWNER", 3)];

    expect(pickCoinRequestPayer(members, "me")?.playerId).toBe("owner");
  });

  it("asks an admin when the requester is the owner", () => {
    const members = [member("owner", "OWNER", 1), member("plain", "MEMBER", 2), member("admin", "ADMIN", 3)];

    expect(pickCoinRequestPayer(members, "owner")?.playerId).toBe("admin");
  });

  it("falls back to the longest-standing member, not whoever is first in the list", () => {
    const members = [member("owner", "OWNER", 1), member("newer", "MEMBER", 20), member("older", "MEMBER", 10)];

    expect(pickCoinRequestPayer(members, "owner")?.playerId).toBe("older");
  });

  it("never picks the requester or someone who has left", () => {
    const members = [member("me", "OWNER", 1), member("gone", "ADMIN", 2, "LEFT"), member("banned", "MEMBER", 3, "BANNED")];

    expect(pickCoinRequestPayer(members, "me")).toBeUndefined();
  });

  it("does not depend on the order of the list", () => {
    const a = [member("x", "MEMBER", 5), member("owner", "OWNER", 9)];
    const b = [...a].reverse();

    expect(pickCoinRequestPayer(a, "me")?.playerId).toBe(pickCoinRequestPayer(b, "me")?.playerId);
  });
});
