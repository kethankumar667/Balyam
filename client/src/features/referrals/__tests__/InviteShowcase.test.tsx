import "@testing-library/jest-dom/vitest";
import { act, cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReferralOverview } from "@shared/referrals";
import { capabilitiesFor } from "@shared/permissions";
import { useAuthStore } from "../../../store/authStore";
import { useInvitePromoStore } from "../../../store/invitePromoStore";
import { InvitePromo } from "../InvitePromo";
import { InviteShowcase } from "../InviteShowcase";

configure({ asyncUtilTimeout: 5000 });

const fetchOverview = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/referrals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/referrals")>()),
  fetchReferralOverview: fetchOverview,
}));

const campaign = (inviterBonus = 2000, inviteeBonus = 2000): ReferralOverview["campaign"] => ({
  inviterBonus, inviteeBonus, windowDays: 30, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, target: 3,
});
const overviewOf = (shareCode: string, c = campaign()) => ({ shareCode, inviteCode: "x", campaign: c }) as ReferralOverview;
const asGuest = () => useAuthStore.setState({ kind: "guest", isMember: false, userId: null, capabilities: capabilitiesFor("guest") });
const signInAs = (userId: string) => useAuthStore.setState({ kind: "member", isMember: true, userId, capabilities: capabilitiesFor("member") });

const renderShowcase = () => render(<MemoryRouter><InviteShowcase /></MemoryRouter>);

beforeEach(() => {
  fetchOverview.mockReset();
  asGuest();
  useInvitePromoStore.setState({ owner: null, status: "idle", offer: null, isDismissed: false });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("InviteShowcase for a member", () => {
  it("shows their code on the pass and what each side earns", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    renderShowcase();

    expect(await screen.findByTestId("invite-showcase-code")).toHaveTextContent("BHALYAM-K7M2P");
    expect(screen.getByText("You get").closest("li")).toHaveTextContent("+2,000");
    expect(screen.getByText("Your friend gets").closest("li")).toHaveTextContent("+2,000");
    expect(screen.getByText(/each get 2,000 coins/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See who joined" })).toHaveAttribute("href", "/referrals");
  });

  it("shows each side's own amount when the two differ", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P", campaign(3000, 1000)));
    renderShowcase();

    await screen.findByTestId("invite-showcase-code");
    expect(screen.getByText("You get").closest("li")).toHaveTextContent("+3,000");
    expect(screen.getByText("Your friend gets").closest("li")).toHaveTextContent("+1,000");
  });

  it("copies the code, and shares through WhatsApp when the device has no share sheet", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText }, share: undefined });
    vi.stubGlobal("open", open);
    renderShowcase();

    fireEvent.click(await screen.findByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("BHALYAM-K7M2P"));

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(decodeURIComponent(String(open.mock.calls[0]?.[0]))).toContain("/invite/BHALYAM-K7M2P");
  });

  it("shows nothing when the coin bonus has been stopped, or when the offer cannot be read", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P", campaign(0, 0)));
    renderShowcase();
    await waitFor(() => expect(useInvitePromoStore.getState().status).toBe("ready"));
    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();

    cleanup();
    useInvitePromoStore.setState({ owner: null, status: "idle", offer: null, isDismissed: false });
    fetchOverview.mockRejectedValue(new Error("offline"));
    renderShowcase();
    await waitFor(() => expect(useInvitePromoStore.getState().status).toBe("unavailable"));
    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();
  });

  it("is hidden for the visit once dismissed, and hides the compact cards with it", async () => {
    signInAs("u1");
    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    render(<MemoryRouter><InviteShowcase /><InvitePromo placement="games" /></MemoryRouter>);
    await screen.findByTestId("invite-showcase-code");
    expect(fetchOverview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Hide this invitation for now" })[0]!);

    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();
  });
});

describe("InviteShowcase for a guest", () => {
  it("offers a locked pass, three steps and no coin figure, and asks the server for nothing", () => {
    renderShowcase();

    const section = screen.getByRole("region", { name: "Invite your friends" });
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Your invite code appears here once you have an account.")).toBeInTheDocument();
    expect(section.textContent).not.toMatch(/\d{3,}/);
    expect(fetchOverview).not.toHaveBeenCalled();
  });

  it("brings the member's own pass back when they sign in after dismissing", async () => {
    renderShowcase();
    fireEvent.click(screen.getByRole("button", { name: "Hide this invitation for now" }));
    expect(screen.queryByRole("region", { name: "Invite your friends" })).toBeNull();

    fetchOverview.mockResolvedValue(overviewOf("BHALYAM-K7M2P"));
    act(() => signInAs("u1"));

    expect(await screen.findByTestId("invite-showcase-code")).toHaveTextContent("BHALYAM-K7M2P");
  });
});
