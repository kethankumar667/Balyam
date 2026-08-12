import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageManager } from "../../services/LanguageManager";
import { en } from "../locales/en";
import { LOCALES, LOCALE_BY_ID, LOCALE_IDS, isLocaleId } from "../types";

/**
 * i18n contract.
 *
 * The rules pinned here are the ones whose failure is INVISIBLE in normal
 * use: a fallback that returns an empty string blanks the UI rather than
 * showing English, and a plural category resolved with English's rules
 * instead of the active language's is wrong only for some counts in some
 * languages. Both survive a casual click-through of the app.
 */

/** Minimal localStorage stand-in — the client tests run in node, not jsdom. */
function stubWindow(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  return store;
}

/**
 * Wait for the active catalogue's dynamic import to resolve.
 *
 * Polls rather than awaiting a fixed tick: the chunk goes through Vite's
 * transform, which takes single-digit milliseconds alone and considerably
 * longer when the rest of the suite is running in parallel. A one-tick wait
 * passes in isolation and fails in a full run — the worst kind of flake.
 */
async function waitReady(m: LanguageManager, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!m.getState().ready && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

beforeEach(() => {
  LanguageManager.resetForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  LanguageManager.resetForTests();
});

describe("lookup and fallback", () => {
  it("returns the English string for a known key", () => {
    const m = LanguageManager.getInstance();
    expect(m.t("audio.title")).toBe("Audio");
  });

  it("returns the key itself when nothing matches", () => {
    const m = LanguageManager.getInstance();
    // Returning the key keeps an untranslated string VISIBLE. Returning ""
    // would silently blank the element and look like a layout bug.
    expect(m.t("nope.not.a.key")).toBe("nope.not.a.key");
  });

  it("falls back to English for a key the active locale lacks", async () => {
    const m = LanguageManager.getInstance();
    m.setLocale("te");
    await waitReady(m);

    // Present in Telugu.
    expect(m.t("audio.title")).toBe("ఆడియో");
    // Absent from Telugu — must render English, not the raw key.
    const enOnly = "common.__test_only__";
    (en as Record<string, string>)[enOnly] = "English only";
    expect(m.t(enOnly)).toBe("English only");
    delete (en as Record<string, string>)[enOnly];
  });
});

describe("interpolation", () => {
  it("substitutes named placeholders", () => {
    const m = LanguageManager.getInstance();
    expect(m.t("audio.volumeLabel", { label: "Music" })).toBe("Music volume");
  });

  it("leaves an unknown placeholder intact rather than printing undefined", () => {
    const m = LanguageManager.getInstance();
    expect(m.t("audio.volumeLabel", { wrong: "x" })).toBe("{{label}} volume");
  });
});

describe("plurals", () => {
  it("selects English singular and plural by count", () => {
    const m = LanguageManager.getInstance();
    expect(m.t("room.playerCount", { count: 1 })).toBe("1 player");
    expect(m.t("room.playerCount", { count: 3 })).toBe("3 players");
  });

  it("uses the ACTIVE locale's plural rules, not English's", async () => {
    const m = LanguageManager.getInstance();
    m.setLocale("te");
    await waitReady(m);

    expect(m.t("room.playerCount", { count: 1 })).toBe("1 ఆటగాడు");
    expect(m.t("room.playerCount", { count: 5 })).toBe("5 ఆటగాళ్లు");
  });

  it("falls back to _other when the exact category is missing", () => {
    const m = LanguageManager.getInstance();
    // English has no `_many`; Intl picks `other` for 0 in en, and the chain
    // must resolve rather than emit the bare key.
    expect(m.t("room.playerCount", { count: 0 })).toBe("0 players");
  });
});

describe("locale switching", () => {
  it("applies the new locale immediately and English until the catalogue lands", async () => {
    const m = LanguageManager.getInstance();
    // Catalogues are cached at module scope, so this assertion only holds
    // while `bn` is loaded nowhere else in this file. Use a different locale
    // if another test needs Bengali.
    m.setLocale("bn");

    // Synchronously after the switch the chunk has not resolved, so the
    // fallback is showing — but the locale is already reported as bn so the
    // picker highlights the right row.
    expect(m.getLocale()).toBe("bn");
    expect(m.getState().ready).toBe(false);

    await waitReady(m);
    expect(m.getState().ready).toBe(true);
    expect(m.t("audio.title")).toBe("অডিও");
  });

  it("notifies subscribers when the catalogue arrives", async () => {
    const m = LanguageManager.getInstance();
    const seen: boolean[] = [];
    const unsub = m.subscribe((s) => seen.push(s.ready));

    m.setLocale("ta");
    await waitReady(m);
    unsub();

    // At least one not-ready notification, then a ready one.
    expect(seen).toContain(true);
    expect(seen.length).toBeGreaterThanOrEqual(2);
  });

  it("persists the choice to localStorage and restores it", async () => {
    stubWindow();
    const m = LanguageManager.getInstance();
    m.setLocale("kn");
    await waitReady(m);

    LanguageManager.resetForTests();
    const fresh = LanguageManager.getInstance();
    expect(fresh.getLocale()).toBe("kn");
  });

  it("ignores an unknown stored locale rather than throwing", () => {
    stubWindow({ "bhalyam.language": "xx" });
    const m = LanguageManager.getInstance();
    expect(m.getLocale()).toBe("en");
  });
});

describe("catalogue integrity", () => {
  it("ships metadata for every declared locale id", () => {
    expect(LOCALES.map((l) => l.id).sort()).toEqual([...LOCALE_IDS].sort());
  });

  it("labels every locale in its own script", () => {
    // A player stuck in a language they cannot read finds their way out by
    // recognising their own language, so these must never be translated or
    // collapsed to English.
    for (const l of LOCALES) {
      expect(l.nativeName.trim().length).toBeGreaterThan(0);
      expect(l.englishName.trim().length).toBeGreaterThan(0);
    }
    expect(LOCALE_BY_ID.te.nativeName).toBe("తెలుగు");
    expect(LOCALE_BY_ID.bn.nativeName).toBe("বাংলা");
  });

  it("recognises valid ids and rejects anything else", () => {
    expect(isLocaleId("hi")).toBe(true);
    expect(isLocaleId("HI")).toBe(false);
    expect(isLocaleId(null)).toBe(false);
  });
});
