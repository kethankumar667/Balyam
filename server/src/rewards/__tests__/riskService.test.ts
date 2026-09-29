import { describe, it, expect, beforeEach } from "vitest";
import { RiskService, WATCHLIST_QUIET_EXPIRY_MS, type RiskPersistence } from "../RiskService.js";
import { ABNORMAL_SESSIONS_FOR_WATCHLIST, ABNORMAL_WINDOW_MS } from "../SessionRules.js";
import { REASON, type RiskEventRecord, type RiskStateRecord } from "../types.js";
import { LeaderboardService } from "../../ranking/LeaderboardService.js";
import { profileService } from "../../profile/ProfileService.js";
import { riskService } from "../RiskService.js";

class FakeStore implements RiskPersistence {
  states: RiskStateRecord[] = [];
  events: RiskEventRecord[] = [];
  failWrites = false;

  async upsertRiskState(record: RiskStateRecord): Promise<void> {
    if (this.failWrites) throw new Error("db down");
    this.states.push({ ...record });
  }
  async appendRiskEvent(event: RiskEventRecord): Promise<void> {
    if (this.failWrites) throw new Error("db down");
    this.events.push({ ...event });
  }
}

const HOUR = 3_600_000;

describe("risk states", () => {
  let store: FakeStore;
  let risk: RiskService;

  beforeEach(() => {
    store = new FakeStore();
    risk = new RiskService();
    risk.attachStore(store);
  });

  it("starts every account as NORMAL", () => {
    expect(risk.getState("anyone")).toBe("NORMAL");
    expect(risk.getRecord("anyone")).toBeUndefined();
  });

  it("records who moved an account, from what, to what, and why", async () => {
    await risk.setState("p", "RESTRICTED", { reasonCodes: [REASON.OPERATOR_SET], actor: "op_1", note: "ring with q" }, 5_000);

    expect(risk.getState("p")).toBe("RESTRICTED");
    expect(store.states.at(-1)).toMatchObject({ playerId: "p", state: "RESTRICTED", updatedBy: "op_1" });
    expect(store.events.at(-1)).toMatchObject({
      kind: "STATE_CHANGED",
      reasonCode: REASON.OPERATOR_SET,
      detail: { from: "NORMAL", to: "RESTRICTED", actor: "op_1", note: "ring with q" },
    });
  });

  it("is reversible: an operator can put an account straight back to NORMAL, and both moves are audited", async () => {
    await risk.setState("p", "UNDER_REVIEW", { reasonCodes: [REASON.OPERATOR_SET], actor: "op_1" });
    await risk.setState("p", "NORMAL", { reasonCodes: [REASON.OPERATOR_SET], actor: "op_2", note: "cleared on appeal" });

    expect(risk.getState("p")).toBe("NORMAL");
    expect(store.events.map((e) => e.detail.to)).toEqual(["UNDER_REVIEW", "NORMAL"]);
  });

  it("does not claim a state the database refused to record", async () => {
    store.failWrites = true;

    await expect(
      risk.setState("p", "UNDER_REVIEW", { reasonCodes: [REASON.OPERATOR_SET], actor: "op_1" }),
    ).rejects.toThrow("db down");

    expect(risk.getState("p")).toBe("NORMAL");
  });

  it("lists only accounts that are not NORMAL, newest first", async () => {
    await risk.setState("old", "WATCHLIST", { reasonCodes: ["x"], actor: "op" }, 1_000);
    await risk.setState("new", "RESTRICTED", { reasonCodes: ["x"], actor: "op" }, 2_000);
    await risk.setState("cleared", "WATCHLIST", { reasonCodes: ["x"], actor: "op" }, 3_000);
    await risk.setState("cleared", "NORMAL", { reasonCodes: ["x"], actor: "op" }, 4_000);

    expect(risk.listNonNormal().map((r) => r.playerId)).toEqual(["new", "old"]);
  });
});

