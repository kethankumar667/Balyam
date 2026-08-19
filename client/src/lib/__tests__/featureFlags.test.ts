import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllFeatureFlags,
  isFeatureEnabled,
  setFeatureFlagOverride,
  subscribeToFeatureFlags,
} from "../featureFlags";

describe("Feature Flag System", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    });
    vi.stubGlobal("window", {
      location: { search: "" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns defaults when no overrides exist", () => {
    expect(isFeatureEnabled("STRICT_LIFECYCLE_CLEANUP")).toBe(true);
    expect(isFeatureEnabled("NEW_ROOM_RENDERER")).toBe(false);
  });

  it("prioritizes URL search parameters over defaults", () => {
    window.location.search = "?ff_NEW_ROOM_RENDERER=1";
    expect(isFeatureEnabled("NEW_ROOM_RENDERER")).toBe(true);

    window.location.search = "?ff_STRICT_LIFECYCLE_CLEANUP=0";
    expect(isFeatureEnabled("STRICT_LIFECYCLE_CLEANUP")).toBe(false);
  });

  it("prioritizes localStorage overrides over defaults", () => {
    setFeatureFlagOverride("NEW_ROOM_RENDERER", true);
    expect(isFeatureEnabled("NEW_ROOM_RENDERER")).toBe(true);

    setFeatureFlagOverride("NEW_ROOM_RENDERER", false);
    expect(isFeatureEnabled("NEW_ROOM_RENDERER")).toBe(false);

    // Revert override
    setFeatureFlagOverride("NEW_ROOM_RENDERER", null);
    expect(isFeatureEnabled("NEW_ROOM_RENDERER")).toBe(false);
  });

  it("URL parameter takes precedence over localStorage", () => {
    setFeatureFlagOverride("NEW_ROOM_RENDERER", false);
    window.location.search = "?ff_NEW_ROOM_RENDERER=1";
    expect(isFeatureEnabled("NEW_ROOM_RENDERER")).toBe(true);
  });

  it("notifies subscribers when overrides change", () => {
    let callCount = 0;
    const unsubscribe = subscribeToFeatureFlags(() => {
      callCount++;
    });

    setFeatureFlagOverride("NEW_CHAT", true);
    expect(callCount).toBe(1);

    setFeatureFlagOverride("NEW_CHAT", null);
    expect(callCount).toBe(2);

    unsubscribe();
    setFeatureFlagOverride("NEW_CHAT", true);
    expect(callCount).toBe(2);
  });

  it("returns full snapshot with getAllFeatureFlags", () => {
    const flags = getAllFeatureFlags();
    expect(flags).toHaveProperty("NEW_ROOM_RENDERER");
    expect(flags).toHaveProperty("STRICT_LIFECYCLE_CLEANUP");
    expect(flags).toHaveProperty("ENHANCED_A11Y_MODALS");
    expect(flags).toHaveProperty("REDIS_ROOM_STORE");
  });
});
