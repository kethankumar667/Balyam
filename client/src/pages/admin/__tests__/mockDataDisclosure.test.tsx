import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import AdminDashboardPage from "../dashboard";
import AdminUsersPage from "../users";
import AdminMatchesPage from "../matches";
import AdminFeatureFlagsPage from "../feature-flags";
import AdminAnnouncementsPage from "../announcements";
import AdminLeaderboardsPage from "../leaderboards";
import AdminAnalyticsPage from "../analytics";
import AdminSystemHealthPage from "../system-health";
import AdminAuditLogsPage from "../audit-logs";
import AdminSettingsPage from "../settings";

/**
 * ADMIN-DATA-001 route coverage.
 *
 * Two things are proven here, per route:
 *  1. The mock-data disclosure (`MockDataBanner`) is present and says the
 *     right thing — "mock" for every route still fully local. Dashboard DB
 *     Phase 1 (see dashboardDbIntegration.test.tsx) made Dashboard's own
 *     metrics real, so it no longer carries this banner at all and is
 *     covered separately, not in `mockRoutes` below.
 *  2. None of the PREVIOUS fabricated-success phrases this audit found can
 *     be produced by actually triggering the action — not just "the string
 *     isn't on the page before you click anything" (trivially true of any
 *     toast that starts hidden), but "the string the button now produces
 *     doesn't claim a server did something it didn't."
 *
 * Testing-standards.md's own rule applies here in spirit: a claim about
 * what a page says has to be checked against a rendered DOM, not asserted
 * from reading the source.
 *
 * Assertions deliberately avoid `@testing-library/jest-dom` matchers
 * (`toBeInTheDocument`, `toHaveAttribute`) — they are not registered
 * against `expect` anywhere in this suite's Vitest setup (no other test
 * file in the repo uses them either; see e.g. roomJourney.test.tsx's
 * `toBeDefined()` convention), so this file matches that.
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

/** Phrases the audit found actually shipping. None may ever render again. */
const BANNED_PHRASES = [
  /banned from matchmaking/i,
  /is now (muted|unmuted)$/i,
  /propagated to worker cluster/i,
  /saved to in-memory configuration registry/i,
  /broadcasted to live lounge sessions/i,
  /deleted from active broadcast cache/i,
  /recalculation queued successfully/i,
  /force-terminated from in-memory engine/i,
  /diagnostic sweep complete/i,
  /exported \d+ audit log records/i,
  /settings updated in operational memory cache/i,
  /lobby broadcast sent to \d+ players/i,
  /reclaimed \d+ abandoned in-memory rooms/i,
  /bot scheduler workers refreshed/i,
  /telemetry audit report generated/i,
];

function expectNoBannedClaims(container: HTMLElement) {
  const text = container.textContent ?? "";
  for (const phrase of BANNED_PHRASES) {
    expect(text).not.toMatch(phrase);
  }
}

describe("Admin console — mock-data disclosure banner (ADMIN-DATA-001)", () => {
  const mockRoutes: Array<[string, React.ComponentType]> = [
    ["Feature Flags", AdminFeatureFlagsPage],
    ["Announcements", AdminAnnouncementsPage],
    ["Analytics", AdminAnalyticsPage],
    ["Settings", AdminSettingsPage],
  ];

  it.each(mockRoutes)("%s shows the full mock-data disclosure, visibly, on first render", (_name, Page) => {
    renderRoute(<Page />);
    expect(screen.getByText(/design preview.*mock data/i)).toBeDefined();
    expect(
      screen.getByText(/nothing is saved, exported, broadcast, or sent to a server/i),
    ).toBeDefined();
  });
});

