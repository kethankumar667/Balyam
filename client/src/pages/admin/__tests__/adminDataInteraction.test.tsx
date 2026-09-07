import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import AdminFeatureFlagsPage from "../feature-flags";
import AdminAnnouncementsPage from "../announcements";

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("Admin Console — Search Functionality & Filtering to Matching Results", () => {
  // Users Page search coverage moved to usersIntegration.test.tsx —
  // that page now queries /api/admin/users rather than filtering MOCK_25_USERS.

  // Matches Page search coverage moved to matchesIntegration.test.tsx —
  // that page now queries /api/operational/rooms server-side rather than
  // filtering a hardcoded array.

  it("Feature Flags Page: filters flag cards by feature flag key or name", async () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by flag name/i);

    fireEvent.change(searchInput, { target: { value: "bhalyam.voice.webrtc_mesh" } });

    await waitFor(() => {
      expect(screen.getByText("Voice WebRTC Mesh Relay")).toBeDefined();
      expect(screen.queryByText("Rummy Auto-Arrange AI Assistant")).toBeNull();
    });
  });

  it("Announcements Page: filters announcement rows by headline query", async () => {
    renderRoute(<AdminAnnouncementsPage />);
    const searchInput = screen.getByPlaceholderText(/Search announcements by title/i);

    fireEvent.change(searchInput, { target: { value: "Maintenance" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Scheduled Maintenance/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Word Building Weekend Championship/i)).toBeNull();
    });
  });

  // Leaderboards Page search coverage moved to leaderboardsIntegration.test.tsx —
  // that page now queries /api/ranking/leaderboard server-side rather than
  // filtering a hardcoded array.

  // Audit Logs Page search coverage moved to auditLogsIntegration.test.tsx —
  // that page now queries /api/admin/audit rather than filtering a hardcoded array.
});

describe("Admin Console — No Search Results & Actionable Recovery", () => {
  // Matches Page empty-search coverage moved to matchesIntegration.test.tsx.

  it("Feature Flags Page: displays empty state and clears search on Clear Search click", async () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by flag name/i);

    fireEvent.change(searchInput, { target: { value: "NON_EXISTENT_FLAG_KEY" } });

    await waitFor(() => {
      expect(screen.getByText("No feature flags found")).toBeDefined();
      expect(screen.getByText(/No feature flags match "NON_EXISTENT_FLAG_KEY"/i)).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No feature flags found")).toBeNull();
      expect(screen.getByText("Voice WebRTC Mesh Relay")).toBeDefined();
    });
  });

  it("Announcements Page: displays empty state and clears search on Clear Search click", async () => {
    renderRoute(<AdminAnnouncementsPage />);
    const searchInput = screen.getByPlaceholderText(/Search announcements by title/i);

    fireEvent.change(searchInput, { target: { value: "NON_EXISTENT_ANNOUNCEMENT_HEADLINE" } });

    await waitFor(() => {
      expect(screen.getByText("No announcements found")).toBeDefined();
      expect(screen.getByText(/No announcements match "NON_EXISTENT_ANNOUNCEMENT_HEADLINE"/i)).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No announcements found")).toBeNull();
    });
  });

  // Leaderboards Page empty-search coverage moved to leaderboardsIntegration.test.tsx.

  // Audit Logs Page empty-search coverage moved to auditLogsIntegration.test.tsx.
});

describe("Admin Console — Dropdown Filtering & Reset Functionality", () => {
  // Matches Page filter coverage moved to matchesIntegration.test.tsx.

  it("Feature Flags Page: filters by environment (production vs canary)", async () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const envSelect = screen.getByLabelText("Filter by environment");

    fireEvent.change(envSelect, { target: { value: "canary" } });

    await waitFor(() => {
      expect(screen.getByText("Rummy Auto-Arrange AI Assistant")).toBeDefined();
      expect(screen.queryByText("Voice WebRTC Mesh Relay")).toBeNull();
    });
  });

  // Leaderboards Page filter coverage moved to leaderboardsIntegration.test.tsx.

  // Audit Logs Page filter coverage moved to auditLogsIntegration.test.tsx.
});

// Users Page pagination coverage moved to usersIntegration.test.tsx —
// that page now paginates real server results rather than MOCK_25_USERS.
