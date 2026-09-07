import { describe, it, expect, vi } from "vitest";
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

import AdminSidebar from "../../../components/admin/admin-sidebar";
import AdminTopbar from "../../../components/admin/admin-topbar";
import StatCard from "../../../components/admin/stat-card";
import MetricCard from "../../../components/admin/metric-card";
import ChartCard from "../../../components/admin/chart-card";

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("Admin Console — Route Rendering (All 10 Admin Pages)", () => {
  it("renders /admin/dashboard with header and telemetry charts", () => {
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
    renderRoute(<AdminDashboardPage />);
    expect(screen.getByText("Command Center Overview")).toBeDefined();
    expect(screen.getByText("Completed Matches Trend")).toBeDefined();
    expect(screen.getByText("Live Rooms by Game")).toBeDefined();
    vi.unstubAllGlobals();
  });

  it("renders /admin/users with table columns and player records", () => {
    renderRoute(<AdminUsersPage />);
    // Graduated to real data (see usersIntegration.test.tsx for full
    // coverage) — StatCard titles render synchronously, ahead of any fetch;
    // the table itself is behind a loading state until that fetch settles.
    expect(screen.getByText("User Accounts & Moderation")).toBeDefined();
    expect(screen.getByText("Total Registered Accounts")).toBeDefined();
  });

  it("renders /admin/matches with real room and match management UI", () => {
    renderRoute(<AdminMatchesPage />);
    // Graduated to real data (see matchesIntegration.test.tsx for full
    // coverage) — StatCard titles render synchronously, ahead of any fetch.
    expect(screen.getByText("Match Management")).toBeDefined();
    expect(screen.getByText("Rooms In Play")).toBeDefined();
  });

  it("renders /admin/feature-flags with toggles and environment scopes", () => {
    renderRoute(<AdminFeatureFlagsPage />);
    expect(screen.getByText("Feature Flags & Rollouts")).toBeDefined();
    expect(screen.getByText("Active Feature Toggles")).toBeDefined();
  });

  it("renders /admin/announcements with broadcast table and preview banner", () => {
    renderRoute(<AdminAnnouncementsPage />);
    expect(screen.getByText("Broadcast Announcements")).toBeDefined();
    expect(screen.getByText("Player In-Game Banner Preview")).toBeDefined();
  });

  it("renders /admin/leaderboards with real ranking UI", () => {
    renderRoute(<AdminLeaderboardsPage />);
    // Graduated to real data (see leaderboardsIntegration.test.tsx for full
    // coverage, including the podium, which only renders once the server
    // returns at least 3 ranked players).
    expect(screen.getByText("Leaderboards & Competitive Standings")).toBeDefined();
    expect(screen.getByLabelText(/search leaderboards/i)).toBeDefined();
  });

  it("renders /admin/analytics with charts, growth trajectories, and retention cohorts", () => {
    renderRoute(<AdminAnalyticsPage />);
    expect(screen.getByText("Telemetry & Growth Analytics")).toBeDefined();
    expect(screen.getByText("Player Growth Trajectory (DAU / MAU)")).toBeDefined();
    expect(screen.getByText("Player Retention Cohort Matrix")).toBeDefined();
  });

  it("renders /admin/system-health with real telemetry UI", () => {
    renderRoute(<AdminSystemHealthPage />);
    // Graduated to real data (see systemHealthIntegration.test.tsx for full
    // coverage) — this heading renders synchronously, ahead of any fetch.
    expect(screen.getByText("Infrastructure & Subsystem Diagnostics")).toBeDefined();
    expect(screen.getByText("Core Subsystem Checks")).toBeDefined();
  });

  it("renders /admin/audit-logs with real event records", () => {
    renderRoute(<AdminAuditLogsPage />);
    // Graduated to real data (see auditLogsIntegration.test.tsx for full
    // coverage) — StatCard titles render synchronously, ahead of any fetch.
    expect(screen.getByText("Security & System Audit Logs")).toBeDefined();
    expect(screen.getByText("Events Loaded")).toBeDefined();
  });

  it("renders /admin/settings with operational tab switchers and form fields", () => {
    renderRoute(<AdminSettingsPage />);
    expect(screen.getByText("Platform Operational Settings")).toBeDefined();
    expect(screen.getByText("General Platform Identity")).toBeDefined();
  });
});

