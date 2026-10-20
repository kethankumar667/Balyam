import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate, type To } from "react-router-dom";
import AdminUsersPage from "../users";
import AdminUserDetailPage from "../users/UserDetailPage";
import { useAuthStore } from "../../../store/authStore";
import { jsonResponse, signInOperator, stubFetch, user } from "./adminUsersFixtures";

/**
 * Inspecting a player is a page of its own, `/admin/users/:userId`, not a drawer over the list.
 * A page can be opened in a new tab, linked to, refreshed, and left with Back; these tests hold the
 * flows the drawer used to carry (role change, suspension, retained records) to that page.
 */

type Entry = string | { pathname: string; state?: unknown };

function renderApp(entry: Entry = "/admin/users/usr-real-001") {
  return render(
    <MemoryRouter initialEntries={[entry as To]}>
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Opens the detail route with a details response carrying sections, by overriding the first fetch. */
function renderWithDetails(details: unknown) {
  stubFetch([user({ role: "member" })]);
  vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, details) as Response);
  return renderApp();
}

/** Two identities and a button that moves between them, standing in for following another link. */
function renderWithSwitcher() {
  function Switcher() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate("/admin/users/second")}>Open second</button>;
  }
  return render(
    <MemoryRouter initialEntries={["/admin/users/usr-real-001"]}>
      <Switcher />
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => signInOperator());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin user page — opens from the address, so it can be linked and refreshed", () => {
  it("loads the identity named in the URL and titles the page with its name", async () => {
    stubFetch([user({ role: "member" })]);
    renderApp();

    expect(await screen.findByText("Legacy match associations unavailable")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: "Kethan Kumar" })).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Breadcrumbs" }).textContent).toContain("Users");
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain("/api/admin/users/usr-real-001");
  });

  it("says plainly when the server does not know the identity, and offers a retry", async () => {
    stubFetch([user()]);
    renderApp("/admin/users/does-not-exist");

    expect(await screen.findByText(/User details unavailable/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Retry details" })).toBeDefined();
  });

  it("links back to the users list the admin came from, with its page and filters", async () => {
    stubFetch([user({ role: "member" })]);
    renderApp({ pathname: "/admin/users/usr-real-001", state: { from: "?kind=guest&page=2" } });
    await screen.findByText("Legacy match associations unavailable");

    expect(screen.getByRole("link", { name: "Back to users" }).getAttribute("href")).toBe("/admin/users?kind=guest&page=2");
  });

  it("links back to the plain users list when opened directly", async () => {
    stubFetch([user({ role: "member" })]);
    renderApp();
    await screen.findByText("Legacy match associations unavailable");

    expect(screen.getByRole("link", { name: "Back to users" }).getAttribute("href")).toBe("/admin/users");
  });
});

