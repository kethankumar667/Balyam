import { afterEach, describe, expect, it } from "vitest";
import {
  HC_CUSTOM_NAMES_KEY,
  HC_CUSTOM_NAME_MAX_LENGTH,
  clearAllCustomNames,
  clearCustomName,
  customNameFor,
  getCustomNames,
  getRosterFor,
  sanitizeCustomName,
  setCustomName,
} from "../hc-custom-names";
import { getRosterFor as getSharedRosterFor } from "@shared/hc-rosters";
import { getJsonPlayerStyleMap, getJsonPlayers, getJsonPlayersRaw, getJsonTeamMeta } from "../hc-json-data";

const NONE: ReadonlySet<string> = new Set();

afterEach(() => {
  clearAllCustomNames();
  localStorage.clear();
});

describe("sanitizeCustomName", () => {
  it("trims, collapses spaces and normalises width", () => {
    expect(sanitizeCustomName("  Ｒｏｈｉｔ   Ｋｕｍａｒ ")).toBe("Rohit Kumar");
  });

  it("removes control, zero-width, bidi and angle-bracket characters", () => {
    expect(sanitizeCustomName("A​b‮c<script>")).toBe("Abcscript");
  });

  it("caps the length by characters, not bytes", () => {
    expect(Array.from(sanitizeCustomName("é".repeat(60))).length).toBe(HC_CUSTOM_NAME_MAX_LENGTH);
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(sanitizeCustomName(" ​ <> ")).toBe("");
  });
});

describe("custom names store", () => {
  it("shows the shipped name until one is set", () => {
    expect(customNameFor("Some Player")).toBe("Some Player");
  });

  it("sets, persists and clears a name", () => {
    expect(setCustomName("Some Player", "My Hero", NONE)).toEqual({ ok: true });
    expect(customNameFor("some player")).toBe("My Hero");
    expect(JSON.parse(localStorage.getItem(HC_CUSTOM_NAMES_KEY) ?? "{}")).toEqual({ "some player": "My Hero" });

    clearCustomName("Some Player");
    expect(customNameFor("Some Player")).toBe("Some Player");
    expect(localStorage.getItem(HC_CUSTOM_NAMES_KEY)).toBeNull();
  });

  it("refuses an empty name and leaves the old one in place", () => {
    setCustomName("Some Player", "My Hero", NONE);
    const res = setCustomName("Some Player", "  ", NONE);
    expect(res.ok).toBe(false);
    expect(customNameFor("Some Player")).toBe("My Hero");
  });

  it("refuses a name another player already has", () => {
    const res = setCustomName("Some Player", "Taken One", new Set(["taken one"]));
    expect(res).toEqual({ ok: false, error: "Another player already has that name." });
    expect(getCustomNames()).toEqual({});
  });

  it("treats typing the shipped name back as a reset", () => {
    setCustomName("Some Player", "My Hero", NONE);
    expect(setCustomName("Some Player", "some player", NONE)).toEqual({ ok: true });
    expect(getCustomNames()).toEqual({});
  });
});

describe("roster wrapper", () => {
  it("hands back the shared squad arrays untouched while nothing is renamed", () => {
    const base = getSharedRosterFor("india", "t20")!;
    const wrapped = getRosterFor("india", "t20")!;
    expect(wrapped.squad).toBe(base.squad);
    expect(wrapped.extras).toBe(base.extras);
  });

  it("renames a player but keeps ids, roles and the original object untouched", () => {
    const base = getSharedRosterFor("india", "t20")!;
    const target = base.squad[0];
    setCustomName(target.name, "Favourite Star", NONE);

    const renamed = getRosterFor("india", "t20")!;
    const found = renamed.squad.find((p) => p.id === target.id)!;
    expect(found.name).toBe("Favourite Star");
    expect(found.role).toBe(target.role);
    expect(base.squad[0].name).toBe(target.name);
  });

  it("gives a stable object between renders until the names change again", () => {
    const target = getSharedRosterFor("india", "t20")!.squad[0];
    setCustomName(target.name, "Favourite Star", NONE);
    expect(getRosterFor("india", "t20")).toBe(getRosterFor("india", "t20"));
  });
});

describe("JSON squads", () => {
  it("renames the same player in the player list, the style map and the default XI", () => {
    const meta = getJsonTeamMeta("bangladesh", "t20")!;
    const starter = meta.playingXI[0];
    setCustomName(starter, "Fan Favourite", NONE);

    const raw = getJsonPlayersRaw("bangladesh", "t20").find((p) => p.name === starter)!;
    expect(getJsonPlayers("bangladesh", "t20").find((p) => p.id === raw.id)?.name).toBe("Fan Favourite");
    expect(getJsonPlayerStyleMap("bangladesh", "t20").has("fan favourite")).toBe(true);
    expect(getJsonPlayerStyleMap("bangladesh", "t20").has(starter.toLowerCase())).toBe(false);
    expect(getJsonTeamMeta("bangladesh", "t20")!.playingXI[0]).toBe("Fan Favourite");
  });
});
