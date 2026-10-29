import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within, configure } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { ReferralAdminCampaign, ReferralAdminEvent, ReferralAdminOverview, ReferralAdminPendingReward } from "@shared/referrals";
import AdminReferralsPage from "../referrals";
import { ADMIN_NAV_ITEMS } from "../../../components/admin/admin-sidebar";

/**
 * Referrals console, wired to /api/admin/referrals.
 *
 * The rules (limits, the actor, the record of changes, what may be voided) live on the server and are tested
 * there; these tests assert the page shows what came back, sends what the operator chose, asks for a reason
 * before anything is changed, and says so honestly when the server says no.
 */

// The whole admin suite runs in parallel workers; the default 1s wait is too tight for the page's three fetches.
configure({ asyncUtilTimeout: 5000 });

const NOW = Date.UTC(2026, 10, 1);
const json = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

const baseCampaign: ReferralAdminCampaign = {
  enabled: true, bonusStartsAt: 0, inviterBonus: 2000, inviteeBonus: 2000, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7,
};

const overviewOf = (campaign: ReferralAdminCampaign): ReferralAdminOverview => ({
  campaign,
  funnel: { invitesCreated: 120, joined: 40, viaCode: 30, viaLink: 10, qualified: 20, waiting: 15, expired: 5, bonusReserved: 20, bonusIssued: 18, bonusBlockedCap: 0 },
  liability: { pendingCoins: 8000, pendingCount: 4, releasedCoins: 36000, releasedCount: 18, voidedCoins: 2000, voidedCount: 1 },
  topReferrers: [{ playerId: "p_top", displayName: "Meera", joined: 7, qualified: 5 }],
  serverNow: NOW,
});

const pendingReward: ReferralAdminPendingReward = {
  rewardId: "rwd_1", playerId: "p_inv", displayName: "Arjun", side: "inviter", inviteeId: "p_new",
  amount: 2000, status: "PENDING", earnedAt: NOW - 3_600_000, vestingUntil: NOW + 5 * 3_600_000,
};

const event: ReferralAdminEvent = {
  id: 1, actor: "admin:abc", action: "CAMPAIGN_UPDATED", note: "launch week boost", at: NOW - 60_000,
  detail: { before: { inviterBonus: 1000 }, after: { inviterBonus: 2000 } },
};

interface Call { method: string; url: string; body: unknown }
let calls: Call[];
let campaign: ReferralAdminCampaign;

function stub(handlers: { put?: () => unknown; post?: () => unknown; pending?: ReferralAdminPendingReward[]; events?: ReferralAdminEvent[]; overview?: () => unknown } = {}) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (method === "PUT") return handlers.put ? handlers.put() : json(200, { campaign });
      if (method === "POST") return handlers.post ? handlers.post() : json(200, { ok: true, logged: true });
      if (url.endsWith("/overview")) return handlers.overview ? handlers.overview() : json(200, overviewOf(campaign));
      if (url.endsWith("/pending")) return json(200, { rewards: handlers.pending ?? [pendingReward] });
      if (url.endsWith("/events")) return json(200, { events: handlers.events ?? [event] });
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

const renderPage = () => render(<BrowserRouter><AdminReferralsPage /></BrowserRouter>);

