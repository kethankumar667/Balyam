import { describe, it, expect, beforeEach } from "vitest";
import { profileService } from "../ProfileService.js";

const FINISH = {
  roomCode: "REPLAY",
  game: "rps" as const,
  startedAt: 1_000,
  finishedAt: 61_000,
  durationMs: 60_000,
  winnerId: "replay_player",
  participants: [
    { playerId: "replay_player", name: "Replay Player", isWinner: true },
    { playerId: "replay_rival", name: "Replay Rival", isWinner: false },
  ],
};

describe("progression hardening", () => {
  beforeEach(() => {
    profileService.reset();
  });

  it("awards XP once when the same match completion is replayed", () => {
    profileService.recordMatchFinished(FINISH);
    const afterFirst = profileService.getProfile("replay_player")!.experiencePoints;

    // A host failover or a retried ack reports the same finished match again.
    profileService.recordMatchFinished(FINISH);
    profileService.recordMatchFinished(FINISH);

    expect(profileService.getProfile("replay_player")!.experiencePoints).toBe(afterFirst);
    expect(profileService.getProfile("replay_rival")!.experiencePoints).toBe(15);
  });

  it("counts the same match once in stats as well as XP", () => {
    profileService.recordMatchFinished(FINISH);
    profileService.recordMatchFinished(FINISH);

    expect(profileService.getStats("replay_player")?.totalMatches).toBe(1);
  });

  it("still awards XP for a different match by the same players", () => {
    profileService.recordMatchFinished(FINISH);
    profileService.recordMatchFinished({ ...FINISH, startedAt: 500_000, finishedAt: 560_000 });

    expect(profileService.getProfile("replay_player")!.experiencePoints).toBe(100);
  });

  it("reading progression for an unknown player does not create a profile", () => {
    const progression = profileService.getProgression("ghost_player");

    expect(progression.currentLevel).toBe(1);
    expect(profileService.getProfile("ghost_player")).toBeUndefined();
  });
});
