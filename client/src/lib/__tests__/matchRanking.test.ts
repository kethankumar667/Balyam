import { describe, expect, it } from "vitest";
import { normalizeWinnerId, rankMatchPlayers } from "../matchRanking";

const host = { id: "host", name: "Host" };
const guest = { id: "guest", name: "Guest" };

describe("normalizeWinnerId", () => {
  it("passes a real id through", () => {
    expect(normalizeWinnerId("p_1")).toBe("p_1");
  });

  it("treats a draw marker as 'no winner'", () => {
    expect(normalizeWinnerId("draw")).toBeNull();
  });

  it.each([null, undefined, "", 0, {}, [], true])("treats %p as no winner", (raw) => {
    expect(normalizeWinnerId(raw)).toBeNull();
  });
});

describe("rankMatchPlayers", () => {
  it("puts the winner first even when they are not the host", () => {
    const ranked = rankMatchPlayers([host, guest], "guest");
    expect(ranked.map((p) => p.id)).toEqual(["guest", "host"]);
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it("keeps roster order when the host won", () => {
    expect(rankMatchPlayers([host, guest], "host").map((p) => p.id)).toEqual(["host", "guest"]);
  });

  it("scores everyone equally on a draw and keeps roster order", () => {
    const ranked = rankMatchPlayers([host, guest], null);
    expect(ranked.map((p) => p.id)).toEqual(["host", "guest"]);
    expect(new Set(ranked.map((p) => p.score)).size).toBe(1);
  });

  it("ignores a winner id that is not at the table", () => {
    const ranked = rankMatchPlayers([host, guest], "someone-who-left");
    expect(ranked.map((p) => p.id)).toEqual(["host", "guest"]);
    expect(new Set(ranked.map((p) => p.score)).size).toBe(1);
  });

  it("carries name and avatar through and does not mutate its input", () => {
    const input = [{ ...host, avatar: "fox" }, guest];
    const snapshot = JSON.stringify(input);
    const ranked = rankMatchPlayers(input, "guest");
    expect(ranked.find((p) => p.id === "host")).toMatchObject({ name: "Host", avatar: "fox" });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("returns an empty list for no players", () => {
    expect(rankMatchPlayers([], "x")).toEqual([]);
  });
});
