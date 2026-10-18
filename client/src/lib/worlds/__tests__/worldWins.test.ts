import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Player } from "@shared/types";
import {
  WORLD_WINS_CHANGED_EVENT,
  WORLD_WINS_STORAGE_KEY,
  countsAsWorldWin,
  loadWinCounts,
  recordWorldWin,
} from "../worldWins";

const seat = (id: string, extra: Partial<Player> = {}): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, ...extra }) as Player;
const TWO_HUMANS = [seat("me", { isHost: true }), seat("friend")];

describe("loadWinCounts", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("starts at none for every game", () => {
    expect(loadWinCounts()).toEqual({ ludo: 0, rummy: 0 });
  });

  it("reads what was stored", () => {
    localStorage.setItem(WORLD_WINS_STORAGE_KEY, JSON.stringify({ wins: { ludo: 3, rummy: 12 }, counted: ["AAAAAA"] }));
    expect(loadWinCounts()).toEqual({ ludo: 3, rummy: 12 });
  });

  it("treats damaged storage as none, and a damaged number as none", () => {
    localStorage.setItem(WORLD_WINS_STORAGE_KEY, "{not json");
    expect(loadWinCounts()).toEqual({ ludo: 0, rummy: 0 });
    localStorage.setItem(WORLD_WINS_STORAGE_KEY, JSON.stringify({ wins: { ludo: -4, rummy: "lots" } }));
    expect(loadWinCounts()).toEqual({ ludo: 0, rummy: 0 });
    localStorage.setItem(WORLD_WINS_STORAGE_KEY, JSON.stringify({ wins: { ludo: 2.9, rummy: 1e99 } }));
    expect(loadWinCounts().ludo).toBe(2);
    expect(Number.isFinite(loadWinCounts().rummy)).toBe(true);
  });

  it("does not throw when storage is blocked", () => {
    const failing = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(loadWinCounts()).toEqual({ ludo: 0, rummy: 0 });
    } finally {
      failing.mockRestore();
    }
  });
});

describe("countsAsWorldWin", () => {
  const base = { game: "ludo" as const, phase: "finished", winnerId: "me", selfId: "me", players: TWO_HUMANS };

  it("counts a finished match that I won against another person", () => {
    expect(countsAsWorldWin(base)).toBe(true);
    expect(countsAsWorldWin({ ...base, game: "rummy" })).toBe(true);
  });

  it("does not count a match I lost, or one with no winner, or one still going", () => {
    expect(countsAsWorldWin({ ...base, winnerId: "friend" })).toBe(false);
    expect(countsAsWorldWin({ ...base, winnerId: null })).toBe(false);
    expect(countsAsWorldWin({ ...base, phase: "playing" })).toBe(false);
    expect(countsAsWorldWin({ ...base, phase: "lobby" })).toBe(false);
  });

  it("does not count a game that has no worlds", () => {
    expect(countsAsWorldWin({ ...base, game: "rps" })).toBe(false);
    expect(countsAsWorldWin({ ...base, game: "uno" })).toBe(false);
  });

  it("does not count a match against bots only, so a bot cannot be farmed for a world", () => {
    const players = [seat("me", { isHost: true }), seat("bot-1", { isBot: true }), seat("bot-2", { isBot: true })];
    expect(countsAsWorldWin({ ...base, players })).toBe(false);
  });

  it("does not count Pass and Play seats as other people", () => {
    const players = [seat("me", { isHost: true }), seat("local-1", { isLocal: true }), seat("local-2", { isLocal: true })];
    expect(countsAsWorldWin({ ...base, players })).toBe(false);
  });

  it("counts a table with one friend and some bots", () => {
    const players = [seat("me", { isHost: true }), seat("friend"), seat("bot-1", { isBot: true })];
    expect(countsAsWorldWin({ ...base, players })).toBe(true);
  });

  it("does not count a win on a seat that is not mine, such as a Pass and Play seat", () => {
    const players = [seat("me", { isHost: true }), seat("local-1", { isLocal: true }), seat("friend")];
    expect(countsAsWorldWin({ ...base, winnerId: "local-1", players })).toBe(false);
  });

  it("does not count when I do not know who I am yet", () => {
    expect(countsAsWorldWin({ ...base, selfId: null })).toBe(false);
  });
});

describe("recordWorldWin", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("adds one win to that game only", () => {
    expect(recordWorldWin("ludo", "ABC123")).toEqual({ ludo: 1, rummy: 0 });
    expect(recordWorldWin("rummy", "DEF456")).toEqual({ ludo: 1, rummy: 1 });
    expect(loadWinCounts()).toEqual({ ludo: 1, rummy: 1 });
  });

  it("counts a room once, however many times the finished screen redraws or the page is reloaded", () => {
    expect(recordWorldWin("ludo", "ABC123")).toEqual({ ludo: 1, rummy: 0 });
    expect(recordWorldWin("ludo", "ABC123")).toBeNull();
    expect(recordWorldWin("ludo", "abc123")).toBeNull();
    expect(loadWinCounts().ludo).toBe(1);
  });

  it("ignores a game that has no worlds, and a room code that is not one", () => {
    expect(recordWorldWin("rps", "ABC123")).toBeNull();
    expect(recordWorldWin("ludo", "")).toBeNull();
    expect(loadWinCounts()).toEqual({ ludo: 0, rummy: 0 });
  });

  it("keeps only the most recent room codes, so the record does not grow without end", () => {
    for (let i = 0; i < 80; i += 1) recordWorldWin("ludo", `R${String(i).padStart(5, "0")}`);
    const stored = JSON.parse(localStorage.getItem(WORLD_WINS_STORAGE_KEY) as string) as { wins: { ludo: number }; counted: string[] };
    expect(stored.wins.ludo).toBe(80);
    expect(stored.counted.length).toBeLessThanOrEqual(40);
    expect(stored.counted).toContain("R00079");
  });

  it("tells the rest of the page that the count changed", () => {
    const listener = vi.fn();
    window.addEventListener(WORLD_WINS_CHANGED_EVENT, listener);
    recordWorldWin("ludo", "ABC123");
    recordWorldWin("ludo", "ABC123");
    window.removeEventListener(WORLD_WINS_CHANGED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("never breaks playing when storage is blocked", () => {
    const failing = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(() => recordWorldWin("ludo", "ABC123")).not.toThrow();
    } finally {
      failing.mockRestore();
    }
  });
});
