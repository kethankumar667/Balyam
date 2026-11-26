import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ProfileFamilyOutletContext } from "../../../../components/layout/ProfileFamilyLayout";
import type { RecentMatchItem } from "../../CareerMetrics";
import ProfileOverviewPhone, { type ProfileOverviewPhoneProps } from "../ProfileOverviewPhone";
import { ACHIEVEMENT_CATALOG, type Achievement } from "@shared/profile/Achievements";
import { INITIAL_PLAYER_STATS, type GameStats, type PlayerStats } from "@shared/profile/PlayerStats";

// The next-move card has its own tests; here it is only a marker for where it sits.
vi.mock("../NextMoveCard", () => ({ NextMoveCard: () => <div data-testid="next-move-card" /> }));

type Resources = ProfileFamilyOutletContext["resources"];

const game = (name: GameStats["game"], matchesPlayed: number, wins: number): GameStats => ({
  game: name,
  matchesPlayed,
  wins,
  losses: matchesPlayed - wins,
  draws: 0,
  winRate: matchesPlayed ? (wins / matchesPlayed) * 100 : 0,
  averageMatchDurationMinutes: 6,
  totalPlayTimeMinutes: matchesPlayed * 6,
});

// Most matches first, as the page hands them over.
const MASTERY: GameStats[] = [game("rummy", 35, 6), game("rps", 10, 0), game("bingo", 10, 2), game("uno", 8, 3), game("vamanaguntalu", 5, 0)];

const STATS: PlayerStats = { ...INITIAL_PLAYER_STATS("player_1"), totalMatches: 68, wins: 11, losses: 57, winRate: 16.2, bestWinStreak: 7 };

const NOW = new Date(2026, 10, 26, 12, 0).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const RECENT: RecentMatchItem[] = [
  { id: "m1", game: "rummy", result: "won", playedAt: NOW - HOUR },
  { id: "m2", game: "bingo", result: "draw", playedAt: NOW - DAY },
  { id: "m3", game: "uno", result: "lost", playedAt: NOW - 3 * DAY },
  { id: "m4", game: "rps", result: "won", playedAt: NOW - 4 * DAY },
  { id: "m5", game: "rummy", result: "lost", playedAt: NOW - 5 * DAY },
];

const catalog = (unlockedCount: number): Achievement[] =>
  ACHIEVEMENT_CATALOG.slice(0, 4).map((a, i) => ({ ...a, unlocked: i < unlockedCount, currentProgress: 0, progressPercent: 0 }));

const PROFILE = { playerId: "player_1", displayName: "Kethan", joinedAt: 1_700_000_000_000, lastSeenAt: 1_700_000_100_000, level: 16, experiencePoints: 1585 };

function resources(overrides: Partial<Resources> = {}): Resources {
  return {
    profile: { status: "ready", data: PROFILE },
    stats: { status: "ready", data: STATS },
    achievements: { status: "ready", data: catalog(2) },
    recentMatches: { status: "ready", data: RECENT },
    ...overrides,
  };
}

