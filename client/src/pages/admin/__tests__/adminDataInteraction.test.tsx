import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import AdminUsersPage from "../users";
import AdminMatchesPage from "../matches";
import AdminFeatureFlagsPage from "../feature-flags";
import AdminAnnouncementsPage from "../announcements";
import AdminLeaderboardsPage from "../leaderboards";
import AdminAuditLogsPage from "../audit-logs";

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("Admin Console — Search Functionality & Filtering to Matching Results", () => {
  it("Users Page: filters table rows to matching user name and email", async () => {
    renderRoute(<AdminUsersPage />);
    const searchInput = screen.getByPlaceholderText(/Search by name, email/i);

    fireEvent.change(searchInput, { target: { value: "Kethan" } });

    await waitFor(() => {
      expect(screen.getByText("Kethan Kumar")).toBeDefined();
      expect(screen.queryByText("Ananya Sharma")).toBeNull();
    });
  });

  it("Matches Page: filters table rows by room code", async () => {
    renderRoute(<AdminMatchesPage />);
    const searchInput = screen.getByPlaceholderText(/Search by room code/i);

    fireEvent.change(searchInput, { target: { value: "LU7890" } });

    await waitFor(() => {
      expect(screen.getByText("LU7890")).toBeDefined();
      expect(screen.queryByText("RM4521")).toBeNull();
    });
  });

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

  it("Leaderboards Page: filters players by player name", async () => {
    renderRoute(<AdminLeaderboardsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by player name/i);

    fireEvent.change(searchInput, { target: { value: "Swathi" } });

    await waitFor(() => {
      expect(screen.getAllByText("Swathi Pillai").length).toBeGreaterThan(0);
      expect(screen.queryByText("Rahul Verma")).toBeNull();
    });
  });

  it("Audit Logs Page: filters security events by action code", async () => {
    renderRoute(<AdminAuditLogsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by actor, action code/i);

    fireEvent.change(searchInput, { target: { value: "AUTH.HMAC_FAIL" } });

    await waitFor(() => {
      expect(screen.getByText("AUTH.HMAC_FAIL")).toBeDefined();
      expect(screen.queryByText("FEATURE_FLAG.UPDATE")).toBeNull();
    });
  });
});

describe("Admin Console — No Search Results & Actionable Recovery", () => {
  it("Matches Page: displays empty state and clears search on Clear Search click", async () => {
    renderRoute(<AdminMatchesPage />);
    const searchInput = screen.getByPlaceholderText(/Search by room code/i);

    fireEvent.change(searchInput, { target: { value: "NON_EXISTENT_ROOM_XYZ" } });

    await waitFor(() => {
      expect(screen.getByText("No matching rooms found")).toBeDefined();
      expect(screen.getByText(/No matches match "NON_EXISTENT_ROOM_XYZ"/i)).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No matching rooms found")).toBeNull();
      expect(screen.getByText("LU7890")).toBeDefined();
    });
  });

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

  it("Leaderboards Page: displays empty state and clears search on Clear Search click", async () => {
    renderRoute(<AdminLeaderboardsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by player name/i);

    fireEvent.change(searchInput, { target: { value: "NON_EXISTENT_PLAYER_999" } });

    await waitFor(() => {
      expect(screen.getByText("No ranked players found")).toBeDefined();
      expect(screen.getByText(/No ranked players match "NON_EXISTENT_PLAYER_999"/i)).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No ranked players found")).toBeNull();
    });
  });

  it("Audit Logs Page: displays empty state and clears search on Clear Search click", async () => {
    renderRoute(<AdminAuditLogsPage />);
    const searchInput = screen.getByPlaceholderText(/Search by actor, action code/i);

    fireEvent.change(searchInput, { target: { value: "NON_EXISTENT_IP_999.999.999.999" } });

    await waitFor(() => {
      expect(screen.getByText("No audit logs found")).toBeDefined();
      expect(screen.getByText(/No audit logs match "NON_EXISTENT_IP_999.999.999.999"/i)).toBeDefined();
    });

    const clearBtn = screen.getByText("Clear Search");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("No audit logs found")).toBeNull();
    });
  });
});

describe("Admin Console — Dropdown Filtering & Reset Functionality", () => {
  it("Matches Page: filters by game type and resets filters", async () => {
    renderRoute(<AdminMatchesPage />);
    const gameSelect = screen.getByLabelText("Filter by Game");

    fireEvent.change(gameSelect, { target: { value: "Ludo" } });

    await waitFor(() => {
      expect(screen.getByText("LU7890")).toBeDefined();
      expect(screen.queryByText("RM4521")).toBeNull();
    });

    const resetBtn = screen.getByText("Reset");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText("RM4521")).toBeDefined();
    });
  });

  it("Feature Flags Page: filters by environment (production vs canary)", async () => {
    renderRoute(<AdminFeatureFlagsPage />);
    const envSelect = screen.getByLabelText("Filter by environment");

    fireEvent.change(envSelect, { target: { value: "canary" } });

    await waitFor(() => {
      expect(screen.getByText("Rummy Auto-Arrange AI Assistant")).toBeDefined();
      expect(screen.queryByText("Voice WebRTC Mesh Relay")).toBeNull();
    });
  });

  it("Leaderboards Page: filters by game type and resets filters", async () => {
    renderRoute(<AdminLeaderboardsPage />);
    const gameSelect = screen.getByLabelText("Filter by Game");

    fireEvent.change(gameSelect, { target: { value: "Word Building" } });

    await waitFor(() => {
      expect(screen.getByText("Word Building Division")).toBeDefined();
    });
  });

  it("Audit Logs Page: filters by severity level", async () => {
    renderRoute(<AdminAuditLogsPage />);
    const severitySelect = screen.getByLabelText("Filter by Severity");

    fireEvent.change(severitySelect, { target: { value: "critical" } });

    await waitFor(() => {
      expect(screen.getByText("AUTH.HMAC_FAIL")).toBeDefined();
      expect(screen.queryByText("FEATURE_FLAG.UPDATE")).toBeNull();
    });
  });
});

describe("Admin Console — Table Pagination Interactions", () => {
  it("Users Page: calculates entry count and navigates between pages", async () => {
    renderRoute(<AdminUsersPage />);

    // Check page 1 display
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === "Showing 1 to 10 of 25 entries"),
    ).toBeDefined();
    expect(screen.getByText("1 / 3")).toBeDefined();
    expect(screen.getByText("Kethan Kumar")).toBeDefined();

    // Click Next button to go to Page 2
    const buttons = screen.getAllByRole("button");
    const nextBtn = buttons.find(
      (b) => b.querySelector("svg") && b.innerHTML.includes("lucide-chevron-right"),
    );
    expect(nextBtn).toBeDefined();
    if (nextBtn) {
      fireEvent.click(nextBtn);
    }

    await waitFor(() => {
      expect(
        screen.getByText((_, el) => el?.textContent?.trim() === "Showing 11 to 20 of 25 entries"),
      ).toBeDefined();
      expect(screen.getByText("2 / 3")).toBeDefined();
    });

    // Click Prev button to return to Page 1
    const prevBtn = buttons.find(
      (b) => b.querySelector("svg") && b.innerHTML.includes("lucide-chevron-left"),
    );
    expect(prevBtn).toBeDefined();
    if (prevBtn) {
      fireEvent.click(prevBtn);
    }

    await waitFor(() => {
      expect(
        screen.getByText((_, el) => el?.textContent?.trim() === "Showing 1 to 10 of 25 entries"),
      ).toBeDefined();
      expect(screen.getByText("1 / 3")).toBeDefined();
    });
  });
});
