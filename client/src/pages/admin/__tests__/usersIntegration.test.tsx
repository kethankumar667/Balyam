import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminUsersPage from "../users";

/**
 * Users, fully graduated off `MOCK_25_USERS`.
 *
 * `GET /api/admin/users` already returned real accounts, but padded the
 * list with 25 fabricated rows indistinguishable from real ones, and every
 * row's matchesPlayed/winRate/eloRating/favoriteGame were hardcoded
 * constants even for real accounts. The server now computes those from
 * `ProfileService` (the same source the public Leaderboard reads) and this
 * page renders exactly what comes back — no mock padding, no invented
 * per-row stats, no "status" column (nothing real backs it).
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "usr-real-001",
    name: "Kethan Kumar",
    email: "kethan@bhalyam.io",
    role: "super_admin",
    matchesPlayed: 12,
    winRate: "58%",
    rating: 1540,
    joinedAt: Date.now() - 30 * 86_400_000,
    lastActiveAt: Date.now() - 60_000,
    favoriteGame: "Ludo 🎲",
    ...overrides,
  };
}

function stubFetch(users: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/users/role")) return jsonResponse(200, { success: true, role: "admin" });
      if (url.includes("/api/admin/users")) return jsonResponse(200, { users, total: users.length });
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

describe("Admin Users — real accounts, no mock padding", () => {
  it("renders exactly the real users the server returns — nothing appended", async () => {
    stubFetch([user(), user({ id: "usr-real-002", name: "Second Player", email: "second@bhalyam.io", role: "member" })]);
    renderRoute(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());
    expect(screen.getByText("Second Player")).toBeDefined();
    // The old mock cohort never appears alongside real rows.
    expect(screen.queryByText("Venkatasubramanian Ramaswamy Krishnamurthy")).toBeNull();
    expect(screen.queryByText("REAL ACCOUNT")).toBeNull();
  });

  it("shows real per-player stats rather than a hardcoded placeholder", async () => {
    stubFetch([user({ matchesPlayed: 7, winRate: "43%", rating: 1380, favoriteGame: "Rummy" })]);
    renderRoute(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("1380")).toBeDefined();
    expect(screen.getByText("Rummy")).toBeDefined();
    // "1200"/"Ludo" were the old universal hardcoded values — never present here.
    expect(screen.queryByText("1200")).toBeNull();
  });

  it("promoting a role calls the real endpoint and reflects the result, not a local-only preview", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());

    fireEvent.click(screen.getByText("Kethan Kumar"));
    fireEvent.click(await screen.findByRole("button", { name: "Admin" }));

    await waitFor(() => expect(screen.getByText(/successfully updated/i)).toBeDefined());
  });

  it("muting/banning stays an honestly-disclosed local preview — no real moderation endpoint exists", async () => {
    stubFetch([user()]);
    renderRoute(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());

    fireEvent.click(screen.getByText("Kethan Kumar"));
    fireEvent.click(await screen.findByRole("button", { name: /mute player/i }));

    expect(await screen.findByText(/no changes were sent to the server/i)).toBeDefined();
  });

  it("paginates real server results 10 per page", async () => {
    const users = Array.from({ length: 25 }, (_, i) =>
      user({ id: `usr-${i}`, name: `Player ${i}`, email: `player${i}@bhalyam.io` }),
    );
    stubFetch(users);
    renderRoute(<AdminUsersPage />);

    await waitFor(() =>
      expect(screen.getByText((_, el) => el?.textContent?.trim() === "Showing 1 to 10 of 25 entries")).toBeDefined(),
    );
    expect(screen.getByText("1 / 3")).toBeDefined();
    expect(screen.getByText("Player 0")).toBeDefined();

    const nextBtn = screen.getAllByRole("button").find((b) => b.innerHTML.includes("lucide-chevron-right"));
    fireEvent.click(nextBtn as HTMLElement);

    await waitFor(() =>
      expect(screen.getByText((_, el) => el?.textContent?.trim() === "Showing 11 to 20 of 25 entries")).toBeDefined(),
    );
    expect(screen.getByText("2 / 3")).toBeDefined();
  });

  it("renders an honest empty state when the server has no registered users", async () => {
    stubFetch([]);
    renderRoute(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText(/no player accounts registered/i)).toBeDefined());
  });

  it("surfaces a failure honestly rather than falling back to sample accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("user service down")));
    renderRoute(<AdminUsersPage />);

    await waitFor(() => expect(screen.getAllByText(/user data unavailable/i).length).toBeGreaterThan(0));
    expect(screen.queryByText("Kethan Kumar")).toBeNull();
  });
});
