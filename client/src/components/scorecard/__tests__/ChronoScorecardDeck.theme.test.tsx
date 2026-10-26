import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";
import { getGameModeConfig } from "@shared/profile/GameModes";
import ChronoScorecardDeckDesktop from "../ChronoScorecardDeckDesktop";
import ChronoScorecardDeckMobile from "../ChronoScorecardDeckMobile";
import { SCORECARD_RANK_CLASSES } from "../scorecardTheme";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const config = getGameModeConfig("handcricket");
const mode = config.modes.find(mode => mode.modeId === config.defaultModeId)!;
const archive: PlayerScorecardArchive = {
  playerId: "theme-player", totalPersonalBestsBeaten: 8, updatedAt: 1700000000000,
  games: {
    handcricket: {
      game: "handcricket", gameDisplayName: "Hand Cricket", lastPlayedAt: 1700000000000, totalModesPlayed: 1,
      modes: {
        [mode.modeId]: {
          modeId: mode.modeId, modeDisplayName: mode.displayName, bestScore: 140,
          bestScoreAchievedAt: 1700000000000, bestScoreMatchId: "theme-match-12345",
          scoringDirection: mode.scoringDirection, timesPlayed: 3, totalScoreAccumulated: 330, averageScore: 110,
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

describe.each([
  ["desktop", ChronoScorecardDeckDesktop],
  ["mobile", ChronoScorecardDeckMobile],
] as const)("scorecard %s theme", (layout, Deck) => {
  it.each([
    [140, "S_RANK"], [60, "A_RANK"], [30, "B_RANK"], [10, "C_RANK"],
  ] as const)("keeps the %s-run grade theme-aware", (bestScore, tier) => {
    const game = archive.games.handcricket!;
    const rankedArchive = {
      ...archive, games: { handcricket: { ...game, modes: {
        [mode.modeId]: { ...game.modes[mode.modeId], bestScore },
      } } },
    };
    render(<MemoryRouter><Deck archive={rankedArchive} playerName="Player" /></MemoryRouter>);
    const badge = screen.getByText(`${tier[0]}-RANK`).parentElement!;
    expect(badge).toHaveClass(...SCORECARD_RANK_CLASSES[tier].split(" "));
  });

  it("themes the empty state without changing launch links or game search", () => {
    const { container } = render(<MemoryRouter><Deck archive={{ ...archive, games: {} }} playerName="Player" /></MemoryRouter>);
    expectThemedSurfaces(container);
    expect(screen.getByRole("link", { name: "Launch Hand Cricket" })).toHaveAttribute("href");
    expect(screen.getByRole("button", { name: "Unpin Indian Rummy" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search games..."), { target: { value: "nonexistent game" } });
    expect(screen.queryByRole("button", { name: "Unpin Indian Rummy" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search games..."), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(screen.getByRole("button", { name: /^Ludo/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unpin Hand Cricket" })).not.toBeInTheDocument();
  });

  it("themes records, rank badges, dossier, radar and sharing", () => {
    const originalArchive = JSON.stringify(archive);
    const { container } = render(<MemoryRouter><Deck archive={archive} playerName="Player" /></MemoryRouter>);
    expectThemedSurfaces(container);
    if (layout === "mobile") fireEvent.click(screen.getByRole("button", { name: "Inspect Quantum Radar" }));
    const radar = container.querySelector("svg text");
    expect(radar).toHaveClass("fill-cyan-800", "dark:fill-cyan-400");
    fireEvent.click(screen.getByRole("button", { name: layout === "mobile" ? "Inspect match dossier" : "Dossier" }));
    expect(screen.getByText(/Signature Feat/)).toBeVisible();
    expectThemedSurfaces(container);
    fireEvent.click(screen.getByRole("button", { name: layout === "mobile" ? "Card" : "Back to Card" }));
    fireEvent.click(screen.getByRole("button", { name: layout === "mobile" ? "Share holographic scorecard" : "Holo-Pass" }));
    expect(screen.getByRole("dialog", { name: "Challenge Your Friends" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Challenge Your Friends" })).toHaveClass("text-ink-hi");
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveClass("z-10");
    expect(screen.getByRole("heading", { name: "Challenge Your Friends" }).parentElement).toHaveClass("pt-16", "overflow-y-auto");
    expectThemedSurfaces(container);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unpin Hand Cricket" }));
    expect(screen.getByRole("button", { name: "Pin Hand Cricket" })).toBeInTheDocument();
    const otherMode = config.modes.find(other => other.modeId !== mode.modeId)!;
    fireEvent.click(screen.getByRole("button", { name: otherMode.displayName }));
    expect(screen.getByRole("link", { name: "Launch Hand Cricket" })).toBeInTheDocument();
    expect(JSON.stringify(archive)).toBe(originalArchive);
  });
});
