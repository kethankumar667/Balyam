import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { timelineRecorder } from "../TimelineRecorder";
import { eventStore } from "../EventStore";
import { eventBus } from "../../../lib/eventBus";

describe("Event Sourcing — TimelineRecorder", () => {
  beforeEach(() => {
    eventStore.reset();
    timelineRecorder.stop();
    timelineRecorder.start();
  });

  afterEach(() => {
    timelineRecorder.stop();
    eventStore.reset();
  });

  it("subscribes to EventBus and records DomainEvents into EventStore", () => {
    eventBus.publish("ROOM_CREATED", {
      code: "AUTO01",
      game: "ludo",
      hostId: "player_1",
      isCustomName: false,
    });

    eventBus.publish("PLAYER_JOINED", {
      code: "AUTO01",
      playerId: "player_2",
      name: "Bob",
      isBot: false,
    });

    eventBus.publish("MOVE_MADE", {
      code: "AUTO01",
      playerId: "player_1",
      game: "ludo",
      moveType: "roll",
    });

    const events = eventStore.getEvents("AUTO01");
    expect(events).toHaveLength(3);
    expect(events[0]?.type).toBe("ROOM_CREATED");
    expect(events[0]?.sequenceNumber).toBe(1);
    expect(events[1]?.type).toBe("PLAYER_JOINED");
    expect(events[1]?.sequenceNumber).toBe(2);
    expect(events[2]?.type).toBe("MOVE_MADE");
    expect(events[2]?.sequenceNumber).toBe(3);
  });

  it("records recovery and tab lifecycle events under active room code", () => {
    timelineRecorder.setActiveRoom("ACTIVE_RM");

    eventBus.publish("RECOVERY_STARTED", {
      roomId: "ACTIVE_RM",
      playerId: "p1",
    });

    eventBus.publish("TAB_HIDDEN", {});

    eventBus.publish("RECOVERY_SUCCEEDED", {
      roomId: "ACTIVE_RM",
      playerId: "p1",
    });

    const events = eventStore.getEvents("ACTIVE_RM");
    expect(events).toHaveLength(3);
    expect(events[0]?.type).toBe("RECOVERY_STARTED");
    expect(events[1]?.type).toBe("TAB_HIDDEN");
    expect(events[2]?.type).toBe("RECOVERY_SUCCEEDED");
  });
});
