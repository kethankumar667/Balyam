import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ViewportMonitor } from "../ViewportMonitor";

describe("ViewportMonitor", () => {
  let monitor: ViewportMonitor;

  beforeEach(() => {
    monitor = new ViewportMonitor();
  });

  afterEach(() => {
    monitor.stop();
  });

  it("reads snapshot with width, height, and orientation", () => {
    const snap = monitor.getSnapshot();
    expect(typeof snap.width).toBe("number");
    expect(typeof snap.height).toBe("number");
    expect(typeof snap.isPortrait).toBe("boolean");
    expect(typeof snap.isLandscape).toBe("boolean");
  });

  it("notifies subscribers immediately upon subscription and clean unsubscription", () => {
    const fn = vi.fn();
    const unsub = monitor.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(1);

    unsub();
    monitor.stop();
  });
});
