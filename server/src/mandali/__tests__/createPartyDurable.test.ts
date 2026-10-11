import { describe, it, expect, vi } from "vitest";
import type { MandaliMember } from "@shared/mandali/types.js";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";

const member = (over: Partial<MandaliMember> = {}): MandaliMember => ({
  memberId: "m1",
  mandaliId: "g1",
  playerId: "p1",
  displayName: "Geetha Priya",
  avatar: "geetha.png",
  role: "MEMBER",
  state: "ACTIVE",
  joinedAt: 1,
  presence: "online",
  contributionScore: 0,
  ...over,
});

/**
 * In a durable group the members live in the database; the in-memory map is empty. Starting a game
 * used to read that map, so every real member was refused and the Start game button did nothing.
 */
describe("createParty in a durable group", () => {
  const setup = (found: MandaliMember | undefined) => {
    const repository = new MandaliRepository();
    vi.spyOn(repository, "isDurable").mockReturnValue(true);
    vi.spyOn(repository, "getMemberDurable").mockResolvedValue(found);
    return new MandaliService(repository);
  };

  it("lets an active member start a game, seated under their group name", async () => {
    const service = setup(member());

    const result = await service.createParty("g1", "p1", "Leader", "avatar_1", "handcricket", "casual", "Hand Cricket", 2);

    expect(result.success).toBe(true);
    expect(result.party?.leaderName).toBe("Geetha Priya");
    expect(result.party?.members[0]).toMatchObject({ playerId: "p1", displayName: "Geetha Priya", avatar: "geetha.png" });
  });

  it("still refuses someone who is not an active member", async () => {
    expect((await setup(undefined).createParty("g1", "p9", "x", "a", "ludo", "casual", "t", 4)).success).toBe(false);
    const left = member({ state: "LEFT" as MandaliMember["state"] });
    expect((await setup(left).createParty("g1", "p1", "x", "a", "ludo", "casual", "t", 4)).success).toBe(false);
  });
});
