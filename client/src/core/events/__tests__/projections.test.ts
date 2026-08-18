import { describe, it, expect } from "vitest";
import { projectState } from "../projections/StateProjector";
import {
  MatchDurationProjection,
  RoomActivityProjection,
  PlayerRetentionProjection,
} from "../projections/AnalyticsProjections";
import type { DomainEvent } from "@shared/events/EventContracts";

describe("Event Sourcing — Analytics Projections", () => {
  const events: DomainEvent[] = [
    {
      id: "1",
      timestamp: 1000,
      roomId: "PROJ_1",
      type: "PLAYER_JOINED",
      sequenceNumber: 1,
      payload: { code: "PROJ_1", playerId: "p1", name: "Alice", isBot: false, timestamp: 1000 },
    },
    {
      id: "2",
      timestamp: 1010,
      roomId: "PROJ_1",
      type: "PLAYER_JOINED",
      sequenceNumber: 2,
      payload: { code: "PROJ_1", playerId: "p2", name: "Bob", isBot: false, timestamp: 1010 },
    },
    {
      id: "3",
      timestamp: 1020,
      roomId: "PROJ_1",
      type: "GAME_STARTED",
      sequenceNumber: 3,
      payload: { code: "PROJ_1", game: "snl", playersCount: 2, timestamp: 1020 },
    },
    {
      id: "4",
      timestamp: 2000,
      roomId: "PROJ_1",
      type: "MOVE_MADE",
      sequenceNumber: 4,
      payload: { code: "PROJ_1", playerId: "p1", game: "snl", moveType: "roll", timestamp: 2000 },
    },
    {
      id: "5",
      timestamp: 3000,
      roomId: "PROJ_1",
      type: "CHAT_SENT",
      sequenceNumber: 5,
      payload: { code: "PROJ_1", playerId: "p2", textLength: 12, timestamp: 3000 },
    },
    {
      id: "6",
      timestamp: 4000,
      roomId: "PROJ_1",
      type: "RECOVERY_STARTED",
      sequenceNumber: 6,
      payload: { roomId: "PROJ_1", playerId: "p1", timestamp: 4000 },
    },
    {
      id: "7",
      timestamp: 5000,
      roomId: "PROJ_1",
      type: "TAB_HIDDEN",
      sequenceNumber: 7,
      payload: { timestamp: 5000 },
    },
    {
      id: "8",
      timestamp: 11020,
      roomId: "PROJ_1",
      type: "GAME_FINISHED",
      sequenceNumber: 8,
      payload: { code: "PROJ_1", game: "snl", winnerId: "p1", timestamp: 11020 },
    },
    {
      id: "9",
      timestamp: 12000,
      roomId: "PROJ_1",
      type: "PLAYER_LEFT",
      sequenceNumber: 9,
      payload: { code: "PROJ_1", playerId: "p2", timestamp: 12000 },
    },
  ];

  it("projects match duration and completion metrics correctly", () => {
    const matchResult = projectState(events, MatchDurationProjection);
    expect(matchResult.isCompleted).toBe(true);
    expect(matchResult.game).toBe("snl");
    expect(matchResult.startedAt).toBe(1020);
    expect(matchResult.finishedAt).toBe(11020);
    expect(matchResult.durationSeconds).toBe(10); // (11020 - 1020) / 1000 = 10s
    expect(matchResult.winnerId).toBe("p1");
  });

  it("projects room activity and interaction counts", () => {
    const activity = projectState(events, RoomActivityProjection);
    expect(activity.totalEvents).toBe(9);
    expect(activity.movesCount).toBe(1);
    expect(activity.chatsCount).toBe(1);
    expect(activity.recoveryCount).toBe(1);
    expect(activity.tabSwitchesCount).toBe(1);
    expect(activity.errorsCount).toBe(0);
  });

  it("projects player retention and active durations", () => {
    const retention = projectState(events, PlayerRetentionProjection);
    expect(retention.players["p1"]?.name).toBe("Alice");
    expect(retention.players["p1"]?.leftAt).toBeNull(); // Alice stayed

    expect(retention.players["p2"]?.name).toBe("Bob");
    expect(retention.players["p2"]?.joinedAt).toBe(1010);
    expect(retention.players["p2"]?.leftAt).toBe(12000);
    expect(retention.players["p2"]?.activeMs).toBe(10990); // 12000 - 1010
  });
});
