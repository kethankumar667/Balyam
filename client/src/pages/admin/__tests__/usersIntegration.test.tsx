import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AdminUsersPage from "../users";
import AdminUserDetailPage from "../users/UserDetailPage";
import { jsonResponse, signInOperator, stubFetch, user } from "./adminUsersFixtures";

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
 *
 * Inspecting a player opens that player's own page (`/admin/users/:userId`); what that page does is
 * covered by userDetailPage.test.tsx. This file covers the list and how it hands over to the page.
 */

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderList(entry = "/admin/users") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const here = () => screen.getByTestId("location").textContent;

beforeEach(() => signInOperator());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin Users — real accounts, no mock padding", () => {
  it("renders exactly the real users the server returns — nothing appended", async () => {
    stubFetch([user(), user({ id: "usr-real-002", name: "Second Player", email: "second@bhalyam.io", role: "member" })]);
    renderList();

    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());
    expect(screen.getByText("Second Player")).toBeDefined();
    // The old mock cohort never appears alongside real rows.
    expect(screen.queryByText("Venkatasubramanian Ramaswamy Krishnamurthy")).toBeNull();
    expect(screen.queryByText("REAL ACCOUNT")).toBeNull();
  });

  it("shows real per-player stats rather than a hardcoded placeholder", async () => {
    stubFetch([user({ matchesPlayed: 7, winRate: "43%", rating: 1380, favoriteGame: "Rummy" })]);
    renderList();

    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("1380")).toBeDefined();
    expect(screen.getByText("Rummy")).toBeDefined();
    // "1200"/"Ludo" were the old universal hardcoded values — never present here.
    expect(screen.queryByText("1200")).toBeNull();
  });

  it("paginates real server results 10 per page", async () => {
    const users = Array.from({ length: 25 }, (_, i) =>
      user({ id: `usr-${i}`, name: `Player ${i}`, email: `player${i}@bhalyam.io` }),
    );
    stubFetch(users);
    renderList();

    await waitFor(() =>
      expect(screen.getByText((_, el) => el?.textContent?.trim() === "Showing 1 to 10 of 25 entries")).toBeDefined(),
    );
    expect(screen.getByText("1 / 3")).toBeDefined();
    expect(screen.getByText("Player 0")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() =>
      expect(screen.getByText((_, el) => el?.textContent?.trim() === "Showing 11 to 20 of 25 entries")).toBeDefined(),
    );
    expect(screen.getByText("2 / 3")).toBeDefined();
  });

  it("renders an honest empty state when the server has no registered users", async () => {
    stubFetch([]);
    renderList();

    await waitFor(() => expect(screen.getByText(/no player identities found/i)).toBeDefined());
  });

  it("surfaces a failure honestly rather than falling back to sample accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("user service down")));
    renderList();

    await waitFor(() => expect(screen.getAllByText(/user data unavailable/i).length).toBeGreaterThan(0));
    expect(screen.queryByText("Kethan Kumar")).toBeNull();
  });

  it("requests server search and filters, resetting pagination and preserving missing guest values", async () => {
    stubFetch([user({ accountKind: "guest", role: "member", email: "", joinedAt: null, lastActiveAt: null, favoriteGame: "" })]);
    renderList();
    await screen.findByRole("link", { name: "Inspect Kethan Kumar" });
    fireEvent.click(screen.getByRole("combobox", { name: "Identity kind" }));
    fireEvent.click(screen.getByRole("option", { name: "Guests" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search users" }), { target: { value: "Kethan" } });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("page=1&pageSize=10&search=Kethan&kind=guest&role=all"))).toBe(true));
    expect(screen.queryByText(/@guest|unknown@/i)).toBeNull();
    expect(screen.getByText("Guest")).toBeDefined();
  });

  it("resets a server page when role filters change", async () => {
    stubFetch(Array.from({ length: 25 }, (_, index) => user({ id: `user-${index}`, name: `Player ${index}` })));
    renderList();
    await screen.findByRole("button", { name: "Next page" });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Player 10");
    fireEvent.click(screen.getByRole("combobox", { name: "Filter by Role" }));
    fireEvent.click(screen.getByRole("option", { name: "Admin" }));
    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      expect(String(calls[calls.length - 1]?.[0])).toContain("page=1&pageSize=10&search=&kind=all&role=admin");
    });
  });

  it("debounces search and ignores a late directory response after changing filters", async () => {
    let resolveOld: (response: Response) => void = () => undefined;
    vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOld = resolve; }))
      .mockImplementation(async () => jsonResponse(200, { users: [user({ accountKind: "guest", name: "Current Guest" })], total: 1, page: 1, pageSize: 10 })));
    renderList();
    fireEvent.click(screen.getByRole("combobox", { name: "Identity kind" }));
    fireEvent.click(screen.getByRole("option", { name: "Guests" }));
    await screen.findByText("Current Guest");
    await act(async () => resolveOld(jsonResponse(200, { users: [user({ name: "Stale Member" })], total: 1, page: 1, pageSize: 10 }) as Response));
    expect(screen.queryByText("Stale Member")).toBeNull();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();
    fireEvent.change(screen.getByRole("textbox", { name: "Search users" }), { target: { value: "K" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Search users" }), { target: { value: "Kethan" } });
    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0][0])).toContain("search=Kethan&kind=guest");
  });
});

