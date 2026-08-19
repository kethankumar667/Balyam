import { describe, it, expect, beforeEach } from "vitest";
import { ClientResourceTracker } from "../ResourceTracker";

describe("ClientResourceTracker", () => {
  let tracker: ClientResourceTracker;

  beforeEach(() => {
    tracker = new ClientResourceTracker();
  });

  it("registers and tracks resource instances", () => {
    tracker.register("audio_howl", "theme_bgm", "music");
    tracker.register("webrtc_peer", "peer_p2", "voice");
    tracker.register("listener", "window_resize", "dom");

    expect(tracker.getCount("audio_howl")).toBe(1);
    expect(tracker.getCount("webrtc_peer")).toBe(1);
    expect(tracker.getCount("listener")).toBe(1);
    expect(tracker.getTotal()).toBe(3);

    tracker.unregister("audio_howl", "theme_bgm");
    expect(tracker.getCount("audio_howl")).toBe(0);
    expect(tracker.getTotal()).toBe(2);
  });

  it("summarizes active resources by type", () => {
    tracker.register("listener", "l1", "tag");
    tracker.register("listener", "l2", "tag");
    tracker.register("raf", "raf_1", "tag");

    const summary = tracker.getSummary();
    expect(summary.listener).toBe(2);
    expect(summary.raf).toBe(1);
    expect(summary.webrtc_peer).toBe(0);
  });
});
