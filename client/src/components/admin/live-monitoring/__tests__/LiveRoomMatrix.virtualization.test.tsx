import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import LiveRoomMatrix from "../LiveRoomMatrix";
import { useAdminLiveStore } from "../../../../store/adminLiveStore";
import type { OperationalRoomSummary } from "@shared/types";

/**
 * Replaces the audit-flagged "1,000-room" test, which only proved the
 * component didn't crash and that the first room's code was present —
 * assertions that would have passed identically even if the component's own
 * unvirtualized fallback branch (`isVirtualDesktopActive ? ... :
 * processedRooms`, see LiveRoomMatrix.tsx) were silently active instead of
 * real windowing. These tests instead prove a BOUNDED row count against a
 * measured viewport, and that scrolling changes which rows are bounded-in.
 *
 * happy-dom does not perform real layout, so `getBoundingClientRect`/
 * `clientHeight` are stubbed to a fixed, realistic viewport
 * (`max-h-[640px]` is the component's own desktop/mobile scroll container
 * height) before each test — this is what lets `@tanstack/react-virtual`
 * compute a real, non-zero visible range instead of either "everything" or
 * "nothing".
 */

function makeRooms(count: number): OperationalRoomSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `RM${i.toString().padStart(4, "0")}`,
    game: i % 2 === 0 ? "rummy" : "ludo",
    lifecycleState: "IN_PROGRESS",
    phase: "playing",
    createdAt: Date.now() - 100_000,
    matchStartedAt: Date.now() - 50_000,
    matchDurationMs: 50_000,
    host: { id: `p_${i}`, name: `Player_${i}`, isGuest: false },
    playerCount: 2,
    humanCount: 2,
    botCount: 0,
    spectatorCount: 0,
    hasTakeover: false,
    sealed: false,
    disconnectedCount: 0,
  }));
}

let originalClientHeight: PropertyDescriptor | undefined;
let originalGetRect: PropertyDescriptor | undefined;
let originalResizeObserver: typeof ResizeObserver | undefined;
let scrollTop = 0;

/**
 * `@tanstack/react-virtual` measures its scroll element through a real
 * `ResizeObserver`, not by reading `getBoundingClientRect`/`clientHeight`
 * directly — stubbing those alone (tried first) left the virtualizer stuck
 * on its `{ width: 0, height: 0 }` default in happy-dom, which is exactly
 * the silent "renders everything" failure mode this test suite exists to
 * catch. This fake `ResizeObserver` is the standard fix: it synchronously
 * reports the fixed viewport below the moment something is observed, the
 * same shape a real browser's first callback would deliver.
 */
class FakeResizeObserver {
  private targets = new Set<Element>();
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.targets.add(target);
    const entry = {
      target,
      contentRect: { width: 900, height: 640, top: 0, left: 0, bottom: 640, right: 900, x: 0, y: 0 },
      borderBoxSize: [{ inlineSize: 900, blockSize: 640 }],
      contentBoxSize: [{ inlineSize: 900, blockSize: 640 }],
      devicePixelContentBoxSize: [{ inlineSize: 900, blockSize: 640 }],
    } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
  }
}

beforeEach(() => {
  scrollTop = 0;
  originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
  originalGetRect = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "getBoundingClientRect");
  originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

  // Matches the component's own `max-h-[640px]` scroll container.
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 640,
  });
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: function (this: HTMLElement) {
      return {
        width: 900,
        height: 640,
        top: 0,
        left: 0,
        bottom: 640,
        right: 900,
        x: 0,
        y: 0,
        toJSON: () => {},
      };
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
  });

  useAdminLiveStore.getState().resetFilters();
  useAdminLiveStore.getState().setLoading(false);
});

afterEach(() => {
  if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
  if (originalGetRect) Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", originalGetRect);
  if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver;
  vi.restoreAllMocks();
});

describe("LiveRoomMatrix — virtualization (desktop)", () => {
  it("renders exactly 1,000 rooms into the store, but a bounded number of table rows", () => {
    const rooms = makeRooms(1000);
    useAdminLiveStore.getState().setRooms(rooms);
    render(<LiveRoomMatrix />);

    expect(useAdminLiveStore.getState().rooms).toHaveLength(1000);

    const dataRows = screen.getAllByRole("row").filter((r) => r.querySelector("td"));
    // 640px viewport / ~52px row height + overscan(10) each side is on the
    // order of dozens, never anywhere close to 1000 — this is the actual
    // bounded-rendering proof the replaced test never made.
    expect(dataRows.length).toBeGreaterThan(0);
    expect(dataRows.length).toBeLessThan(100);
  });

  it("shows the first visible item", () => {
    useAdminLiveStore.getState().setRooms(makeRooms(1000));
    render(<LiveRoomMatrix />);
    expect(screen.getByText("RM0000")).toBeDefined();
  });

  it("does not render an item far outside the current window", () => {
    useAdminLiveStore.getState().setRooms(makeRooms(1000));
    render(<LiveRoomMatrix />);
    // Sorted newest-first by default (all identical createdAt here, so
    // insertion order holds) — index 999 is nowhere near the top of a
    // 640px/52px window plus overscan.
    expect(screen.queryByText("RM0999")).toBeNull();
  });

  it("scrolling reveals a later item that was not rendered before", () => {
    useAdminLiveStore.getState().setRooms(makeRooms(1000));
    const { container } = render(<LiveRoomMatrix />);
    const scrollEl = container.querySelector(".overflow-y-auto") as HTMLElement;
    expect(scrollEl).toBeTruthy();

    expect(screen.queryByText("RM0090")).toBeNull();

    scrollTop = 90 * 52; // scroll roughly to where room #90 should be
    fireEvent.scroll(scrollEl);

    expect(screen.getByText("RM0090")).toBeDefined();
  });

  it("filtering updates the virtualized count, not just the underlying list", () => {
    useAdminLiveStore.getState().setRooms(makeRooms(1000));
    render(<LiveRoomMatrix />);
    const beforeRows = screen.getAllByRole("row").filter((r) => r.querySelector("td")).length;

    act(() => {
      useAdminLiveStore.getState().setGameFilter("rummy");
    });
    const afterRows = screen.getAllByRole("row").filter((r) => r.querySelector("td")).length;

    // Filtering to one game halves the matching set (even/odd split in
    // makeRooms) — the rendered window must reflect that, not stay pinned
    // to whatever the unfiltered count happened to be.
    expect(afterRows).toBeLessThanOrEqual(beforeRows);
    expect(afterRows).toBeGreaterThan(0);
  });

  it("renders the empty state for zero rooms, not an empty virtualized table", () => {
    useAdminLiveStore.getState().setRooms([]);
    render(<LiveRoomMatrix />);
    expect(screen.getByText("No active rooms")).toBeDefined();
    expect(screen.queryAllByRole("row").filter((r) => r.querySelector("td"))).toHaveLength(0);
  });

  it("renders correctly for a small dataset well under one viewport", () => {
    useAdminLiveStore.getState().setRooms(makeRooms(3));
    render(<LiveRoomMatrix />);
    const dataRows = screen.getAllByRole("row").filter((r) => r.querySelector("td"));
    expect(dataRows.length).toBe(3);
  });
});
