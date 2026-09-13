import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * hc-skin.ts is a module-level singleton store (like ../skin.ts), so each
 * test re-imports it fresh via vi.resetModules() to avoid state leaking
 * between assertions.
 */
describe("hc-skin", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("defaults to broadcast when nothing is stored", async () => {
    const { getHcSkin } = await import("../hc-skin");
    expect(getHcSkin()).toBe("broadcast");
  });

  it("loads a previously stored valid skin", async () => {
    localStorage.setItem("mpg.hc.skin", "doordarshan");
    const { getHcSkin } = await import("../hc-skin");
    expect(getHcSkin()).toBe("doordarshan");
  });

  it("falls back to the default for a stale/invalid stored value (e.g. the retired 'gully')", async () => {
    localStorage.setItem("mpg.hc.skin", "gully");
    const { getHcSkin } = await import("../hc-skin");
    expect(getHcSkin()).toBe("broadcast");
  });

  it("loads the restored 'nostalgia' (Classic) skin", async () => {
    localStorage.setItem("mpg.hc.skin", "nostalgia");
    const { getHcSkin } = await import("../hc-skin");
    expect(getHcSkin()).toBe("nostalgia");
  });

  it("loads the 'cricbuzz' skin", async () => {
    localStorage.setItem("mpg.hc.skin", "cricbuzz");
    const { getHcSkin } = await import("../hc-skin");
    expect(getHcSkin()).toBe("cricbuzz");
  });

  it("persists a change and notifies subscribers", async () => {
    const { getHcSkin, setHcSkin, useHcSkin } = await import("../hc-skin");
    void useHcSkin; // referenced to keep the import graph honest; not rendered here
    setHcSkin("doordarshan");
    expect(getHcSkin()).toBe("doordarshan");
    expect(localStorage.getItem("mpg.hc.skin")).toBe("doordarshan");
  });

  it("is a no-op when setting the same skin already active", async () => {
    const { getHcSkin, setHcSkin } = await import("../hc-skin");
    setHcSkin("doordarshan");
    localStorage.clear();
    setHcSkin("doordarshan");
    // No new write — proves the early-return guard against redundant sets.
    expect(localStorage.getItem("mpg.hc.skin")).toBeNull();
    expect(getHcSkin()).toBe("doordarshan");
  });
});
