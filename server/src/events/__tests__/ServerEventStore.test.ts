import { describe, it, expect, beforeEach } from "vitest";
import { ServerEventStore } from "../ServerEventStore.js";

describe("ServerEventStore", () => {
  let store: ServerEventStore;

  beforeEach(() => {
    store = new ServerEventStore();
  });

  it("appends events with strictly monotonic sequence numbers", () => {
    const e1 = store.append("ROOM1", "ROOM_CREATED", {
      code: "ROOM1",
      game: "rps",
      hostId: "p1",
      isCustomName: false,
      timestamp: Date.now(),
    });

    const e2 = store.append("ROOM1", "PLAYER_JOINED", {
      code: "ROOM1",
      playerId: "p2",
      name: "Bob",
      isBot: false,
      timestamp: Date.now(),
    });

    expect(e1.sequenceNumber).toBe(1);
    expect(e2.sequenceNumber).toBe(2);
    expect(e1.roomId).toBe("ROOM1");
    expect(e2.roomId).toBe("ROOM1");
  });

  it("sanitizes chat messages to prevent PII / raw text storage", () => {
    const chatEvt = store.append("ROOM1", "CHAT_SENT", {
      code: "ROOM1",
      playerId: "p1",
      text: "Super secret confidential message",
      timestamp: Date.now(),
    } as any);

    expect((chatEvt.payload as any).text).toBeUndefined();
    expect((chatEvt.payload as any).textLength).toBe("Super secret confidential message".length);
  });

  it("retrieves events after a specific sequence number", () => {
    store.append("ROOM1", "ROOM_CREATED", { code: "ROOM1", game: "rps", hostId: "p1", isCustomName: false, timestamp: Date.now() });
    store.append("ROOM1", "PLAYER_JOINED", { code: "ROOM1", playerId: "p2", name: "Bob", isBot: false, timestamp: Date.now() });
    store.append("ROOM1", "GAME_STARTED", { code: "ROOM1", game: "rps", playersCount: 2, timestamp: Date.now() });

    const afterSeq1 = store.getEventsAfter("ROOM1", 1);
    expect(afterSeq1.length).toBe(2);
    expect(afterSeq1[0]?.sequenceNumber).toBe(2);
    expect(afterSeq1[1]?.sequenceNumber).toBe(3);
  });

  it("exports a versioned room timeline JSON", () => {
    store.append("ROOM1", "ROOM_CREATED", { code: "ROOM1", game: "rps", hostId: "p1", isCustomName: false, timestamp: Date.now() });
    store.append("ROOM1", "GAME_STARTED", { code: "ROOM1", game: "rps", playersCount: 2, timestamp: Date.now() });

    const exported = store.export("ROOM1");
    expect(exported).not.toBeNull();
    expect(exported?.version).toBe("1.0");
    expect(exported?.roomId).toBe("ROOM1");
    expect(exported?.totalEvents).toBe(2);
    expect(exported?.events.length).toBe(2);
  });

  it("computes operational stats correctly", () => {
    store.append("ROOM1", "ROOM_CREATED", { code: "ROOM1", game: "rps", hostId: "p1", isCustomName: false, timestamp: Date.now() });
    store.append("ROOM2", "ROOM_CREATED", { code: "ROOM2", game: "uno", hostId: "p2", isCustomName: false, timestamp: Date.now() });
    store.append("ROOM2", "PLAYER_JOINED", { code: "ROOM2", playerId: "p3", name: "Alice", isBot: false, timestamp: Date.now() });

    const stats = store.getStats();
    expect(stats.totalRooms).toBe(2);
    expect(stats.totalEvents).toBe(3);
  });
});
