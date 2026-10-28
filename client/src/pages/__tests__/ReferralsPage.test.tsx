import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReferralOverview } from "@shared/referrals";
import ReferralsPage from "../ReferralsPage";

const mocks = vi.hoisted(() => ({
  canView: true,
  hook: vi.fn(),
  redeem: vi.fn(),
  detach: vi.fn(),
  retry: vi.fn(),
  check: vi.fn(),
}));

vi.mock("../../components/layout/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("../../store/authStore", () => ({
  useAuthStore: (select: (s: { capabilities: { viewReferrals: boolean } }) => unknown) => select({ capabilities: { viewReferrals: mocks.canView } }),
}));
vi.mock("../../hooks/useReferralOverview", () => ({ useReferralOverview: (enabled: boolean) => mocks.hook(enabled) }));
vi.mock("../../lib/referrals", async importOriginal => ({
  ...await importOriginal<typeof import("../../lib/referrals")>(),
  checkReferralCode: (code: string) => mocks.check(code),
}));

const NOW = Date.UTC(2026, 9, 28, 12);
const DAY = 86_400_000;
const none = { state: "NONE", amount: 2000, vestingUntil: null, creditedAt: null, blockedReason: null } as const;

function overview(patch: Partial<ReferralOverview> = {}): ReferralOverview {
  return {
    shareCode: "BHALYAM-K7M2P",
    inviteCode: "00000000-0000-4000-8000-000000000001",
    campaign: { inviterBonus: 2000, inviteeBonus: 2000, windowDays: 30, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, target: 3 },
    totals: { joined: 0, qualified: 0, waiting: 0, expired: 0, bonusCredited: 0, bonusPending: 0 },
    friends: [],
    referredBy: null,
    pack: { granted: false, qualifiedFriends: 0, target: 3 },
    canEnterCode: false,
    serverNow: NOW,
    ...patch,
  };
}

function state(patch: Record<string, unknown>) {
  mocks.hook.mockReturnValue({
    overview: null, loading: false, error: null, retry: mocks.retry, redeem: mocks.redeem, detach: mocks.detach, ...patch,
  });
}

const open = () => render(<MemoryRouter><ReferralsPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canView = true;
  mocks.check.mockResolvedValue({ valid: true });
});

