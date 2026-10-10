import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const api = vi.hoisted(() => ({ apiJson: vi.fn(), who: { id: "me_1" as string | null } }));
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiJson: api.apiJson,
  peekPlayerCredential: () => (api.who.id ? { playerId: api.who.id, token: "t", kind: "member" as const } : null),
}));

import { XpGainToast } from "../XpGainToast";
import { checkForLevelUp, resetLevelUpBaselines } from "../../../hooks/useLevelUpWatcher";
import { useXpGainStore } from "../../../store/xpGainStore";
import { useLevelUpStore } from "../../../store/levelUpStore";

const profile = (level: number, xp: number) => ({ profile: { playerId: "me_1", displayName: "K", joinedAt: 0, lastSeenAt: 0, level, experiencePoints: xp } });

describe("XP earned this match: when the watcher raises it", () => {
  beforeEach(() => {
    api.apiJson.mockReset();
    api.who.id = "me_1";
    resetLevelUpBaselines();
    useXpGainStore.getState().clear();
    useLevelUpStore.getState().clear();
  });

  it("shows nothing the first time it reads the profile", async () => {
    api.apiJson.mockResolvedValue(profile(2, 120));

    await checkForLevelUp(true);

    expect(useXpGainStore.getState().moment).toBeNull();
  });

  it("raises the card after a match that paid XP, with the real before and after", async () => {
    api.apiJson.mockResolvedValueOnce(profile(2, 120)).mockResolvedValueOnce(profile(2, 155));

    await checkForLevelUp();
    await checkForLevelUp(true);

    expect(useXpGainStore.getState().moment).toMatchObject({ previousXp: 120, newXp: 155 });
  });

  it("does not raise it for XP that arrives while someone is simply browsing", async () => {
    api.apiJson.mockResolvedValueOnce(profile(2, 120)).mockResolvedValueOnce(profile(2, 155));

    await checkForLevelUp();
    await checkForLevelUp(false);

    expect(useXpGainStore.getState().moment).toBeNull();
  });

  it("leaves a level-up to the level-up screen instead of stacking the card on top", async () => {
    api.apiJson.mockResolvedValueOnce(profile(2, 180)).mockResolvedValueOnce(profile(3, 215));

    await checkForLevelUp();
    await checkForLevelUp(true);

    expect(useLevelUpStore.getState().moment).not.toBeNull();
    expect(useXpGainStore.getState().moment).toBeNull();
  });

  it("raises nothing for a match that paid no XP", async () => {
    api.apiJson.mockResolvedValue(profile(2, 120));

    await checkForLevelUp();
    await checkForLevelUp(true);

    expect(useXpGainStore.getState().moment).toBeNull();
  });
});

describe("XpGainToast", () => {
  beforeEach(() => {
    useXpGainStore.getState().clear();
  });

  it("renders nothing until there is something to show", () => {
    render(<XpGainToast />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the XP the match paid and can be dismissed", () => {
    render(<XpGainToast />);

    act(() => useXpGainStore.getState().show(120, 155));

    expect(screen.getByRole("status")).toHaveTextContent("+35 XP EARNED");
    fireEvent.click(screen.getByRole("button", { name: /dismiss xp earned/i }));
    expect(useXpGainStore.getState().moment).toBeNull();
  });
});
