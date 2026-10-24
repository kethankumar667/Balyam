import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ACHIEVEMENT_CATALOG } from "@shared/profile/Achievements";
import type { PlayerSnapshot } from "../../../hooks/usePlayerSnapshot";
import { PlayerJourneyDashboard } from "../PlayerJourneyDashboard";

const referral = vi.hoisted(() => ({
  progress: { inviteCode: "00000000-0000-4000-8000-000000000001", qualifiedFriends: 1, pendingFriends: 1, target: 3, rewardGranted: false },
  loading: false, error: null as string | null, notice: null, retry: vi.fn(),
}));
vi.mock("../../../hooks/useReferralProgress", () => ({ useReferralProgress: () => referral }));
vi.mock("../../../components/RevealOnScroll", () => ({
  RevealOnScroll: ({ children, className }: { children: React.ReactNode; className: string }) => <section className={className}>{children}</section>,
}));

function fixture(): PlayerSnapshot {
  return {
    ready: true,
    profile: { playerId: "member", displayName: "Kethan", joinedAt: 1, lastSeenAt: 1, level: 11, experiencePoints: 1000 },
    stats: null,
    matches: [{ matchId: "done", roomCode: "ABC123", game: "handcricket", startedAt: 1, finishedAt: 2, durationMs: 1, result: "WIN", participants: [], replayAvailable: false }],
    achievements: [{
      ...ACHIEVEMENT_CATALOG.find(a => a.id === "tournament_ready")!,
      unlocked: false, currentProgress: 19, progressPercent: 95,
    }],
  };
}

function show(snapshot = fixture(), isMember = true) {
  const select = vi.fn();
  render(<MemoryRouter><PlayerJourneyDashboard snapshot={snapshot} isMember={isMember} onSelect={select} /></MemoryRouter>);
  return select;
}

beforeEach(() => { referral.error = null; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Your Journey Continues", () => {
  it("replays the actual latest game without pretending to resume a saved match", () => {
    const select = show();
    expect(screen.getByRole("heading", { name: "Your Journey Continues" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Play Hand Cricket again/i }));
    expect(select).toHaveBeenCalledWith("handcricket");
    expect(screen.queryByText(/Progress saved|T20|10 Overs|Resume game/i)).toBeNull();
  });

  it("labels level XP and achievement progress separately, with the complete goal requirement", () => {
    show();
    expect(screen.getByRole("progressbar", { name: "Level XP" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0 / 100 XP to Level 12")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Achievement progress" })).toHaveAttribute("aria-valuenow", "95");
    expect(screen.getByText(/60%.*win rate.*20 matches/i)).toBeInTheDocument();
    expect(screen.queryByText(/one match remaining|500 XP/i)).toBeNull();
  });

  it("shows server referral counts and real reward types, not joined-link counts", () => {
    show();
    expect(screen.getByText("1 / 3 friends qualified")).toBeInTheDocument();
    expect(screen.getByText(/new verified account.*match with another human/i)).toBeInTheDocument();
    expect(screen.getByText("Golden Reunion")).toBeInTheDocument();
    expect(screen.getByText("Gang Leader")).toBeInTheDocument();
    expect(screen.getByText("School Slate")).toBeInTheDocument();
    expect(screen.queryByText(/Chat Badge|instantly unlock/i)).toBeNull();
  });

  it("offers invite channels only after the invite action", () => {
    show();
    expect(screen.queryByRole("link", { name: /WhatsApp/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Invite friends" }));
    const channel = screen.getByRole("link", { name: /WhatsApp/i });
    expect(decodeURIComponent(channel.getAttribute("href")!)).toContain("/invite/00000000-0000-4000-8000-000000000001");
    expect(channel).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps guest, loading, and unavailable XP honest", () => {
    show({ ...fixture(), ready: false, profile: null, matches: [], achievements: [] }, false);
    expect(screen.getByRole("link", { name: "Create account" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Level XP" })).toBeNull();
    cleanup();
    show({ ...fixture(), ready: false });
    expect(screen.getByRole("status", { name: "Loading player progress" })).toBeInTheDocument();
    cleanup();
    show({ ...fixture(), profile: null, achievements: [] });
    expect(screen.getByText("Your progress is unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Level 1$/)).toBeNull();
    expect(screen.queryByText(/Every achievement unlocked/i)).toBeNull();
  });

  it("shows a retry rather than zero friends when referrals fail", () => {
    referral.error = "Invitations could not be updated. Please try again.";
    show();
    expect(screen.getByText(referral.error)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry invitations" }));
    expect(referral.retry).toHaveBeenCalled();
    expect(screen.queryByText("1 / 3 friends qualified")).toBeNull();
  });
});
