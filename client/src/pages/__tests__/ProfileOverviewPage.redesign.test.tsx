import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import ProfileOverviewPage from "../ProfileOverviewPage";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import type { ProfileFamilyOutletContext } from "../../components/layout/ProfileFamilyLayout";

const profile = {
  playerId: "player_1",
  displayName: "Kethan",
  joinedAt: 1_700_000_000_000,
  lastSeenAt: 1_700_000_100_000,
  level: 4,
  experiencePoints: 340,
};

const stats = {
  ...INITIAL_PLAYER_STATS("player_1"),
  totalMatches: 18,
  wins: 11,
  losses: 5,
  draws: 2,
  winRate: 61,
  bestWinStreak: 6,
  perGame: {
    ludo: {
      game: "ludo" as const,
      matchesPlayed: 8,
      wins: 5,
      losses: 2,
      draws: 1,
      winRate: 63,
      averageMatchDurationMinutes: 9,
      totalPlayTimeMinutes: 72,
    },
  },
};

function renderOverview(overrides: Partial<ProfileFamilyOutletContext> = {}) {
  const context: ProfileFamilyOutletContext = {
    profile,
    stats,
    achievements: [],
    recentMatches: [],
    resources: {
      profile: { status: "ready", data: profile },
      stats: { status: "ready", data: stats },
      achievements: { status: "ready", data: [] },
      recentMatches: { status: "ready", data: [] },
    },
    loading: false,
    isMember: true,
    currentName: "Kethan",
    currentAvatar: null,
    effectivePlayerId: "player_1",
    retryProfileData: vi.fn(),
    openEditModal: vi.fn(),
    openAvatarModal: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/profile" element={<ProfileOverviewPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProfileOverviewPage redesign", () => {
  it("builds the career HQ from authoritative profile data", () => {
    renderOverview();

    expect(screen.getByRole("heading", { name: "Career command center" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Matches played" }).textContent).toContain("18");
    expect(screen.getByRole("group", { name: "Win rate" }).textContent).toContain("61%");
    expect(screen.getByRole("region", { name: "Game mastery" }).textContent).toContain("Ludo");
  });

  it("shows honest empty states for new players", () => {
    const emptyStats = INITIAL_PLAYER_STATS("player_1");
    renderOverview({
      stats: emptyStats,
      resources: {
        profile: { status: "ready", data: profile },
        stats: { status: "ready", data: emptyStats },
        achievements: { status: "ready", data: [] },
        recentMatches: { status: "ready", data: [] },
      },
    });

    expect(screen.getByText("No mastery data yet")).toBeDefined();
    expect(screen.getByText("Your battle log is ready")).toBeDefined();
  });
});