describe("Admin console — corrected action feedback (ADMIN-DATA-001)", () => {
  it("Leaderboards no longer claims to be a demonstration — it reads real ranking standings", async () => {
    const { container } = renderRoute(<AdminLeaderboardsPage />);

    // Graduated out of `mockRoutes` above: this page now queries
    // /api/ranking/leaderboard. The fabricated "Recalculate ELO" action had
    // no server behind it and is gone rather than kept as a fake button.
    await waitFor(() => expect(screen.queryByText(/design preview.*mock data/i)).toBeNull());
    expect(screen.queryByText(/local demonstration only/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /recalculate elo/i })).toBeNull();
    expectNoBannedClaims(container);
  });

  it("System Health no longer claims to be a demonstration — it reads real operational telemetry", async () => {
    const { container } = renderRoute(<AdminSystemHealthPage />);

    // Graduated out of `mockRoutes` above: this page now fetches
    // /api/operational/health and /metrics (see its own doc comment), so it
    // must carry neither the mock banner nor the local-demo language.
    await waitFor(() => expect(screen.queryByText(/design preview.*mock data/i)).toBeNull());
    expect(screen.queryByText(/local demonstration only/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /run health sweep/i })).toBeNull();
    expectNoBannedClaims(container);
  });

  it("Audit Logs no longer claims to be a demonstration — it reads real settlement and wallet-adjustment events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/admin/audit")) return { status: 200, ok: true, json: async () => ({ entries: [] }) };
        return { status: 200, ok: true, json: async () => ({}) };
      }),
    );
    const { container } = renderRoute(<AdminAuditLogsPage />);

    // Graduated out of `mockRoutes` above: this page now fetches
    // /api/admin/audit (settlement_events + ADMIN_ADJUSTMENT ledger rows).
    await waitFor(() => expect(screen.queryByText(/design preview.*mock data/i)).toBeNull());
    expect(screen.queryByText(/local demonstration only/i)).toBeNull();
    expectNoBannedClaims(container);

    // Export CSV is still genuinely unimplemented — that disclosure is
    // still true, just no longer paired with "demonstration data only".
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(await screen.findByText(/no file was downloaded/i)).toBeDefined();
    expectNoBannedClaims(container);
    vi.unstubAllGlobals();
  });

  it("Settings: Save All Settings states nothing was persisted", async () => {
    const { container } = renderRoute(<AdminSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /save all settings/i }));

    expect(await screen.findByText(/were not saved/i)).toBeDefined();
    expectNoBannedClaims(container);
  });

  it("Feature Flags: toggling a flag reports a local preview, not cluster propagation", async () => {
    const { container } = renderRoute(<AdminFeatureFlagsPage />);
    const [firstSwitch] = screen.getAllByRole("switch");
    fireEvent.click(firstSwitch);

    expect(await screen.findByText(/preview updated locally/i)).toBeDefined();
    expectNoBannedClaims(container);
  });

  it("Dashboard quick actions each report a local demonstration, not a real operation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/admin/dashboard/summary")) {
          return {
            status: 200,
            ok: true,
            json: async () => ({
              progression: { kind: "memory", durable: false, reachable: true, detail: "test stub" },
              kpis: { totalRegisteredUsers: 0, activeUsersLast24h: 0, matchesCompletedToday: 0 },
              matchTrend: [],
              recentMatches: [],
            }),
          };
        }
        if (url.includes("/api/operational/rooms")) {
          return { status: 200, ok: true, json: async () => ({ rooms: [] }) };
        }
        return { status: 200, ok: true, json: async () => ({ status: "HEALTHY", uptimeSec: 0 }) };
      }),
    );
    const { container } = renderRoute(<AdminDashboardPage />);

    for (const name of [/broadcast/i, /clean rooms/i, /restart bots/i, /audit run/i]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(await screen.findByText(/local demonstration only/i)).toBeDefined();
      expectNoBannedClaims(container);
    }
    vi.unstubAllGlobals();
  });

  it("Users no longer claims to be a demonstration — it reads real accounts, and banning still reports a local preview (no real moderation endpoint exists)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/admin/users")) {
          return {
            status: 200,
            ok: true,
            json: async () => ({
              users: [
                {
                  id: "usr-1",
                  name: "Kethan Kumar",
                  email: "kethan@bhalyam.io",
                  role: "super_admin",
                  matchesPlayed: 0,
                  winRate: "0%",
                  rating: 400,
                  joinedAt: Date.now(),
                  lastActiveAt: null,
                  favoriteGame: "—",
                },
              ],
              total: 1,
            }),
          };
        }
        return { status: 200, ok: true, json: async () => ({}) };
      }),
    );

    const { container } = renderRoute(<AdminUsersPage />);
    // Graduated out of `mockRoutes` above: this page now fetches
    // /api/admin/users, and the old MOCK_25_USERS padding cohort is gone.
    await waitFor(() => expect(screen.queryByText(/design preview.*mock data/i)).toBeNull());
    expect(screen.queryByText(/local demonstration only/i)).toBeNull();

    await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0));
    fireEvent.click(container.querySelectorAll("tbody tr")[0]);
    fireEvent.click(await screen.findByRole("button", { name: /ban account/i }));

    expect(await screen.findByText(/no changes were sent to the server/i)).toBeDefined();
    expectNoBannedClaims(container);
    vi.unstubAllGlobals();
  });

  it("Matches no longer claims to be a demonstration — it reads real rooms and match records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/operational/rooms")) {
          return { status: 200, ok: true, json: async () => ({ rooms: [] }) };
        }
        if (url.includes("/api/admin/dashboard/summary")) {
          return {
            status: 200,
            ok: true,
            json: async () => ({
              kpis: { matchesCompletedToday: 0 },
              matchTrend: [],
              recentMatches: [],
            }),
          };
        }
        return { status: 200, ok: true, json: async () => ({}) };
      }),
    );
    const { container } = renderRoute(<AdminMatchesPage />);

    // Graduated out of `mockRoutes` above: this page now fetches
    // /api/operational/rooms and /api/admin/dashboard/summary, and the
    // fabricated "Force Terminate Match" action (no server behind it) is
    // gone rather than kept as a fake button.
    await waitFor(() => expect(screen.queryByText(/design preview.*mock data/i)).toBeNull());
    expect(screen.queryByText(/local demonstration only/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /force terminate match/i })).toBeNull();
    expectNoBannedClaims(container);
    vi.unstubAllGlobals();
  });

  it("Announcements: publishing a new announcement reports a local preview, not a real broadcast", async () => {
    const { container } = renderRoute(<AdminAnnouncementsPage />);
    fireEvent.click(screen.getByRole("button", { name: /new announcement/i }));

    // The Announcements create form's <label> elements are not
    // programmatically associated with their inputs (no htmlFor/id) — a
    // separate accessibility gap outside this task's scope — so these are
    // queried by placeholder rather than by label.
    fireEvent.change(screen.getByPlaceholderText(/word building weekend championship/i), {
      target: { value: "Test headline" },
    });
    fireEvent.change(screen.getByPlaceholderText(/provide exact details/i), {
      target: { value: "Test description" },
    });
    fireEvent.click(screen.getByRole("button", { name: /publish now/i }));

    expect(await screen.findByText(/was not broadcast to any players/i)).toBeDefined();
    expectNoBannedClaims(container);
  });
});

describe("Admin console — unfinished controls are disabled with an accessible explanation", () => {
  it('Users "Invite Moderator" is aria-disabled with a real, non-empty accessible description', () => {
    renderRoute(<AdminUsersPage />);
    const button = screen.getByRole("button", { name: /invite moderator/i });

    expect(button.getAttribute("aria-disabled")).toBe("true");
    const describedById = button.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();
    const description = document.getElementById(describedById as string);
    expect(description?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('Feature Flags "Create Flag" is aria-disabled with a real, non-empty accessible description', () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const button = screen.getByRole("button", { name: /create flag/i });

    expect(button.getAttribute("aria-disabled")).toBe("true");
    const describedById = button.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();
    const description = document.getElementById(describedById as string);
    expect(description?.textContent?.trim().length).toBeGreaterThan(0);
  });
});
