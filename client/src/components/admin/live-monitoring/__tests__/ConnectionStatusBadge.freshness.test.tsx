import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import ConnectionStatusBadge from "../ConnectionStatusBadge";
import { useAdminLiveStore } from "../../../../store/adminLiveStore";

/**
 * Stream freshness: "connected" alone must not mean "Live" forever — the
 * badge has to notice when ticks stop arriving even though nothing else
 * changed, and it has to do that itself, with its own timer, not only
 * because a new tick happened to re-render it.
 */

beforeEach(() => {
  vi.useFakeTimers();
  useAdminLiveStore.setState({
    connectionStatus: "connected",
    lastTickAt: Date.now(),
    isUnauthorized: false,
    error: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ConnectionStatusBadge — stream freshness", () => {
  it("a fresh tick reports Live", () => {
    render(<ConnectionStatusBadge />);
    expect(screen.getByText(/Live Stream/i)).toBeDefined();
    expect(screen.queryByText(/Stream Stale/i)).toBeNull();
  });

  it("crossing the freshness threshold with no new tick reports Stale", () => {
    render(<ConnectionStatusBadge />);
    expect(screen.getByText(/Live Stream/i)).toBeDefined();

    // No new `ingestTick` — only time passing. The badge's own internal
    // timer, not new data, is what has to notice this.
    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(screen.getByText(/Stream Stale/i)).toBeDefined();
    expect(screen.queryByText(/Live Stream/i)).toBeNull();
  });

  it("a new tick arriving after staleness restores Live", () => {
    render(<ConnectionStatusBadge />);
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByText(/Stream Stale/i)).toBeDefined();

    act(() => {
      useAdminLiveStore.setState({ lastTickAt: Date.now() });
    });

    expect(screen.getByText(/Live Stream/i)).toBeDefined();
    expect(screen.queryByText(/Stream Stale/i)).toBeNull();
  });

  it("REST-fallback polling is never displayed as Live", () => {
    useAdminLiveStore.setState({ connectionStatus: "offline", lastTickAt: Date.now() });
    render(<ConnectionStatusBadge />);
    expect(screen.getByText(/Polling Sync/i)).toBeDefined();
    expect(screen.queryByText(/Live Stream/i)).toBeNull();
  });

  it("an unauthorized session is never displayed as Live or as ordinary polling", () => {
    useAdminLiveStore.setState({ isUnauthorized: true, connectionStatus: "connected", lastTickAt: Date.now() });
    render(<ConnectionStatusBadge />);
    expect(screen.getByText(/Not Authorized/i)).toBeDefined();
    expect(screen.queryByText(/Live Stream/i)).toBeNull();
    expect(screen.queryByText(/Polling Sync/i)).toBeNull();
  });

  it("cleans up its freshness timer on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = render(<ConnectionStatusBadge />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("does not run a freshness timer at all while not connected", () => {
    useAdminLiveStore.setState({ connectionStatus: "offline" });
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    render(<ConnectionStatusBadge />);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});
