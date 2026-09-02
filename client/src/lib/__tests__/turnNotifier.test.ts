import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  notifyDesktopTurn,
  notifySystemTurn,
  resetTurnNotifier,
} from "../turnNotifier";
import { activeTurnPlayerId } from "../activeTurn";

describe("activeTurnPlayerId — normalised turn extraction", () => {
  it("reads turnPlayerId for the classic turn-based games", () => {
    expect(
      activeTurnPlayerId({ kind: "snl", phase: "playing", turnPlayerId: "p1" })
    ).toBe("p1");
    expect(
      activeTurnPlayerId({ kind: "wordbuilding", phase: "playing", turnPlayerId: "p2" })
    ).toBe("p2");
    expect(
      activeTurnPlayerId({ kind: "dotsboxes", phase: "playing", turnPlayerId: "p3" })
    ).toBe("p3");
  });

  it("returns null when the game is finished", () => {
    expect(
      activeTurnPlayerId({ kind: "snl", phase: "finished", turnPlayerId: "p1" })
    ).toBeNull();
  });

  it("maps chess's colour to the correct player id", () => {
    const chess = {
      kind: "chess",
      phase: "aiming",
      turn: "w",
      whitePlayerId: "white-id",
      blackPlayerId: "black-id",
    };
    expect(activeTurnPlayerId(chess)).toBe("white-id");
    expect(activeTurnPlayerId({ ...chess, turn: "b" })).toBe("black-id");
  });

  it("uses Bingo's server-computed self flag", () => {
    expect(activeTurnPlayerId({ kind: "bingo", isMyTurn: true })).toBe("__bingo_self__");
    expect(activeTurnPlayerId({ kind: "bingo", isMyTurn: false })).toBeNull();
  });

  it("returns null for simultaneous-play games", () => {
    expect(activeTurnPlayerId({ kind: "rps", round: 1 })).toBeNull();
    expect(activeTurnPlayerId({ kind: "snake", isOver: false })).toBeNull();
    expect(activeTurnPlayerId({ kind: "spacewar", score: 0 })).toBeNull();
  });

  it("never throws on malformed state", () => {
    expect(activeTurnPlayerId(null)).toBeNull();
    expect(activeTurnPlayerId(undefined)).toBeNull();
    expect(activeTurnPlayerId("rummy")).toBeNull();
    expect(activeTurnPlayerId({})).toBeNull();
    expect(activeTurnPlayerId({ kind: "ludo" })).toBeNull();
  });
});

describe("notifySystemTurn — system notifications", () => {
  const OriginalNotification = (globalThis as Record<string, unknown>).Notification;

  function installNotificationFake(permission: string, ctor?: () => unknown): void {
    const fn =
      ctor ??
      (() => {
        /* default ctor does nothing */
      });
    const fake = Object.assign(fn, { permission, requestPermission: vi.fn() });
    (globalThis as Record<string, unknown>).Notification = fake;
  }

  beforeEach(() => {
    resetTurnNotifier();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    if (OriginalNotification === undefined) {
      delete (globalThis as Record<string, unknown>).Notification;
    } else {
      (globalThis as Record<string, unknown>).Notification = OriginalNotification;
    }
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    vi.restoreAllMocks();
    vi.useFakeTimers?.();
    vi.useRealTimers?.();
  });

  it("does nothing without permission", () => {
    const ctor = vi.fn(() => ({ close: vi.fn(), onclick: null }));
    installNotificationFake("denied", ctor);
    notifySystemTurn({ turnKey: "ROOM1:p1:1" });
    expect(ctor).not.toHaveBeenCalled();
  });

  it("does nothing while the tab is visible", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    const ctor = vi.fn(() => ({ close: vi.fn(), onclick: null }));
    installNotificationFake("granted", ctor);
    notifySystemTurn({ turnKey: "ROOM1:p1:1" });
    expect(ctor).not.toHaveBeenCalled();
  });

  it("posts exactly one notification per turn key", () => {
    const ctor = vi.fn(() => ({ close: vi.fn(), onclick: null }));
    installNotificationFake("granted", ctor);
    notifySystemTurn({ turnKey: "ROOM1:p1:1" });
    notifySystemTurn({ turnKey: "ROOM1:p1:1" });
    expect(ctor).toHaveBeenCalledTimes(1);
    // A different turn (someone else moved and it came back) pings again.
    notifySystemTurn({ turnKey: "ROOM1:p1:2" });
    expect(ctor).toHaveBeenCalledTimes(2);
  });

  it("survives a Notification constructor that throws", () => {
    installNotificationFake(
      "granted",
      vi.fn(() => {
        throw new Error("Android Chrome requires SW registration");
      })
    );
    expect(() => notifySystemTurn({ turnKey: "ROOM2:p9:1" })).not.toThrow();
  });
});

describe("notifyDesktopTurn — title flash", () => {
  beforeEach(() => {
    resetTurnNotifier();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });

  it("does not flash while the tab is visible", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    const before = document.title;
    notifyDesktopTurn();
    expect(document.title).toBe(before);
  });

  it("flashes the title when hidden", () => {
    notifyDesktopTurn("🔔 Your turn — BHALYAM");
    expect(document.title).toBe("🔔 Your turn — BHALYAM");
    resetTurnNotifier();
  });
});
