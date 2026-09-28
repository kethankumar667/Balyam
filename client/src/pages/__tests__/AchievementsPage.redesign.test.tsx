import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import AchievementsPage from "../AchievementsPage";
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

const achievements = [
  {
    id: "first_win",
    title: "Taste of Victory",
    description: "Win your first match.",
    icon: "trophy",
    category: "skill" as const,
    targetValue: 1,
    unlocked: true,
    currentProgress: 1,
    progressPercent: 100,
  },
  {
    id: "fifty_matches",
    title: "Dedicated Gamer",
    description: "Play 50 matches.",
    icon: "star",
    category: "progression" as const,
    targetValue: 50,
    unlocked: false,
    currentProgress: 12,
    progressPercent: 24,
  },
];

function renderAchievements() {
  const stats = INITIAL_PLAYER_STATS("player_1");
  const context: ProfileFamilyOutletContext = {
    profile,
    stats,
    achievements,
    recentMatches: [],
    resources: {
      profile: { status: "ready", data: profile },
      stats: { status: "ready", data: stats },
      achievements: { status: "ready", data: achievements },
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
  };

  render(
    <MemoryRouter initialEntries={["/profile/achievements"]}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/profile/achievements" element={<AchievementsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AchievementsPage redesign", () => {
  it("shows the trophy vault and real completion progress", () => {
    renderAchievements();

    expect(screen.getByRole("heading", { name: "Trophy vault" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Unlocked" }).textContent).toContain("1");
    expect(screen.getByRole("progressbar", { name: "Vault completion" }).getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByText("Taste of Victory")).toBeDefined();
  });
});
