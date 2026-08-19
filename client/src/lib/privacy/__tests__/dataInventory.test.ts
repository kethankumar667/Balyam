import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DATA_INVENTORY,
  THIRD_PARTIES,
  buildDataExport,
  eraseLocalData,
  exportFilename,
} from "../dataInventory";

/** Minimal localStorage, since these tests run without a DOM. */
function installStorage(seed: Record<string, string> = {}) {
  let store: Record<string, string> = { ...seed };
  const mock = {
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
  vi.stubGlobal("window", { localStorage: mock });
  return mock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("the inventory itself", () => {
  it("declares every key exactly once", () => {
    const keys = DATA_INVENTORY.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every entry player-readable copy", () => {
    // These strings are the privacy notice. An entry with a terse or missing
    // description silently degrades the notice's plain-language obligation.
    for (const e of DATA_INVENTORY) {
      expect(e.label.length).toBeGreaterThan(2);
      expect(e.description.length).toBeGreaterThan(24);
      expect(e.description.trim()).toMatch(/\.$/);
    }
  });

  it("flags the entry that holds other people's names", () => {
    // Recent tables stores the display names of everyone else at that table.
    // They are data principals who cannot reach these controls, so the flag
    // has to survive any future edit to this list.
    const others = DATA_INVENTORY.filter((e) => e.holdsOthersData);
    expect(others.map((e) => e.key)).toContain("mpg.rummy.lastGangs");
    for (const e of others) expect(e.isPersonalData).toBe(true);
  });

  it("treats identity and credential data as personal", () => {
    for (const e of DATA_INVENTORY) {
      if (e.purpose === "identity" || e.purpose === "credential") {
        expect(e.isPersonalData).toBe(true);
      }
    }
  });

  it("names who receives data, not just that someone might", () => {
    expect(THIRD_PARTIES.length).toBeGreaterThan(0);
    for (const p of THIRD_PARTIES) {
      expect(p.name).toBeTruthy();
      expect(p.receives.length).toBeGreaterThan(20);
      expect(p.when.length).toBeGreaterThan(10);
    }
    // Voice chat routes through Google's public STUN servers, which means an
    // IP address leaves the device. Section 11 asks for exactly this.
    expect(THIRD_PARTIES.some((p) => /STUN/i.test(p.name) || /STUN/i.test(p.when))).toBe(true);
  });
});

describe("buildDataExport", () => {
  it("returns only what this device actually holds", () => {
    installStorage({ "mpg.playerName": "Sri Krishna", "bhalyam.theme": "dark" });
    const out = buildDataExport(new Date("2026-08-14T10:00:00Z"));
    expect(out.data.map((d) => d.key).sort()).toEqual(["bhalyam.theme", "mpg.playerName"]);
    expect(out.data.find((d) => d.key === "mpg.playerName")?.value).toBe("Sri Krishna");
    expect(out.exportedAt).toBe("2026-08-14T10:00:00.000Z");
  });

  it("parses stored JSON so the export is readable", () => {
    installStorage({ "mpg.seats": JSON.stringify({ AB12CD: { playerId: "p_1", seatToken: "t" } }) });
    const seats = buildDataExport().data.find((d) => d.key === "mpg.seats");
    expect(seats?.value).toEqual({ AB12CD: { playerId: "p_1", seatToken: "t" } });
  });

  it("carries the plain-language description of each item", () => {
    installStorage({ "mpg.rummy.lastGangs": "[]" });
    const item = buildDataExport().data[0]!;
    expect(item.description).toMatch(/display names of the other players/i);
    expect(item.holdsOthersData).toBe(true);
  });

  it("surfaces keys nobody declared instead of hiding them", () => {
    // The failure this exists to catch: a new feature starts storing
    // something and the privacy notice silently stops being true.
    installStorage({ "mpg.playerName": "Ravi", "some.future.feature": "x" });
    const out = buildDataExport();
    expect(out.undeclaredKeys).toEqual(["some.future.feature"]);
  });

  it("always states who else receives data", () => {
    installStorage({});
    expect(buildDataExport().thirdParties.length).toBe(THIRD_PARTIES.length);
  });

  it("survives storage being unavailable", () => {
    vi.stubGlobal("window", {
      localStorage: {
        get length(): number {
          throw new Error("blocked");
        },
        getItem() {
          throw new Error("blocked");
        },
        key() {
          throw new Error("blocked");
        },
      },
    });
    expect(() => buildDataExport()).not.toThrow();
    expect(buildDataExport().data).toEqual([]);
  });
});

describe("eraseLocalData", () => {
  it("removes every declared key", () => {
    const store = installStorage({
      "mpg.playerId": "p_1",
      "mpg.playerName": "Ravi",
      "mpg.seats": "{}",
      "bhalyam.theme": "dark",
    });
    const res = eraseLocalData();
    expect(store.length).toBe(0);
    expect(res.removed).toContain("mpg.playerId");
    expect(res.removed).toContain("mpg.seats");
  });

  it("removes other people's names along with your own data", () => {
    const store = installStorage({
      "mpg.rummy.lastGangs": JSON.stringify([{ roomName: "Friday", playerNames: ["Ravi", "Anand"] }]),
    });
    eraseLocalData();
    expect(store.getItem("mpg.rummy.lastGangs")).toBeNull();
  });

  it("removes undeclared keys too, and reports them separately", () => {
    // Erasing only what someone remembered to write down is not erasure.
    const store = installStorage({ "mpg.playerId": "p_1", "mystery.key": "1" });
    const res = eraseLocalData();
    expect(store.length).toBe(0);
    expect(res.removed).toEqual(["mpg.playerId"]);
    expect(res.removedUndeclared).toEqual(["mystery.key"]);
  });

  it("is safe to run twice", () => {
    installStorage({ "mpg.playerId": "p_1" });
    eraseLocalData();
    expect(() => eraseLocalData()).not.toThrow();
    expect(eraseLocalData().removed).toEqual([]);
  });

  it("does not abandon the rest when one key refuses to go", () => {
    let store: Record<string, string> = { a: "1", "mpg.playerId": "p_1", z: "2" };
    vi.stubGlobal("window", {
      localStorage: {
        get length() {
          return Object.keys(store).length;
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
        getItem: (k: string) => store[k] ?? null,
        removeItem: (k: string) => {
          if (k === "a") throw new Error("locked");
          delete store[k];
        },
      },
    });
    eraseLocalData();
    expect(Object.keys(store)).toEqual(["a"]);
  });
});

describe("exportFilename", () => {
  it("is dated, so repeated exports do not collide", () => {
    const name = exportFilename(new Date("2026-08-14T10:20:30Z"));
    expect(name).toBe("bhalyam-my-data-2026-08-14-10-20-30.json");
    expect(name).not.toMatch(/[:]/); // Windows rejects colons in filenames
  });
});
