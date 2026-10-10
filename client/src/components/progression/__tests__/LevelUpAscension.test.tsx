import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const api = vi.hoisted(() => ({ apiJson: vi.fn(), who: { id: "me_1" as string | null } }));
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiJson: api.apiJson,
  peekPlayerCredential: () => (api.who.id ? { playerId: api.who.id, token: "t", kind: "member" as const } : null),
}));
const play = vi.fn();
const trigger = vi.fn();
vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: (...a: unknown[]) => play(...a) } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: (...a: unknown[]) => trigger(...a) } }));

import { LevelUpAscension } from "../LevelUpAscension";
import { checkForLevelUp, resetLevelUpBaselines } from "../../../hooks/useLevelUpWatcher";
import { useLevelUpStore } from "../../../store/levelUpStore";

const profile = (level: number, xp: number) => ({ profile: { playerId: "me_1", displayName: "K", joinedAt: 0, lastSeenAt: 0, level, experiencePoints: xp } });

describe("level-up watcher", () => {
  beforeEach(() => {
    api.apiJson.mockReset();
    api.who.id = "me_1";
    resetLevelUpBaselines();
    useLevelUpStore.getState().clear();
  });

  it("celebrates nothing the first time it reads the profile, it only learns the level", async () => {
    api.apiJson.mockResolvedValue(profile(12, 1_150));

    await checkForLevelUp();

    expect(useLevelUpStore.getState().moment).toBeNull();
  });

  it("celebrates a real rise between two reads, with the old and new level and the real XP", async () => {
    api.apiJson.mockResolvedValueOnce(profile(12, 1_150)).mockResolvedValueOnce(profile(13, 1_240));

    await checkForLevelUp();
    await checkForLevelUp();

    expect(useLevelUpStore.getState().moment).toMatchObject({ fromLevel: 12, toLevel: 13, totalXp: 1_240 });
  });

  it("celebrates nothing when the level has not changed", async () => {
    api.apiJson.mockResolvedValue(profile(12, 1_150));

    await checkForLevelUp();
    await checkForLevelUp();

    expect(useLevelUpStore.getState().moment).toBeNull();
  });

  it("does not replay the same rise on the next read", async () => {
    api.apiJson.mockResolvedValueOnce(profile(12, 1_150)).mockResolvedValueOnce(profile(13, 1_240)).mockResolvedValueOnce(profile(13, 1_260));

    await checkForLevelUp();
    await checkForLevelUp();
    useLevelUpStore.getState().clear();
    await checkForLevelUp();

    expect(useLevelUpStore.getState().moment).toBeNull();
  });

  it("is passive: with no identity yet it asks the server for nothing", async () => {
    api.who.id = null;

    await checkForLevelUp();

    expect(api.apiJson).not.toHaveBeenCalled();
  });

  it("starts a fresh baseline for a different player rather than inventing a rise", async () => {
    api.apiJson.mockResolvedValueOnce(profile(12, 1_150)).mockResolvedValueOnce(profile(30, 2_950));
    await checkForLevelUp();
    api.who.id = "someone_else";

    await checkForLevelUp();

    expect(useLevelUpStore.getState().moment).toBeNull();
  });

  it("survives a failed read without celebrating or throwing", async () => {
    api.apiJson.mockResolvedValue(null);

    await expect(checkForLevelUp()).resolves.toBeUndefined();
    expect(useLevelUpStore.getState().moment).toBeNull();
  });
});

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

describe("LevelUpAscension", () => {
  const renderIt = () =>
    render(
      <MemoryRouter initialEntries={["/room/ABC123"]}>
        <LevelUpAscension />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    play.mockClear();
    trigger.mockClear();
  });

  afterEach(() => useLevelUpStore.getState().clear());

  it("renders nothing until a real level-up is seen", () => {
    const { container } = renderIt();

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("names the new level, the real progress and the next real reward", () => {
    // 1,340 XP: level 14 with 40 XP into it. The next milestone is level 15 (Table Virtuoso, 1,500 coins).
    useLevelUpStore.getState().show(13, 14, 1_340);

    renderIt();

    expect(screen.getByRole("dialog", { name: /level/i })).toBeInTheDocument();
    expect(screen.getByText(/40 of 100 XP toward Level 15/i)).toBeInTheDocument();
    expect(screen.getByText(/60 XP to your next level/i)).toBeInTheDocument();
    expect(screen.getByText(/A win earns 35 XP and every match you play earns 15/i)).toBeInTheDocument();
    expect(screen.getByText(/1,500 coins/)).toBeInTheDocument();
    expect(screen.getByText(/Table Virtuoso/)).toBeInTheDocument();
    expect(trigger).toHaveBeenCalledWith("win");
  });

  it("says plainly when level rewards are ready to claim, and where", () => {
    useLevelUpStore.getState().show(4, 5, 440);

    renderIt();

    expect(screen.getByText(/500 coins/)).toBeInTheDocument();
    expect(screen.getByText(/Claim them in your Level Roadmap/i)).toBeInTheDocument();
  });

  it("welcomes a player to a new tier", () => {
    useLevelUpStore.getState().show(5, 6, 540);

    renderIt();

    expect(screen.getByText(/Welcome to the .* tier/i)).toBeInTheDocument();
  });

  it("applies no pressure: no countdown and no streak talk", () => {
    useLevelUpStore.getState().show(13, 14, 1_340);

    renderIt();

    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).not.toMatch(/hurry|expires|don't lose|only .* left|streak/i);
  });

  it("takes the player to the games when they choose Play a game", () => {
    useLevelUpStore.getState().show(13, 14, 1_340);
    renderIt();

    fireEvent.click(screen.getByRole("button", { name: /play a game/i }));

    expect(screen.getByTestId("where")).toHaveTextContent("/");
    expect(useLevelUpStore.getState().moment).toBeNull();
  });

  it("closes from Later without moving the player anywhere", () => {
    useLevelUpStore.getState().show(13, 14, 1_340);
    renderIt();

    fireEvent.click(screen.getByRole("button", { name: /later/i }));

    expect(screen.getByTestId("where")).toHaveTextContent("/room/ABC123");
    expect(useLevelUpStore.getState().moment).toBeNull();
  });
});
