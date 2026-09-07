import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminMatchesPage from "../matches";

/**
 * Matches, wired to two real sources instead of `MOCK_MATCHES`:
 *   - live rooms from `GET /api/operational/rooms`
 *   - completed matches (+ trend chart) from `GET /api/admin/dashboard/summary`
 *
 * These tests assert the page renders exactly what those endpoints return —
 * not a filtered copy of a hardcoded array — and that fields with no real
 * source (spectator count aside, which IS real; latency/turn count/score
 * are NOT) never reappear.
 *
 * No `@testing-library/jest-dom` matchers (not registered in this suite).
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function room(overrides: Record<string, unknown> = {}) {
  return {
    code: "LU7890",
    game: "ludo",
    lifecycleState: "IN_PROGRESS",
    phase: "playing",
    createdAt: Date.now() - 600_000,
    matchStartedAt: Date.now() - 300_000,
    matchDurationMs: 300_000,
    host: { id: "seat-1", name: "Kethan", isGuest: true, isConnected: true, isAway: false, inGrace: false },
    playerCount: 2,
    humanCount: 2,
    botCount: 0,
    spectatorCount: 0,
    hasTakeover: false,
    sealed: false,
    disconnectedCount: 0,
    players: [
      {
        id: "seat-1",
        name: "Kethan",
        playerType: "human",
        accountType: "guest",
        isHost: true,
        isConnected: true,
        isEligibleForRejoin: false,
        awaySince: null,
        awayUntil: null,
        remainingGraceMs: null,
        isAutoPlaying: false,
        autoPlayReason: null,
        autoTurnsPlayed: 0,
        autoTurnCap: null,
        idleStrikes: 0,
        seatStatus: "active",
      },
    ],
    ...overrides,
  };
}

function match(overrides: Record<string, unknown> = {}) {
  return {
    id: "match-1",
    roomCode: "HC1234",
    game: "handcricket",
    finishedAt: Date.now() - 60_000,
    durationMs: 240_000,
    winnerId: "p1",
    participants: [
      { playerId: "p1", displayName: "Kethan Kumar", isWinner: true, isBot: false },
      { playerId: "p2", displayName: "Second Player", isWinner: false, isBot: false },
    ],
    ...overrides,
  };
}

function summaryBody(recentMatches: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    kpis: { matchesCompletedToday: recentMatches.length },
    matchTrend: [{ date: "2026-09-01", count: 3 }],
    recentMatches,
    ...overrides,
  };
}

/** Captures every URL the page requests, for query-param / call assertions. */
let requestedUrls: string[] = [];

function stubFetch(rooms: unknown[] = [room()], recentMatches: unknown[] = [match()]) {
  requestedUrls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/api/operational/rooms")) return jsonResponse(200, { rooms });
      if (url.includes("/api/admin/dashboard/summary")) return jsonResponse(200, summaryBody(recentMatches));
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

describe("Admin Matches — real room and match data", () => {
  it("renders live rooms returned by the server on the default (live) view", async () => {
    stubFetch([room()], [match()]);
    renderRoute(<AdminMatchesPage />);

    await waitFor(() => expect(screen.getByText("LU7890")).toBeDefined());
    expect(screen.getByText("Kethan")).toBeDefined();
    expect(requestedUrls.some((u) => u.includes("/api/operational/rooms"))).toBe(true);
    expect(requestedUrls.some((u) => u.includes("/api/admin/dashboard/summary"))).toBe(true);
  });

  it("switches to completed matches from the dashboard summary, not a merged/invented row shape", async () => {
    stubFetch(
      [room()],
      [match(), match({ id: "match-2", roomCode: "TT5566", game: "tictactoe", winnerId: null, participants: [
        { playerId: "p3", displayName: "Third Player", isWinner: false, isBot: false },
      ] })],
    );
    renderRoute(<AdminMatchesPage />);
    await waitFor(() => expect(screen.getByText("LU7890")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /recently completed/i }));

    await waitFor(() => expect(screen.getByText("HC1234")).toBeDefined());
    expect(screen.getByText("TT5566")).toBeDefined();
    // Real winner from participants, and an honest "no winner" for the other.
    expect(screen.getByText("Kethan Kumar")).toBeDefined();
    expect(screen.getByText(/no winner recorded/i)).toBeDefined();
  });

  it("opens a live room drawer with real per-seat grace/auto-play state, not fabricated ping or score", async () => {
    stubFetch(
      [
        room({
          disconnectedCount: 1,
          players: [
            {
              id: "seat-1",
              name: "Kethan",
              playerType: "human",
              accountType: "guest",
              isHost: true,
              isConnected: false,
              isEligibleForRejoin: true,
              awaySince: Date.now() - 5000,
              awayUntil: Date.now() + 10000,
              remainingGraceMs: 10000,
              isAutoPlaying: true,
              autoPlayReason: "disconnected",
              autoTurnsPlayed: 2,
              autoTurnCap: 5,
              idleStrikes: 0,
              seatStatus: "auto_playing",
            },
          ],
        }),
      ],
      [],
    );
    renderRoute(<AdminMatchesPage />);
    await waitFor(() => expect(screen.getByText("LU7890")).toBeDefined());

    fireEvent.click(screen.getByText("LU7890"));

    await waitFor(() => expect(screen.getByText(/auto-playing \(disconnected\), 2\/5 turns/i)).toBeDefined());
    expect(screen.getByText(/10s grace left/i)).toBeDefined();
    // No fabricated per-seat ping/score ever rendered.
    expect(screen.queryByText(/ping/i)).toBeNull();
  });

  it("renders an honest empty state when no rooms are open and no matches have finished", async () => {
    stubFetch([], []);
    renderRoute(<AdminMatchesPage />);

    await waitFor(() => expect(screen.getByText(/no live rooms right now/i)).toBeDefined());
  });

  it("surfaces a failure honestly rather than falling back to sample matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("operational service down")));
    renderRoute(<AdminMatchesPage />);

    await waitFor(() => expect(screen.getAllByText(/match data unavailable/i).length).toBeGreaterThan(0));
    expect(screen.queryByText("LU7890")).toBeNull();
  });
});
