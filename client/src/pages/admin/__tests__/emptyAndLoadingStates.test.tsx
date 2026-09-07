import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import EmptyState from "../../../components/admin/empty-state";
import LoadingState from "../../../components/admin/loading-state";

import AdminDashboardPage from "../dashboard";
import AdminUsersPage from "../users";
import AdminFeatureFlagsPage from "../feature-flags";
import AdminAnnouncementsPage from "../announcements";
import AdminAnalyticsPage from "../analytics";
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
  function stubOneRealUser() {
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
                  role: "member",
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
  }

  it("displays 'No search results found' and clears search when clicking Clear Search", async () => {
    stubOneRealUser();
    renderRoute(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());
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
    vi.unstubAllGlobals();
  });

  it("displays 'No users match selected filters' and resets filters on Reset Filters click", async () => {
    stubOneRealUser();
    renderRoute(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());
    const roleSelect = screen.getByLabelText("Filter by Role");

    // The only seeded user is role "member" — filtering to "admin" yields zero.
    fireEvent.change(roleSelect, { target: { value: "admin" } });

    await waitFor(() => {
      expect(screen.getByText("No users match selected filters")).toBeDefined();
    });

    const resetBtn = screen.getByText("Reset Filters");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.queryByText("No users match selected filters")).toBeNull();
    });
    vi.unstubAllGlobals();
  });
});

// Matches Page empty/filter-empty coverage moved to matchesIntegration.test.tsx —
// that page now sources live rooms and completed matches from real
// endpoints instead of a hardcoded array with seeded "zero-result" rows.

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
    const stateSelect = screen.getByLabelText("Filter by environment");
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

// Leaderboards Page empty/filter-empty coverage moved to
// leaderboardsIntegration.test.tsx — that page queries /api/ranking/leaderboard
// server-side and dropped the "season" filter (no real backing field).

// Audit Logs Page empty-search coverage moved to auditLogsIntegration.test.tsx —
// that page now queries /api/admin/audit rather than filtering a hardcoded array.

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

  it("renders AdminDashboardPage and shows a real refreshing state while syncing telemetry", async () => {
    renderRoute(<AdminDashboardPage />);
    expect(screen.getByText(/Command Center Overview/i)).toBeDefined();

    const syncBtn = screen.getByRole("button", { name: /Sync Telemetry/i });

    // The page also fetches on mount (useEffect → fetchDashboardData), so the
    // icon starts mid-spin from that initial load. Wait for it to settle
    // before using it as a "not spinning" baseline for the click below.
    await waitFor(() => {
      expect(syncBtn.querySelector("svg")?.getAttribute("class")).not.toContain("animate-spin");
    });

    fireEvent.click(syncBtn);

    // setLoading(true) runs synchronously as the first statement in
    // fetchDashboardData, before the awaited fetch resolves — so the
    // spin class must be present immediately after the click, not just
    // "eventually" once the mocked fetch settles.
    expect(syncBtn.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");

    await waitFor(() => {
      expect(syncBtn.querySelector("svg")?.getAttribute("class")).not.toContain("animate-spin");
    });
  });

  it("switches time ranges on AdminAnalyticsPage and visibly re-selects the active range button", async () => {
    renderRoute(<AdminAnalyticsPage />);

    const thirtyDayBtn = screen.getByRole("button", { name: "30D" });
    const sevenDayBtn = screen.getByRole("button", { name: "7D" });

    // Default range is "30d" — confirm it starts as the active (gradient) button.
    expect(thirtyDayBtn.className).toContain("from-amber-500");
    expect(sevenDayBtn.className).not.toContain("from-amber-500");

    fireEvent.click(sevenDayBtn);

    // handleTimeRangeChange sets loading synchronously, which swaps the KPI
    // grid and both charts for LoadingState — confirm that real transition
    // happens (two chart placeholders render while loading is true).
    expect(screen.getAllByText("Loading visual analytics...").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "7D" }).className).toContain("from-amber-500");
    });
    expect(screen.getByRole("button", { name: "30D" }).className).not.toContain("from-amber-500");
  });

  it("switches tabs smoothly on AdminSettingsPage, swapping General content for Authentication content", async () => {
    renderRoute(<AdminSettingsPage />);

    expect(screen.getByText("General Platform Identity")).toBeDefined();
    expect(screen.queryByText("Authentication & Session Configuration")).toBeNull();

    const authTab = screen.getByRole("button", { name: /Authentication/i });
    fireEvent.click(authTab);

    await waitFor(() => {
      expect(screen.getByText("Authentication & Session Configuration")).toBeDefined();
    });
    expect(screen.queryByText("General Platform Identity")).toBeNull();
  });
});
