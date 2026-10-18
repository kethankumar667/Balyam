import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { capabilitiesFor } from "@shared/permissions";
import { WORLD_IDS } from "@shared/worlds";
import type { Player } from "@shared/types";
import { useAuthStore } from "../../../store/authStore";
import { WORLD_WINS_STORAGE_KEY, loadWinCounts, recordWorldWin } from "../worldWins";
import { WORLD_META, requirementFor } from "../worldMeta";
import { useCountWorldWin, useWorldProgress } from "../useWorldProgress";

const seat = (id: string, extra: Partial<Player> = {}): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, ...extra }) as Player;
const TWO_HUMANS = [seat("me", { isHost: true }), seat("friend")];

const asAdmin = () => useAuthStore.setState({ capabilities: capabilitiesFor("super_admin") });
const asPlayer = () => useAuthStore.setState({ capabilities: capabilitiesFor("guest") });

describe("world names and what each asks for", () => {
  it("names every world, and says in a line what it is", () => {
    for (const id of WORLD_IDS) {
      expect(WORLD_META[id].name.length, id).toBeGreaterThan(2);
      expect(WORLD_META[id].blurb.length, id).toBeGreaterThan(10);
    }
    expect(new Set(WORLD_IDS.map((id) => WORLD_META[id].name)).size).toBe(WORLD_IDS.length);
  });

  it("asks for a number of wins against other people, in the game's own name", () => {
    expect(requirementFor("ludo", "neon")).toBe("Win 1 Ludo match against other people.");
    expect(requirementFor("ludo", "toy")).toBe("Win 3 Ludo matches against other people.");
    expect(requirementFor("rummy", "palace")).toBe("Win 30 Rummy matches against other people.");
  });

  it("asks for nothing for the classic world", () => {
    expect(requirementFor("ludo", "classic")).toBe("");
  });
});

describe("useWorldProgress", () => {
  beforeEach(() => {
    localStorage.clear();
    asPlayer();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    act(() => asPlayer());
  });

  it("starts with only the classic world", () => {
    const { result } = renderHook(() => useWorldProgress("ludo"));
    expect(result.current.wins).toBe(0);
    expect(result.current.unlocked).toEqual(["classic"]);
    expect(result.current.isAllOpen).toBe(false);
  });

  it("opens a world for each rung of wins, in this game only", () => {
    for (let i = 0; i < 3; i += 1) recordWorldWin("ludo", `L${i}`);
    recordWorldWin("rummy", "R0");
    const ludo = renderHook(() => useWorldProgress("ludo")).result.current;
    const rummy = renderHook(() => useWorldProgress("rummy")).result.current;
    expect(ludo.wins).toBe(3);
    expect(ludo.unlocked).toEqual(["classic", "neon", "toy"]);
    expect(rummy.unlocked).toEqual(["classic", "neon"]);
  });

  it("updates the moment a win is counted", () => {
    const { result } = renderHook(() => useWorldProgress("ludo"));
    expect(result.current.unlocked).toEqual(["classic"]);
    act(() => {
      recordWorldWin("ludo", "ABC123");
    });
    expect(result.current.unlocked).toEqual(["classic", "neon"]);
  });

  it("offers no worlds for a game that has none", () => {
    const { result } = renderHook(() => useWorldProgress("rps"));
    expect(result.current.unlocked).toEqual([]);
  });

  it("opens every world on an account that can unlock everything, without saving anything", () => {
    asAdmin();
    const { result } = renderHook(() => useWorldProgress("ludo"));
    expect(result.current.isAllOpen).toBe(true);
    expect(result.current.unlocked).toEqual([...WORLD_IDS]);
    expect(result.current.wins).toBe(0);
    expect(localStorage.getItem(WORLD_WINS_STORAGE_KEY)).toBeNull();
  });

  it("closes them again when the account stops being able to", () => {
    asAdmin();
    const { result } = renderHook(() => useWorldProgress("ludo"));
    expect(result.current.unlocked).toHaveLength(WORLD_IDS.length);
    act(() => asPlayer());
    expect(result.current.unlocked).toEqual(["classic"]);
  });
});

describe("useCountWorldWin", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  const finished = { game: "ludo" as const, phase: "finished", winnerId: "me", selfId: "me", players: TWO_HUMANS, roomCode: "ABC123" };

  it("counts a win I earned against another person, once", () => {
    const { rerender } = renderHook((props) => useCountWorldWin(props), { initialProps: finished });
    expect(loadWinCounts().ludo).toBe(1);
    rerender({ ...finished });
    rerender({ ...finished, players: [...TWO_HUMANS] });
    expect(loadWinCounts().ludo).toBe(1);
  });

  it("counts nothing while the match is still being played, or when I lost", () => {
    renderHook(() => useCountWorldWin({ ...finished, phase: "playing" }));
    renderHook(() => useCountWorldWin({ ...finished, winnerId: "friend" }));
    expect(loadWinCounts().ludo).toBe(0);
  });

  it("counts a win once the match ends, not before", () => {
    const { rerender } = renderHook((props) => useCountWorldWin(props), { initialProps: { ...finished, phase: "playing" } });
    expect(loadWinCounts().ludo).toBe(0);
    rerender({ ...finished, phase: "finished" });
    expect(loadWinCounts().ludo).toBe(1);
  });

  it("counts a match against bots as nothing", () => {
    renderHook(() => useCountWorldWin({ ...finished, players: [seat("me", { isHost: true }), seat("bot", { isBot: true })] }));
    expect(loadWinCounts().ludo).toBe(0);
  });
});
