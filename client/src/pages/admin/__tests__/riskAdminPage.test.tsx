import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminRiskPage from "../risk";
import { ADMIN_NAV_ITEMS } from "../../../components/admin/admin-sidebar";

/**
 * Risk & Rewards, wired to /api/admin/risk.
 *
 * The rules (a note to restrict, who the actor is, what is recorded) live on the
 * server and are tested there; these tests assert the page shows exactly what came
 * back, sends what the operator chose, and says so honestly when the server says no.
 */

const renderPage = () => render(<BrowserRouter><AdminRiskPage /></BrowserRouter>);

const json = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

const flagged = {
  playerId: "burner_1",
  state: "WATCHLIST",
  reasonCodes: ["AUTO_ABNORMAL_SESSIONS"],
  updatedAt: Date.now() - 60_000,
  updatedBy: "system",
};

const detailOf = (over: Record<string, unknown> = {}) => ({
  playerId: "burner_1",
  state: "WATCHLIST",
  record: flagged,
  events: [{ kind: "STATE_CHANGE", reasonCode: "AUTO_ABNORMAL_SESSIONS", createdAt: Date.now() - 60_000 }],
  rewards: [{ rewardId: "rwd_1", rewardType: "LEVEL_MILESTONE", amount: 500, status: "PENDING", vestingUntil: Date.now() + 3_600_000, description: "Level 5 milestone" }],
  trust: { tier: 1, reasons: [{ label: "Tier 2: Account at least 3 days old", met: false, detail: "You have 1" }] },
  ...over,
});

const finding = {
  beneficiaryId: "main_account",
  matches: 14,
  summary: "1 account(s) played main_account 14 times in 7 days, losing at least 90% of them, and spent at least 80% of all their games against it.",
  feeders: [{ playerId: "burner_1", matches: 14, beneficiaryWins: 14, concentration: 1 }],
};

interface Calls { method: string; url: string; body: unknown }
let calls: Calls[];

function stub(handlers: { put?: () => unknown; post?: () => unknown; detail?: unknown; findings?: unknown[]; accounts?: unknown[] } = {}) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (method === "PUT") return handlers.put ? handlers.put() : json(200, { record: {} });
      if (method === "POST") return handlers.post ? handlers.post() : json(200, { ok: true });
      if (url.endsWith("/api/admin/risk")) {
        const accounts = handlers.accounts ?? [flagged];
        return json(200, { accounts, counts: { WATCHLIST: accounts.length, RESTRICTED: 0, UNDER_REVIEW: 0 } });
      }
      if (url.endsWith("/api/admin/risk/collusion")) return json(200, { findings: handlers.findings ?? [finding], count: 1 });
      if (url.includes("/api/admin/risk/")) return json(200, handlers.detail ?? detailOf());
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("sessionStorage", { getItem: () => "test-ops-key", setItem: () => undefined, removeItem: () => undefined });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin Risk & Rewards", () => {
  it("is reachable from the admin navigation", () => {
    expect(ADMIN_NAV_ITEMS.some((i) => i.href === "/admin/risk" && i.label === "Risk & Rewards")).toBe(true);
  });

  it("lists the flagged accounts and the collusion report it was given", async () => {
    stub();
    renderPage();

    await waitFor(() => expect(screen.getAllByText("burner_1").length).toBeGreaterThan(0));
    expect(screen.getByText(/played main_account 14 times/)).toBeTruthy();
  });

  it("says plainly that nothing is flagged, rather than inventing rows", async () => {
    stub({ accounts: [], findings: [] });
    renderPage();

    expect(await screen.findByText("No account is on a watch or restricted.")).toBeTruthy();
    expect(screen.getByText("Nothing looks one-sided right now.")).toBeTruthy();
  });

  it("calls the collusion list a report, not a verdict", async () => {
    stub();
    renderPage();

    expect(await screen.findByText(/A report, not a verdict/)).toBeTruthy();
  });

  it("shows an account's trust reasons, rewards and events after a lookup", async () => {
    stub();
    renderPage();
    await screen.findByText(/played main_account/);

    fireEvent.change(screen.getByLabelText("Player id"), { target: { value: "burner_1" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByText(/Trust tier 1 of 4/)).toBeTruthy();
    expect(screen.getByText(/Not yet — Tier 2: Account at least 3 days old/)).toBeTruthy();
    expect(screen.getByText(/500 coins — Level 5 milestone/)).toBeTruthy();
  });

  it("will not apply a restriction without a note, as the server will not either", async () => {
    stub();
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /burner_1/ }))[0]!);
    await screen.findByText(/Trust tier 1 of 4/);

    fireEvent.change(screen.getByLabelText("New state"), { target: { value: "RESTRICTED" } });

    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "farming ring, see report" } });
    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("sends the chosen state and note, and confirms what was set", async () => {
    stub();
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /burner_1/ }))[0]!);
    await screen.findByText(/Trust tier 1 of 4/);
    fireEvent.change(screen.getByLabelText("New state"), { target: { value: "RESTRICTED" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "farming ring, see report" } });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("Set burner_1 to RESTRICTED.")).toBeTruthy();
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.url).toContain("/api/admin/risk/burner_1");
    expect(put?.body).toEqual({ state: "RESTRICTED", note: "farming ring, see report" });
  });

  it("reports the server's refusal instead of claiming the change happened", async () => {
    stub({ put: () => json(409, { error: "The change could not be recorded. Nothing was changed." }) });
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /burner_1/ }))[0]!);
    await screen.findByText(/Trust tier 1 of 4/);
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "n" } });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText(/Not changed: The change could not be recorded/)).toBeTruthy();
  });

  it("withdraws a pending reward only with a reason", async () => {
    stub();
    const prompt = vi.spyOn(window, "prompt").mockReturnValueOnce("   ").mockReturnValueOnce("support ticket 88");
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /burner_1/ }))[0]!);
    await screen.findByText(/500 coins — Level 5 milestone/);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    await screen.findByText("Reward withdrawn.");
    const post = calls.find((c) => c.method === "POST");
    expect(post?.url).toContain("/api/admin/risk/rewards/rwd_1/void");
    expect(post?.body).toEqual({ reason: "support ticket 88" });
    expect(prompt).toHaveBeenCalledTimes(2);
  });

  it("says when the operator is not authorized, not that there is simply no data", async () => {
    calls = [];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, {})));
    renderPage();

    expect(await screen.findByText(/Not authorized for the operational API/)).toBeTruthy();
  });
});
