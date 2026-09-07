import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminMatchesPage from "../matches";

/**
 * Room Event Timeline — revived from the orphaned, unrouted
 * `pages/AdminDashboardPage.tsx` (deleted once this drawer replaced it) and
 * wired into the real Matches page against the real
 * `GET /api/operational/timeline/:code` endpoint.
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function stubFetch(timelineHandler: (code: string) => { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/operational/rooms")) return jsonResponse(200, { rooms: [] });
      if (url.includes("/api/admin/dashboard/summary")) {
        return jsonResponse(200, { kpis: { matchesCompletedToday: 0 }, matchTrend: [], recentMatches: [] });
      }
      const match = url.match(/\/api\/operational\/timeline\/([A-Z0-9]+)/);
      if (match) {
        const { status, body } = timelineHandler(match[1]);
        return jsonResponse(status, body);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => "test-ops-key",
    setItem: () => undefined,
    removeItem: () => undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Matches — Room Event Timeline drawer", () => {
  it("looks up a room code and renders its real event timeline", async () => {
    stubFetch(() => ({
      status: 200,
      body: {
        version: "1.0",
        roomId: "4MN2H4",
        exportedAt: Date.now(),
        totalEvents: 1,
        events: [
          {
            id: "evt-1",
            timestamp: Date.now(),
            roomId: "4MN2H4",
            playerId: "guest_abc123",
            type: "ROOM_CREATED",
            sequenceNumber: 1,
            payload: { hostName: "Kethan" },
          },
        ],
      },
    }));

    renderRoute(<AdminMatchesPage />);
    fireEvent.click(screen.getByRole("button", { name: /room timeline/i }));

    const input = await screen.findByLabelText(/room code/i);
    fireEvent.change(input, { target: { value: "4mn2h4" } });
    fireEvent.click(screen.getByRole("button", { name: /inspect/i }));

    await waitFor(() => expect(screen.getByText(/1 event\(s\) for room/i)).toBeDefined());
    expect(screen.getByText("ROOM_CREATED")).toBeDefined();

    fireEvent.click(screen.getByText("ROOM_CREATED"));
    expect(await screen.findByText(/guest_abc123/)).toBeDefined();
    expect(screen.getByText(/"hostName": "Kethan"/)).toBeDefined();
  });

  it("surfaces a 404 honestly instead of pretending a timeline exists", async () => {
    stubFetch(() => ({ status: 404, body: { error: "No timeline available for that room code" } }));

    renderRoute(<AdminMatchesPage />);
    fireEvent.click(screen.getByRole("button", { name: /room timeline/i }));

    const input = await screen.findByLabelText(/room code/i);
    fireEvent.change(input, { target: { value: "ZZ9999" } });
    fireEvent.click(screen.getByRole("button", { name: /inspect/i }));

    expect(await screen.findByText(/no timeline available/i)).toBeDefined();
  });

  it("opening a live room's drawer and clicking View Full Event Timeline pre-fills its room code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/operational/rooms")) {
          return jsonResponse(200, {
            rooms: [
              {
                code: "LU7890",
                game: "ludo",
                lifecycleState: "IN_PROGRESS",
                phase: "playing",
                createdAt: Date.now(),
                matchStartedAt: null,
                matchDurationMs: 0,
                host: { id: "seat-1", name: "Kethan", isGuest: true, isConnected: true, isAway: false, inGrace: false },
                playerCount: 1,
                humanCount: 1,
                botCount: 0,
                spectatorCount: 0,
                hasTakeover: false,
                sealed: false,
                disconnectedCount: 0,
                players: [],
              },
            ],
          });
        }
        if (url.includes("/api/admin/dashboard/summary")) {
          return jsonResponse(200, { kpis: { matchesCompletedToday: 0 }, matchTrend: [], recentMatches: [] });
        }
        if (url.includes("/api/operational/timeline/LU7890")) {
          return jsonResponse(200, { version: "1.0", roomId: "LU7890", exportedAt: Date.now(), totalEvents: 0, events: [] });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    renderRoute(<AdminMatchesPage />);
    await screen.findByText("LU7890");
    fireEvent.click(screen.getByText("LU7890"));

    fireEvent.click(await screen.findByRole("button", { name: /view full event timeline/i }));

    const input = (await screen.findByLabelText(/room code/i)) as HTMLInputElement;
    expect(input.value).toBe("LU7890");
    await waitFor(() => expect(screen.getByText(/0 event\(s\) for room/i)).toBeDefined());
  });
});
