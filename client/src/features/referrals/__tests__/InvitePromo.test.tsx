import "@testing-library/jest-dom/vitest";
import { act, cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReferralOverview } from "@shared/referrals";
import { capabilitiesFor } from "@shared/permissions";
import { useAuthStore } from "../../../store/authStore";
import { useInvitePromoStore } from "../../../store/invitePromoStore";
import { InvitePromo } from "../InvitePromo";

configure({ asyncUtilTimeout: 5000 });

const fetchOverview = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/referrals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/referrals")>()),
  fetchReferralOverview: fetchOverview,
}));

const asGuest = () => useAuthStore.setState({ kind: "guest", isMember: false, userId: null, capabilities: capabilitiesFor("guest") });
const campaign = (inviterBonus = 2000, inviteeBonus = 2000): ReferralOverview["campaign"] => ({
  inviterBonus, inviteeBonus, windowDays: 30, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, target: 3,
});
const overviewOf = (shareCode: string, c = campaign()) => ({ shareCode, inviteCode: "x", campaign: c }) as ReferralOverview;

function signInAs(userId: string) {
  useAuthStore.setState({ kind: "member", isMember: true, userId, capabilities: capabilitiesFor("member") });
}

const renderPromos = (...placements: Array<"games" | "wallet">) =>
  render(
    <MemoryRouter>
      {placements.map((placement) => <InvitePromo key={placement} placement={placement} />)}
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchOverview.mockReset();
  asGuest();
  useInvitePromoStore.setState({ owner: null, status: "idle", offer: null, isDismissed: false });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("InvitePromo for a guest", () => {
  it("invites them to create an account, names no coin amount, and asks the server for nothing", () => {
    renderPromos("games");

    expect(screen.getByText(/Create a free account to get your own invite code/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("region", { name: "Invite your friends" }).textContent).not.toMatch(/\d{3,}/);
    expect(fetchOverview).not.toHaveBeenCalled();
  });
});

describe("InvitePromo for a member", () => {
  it("shows their own code and what their campaign pays, from one request however many promos are open", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    renderPromos("games", "wallet");

    expect(await screen.findAllByTestId("invite-promo-code")).toHaveLength(2);
    expect(screen.getAllByTestId("invite-promo-code")[0]).toHaveTextContent("BHALYAM-K7M2P");
    expect(screen.getAllByText(/each get 2,000 coins/)).toHaveLength(2);
    expect(fetchOverview).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("link", { name: "See who joined" })[0]).toHaveAttribute("href", "/referrals");
  });

  it("says each side's own amount when the two differ", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P", campaign(3000, 1000)));
    renderPromos("games");

    expect(await screen.findByText(/You get 3,000 coins and your friend gets 1,000/)).toBeInTheDocument();
  });

  it("shows nothing when the coin bonus has been stopped", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P", campaign(0, 0)));
    renderPromos("games");

    await waitFor(() => expect(useInvitePromoStore.getState().status).toBe("ready"));
    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();
  });

  it("shows nothing, and no error, when the offer cannot be read", async () => {
    signInAs("u1");
    fetchOverview.mockRejectedValue(new Error("offline"));
    renderPromos("games");

    await waitFor(() => expect(useInvitePromoStore.getState().status).toBe("unavailable"));
    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("never shows one member's code to the next member who signs in", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValueOnce(overviewOf("BHALYAM-AAAAA"));
    renderPromos("games");
    expect(await screen.findByText("BHALYAM-AAAAA")).toBeInTheDocument();

    let release: (value: ReferralOverview) => void = () => undefined;
    fetchOverview.mockReturnValueOnce(new Promise<ReferralOverview>((resolve) => { release = resolve; }));
    act(() => signInAs("u2"));
    expect(screen.queryByText("BHALYAM-AAAAA")).toBeNull();

    await act(async () => release(overviewOf("BHALYAM-BBBBB")));
    expect(await screen.findByText("BHALYAM-BBBBB")).toBeInTheDocument();
  });

  it("copies the code to the clipboard", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderPromos("games");

    fireEvent.click(await screen.findByRole("button", { name: "Copy code" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("BHALYAM-K7M2P"));
    expect(await screen.findByText("Code copied.")).toBeInTheDocument();
  });

  it("shares through WhatsApp when the device has no share sheet, with the code and the link", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    const open = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, share: undefined });
    vi.stubGlobal("open", open);
    renderPromos("games");

    fireEvent.click(await screen.findByRole("button", { name: "Share" }));

    expect(open).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(String(open.mock.calls[0]?.[0]));
    expect(url).toContain("https://wa.me/?text=");
    expect(url).toContain("BHALYAM-K7M2P");
    expect(url).toContain("/invite/BHALYAM-K7M2P");
  });
});

describe("dismissing", () => {
  it("hides every invitation on the page for this visit", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    renderPromos("games", "wallet");
    await screen.findAllByTestId("invite-promo-code");

    fireEvent.click(screen.getAllByRole("button", { name: "Hide this invitation for now" })[0]!);

    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();
  });

  it("hides a guest's pitch too, and brings the offer back for the member who signs in next", async () => {
    renderPromos("games");
    fireEvent.click(screen.getByRole("button", { name: "Hide this invitation for now" }));
    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();

    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    act(() => signInAs("u1"));

    expect(await screen.findByText("BHALYAM-K7M2P")).toBeInTheDocument();
  });
});
