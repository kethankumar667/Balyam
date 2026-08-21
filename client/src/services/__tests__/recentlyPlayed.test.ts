import { describe, it, expect, beforeEach } from "vitest";
import { RecentlyPlayedManager } from "../RecentlyPlayedManager";

describe("RecentlyPlayedManager", () => {
  beforeEach(() => {
    localStorage.clear();
    RecentlyPlayedManager.clearRecentlyPlayed();
  });

  it("records games in chronological order (newest first)", () => {
    RecentlyPlayedManager.recordRecentlyPlayed("ludo");
    RecentlyPlayedManager.recordRecentlyPlayed("rummy");
    RecentlyPlayedManager.recordRecentlyPlayed("uno");

    const recent = RecentlyPlayedManager.getRecentlyPlayed();
    expect(recent.length).toBe(3);
    expect(recent[0].slug).toBe("uno");
    expect(recent[1].slug).toBe("rummy");
    expect(recent[2].slug).toBe("ludo");
  });

  it("prevents duplicates and promotes re-played games to front", () => {
    RecentlyPlayedManager.recordRecentlyPlayed("ludo");
    RecentlyPlayedManager.recordRecentlyPlayed("rummy");
    RecentlyPlayedManager.recordRecentlyPlayed("uno");
    // Re-play ludo
    RecentlyPlayedManager.recordRecentlyPlayed("ludo");

    const recent = RecentlyPlayedManager.getRecentlyPlayed();
    expect(recent.length).toBe(3);
    expect(recent[0].slug).toBe("ludo");
    expect(recent[0].playCount).toBe(2);
    expect(recent[1].slug).toBe("uno");
    expect(recent[2].slug).toBe("rummy");
  });

  it("caps list to maximum 10 items", () => {
    const games = [
      "ludo", "rummy", "uno", "snl", "rps",
      "chess", "carrom", "snake", "roadrash", "tetris", "stargame",
    ] as const;

    for (const g of games) {
      RecentlyPlayedManager.recordRecentlyPlayed(g);
    }

    const recent = RecentlyPlayedManager.getRecentlyPlayed();
    expect(recent.length).toBe(10);
    expect(recent[0].slug).toBe("stargame");
    expect(recent.some((r) => r.slug === "ludo")).toBe(false); // oldest evicted
  });

  it("notifies subscribers when games are recorded", () => {
    let callCount = 0;
    const unsub = RecentlyPlayedManager.subscribe(() => {
      callCount++;
    });

    RecentlyPlayedManager.recordRecentlyPlayed("dotsboxes");
    expect(callCount).toBe(1);

    unsub();
    RecentlyPlayedManager.recordRecentlyPlayed("bingo");
    expect(callCount).toBe(1);
  });
});
