import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";
import ScorecardDashboard from "../ScorecardDashboard";
import { RecentBattles } from "../ScorecardDashboardPanels";
import { scorecardArt, scorecardCoverage, scorecardModes } from "../scorecardDashboardModel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); vi.restoreAllMocks(); });

export const dashboardArchive: PlayerScorecardArchive = {
  playerId: "scorecard-player", totalPersonalBestsBeaten: 8, updatedAt: 1700000000000,
  games: {
    handcricket: {
      game: "handcricket", gameDisplayName: "Hand Cricket", lastPlayedAt: 1700000000000, totalModesPlayed: 1,
      modes: {
        international_t20: {
          modeId: "international_t20", modeDisplayName: "International T20 (10 Overs)",
          bestScore: 184, bestScoreAchievedAt: 1700000000000, bestScoreMatchId: "test-match",
          scoringDirection: "HIGHER_IS_BETTER", timesPlayed: 12, totalScoreAccumulated: 1776,
          averageScore: 148, recentScores: [184, 156, 148, 120, 136], bestContext: "PVP_MULTIPLAYER",
          secondaryMetrics: { sixes: 12 },
          radar: { velocity: 70, clutch: 80, efficiency: 90, consistency: 72, aggression: 60 },
          foilTier: "prismatic_holo",
        },
      },
    },
  },
};

describe.each(["mobile", "desktop"] as const)("scorecards %s dashboard", layout => {
  function draw(archive = dashboardArchive) {
    return render(<MemoryRouter><ScorecardDashboard layout={layout} archive={archive} playerName="Kethan"
      recentMatches={[{ id: "battle-1", game: "handcricket", result: "won", playedAt: 1700000000000 }]}
      recentMatchesStatus="ready" /></MemoryRouter>);
  }

  it("renders the reference dashboard using real record data and an honest five-score history", () => {
    draw();
    for (const name of ["Game navigator", "Select mode", "Personal best", "Record intelligence", "Performance history", "Recent battles"]) {
      expect(screen.getByRole("heading", { name })).toBeVisible();
    }
    const card = screen.getByRole("region", { name: "Personal best" });
    expect(within(card).getByText("184")).toBeVisible();
    expect(within(card).getByText("12")).toBeVisible();
    expect(within(card).getByRole("link", { name: "Play again" })).toHaveAttribute("href", "/");
    const graph = screen.getByRole("img", { name: /Recent scores.*oldest to newest/ });
    expect(graph.querySelectorAll("circle[data-score]")).toHaveLength(5);
    expect([...graph.querySelectorAll("circle[data-score]")].map(e => e.getAttribute("data-score"))).toEqual(["136", "120", "148", "156", "184"]);
    expect(screen.getByText("Latest 5 saved scores")).toBeVisible();
    expect(screen.queryByText("Last 30")).not.toBeInTheDocument();
    expect(screen.queryByText("Previous best")).not.toBeInTheDocument();
    expect(screen.queryByText("New best", { exact: true })).not.toBeInTheDocument();
    const battles = screen.getByRole("region", { name: "Recent battles" });
    expect(within(battles).getByText("Victory")).toBeVisible();
    expect(within(battles).queryByText(/XP|184/)).not.toBeInTheDocument();
  });

  it("supports search, categories, pins, real mode families and empty modes", () => {
    draw();
    const original = JSON.stringify(dashboardArchive);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search games" }), { target: { value: "nothing matches" } });
    expect(screen.getByText("No games match your search.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Unpin Hand Cricket" }));
    expect(JSON.parse(localStorage.getItem("bhalyam.scorecards.pinned")!)).not.toContain("handcricket");
    fireEvent.click(screen.getByRole("button", { name: "Franchise" }));
    expect(screen.queryByRole("button", { name: /Select International T20/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Select Franchise ODI/ }));
    expect(screen.getByText("Your next record starts here")).toBeVisible();
    expect(screen.getByRole("link", { name: "Launch Hand Cricket" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(screen.queryByRole("button", { name: "Select game Hand Cricket" })).not.toBeInTheDocument();
    expect(JSON.stringify(dashboardArchive)).toBe(original);
  });

  it("keeps scorecard details and sharing reachable and keyboard-dismissible", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "View scorecard" }));
    const details = screen.getByRole("dialog", { name: "Hand Cricket scorecard" });
    expect(within(details).getByText("Signature feats")).toBeVisible();
    expect(within(details).getAllByText("Century Legend").length).toBeGreaterThan(0);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Share scorecard" }));
    const share = screen.getByRole("dialog", { name: "Challenge Your Friends" });
    expect(share).toBeVisible();
    expect(share).not.toHaveTextContent(/ghost|VERIFIED RECORD|HASH:|SCAN TO CHALLENGE/);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  });

  it("handles zero scores, singleton charts and lower-is-better records without invented comparisons", () => {
    const base = dashboardArchive.games.handcricket!.modes.international_t20;
    draw({ ...dashboardArchive, games: { handcricket: {
      ...dashboardArchive.games.handcricket!, modes: { international_t20: {
        ...base, bestScore: 0, recentScores: [0], averageScore: 0, scoringDirection: "LOWER_IS_BETTER",
      } },
    } } });
    const card = screen.getByRole("region", { name: "Personal best" });
    expect(within(card).getByText("0", { selector: "strong" })).toBeVisible();
    expect(screen.getByText("Lower is better")).toBeVisible();
    expect(screen.getByRole("img", { name: /Recent scores/ }).querySelectorAll("circle[data-score]")).toHaveLength(1);
    expect(screen.getByText("One score saved. Play again to build a trend.")).toBeVisible();
  });
});

