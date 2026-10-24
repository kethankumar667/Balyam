import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MyRecordsPage from "../MyRecordsPage";
import { useScorecardStore } from "../../store/scorecardStore";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";

vi.mock("../../components/layout/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const identity = vi.hoisted(() => ({ playerId: null as string | null, kind: null as "member" | "guest" | null }));
vi.mock("../../lib/playerIdentity", () => ({ usePlayerId: () => identity }));
const importDeviceBests = vi.hoisted(() => vi.fn());
vi.mock("../../features/myrecords/deviceRecords", async (original) => ({
  ...(await original<typeof import("../../features/myrecords/deviceRecords")>()),
  importDeviceBests,
}));

const archive: PlayerScorecardArchive = {
  playerId: "record-test", totalPersonalBestsBeaten: 2, updatedAt: 1728691200000,
  games: {
    handcricket: {
      game: "handcricket", gameDisplayName: "Hand Cricket", lastPlayedAt: 1728691200000, totalModesPlayed: 1,
      modes: {
        international_t20: {
          modeId: "international_t20", modeDisplayName: "International T20", bestScore: 184, bestScoreAchievedAt: 1728691200000,
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
  identity.playerId = null;
  identity.kind = null;
  importDeviceBests.mockReset();
  useScorecardStore.setState({ archive: null, localArchive: null, loading: false, error: null, pendingScoreCount: 0 });
});

describe("My Records — keeping records from being lost", () => {
  const CRICKET = "bhalyam_nokia_cricket_data_v1";
  const empty: PlayerScorecardArchive = { playerId: "record-test", games: {}, totalPersonalBestsBeaten: 0, updatedAt: 1 };
  const asMember = (fetchScorecards = vi.fn().mockResolvedValue(undefined)) => {
    identity.playerId = "record-test";
    identity.kind = "member";
    useScorecardStore.setState({ archive: empty, fetchScorecards });
    return fetchScorecards;
  };

  it("offers a signed-in member the bests that exist only on this device, and adds them on request", async () => {
    localStorage.setItem(CRICKET, JSON.stringify({ modeBestScores: { classic_5: 96, chase_2: 25 } }));
    importDeviceBests.mockResolvedValue({ accepted: 2, skipped: 0 });
    const fetchScorecards = asMember();
    show();

    expect(screen.getByText(/2 bests are only on this device/i)).toBeDefined();
    fetchScorecards.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Add to my account" }));

    expect(importDeviceBests).toHaveBeenCalledWith("record-test", expect.arrayContaining([
      { game: "nokiacricket", modeId: "classic_5", score: 96 },
      { game: "nokiacricket", modeId: "chase_2", score: 25 },
    ]));
    expect(await screen.findByText(/Added 2 bests to your account/i)).toBeDefined();
    expect(fetchScorecards).toHaveBeenCalledWith("record-test");
  });

  it("says plainly when adding fails, and keeps the offer", async () => {
    localStorage.setItem(CRICKET, JSON.stringify({ modeBestScores: { classic_5: 96 } }));
    importDeviceBests.mockRejectedValue(new Error("We could not reach the server."));
    asMember();
    show();

    fireEvent.click(screen.getByRole("button", { name: "Add to my account" }));

    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server.");
    expect(screen.getByRole("button", { name: "Add to my account" })).toBeDefined();
  });

  it("does not make the offer to a guest, or when the device holds nothing the account lacks", () => {
    localStorage.setItem(CRICKET, JSON.stringify({ modeBestScores: { classic_5: 96 } }));
    asMember();
    identity.kind = "guest";
    const guest = show();
    expect(screen.queryByRole("button", { name: "Add to my account" })).toBeNull();
    guest.unmount();

    localStorage.clear();
    identity.kind = "member";
    show();
    expect(screen.queryByRole("button", { name: "Add to my account" })).toBeNull();
  });

  it("tells the player when finished scores are still waiting to reach the account, and retries on request", () => {
    const fetchScorecards = asMember();
    useScorecardStore.setState({ pendingScoreCount: 2 });
    show();

    expect(screen.getByText(/2 results are waiting to reach your account/i)).toBeDefined();
    fetchScorecards.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Try sending now" }));
    expect(fetchScorecards).toHaveBeenCalledWith("record-test");
  });

  it("labels a best brought from a device as imported, not as recorded or as device-only", () => {
    asMember();
    useScorecardStore.setState({ archive: { ...empty, deviceImports: { nokiacricket: { classic_5: { score: 96, importedAt: 5 } } } } });
    show();

    fireEvent.click(screen.getByRole("button", { name: "Filter by Retro Cricket game" }));

    expect(screen.getByText("Imported from your device · Date not recorded")).toBeDefined();
    expect(screen.queryByText("Saved on this device · Date not recorded")).toBeNull();
  });
});

describe("My Records", () => {
  it("labels an older cache snapshot as local instead of pretending it was account-synced", () => {
    identity.playerId = "record-test";
    const original = useScorecardStore.getState().fetchScorecards;
    useScorecardStore.setState({
      archive: { ...archive, games: {} }, localArchive: archive, fetchScorecards: vi.fn().mockResolvedValue(undefined),
    });
    const view = show();
    try {
      const previous = screen.getByRole("region", { name: "Previously recorded modes" });
      expect(within(previous).getByText("Stored score: 184")).toBeDefined();
      expect(within(previous).getByText("Saved on this device · Account sync not verified")).toBeDefined();
      expect(screen.getByText("No score yet")).toBeDefined();
    } finally {
      view.unmount();
      useScorecardStore.setState({ fetchScorecards: original });
    }
  });

  it("refreshes the same account explicitly and when the page regains focus", () => {
    identity.playerId = "record-test";
    const fetchScorecards = vi.fn().mockResolvedValue(undefined);
    const original = useScorecardStore.getState().fetchScorecards;
    useScorecardStore.setState({ archive, fetchScorecards });
    const view = show();
    expect(fetchScorecards).toHaveBeenCalledWith("record-test");
    fetchScorecards.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Refresh account records" }));
    expect(fetchScorecards).toHaveBeenCalledOnce();
    fireEvent.focus(window);
    expect(fetchScorecards).toHaveBeenCalledTimes(2);
    view.unmount();
    fireEvent.focus(window);
    expect(fetchScorecards).toHaveBeenCalledTimes(2);
    useScorecardStore.setState({ fetchScorecards: original });
  });

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

  it("shows older Retro Cricket records separately and preserves them across mode changes", () => {
    const saved = JSON.stringify({ highScore: 200, modeBestScores: { classic_10: 140 } });
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", saved);
    show();
    fireEvent.click(screen.getByRole("button", { name: "Filter by Retro Cricket game" }));
    const previous = screen.getByRole("region", { name: "Previous overall best — mode not recorded" });
    expect(within(previous).getByText("200 runs")).toBeDefined();
    expect(within(previous).getByText(/date not recorded/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Classic.*10.*140 runs/i })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Classic.*1 Over.*Best:/i }));
    expect(within(previous).getByText("200 runs")).toBeDefined();
    expect(screen.getByText("No score yet")).toBeDefined();
    expect(localStorage.getItem("bhalyam_nokia_cricket_data_v1")).toBe(saved);
  });

  it.each([
    ["Retro Snake", "bhalyam_retro_snake_v1", '{"highScore":95}', "95 🍎"],
    ["Snake 2D", "mpg.snake.best", "75", "75 🍎"],
    ["Block Puzzle", "bb.best", "800", "800 pts"],
  ])("shows saved %s records even when account scorecards fail", (label, key, raw, score) => {
    localStorage.setItem(key, raw);
    useScorecardStore.setState({ archive: null, loading: false, error: "Offline" });
    show();
    expect(screen.getByRole("alert").textContent).toContain("Offline");
    fireEvent.click(screen.getByRole("button", { name: `Filter by ${label} game` }));
    expect(screen.getAllByText(score).length).toBeGreaterThan(0);
    expect(screen.queryByText(/older Retro Cricket save/)).toBeNull();
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it("does not hide device records while account records are loading", () => {
    localStorage.setItem("bb.best", "800");
    useScorecardStore.setState({ loading: true });
    show();
    expect(screen.getByRole("button", { name: "Filter by Block Puzzle game" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("Loading account scorecards");
  });

  it("keeps account errors explicit when no saved records exist", () => {
    useScorecardStore.setState({ error: "Offline" });
    show();
    expect(screen.getByRole("heading", { name: "Scorecards Unavailable" })).toBeDefined();
  });

  it("displays older archived modes separately instead of silently dropping them", () => {
    const oldMode = { ...archive.games.handcricket!.modes.international_t20!, modeId: "legacy_format", modeDisplayName: "Previous format" };
    useScorecardStore.setState({ archive: { ...archive, games: {
      handcricket: { ...archive.games.handcricket!, modes: { legacy_format: oldMode } },
    } } });
    show();
    const history = screen.getByRole("region", { name: "Previously recorded modes" });
    expect(within(history).getByText("Previous format")).toBeDefined();
    expect(within(history).getByText(/Stored score: 184/)).toBeDefined();
    expect(within(history).getByText(/legacy_format/)).toBeDefined();
  });
});
