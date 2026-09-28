import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import MatchHistoryPage from "../MatchHistoryPage";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import type { ProfileFamilyOutletContext } from "../../components/layout/ProfileFamilyLayout";

vi.mock("../../lib/playerIdentity", () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ matches: [], total: 0 }),
  }),
}));

const profile = {
  playerId: "player_1",
  displayName: "Kethan",
  joinedAt: 1_700_000_000_000,
  lastSeenAt: 1_700_000_100_000,
  level: 4,
  experiencePoints: 340,
};

function renderHistory() {
  const stats = {
    ...INITIAL_PLAYER_STATS("player_1"),
    totalMatches: 12,
    wins: 7,
    losses: 3,
    draws: 2,
    winRate: 58,
    totalPlayTimeMinutes: 136,
    perGame: {
      ludo: {
        game: "ludo" as const,
        matchesPlayed: 12,
        wins: 7,
        losses: 3,
        draws: 2,
        winRate: 58,
        averageMatchDurationMinutes: 11,
        totalPlayTimeMinutes: 136,
      },
    },
  };
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
  };

  render(
    <MemoryRouter initialEntries={["/profile/matches"]}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/profile/matches" element={<MatchHistoryPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("MatchHistoryPage redesign", () => {
  it("presents the battle archive with authoritative career metrics", async () => {
    renderHistory();

    expect(screen.getByRole("heading", { name: "Battle archive" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Matches logged" }).textContent).toContain("12");
    expect(screen.getByRole("group", { name: "Victories" }).textContent).toContain("7");
    expect(await screen.findByText("No battles in this view")).toBeDefined();
  });
});