describe("Admin Console — Drawer Opening & Closing Lifecycle", () => {
  it("Users: clicking a row opens detail drawer, clicking close button dismisses it", async () => {
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
    await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0));
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    // Detail drawer opens
    expect(await screen.findByText("Player Credentials & Account")).toBeDefined();
    expect(await screen.findByText("Multiplayer Career Statistics")).toBeDefined();

    // Close drawer via aria-label="Close drawer" button
    const closeBtn = screen.getByRole("button", { name: /close drawer/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Player Credentials & Account")).toBeNull();
    });
    vi.unstubAllGlobals();
  });

  it("Matches: clicking a live room row opens its real drawer and closing it dismisses that drawer", async () => {
    // Graduated to real data: the fabricated "seat allocation"/telemetry
    // concept is gone. This exercises the same open/close lifecycle against
    // the real live-room drawer (see matchesIntegration.test.tsx for the
    // seat/grace/auto-play content itself).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/operational/rooms")) {
          return {
            status: 200,
            ok: true,
            json: async () => ({
              rooms: [
                {
                  code: "LU7890",
                  game: "ludo",
                  lifecycleState: "IN_PROGRESS",
                  phase: "playing",
                  createdAt: Date.now() - 600_000,
                  matchStartedAt: Date.now() - 300_000,
                  matchDurationMs: 300_000,
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
            }),
          };
        }
        if (url.includes("/api/admin/dashboard/summary")) {
          return {
            status: 200,
            ok: true,
            json: async () => ({ kpis: { matchesCompletedToday: 0 }, matchTrend: [], recentMatches: [] }),
          };
        }
        return { status: 200, ok: true, json: async () => ({}) };
      }),
    );

    const { container } = renderRoute(<AdminMatchesPage />);
    await screen.findByText("LU7890");
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    expect(await screen.findByText(/Room LU7890/)).toBeDefined();
    expect(screen.getByText("Room State")).toBeDefined();

    const closeBtn = screen.getByRole("button", { name: /close drawer/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Room State")).toBeNull();
    });
    vi.unstubAllGlobals();
  });

  it("Feature Flags: clicking a flag card opens rollout configuration drawer and dismisses via Close button", async () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const flagCard = screen.getByText("Voice WebRTC Mesh Relay");
    fireEvent.click(flagCard);

    expect(await screen.findByText("Flag Metadata")).toBeDefined();
    expect(await screen.findByText("Canary Rollout Allocation")).toBeDefined();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Flag Metadata")).toBeNull();
    });
  });

  it("Audit Logs: clicking a real event row displays raw JSON payload in drawer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/admin/audit")) {
          return {
            status: 200,
            ok: true,
            json: async () => ({
              entries: [
                {
                  id: "settlement-1",
                  timestamp: Date.now(),
                  kind: "SETTLEMENT",
                  actionCode: "MATCH_SETTLED",
                  initiatorKind: "system",
                  initiatorId: "usr_host_123",
                  resourceId: "match_abc123",
                  detail: "settle_match_economy: COMMITTED → SETTLED",
                  payload: { previousStatus: "COMMITTED", currentStatus: "SETTLED" },
                },
              ],
            }),
          };
        }
        return { status: 200, ok: true, json: async () => ({}) };
      }),
    );

    const { container } = renderRoute(<AdminAuditLogsPage />);
    await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0));
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    expect(await screen.findByText("Event Metadata")).toBeDefined();
    expect(await screen.findByText("Raw JSON Event Payload")).toBeDefined();

    const closeBtn = screen.getByRole("button", { name: /close drawer/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Event Metadata")).toBeNull();
    });
    vi.unstubAllGlobals();
  });
});

describe("Admin Console — Toast / Alert Notification Feedback", () => {
  it("Users: muting player triggers alert banner with demo disclosure", async () => {
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
    await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0));
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    const muteBtn = await screen.findByRole("button", { name: /mute player|unmute/i });
    fireEvent.click(muteBtn);

    expect(await screen.findByText(/preview updated locally/i)).toBeDefined();
    expect(screen.getByText(/no changes were sent to the server/i)).toBeDefined();
    vi.unstubAllGlobals();
  });

  it("Announcements: delete announcement triggers local preview notice", async () => {
    const { container } = renderRoute(<AdminAnnouncementsPage />);
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    const deleteBtn = await screen.findByRole("button", { name: /delete announcement/i });
    fireEvent.click(deleteBtn);

    expect(await screen.findByText(/preview updated locally/i)).toBeDefined();
    expect(screen.getByText(/was removed from your view only/i)).toBeDefined();
  });
});