beforeEach(() => {
  campaign = { ...baseCampaign };
  vi.stubGlobal("sessionStorage", { getItem: () => "test-ops-key", setItem: () => undefined, removeItem: () => undefined });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin Referrals", () => {
  it("is reachable from the admin navigation", () => {
    expect(ADMIN_NAV_ITEMS.some((i) => i.href === "/admin/referrals" && i.label === "Referrals")).toBe(true);
  });

  it("shows the numbers, who invited most, and the record of changes", async () => {
    stub();
    renderPage();

    expect(await screen.findByText("Most invitees")).toBeInTheDocument();
    expect(screen.getByText("Meera")).toBeInTheDocument();
    expect(screen.getByText("8,000")).toBeInTheDocument();
    expect(screen.getByText("Inviter bonus (coins): 1000 → 2000")).toBeInTheDocument();
    expect(screen.getByText("“launch week boost”")).toBeInTheDocument();
    expect(screen.getByText(/Admin abc/)).toBeInTheDocument();
  });

  it("says plainly when nothing is waiting and nothing has been changed", async () => {
    stub({ pending: [], events: [] });
    renderPage();

    expect(await screen.findByText(/Nothing is waiting/)).toBeInTheDocument();
    expect(screen.getByText(/No changes have been made through this console yet/)).toBeInTheDocument();
  });

  it("shows why the data is missing when the server is unwell", async () => {
    stub({ overview: () => json(500, { message: "database offline" }) });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Referral data unavailable: database offline");
  });

  it("will not save until something changed and a reason is written", async () => {
    stub();
    renderPage();
    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Inviter bonus/), { target: { value: "3000" } });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/why are you changing this/i), { target: { value: "weekend boost" } });
    expect(save).toBeEnabled();
  });

  it("names the limit when a value is out of range, and keeps Save off", async () => {
    stub();
    renderPage();
    await screen.findByRole("button", { name: "Save changes" });

    fireEvent.change(screen.getByLabelText(/Invitee bonus/), { target: { value: "20000" } });
    fireEvent.change(screen.getByLabelText(/why are you changing this/i), { target: { value: "typo" } });

    expect(screen.getByText("Invitee bonus (coins) must be a whole number from 0 to 10000.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("sends only what changed, with the reason, then reloads", async () => {
    stub();
    renderPage();
    await screen.findByRole("button", { name: "Save changes" });

    fireEvent.change(screen.getByLabelText(/Inviter bonus/), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText(/why are you changing this/i), { target: { value: "  weekend boost  " } });
    campaign = { ...campaign, inviterBonus: 3000 };
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Saved and recorded.")).toBeInTheDocument();
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.url).toMatch(/\/api\/admin\/referrals\/campaign$/);
    expect(put?.body).toEqual({ changes: { inviterBonus: 3000 }, note: "weekend boost" });
    expect(calls.filter((c) => c.url.endsWith("/overview")).length).toBe(2);
  });

  it("Stop the coin bonus fills in zeros but still needs a reason", async () => {
    stub();
    renderPage();
    await screen.findByRole("button", { name: "Save changes" });

    fireEvent.click(screen.getByRole("button", { name: "Stop the coin bonus" }));
    expect(screen.getByLabelText(/Inviter bonus/)).toHaveValue(0);
    expect(screen.getByLabelText(/Invitee bonus/)).toHaveValue(0);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
  });

  it("shows the server's refusal and keeps what was typed", async () => {
    stub({ put: () => json(400, { message: "Inviter bonus is too high" }) });
    renderPage();
    await screen.findByRole("button", { name: "Save changes" });

    fireEvent.change(screen.getByLabelText(/Inviter bonus/), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText(/why are you changing this/i), { target: { value: "boost" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Not saved: Inviter bonus is too high")).toBeInTheDocument();
    expect(screen.getByLabelText(/Inviter bonus/)).toHaveValue(3000);
  });

  it("asks for a reason before withdrawing a bonus, then sends it", async () => {
    stub();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw 2000 coins for Arjun" }));

    const confirm = screen.getByRole("button", { name: "Withdraw for good" });
    expect(confirm).toBeDisabled();
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    fireEvent.change(screen.getByLabelText(/why is this bonus being withdrawn/i), { target: { value: "two accounts, one device" } });
    fireEvent.click(confirm);

    expect(await screen.findByText("Bonus withdrawn and recorded.")).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST");
    expect(post?.url).toMatch(/\/api\/admin\/referrals\/rewards\/rwd_1\/void$/);
    expect(post?.body).toEqual({ reason: "two accounts, one device" });
  });

  it("lets the operator back out of a withdrawal", async () => {
    stub();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw 2000 coins for Arjun" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));

    expect(screen.getByRole("button", { name: "Withdraw 2000 coins for Arjun" })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("offers no withdraw button for a bonus already being paid", async () => {
    stub({ pending: [{ ...pendingReward, status: "RELEASING" }] });
    renderPage();

    const section = (await screen.findByRole("heading", { name: "Bonuses in their hold" })).closest("section")!;
    expect(within(section).getByText("Being paid now")).toBeInTheDocument();
    expect(within(section).queryByRole("button")).toBeNull();
  });

  it("says so when the bonus was already being paid", async () => {
    stub({ post: () => json(409, { message: "That bonus is already being paid." }) });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw 2000 coins for Arjun" }));
    fireEvent.change(screen.getByLabelText(/why is this bonus being withdrawn/i), { target: { value: "late" } });
    fireEvent.click(screen.getByRole("button", { name: "Withdraw for good" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Not withdrawn: That bonus is already being paid."));
  });
});
