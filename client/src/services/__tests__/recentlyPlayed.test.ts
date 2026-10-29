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

  it("touch moves a game to the front without counting another play", () => {
    RecentlyPlayedManager.recordRecentlyPlayed("ludo");
    RecentlyPlayedManager.recordRecentlyPlayed("rummy");

    RecentlyPlayedManager.touchRecentlyPlayed("ludo");

    const recent = RecentlyPlayedManager.getRecentlyPlayed();
    expect(recent.map((item) => item.slug)).toEqual(["ludo", "rummy"]);
    expect(recent[0].playCount).toBe(1);
  });

  it("touch lists a game that was never created from the sheet (a room joined from a link) with one play", () => {
    RecentlyPlayedManager.touchRecentlyPlayed("rummy");

    const recent = RecentlyPlayedManager.getRecentlyPlayed();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ slug: "rummy", playCount: 1 });
    expect(recent[0].lastPlayedAt).toBeGreaterThan(0);
  });

  it("touch changes the list's reference and tells subscribers, as a real play does", () => {
    RecentlyPlayedManager.recordRecentlyPlayed("ludo");
    const before = RecentlyPlayedManager.getRecentlyPlayed();
    let notified = 0;
    const unsubscribe = RecentlyPlayedManager.subscribe(() => { notified += 1; });

    RecentlyPlayedManager.touchRecentlyPlayed("ludo");
    unsubscribe();

    expect(notified).toBe(1);
    expect(RecentlyPlayedManager.getRecentlyPlayed()).not.toBe(before);
  });

  it("caps list to maximum 10 items", () => {
    const games = [
      "ludo", "rummy", "uno", "snl", "rps",
      "chess", "tictactoe", "snake", "roadrash", "tetris", "stargame",
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

  it("regression: clearRecentlyPlayed resets the in-memory cache and notifies subscribers — a raw localStorage.clear() elsewhere cannot", () => {
    RecentlyPlayedManager.recordRecentlyPlayed("ludo");
    RecentlyPlayedManager.recordRecentlyPlayed("rummy");
    expect(RecentlyPlayedManager.getRecentlyPlayed().length).toBe(2);

    // Simulates sign-out's blanket storage wipe happening in a DIFFERENT
    // module, which this singleton's private `cache` field can't see.
    localStorage.clear();
    expect(RecentlyPlayedManager.getRecentlyPlayed().length).toBe(2);

    let notified = 0;
    const unsub = RecentlyPlayedManager.subscribe(() => notified++);
    RecentlyPlayedManager.clearRecentlyPlayed();
    unsub();

    expect(RecentlyPlayedManager.getRecentlyPlayed()).toEqual([]);
    expect(notified).toBe(1);
  });
});
