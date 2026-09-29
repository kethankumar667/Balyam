import { describe, it, expect, beforeEach } from "vitest";
import { installRewards, uninstallRewards } from "../../rewards/__tests__/rewardRig.js";
import {
  profileService,
  PRACTICE_XP_DAILY_CAP,
  MAX_FULL_XP_MATCHES_PER_TABLE_PER_DAY,
  MIN_HUMAN_MATCHES_FOR_COINS,
} from "../ProfileService.js";

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

describe("coin faucet controls", () => {
  const DAY_MS = 86_400_000;
  const solo = (n: number, at = 10 * DAY_MS) => ({
    roomCode: `SOLO${n}`,
    game: "rps" as const,
    // Two minutes apart: matches arriving every second would (rightly) trip the pace rule.
    startedAt: at + n * 120_000,
    finishedAt: at + n * 120_000 + 60_000,
    durationMs: 60_000,
    winnerId: "grinder",
    participants: [
      { playerId: "grinder", name: "Grinder", isWinner: true },
      { playerId: "bot_1", name: "Bot", isWinner: false, isBot: true },
    ],
  });
  const xp = () => profileService.getProfile("grinder")!.experiencePoints;

  beforeEach(() => {
    profileService.reset();
  });

  it("caps XP from bot tables at the daily allowance", () => {
    for (let i = 0; i < 20; i++) profileService.recordMatchFinished(solo(i));

    expect(xp()).toBe(PRACTICE_XP_DAILY_CAP);
  });

  it("gives the allowance back the next UTC day", () => {
    for (let i = 0; i < 20; i++) profileService.recordMatchFinished(solo(i));
    profileService.recordMatchFinished(solo(99, 11 * DAY_MS));

    expect(xp()).toBe(PRACTICE_XP_DAILY_CAP + 50);
  });

  it("does not cap matches against different real people", () => {
    for (let i = 0; i < 20; i++) {
      profileService.recordMatchFinished({
        ...solo(i),
        participants: [
          { playerId: "grinder", name: "Grinder", isWinner: true, isMember: true },
          { playerId: `friend_${i}`, name: "Friend", isWinner: false, isMember: true },
        ],
      });
    }

    expect(xp()).toBe(20 * 50);
  });

  it("stops paying full XP once the same two people have played too often in a day", () => {
    for (let i = 0; i < 20; i++) {
      profileService.recordMatchFinished({
        ...solo(i),
        participants: [
          { playerId: "grinder", name: "Grinder", isWinner: true, isMember: true },
          { playerId: "friend", name: "Friend", isWinner: false, isMember: true },
        ],
      });
    }

    // Five full-XP wins, then the rest is practice and hits the daily allowance.
    expect(xp()).toBe(MAX_FULL_XP_MATCHES_PER_TABLE_PER_DAY * 50 + PRACTICE_XP_DAILY_CAP);
  });

  it("does not count a throwaway guest as a second real person", () => {
    for (let i = 0; i < 20; i++) {
      profileService.recordMatchFinished({
        ...solo(i),
        participants: [
          { playerId: "grinder", name: "Grinder", isWinner: true, isMember: true },
          { playerId: `fresh_guest_${i}`, name: "Guest", isWinner: false, isMember: false },
        ],
      });
    }

    expect(xp()).toBe(PRACTICE_XP_DAILY_CAP);
  });

  it("classifies a replayed completion the way it did the first time, without advancing the table counter", () => {
    const table = (n: number) => ({
      ...solo(n),
      participants: [
        { playerId: "grinder", name: "Grinder", isWinner: true, isMember: true },
        { playerId: "friend", name: "Friend", isWinner: false, isMember: true },
      ],
    });
    for (let i = 0; i < MAX_FULL_XP_MATCHES_PER_TABLE_PER_DAY - 1; i++) profileService.recordMatchFinished(table(i));

    // The 5th match, reported twice (a replay after a partial failure).
    profileService.recordMatchFinished(table(50));
    profileService.recordMatchFinished(table(50));

    expect(xp()).toBe(MAX_FULL_XP_MATCHES_PER_TABLE_PER_DAY * 50);
  });

  it("treats pass-and-play seats as one person, so the table is practice", () => {
    for (let i = 0; i < 20; i++) {
      profileService.recordMatchFinished({
        ...solo(i),
        participants: [
          { playerId: "grinder", name: "Grinder", isWinner: true },
          { playerId: "local_seat", name: "Seat 2", isWinner: false, isLocal: true },
        ],
      });
    }

    expect(xp()).toBe(PRACTICE_XP_DAILY_CAP);
  });

  it("refuses a guest a coin milestone but lets a member claim it", async () => {
    profileService.getOrCreateProfile("climber", "Climber");
    profileService.awardXP("climber", 550);

    const asGuest = await profileService.claimMilestoneReward("climber", 5, "guest");
    expect(asGuest.success).toBe(false);
    expect(asGuest.error).toMatch(/sign in/i);

    // The refusal must not burn the claim.
    installRewards();
    profileService.restoreFromLedger(
      "climber",
      Array.from({ length: MIN_HUMAN_MATCHES_FOR_COINS }, () => ({ sourceKind: "match", amount: 50, createdAt: Date.now() })),
    );
    const asMember = await profileService.claimMilestoneReward("climber", 5, "member");
    expect(asMember.success).toBe(true);
    uninstallRewards();
  });
});
