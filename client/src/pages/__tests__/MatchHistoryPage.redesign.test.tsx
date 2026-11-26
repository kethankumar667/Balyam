import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import MatchHistoryPage from "../MatchHistoryPage";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import type { ProfileFamilyOutletContext } from "../../components/layout/ProfileFamilyLayout";

// What the server "returns": empty unless a test puts matches here.
const served = vi.hoisted(() => ({ matches: [] as unknown[] }));
// Only `apiFetch` is replaced: opening a match renders avatars, which read other exports of this module.
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ matches: served.matches, total: served.matches.length }),
  })),
}));

const playedMatch = (matchId: string, game: string) => ({
  matchId,
  roomCode: "ROOM01",
  game,
  startedAt: 1_700_000_000_000,
  finishedAt: 1_700_000_600_000,
  durationMs: 600_000,
  result: "WIN",
  participants: [
    { playerId: "player_1", name: "Kethan", isWinner: true },
    { playerId: "bot_1", name: "Ravi", isWinner: false, isBot: true },
  ],
  replayAvailable: false,
});

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

  describe("games played", () => {
    afterEach(() => { served.matches = []; });

    it("shows each game's tile before its name", async () => {
      served.matches = [playedMatch("m1", "rummy"), playedMatch("m2", "bingo")];
      renderHistory();

      await waitFor(() => expect(document.querySelectorAll("ol > li")).toHaveLength(2));
      const rows = Array.from(document.querySelectorAll("ol > li")) as HTMLElement[];
      expect(rows[0].querySelector("img")?.getAttribute("src")).toBe("/RummyTile.png");
      expect(rows[1].querySelector("img")?.getAttribute("src")).toBe("/Bingo%20Tile.png");
      const tile = rows[0].querySelector("picture") as Element;
      const name = within(rows[0]).getByText("Indian Rummy");
      expect(tile.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("keeps a clean row, with an icon, for a game that has no tile art", async () => {
      served.matches = [playedMatch("m1", "a-game-without-a-tile")];
      renderHistory();

      await waitFor(() => expect(document.querySelectorAll("ol > li")).toHaveLength(1));
      const row = document.querySelector("ol > li") as HTMLElement;
      expect(row.querySelector("img")).toBeNull();
      expect(row.querySelector("svg")).not.toBeNull();
      expect(row.textContent).toContain("2 players");
    });

    it("still opens the match scorecard from a row", async () => {
      served.matches = [playedMatch("m1", "rummy")];
      renderHistory();

      const open = await screen.findByRole("button", { name: /Open Indian Rummy match/ });
      open.click();

      expect(await screen.findByRole("heading", { name: "Indian Rummy scorecard" })).toBeDefined();
    });
  });
});