describe("automatic escalation stops at WATCHLIST", () => {
  let store: FakeStore;
  let risk: RiskService;

  beforeEach(() => {
    store = new FakeStore();
    risk = new RiskService();
    risk.attachStore(store);
  });

  it("does nothing for one or two abnormal sessions", () => {
    for (let i = 0; i < ABNORMAL_SESSIONS_FOR_WATCHLIST - 1; i++) risk.recordAbnormalSession("p", REASON.TOO_SHORT, i * HOUR);

    expect(risk.getState("p")).toBe("NORMAL");
  });

  it("moves a NORMAL account to WATCHLIST on the third inside a day, as the system", async () => {
    for (let i = 0; i < ABNORMAL_SESSIONS_FOR_WATCHLIST; i++) risk.recordAbnormalSession("p", REASON.TOO_SHORT, i * HOUR);
    await Promise.resolve();

    expect(risk.getState("p")).toBe("WATCHLIST");
    expect(risk.getRecord("p")).toMatchObject({ updatedBy: "system", reasonCodes: [REASON.AUTO_ABNORMAL_SESSIONS, REASON.TOO_SHORT] });
    expect(store.events.filter((e) => e.kind === "ABNORMAL_SESSION")).toHaveLength(ABNORMAL_SESSIONS_FOR_WATCHLIST);
    expect(store.events.some((e) => e.kind === "STATE_CHANGED" && e.detail.to === "WATCHLIST")).toBe(true);
  });

  it("does not count sessions spread over more than a day", () => {
    risk.recordAbnormalSession("p", REASON.TOO_SHORT, 0);
    risk.recordAbnormalSession("p", REASON.TOO_SHORT, ABNORMAL_WINDOW_MS + HOUR);
    risk.recordAbnormalSession("p", REASON.TOO_SHORT, ABNORMAL_WINDOW_MS + 2 * HOUR);

    expect(risk.getState("p")).toBe("NORMAL");
  });

  it("never makes an account worse than WATCHLIST, however many more abnormal sessions arrive", () => {
    for (let i = 0; i < 200; i++) risk.recordAbnormalSession("p", REASON.PACE_LIMIT, i * 1_000);

    expect(risk.getState("p")).toBe("WATCHLIST");
  });

  it("does not downgrade a state an operator set", async () => {
    await risk.setState("p", "UNDER_REVIEW", { reasonCodes: [REASON.OPERATOR_SET], actor: "op" });
    for (let i = 0; i < 10; i++) risk.recordAbnormalSession("p", REASON.PACE_LIMIT, i * 1_000);

    expect(risk.getState("p")).toBe("UNDER_REVIEW");
  });

  it("survives a persistence failure without throwing into the match-finish path", () => {
    store.failWrites = true;

    expect(() => {
      for (let i = 0; i < 5; i++) risk.recordAbnormalSession("p", REASON.TOO_SHORT, i * 1_000);
    }).not.toThrow();
    expect(risk.getState("p")).toBe("WATCHLIST");
  });
});

describe("a false positive heals itself", () => {
  it("lapses a system-set watch after a quiet week", () => {
    const risk = new RiskService();
    for (let i = 0; i < 3; i++) risk.recordAbnormalSession("p", REASON.TOO_SHORT, i * HOUR);

    // The watch was set by the third session, two hours in.
    const setAt = 2 * HOUR;
    expect(risk.expireStaleWatchlist(setAt + WATCHLIST_QUIET_EXPIRY_MS - 1)).toBe(0);
    expect(risk.expireStaleWatchlist(setAt + WATCHLIST_QUIET_EXPIRY_MS)).toBe(1);
    expect(risk.getState("p")).toBe("NORMAL");
  });

  it("keeps the watch while abnormal sessions keep arriving", () => {
    const risk = new RiskService();
    for (let i = 0; i < 3; i++) risk.recordAbnormalSession("p", REASON.TOO_SHORT, i * HOUR);
    const recent = 6 * 24 * HOUR;
    risk.recordAbnormalSession("p", REASON.TOO_SHORT, recent);

    expect(risk.expireStaleWatchlist(recent + WATCHLIST_QUIET_EXPIRY_MS - HOUR)).toBe(0);
    expect(risk.getState("p")).toBe("WATCHLIST");
  });

  it("never expires a state an operator set", async () => {
    const risk = new RiskService();
    await risk.setState("p", "WATCHLIST", { reasonCodes: [REASON.OPERATOR_SET], actor: "op_1" }, 0);

    expect(risk.expireStaleWatchlist(100 * WATCHLIST_QUIET_EXPIRY_MS)).toBe(0);
    expect(risk.getState("p")).toBe("WATCHLIST");
  });
});

describe("hydration after a restart", () => {
  it("restores states and counts abnormal sessions already on record", () => {
    const risk = new RiskService();
    risk.hydrate(
      [{ playerId: "held", state: "RESTRICTED", reasonCodes: ["x"], updatedAt: 1, updatedBy: "op" }],
      [
        { playerId: "p", kind: "ABNORMAL_SESSION", reasonCode: REASON.TOO_SHORT, detail: {}, createdAt: 1_000 },
        { playerId: "p", kind: "ABNORMAL_SESSION", reasonCode: REASON.TOO_SHORT, detail: {}, createdAt: 2_000 },
      ],
    );

    expect(risk.getState("held")).toBe("RESTRICTED");

    risk.recordAbnormalSession("p", REASON.TOO_SHORT, 3_000);
    expect(risk.getState("p")).toBe("WATCHLIST");
  });
});

describe("a watched account leaves the leaderboard", () => {
  beforeEach(() => {
    profileService.reset();
    riskService.reset();
  });

  it("lists a NORMAL player and drops the same player once they are on WATCHLIST", async () => {
    profileService.getOrCreateProfile("board_player", "Board Player");
    const board = () => new LeaderboardService().getLeaderboard({}).entries.map((e) => e.playerId);
    expect(board()).toContain("board_player");

    await riskService.setState("board_player", "WATCHLIST", { reasonCodes: [REASON.OPERATOR_SET], actor: "op" });
    expect(board()).not.toContain("board_player");

    await riskService.setState("board_player", "NORMAL", { reasonCodes: [REASON.OPERATOR_SET], actor: "op" });
    expect(board()).toContain("board_player");
  });
});
