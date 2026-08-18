import { describe, it, expect, beforeEach } from "vitest";
import { ServerLifecycleRegistry } from "../LifecycleRegistry.js";
import { serverResourceTracker } from "../ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";

describe("ServerLifecycleRegistry", () => {
  let registry: ServerLifecycleRegistry;

  beforeEach(() => {
    serverResourceTracker.reset();
    serverEventStore.reset();
    registry = new ServerLifecycleRegistry();
  });

  it("binds timers to rooms and tracks them", () => {
    registry.registerRoom("ROOM1");
    const t = setTimeout(() => {}, 10_000);
    registry.bindTimer("ROOM1", "turn_timer", t, "turn");

    const stats = registry.getStats();
    expect(stats.totalRooms).toBe(1);
    expect(stats.activeTimers).toBe(1);
  });

  it("unbinds specific timers without affecting others", () => {
    registry.registerRoom("ROOM1");
    const t1 = setTimeout(() => {}, 10_000);
    const t2 = setTimeout(() => {}, 10_000);

    registry.bindTimer("ROOM1", "turn_timer", t1, "turn");
    registry.bindTimer("ROOM1", "takeover_p1", t2, "takeover");

    expect(registry.getStats().activeTimers).toBe(2);

    registry.unbindTimer("ROOM1", "turn_timer");
    expect(registry.getStats().activeTimers).toBe(1);

    clearTimeout(t2);
  });

  it("completely purges all resources upon room cleanup", () => {
    registry.registerRoom("ROOM1");
    const t = setTimeout(() => {}, 10_000);
    const i = setInterval(() => {}, 10_000);

    registry.bindTimer("ROOM1", "turn_timer", t, "turn");
    registry.bindInterval("ROOM1", "sim", i);
    serverEventStore.append("ROOM1", "ROOM_CREATED", { code: "ROOM1", game: "rps", hostId: "p1", isCustomName: false, timestamp: Date.now() });

    expect(registry.getStats().totalRooms).toBe(1);
    expect(registry.getStats().activeTimers).toBe(1);
    expect(registry.getStats().activeIntervals).toBe(1);
    expect(serverEventStore.getEvents("ROOM1").length).toBe(1);

    registry.cleanupRoom("ROOM1");

    expect(registry.getStats().totalRooms).toBe(0);
    expect(registry.getStats().activeTimers).toBe(0);
    expect(registry.getStats().activeIntervals).toBe(0);
    expect(serverEventStore.getEvents("ROOM1").length).toBe(0);
    expect(serverResourceTracker.getCountByType("room")).toBe(0);
  });
});
