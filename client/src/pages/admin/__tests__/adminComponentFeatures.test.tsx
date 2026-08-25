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
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ status: "HEALTHY" }),
      }),
    );
    renderRoute(<AdminDashboardPage />);
    expect(screen.getByText("Command Center Overview")).toBeDefined();
    expect(screen.getByText("Realtime Player Concurrency (24h)")).toBeDefined();
    expect(screen.getByText("Catalog Popularity")).toBeDefined();
    vi.unstubAllGlobals();
  });

  it("renders /admin/users with table columns and player records", () => {
    renderRoute(<AdminUsersPage />);
    expect(screen.getByText("User Accounts & Moderation")).toBeDefined();
    expect(screen.getByText("Player Account")).toBeDefined();
    expect(screen.getByText("ELO Rating")).toBeDefined();
  });

  it("renders /admin/matches with live rooms and mesh ping", () => {
    renderRoute(<AdminMatchesPage />);
    expect(screen.getByText("Live Match Management")).toBeDefined();
    expect(screen.getByText("Active Match Rooms")).toBeDefined();
    expect(screen.getByText("Mesh Ping")).toBeDefined();
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

  it("renders /admin/leaderboards with top 3 champions podium and ranking", () => {
    renderRoute(<AdminLeaderboardsPage />);
    expect(screen.getByText("Leaderboards & ELO Standings")).toBeDefined();
    expect(screen.getByText("Rank #1 Champion")).toBeDefined();
    expect(screen.getByText("Rank #2 Silver")).toBeDefined();
    expect(screen.getByText("Rank #3 Bronze")).toBeDefined();
  });

  it("renders /admin/analytics with charts, growth trajectories, and retention cohorts", () => {
    renderRoute(<AdminAnalyticsPage />);
    expect(screen.getByText("Telemetry & Growth Analytics")).toBeDefined();
    expect(screen.getByText("Player Growth Trajectory (DAU / MAU)")).toBeDefined();
    expect(screen.getByText("Player Retention Cohort Matrix")).toBeDefined();
  });

  it("renders /admin/system-health with subsystem fleet status and SLA uptime", () => {
    renderRoute(<AdminSystemHealthPage />);
    expect(screen.getByText("Infrastructure & Subsystem Diagnostics")).toBeDefined();
    expect(screen.getByText("Core Subsystems Fleet Status")).toBeDefined();
    expect(screen.getByText("In-Memory RoomManager")).toBeDefined();
  });

  it("renders /admin/audit-logs with immutable audit event records", () => {
    renderRoute(<AdminAuditLogsPage />);
    expect(screen.getByText("Security & System Audit Logs")).toBeDefined();
    expect(screen.getByText("Total Audit Events (24h)")).toBeDefined();
  });

  it("renders /admin/settings with operational tab switchers and form fields", () => {
    renderRoute(<AdminSettingsPage />);
    expect(screen.getByText("Platform Operational Settings")).toBeDefined();
    expect(screen.getByText("General Platform Identity")).toBeDefined();
  });
});

describe("Admin Console — Drawer Opening & Closing Lifecycle", () => {
  it("Users: clicking a row opens detail drawer, clicking close button dismisses it", async () => {
    const { container } = renderRoute(<AdminUsersPage />);
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
  });

  it("Matches: clicking a room row opens match telemetry drawer and displays seat allocation", async () => {
    const { container } = renderRoute(<AdminMatchesPage />);
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    expect(await screen.findByText("Game Engine Telemetry")).toBeDefined();
    expect(await screen.findByText(/Occupied Seat Allocation/i)).toBeDefined();

    const closeBtn = screen.getByRole("button", { name: /close drawer/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Game Engine Telemetry")).toBeNull();
    });
  });

  it("Matches: opening the ST4091 anomalous match renders desync warning, anomaly note, and disconnected seats without crashing (regression for missing AlertTriangle import)", async () => {
    renderRoute(<AdminMatchesPage />);

    // Locate by visible content, not row index — this is the specific
    // edge-case match (m-008) whose stateAnomalyNote branch previously
    // referenced an unimported `AlertTriangle`, throwing
    // "AlertTriangle is not defined" and crashing the whole page to the
    // app's global ErrorBoundary. A crash here means this render() call
    // itself throws; a passing assertion below is direct proof it doesn't.
    const row = screen.getByText("ST4091").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLElement);

    // Drawer opened.
    expect(await screen.findByText("Game Engine Telemetry")).toBeDefined();

    // Desync warning + anomaly note rendered (the exact branch that crashed).
    expect(screen.getByText("State Machine Diagnostic Anomaly")).toBeDefined();
    expect(
      screen.getByText(
        "Engine desynchronization: Client move #31 arrived before move #30 ACK. In-memory state machine quarantined.",
      ),
    ).toBeDefined();
    expect(screen.getByText("DESYNC_QUARANTINE")).toBeDefined();

    // Both ST4091 seats are seeded isDisconnected: true — confirm the
    // disconnected-player badge renders for each occupied seat.
    expect(screen.getAllByText(/^DISCONNECTED/).length).toBe(2);

    // Close, then reopen — confirm the drawer lifecycle survives a second pass.
    const closeBtn = screen.getByRole("button", { name: /close drawer/i });
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText("Game Engine Telemetry")).toBeNull();
    });

    fireEvent.click(screen.getByText("ST4091").closest("tr") as HTMLElement);
    expect(await screen.findByText("Game Engine Telemetry")).toBeDefined();
    expect(screen.getByText("State Machine Diagnostic Anomaly")).toBeDefined();
  });

  it("Matches: opening the HC9012 abandoned match renders its anomaly note without a desync badge", async () => {
    renderRoute(<AdminMatchesPage />);

    const row = screen.getByText("HC9012").closest("tr");
    fireEvent.click(row as HTMLElement);

    expect(await screen.findByText("Game Engine Telemetry")).toBeDefined();
    expect(
      screen.getByText("Match abandoned: Host disconnected unexpectedly during Over #1"),
    ).toBeDefined();
    // HC9012 has no hasDesyncWarning, so engine status must read SYNCHRONIZED.
    expect(screen.getByText("SYNCHRONIZED")).toBeDefined();
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

  it("Audit Logs: clicking a log event row displays raw JSON payload in drawer", async () => {
    const { container } = renderRoute(<AdminAuditLogsPage />);
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    expect(await screen.findByText("Event Metadata")).toBeDefined();
    expect(await screen.findByText("Raw JSON Event Payload")).toBeDefined();

    const closeBtn = screen.getByRole("button", { name: /close drawer/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Event Metadata")).toBeNull();
    });
  });
});

describe("Admin Console — Toast / Alert Notification Feedback", () => {
  it("Users: muting player triggers alert banner with demo disclosure", async () => {
    const { container } = renderRoute(<AdminUsersPage />);
    const firstRow = container.querySelectorAll("tbody tr")[0];
    fireEvent.click(firstRow);

    const muteBtn = await screen.findByRole("button", { name: /mute player|unmute/i });
    fireEvent.click(muteBtn);

    expect(await screen.findByText(/preview updated locally/i)).toBeDefined();
    expect(screen.getByText(/no changes were sent to the server/i)).toBeDefined();
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
