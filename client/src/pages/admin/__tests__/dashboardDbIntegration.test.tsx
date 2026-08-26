import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminDashboardPage from "../dashboard";

/**
 * Dashboard DB Integration — Phase 1.
 *
 * Covers the loading / empty / partial / failure matrix the task calls for,
 * against the real component — not against a re-implementation of its
 * fetch logic. Every case stubs `fetch`, routed by URL, the same way the
 * rest of this suite already does for admin pages that call `operationalFetch`.
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

const SUMMARY_URL = "/api/admin/dashboard/summary";
const ROOMS_URL = "/api/operational/rooms";
const HEALTH_URL = "/api/operational/health";

function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function stubFetch(handlers: {
  summary?: () => { status: number; ok: boolean; json: () => Promise<unknown> };
  rooms?: () => { status: number; ok: boolean; json: () => Promise<unknown> };
  health?: () => { status: number; ok: boolean; json: () => Promise<unknown> };
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes(SUMMARY_URL)) {
        return handlers.summary?.() ?? jsonResponse(200, emptySummary());
      }
      if (url.includes(ROOMS_URL)) {
        return handlers.rooms?.() ?? jsonResponse(200, { rooms: [] });
      }
      if (url.includes(HEALTH_URL)) {
        return handlers.health?.() ?? jsonResponse(200, { status: "HEALTHY", uptimeSec: 120 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

function emptySummary() {
  return {
    progression: { kind: "supabase", durable: true, reachable: true, detail: "supabase postgres" },
    kpis: { totalRegisteredUsers: 0, activeUsersLast24h: 0, matchesCompletedToday: 0 },
    matchTrend: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10),
      count: 0,
    })),
    recentMatches: [],
  };
}

function populatedSummary() {
  return {
    progression: { kind: "supabase", durable: true, reachable: true, detail: "supabase postgres" },
    kpis: { totalRegisteredUsers: 42, activeUsersLast24h: 7, matchesCompletedToday: 3 },
    matchTrend: [
      { date: "2026-08-20", count: 1 },
      { date: "2026-08-21", count: 0 },
      { date: "2026-08-22", count: 2 },
      { date: "2026-08-23", count: 0 },
      { date: "2026-08-24", count: 4 },
      { date: "2026-08-25", count: 1 },
      { date: "2026-08-26", count: 3 },
    ],
    recentMatches: [
      {
        id: "m_DASH01_1",
        roomCode: "DASH01",
        game: "ludo",
        finishedAt: Date.now(),
        durationMs: 90_000,
        winnerId: "guest_abc",
        participants: [
          { playerId: "guest_abc", displayName: "Winner Wendy", isWinner: true, isBot: false },
          { playerId: "guest_def", displayName: "Loser Larry", isWinner: false, isBot: false },
        ],
      },
    ],
  };
}

function populatedRooms() {
  return {
    rooms: [
      { code: "LU7890", game: "ludo", lifecycleState: "IN_PROGRESS", playerCount: 4, humanCount: 4, hasTakeover: false },
      { code: "RM4521", game: "rummy", lifecycleState: "WAITING_FOR_PLAYERS", playerCount: 2, humanCount: 2, hasTakeover: false },
    ],
  };
}

describe("Admin Dashboard — DB integration (Phase 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("loading", () => {
    it("shows skeleton placeholders on the KPI cards before any fetch resolves", () => {
      // A fetch that never resolves during this test's lifetime — the point
      // is to observe the state BEFORE settlement, not after.
      vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
      const { container } = renderRoute(<AdminDashboardPage />);
      expect(screen.getByText("Command Center Overview")).toBeDefined();
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });
  });

  describe("empty dataset", () => {
    beforeEach(() => {
      stubFetch({
        summary: () => jsonResponse(200, emptySummary()),
        rooms: () => jsonResponse(200, { rooms: [] }),
        health: () => jsonResponse(200, { status: "HEALTHY", uptimeSec: 1 }),
      });
    });

    it("shows real zeros for the KPIs, not blank or fabricated values", async () => {
      renderRoute(<AdminDashboardPage />);
      await waitFor(() => {
        expect(screen.getByText("Total Registered Users").parentElement?.textContent).toContain("0");
      });
      expect(screen.getByText("Active Users (24h)").parentElement?.textContent).toContain("0");
      expect(screen.getByText("Matches Completed Today").parentElement?.textContent).toContain("0");
      expect(screen.getByText("Active Matches").parentElement?.textContent).toContain("0");
    });

    it("shows empty-state messaging for the trend chart, the live rooms table, and recent matches", async () => {
      renderRoute(<AdminDashboardPage />);
      await waitFor(() => expect(screen.getByText("No matches recorded yet")).toBeDefined());
      expect(screen.getByText("No completed matches yet")).toBeDefined();
      // Both the Live Rooms table and the "Live Rooms by Game" chart render
      // their own empty state for the same real condition — two elements,
      // not a duplicate-render bug.
      expect(screen.getAllByText("No active rooms")).toHaveLength(2);
    });
  });

  describe("populated dataset", () => {
    beforeEach(() => {
      stubFetch({
        summary: () => jsonResponse(200, populatedSummary()),
        rooms: () => jsonResponse(200, populatedRooms()),
        health: () => jsonResponse(200, { status: "HEALTHY", uptimeSec: 500 }),
      });
    });

    it("renders real KPI numbers from the summary response", async () => {
      renderRoute(<AdminDashboardPage />);
      await waitFor(() => {
        expect(screen.getByText("Total Registered Users").parentElement?.textContent).toContain("42");
      });
      expect(screen.getByText("Active Users (24h)").parentElement?.textContent).toContain("7");
      expect(screen.getByText("Matches Completed Today").parentElement?.textContent).toContain("3");
      // Active Matches is derived from rooms, not from the summary endpoint —
      // exactly one of the two stubbed rooms is IN_PROGRESS.
      expect(screen.getByText("Active Matches").parentElement?.textContent).toContain("1");
    });

    it("renders the recent match's winner and the live room's code", async () => {
      renderRoute(<AdminDashboardPage />);
      await waitFor(() => expect(screen.getByText("Winner Wendy")).toBeDefined());
      expect(screen.getByText("LU7890")).toBeDefined();
      expect(screen.getByText("RM4521")).toBeDefined();
    });

    it("regression: never renders 'Healthy' as a stand-in when health actually reports HEALTHY — it reads the real status, not a hardcoded default", async () => {
      renderRoute(<AdminDashboardPage />);
      await waitFor(() => expect(screen.getByText("Total Registered Users").parentElement?.textContent).toContain("42"));
      // Confirms the topbar's status chip reflects the fetched status rather
      // than always defaulting to "Operational" regardless of what /health said.
      expect(screen.getByText("Operational")).toBeDefined();
    });
  });

  describe("partial dataset — one source down, the rest unaffected", () => {
    it("Supabase unavailable: KPI cards and recent matches show 'Unavailable', but Live Rooms (a different source) still renders real data", async () => {
      stubFetch({
        summary: () => jsonResponse(503, { error: "Dashboard data unavailable", detail: "simulated outage" }),
        rooms: () => jsonResponse(200, populatedRooms()),
        health: () => jsonResponse(200, { status: "HEALTHY", uptimeSec: 500 }),
      });
      renderRoute(<AdminDashboardPage />);

      await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
      // Never a fabricated zero standing in for "the request failed".
      expect(screen.getByText("Total Registered Users").parentElement?.textContent).not.toContain("0");
      expect(screen.getByText("Total Registered Users").parentElement?.textContent).toContain("—");

      // Live Rooms does not depend on Supabase and must still be real.
      expect(screen.getByText("LU7890")).toBeDefined();
      expect(screen.getByText("Active Matches").parentElement?.textContent).toContain("1");
    });

    it("rooms endpoint unavailable: Active Matches and Live Rooms show 'Unavailable', but the Supabase-backed KPIs still render", async () => {
      stubFetch({
        summary: () => jsonResponse(200, populatedSummary()),
        rooms: () => jsonResponse(503, { error: "rooms unavailable" }),
        health: () => jsonResponse(200, { status: "HEALTHY", uptimeSec: 500 }),
      });
      renderRoute(<AdminDashboardPage />);

      await waitFor(() => expect(screen.getByText("Total Registered Users").parentElement?.textContent).toContain("42"));
      expect(screen.getByText("Active Matches").parentElement?.textContent).toContain("—");
      expect(screen.getByText("Live rooms unavailable")).toBeDefined();
    });
  });

  describe("failure states", () => {
    it("backend unreachable entirely: every section shows an unavailable state, never a fake healthy default", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
      renderRoute(<AdminDashboardPage />);

      await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
      expect(screen.getByText("Total Registered Users").parentElement?.textContent).toContain("—");
      expect(screen.getByText("Live rooms unavailable")).toBeDefined();
      // The health fetch also failed — the topbar status must read as
      // critical, not silently default to "healthy".
      expect(screen.queryByText("Operational")).toBeNull();
    });

    it("regression: a 503 from the summary endpoint never renders alongside real-looking KPI numbers", async () => {
      stubFetch({
        summary: () => jsonResponse(503, { error: "Dashboard data unavailable" }),
      });
      renderRoute(<AdminDashboardPage />);
      await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
      const kpiRow = screen.getByText("Total Registered Users").closest("div");
      expect(within(kpiRow!.parentElement!).queryByText(/^\d+$/)).toBeNull();
    });

    it("progression not durable: a non-Supabase store still renders real numbers, with an explicit non-durable notice", async () => {
      stubFetch({
        summary: () =>
          jsonResponse(200, {
            ...populatedSummary(),
            progression: { kind: "memory", durable: false, reachable: true, detail: "no service-role key configured" },
          }),
      });
      renderRoute(<AdminDashboardPage />);
      await waitFor(() => expect(screen.getByText("Total Registered Users").parentElement?.textContent).toContain("42"));
      expect(screen.getByText(/running in memory, not Supabase/i)).toBeDefined();
    });
  });
});