function renderPhone(overrides: Partial<ProfileOverviewPhoneProps> = {}) {
  const props: ProfileOverviewPhoneProps = {
    experiencePoints: 1585,
    playerId: "player_1",
    stats: STATS,
    statsReady: true,
    achievements: catalog(2),
    achievementsReady: true,
    mastery: MASTERY,
    recentMatches: RECENT,
    resources: resources(),
    onRetry: vi.fn(),
    onPlay: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <ProfileOverviewPhone {...props} />
    </MemoryRouter>,
  );
  return props;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ProfileOverviewPhone", () => {
  it("answers the questions in order: next move, then numbers, then mastery, then recent activity", () => {
    renderPhone();
    const order = [
      screen.getByTestId("next-move-card"),
      screen.getByRole("region", { name: "Career metrics" }),
      screen.getByRole("region", { name: "Game mastery" }),
      screen.getByRole("region", { name: "Recent activity" }),
    ];

    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  describe("career metrics", () => {
    it("shows the four real numbers in a 2x2 grid, each with a text label", () => {
      renderPhone();

      expect(screen.getByRole("group", { name: "Matches played" }).textContent).toContain("68");
      const winRate = screen.getByRole("group", { name: "Win rate" }).textContent;
      expect(winRate).toContain("16%");
      expect(winRate).toContain("11 wins");
      const achievements = screen.getByRole("group", { name: "Achievements" }).textContent;
      expect(achievements).toContain("2 / 4");
      expect(achievements).toContain("50% complete");
      expect(screen.getByRole("group", { name: "Best streak" }).textContent).toContain("7");
      expect(screen.getByRole("region", { name: "Career metrics" }).className).toContain("grid-cols-2");
    });

    it("shows honest zeroes for a player with no matches, not blanks", () => {
      const empty = INITIAL_PLAYER_STATS("player_1");
      renderPhone({
        stats: empty,
        mastery: [],
        recentMatches: [],
        achievements: catalog(0),
        resources: resources({ stats: { status: "ready", data: empty }, recentMatches: { status: "ready", data: [] } }),
      });

      expect(screen.getByRole("group", { name: "Matches played" }).textContent).toContain("0");
      const winRate = screen.getByRole("group", { name: "Win rate" }).textContent;
      expect(winRate).toContain("0%");
      expect(winRate).toContain("0 wins");
      expect(screen.getByRole("group", { name: "Achievements" }).textContent).toContain("0 / 4");
    });

    it("says one win, not '1 wins'", () => {
      const oneWin = { ...STATS, wins: 1 };
      renderPhone({ stats: oneWin, resources: resources({ stats: { status: "ready", data: oneWin } }) });

      const winRate = screen.getByRole("group", { name: "Win rate" }).textContent;
      expect(winRate).toContain("1 win");
      expect(winRate).not.toContain("1 wins");
    });

    it("does not pretend the achievement count is zero while it is unavailable", () => {
      renderPhone({
        achievements: [],
        achievementsReady: false,
        resources: resources({ achievements: { status: "error", data: null, message: "Vault offline" } }),
      });

      const tile = screen.getByRole("group", { name: "Achievements" }).textContent;
      expect(tile).toContain("—");
      expect(tile).toContain("Unavailable");
    });

    it("shows a placeholder while stats load", () => {
      renderPhone({ stats: null, statsReady: false, resources: resources({ stats: { status: "loading", data: null } }) });

      expect(screen.queryByRole("group", { name: "Matches played" })).toBeNull();
      expect(screen.getAllByLabelText("Loading profile content").length).toBeGreaterThan(0);
    });

    it("does not show demo stats as a verified career", () => {
      const demo = { ...STATS, demo: true };
      renderPhone({ stats: demo, statsReady: false, resources: resources({ stats: { status: "ready", data: demo } }) });

      expect(screen.queryByRole("group", { name: "Matches played" })).toBeNull();
      expect(screen.getByText("Career metrics unavailable")).toBeDefined();
    });

    it("offers a retry when stats fail to load", () => {
      const props = renderPhone({ stats: null, statsReady: false, resources: resources({ stats: { status: "error", data: null, message: "Stats offline" } }) });

      expect(screen.getByText("Career metrics unavailable")).toBeDefined();
      expect(screen.getByText("Mastery unavailable")).toBeDefined();
      fireEvent.click(screen.getAllByRole("button", { name: "Try again" })[0]);
      expect(props.onRetry).toHaveBeenCalled();
    });
  });

  describe("game mastery preview", () => {
    it("shows the top three in the order given, not all five", () => {
      renderPhone();
      const section = screen.getByRole("region", { name: "Game mastery" });
      const rows = within(section).getAllByRole("listitem");

      expect(rows).toHaveLength(3);
      expect(rows[0].textContent).toContain("Indian Rummy");
      expect(rows[0].textContent).toContain("35 matches · 6 wins");
      expect(rows[0].textContent).toContain("17%");
      expect(rows[1].textContent).toContain("Rock Paper Scissors");
      expect(rows[2].textContent).toContain("Bingo");
      expect(within(section).queryByText(/Color Cards/)).toBeNull();
      expect(within(section).queryByText(/Vamana Guntalu/)).toBeNull();
    });

    it("gives every bar a name and a value for assistive tech, including a zero win rate", () => {
      renderPhone();
      const bars = within(screen.getByRole("region", { name: "Game mastery" })).getAllByRole("progressbar");

      expect(bars).toHaveLength(3);
      expect(bars[0].getAttribute("aria-label")).toBe("Indian Rummy win rate");
      expect(bars[1].getAttribute("aria-label")).toBe("Rock Paper Scissors win rate");
      expect(bars[1].getAttribute("aria-valuenow")).toBe("0");
    });

    it("pluralises correctly for a single match", () => {
      renderPhone({ mastery: [game("rummy", 1, 1)] });

      expect(screen.getByText("1 match · 1 win")).toBeDefined();
    });

    it("links 'View all' to the full record and keeps the deep-link id", () => {
      renderPhone();
      const section = screen.getByRole("region", { name: "Game mastery" });

      expect(section.id).toBe("mastery");
      expect(within(section).getByRole("link", { name: "View all game mastery" }).getAttribute("href")).toBe("/myrecords");
    });

    it("shows an intentional empty state that leads to a game", () => {
      const props = renderPhone({ mastery: [] });

      expect(screen.getByText("No mastery data yet")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /Explore games/ }));
      expect(props.onPlay).toHaveBeenCalledOnce();
    });
  });

  describe("recent activity preview", () => {
    it("shows the three latest with a plain day and a worded result", () => {
      renderPhone();
      const section = screen.getByRole("region", { name: "Recent activity" });
      const rows = within(section).getAllByRole("listitem");

      expect(rows).toHaveLength(3);
      expect(rows[0].textContent).toContain("Indian Rummy");
      expect(rows[0].textContent).toContain("Today");
      expect(rows[0].textContent).toContain("Won");
      expect(rows[1].textContent).toContain("Yesterday");
      expect(rows[1].textContent).toContain("Draw");
      expect(rows[2].textContent).toContain("3 days ago");
      expect(rows[2].textContent).toContain("Lost");
    });

    it("links 'View all' to the full match history", () => {
      renderPhone();

      expect(screen.getByRole("link", { name: "View all recent activity" }).getAttribute("href")).toBe("/profile/matches");
    });

    it("shows an intentional empty state when there is no activity, without inventing any", () => {
      const props = renderPhone({ recentMatches: [], resources: resources({ recentMatches: { status: "ready", data: [] } }) });

      expect(screen.getByText("Your battle log is ready")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /Play a game/ }));
      expect(props.onPlay).toHaveBeenCalledOnce();
    });

    it("reports a failure to load instead of an empty list", () => {
      renderPhone({
        recentMatches: [],
        resources: resources({ recentMatches: { status: "error", data: null, message: "Recent matches are unavailable right now." } }),
      });

      expect(screen.getByText("Recent activity unavailable")).toBeDefined();
      expect(screen.queryByText("Your battle log is ready")).toBeNull();
    });
  });
});
