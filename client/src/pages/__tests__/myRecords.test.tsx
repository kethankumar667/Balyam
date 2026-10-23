import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MyRecordsPage from "../MyRecordsPage";
import { useScorecardStore } from "../../store/scorecardStore";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";

vi.mock("../../components/layout/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("../../lib/playerIdentity", () => ({ usePlayerId: () => ({ playerId: null }) }));

const archive: PlayerScorecardArchive = {
  playerId: "record-test", totalPersonalBestsBeaten: 2, updatedAt: 1728691200000,
  games: {
    handcricket: {
      game: "handcricket", gameDisplayName: "Hand Cricket", lastPlayedAt: 1728691200000, totalModesPlayed: 1,
      modes: {
        t20: {
          modeId: "t20", modeDisplayName: "T20 Match", bestScore: 184, bestScoreAchievedAt: 1728691200000,
          bestScoreMatchId: "match-1", scoringDirection: "HIGHER_IS_BETTER", timesPlayed: 5,
          totalScoreAccumulated: 500, averageScore: 100, recentScores: [184, 164, 156, 142, 120],
          bestContext: "SOLO", secondaryMetrics: {}, foilTier: "neon_cyan",
          radar: { velocity: 0, clutch: 0, efficiency: 0, consistency: 0, aggression: 0 },
        },
      },
    },
  },
};

function show() { return render(<MemoryRouter><MyRecordsPage /></MemoryRouter>); }

beforeEach(() => {
  localStorage.clear();
  useScorecardStore.setState({ archive: null, loading: false, error: null });
});

describe("My Records", () => {
  it("registers only the new public route", () => {
    const app = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../App.tsx"), "utf8");
    expect(app).toContain('path="/myrecords"');
    expect(app).not.toContain('path="/leaderboard"');
  });

  it("shows an honest empty record, mode cards and play action", () => {
    show();
    expect(screen.getByRole("heading", { name: "My Records" })).toBeDefined();
    expect(screen.getByText("No score yet")).toBeDefined();
    expect(screen.getByRole("link", { name: /Play.*record/i })).toBeDefined();
    expect(screen.queryByText(/New Best|Previous best:/i)).toBeNull();
  });

  it("uses recorded totals and renders the last five results chronologically", () => {
    useScorecardStore.setState({ archive });
    show();
    expect(screen.getByRole("heading", { name: /Performance history/i })).toBeDefined();
    const chart = screen.getByRole("img", { name: /last 5 recorded results/i });
    expect(chart.textContent).toMatch(/120.*142.*156.*164.*184/);
    expect(screen.getAllByText(/184/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("184 runs").length).toBeGreaterThan(0);
    expect(screen.queryByText(/runs runs/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Last 30 days/i })).toBeNull();
  });

  it("searches games, clears an empty search and switches modes accessibly", () => {
    show();
    fireEvent.change(screen.getByRole("textbox", { name: "Search games by name" }), { target: { value: "not a game" } });
    expect(screen.getByText("No games found")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Clear Search" }));
    fireEvent.click(screen.getByRole("button", { name: "Filter by Ludo game" }));
    expect(screen.getByRole("button", { name: "Filter by Ludo game" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("does not manufacture a date or match count for a device-only best", () => {
    localStorage.setItem("bhalyam_retro_snake_v1", JSON.stringify({ modeBestScores: { classic_walled: 42 } }));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Filter by Retro Snake game" }));
    expect(screen.getAllByText(/Date not recorded/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Saved on this device/i).length).toBeGreaterThan(0);
  });
});