describe("Admin Users — Inspect opens the player's own page", () => {
  it("is a real link to /admin/users/:userId, so it can be opened in a new tab or shared", async () => {
    stubFetch([user({ role: "member" })]);
    renderList();

    const inspect = await screen.findByRole("link", { name: "Inspect Kethan Kumar" });
    expect(inspect.getAttribute("href")).toBe("/admin/users/usr-real-001");
  });

  it("encodes an identity id that is not URL-safe", async () => {
    stubFetch([user({ id: "guest/odd id?1", name: "Odd Guest", role: "member" })]);
    renderList();

    const inspect = await screen.findByRole("link", { name: "Inspect Odd Guest" });
    expect(inspect.getAttribute("href")).toBe("/admin/users/guest%2Fodd%20id%3F1");
  });

  it("opens the page and loads that identity, with no drawer over the list", async () => {
    stubFetch([user({ role: "member" })]);
    renderList();

    fireEvent.click(await screen.findByRole("link", { name: "Inspect Kethan Kumar" }));

    expect(await screen.findByText("Legacy match associations unavailable")).toBeDefined();
    expect(here()).toBe("/admin/users/usr-real-001");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Search users" })).toBeNull();
  });

  it("comes back to the same page, search and filters it left", async () => {
    stubFetch(Array.from({ length: 25 }, (_, i) => user({ id: `usr-${i}`, name: `Player ${i}`, role: "member", accountKind: "guest" })));
    renderList("/admin/users?kind=guest&page=2");
    fireEvent.click(await screen.findByRole("link", { name: "Inspect Player 10" }));
    fireEvent.click(await screen.findByRole("link", { name: "Back to users" }));

    expect(await screen.findByText("Player 10")).toBeDefined();
    expect(here()).toBe("/admin/users?kind=guest&page=2");
    const calls = vi.mocked(fetch).mock.calls;
    expect(String(calls[calls.length - 1]?.[0])).toContain("page=2&pageSize=10&search=&kind=guest&role=all");
  });
});

describe("Admin Users — the list's page, search and filters live in the URL", () => {
  it("opens on the page and filters in the address, with the search box filled in", async () => {
    stubFetch([user({ accountKind: "guest", role: "member" })]);
    renderList("/admin/users?kind=guest&role=member&page=2&q=Kethan");

    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("page=2&pageSize=10&search=Kethan&kind=guest&role=member"))).toBe(true),
    );
    expect((screen.getByRole("textbox", { name: "Search users" }) as HTMLInputElement).value).toBe("Kethan");
  });

  it("writes a changed filter, page and search to the address, dropping defaults", async () => {
    stubFetch(Array.from({ length: 25 }, (_, i) => user({ id: `usr-${i}`, name: `Player ${i}`, role: "member" })));
    renderList();
    await screen.findByRole("button", { name: "Next page" });

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(here()).toBe("/admin/users?page=2"));

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by Role" }));
    fireEvent.click(screen.getByRole("option", { name: "Admin" }));
    await waitFor(() => expect(here()).toBe("/admin/users?role=admin"));

    fireEvent.change(screen.getByRole("textbox", { name: "Search users" }), { target: { value: "Kethan" } });
    await waitFor(() => expect(here()).toBe("/admin/users?role=admin&q=Kethan"));
  });

  it("falls back to the defaults for values the list does not know", async () => {
    stubFetch([user()]);
    renderList("/admin/users?kind=bogus&role=root&page=-3");

    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("page=1&pageSize=10&search=&kind=all&role=all"))).toBe(true),
    );
  });
});
