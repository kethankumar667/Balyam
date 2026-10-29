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
// The friend's picture reads the full auth store (for cosmetics); this page test swaps that store for a bare selector.
vi.mock("../../components/mandali/album/AlbumAvatar", () => ({ AlbumAvatar: () => <span data-testid="friend-avatar" /> }));
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
    const friends = screen.getByRole("region", { name: /^your crew$/i });
    expect(within(friends).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Asha")).toBeInTheDocument();
    expect(screen.getByText("Ravi")).toBeInTheDocument();
    expect(screen.getByText(/2,000 coins received/)).toBeInTheDocument();
    expect(screen.getByText(/29 days left/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/@|birth|dob/i);
    // Only a friend who has joined and not yet played is offered a match.
    expect(screen.getByRole("button", { name: /play with ravi/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /play with asha/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: /play with meera/i })).toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: /play with meera/i })).not.toBeInTheDocument();
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

  describe("the Crew Quest layout", () => {
    const verifyingFriend = {
      ordinal: 1, displayName: "Asha", avatarId: null, joinedAt: NOW - DAY, expiresAt: NOW + 29 * DAY,
      qualifiedAt: NOW - 3_600_000, status: "QUALIFIED", via: "code",
      yourBonus: { ...none, state: "VESTING", vestingUntil: NOW + 3 * 3_600_000 },
      theirBonus: { ...none, state: "VESTING", vestingUntil: NOW + 3 * 3_600_000 },
    } as const;

    it("folds the numbers into four tiles, with what was received inside the coins tile", () => {
      state({ overview: overview({ totals: { joined: 3, qualified: 1, waiting: 2, expired: 0, bonusCredited: 0, bonusPending: 2000 } }) });
      open();
      const pulse = screen.getByRole("region", { name: /your crew pulse/i });
      expect(within(pulse).getByText("Joined").previousElementSibling).toHaveTextContent("3");
      expect(within(pulse).getByText("Played Together").previousElementSibling).toHaveTextContent("1");
      expect(within(pulse).getByText("Waiting").previousElementSibling).toHaveTextContent("2");
      expect(within(pulse).getByText("Coins on the way").previousElementSibling).toHaveTextContent("2,000");
      expect(within(pulse).getByText(/held for a day, then paid/i)).toBeInTheDocument();
    });

    it("marks where the invitation is now: a played match that is still in its hold is 'Verify Match'", () => {
      state({ overview: overview({ totals: { joined: 3, qualified: 1, waiting: 2, expired: 0, bonusCredited: 0, bonusPending: 2000 }, friends: [verifyingFriend] }) });
      open();
      const journey = screen.getByRole("region", { name: /the invitation journey/i });
      const items = within(journey).getAllByRole("listitem");
      expect(items).toHaveLength(5);
      expect(items.find(item => item.getAttribute("aria-current") === "step")).toHaveTextContent(/verify match/i);
    });

    it("tells a friend whose match is being verified when the coins arrive, in time and in hours", () => {
      state({ overview: overview({ friends: [verifyingFriend], totals: { joined: 1, qualified: 1, waiting: 0, expired: 0, bonusCredited: 0, bonusPending: 2000 } }) });
      open();
      const crew = screen.getByRole("region", { name: /your crew$/i });
      expect(within(crew).getByText("Verifying")).toBeInTheDocument();
      expect(within(crew).getAllByText(/2,000 coins arriving .* at .*\(in 3 hr\)/).length).toBe(2);
      expect(within(crew).queryByRole("button", { name: /play with asha/i })).not.toBeInTheDocument();
    });

    it("opens the complete rules in a dialog and closes it again", () => {
      state({ overview: overview() });
      open();
      fireEvent.click(screen.getByRole("button", { name: /view full rules/i }));
      const dialog = screen.getByRole("dialog", { name: /complete reward rules/i });
      expect(within(dialog).getByText(/no cash value/i)).toBeInTheDocument();
      expect(within(dialog).getAllByRole("listitem")).toHaveLength(5);
      fireEvent.click(within(dialog).getByRole("button", { name: /got it/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows the pack as a vault: how many crew matches are done and how many remain", () => {
      state({ overview: overview({ pack: { granted: false, qualifiedFriends: 1, target: 3 } }) });
      open();
      expect(screen.getByText("1 / 3 crew matches completed")).toBeInTheDocument();
      expect(screen.getByText("2 more qualifying crew matches to unlock")).toBeInTheDocument();
      expect(screen.getByText("Golden Reunion")).toBeInTheDocument();
    });

    it("shows only the first three friends until 'View all' is pressed", () => {
      const friend = (ordinal: number) => ({ ...verifyingFriend, ordinal, displayName: `Friend ${ordinal}` });
      state({ overview: overview({ friends: [1, 2, 3, 4, 5].map(friend) }) });
      open();
      expect(screen.queryByText("Friend 4")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /view all \(5\)/i }));
      expect(screen.getByText("Friend 5")).toBeInTheDocument();
    });

    it("follows the app's light or dark theme instead of forcing night", () => {
      state({ overview: overview() });
      const { container } = open();
      expect(container.querySelector("[data-theme]")).toBeNull();
      // Every colour on the page is a light value with a `dark:` partner, so the panel is white by day.
      expect(screen.getByRole("region", { name: /your crew pulse/i }).className).toMatch(/bg-white.*dark:bg-\[#0c1b30\]/);
    });

    it("says in plain words that no contacts are read and no device is tracked", () => {
      state({ overview: overview() });
      open();
      expect(screen.getByText("No contacts uploaded")).toBeInTheDocument();
      expect(screen.getByText("No device tracking")).toBeInTheDocument();
    });
  });
});
