import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import ScorecardsPage from "../ScorecardsPage";
import { useScorecardStore } from "../../store/scorecardStore";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import type { ProfileFamilyOutletContext } from "../../components/layout/ProfileFamilyLayout";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";

vi.mock("../../components/scorecard/ChronoScorecardDeck", () => ({
  default: () => <div>Scorecard deck</div>,
}));

const profile = {
  playerId: "player_1",
  displayName: "Kethan",
  joinedAt: 1_700_000_000_000,
  lastSeenAt: 1_700_000_100_000,
  level: 4,
  experiencePoints: 340,
};

const archive: PlayerScorecardArchive = {
  playerId: "player_1",
  games: {
    ludo: {
      game: "ludo",
      gameDisplayName: "Ludo",
      lastPlayedAt: 1_700_000_000_000,
      totalModesPlayed: 2,
      modes: {},
    },
  },
  totalPersonalBestsBeaten: 6,
  updatedAt: 1_700_000_100_000,
};

beforeEach(() => {
  useScorecardStore.setState({
    archive,
    loading: false,
    error: null,
    lastNewPB: null,
    fetchScorecards: vi.fn().mockResolvedValue(undefined),
  });
});

describe("ScorecardsPage redesign", () => {
  it("frames the responsive deck with truthful archive metrics", () => {
    const stats = INITIAL_PLAYER_STATS("player_1");
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
      <MemoryRouter initialEntries={["/profile/scorecards"]}>
        <Routes>
          <Route element={<Outlet context={context} />}>
            <Route path="/profile/scorecards" element={<ScorecardsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Personal best lab" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Tracked games" }).textContent).toContain("1");
    expect(screen.getByRole("group", { name: "Records broken" }).textContent).toContain("6");
    expect(screen.getByText("Scorecard deck")).toBeDefined();
  });
});