describe("ReferralsPage", () => {
  it("asks guests to create an account and loads nothing", () => {
    mocks.canView = false;
    state({});
    open();
    expect(screen.getByRole("heading", { name: /invitations are for members/i })).toBeInTheDocument();
    expect(mocks.hook).toHaveBeenCalledWith(false);
  });

  it("shows a loading state while the first read is in flight", () => {
    state({ loading: true });
    open();
    expect(screen.getByRole("status", { name: /loading your invitations/i })).toBeInTheDocument();
  });

  it("says what went wrong and offers a retry", () => {
    state({ error: "Your invitations could not be loaded. Please try again." });
    open();
    expect(screen.getByRole("alert")).toHaveTextContent(/could not be loaded/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mocks.retry).toHaveBeenCalledOnce();
  });

  it("shows the code, the promise and an honest empty state for a new member", () => {
    state({ overview: overview() });
    open();
    expect(screen.getByTestId("referral-share-code")).toHaveTextContent("BHALYAM-K7M2P");
    expect(screen.getAllByText(/each get 2,000 coins/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no one has joined with your code yet/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /friends who qualified/i })).toHaveAttribute("aria-valuenow", "0");
  });

  it("lists each friend with both bonuses and never shows private details", () => {
    state({
      overview: overview({
        totals: { joined: 2, qualified: 1, waiting: 1, expired: 0, bonusCredited: 2000, bonusPending: 0 },
        friends: [
          {
            ordinal: 1, displayName: "Asha", avatarId: null, joinedAt: NOW - 5 * DAY, expiresAt: NOW + 25 * DAY,
            qualifiedAt: NOW - DAY, status: "QUALIFIED", via: "code",
            yourBonus: { ...none, state: "CREDITED", creditedAt: NOW - 1000 },
            theirBonus: { ...none, state: "VESTING", vestingUntil: NOW + DAY },
          },
          {
            ordinal: 2, displayName: "Ravi", avatarId: null, joinedAt: NOW - DAY, expiresAt: NOW + 29 * DAY,
            qualifiedAt: null, status: "JOINED", via: "link", yourBonus: none, theirBonus: none,
          },
        ],
        pack: { granted: false, qualifiedFriends: 1, target: 3 },
      }),
    });
    const { container } = open();
    const friends = screen.getByRole("region", { name: /friends who joined with your code/i });
    expect(within(friends).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Asha")).toBeInTheDocument();
    expect(screen.getByText("Ravi")).toBeInTheDocument();
    expect(screen.getByText(/2,000 coins received/)).toBeInTheDocument();
    expect(screen.getByText(/waiting for a first match \(29 days left\)/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/@|birth|dob/i);
    expect(screen.getByRole("progressbar", { name: /friends who qualified/i })).toHaveAttribute("aria-valuenow", "1");
  });

  it("shows who invited the member and lets a wrong code be removed in two steps", async () => {
    mocks.detach.mockResolvedValue({ ok: true });
    state({
      overview: overview({
        referredBy: {
          displayName: "Meera", avatarId: null, joinedAt: NOW - DAY, qualifiedAt: null, status: "JOINED", via: "code",
          yourBonus: none, canDetach: true,
        },
      }),
    });
    open();
    expect(screen.getByText("Meera")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /wrong code\? remove/i }));
    expect(mocks.detach).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /yes, remove it/i }));
    await waitFor(() => expect(mocks.detach).toHaveBeenCalledOnce());
  });

  it("does not offer removal once the first match has been played", () => {
    state({
      overview: overview({
        referredBy: {
          displayName: "Meera", avatarId: null, joinedAt: NOW - DAY, qualifiedAt: NOW, status: "QUALIFIED", via: "code",
          yourBonus: { ...none, state: "VESTING", vestingUntil: NOW + DAY }, canDetach: false,
        },
      }),
    });
    open();
    expect(screen.queryByRole("button", { name: /wrong code/i })).not.toBeInTheDocument();
    expect(screen.getByText(/welcome bonus is unlocked/i)).toBeInTheDocument();
  });

  it("lets a new member add a friend's code, normalised, after a live check", async () => {
    mocks.redeem.mockResolvedValue({ ok: true });
    state({ overview: overview({ canEnterCode: true }) });
    open();
    fireEvent.change(screen.getByLabelText(/your friend's code/i), { target: { value: "bhalyam k7m2p" } });
    expect(await screen.findByText(/that code works/i)).toBeInTheDocument();
    expect(mocks.check).toHaveBeenCalledWith("BHALYAM-K7M2P");
    fireEvent.click(screen.getByRole("button", { name: /add code/i }));
    await waitFor(() => expect(mocks.redeem).toHaveBeenCalledWith("BHALYAM-K7M2P"));
  });

  it("explains a refused code in plain words", async () => {
    mocks.redeem.mockResolvedValue({ ok: false, code: "ALREADY_PLAYED" });
    state({ overview: overview({ canEnterCode: true }) });
    open();
    fireEvent.change(screen.getByLabelText(/your friend's code/i), { target: { value: "BHALYAM-K7M2P" } });
    await screen.findByText(/that code works/i);
    fireEvent.click(screen.getByRole("button", { name: /add code/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/have not yet played with other people/i);
  });

  it("keeps the add button off for a code the server does not know", async () => {
    mocks.check.mockRejectedValue(new Error("That code was not found. Check it and try again."));
    state({ overview: overview({ canEnterCode: true }) });
    open();
    fireEvent.change(screen.getByLabelText(/your friend's code/i), { target: { value: "BHALYAM-K7M2P" } });
    await waitFor(() => expect(screen.getAllByText(/that code was not found/i).length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: /add code/i })).toBeDisabled();
  });

  it("does not offer a code field to a member who can no longer use one", () => {
    state({ overview: overview({ canEnterCode: false }) });
    open();
    expect(screen.queryByLabelText(/your friend's code/i)).not.toBeInTheDocument();
  });
});