describe("dashboard persistence and layout", () => {
  it("keeps historical records available without counting them as current-mode coverage", () => {
    const base = dashboardArchive.games.handcricket!;
    const historical = { ...base.modes.international_t20, modeId: "t20", modeDisplayName: "Legacy T20" };
    const archive = { ...dashboardArchive, games: { handcricket: { ...base, modes: { ...base.modes, t20: historical } } } };
    expect(scorecardModes(archive, "handcricket").find(mode => mode.modeId === "t20")?.displayName).toBe("Legacy T20");
    expect(scorecardCoverage(archive).recorded).toBe(1);
    expect(scorecardCoverage(null).recorded).toBe(0);
    expect(scorecardArt("nokiasnake")).toBe(scorecardArt("snake"));
    expect(scorecardArt("blockblast")).toBe(scorecardArt("brickblocks"));
    expect(scorecardArt("unknown")).toBeUndefined();
  });

  it("reports a pin write failure while keeping the selection and visit-local pin", () => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("Storage unavailable"); } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<MemoryRouter><ScorecardDashboard layout="mobile" archive={dashboardArchive} playerName="Kethan" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Unpin Hand Cricket" }));
    expect(screen.getByRole("status")).toHaveTextContent("could not be saved on this device");
    expect(screen.getByRole("button", { name: "Pin Hand Cricket" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Select game Hand Cricket" })).toHaveAttribute("aria-pressed", "true");
  });

  it("surfaces clipboard failures instead of pretending the share succeeded", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<MemoryRouter><ScorecardDashboard layout="mobile" archive={dashboardArchive} playerName="Kethan" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Share scorecard" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be copied");
    expect(screen.getByRole("textbox", { name: "Scorecard share link" }).getAttribute("value")).toContain("/games?challengeMode=international_t20");
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("gives recent battles independent loading, error/retry and empty states", () => {
    const onRetry = vi.fn();
    const props = { matches: [], playerName: "Kethan", playerId: "scorecard-player", onRetry };
    const { rerender } = render(<MemoryRouter><RecentBattles {...props} status="loading" /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading recent battles");
    rerender(<MemoryRouter><RecentBattles {...props} status="error" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Retry battles" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<MemoryRouter><RecentBattles {...props} status="ready" /></MemoryRouter>);
    expect(screen.getByText("No battles recorded yet.")).toBeVisible();
  });

  it("keeps selection when changing layout and handles malformed saved pins explicitly", () => {
    localStorage.setItem("bhalyam.scorecards.pinned", "{}");
    const { rerender } = render(<MemoryRouter><ScorecardDashboard layout="mobile" archive={dashboardArchive} playerName="Kethan" /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Saved pins could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Select game Ludo" }));
    rerender(<MemoryRouter><ScorecardDashboard layout="desktop" archive={dashboardArchive} playerName="Kethan" /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Select game Ludo" })).toHaveAttribute("aria-pressed", "true");
  });
});
