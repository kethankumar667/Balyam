import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";
import ScorecardDashboard from "../ScorecardDashboard";
import { SCORECARD_RANK_CLASSES } from "../scorecardTheme";

afterEach(() => { cleanup(); localStorage.clear(); });

const archive: PlayerScorecardArchive = {
  playerId: "theme-player", totalPersonalBestsBeaten: 8, updatedAt: 1700000000000,
  games: {
    handcricket: {
      game: "handcricket", gameDisplayName: "Hand Cricket", lastPlayedAt: 1700000000000, totalModesPlayed: 1,
      modes: {
        international_t20: {
          modeId: "international_t20", modeDisplayName: "International T20 (10 Overs)", bestScore: 140,
          bestScoreAchievedAt: 1700000000000, bestScoreMatchId: "theme-match-12345",
          scoringDirection: "HIGHER_IS_BETTER", timesPlayed: 3, totalScoreAccumulated: 330, averageScore: 110,
          recentScores: [140, 100, 90], bestContext: "VS_BOTS", secondaryMetrics: {},
          radar: { velocity: 70, clutch: 60, efficiency: 80, consistency: 50, aggression: 90 }, foilTier: "prismatic_holo",
        },
      },
    },
  },
};

function expectThemedSurfaces(root: HTMLElement) {
  const darkOnly = [...root.querySelectorAll<HTMLElement>("[class]")].filter(node =>
    [...node.classList].some(token => /^(bg-slate-(?:800|900|950)|text-slate-[2345]00)(\/|$)/.test(token)),
  );
  expect(darkOnly.map(node => node.className)).toEqual([]);
}

describe.each(["desktop", "mobile"] as const)("scorecard %s theme", layout => {
  it.each([
    [140, "S_RANK"], [60, "A_RANK"], [30, "B_RANK"], [10, "C_RANK"],
  ] as const)("keeps the %s-run grade theme-aware", (bestScore, tier) => {
    const game = archive.games.handcricket!;
    const rankedArchive = {
      ...archive, games: { handcricket: { ...game, modes: {
        international_t20: { ...game.modes.international_t20, bestScore },
      } } },
    };
    render(<MemoryRouter><ScorecardDashboard layout={layout} archive={rankedArchive} playerName="Player" /></MemoryRouter>);
    expect(screen.getByText(`${tier[0]}-RANK`).parentElement).toHaveClass(...SCORECARD_RANK_CLASSES[tier].split(" "));
  });

  it("themes the empty state and keeps every launch link", () => {
    const { container } = render(<MemoryRouter><ScorecardDashboard layout={layout} archive={{ ...archive, games: {} }} playerName="Player" /></MemoryRouter>);
    expectThemedSurfaces(container);
    expect(screen.getByRole("link", { name: "Launch Hand Cricket" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { name: "Record intelligence" })).toHaveClass("text-score-ink");
  });

  it("themes populated records, radar, dossier and sharing", () => {
    const { container } = render(<MemoryRouter><ScorecardDashboard layout={layout} archive={archive} playerName="Player" /></MemoryRouter>);
    expectThemedSurfaces(container);
    expect(container.querySelector("svg text")).toHaveClass("fill-cyan-800", "dark:fill-cyan-400");
    fireEvent.click(screen.getByRole("button", { name: "View scorecard" }));
    expect(screen.getByRole("dialog", { name: "Hand Cricket scorecard" })).toHaveClass("chrono-scorecards", "bg-score-panel");
    fireEvent.click(screen.getByRole("button", { name: "Close scorecard" }));
    fireEvent.click(screen.getByRole("button", { name: "Share scorecard" }));
    expect(screen.getByRole("heading", { name: "Challenge Your Friends" })).toHaveClass("text-ink-hi");
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveClass("z-10");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  });
});
