import { describe, it, expect, beforeEach } from "vitest";
import { eventStore } from "../EventStore";
import type { DomainEvent } from "@shared/events/EventContracts";

describe("Event Sourcing — EventStore", () => {
  beforeEach(() => {
    eventStore.reset();
  });

  it("appends domain events with monotonic sequence numbers", () => {
    const evt1: DomainEvent<"ROOM_CREATED"> = {
      id: "evt_1",
      timestamp: 1000,
      roomId: "LUDO01",
      playerId: "p1",
      type: "ROOM_CREATED",
      sequenceNumber: 1,
      payload: {
        code: "LUDO01",
        game: "ludo",
        hostId: "p1",
        isCustomName: false,
        timestamp: 1000,
      },
    };

    const evt2: DomainEvent<"PLAYER_JOINED"> = {
      id: "evt_2",
      timestamp: 1050,
      roomId: "LUDO01",
      playerId: "p2",
      type: "PLAYER_JOINED",
      sequenceNumber: 99, // Should be normalized to sequence 2
      payload: {
        code: "LUDO01",
        playerId: "p2",
        name: "Bob",
        isBot: false,
        timestamp: 1050,
      },
    };

    eventStore.append(evt1);
    eventStore.append(evt2);

    const events = eventStore.getEvents("LUDO01");
    expect(events).toHaveLength(2);
    expect(events[0]?.sequenceNumber).toBe(1);
    expect(events[1]?.sequenceNumber).toBe(2);
    expect(events[0]?.type).toBe("ROOM_CREATED");
    expect(events[1]?.type).toBe("PLAYER_JOINED");
  });

  it("filters events strictly after a given sequence number", () => {
    for (let i = 1; i <= 5; i++) {
      eventStore.append({
        id: `evt_${i}`,
        timestamp: 1000 + i * 100,
        roomId: "RUMMY9",
        playerId: "p1",
        type: "MOVE_MADE",
        sequenceNumber: i,
        payload: {
          code: "RUMMY9",
          playerId: "p1",
          game: "rummy",
          moveType: "discard",
          timestamp: 1000 + i * 100,
        },
      });
    }

    const after3 = eventStore.getEventsAfter("RUMMY9", 3);
    expect(after3).toHaveLength(2);
    expect(after3[0]?.sequenceNumber).toBe(4);
    expect(after3[1]?.sequenceNumber).toBe(5);
  });

  it("exports room timeline to versioned JSON export", () => {
    eventStore.append({
      id: "evt_exp",
      timestamp: 2000,
      roomId: "EXPORT1",
      playerId: "p1",
      type: "ROOM_CREATED",
      sequenceNumber: 1,
      payload: {
        code: "EXPORT1",
        game: "uno",
        hostId: "p1",
        isCustomName: false,
        timestamp: 2000,
      },
    });

    const exported = eventStore.export("EXPORT1");
    expect(exported).not.toBeNull();
    expect(exported?.version).toBe("1.0");
    expect(exported?.roomId).toBe("EXPORT1");
    expect(exported?.totalEvents).toBe(1);
    expect(exported?.events[0]?.id).toBe("evt_exp");
  });

  it("appends batch of events maintaining strict ordering", () => {
    const batch: DomainEvent[] = [
      {
        id: "b1",
        timestamp: 1000,
        roomId: "BATCH1",
        type: "ROOM_CREATED",
        sequenceNumber: 1,
        payload: { code: "BATCH1", game: "rps", hostId: "p1", isCustomName: false, timestamp: 1000 },
      },
      {
        id: "b2",
        timestamp: 1010,
        roomId: "BATCH1",
        type: "PLAYER_JOINED",
        sequenceNumber: 2,
        payload: { code: "BATCH1", playerId: "p2", name: "Player 2", isBot: false, timestamp: 1010 },
      },
    ];

    eventStore.appendBatch(batch);
    const events = eventStore.getEvents("BATCH1");
    expect(events).toHaveLength(2);
    expect(events[0]?.sequenceNumber).toBe(1);
    expect(events[1]?.sequenceNumber).toBe(2);
  });
});
