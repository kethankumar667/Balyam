import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";
import ScorecardDashboard from "../ScorecardDashboard";
import { RecentBattles } from "../ScorecardDashboardPanels";
import { milestoneUnit, scorecardArt, scorecardBest, scorecardContextLabel, scorecardCoverage, scorecardModes } from "../scorecardDashboardModel";
import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes";
import { buildRecords } from "../../../features/myrecords/records";

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

  it("shows the dossier in plain words and the share card without internal ids", () => {
    const base = dashboardArchive.games.handcricket!.modes.international_t20;
    draw({ ...dashboardArchive, games: { handcricket: {
      ...dashboardArchive.games.handcricket!, modes: { international_t20: {
        ...base, bestContext: "VS_BOTS", secondaryMetrics: {},
      } },
    } } });
    fireEvent.click(screen.getByRole("button", { name: "View scorecard" }));
    const details = screen.getByRole("dialog", { name: "Hand Cricket scorecard" });
    expect(within(details).getByText("Vs bots")).toBeVisible();
    expect(details).not.toHaveTextContent(/VS BOTS|VS_BOTS/);
    expect(within(details).queryByText("-", { exact: true })).not.toBeInTheDocument();
    expect(within(details).getByText(/^\d+ of \d+ unlocked$/)).toBeVisible();
    expect(within(details).getByRole("progressbar", { name: "Next record milestone" })).toBeInTheDocument();
    expect(within(details).getByRole("link", { name: "Play again" })).toHaveAttribute("href", "/");
    fireEvent.click(within(details).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Share scorecard" }));
    const share = screen.getByRole("dialog", { name: "Challenge Your Friends" });
    expect(share).not.toHaveTextContent(/MATCH:|test-match/);
    expect(share).toHaveTextContent(/Record set/);
    expect(within(share).getByText(/^[SABC]-RANK$/)).toBeVisible();
    expect(within(share).getByRole("button", { name: "Share challenge" })).toBeVisible();
    expect(within(share).getByRole("button", { name: "WhatsApp" })).toBeVisible();
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

  it("shows imported Breakout bests without inventing match history or a performance grade", () => {
    draw({ ...dashboardArchive, deviceImports: { breakout: {
      neon_campaign: { score: 33600, importedAt: 1 },
      neon_score_attack: { score: 12500, importedAt: 1 },
      neon_daily: { score: 5100, importedAt: 1 },
    } } });
    fireEvent.click(screen.getByRole("button", { name: "Select game Brick Breakout" }));
    const card = screen.getByRole("region", { name: "Personal best" });
    expect(within(card).getByText("33,600", { selector: "strong" })).toBeVisible();
    expect(within(card).getByText("Imported from your device")).toBeVisible();
    expect(within(card).queryByText("Matches played")).not.toBeInTheDocument();
    expect(within(card).queryByText(/-RANK/)).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Share scorecard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Recent scores/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Neon Daily Challenge" })).toHaveTextContent("5,100");
    fireEvent.click(screen.getByRole("button", { name: "Select Classic Wall (Historical)" }));
    expect(screen.getByText("Your next record starts here")).toBeVisible();
  });

  it("shows local solo saves using the same source labels as My Records", () => {
    localStorage.setItem("bhalyam_brick_racer_v1", JSON.stringify({ highScore: 760 }));
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Select game Brick Racer" }));
    const card = screen.getByRole("region", { name: "Personal best" });
    expect(within(card).getByText("760", { selector: "strong" })).toBeVisible();
    expect(within(card).getByText("Saved on this device")).toBeVisible();
  });
});

describe("dashboard persistence and layout", () => {
  it.each(Object.values(GAME_MODE_REGISTRY).flatMap(config => config.modes.map(mode => ({ game: config.game, mode }))))(
    "counts imported $game/$mode.modeId in coverage without mutating recorded games", ({ game, mode }) => {
      const archive = { playerId: "test", games: {}, updatedAt: 1, totalPersonalBestsBeaten: 0,
        deviceImports: { [game]: { [mode.modeId]: { score: 100, importedAt: 1 } } } };
      expect(scorecardCoverage(archive).recorded).toBe(1);
      expect(scorecardBest(buildRecords(archive, false).find(item => item.id === game), mode.modeId))
        .toMatchObject({ score: 100, source: "imported", record: undefined });
      expect(archive.games).toEqual({});
    },
  );

  it("uses the registered comparison direction and keeps recorded statistics separate from a better import", () => {
    const saved = { ...dashboardArchive.games.handcricket!.modes.international_t20, modeId: "race", bestScore: 125, scoringDirection: "LOWER_IS_BETTER" as const };
    const archive = { ...dashboardArchive, games: { "2048": {
      game: "2048" as const, gameDisplayName: "2048", lastPlayedAt: 1, totalModesPlayed: 1, modes: { race: saved },
    } }, deviceImports: { "2048": { race: { score: 90, importedAt: 1 } } } };
    const game = buildRecords(archive, false).find(item => item.id === "2048");
    expect(scorecardBest(game, "race")).toMatchObject({ score: 90, source: "imported", record: { bestScore: 125, timesPlayed: 12 } });
    archive.deviceImports["2048"].race.score = 200;
    expect(scorecardBest(buildRecords(archive, false).find(item => item.id === "2048"), "race"))
      .toMatchObject({ score: 125, source: "recorded" });
  });

  it("preserves an unknown-rules device best without assigning it to a current mode", () => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", JSON.stringify({ highScore: 140 }));
    const game = buildRecords(null).find(item => item.id === "nokiacricket")!;
    expect(scorecardModes({ ...dashboardArchive, games: {} }, "nokiacricket", game))
      .toContainEqual(expect.objectContaining({ modeId: "device_previous_overall" }));
    expect(scorecardBest(game, "device_previous_overall")).toEqual({ score: 140, source: "device" });
    expect(game.modes.every(mode => scorecardBest(game, mode.modeId) === undefined)).toBe(true);
  });
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

describe("scorecard dossier wording", () => {
  it("names every match context and every mode unit in plain words", () => {
    expect(["SOLO", "VS_BOTS", "PVP_MULTIPLAYER", "PASS_AND_PLAY"].map(c => scorecardContextLabel(c as "SOLO")))
      .toEqual(["Solo", "Vs bots", "Online", "Pass & Play"]);
    const units = Object.values(GAME_MODE_REGISTRY).flatMap(config => config.modes.map(milestoneUnit));
    expect(units.every(unit => unit.length > 0 && !unit.includes(" to "))).toBe(true);
    const snl = GAME_MODE_REGISTRY.snl.modes.find(mode => mode.modeId === "medium")!;
    expect(milestoneUnit(snl)).toBe("rolls");
  });
});
