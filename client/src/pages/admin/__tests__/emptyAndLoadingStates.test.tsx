import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import EmptyState from "../../../components/admin/empty-state";
import LoadingState from "../../../components/admin/loading-state";

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

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("Admin Console — EmptyState Component Integration", () => {
  it("renders EmptyState with default title and description", () => {
    render(<EmptyState />);
    expect(screen.getByText("No records found")).toBeDefined();
    expect(screen.getByText(/currently no items matching your criteria/i)).toBeDefined();
  });

  it("renders EmptyState with custom title, description, and action button", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="Custom Empty State"
        description="Custom description message."
        action={<button onClick={onAction}>Custom Action</button>}
      />
    );
    expect(screen.getByText("Custom Empty State")).toBeDefined();
    expect(screen.getByText("Custom description message.")).toBeDefined();
    const btn = screen.getByText("Custom Action");
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe("Admin Console — LoadingState Component Integration", () => {
  it("renders table variant loading skeletons", () => {
    const { container } = render(<LoadingState variant="table" rows={4} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders cards variant loading skeletons", () => {
    const { container } = render(<LoadingState variant="cards" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders chart variant loading skeleton with placeholder text", () => {
    render(<LoadingState variant="chart" />);
    expect(screen.getByText("Loading visual analytics...")).toBeDefined();
  });
});

describe("Admin Users Page — Search & Filter Empty States", () => {
  it("displays 'No search results found' and clears search when clicking Clear Search", async () => {
    renderRoute(<AdminUsersPage />);
    const searchInput = screen.getByPlaceholderText(/Search by name, email/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent_user_query_12345" } });

    await waitFor(() => {
      expect(screen.getByText("No search results found")).toBeDefined();
      expect(screen.getByText(/No users match "nonexistent_user_query_12345"/i)).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No search results found")).toBeNull();
    });
  });

  it("displays 'No users match selected filters' and resets filters on Reset Filters click", async () => {
    renderRoute(<AdminUsersPage />);
    const roleSelect = screen.getByLabelText("Role");
    const statusSelect = screen.getByLabelText("Status");

    // Guest + Warning combination has 0 entries in mock data
    fireEvent.change(roleSelect, { target: { value: "guest" } });
    fireEvent.change(statusSelect, { target: { value: "warning" } });

    await waitFor(() => {
      expect(screen.getByText("No users match selected filters")).toBeDefined();
    });

    const resetBtn = screen.getByText("Reset Filters");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.queryByText("No users match selected filters")).toBeNull();
    });
  });
});

describe("Admin Matches Page — Search & Filter Empty States", () => {
  it("displays 'No matching rooms found' on empty search and clears it", async () => {
    renderRoute(<AdminMatchesPage />);
    const searchInput = screen.getByPlaceholderText(/Search by room code, host/i);
    fireEvent.change(searchInput, { target: { value: "ZZ99999" } });

    await waitFor(() => {
      expect(screen.getByText("No matching rooms found")).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No matching rooms found")).toBeNull();
    });
  });

  it("displays 'No matches meet selected filters' on zero-result filter combination", async () => {
    renderRoute(<AdminMatchesPage />);
    const statusSelect = screen.getByLabelText("Status");
    // Abandoned status has 0 entries in mock data
    fireEvent.change(statusSelect, { target: { value: "abandoned" } });

    await waitFor(() => {
      expect(screen.getByText("No matches meet selected filters")).toBeDefined();
    });

    const resetBtn = screen.getByText("Reset Filters");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.queryByText("No matches meet selected filters")).toBeNull();
    });
  });
});

describe("Admin Feature Flags Page — Search & Filter Empty States", () => {
  it("displays 'No feature flags found' on empty search and clears it", async () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by flag name, key/i);
    fireEvent.change(searchInput, { target: { value: "unknown_flag_key" } });

    await waitFor(() => {
      expect(screen.getByText("No feature flags found")).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No feature flags found")).toBeNull();
    });
  });

  it("supports filtering by state and environment", async () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const stateSelect = screen.getByLabelText("State & Env");
    fireEvent.change(stateSelect, { target: { value: "canary" } });

    await waitFor(() => {
      expect(screen.getByText(/Smart TV Spectator View/i)).toBeDefined();
    });
  });
});

describe("Admin Announcements Page — Search & Empty Tab States", () => {
  it("displays 'No announcements found' on empty search and clears it", async () => {
    renderRoute(<AdminAnnouncementsPage />);
    const searchInput = screen.getByPlaceholderText(/Search announcements by title/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent_announcement_phrase" } });

    await waitFor(() => {
      expect(screen.getByText("No announcements found")).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No announcements found")).toBeNull();
    });
  });

  it("switches tabs and displays active announcements", () => {
    renderRoute(<AdminAnnouncementsPage />);
    const publishedTab = screen.getByRole("button", { name: /PUBLISHED/i });
    fireEvent.click(publishedTab);

    expect(screen.getAllByText(/Word Building Season 2 Kickoff!/i).length).toBeGreaterThan(0);
  });
});

describe("Admin Leaderboards Page — Search & Filter Empty States", () => {
  it("displays 'No ranked players found' on empty search and clears it", async () => {
    renderRoute(<AdminLeaderboardsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by player name or game/i);
    fireEvent.change(searchInput, { target: { value: "UnknownPlayer999" } });

    await waitFor(() => {
      expect(screen.getByText("No ranked players found")).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No ranked players found")).toBeNull();
    });
  });

  it("displays 'No standings match selected filters' when filter produces 0 rows", async () => {
    renderRoute(<AdminLeaderboardsPage />);
    const seasonSelect = screen.getByLabelText("Season");
    // Season 1 (Archived) has 0 entries in mock data
    fireEvent.change(seasonSelect, { target: { value: "Season 1" } });

    await waitFor(() => {
      expect(screen.getByText("No standings match selected filters")).toBeDefined();
    });

    const resetBtn = screen.getByText("Reset Filters");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.queryByText("No standings match selected filters")).toBeNull();
    });
  });
});

describe("Admin Audit Logs Page — Search & Severity Filter Empty States", () => {
  it("displays 'No audit logs found' on empty search and clears it", async () => {
    renderRoute(<AdminAuditLogsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by actor, action code/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent_actor_ip_999" } });

    await waitFor(() => {
      expect(screen.getByText("No audit logs found")).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No audit logs found")).toBeNull();
    });
  });
});

describe("Admin Dashboard, Analytics & Settings Pages — State Transitions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ status: "HEALTHY" }),
      }),
    );
  });

  it("renders AdminDashboardPage and syncs telemetry", () => {
    renderRoute(<AdminDashboardPage />);
    expect(screen.getByText(/Command Center Overview/i)).toBeDefined();
    const syncBtn = screen.getByRole("button", { name: /Sync Telemetry/i });
    fireEvent.click(syncBtn);
  });

  it("switches time ranges on AdminAnalyticsPage", () => {
    renderRoute(<AdminAnalyticsPage />);
    const buttons = screen.getAllByRole("button", { name: /7D/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
  });

  it("switches tabs smoothly on AdminSettingsPage", () => {
    renderRoute(<AdminSettingsPage />);
    const authTab = screen.getByRole("button", { name: /Authentication/i });
    fireEvent.click(authTab);
    expect(authTab).toBeDefined();
  });
});
