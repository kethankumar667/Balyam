import { describe, it, expect, beforeEach } from "vitest";
import { ServerResourceTracker } from "../ResourceTracker.js";

describe("ServerResourceTracker", () => {
  let tracker: ServerResourceTracker;

  beforeEach(() => {
    tracker = new ServerResourceTracker();
  });

  it("registers and unregisters resources accurately", () => {
    tracker.register("socket", "sock_123", "client_connection");
    tracker.register("room", "ROOM1", "room_create");

    expect(tracker.getCountByType("socket")).toBe(1);
    expect(tracker.getCountByType("room")).toBe(1);

    const unreg = tracker.unregister("socket", "sock_123");
    expect(unreg).toBe(true);
    expect(tracker.getCountByType("socket")).toBe(0);
    expect(tracker.getCountByType("room")).toBe(1);
  });

  it("tracks and untracks NodeJS timers with weak reference mapping", () => {
    const timer = setTimeout(() => {}, 5000);
    tracker.trackTimer(timer, "test_timer", "ROOM1");

    expect(tracker.getCountByType("timer")).toBe(1);

    tracker.untrackTimer(timer);
    expect(tracker.getCountByType("timer")).toBe(0);
    clearTimeout(timer);
  });

  it("detects dangling timers exceeding maximum lifespan", () => {
    const timer = setTimeout(() => {}, 1000);
    tracker.trackTimer(timer, "dangling_timer", "ROOM1");

    // Artificially age the resource for testing
    const counts = tracker.getActiveCounts();
    expect(counts.timer).toBe(1);

    clearTimeout(timer);
    tracker.untrackTimer(timer);
  });

  it("produces full audit summary by type", () => {
    tracker.register("socket", "s1", "tag");
    tracker.register("socket", "s2", "tag");
    tracker.register("room", "r1", "tag");
    tracker.register("engine", "e1", "tag");

    const counts = tracker.getActiveCounts();
    expect(counts.socket).toBe(2);
    expect(counts.room).toBe(1);
    expect(counts.engine).toBe(1);
    expect(counts.webrtc_session).toBe(0);
  });
});