describe("Admin user page — role and wallet", () => {
  it("promoting a role calls the real endpoint and reflects the result, not a local-only preview", async () => {
    stubFetch([user({ role: "member" })]);
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Admin" }));

    await waitFor(() => expect(screen.getByText(/successfully updated/i)).toBeDefined());
    const call = vi.mocked(fetch).mock.calls.find(([input]) => String(input).includes("/api/admin/users/role"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ userId: "usr-real-001", role: "admin" });
  });

  it("does not offer suspension or role editing without superadmin UI access", async () => {
    useAuthStore.setState({ isSuperAdmin: false });
    stubFetch([user({ role: "member" })]);
    renderApp();

    await screen.findByText("Legacy match associations unavailable");
    expect(screen.queryByRole("button", { name: "Suspend identity" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Admin" })).toBeNull();
  });

  it("offers the wallet investigation for this identity", async () => {
    stubFetch([user({ role: "member" })]);
    renderApp();

    await screen.findByText("Legacy match associations unavailable");
    expect(screen.getByRole("button", { name: /Top-Up Coins \/ Investigate Wallet/ })).toBeDefined();
  });
});

describe("Admin user page — suspension", () => {
  it("requires a reason and confirmed suspension, retaining state on server failure", async () => {
    stubFetch([user({ role: "member" })]);
    renderApp();
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
    renderApp();
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

  it.each([{ role: "super_admin" }, { id: "operator", role: "member" }])("protects the operator and superadmin targets: %j", async (target) => {
    stubFetch([user(target)]);
    renderApp(`/admin/users/${(target as { id?: string }).id ?? "usr-real-001"}`);
    await screen.findByText("Legacy match associations unavailable");
    expect(screen.queryByRole("button", { name: "Suspend identity" })).toBeNull();
  });

  it("resumes only after a confirmed request using the recorded revision", async () => {
    const suspension = { isSuspended: true, reason: "Previous abuse", updatedAt: 100, revision: 7 };
    stubFetch([user({ role: "member", suspension })]);
    renderApp();
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

  it("moves focus to the required reason and restores it after cancelling confirmation", async () => {
    stubFetch([user({ role: "member" })]);
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "Suspend identity" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Suspension reason"));
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "   " } });
    expect((screen.getByRole("button", { name: "Confirm suspension" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Suspend identity" })));
    expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });
});

describe("Admin user page — retained records", () => {
  it("loads retained records and coverage, and requests the next section page", async () => {
    renderWithDetails({
      user: user({ role: "member" }), coverage: ["Legacy match associations unavailable"],
      sections: [{ key: "matches", title: "Matches", records: [{ game: "Rummy", score: 0 }], page: 1, pageSize: 20, total: null, hasMore: true }],
    });
    expect(await screen.findByText("Legacy match associations unavailable")).toBeDefined();
    expect(screen.getByText("Rummy")).toBeDefined();
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      key: "matches", title: "Matches", records: [{ game: "UNO" }], page: 2, pageSize: 20, total: null, hasMore: false,
    }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Next Matches records" }));
    expect(await screen.findByText("UNO")).toBeDefined();
    const calls = vi.mocked(fetch).mock.calls;
    expect(String(calls[calls.length - 1]?.[0])).toContain("/records/matches?page=2&pageSize=10");
    expect((screen.getByRole("button", { name: "Next Matches records" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Previous Matches records" }));
    expect(await screen.findByText("Rummy")).toBeDefined();
    expect(screen.queryByText("UNO")).toBeNull();
  });

  it("shows unavailable sections distinctly from empty records and preserves zero and false fields", async () => {
    renderWithDetails({
      user: user({ role: "member" }), coverage: ["Only retained records are included"],
      sections: [
        { key: "wallet", title: "Wallet", records: [{ balance: 0, vested: false, note: null }], page: 1, pageSize: 20, total: 1, hasMore: false },
        { key: "matches", title: "Matches", records: [], page: 1, pageSize: 20, total: null, hasMore: false, unavailable: "Legacy identity associations unavailable" },
      ],
    });
    expect(await screen.findByText("Legacy identity associations unavailable")).toBeDefined();
    expect(screen.getByText("false")).toBeDefined();
    expect(within(screen.getByRole("region", { name: "Wallet records" })).getByText("0")).toBeDefined();
    expect(screen.queryByText("No retained records in this section.")).toBeNull();
  });

  it("keeps record errors distinct from empty data and retries the requested page", async () => {
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [{ key: "matches", title: "Matches", records: [], page: 1, pageSize: 20, total: null, hasMore: true }],
    });
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

  it("shows only the fields worth reading, formatted, and none of the row's internal ids", async () => {
    const row = { id: "match-internal-id-0001", room_code: "ABC123", game: "rummy", started_at: "2026-10-20T10:00:00.000Z", finished_at: "2026-10-20T10:07:00.000Z", duration_ms: 420_000, winner_id: "winner-internal-id", winner_kind: "bot", participant_count: 3, recorded_at: "2026-10-20T10:07:01.000Z" };
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [{ key: "matches", title: "matches", records: [row], page: 1, pageSize: 10, total: 1, hasMore: false }],
    });
    const table = await screen.findByRole("table", { name: "Matches table" });
    expect(within(table).getByRole("columnheader", { name: "Game" })).toBeDefined();
    expect(within(table).getByRole("columnheader", { name: "Duration" })).toBeDefined();
    expect(within(table).queryByRole("columnheader", { name: /^id$/i })).toBeNull();
    expect(within(table).getByText("Rummy")).toBeDefined();
    expect(within(table).getByText("7m 0s")).toBeDefined();
    expect(within(table).queryByText("match-internal-id-0001")).toBeNull();
    expect(within(table).queryByText("winner-internal-id")).toBeNull();
  });

  it("pages ten rows at a time and says where the operator is in the whole", async () => {
    const records = Array.from({ length: 10 }, (_, index) => ({ game: "ludo", room_code: `ROOM${index}`, finished_at: "2026-10-20T10:07:00.000Z", participant_count: 2 }));
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [{ key: "matches", title: "matches", records, page: 1, pageSize: 10, total: 28, hasMore: true }],
    });
    expect(await screen.findByText(/Showing 1-10 of 28 - page 1 of 3/)).toBeDefined();
    expect((screen.getByRole("button", { name: "Previous Matches records" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Next Matches records" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("lays a single record out as labelled fields rather than one very wide row", async () => {
    const wallet = { identity_id: "wallet-internal-id", identity_kind: "member", balance: 5200, version: 14, lifetime_granted: 5000, lifetime_earned: 800, lifetime_spent: 600, lifetime_refunded: 0, is_frozen: false, created_at: "2026-08-01T10:00:00.000Z", updated_at: "2026-10-20T10:00:00.000Z" };
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [{ key: "wallet", title: "wallet", records: [wallet], page: 1, pageSize: 10, total: 1, hasMore: false }],
    });
    const region = await screen.findByRole("region", { name: "Wallet records" });
    expect(within(region).getByText("Balance")).toBeDefined();
    expect(within(region).getByText("5,200")).toBeDefined();
    expect(within(region).getByText("No")).toBeDefined();
    expect(within(region).queryByRole("table")).toBeNull();
    expect(within(region).queryByText("wallet-internal-id")).toBeNull();
    expect(within(region).queryByText("Version")).toBeNull();
  });

  it("draws no table caption: an absolutely-positioned one escapes the layout and adds a second page scrollbar", async () => {
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [{ key: "matches", title: "Matches", records: [{ game: "Rummy", score: 0 }], page: 1, pageSize: 10, total: 1, hasMore: false }],
    });
    await screen.findByText("Rummy");
    expect(document.querySelector("caption")).toBeNull();
  });

  it("rejects malformed details rather than displaying a false empty success and retries", async () => {
    stubFetch([user({ role: "member" })]);
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {}) as Response);
    renderApp();
    expect(await screen.findByText(/User details unavailable: Invalid/)).toBeDefined();
    expect(screen.queryByText("No record sections supplied.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry details" }));
    expect(await screen.findByText("Legacy match associations unavailable")).toBeDefined();
  });
});

describe("Admin user page — personal data, deferred sections, navigation", () => {
  const accountSection = {
    key: "account", title: "account", page: 1, pageSize: 10, total: 1, hasMore: false,
    records: [{ id: "x", email: "kethan@bhalyam.io", first_name: "Kethan", last_name: "Kumar", dob: "1997-08-28", created_at: "2026-08-01T10:00:00.000Z", updated_at: "2026-08-02T10:00:00.000Z" }],
  };

  it("hides the email and the account's personal fields until the operator asks, and the ask goes to the server", async () => {
    renderWithDetails({ user: user({ role: "member" }), coverage: [], sections: [accountSection] });
    expect((await screen.findAllByText("k•••••@bhalyam.io")).length).toBeGreaterThan(0);
    expect(screen.queryByText("kethan@bhalyam.io")).toBeNull();
    expect(screen.queryByText("Kethan")).toBeNull();

    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, { revealedAt: 1 }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Show personal data" }));

    await waitFor(() => expect(screen.getAllByText("kethan@bhalyam.io").length).toBeGreaterThan(0));
    expect(screen.getByText("Kethan")).toBeDefined();
    const call = vi.mocked(fetch).mock.calls.find(([input]) => String(input).includes("/api/admin/users/usr-real-001/personal-data-access"));
    expect(call?.[1]?.method).toBe("POST");

    fireEvent.click(screen.getByRole("button", { name: "Hide personal data" }));
    expect(screen.queryByText("kethan@bhalyam.io")).toBeNull();
    expect(screen.queryByText("Kethan")).toBeNull();
  });

  it("keeps personal data hidden, and says so, when the server will not record the access", async () => {
    renderWithDetails({ user: user({ role: "member" }), coverage: [], sections: [accountSection] });
    await screen.findAllByText("k•••••@bhalyam.io");
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(403, { error: "Forbidden", message: "A verified human superadmin is required." }) as Response);
    fireEvent.click(screen.getByRole("button", { name: "Show personal data" }));
    expect(await screen.findByText(/Personal data stays hidden/)).toBeDefined();
    expect(screen.queryByText("kethan@bhalyam.io")).toBeNull();
    expect(screen.getByRole("button", { name: "Show personal data" })).toBeDefined();
  });

  it("fetches a deferred section only once it comes near the screen", async () => {
    const callbacks: Array<(entries: { isIntersecting: boolean }[]) => void> = [];
    class FakeObserver {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { callbacks.push(callback); }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [{ key: "xp", title: "xp", records: [], page: 1, pageSize: 10, total: 12, hasMore: true, deferred: true }],
    });
    expect(await screen.findByRole("region", { name: "XP records" })).toBeDefined();
    const xpCalls = () => vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes("/records/xp"));
    expect(xpCalls()).toHaveLength(0);

    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(200, {
      key: "xp", title: "xp", page: 1, pageSize: 10, total: 12, hasMore: true,
      records: [{ amount: 40, reason: "match_played", source_kind: "match", created_at: "2026-10-20T10:00:00.000Z" }],
    }) as Response);
    act(() => { callbacks.forEach((callback) => callback([{ isIntersecting: true }])); });

    expect(await screen.findByText("Match played")).toBeDefined();
    expect(String(xpCalls()[0]?.[0])).toContain("/records/xp?page=1&pageSize=10");
    expect(xpCalls()).toHaveLength(1);
  });

  it("offers a jump bar with row counts and leaves out sections with nothing in them", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", { value: scrollIntoView, configurable: true, writable: true });
    const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ game: "ludo", room_code: `R${index}`, finished_at: "2026-10-20T10:00:00.000Z" }));
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [
        { key: "matches", title: "matches", records: rows(3), page: 1, pageSize: 10, total: 3, hasMore: false },
        { key: "xp", title: "xp", records: [{ amount: 5, reason: "match_played", source_kind: "match", created_at: "2026-10-20T10:00:00.000Z" }], page: 1, pageSize: 10, total: 1, hasMore: false },
        { key: "challenges", title: "challenges", records: [{ challenge_id: "daily_win_1", period_key: "2026-10-20", xp_awarded: 50, claimed_at: "2026-10-20T10:00:00.000Z" }], page: 1, pageSize: 10, total: 1, hasMore: false },
        { key: "achievements", title: "achievements", records: [], page: 1, pageSize: 10, total: 0, hasMore: false },
      ],
    });
    const nav = await screen.findByRole("navigation", { name: "Record sections" });
    expect(within(nav).getByRole("button", { name: /^Matches\s*3$/ })).toBeDefined();
    expect(within(nav).getByRole("button", { name: /^XP\s*1$/ })).toBeDefined();
    expect(within(nav).getByRole("button", { name: /^Challenges\s*1$/ })).toBeDefined();
    expect(within(nav).queryByRole("button", { name: /Achievements/ })).toBeNull();
    fireEvent.click(within(nav).getByRole("button", { name: /^XP\s*1$/ }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("adds the wallet balance and level to the statistics when those sections carry them", async () => {
    renderWithDetails({
      user: user({ role: "member" }), coverage: [],
      sections: [
        { key: "profile", title: "profile", records: [{ level: 7 }], page: 1, pageSize: 10, total: 1, hasMore: false },
        { key: "wallet", title: "wallet", records: [{ balance: 5200 }], page: 1, pageSize: 10, total: 1, hasMore: false },
      ],
    });
    const stats = await screen.findByRole("region", { name: "Recorded Statistics" });
    expect(within(stats).getByText("Wallet balance")).toBeDefined();
    expect(within(stats).getByText("5,200")).toBeDefined();
    expect(within(stats).getByText("Level")).toBeDefined();
    expect(within(stats).getByText("7")).toBeDefined();
  });

  it("copies the user id", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderWithDetails({ user: user({ role: "member" }), coverage: [], sections: [] });
    fireEvent.click(await screen.findByRole("button", { name: "Copy user ID" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("usr-real-001"));
    expect(await screen.findByText("Copied")).toBeDefined();
  });
});

describe("Admin user page — moving between identities", () => {
  it("ignores an old detail response after opening another identity", async () => {
    stubFetch([user(), user({ id: "second", name: "Second Player", role: "member" })]);
    let resolveFirst: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }));
    renderWithSwitcher();
    fireEvent.click(screen.getByRole("button", { name: "Open second" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Second Player" })).toBeDefined();
    await act(async () => resolveFirst(jsonResponse(200, { user: user(), sections: [], coverage: ["Wrong identity coverage"] }) as Response));
    expect(screen.queryByText("Wrong identity coverage")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Second Player" })).toBeDefined();
  });

  it("does not apply a previous identity's late role update to the one now on screen", async () => {
    stubFetch([user({ role: "member" }), user({ id: "second", name: "Second Player", role: "member" })]);
    renderWithSwitcher();
    await screen.findByRole("button", { name: "Admin" });
    let resolveRole: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRole = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Open second" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Second Player" })).toBeDefined();
    await act(async () => resolveRole(jsonResponse(200, { success: true, role: "admin" }) as Response));
    expect(screen.queryByText(/successfully updated/i)).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Second Player" })).toBeDefined();
    // The second identity is still a member: its own Admin button is still offered.
    expect((screen.getByRole("button", { name: "Admin" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Admin user page — a moderation result that arrives after leaving", () => {
  async function startSuspensionThenLeave() {
    stubFetch([user({ role: "member" })]);
    renderApp({ pathname: "/admin/users/usr-real-001", state: { from: "" } });
    fireEvent.click(await screen.findByRole("button", { name: "Suspend identity" }));
    fireEvent.change(screen.getByLabelText("Suspension reason"), { target: { value: "Reviewed abuse" } });
    let resolvePost: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePost = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
    fireEvent.click(screen.getByRole("link", { name: "Back to users" }));
    await screen.findByRole("button", { name: /Invite Moderator/ });
    return (response: Response) => act(async () => resolvePost(response));
  }

  it("reports a deferred success on the users list", async () => {
    const resolve = await startSuspensionThenLeave();
    expect(screen.queryByText("Identity suspended.")).toBeNull();
    await resolve(jsonResponse(200, { suspension: { isSuspended: true, reason: "Reviewed abuse", updatedAt: 123, revision: 1 } }) as Response);
    expect(await screen.findByText("Identity suspended.")).toBeDefined();
  });

  it("reports a deferred failure on the users list, as an alert", async () => {
    const resolve = await startSuspensionThenLeave();
    await resolve(jsonResponse(409, { error: "Revision changed. Reload details." }) as Response);
    expect((await screen.findByRole("alert")).textContent).toContain("Revision changed. Reload details.");
  });
});
