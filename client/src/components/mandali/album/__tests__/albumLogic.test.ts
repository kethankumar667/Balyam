import { describe, it, expect } from "vitest";
import { COVER_CLOTHS, coverClothFor } from "../coverCloth";
import { groupMessagesByDay } from "../groupByDay";

/**
 * The two pieces of album logic that are pure functions: which cover cloth a
 * Mandali wears, and how a conversation is cut into days.
 */

describe("coverClothFor", () => {
  it("always answers with one of the known cloths", () => {
    for (const id of ["mandali_ab12", "x", "mandali_ludo_kings", "🙂 unicode ఆంధ్ర"]) {
      expect(COVER_CLOTHS).toContain(coverClothFor(id));
    }
  });

  it("gives the same Mandali the same cloth every time", () => {
    expect(coverClothFor("mandali_nellore")).toBe(coverClothFor("mandali_nellore"));
  });

  it("spreads Mandalis across all five cloths, none hogging the shelf", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 500; i += 1) {
      const cloth = coverClothFor(`mandali_${i}_${(i * 7919).toString(36)}`);
      counts.set(cloth, (counts.get(cloth) ?? 0) + 1);
    }

    expect([...counts.keys()].sort()).toEqual([...COVER_CLOTHS].sort());
    for (const n of counts.values()) expect(n).toBeLessThan(500 * 0.35);
  });

  it("falls back to the house maroon for a missing or empty id", () => {
    expect(coverClothFor("")).toBe("maroon");
    expect(coverClothFor(undefined)).toBe("maroon");
  });
});

describe("groupMessagesByDay", () => {
  const TZ = "Asia/Kolkata";
  const labels = { today: "Today", yesterday: "Yesterday" };
  // 27 Sep 2026, 21:00 in India.
  const NOW = Date.parse("2026-09-27T15:30:00Z");
  const at = (iso: string) => ({ id: iso, timestamp: Date.parse(iso) });
  const group = (messages: Array<{ id: string; timestamp: number }>, locale = "en") =>
    groupMessagesByDay(messages, { now: NOW, locale, labels, timeZone: TZ });

  it("returns nothing for no messages", () => {
    expect(group([])).toEqual([]);
  });

  it("keeps messages from one day together, in their original order", () => {
    const result = group([at("2026-09-27T05:00:00Z"), at("2026-09-27T09:00:00Z"), at("2026-09-27T12:00:00Z")]);

    expect(result).toHaveLength(1);
    expect(result[0].messages.map((m) => m.id)).toEqual([
      "2026-09-27T05:00:00Z", "2026-09-27T09:00:00Z", "2026-09-27T12:00:00Z",
    ]);
  });

  it("starts a new day at local midnight, not at UTC midnight", () => {
    // 18:29 UTC is 23:59 in India; 18:31 UTC is 00:01 the next day in India.
    const result = group([at("2026-09-26T18:29:00Z"), at("2026-09-26T18:31:00Z")]);

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.key)).toEqual(["2026-09-26", "2026-09-27"]);
  });

  it("calls the current day Today and the one before it Yesterday", () => {
    const result = group([at("2026-09-26T06:00:00Z"), at("2026-09-27T06:00:00Z")]);

    expect(result.map((d) => d.label)).toEqual(["Yesterday", "Today"]);
  });

  it("names older days by weekday and date, in the reader's language", () => {
    const result = group([at("2026-09-20T06:00:00Z")]);

    expect(result[0].label).toMatch(/Sunday/);
    expect(result[0].label).toMatch(/20/);
    expect(result[0].label).toMatch(/Sep/);
    const telugu = group([at("2026-09-20T06:00:00Z")], "te");
    expect(telugu[0].label).not.toMatch(/Sunday/);
  });

  it("does not depend on the order the messages arrive in", () => {
    const result = group([at("2026-09-27T06:00:00Z"), at("2026-09-25T06:00:00Z"), at("2026-09-26T06:00:00Z")]);

    expect(result.map((d) => d.key)).toEqual(["2026-09-25", "2026-09-26", "2026-09-27"]);
  });

  it("does not mutate what it was given", () => {
    const input = [at("2026-09-27T06:00:00Z"), at("2026-09-25T06:00:00Z")];
    const copy = JSON.stringify(input);

    group(input);

    expect(JSON.stringify(input)).toBe(copy);
  });

  it("copes with a message from the future without losing it", () => {
    const result = group([at("2026-09-29T06:00:00Z")]);

    expect(result).toHaveLength(1);
    expect(result[0].messages).toHaveLength(1);
  });
});