describe("Admin Console — KPI Stat & Metric Card Rendering", () => {
  it("StatCard: renders title, value, subtitle", () => {
    render(
      <StatCard
        title="Active Users"
        value="4,200"
        subtitle="Current active sessions"
      />
    );
    expect(screen.getByText("Active Users")).toBeDefined();
    expect(screen.getByText("4,200")).toBeDefined();
    expect(screen.getByText("Current active sessions")).toBeDefined();
  });

  it("StatCard: renders trend badge with direction and comparison label", () => {
    render(
      <StatCard
        title="Weekly Growth"
        value="4,500"
        trend={{ value: 12.5, direction: "up", label: "vs last week" }}
      />
    );
    expect(screen.getByText("Weekly Growth")).toBeDefined();
    expect(screen.getByText("4,500")).toBeDefined();
    expect(screen.getByText("vs last week")).toBeDefined();
    expect(screen.getAllByText(/12.5%/i).length).toBeGreaterThan(0);
  });

  it("MetricCard: renders title, progress bar, and submetrics list", () => {
    render(
      <MetricCard
        title="Cluster Capacity"
        mainValue="85%"
        subtitle="Resource utilization"
        progressPct={85}
        subMetrics={[
          { label: "Memory", value: "2.4 GB", change: "+5%", changeType: "positive" },
          { label: "CPU", value: "45%", change: "-2%", changeType: "neutral" },
        ]}
      />
    );
    expect(screen.getByText("Cluster Capacity")).toBeDefined();
    expect(screen.getAllByText(/85%/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Resource utilization")).toBeDefined();
    expect(screen.getByText("Memory")).toBeDefined();
    expect(screen.getByText("2.4 GB")).toBeDefined();
  });
});

describe("Admin Console — ChartCard & Timeframe Selectors", () => {
  it("ChartCard: renders title, subtitle, and executes onRangeChange when time button clicked", () => {
    const onRangeChange = vi.fn();
    render(
      <ChartCard
        title="Hourly Throughput"
        subtitle="Completed game matches"
        timeRanges={[
          { label: "1H", value: "1h" },
          { label: "6H", value: "6h" },
          { label: "24H", value: "24h" },
        ]}
        selectedRange="6h"
        onRangeChange={onRangeChange}
      >
        <div data-testid="mock-chart-body">Chart Body</div>
      </ChartCard>
    );

    expect(screen.getByText("Hourly Throughput")).toBeDefined();
    expect(screen.getByText("Completed game matches")).toBeDefined();
    expect(screen.getByTestId("mock-chart-body")).toBeDefined();

    const rangeBtn = screen.getByRole("button", { name: "24H" });
    fireEvent.click(rangeBtn);
    expect(onRangeChange).toHaveBeenCalledWith("24h");
  });
});

describe("Admin Console — Sidebar, Topbar, & Breadcrumb Navigation", () => {
  it("AdminSidebar: renders all 10 admin navigation links with proper hrefs", () => {
    renderRoute(<AdminSidebar />);
    expect(screen.getByText("BHALYAM")).toBeDefined();
    expect(screen.getByText("Command Center")).toBeDefined();

    const expectedLinks = [
      { text: "Dashboard", href: "/admin" },
      { text: "Users", href: "/admin/users" },
      { text: "Matches", href: "/admin/matches" },
      { text: "Feature Flags", href: "/admin/feature-flags" },
      { text: "Announcements", href: "/admin/announcements" },
      { text: "Leaderboards", href: "/admin/leaderboards" },
      { text: "Analytics", href: "/admin/analytics" },
      { text: "System Health", href: "/admin/system-health" },
      { text: "Audit Logs", href: "/admin/audit-logs" },
      { text: "Settings", href: "/admin/settings" },
    ];

    for (const item of expectedLinks) {
      const link = screen.getByRole("link", { name: new RegExp(item.text, "i") });
      expect(link.getAttribute("href")).toBe(item.href);
    }
  });

  it("AdminTopbar: renders status badge, refresh button, notifications menu, and profile button", () => {
    const onRefresh = vi.fn();
    renderRoute(
      <AdminTopbar
        onRefresh={onRefresh}
        systemStatus="healthy"
        onlineSockets={142}
      />
    );

    expect(screen.getByText("Operational")).toBeDefined();
    expect(screen.getByText("142 sockets")).toBeDefined();

    // Refresh trigger
    const refreshBtn = screen.getByTitle("Refresh dashboard data");
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Profile trigger opens root profile menu
    const profileBtn = screen.getByTitle("SuperAdmin Console Profile");
    fireEvent.click(profileBtn);
    expect(screen.getByText("Super Admin (Root)")).toBeDefined();
    expect(screen.getByText("Root Access Active")).toBeDefined();
  });
});
