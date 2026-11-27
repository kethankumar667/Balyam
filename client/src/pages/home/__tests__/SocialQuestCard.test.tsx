import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { capabilitiesFor } from "@shared/permissions";
import type { ReferralProgress } from "@shared/referrals";
import { SocialQuestCard } from "../SocialQuestCard";

const mocks = vi.hoisted(() => ({
  progress: null as ReferralProgress | null,
  loading: false,
  error: null as string | null,
  notice: null as string | null,
  retry: vi.fn(),
}));
vi.mock("../../../hooks/useReferralProgress", () => ({ useReferralProgress: () => mocks }));
vi.mock("../../../store/authStore", async () => {
  const { create } = await import("zustand");
  const { capabilitiesFor } = await import("@shared/permissions");
  return { useAuthStore: create(() => ({ userId: "member-1" as string | null, capabilities: capabilitiesFor("member") })) };
});
import { useAuthStore } from "../../../store/authStore";

const base: ReferralProgress = {
  inviteCode: "00000000-0000-4000-8000-000000000001",
  shareCode: "BHALYAM-LXV2P",
  qualifiedFriends: 0,
  pendingFriends: 0,
  target: 3,
  rewardGranted: false,
};

function show(isMember = true) {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><SocialQuestCard isMember={isMember} /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.progress = { ...base };
  mocks.loading = false;
  mocks.error = null;
  mocks.notice = null;
  useAuthStore.setState({ userId: "member-1", capabilities: capabilitiesFor("member") });
});
afterEach(cleanup);

describe("Social quest card: friend progress", () => {
  it.each([0, 1, 2, 3])("shows %i of 3 friends as qualified, in words and not only in colour", qualified => {
    mocks.progress = { ...base, qualifiedFriends: qualified };
    show();
    expect(screen.getByText(`${qualified} / 3 friends qualified`)).toBeInTheDocument();
    expect(screen.queryAllByText(/Friend \d: qualified/)).toHaveLength(qualified);
    expect(screen.queryAllByText(/Friend \d: not yet qualified/)).toHaveLength(3 - qualified);
  });

  it("draws the campaign's own target, never more than five slots, and never more qualified than slots", () => {
    mocks.progress = { ...base, target: 4, qualifiedFriends: 2 };
    show();
    expect(screen.getByRole("list", { name: "Qualifying friend progress" }).children).toHaveLength(4);
    cleanup();
    mocks.progress = { ...base, target: 9, qualifiedFriends: 9 };
    show();
    expect(screen.getByRole("list", { name: "Qualifying friend progress" }).children).toHaveLength(5);
    expect(screen.getByText("5 / 5 friends qualified")).toBeInTheDocument();
  });

  it("marks the three pack rewards locked until the pack is granted, then unlocked", () => {
    show();
    expect(screen.getAllByText("Locked")).toHaveLength(3);
    cleanup();
    mocks.progress = { ...base, qualifiedFriends: 3, rewardGranted: true };
    show();
    expect(screen.getAllByText("Unlocked")).toHaveLength(3);
    expect(screen.queryByText("Locked")).toBeNull();
  });
});

describe("Social quest card: the member's code", () => {
  it("shows the real code with a copy button that copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    show();
    expect(screen.getByText("BHALYAM-LXV2P")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy invitation code" }));
    expect(writeText).toHaveBeenCalledWith("BHALYAM-LXV2P");
    expect(await screen.findByRole("button", { name: "Invitation code copied" })).toBeInTheDocument();
  });

  it("shows no code at all, rather than a made-up one, when the server has not issued one", () => {
    mocks.progress = { ...base, shareCode: undefined };
    show();
    expect(screen.queryByText(/^Code:/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Copy invitation code/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Invite friends" })).toBeEnabled();
  });
});

describe("Social quest card: where the pack is worn", () => {
  it("points an Admin Pass holder to the pack page, with no equip button and no Admin Pass essay on the card", () => {
    useAuthStore.setState({ capabilities: capabilitiesFor("admin") });
    show();
    expect(screen.getByRole("link", { name: "Admin Pass: wear your pack" })).toHaveAttribute("href", "/referrals");
    expect(screen.queryByRole("button", { name: /Equip.*pack/ })).toBeNull();
    expect(screen.queryByText(/Admin Pass gives access/)).toBeNull();
    expect(screen.getAllByRole("button", { name: "Invite friends" })).toHaveLength(1);
  });

  it("points a member whose pack is unlocked to it, and offers nothing to a member whose pack is not", () => {
    mocks.progress = { ...base, qualifiedFriends: 3, rewardGranted: true };
    show();
    expect(screen.getByRole("link", { name: "Pack unlocked: wear it" })).toHaveAttribute("href", "/referrals");
    cleanup();
    mocks.progress = { ...base };
    show();
    expect(screen.queryByRole("link", { name: /wear/i })).toBeNull();
  });
});

describe("Social quest card: honest states", () => {
  it("asks a guest to sign in and shows no progress or code", () => {
    show(false);
    expect(screen.getByRole("link", { name: "Sign in to invite" })).toHaveAttribute("href", "/login");
    expect(screen.getByText("Sign in to track your crew")).toBeInTheDocument();
    expect(screen.queryByText(/friends qualified/)).toBeNull();
    expect(screen.queryByText(/^Code:/)).toBeNull();
  });

  it("holds the action disabled while invitations load, without a zero count", () => {
    mocks.progress = null;
    mocks.loading = true;
    show();
    expect(screen.getByRole("status")).toHaveTextContent("Loading invitations...");
    expect(screen.getByRole("button", { name: "Invite friends" })).toBeDisabled();
    expect(screen.queryByText(/friends qualified/)).toBeNull();
  });

  it("turns the action into a retry when invitations fail, and shows no count", () => {
    mocks.progress = null;
    mocks.error = "Invitations could not be updated. Please try again.";
    show();
    expect(screen.getByRole("alert")).toHaveTextContent(mocks.error);
    fireEvent.click(screen.getByRole("button", { name: "Retry invitations" }));
    expect(mocks.retry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/friends qualified/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Invite friends" })).toBeNull();
  });

  it("shows the connection notice when an invitation was just accepted", () => {
    mocks.notice = "Invitation connected. Complete a match with another human to qualify.";
    show();
    expect(screen.getByText(mocks.notice)).toBeInTheDocument();
  });
});
