import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import AchievementsPage from "../AchievementsPage";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import type { ProfileFamilyOutletContext } from "../../components/layout/ProfileFamilyLayout";
import { ACHIEVEMENT_CATALOG, type Achievement } from "@shared/profile/Achievements";

const profile = {
  playerId: "player_1",
  displayName: "Kethan",
  joinedAt: 1_700_000_000_000,
  lastSeenAt: 1_700_000_100_000,
  level: 4,
  experiencePoints: 340,
};

const achievements = [
  {
    id: "first_win",
    title: "Taste of Victory",
    description: "Win your first match.",
    icon: "trophy",
    category: "skill" as const,
    targetValue: 1,
    unlocked: true,
    currentProgress: 1,
    progressPercent: 100,
  },
  {
    id: "fifty_matches",
    title: "Dedicated Gamer",
    description: "Play 50 matches.",
    icon: "star",
    category: "progression" as const,
    targetValue: 50,
    unlocked: false,
    currentProgress: 12,
    progressPercent: 24,
  },
];

function renderAchievements(status: "ready" | "loading" | "error" = "ready", items: Achievement[] = achievements) {
  const stats = INITIAL_PLAYER_STATS("player_1");
  const context: ProfileFamilyOutletContext = {
    profile,
    stats,
    achievements: items,
    recentMatches: [],
    resources: {
      profile: { status: "ready", data: profile },
      stats: { status: "ready", data: stats },
      achievements: status === "ready" ? { status: "ready", data: items } : status === "loading" ? { status: "loading", data: null } : { status: "error", data: null, message: "Unavailable" },
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
    <MemoryRouter initialEntries={["/profile/achievements"]}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/profile/achievements" element={<AchievementsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AchievementsPage redesign", () => {
  afterEach(cleanup);
  it("shows the trophy vault and real completion progress", () => {
    renderAchievements();

    expect(screen.getByRole("heading", { name: "Trophy vault" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Unlocked" }).textContent).toContain("1");
    expect(screen.getByRole("progressbar", { name: "Vault completion" }).getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getAllByText("Taste of Victory").length).toBeGreaterThan(0);
  });

  it("shows recent unlocks, closest goals and a collection trail from actual data", () => {
    renderAchievements();
    expect(screen.getByRole("region", { name: "Recently unlocked" })).toBeDefined();
    expect(within(screen.getByRole("region", { name: "Almost yours" })).getByText("Dedicated Gamer")).toBeDefined();
    expect(screen.getByRole("region", { name: "Collection milestones" })).toBeDefined();
    expect(screen.queryByText(/1 match remaining|Social Butterfly|Secret Achievement/)).toBeNull();
  });

  it("combines search and category filters and resets empty results", () => {
    renderAchievements();
    const collection = screen.getByRole("region", { name: "Achievement collection" });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search achievements" }), { target: { value: "victory" } });
    expect(within(collection).getByText("Taste of Victory")).toBeDefined();
    expect(within(collection).queryByText("Dedicated Gamer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Journey \(1\)/ }));
    expect(within(collection).getByText("No achievements match")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(within(collection).getByText("Dedicated Gamer")).toBeDefined();
  });

  it.each(["loading", "error"] as const)("does not present stale counts as a loaded vault when %s", status => {
    renderAchievements(status);
    expect(screen.queryByRole("progressbar", { name: "Vault completion" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Almost yours" })).toBeNull();
    if (status === "error") expect(screen.getByText("Trophy vault unavailable")).toBeDefined();
  });

  it("handles an empty collection without claiming everything is unlocked", () => {
    renderAchievements("ready", []);
    expect(screen.getByText("Your collection starts here")).toBeDefined();
    expect(screen.queryByText("Every achievement unlocked")).toBeNull();
  });

  it("opens the themed detail dialog from a collection card", () => {
    renderAchievements();
    const collection = screen.getByRole("region", { name: "Achievement collection" });
    fireEvent.click(within(collection).getByRole("button", { name: /Taste of Victory/ }));
    expect(screen.getByRole("dialog", { name: "Taste of Victory" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("filters by real unlock status without losing category or search", () => {
    renderAchievements();
    fireEvent.click(screen.getByRole("combobox", { name: "Achievement status" }));
    fireEvent.click(screen.getByRole("option", { name: "Unlocked" }));
    const collection = screen.getByRole("region", { name: "Achievement collection" });
    expect(within(collection).getByText("Taste of Victory")).toBeDefined();
    expect(within(collection).queryByText("Dedicated Gamer")).toBeNull();
  });

  it("loads more actual achievements and preserves compound requirements", () => {
    const items: Achievement[] = ACHIEVEMENT_CATALOG.map(a => ({ ...a, unlocked: false, currentProgress: 0, progressPercent: 0 }));
    renderAchievements("ready", items);
    const collection = screen.getByRole("region", { name: "Achievement collection" });
    expect(within(collection).getAllByRole("button").filter(b => b.classList.contains("group"))).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "Load more achievements" }));
    expect(within(collection).getAllByRole("button").filter(b => b.classList.contains("group"))).toHaveLength(items.length);
    expect(within(collection).getByText("Reach a 60%+ win rate with at least 20 matches played.")).toBeDefined();
    expect(screen.queryByText(/1 match remaining/)).toBeNull();
  });

  it("sorts recently unlocked by timestamps and never invents a missing date", () => {
    renderAchievements("ready", [
      { ...achievements[0], unlockedAt: 1700000000000 },
      { ...achievements[0], id: "new", title: "Latest trophy", unlockedAt: 1800000000000 },
      { ...achievements[0], id: "unknown", title: "Undated trophy" },
    ]);
    const region = screen.getByRole("region", { name: "Recently unlocked" });
    const cards = within(region).getAllByRole("button").filter(b => b.classList.contains("group"));
    expect(cards[0].textContent).toContain("Latest trophy");
    expect(cards[2].textContent).toContain("Undated trophy");
    expect(cards[2].textContent).not.toContain("1970");
  });
});
