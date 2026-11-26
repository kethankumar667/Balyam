import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import ProfileOverviewPage from "../ProfileOverviewPage";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import type { ProfileFamilyOutletContext } from "../../components/layout/ProfileFamilyLayout";
import { ACHIEVEMENT_CATALOG, type Achievement } from "@shared/profile/Achievements";

const exportPlayer = vi.hoisted(() => vi.fn());
vi.mock("../../lib/privacy/exportData", () => ({ downloadPlayerExport: exportPlayer }));

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
  return context;
}

describe("ProfileOverviewPage redesign", () => {
  it("builds the career HQ from authoritative profile data", () => {
    renderOverview();

    expect(screen.getByRole("heading", { name: "Player command center" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Matches played" }).textContent).toContain("18");
    expect(screen.getByRole("group", { name: "Win rate" }).textContent).toContain("61%");
    expect(screen.getByRole("region", { name: "Game mastery" }).textContent).toContain("Ludo");
  });

  it("separates latest unlocks from closest unfinished challenges without hiding requirements", () => {
    const items: Achievement[] = ACHIEVEMENT_CATALOG.map((a, i) => ({
      ...a, unlocked: i < 2, unlockedAt: i < 2 ? 1000 + i : undefined,
      currentProgress: a.id === "tournament_ready" ? 19 : 0,
      progressPercent: a.id === "tournament_ready" ? 95 : i < 2 ? 100 : 0,
    }));
    renderOverview({ achievements: items });
    const highlights = screen.getByRole("region", { name: "Achievement highlights" });
    expect(within(highlights).getByText("Taste of Victory")).toBeDefined();
    const almost = screen.getByRole("region", { name: "Almost yours" });
    expect(within(almost).getByText("High Roller")).toBeDefined();
    expect(almost.textContent).toMatch(/60%/);
    expect(almost.textContent).toMatch(/20/);
    expect(almost.textContent).not.toMatch(/1 match remaining|epic|rare/i);
  });

  it("does not expose stale career numbers or mastery while stats are unavailable", () => {
    renderOverview({ resources: {
      profile: { status: "ready", data: profile },
      stats: { status: "error", data: stats, message: "Stats offline" },
      achievements: { status: "ready", data: [] },
      recentMatches: { status: "ready", data: [] },
    } });
    expect(screen.queryByRole("group", { name: "Matches played" })).toBeNull();
    expect(screen.queryByText("Ludo")).toBeNull();
    expect(screen.getByText("Career metrics unavailable")).toBeDefined();
  });

  it("does not treat an achievements failure as zero unlocked", () => {
    renderOverview({ resources: {
      profile: { status: "ready", data: profile },
      stats: { status: "ready", data: stats },
      achievements: { status: "error", data: null, message: "Vault offline" },
      recentMatches: { status: "ready", data: [] },
    } });
    expect(screen.getByRole("group", { name: "Achievements" }).textContent).toContain("Unavailable");
    expect(screen.getByText("Achievements unavailable")).toBeDefined();
  });

  it("keeps profile controls and the real roadmap available", () => {
    const context = renderOverview();
    fireEvent.click(screen.getByRole("button", { name: "Edit personal information" }));
    expect(context.openEditModal).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));
    expect(context.openAvatarModal).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /roadmap/i }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("preserves player-data export and the guarded account-deletion dialog", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: "Download player data" }));
    expect(exportPlayer).toHaveBeenCalledTimes(1);
    expect(exportPlayer.mock.calls[0].slice(0, 2)).toEqual([profile, stats]);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("dialog", { name: "Delete your account?" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("labels the journey as progress markers rather than inventing event dates", () => {
    renderOverview();
    const journey = screen.getByRole("region", { name: "Your BHALYAM journey" });
    expect(journey.textContent).toContain("Progress markers");
    expect(journey.textContent).toContain("Level 4");
    expect(journey.textContent).not.toContain("Oct 02");
  });

  it("keeps loading resources from showing stale cards or numbers", () => {
    renderOverview({ resources: {
      profile: { status: "ready", data: profile },
      stats: { status: "loading", data: null },
      achievements: { status: "loading", data: null },
      recentMatches: { status: "loading", data: null },
    } });
    expect(screen.queryByRole("group", { name: "Matches played" })).toBeNull();
    expect(screen.queryByText("Ludo")).toBeNull();
    expect(screen.queryByText("No mastery data yet")).toBeNull();
    expect(screen.queryByText("Your battle log is ready")).toBeNull();
  });

  it("never presents demo stats as a verified career", () => {
    const demoStats = { ...stats, demo: true };
    renderOverview({ stats: demoStats, resources: {
      profile: { status: "ready", data: profile },
      stats: { status: "ready", data: demoStats },
      achievements: { status: "ready", data: [] },
      recentMatches: { status: "ready", data: [] },
    } });
    expect(screen.queryByRole("group", { name: "Matches played" })).toBeNull();
    expect(screen.getByText("Career metrics unavailable")).toBeDefined();
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
