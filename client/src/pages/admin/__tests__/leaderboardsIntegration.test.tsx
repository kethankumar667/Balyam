import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminLeaderboardsPage from "../leaderboards";

/**
 * Leaderboards, wired to the real ranking API.
 *
 * `GET /api/ranking/leaderboard` already supported metric/game/timeframe/
 * search/limit and had no client consumer at all. These tests assert the
 * page sends those as real query params (server-side filtering) and renders
 * what came back — not a filtered copy of a hardcoded array.
 *
 * No `@testing-library/jest-dom` matchers (not registered in this suite).
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function entry(overrides: Record<string, unknown> = {}) {
  return {
    rank: 1,
    playerId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9",
    displayName: "Kethan Kumar",
    avatar: "👑",
    level: 12,
    tier: "Gold",
    rating: 1840,
    wins: 24,
    matchesPlayed: 30,
    winRate: 80,
    totalPlayTimeMinutes: 195,
    favoriteGame: "handcricket",
    ...overrides,
  };
}

function leaderboardBody(entries: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    entries,
    total: entries.length,
    metric: "rating",
    timeframe: "allTime",
    ...overrides,
  };
}

/** Captures every leaderboard URL the page requests, for query-param assertions. */
let requestedUrls: string[] = [];

function stubFetch(body: unknown = leaderboardBody([entry()]), status = 200) {
  requestedUrls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/api/ranking/leaderboard")) return jsonResponse(status, body);
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

describe("Admin Leaderboards — real ranking data", () => {
  it("renders players returned by the server, with derived losses and real tier/level", async () => {
    stubFetch(
      leaderboardBody([
        entry(),
        entry({ rank: 2, playerId: "p2", displayName: "Second Player", wins: 10, matchesPlayed: 25, winRate: 40 }),
      ]),
    );
    renderRoute(<AdminLeaderboardsPage />);

    // Appears twice by design: once on the podium, once in the table.
    await waitFor(() => expect(screen.getAllByText("Kethan Kumar").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Second Player").length).toBeGreaterThan(0);
    // 30 played - 24 wins = 6 losses, derived rather than invented.
    expect(screen.getByText("24W / 6L")).toBeDefined();
    expect(screen.getByText("10W / 15L")).toBeDefined();
    expect(screen.getAllByText(/Gold • Lv 12/).length).toBeGreaterThan(0);
  });

  it("reports the real total and active metric/timeframe in the header", async () => {
    stubFetch(leaderboardBody([entry()], { total: 137, metric: "wins", timeframe: "weekly" }));
    renderRoute(<AdminLeaderboardsPage />);

    await waitFor(() =>
      expect(screen.getByText(/137 ranked player\(s\) — ranked by Wins, This Week/i)).toBeDefined(),
    );
  });

  it("pushes filters to the server as query params rather than filtering locally", async () => {
    stubFetch();
    renderRoute(<AdminLeaderboardsPage />);
    await waitFor(() => expect(requestedUrls.length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText(/game/i), { target: { value: "ludo" } });

    await waitFor(() => {
      const last = requestedUrls[requestedUrls.length - 1];
      expect(last.includes("game=ludo")).toBe(true);
    });
    // The default query always carries metric + timeframe + limit.
    expect(requestedUrls[0].includes("metric=rating")).toBe(true);
    expect(requestedUrls[0].includes("timeframe=allTime")).toBe(true);
  });

  it("sends the search term to the server instead of filtering a local array", async () => {
    stubFetch();
    renderRoute(<AdminLeaderboardsPage />);
    await waitFor(() => expect(requestedUrls.length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText(/search leaderboards/i), { target: { value: "kethan" } });

    await waitFor(
      () => {
        const last = requestedUrls[requestedUrls.length - 1];
        expect(last.includes("search=kethan")).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it("renders an honest empty state when the server has no ranked players", async () => {
    stubFetch(leaderboardBody([]));
    renderRoute(<AdminLeaderboardsPage />);

    await waitFor(() => expect(screen.getByText(/no leaderboard standings yet/i)).toBeDefined());
    expect(
      screen.getByText(/standings appear once matches finish/i),
    ).toBeDefined();
  });

  it("surfaces a failure honestly rather than falling back to sample players", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ranking service down")));
    renderRoute(<AdminLeaderboardsPage />);

    await waitFor(() => expect(screen.getByText(/standings unavailable/i)).toBeDefined());
    expect(screen.queryAllByText("Kethan Kumar").length).toBe(0);
  });
});
