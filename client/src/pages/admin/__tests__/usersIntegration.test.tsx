import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminUsersPage from "../users";
import { useAuthStore } from "../../../store/authStore";

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
    accountKind: "member",
    suspension: { isSuspended: false, reason: null, updatedAt: null, revision: 0 },
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
      if (/\/api\/admin\/users\/[^/?]+$/.test(url)) return jsonResponse(200, {
        user: users[0], sections: [], coverage: ["Legacy match associations unavailable"],
      });
      if (url.includes("/api/admin/users")) {
        const page = Number(new URL(url, "http://localhost").searchParams.get("page") || 1);
        return jsonResponse(200, { users: users.slice((page - 1) * 10, page * 10), total: users.length, page, pageSize: 10 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

beforeEach(() => {
  useAuthStore.setState({ isSuperAdmin: true, userId: "operator", email: "operator@example.com" });
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

    fireEvent.click(screen.getByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Admin" }));

    await waitFor(() => expect(screen.getByText(/successfully updated/i)).toBeDefined());
  });

  it("requires a reason and confirmed suspension, retaining state on server failure", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText("Kethan Kumar")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend identity" }));
    expect((screen.getByRole("button", { name: "Confirm suspension" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "Repeated abuse" } });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async () => jsonResponse(409, { error: "Revision changed. Reload details." }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
    expect(await screen.findByText("Revision changed. Reload details.")).toBeDefined();
    expect(screen.queryByText("Identity suspended.")).toBeNull();
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ action: "suspend", reason: "Repeated abuse", expectedRevision: 0 });
    fetchMock.mockImplementationOnce(async () => jsonResponse(200, {
      suspension: { isSuspended: true, reason: "Repeated abuse", updatedAt: 123, revision: 1 },
    }) as Response);
    fetchMock.mockImplementationOnce(async () => jsonResponse(200, {
      user: user({ role: "member", suspension: { isSuspended: true, reason: "Repeated abuse", updatedAt: 123, revision: 1 } }), sections: [], coverage: [],
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
    expect(await screen.findByText("Identity suspended.")).toBeDefined();
    expect(await screen.findByRole("button", { name: "Resume identity" })).toBeDefined();
  });

  it("validates trimmed reason boundaries and rejects control characters before posting", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend identity" }));
    const reasonInput = screen.getByLabelText("Suspension reason") as HTMLTextAreaElement;
    const confirm = screen.getByRole("button", { name: "Confirm suspension" }) as HTMLButtonElement;
    for (const reason of ["", "   ", "ab", "  ab  ", "a".repeat(501), "Abuse\nreport", "Abuse\t", "Abuse\u0000", "Abuse\u007f"]) {
      fireEvent.change(reasonInput, { target: { value: reason } });
      expect(confirm.disabled, JSON.stringify(reason)).toBe(true);
      fireEvent.submit(confirm.closest("form")!);
    }
    expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(reasonInput.minLength).toBe(3);
    expect(reasonInput.maxLength).toBe(500);
    for (const reason of ["abc", "  abc  ", "a".repeat(500)]) {
      fireEvent.change(reasonInput, { target: { value: reason } });
      expect(confirm.disabled).toBe(false);
    }
    fireEvent.change(reasonInput, { target: { value: "  Reviewed abuse  " } });
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(409, { error: "Revision changed. Reload details." }) as Response);
    fireEvent.click(confirm);
    expect(await screen.findByText("Revision changed. Reload details.")).toBeDefined();
    const post = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body)).reason).toBe("Reviewed abuse");
  });

  it.each(["suspend", "resume"])("updates the directory after closing the drawer during a deferred %s", async (action) => {
    const suspension = { isSuspended: action === "resume", reason: null, updatedAt: null, revision: 0 };
    stubFetch([user({ role: "member", suspension })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: action === "suspend" ? "Suspend identity" : "Resume identity" }));
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "Reviewed abuse" } });
    let resolvePost: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePost = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: action === "suspend" ? "Confirm suspension" : "Confirm resumption" }));
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    const outcome = action === "suspend" ? "Identity suspended." : "Identity resumed.";
    expect(screen.queryByText(outcome)).toBeNull();
    expect(Boolean(screen.queryByText("Suspended"))).toBe(action === "resume");
    await act(async () => resolvePost(jsonResponse(200, {
      suspension: { isSuspended: action === "suspend", reason: "Reviewed abuse", updatedAt: 123, revision: 1 },
    }) as Response));
    expect(await screen.findByText(outcome)).toBeDefined();
    expect(Boolean(screen.queryByText("Suspended"))).toBe(action === "suspend");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reports a deferred moderation failure on the page after the drawer closes", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend identity" }));
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "Reviewed abuse" } });
    let resolvePost: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePost = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    expect(screen.queryByText("Identity suspended.")).toBeNull();
    await act(async () => resolvePost(jsonResponse(409, { error: "Revision changed. Reload details." }) as Response));
    expect(screen.getByRole("alert").textContent).toContain("Revision changed. Reload details.");
    expect(screen.queryByText("Suspended")).toBeNull();
    expect(screen.queryByText("Identity suspended.")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("updates only the moderated directory row when another identity is selected before completion", async () => {
    stubFetch([user({ role: "member" }), user({ id: "second", name: "Second Player", role: "member" })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend identity" }));
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "Reviewed abuse" } });
    let resolvePost: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePost = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      user: user({ id: "second", name: "Second Player", role: "member" }), sections: [], coverage: ["Second identity coverage"],
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Second Player" }));
    await screen.findByText("Second identity coverage");
    expect(screen.queryByText("Identity suspended.")).toBeNull();
    await act(async () => resolvePost(jsonResponse(200, {
      suspension: { isSuspended: true, reason: "Reviewed abuse", updatedAt: 123, revision: 1 },
    }) as Response));
    expect(await screen.findByText("Identity suspended.")).toBeDefined();
    const firstRow = screen.getByRole("button", { name: "Inspect Kethan Kumar" }).closest("tr")!;
    const secondRow = screen.getByRole("button", { name: "Inspect Second Player" }).closest("tr")!;
    expect(within(firstRow).getByText("Suspended")).toBeDefined();
    expect(within(secondRow).queryByText("Suspended")).toBeNull();
    const drawer = screen.getByRole("dialog", { name: "Second Player" });
    expect(within(drawer).getByText("Active")).toBeDefined();
    expect(within(drawer).queryByText("Reviewed abuse")).toBeNull();
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

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() =>
      expect(screen.getByText((_, el) => el?.textContent?.trim() === "Showing 11 to 20 of 25 entries")).toBeDefined(),
    );
    expect(screen.getByText("2 / 3")).toBeDefined();
  });

  it("renders an honest empty state when the server has no registered users", async () => {
    stubFetch([]);
    renderRoute(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText(/no player identities found/i)).toBeDefined());
  });

  it("surfaces a failure honestly rather than falling back to sample accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("user service down")));
    renderRoute(<AdminUsersPage />);

    await waitFor(() => expect(screen.getAllByText(/user data unavailable/i).length).toBeGreaterThan(0));
    expect(screen.queryByText("Kethan Kumar")).toBeNull();
  });

  it("requests server search and filters, resetting pagination and preserving missing guest values", async () => {
    stubFetch([user({ accountKind: "guest", role: "member", email: "", joinedAt: null, lastActiveAt: null, favoriteGame: "" })]);
    renderRoute(<AdminUsersPage />);
    await screen.findByRole("button", { name: "Inspect Kethan Kumar" });
    fireEvent.click(screen.getByRole("combobox", { name: "Identity kind" }));
    fireEvent.click(screen.getByRole("option", { name: "Guests" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search users" }), { target: { value: "Kethan" } });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("page=1&pageSize=10&search=Kethan&kind=guest&role=all"))).toBe(true));
    expect(screen.queryByText(/@guest|unknown@/i)).toBeNull();
    expect(screen.getByText("Guest")).toBeDefined();
  });

  it("loads retained records and coverage, and requests the next section page", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    await screen.findByRole("button", { name: "Inspect Kethan Kumar" });
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      user: user({ role: "member" }), coverage: ["Legacy match associations unavailable"],
      sections: [{ key: "matches", title: "Matches", records: [{ game: "Rummy", score: 0 }], page: 1, pageSize: 20, total: null, hasMore: true }],
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Kethan Kumar" }));
    expect(await screen.findByText("Legacy match associations unavailable")).toBeDefined();
    expect(screen.getByText("Rummy")).toBeDefined();
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      key: "matches", title: "Matches", records: [{ game: "UNO" }], page: 2, pageSize: 20, total: null, hasMore: false,
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Next Matches records" }));
    expect(await screen.findByText("UNO")).toBeDefined();
    const calls = vi.mocked(fetch).mock.calls;
    expect(String(calls[calls.length - 1]?.[0])).toContain("/records/matches?page=2&pageSize=20");
    expect((screen.getByRole("button", { name: "Next Matches records" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Previous Matches records" }));
    expect(await screen.findByText("Rummy")).toBeDefined();
    expect(screen.queryByText("UNO")).toBeNull();
  });

  it.each([{ role: "super_admin" }, { id: "operator", role: "member" }])("protects the operator and superadmin targets: %j", async (target) => {
    stubFetch([user(target)]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    await screen.findByText("Legacy match associations unavailable");
    expect(screen.queryByRole("button", { name: "Suspend identity" })).toBeNull();
  });

  it("resumes only after a confirmed request using the recorded revision", async () => {
    const suspension = { isSuspended: true, reason: "Previous abuse", updatedAt: 100, revision: 7 };
    stubFetch([user({ role: "member", suspension })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Resume identity" }));
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "Reviewed appeal" } });
    let resolvePost: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePost = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm resumption" }));
    expect((screen.getByRole("button", { name: "Saving..." }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Identity resumed.")).toBeNull();
    const call = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === "POST");
    expect(String(call?.[0])).toContain("/api/admin/users/usr-real-001/suspension");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ action: "resume", reason: "Reviewed appeal", expectedRevision: 7 });
    await act(async () => resolvePost(jsonResponse(200, { suspension: { ...suspension, isSuspended: false, revision: 8 } }) as Response));
    expect(await screen.findByText("Identity resumed.")).toBeDefined();
  });

  it("shows unavailable sections distinctly from empty records and preserves zero and false fields", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    await screen.findByRole("button", { name: "Inspect Kethan Kumar" });
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      user: user({ role: "member" }), coverage: ["Only retained records are included"],
      sections: [
        { key: "wallet", title: "Wallet", records: [{ balance: 0, vested: false, note: null }], page: 1, pageSize: 20, total: 1, hasMore: false },
        { key: "matches", title: "Matches", records: [], page: 1, pageSize: 20, total: null, hasMore: false, unavailable: "Legacy identity associations unavailable" },
      ],
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Kethan Kumar" }));
    expect(await screen.findByText("Legacy identity associations unavailable")).toBeDefined();
    expect(screen.getByText("false")).toBeDefined();
    expect(within(screen.getByRole("region", { name: "Wallet records" })).getByText("0")).toBeDefined();
    expect(screen.queryByText("No retained records in this section.")).toBeNull();
  });

  it("rejects malformed details rather than displaying a false empty success and retries", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    await screen.findByRole("button", { name: "Inspect Kethan Kumar" });
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {}) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Kethan Kumar" }));
    expect(await screen.findByText(/User details unavailable: Invalid/)).toBeDefined();
    expect(screen.queryByText("No record sections supplied.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry details" }));
    expect(await screen.findByText("Legacy match associations unavailable")).toBeDefined();
  });

  it("ignores an old detail response after selecting another identity", async () => {
    stubFetch([user(), user({ id: "second", name: "Second Player", role: "member" })]);
    renderRoute(<AdminUsersPage />);
    await screen.findByRole("button", { name: "Inspect Kethan Kumar" });
    let resolveFirst: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      user: user({ id: "second", name: "Second Player", role: "member" }), sections: [], coverage: ["Second identity coverage"],
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Second Player" }));
    await screen.findByText("Second identity coverage");
    await act(async () => resolveFirst(jsonResponse(200, { user: user(), sections: [], coverage: ["Wrong identity coverage"] }) as Response));
    expect(screen.queryByText("Wrong identity coverage")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Second Player" })).toBeDefined();
  });

  it("resets a server page when role filters change", async () => {
    stubFetch(Array.from({ length: 25 }, (_, index) => user({ id: `user-${index}`, name: `Player ${index}` })));
    renderRoute(<AdminUsersPage />);
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

  it("does not offer suspension or role editing without superadmin UI access", async () => {
    useAuthStore.setState({ isSuperAdmin: false });
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    await screen.findByText("Legacy match associations unavailable");
    expect(screen.queryByRole("button", { name: "Suspend identity" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Admin" })).toBeNull();
  });

  it("debounces search and ignores a late directory response after changing filters", async () => {
    let resolveOld: (response: Response) => void = () => undefined;
    vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOld = resolve; }))
      .mockImplementation(async () => jsonResponse(200, { users: [user({ accountKind: "guest", name: "Current Guest" })], total: 1, page: 1, pageSize: 10 })));
    renderRoute(<AdminUsersPage />);
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

  it("moves focus to the required reason and restores it after cancelling confirmation", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend identity" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Suspension reason"));
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "   " } });
    expect((screen.getByRole("button", { name: "Confirm suspension" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Suspend identity" })));
    expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("keeps record errors distinct from empty data and retries the requested page", async () => {
    stubFetch([user({ role: "member" })]);
    renderRoute(<AdminUsersPage />);
    await screen.findByRole("button", { name: "Inspect Kethan Kumar" });
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      user: user({ role: "member" }), coverage: [],
      sections: [{ key: "matches", title: "Matches", records: [], page: 1, pageSize: 20, total: null, hasMore: true }],
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Kethan Kumar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next Matches records" }));
    expect(screen.getByText("Loading Matches records")).toBeDefined();
    await screen.findByText("Invalid recorded section response.");
    expect(screen.queryByText("No retained records in this section.")).toBeNull();
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      key: "matches", title: "Matches", records: [{ game: "Recovered record" }], page: 2, pageSize: 20, total: null, hasMore: false,
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Retry records" }));
    expect(await screen.findByText("Recovered record")).toBeDefined();
  });

  it("does not reselect a previous identity when its role update finishes late", async () => {
    stubFetch([user({ role: "member" }), user({ id: "second", name: "Second Player", role: "member" })]);
    renderRoute(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Inspect Kethan Kumar" }));
    await screen.findByRole("button", { name: "Admin" });
    let resolveRole: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRole = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      user: user({ id: "second", name: "Second Player", role: "member" }), sections: [], coverage: ["Second identity coverage"],
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Second Player" }));
    await screen.findByText("Second identity coverage");
    await act(async () => resolveRole(jsonResponse(200, { success: true, role: "admin" }) as Response));
    expect(screen.getByRole("dialog", { name: "Second Player" })).toBeDefined();
  });
});
